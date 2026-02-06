import { useState, useEffect } from 'react';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { getSensors } from '../services/api';
import './Sensors.css';

/**
 * Sensors Sayfası - Sensörler
 * Sensör durumları ve sağlık kontrolü - Veritabanından çeker
 */
const Sensors = () => {
    const { user } = useAuth();
    const [filterStatus, setFilterStatus] = useState('all');
    const [sensors, setSensors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSensors = async () => {
            if (!user?.id) return;
            try {
                setLoading(true);
                const res = await getSensors(user.id);
                setSensors(res.data);
                setError(null);
            } catch (err) {
                console.error('Sensör verisi alınamadı:', err);
                setError('Sensör verileri yüklenirken hata oluştu.');
            } finally {
                setLoading(false);
            }
        };
        fetchSensors();
    }, [user]);

    // Zaman farkını hesapla (son veri zamanı)
    const formatTimeAgo = (isoString) => {
        if (!isoString) return 'Veri yok';
        const diff = Date.now() - new Date(isoString).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Az önce';
        if (minutes < 60) return `${minutes} dakika önce`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} saat önce`;
        const days = Math.floor(hours / 24);
        return `${days} gün önce`;
    };

    const getStatusConfig = (status) => {
        const configs = {
            active: { label: 'Aktif', class: 'status-active', icon: '🟢' },
            inactive: { label: 'Pasif', class: 'status-inactive', icon: '🔴' },
            warning: { label: 'Uyarı', class: 'status-warning', icon: '🟡' },
            maintenance: { label: 'Bakımda', class: 'status-maintenance', icon: '🔧' },
        };
        return configs[status] || configs.active;
    };

    const getTypeIcon = (type) => {
        const icons = {
            moisture: '💧',
            temperature: '🌡️',
        };
        return icons[type] || '📡';
    };

    const getBatteryClass = (level) => {
        if (level >= 60) return 'battery-high';
        if (level >= 30) return 'battery-medium';
        return 'battery-low';
    };

    const filteredSensors = filterStatus === 'all'
        ? sensors
        : sensors.filter(s => s.status === filterStatus);

    const statusCounts = {
        all: sensors.length,
        active: sensors.filter(s => s.status === 'active').length,
        inactive: sensors.filter(s => s.status === 'inactive').length,
        warning: sensors.filter(s => s.status === 'warning').length,
        maintenance: sensors.filter(s => s.status === 'maintenance').length,
    };

    if (loading) {
        return (
            <div className="sensors-page">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1 className="page-title">📡 Sensörler</h1>
                        <p className="page-subtitle">Yükleniyor...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="sensors-page">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1 className="page-title">📡 Sensörler</h1>
                        <p className="page-subtitle" style={{ color: '#e74c3c' }}>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="sensors-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">📡 Sensörler</h1>
                    <p className="page-subtitle">Sensör durumlarını ve sağlık bilgilerini izleyin</p>
                </div>
                <button className="btn btn-primary">
                    <span>➕</span> Sensör Ekle
                </button>
            </div>

            {/* Özet Kartları */}
            <div className="sensors-summary">
                <div className="summary-card" onClick={() => setFilterStatus('all')}>
                    <span className="summary-icon">📡</span>
                    <div className="summary-info">
                        <span className="summary-value">{statusCounts.all}</span>
                        <span className="summary-label">Toplam</span>
                    </div>
                </div>
                <div className="summary-card active" onClick={() => setFilterStatus('active')}>
                    <span className="summary-icon">🟢</span>
                    <div className="summary-info">
                        <span className="summary-value">{statusCounts.active}</span>
                        <span className="summary-label">Aktif</span>
                    </div>
                </div>
                <div className="summary-card warning" onClick={() => setFilterStatus('warning')}>
                    <span className="summary-icon">🟡</span>
                    <div className="summary-info">
                        <span className="summary-value">{statusCounts.warning}</span>
                        <span className="summary-label">Uyarı</span>
                    </div>
                </div>
                <div className="summary-card inactive" onClick={() => setFilterStatus('inactive')}>
                    <span className="summary-icon">🔴</span>
                    <div className="summary-info">
                        <span className="summary-value">{statusCounts.inactive}</span>
                        <span className="summary-label">Pasif</span>
                    </div>
                </div>
                <div className="summary-card maintenance" onClick={() => setFilterStatus('maintenance')}>
                    <span className="summary-icon">🔧</span>
                    <div className="summary-info">
                        <span className="summary-value">{statusCounts.maintenance}</span>
                        <span className="summary-label">Bakımda</span>
                    </div>
                </div>
            </div>

            {/* Filtre Etiketi */}
            {filterStatus !== 'all' && (
                <div className="filter-tag">
                    Filtre: <strong>{getStatusConfig(filterStatus).label}</strong>
                    <button className="filter-clear" onClick={() => setFilterStatus('all')}>✕</button>
                </div>
            )}

            {/* Sensör Tablosu */}
            <Card className="sensors-table-card">
                <div className="table-container">
                    <table className="sensors-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Sensör</th>
                                <th>Tip</th>
                                <th>Konum</th>
                                <th>Değer</th>
                                <th>Durum</th>
                                <th>Pil</th>
                                <th>Son Veri</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSensors.map((sensor) => {
                                const statusConfig = getStatusConfig(sensor.status);
                                const displayValue = sensor.value != null
                                    ? `${sensor.value}${sensor.unit}`
                                    : '-';
                                return (
                                    <tr key={sensor.id} className={statusConfig.class}>
                                        <td className="sensor-id">{sensor.sensor_code}</td>
                                        <td>
                                            <div className="sensor-name-cell">
                                                <span className="sensor-type-icon">{getTypeIcon(sensor.type)}</span>
                                                <span>{sensor.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="type-badge">{sensor.type_label}</span>
                                        </td>
                                        <td className="sensor-location">{sensor.field_name}</td>
                                        <td className="sensor-value">{displayValue}</td>
                                        <td>
                                            <span className={`status-badge ${statusConfig.class}`}>
                                                {statusConfig.icon} {statusConfig.label}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={`battery-indicator ${getBatteryClass(sensor.battery)}`}>
                                                <div className="battery-bar">
                                                    <div
                                                        className="battery-level"
                                                        style={{ width: `${sensor.battery}%` }}
                                                    ></div>
                                                </div>
                                                <span className="battery-text">{sensor.battery}%</span>
                                            </div>
                                        </td>
                                        <td className="last-data">{formatTimeAgo(sensor.last_data)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Bilgi Kartları */}
            <div className="info-cards">
                <Card variant="success" className="info-card-small">
                    <div className="info-card-content">
                        <span className="info-card-icon">✓</span>
                        <div className="info-card-text">
                            <h4>Sistem Sağlığı</h4>
                            <p>Sensörlerin %{statusCounts.all > 0 ? Math.round((statusCounts.active / statusCounts.all) * 100) : 0}'ı aktif durumda</p>
                        </div>
                    </div>
                </Card>

                {statusCounts.warning > 0 && (
                    <Card variant="warning" className="info-card-small">
                        <div className="info-card-content">
                            <span className="info-card-icon">⚠️</span>
                            <div className="info-card-text">
                                <h4>Dikkat</h4>
                                <p>{statusCounts.warning} sensör düşük pil uyarısı veriyor</p>
                            </div>
                        </div>
                    </Card>
                )}

                {statusCounts.inactive > 0 && (
                    <Card variant="danger" className="info-card-small">
                        <div className="info-card-content">
                            <span className="info-card-icon">🔴</span>
                            <div className="info-card-text">
                                <h4>Pasif Sensörler</h4>
                                <p>{statusCounts.inactive} sensör pasif durumda - kontrol edilmeli</p>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default Sensors;
