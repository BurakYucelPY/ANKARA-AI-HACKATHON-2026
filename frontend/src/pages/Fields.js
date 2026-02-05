import { useState } from 'react';
import Card from '../components/Card';
import './Fields.css';

/**
 * Fields Sayfası - Tarlalarım
 * Tarla bilgileri ve sensör verilerini gösterir
 */
const Fields = () => {
    // Mock veriler (backend entegrasyonunda API'den gelecek)
    const [fields] = useState([
        {
            id: 1,
            name: 'Buğday Tarlası',
            plant: 'Buğday',
            area: 15,
            areaUnit: 'dönüm',
            moisture: 68,
            temperature: 24,
            humidity: 45,
            status: 'normal',
            lastWatered: '2 saat önce',
            location: {
                city: 'Ankara',
                district: 'Polatlı',
                zone: 'Kuzey Bölge',
                coordinates: { lat: 39.58, lng: 32.15 }
            }
        },
        {
            id: 2,
            name: 'Domates Serası',
            plant: 'Domates',
            area: 5,
            areaUnit: 'dönüm',
            moisture: 75,
            temperature: 28,
            humidity: 65,
            status: 'optimal',
            lastWatered: '30 dakika önce',
            location: {
                city: 'Ankara',
                district: 'Polatlı',
                zone: 'Sera Bölgesi',
                coordinates: { lat: 39.58, lng: 32.15 }
            }
        },
        {
            id: 3,
            name: 'Mısır Tarlası',
            plant: 'Mısır',
            area: 20,
            areaUnit: 'dönüm',
            moisture: 35,
            temperature: 26,
            humidity: 40,
            status: 'warning',
            lastWatered: '8 saat önce',
            location: {
                city: 'Konya',
                district: 'Ereğli',
                zone: 'Güney Bölge',
                coordinates: { lat: 37.51, lng: 34.05 }
            }
        },
        {
            id: 4,
            name: 'Ayçiçeği Tarlası',
            plant: 'Ayçiçeği',
            area: 25,
            areaUnit: 'dönüm',
            moisture: 55,
            temperature: 25,
            humidity: 42,
            status: 'normal',
            lastWatered: '4 saat önce',
            location: {
                city: 'Konya',
                district: 'Ereğli',
                zone: 'Doğu Bölge',
                coordinates: { lat: 37.51, lng: 34.05 }
            }
        },
        {
            id: 5,
            name: 'Biber Serası',
            plant: 'Biber',
            area: 3,
            areaUnit: 'dönüm',
            moisture: 20,
            temperature: 30,
            humidity: 55,
            status: 'critical',
            lastWatered: '12 saat önce',
            location: {
                city: 'Antalya',
                district: 'Kumluca',
                zone: 'Sera Bölgesi',
                coordinates: { lat: 36.37, lng: 30.29 }
            }
        },
        {
            id: 6,
            name: 'Patates Tarlası',
            plant: 'Patates',
            area: 10,
            areaUnit: 'dönüm',
            moisture: 62,
            temperature: 22,
            humidity: 48,
            status: 'optimal',
            lastWatered: '1 saat önce',
            location: {
                city: 'Ankara',
                district: 'Polatlı',
                zone: 'Batı Bölge',
                coordinates: { lat: 39.58, lng: 32.15 }
            }
        },
    ]);

    const getStatusBadge = (status) => {
        const statusConfig = {
            optimal: { label: 'Optimal', class: 'badge-success' },
            normal: { label: 'Normal', class: 'badge-info' },
            warning: { label: 'Dikkat', class: 'badge-warning' },
            critical: { label: 'Kritik', class: 'badge-danger' },
        };
        return statusConfig[status] || statusConfig.normal;
    };

    const getMoistureColor = (moisture) => {
        if (moisture >= 60) return 'var(--success)';
        if (moisture >= 40) return 'var(--warning)';
        return 'var(--danger)';
    };

    return (
        <div className="fields-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">🌾 Tarlalarım</h1>
                    <p className="page-subtitle">Tarlalarınızın durumunu ve sensör verilerini takip edin</p>
                </div>
                <button className="btn btn-primary">
                    <span>➕</span> Yeni Tarla Ekle
                </button>
            </div>

            {/* Özet Bilgiler */}
            <div className="fields-summary">
                <div className="summary-item">
                    <span className="summary-value">{fields.length}</span>
                    <span className="summary-label">Toplam Tarla</span>
                </div>
                <div className="summary-item">
                    <span className="summary-value">{fields.reduce((sum, f) => sum + f.area, 0)}</span>
                    <span className="summary-label">Toplam Alan (dönüm)</span>
                </div>
                <div className="summary-item">
                    <span className="summary-value">{fields.filter(f => f.status === 'optimal').length}</span>
                    <span className="summary-label">Optimal Durumda</span>
                </div>
                <div className="summary-item summary-warning">
                    <span className="summary-value">{fields.filter(f => f.status === 'critical' || f.status === 'warning').length}</span>
                    <span className="summary-label">Dikkat Gereken</span>
                </div>
            </div>

            {/* Tarla Kartları */}
            <div className="fields-grid">
                {fields.map((field) => {
                    const statusBadge = getStatusBadge(field.status);
                    return (
                        <Card key={field.id} className={`field-card field-${field.status}`}>
                            <div className="field-header">
                                <div className="field-info">
                                    <h3 className="field-name">{field.name}</h3>
                                    <p className="field-location">📍 {field.location.city}, {field.location.district}</p>
                                    <p className="field-zone">{field.location.zone}</p>
                                </div>
                                <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span>
                            </div>

                            <div className="field-plant">
                                <span className="plant-icon">🌱</span>
                                <span className="plant-name">{field.plant}</span>
                                <span className="field-area">{field.area} {field.areaUnit}</span>
                            </div>

                            <div className="field-sensors">
                                <div className="sensor-item">
                                    <div className="sensor-header">
                                        <span className="sensor-icon">💧</span>
                                        <span className="sensor-label">Nem</span>
                                    </div>
                                    <div className="sensor-value-container">
                                        <span className="sensor-value" style={{ color: getMoistureColor(field.moisture) }}>
                                            %{field.moisture}
                                        </span>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-bar-fill"
                                                style={{
                                                    width: `${field.moisture}%`,
                                                    background: getMoistureColor(field.moisture)
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="sensor-item">
                                    <div className="sensor-header">
                                        <span className="sensor-icon">🌡️</span>
                                        <span className="sensor-label">Sıcaklık</span>
                                    </div>
                                    <span className="sensor-value">{field.temperature}°C</span>
                                </div>

                                <div className="sensor-item">
                                    <div className="sensor-header">
                                        <span className="sensor-icon">💨</span>
                                        <span className="sensor-label">Hava Nemi</span>
                                    </div>
                                    <span className="sensor-value">%{field.humidity}</span>
                                </div>
                            </div>

                            <div className="field-footer">
                                <span className="last-watered">💧 Son sulama: {field.lastWatered}</span>
                                <button className="btn btn-secondary btn-sm">Detaylar</button>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default Fields;
