import { useState } from 'react';
import Card from '../components/Card';
import './Sensors.css';

/**
 * Sensors Sayfası - Sensörler
 * Sensör durumları ve sağlık kontrolü
 */
const Sensors = () => {
    const [filterStatus, setFilterStatus] = useState('all');

    const sensors = [
        {
            id: 'SNS-001',
            name: 'Nem Sensörü #1',
            type: 'moisture',
            typeLabel: 'Nem',
            location: 'Buğday Tarlası',
            status: 'active',
            battery: 85,
            lastData: '2 dakika önce',
            value: '68%',
        },
        {
            id: 'SNS-002',
            name: 'Sıcaklık Sensörü #1',
            type: 'temperature',
            typeLabel: 'Sıcaklık',
            location: 'Buğday Tarlası',
            status: 'active',
            battery: 92,
            lastData: '1 dakika önce',
            value: '24°C',
        },
        {
            id: 'SNS-003',
            name: 'Nem Sensörü #2',
            type: 'moisture',
            typeLabel: 'Nem',
            location: 'Domates Serası',
            status: 'active',
            battery: 78,
            lastData: '3 dakika önce',
            value: '75%',
        },
        {
            id: 'SNS-004',
            name: 'Sıcaklık Sensörü #2',
            type: 'temperature',
            typeLabel: 'Sıcaklık',
            location: 'Domates Serası',
            status: 'maintenance',
            battery: 45,
            lastData: '1 saat önce',
            value: '28°C',
        },
        {
            id: 'SNS-005',
            name: 'Nem Sensörü #3',
            type: 'moisture',
            typeLabel: 'Nem',
            location: 'Mısır Tarlası',
            status: 'warning',
            battery: 25,
            lastData: '5 dakika önce',
            value: '35%',
        },
        {
            id: 'SNS-006',
            name: 'Hava Nem Sensörü',
            type: 'humidity',
            typeLabel: 'Hava Nemi',
            location: 'Mısır Tarlası',
            status: 'active',
            battery: 88,
            lastData: '2 dakika önce',
            value: '40%',
        },
        {
            id: 'SNS-007',
            name: 'Nem Sensörü #4',
            type: 'moisture',
            typeLabel: 'Nem',
            location: 'Biber Serası',
            status: 'inactive',
            battery: 0,
            lastData: '3 gün önce',
            value: '-',
        },
        {
            id: 'SNS-008',
            name: 'pH Sensörü',
            type: 'ph',
            typeLabel: 'pH',
            location: 'Patates Tarlası',
            status: 'active',
            battery: 67,
            lastData: '4 dakika önce',
            value: '6.5',
        },
        {
            id: 'SNS-009',
            name: 'Işık Sensörü',
            type: 'light',
            typeLabel: 'Işık',
            location: 'Domates Serası',
            status: 'active',
            battery: 95,
            lastData: '30 saniye önce',
            value: '850 lux',
        },
        {
            id: 'SNS-010',
            name: 'Rüzgar Sensörü',
            type: 'wind',
            typeLabel: 'Rüzgar',
            location: 'Ayçiçeği Tarlası',
            status: 'active',
            battery: 72,
            lastData: '1 dakika önce',
            value: '12 km/h',
        },
    ];

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
            humidity: '💨',
            ph: '🧪',
            light: '☀️',
            wind: '🌬️',
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
                                return (
                                    <tr key={sensor.id} className={statusConfig.class}>
                                        <td className="sensor-id">{sensor.id}</td>
                                        <td>
                                            <div className="sensor-name-cell">
                                                <span className="sensor-type-icon">{getTypeIcon(sensor.type)}</span>
                                                <span>{sensor.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="type-badge">{sensor.typeLabel}</span>
                                        </td>
                                        <td className="sensor-location">{sensor.location}</td>
                                        <td className="sensor-value">{sensor.value}</td>
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
                                        <td className="last-data">{sensor.lastData}</td>
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
                            <p>Sensörlerin %{Math.round((statusCounts.active / statusCounts.all) * 100)}'ı aktif durumda</p>
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
