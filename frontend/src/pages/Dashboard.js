import Card from '../components/Card';
import './Dashboard.css';

/**
 * Dashboard Sayfası
 * Ana sayfa - özet istatistikler ve hızlı erişim
 */
const Dashboard = () => {
    // Mock veriler (backend entegrasyonunda değişecek)
    const stats = [
        { icon: '🌾', title: '12', subtitle: 'Toplam Tarla', id: 'fields' },
        { icon: '📡', title: '48', subtitle: 'Aktif Sensör', id: 'sensors' },
        { icon: '💧', title: '%35', subtitle: 'Su Tasarrufu', id: 'savings' },
        { icon: '🌡️', title: '24°C', subtitle: 'Ortalama Sıcaklık', id: 'temp' },
    ];

    const recentActivities = [
        { id: 1, message: 'Buğday tarlası sulandı', time: '10 dakika önce', type: 'success' },
        { id: 2, message: 'Sensör #12 bakım gerektiyor', time: '1 saat önce', type: 'warning' },
        { id: 3, message: 'Domates tarlası sulama planlandı', time: '2 saat önce', type: 'info' },
        { id: 4, message: 'Mısır tarlası nem seviyesi düşük', time: '3 saat önce', type: 'danger' },
    ];

    const quickActions = [
        { icon: '💧', title: 'Hızlı Sulama', description: 'Manuel sulama başlat', path: '/manual' },
        { icon: '➕', title: 'Tarla Ekle', description: 'Yeni tarla tanımla', path: '/fields' },
        { icon: '📊', title: 'Raporlar', description: 'Detaylı analizler', path: '/fields' },
    ];

    return (
        <div className="dashboard">
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

            {/* İstatistikler */}
            <section className="dashboard-stats">
                {stats.map((stat, index) => (
                    <Card key={stat.id} variant="stats" className={`stat-card stat-card-${index}`}>
                        <span className="stat-icon">{stat.icon}</span>
                        <h2 className="stat-value">{stat.title}</h2>
                        <p className="stat-label">{stat.subtitle}</p>
                    </Card>
                ))}
            </section>

            <div className="dashboard-grid">
                {/* Son Aktiviteler */}
                <Card title="Son Aktiviteler" icon="📋" className="activities-card">
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

                {/* Hızlı Erişim */}
                <Card title="Hızlı Erişim" icon="⚡" className="quick-actions-card">
                    <div className="quick-actions">
                        {quickActions.map((action) => (
                            <div key={action.title} className="quick-action-item">
                                <span className="quick-action-icon">{action.icon}</span>
                                <div className="quick-action-text">
                                    <h4>{action.title}</h4>
                                    <p>{action.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Bilgi Kartı */}
            <Card variant="highlight" className="info-card">
                <div className="info-content">
                    <span className="info-icon">💡</span>
                    <div className="info-text">
                        <h3>Akıllı Sulama Aktif</h3>
                        <p>Sistem sensör verilerini analiz ederek en uygun sulama zamanlarını belirliyor. Su tasarrufunuz bu ay %35 arttı!</p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;
