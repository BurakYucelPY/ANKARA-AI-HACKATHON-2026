import Card from '../components/Card';
import './Dashboard.css';

/**
 * Dashboard Sayfası
 * Ana sayfa - toplam kar, aktif sulama, sonraki sulama ve son aktiviteler
 */
const Dashboard = () => {
    // Mock veriler (backend entegrasyonunda API'den gelecek)

    // Aktif sulama durumu (null = aktif sulama yok)
    const activeIrrigation = null; // Örnek: { field: 'Buğday Tarlası', startTime: '14:30', duration: 15, remaining: 8 }

    // Sonraki planlanan sulama
    const nextIrrigation = {
        field: 'Domates Serası',
        scheduledTime: '16:00',
        date: 'Bugün',
        duration: 20
    };

    // Sistem başlangıcından itibaren toplam istatistikler
    const systemStats = {
        startDate: '15 Ocak 2026',
        totalWaterSaved: 125000, // Litre
        totalProfit: 12450, // TL cinsinden
        daysActive: 21
    };

    // Son aktiviteler
    const recentActivities = [
        { id: 1, message: 'Buğday tarlası sulandı (12 dk)', time: '10 dakika önce', type: 'success' },
        { id: 2, message: 'Sensör #12 bakım gerektiyor', time: '1 saat önce', type: 'warning' },
        { id: 3, message: 'Domates serası sulama planlandı', time: '2 saat önce', type: 'info' },
        { id: 4, message: 'Mısır tarlası nem seviyesi kritik', time: '3 saat önce', type: 'danger' },
        { id: 5, message: 'Patates tarlası sulandı (18 dk)', time: '5 saat önce', type: 'success' },
    ];

    // Para formatla
    const formatMoney = (amount) => {
        return amount.toLocaleString('tr-TR');
    };

    // Litre formatla
    const formatLiters = (liters) => {
        if (liters >= 1000) {
            return `${(liters / 1000).toFixed(1)}K`;
        }
        return liters.toString();
    };

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
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="dashboard-header">
                <div className="dashboard-welcome">
                    <h1>Hoş Geldiniz! 👋</h1>
                    <p>Akıllı sulama sisteminizin özet durumu</p>
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
                                <span className="field-name">{activeIrrigation.field}</span>
                                <span className="irrigation-badge active-badge">Sulama Devam Ediyor</span>
                            </div>
                            <div className="irrigation-progress">
                                <div className="progress-info">
                                    <span>Kalan süre: {activeIrrigation.remaining} dk</span>
                                    <span>{activeIrrigation.duration} dk toplam</span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-bar-fill irrigation-progress-fill"
                                        style={{ width: `${((activeIrrigation.duration - activeIrrigation.remaining) / activeIrrigation.duration) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div className="water-animation">
                                <span className="water-drop">💧</span>
                                <span className="water-drop">💧</span>
                                <span className="water-drop">💧</span>
                            </div>
                        </div>
                    ) : (
                        <div className="irrigation-inactive">
                            <p className="no-irrigation-text">Şu an aktif sulama bulunmuyor</p>
                            <span className="inactive-icon">🌾</span>
                        </div>
                    )}
                </Card>

                {/* Sonraki Sulama */}
                <Card className="next-irrigation-card">
                    <div className="irrigation-status-header">
                        <span className="irrigation-icon">⏰</span>
                        <h3>Sonraki Sulama</h3>
                    </div>
                    <div className="next-irrigation-content">
                        <div className="next-irrigation-time">
                            <span className="next-date">{nextIrrigation.date}</span>
                            <span className="next-time">{nextIrrigation.scheduledTime}</span>
                        </div>
                        <div className="next-irrigation-details">
                            <span className="next-field">📍 {nextIrrigation.field}</span>
                            <span className="next-duration">⏱️ {nextIrrigation.duration} dakika</span>
                        </div>
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
                    <h3>Son Aktiviteler</h3>
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
