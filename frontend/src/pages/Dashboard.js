import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFields, checkAllFields, getCurrentWeather } from '../services/api';
import { MOCK_IRRIGATION_PLANS } from './IrrigationPlan';
import Card from '../components/Card';
import './Dashboard.css';
import LoadingScreen from '../components/LoadingScreen';

const DAY_MAP = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const Dashboard = () => {
    const { user } = useAuth();
    const [fieldsData, setFieldsData] = useState([]);
    const [irrigationResults, setIrrigationResults] = useState(null);
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            setLoading(true);
            try {
                const fieldsRes = await getFields(user.id);
                const fields = fieldsRes.data;
                setFieldsData(fields);

                // Sulama kararlarını çek (tarlalar varsa)
                if (fields.length > 0) {
                    try {
                        const irRes = await checkAllFields(user.id);
                        setIrrigationResults(irRes.data);
                    } catch { /* sulama analizi opsiyonel */ }

                    // İlk tarlanın ilçesinden hava durumu çek
                    try {
                        const weatherRes = await getCurrentWeather(fields[0].ilce);
                        setWeather(weatherRes.data);
                    } catch { /* hava durumu opsiyonel */ }
                }
            } catch (err) {
                console.error('Dashboard verileri yüklenemedi:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, [user.id]);

    // Sulama kararlarından aktif ve sonraki sulamayı çıkar
    const getIrrigationInfo = () => {
        if (!irrigationResults || !irrigationResults.tarlalar) return { active: null, next: null, urgentFields: [] };

        const tarlalar = irrigationResults.tarlalar;
        const active = tarlalar.find(t => t.pompa === 'AÇIK' || t.pompa === 'YARIM_DOZ');
        const next = tarlalar.find(t => t.karar_ozeti?.includes('SULAMA_GEREKLI') || t.karar_ozeti?.includes('KRITIK'));
        const urgentFields = tarlalar.filter(t => t.pompa !== 'KAPALI');

        return { active: active || null, next: next || null, urgentFields };
    };

    // Sistem istatistikleri (kısmen dummy — backend'de istatistik endpoint'i yok)
    const systemStats = {
        startDate: '15 Ocak 2026',
        totalWaterSaved: 125000,
        totalProfit: 12450,
        daysActive: Math.floor((new Date() - new Date('2026-01-15')) / 86400000),
    };

    const recentActivities = irrigationResults?.tarlalar
        ? irrigationResults.tarlalar.slice(0, 5).map((t, i) => ({
            id: i,
            message: `${t.tarla_adi}: ${t.detay || t.karar_ozeti}`,
            time: 'Az önce analiz edildi',
            type: t.pompa === 'KAPALI' ? 'success' : t.pompa === 'AÇIK' ? 'danger' : 'warning',
        }))
        : [
            { id: 1, message: 'Sistem başlatıldı', time: 'Az önce', type: 'info' },
        ];

    const formatMoney = (amount) => amount.toLocaleString('tr-TR');
    const formatLiters = (liters) => liters >= 1000 ? `${(liters / 1000).toFixed(1)}K` : liters.toString();

    const { active: activeIrrigation } = getIrrigationInfo();

    // Sulama planından bir sonraki sulamayı bul
    const nextPlannedIrrigation = useMemo(() => {
        const now = new Date();
        const todayIndex = now.getDay(); // 0=Pazar
        const todayName = DAY_MAP[todayIndex];
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Tüm tarlaların tüm slotlarını gez, günlere göre sırala
        const allSlots = [];
        Object.entries(MOCK_IRRIGATION_PLANS).forEach(([fieldId, plan]) => {
            plan.weeklyPlan.forEach((dayPlan) => {
                dayPlan.slots.forEach((slot) => {
                    allSlots.push({
                        fieldId: Number(fieldId),
                        fieldName: plan.fieldName,
                        day: dayPlan.day,
                        ...slot,
                    });
                });
            });
        });

        // Gün sırasını bugünden başlat
        const dayOrder = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        const todayDayIndex = dayOrder.indexOf(todayName);

        // Bugünden başlayarak 7 gün ileriye bak
        for (let offset = 0; offset < 7; offset++) {
            const checkDay = dayOrder[(todayDayIndex + offset) % 7];
            const daySlots = allSlots
                .filter(s => s.day === checkDay)
                .sort((a, b) => a.start.localeCompare(b.start));

            for (const slot of daySlots) {
                // Bugünse sadece gelecek saatleri al
                if (offset === 0 && slot.start <= currentTime) continue;
                return { ...slot, isToday: offset === 0, daysAway: offset };
            }
        }
        return null;
    }, []);

    if (loading) {
        return (
            <div className="dashboard">
                <LoadingScreen
                    title="Dashboard"
                    subtitle="Dashboard verileri hazırlanıyor..."
                />
            </div>
        );
    }

    return (
        <div className="dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="dashboard-welcome">
                    <h1>Hoş Geldiniz, {user.full_name || user.email}!</h1>
                    <p>Akıllı sulama sisteminizin özet durumu
                        {weather && ` • ${weather.konum}: ${weather.sicaklik}°C ${weather.emoji || ''}`}
                    </p>
                </div>
                <div className="dashboard-date">
                    {new Date().toLocaleDateString('tr-TR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            </div>

            {/* Toplam Kazanç & Su - Yan Yana */}
            <div className="heroes-row">
                <div className="profit-hero">
                    <div className="profit-hero-content">
                        <div className="profit-label">
                            <span>Toplam Kar</span>
                        </div>
                        <div className="profit-amount">
                            <span className="currency">₺</span>
                            <span className="amount">{formatMoney(systemStats.totalProfit)}</span>
                        </div>
                        <p className="profit-subtitle">
                            {systemStats.startDate} tarihinden beri • {systemStats.daysActive} gün aktif
                            {fieldsData.length > 0 && ` • ${fieldsData.length} tarla`}
                        </p>
                    </div>
                </div>

                <div className="water-hero">
                    <div className="water-hero-content">
                        <div className="water-label">
                            <span>Kazanılan Su</span>
                        </div>
                        <div className="water-amount">
                            <span className="amount">{formatLiters(systemStats.totalWaterSaved)}</span>
                            <span className="unit">Litre</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ana İçerik Grid */}
            <div className="dashboard-main-grid">
                {/* Aktif Sulama Durumu */}
                <Card className={`irrigation-status-card ${activeIrrigation ? 'active' : 'inactive'}`}>
                    <div className="irrigation-status-header">
                        <h3>Aktif Sulama</h3>
                    </div>

                    {activeIrrigation ? (
                        <div className="irrigation-active">
                            <div className="irrigation-field">
                                <span className="field-name">{activeIrrigation.tarla_adi}</span>
                                <span className="irrigation-badge active-badge">Sulama Gerekli — {activeIrrigation.pompa}</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--gray-300)', marginTop: '0.5rem' }}>
                                {activeIrrigation.detay}
                            </p>
                            <div className="water-animation">
                                <span className="water-drop">💧</span>
                                <span className="water-drop">💧</span>
                                <span className="water-drop">💧</span>
                            </div>
                        </div>
                    ) : (
                        <div className="irrigation-inactive">
                            <p className="no-irrigation-text">Şu an aktif sulama gereksinimi yok</p>
                        </div>
                    )}
                </Card>

                {/* Sonraki Sulama */}
                <Card className="next-irrigation-card">
                    <div className="irrigation-status-header">
                        <h3>Sonraki Sulama</h3>
                    </div>
                    <div className="next-irrigation-content">
                        {nextPlannedIrrigation ? (
                            <>
                                <div className="next-irrigation-time">
                                    <span className="next-date">
                                        {nextPlannedIrrigation.isToday
                                            ? 'Bugün'
                                            : nextPlannedIrrigation.daysAway === 1
                                                ? 'Yarın'
                                                : nextPlannedIrrigation.day}
                                    </span>
                                    <span className="next-time">{nextPlannedIrrigation.start}</span>
                                </div>
                                <div className="next-irrigation-details">
                                    <span className="next-field">{nextPlannedIrrigation.fieldName}</span>
                                    <span className="next-duration">{nextPlannedIrrigation.amount}L • {nextPlannedIrrigation.start}–{nextPlannedIrrigation.end}</span>
                                    <span className="next-note">{nextPlannedIrrigation.note}</span>
                                </div>
                            </>
                        ) : (
                            <div className="next-irrigation-details">
                                <span className="next-field">Bu hafta planlanmış sulama yok</span>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Son Aktiviteler */}
            <Card className="activities-card">
                <div className="card-header-custom">
                    <h3>Sulama Durumları</h3>
                </div>
                <ul className="activity-list">
                    {recentActivities.map((activity) => (
                        <li key={activity.id} className={`activity-item activity-${activity.type}`}>
                            <div className="activity-indicator"></div>
                            <div className="activity-content">
                                <p className="activity-message">{activity.message}</p>
                                <span className="activity-time">{activity.time}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    );
};

export default Dashboard;
