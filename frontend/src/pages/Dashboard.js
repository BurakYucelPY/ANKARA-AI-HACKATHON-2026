import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFields, checkAllFields, getCurrentWeather } from '../services/api';
import Card from '../components/Card';
import './Dashboard.css';

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

    const { active: activeIrrigation, next: nextIrrigationData } = getIrrigationInfo();

    if (loading) {
        return (
            <div className="dashboard">
                <div className="dashboard-header">
                    <div className="dashboard-welcome">
                        <h1>Yükleniyor... ⏳</h1>
                        <p>Dashboard verileri hazırlanıyor</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            {/* Toplam Kar - Ana Vurgu */}
            <div className="profit-hero">
                <div className="profit-hero-content">
                    <div className="profit-label">
                        <span className="profit-icon">💰</span>
                        <span>Toplam Kar</span>
                    </div>
                    <div className="profit-amount">
                        <span className="currency">₺</span>
                        <span className="amount">{formatMoney(systemStats.totalProfit)}</span>
                    </div>
                    <p className="profit-subtitle">
                        🌱 {systemStats.startDate} tarihinden beri • {systemStats.daysActive} gün aktif
                        {fieldsData.length > 0 && ` • ${fieldsData.length} tarla`}
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="dashboard-header">
                <div className="dashboard-welcome">
                    <h1>Hoş Geldiniz, {user.full_name || user.email}! 👋</h1>
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

            {/* Ana İçerik Grid */}
            <div className="dashboard-main-grid">
                {/* Aktif Sulama Durumu */}
                <Card className={`irrigation-status-card ${activeIrrigation ? 'active' : 'inactive'}`}>
                    <div className="irrigation-status-header">
                        <span className="irrigation-icon">{activeIrrigation ? '💧' : '⏸️'}</span>
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
                            <span className="inactive-icon">🌾</span>
                        </div>
                    )}
                </Card>

                {/* Sonraki Sulama */}
                <Card className="next-irrigation-card">
                    <div className="irrigation-status-header">
                        <span className="irrigation-icon">⏰</span>
                        <h3>Sulama Analizi</h3>
                    </div>
                    <div className="next-irrigation-content">
                        {irrigationResults ? (
                            <>
                                <div className="next-irrigation-time">
                                    <span className="next-date">{irrigationResults.toplam_tarla} Tarla</span>
                                    <span className="next-time">Analiz Edildi</span>
                                </div>
                                <div className="next-irrigation-details">
                                    {nextIrrigationData ? (
                                        <>
                                            <span className="next-field">📍 {nextIrrigationData.tarla_adi}</span>
                                            <span className="next-duration">🔔 {nextIrrigationData.karar_ozeti}</span>
                                        </>
                                    ) : (
                                        <span className="next-field">✅ Tüm tarlalar iyi durumda</span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="next-irrigation-details">
                                <span className="next-field">{fieldsData.length === 0 ? 'Henüz tarla yok' : 'Analiz yapılamadı'}</span>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Küçük İstatistikler */}
            <div className="dashboard-mini-stats">
                <div className="mini-stat">
                    <span className="mini-stat-icon">💧</span>
                    <span className="mini-stat-value">{formatLiters(systemStats.totalWaterSaved)} L</span>
                    <span className="mini-stat-label">Kazanılan Su</span>
                </div>
                <div className="mini-stat">
                    <span className="mini-stat-icon">📅</span>
                    <span className="mini-stat-value">{systemStats.daysActive}</span>
                    <span className="mini-stat-label">Gün Aktif</span>
                </div>
            </div>

            {/* Son Aktiviteler */}
            <Card className="activities-card">
                <div className="card-header-custom">
                    <span className="header-icon">📋</span>
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
