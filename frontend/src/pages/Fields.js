import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFields } from '../services/api';
import { getPlantImage } from '../data/plantImages';
import Card from '../components/Card';
import './Fields.css';

const Fields = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFields = async () => {
        try {
            const res = await getFields(user.id);
            setFields(res.data);
        } catch (err) {
            console.error('Tarlalar yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFields(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.id]);

    // Tarlanın durumunu sensör verisinden hesapla
    const getFieldStatus = (field) => {
        const logs = field.sensor_logs || [];
        if (logs.length === 0) return 'normal';
        const lastLog = logs[logs.length - 1];
        const moisture = lastLog.moisture;
        const pt = field.plant_type;
        if (!pt) return moisture < 30 ? 'critical' : moisture < 50 ? 'warning' : 'normal';
        if (moisture < pt.critical_moisture) return 'critical';
        if (moisture < pt.min_moisture) return 'warning';
        if (moisture >= pt.min_moisture && moisture <= pt.max_moisture) return 'optimal';
        return 'normal';
    };

    const getLastSensorData = (field) => {
        const logs = field.sensor_logs || [];
        if (logs.length === 0) return { moisture: '-', temperature: '-', timestamp: null };
        const last = logs[logs.length - 1];
        return { moisture: last.moisture, temperature: last.temperature, timestamp: last.timestamp };
    };

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
        if (moisture === '-') return 'var(--gray-400)';
        if (moisture >= 60) return 'var(--success)';
        if (moisture >= 40) return 'var(--warning)';
        return 'var(--danger)';
    };

    const formatTimestamp = (ts) => {
        if (!ts) return 'Veri yok';
        const date = new Date(ts);
        const now = new Date();
        const diff = Math.floor((now - date) / 60000);
        if (diff < 60) return `${diff} dk önce`;
        if (diff < 1440) return `${Math.floor(diff / 60)} saat önce`;
        return date.toLocaleDateString('tr-TR');
    };

    if (loading) {
        return (
            <div className="fields-page">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1 className="page-title">🌾 Tarlalarım</h1>
                        <p className="page-subtitle">Veriler yükleniyor...</p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                    <p style={{ fontSize: '2rem' }}>⏳</p>
                    <p>Tarla bilgileri yükleniyor...</p>
                </div>
            </div>
        );
    }

    const enrichedFields = fields.map(f => {
        const status = getFieldStatus(f);
        const sensor = getLastSensorData(f);
        return { ...f, status, sensorData: sensor };
    });

    const optimalCount = enrichedFields.filter(f => f.status === 'optimal').length;
    const alertCount = enrichedFields.filter(f => f.status === 'critical' || f.status === 'warning').length;

    return (
        <div className="fields-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">🌾 Tarlalarım</h1>
                    <p className="page-subtitle">Tarlalarınızın durumunu ve sensör verilerini takip edin</p>
                </div>
            </div>

            {/* Özet Bilgiler */}
            <div className="fields-summary">
                <div className="summary-item">
                    <span className="summary-value">{enrichedFields.length}</span>
                    <span className="summary-label">Toplam Tarla</span>
                </div>
                <div className="summary-item">
                    <span className="summary-value">{enrichedFields.length}</span>
                    <span className="summary-label">Kayıtlı Tarla</span>
                </div>
                <div className="summary-item">
                    <span className="summary-value">{optimalCount}</span>
                    <span className="summary-label">Optimal Durumda</span>
                </div>
                <div className="summary-item summary-warning">
                    <span className="summary-value">{alertCount}</span>
                    <span className="summary-label">Dikkat Gereken</span>
                </div>
            </div>

            {/* Tarla Kartları */}
            {enrichedFields.length === 0 ? (
                <Card className="weather-info-note">
                    <div className="info-note-content">
                        <span className="info-note-icon">🌾</span>
                        <div className="info-note-text">
                            <h4>Henüz tarla eklenmemiş</h4>
                            <p>"Yeni Tarla Ekle" butonuna tıklayarak ilk tarlanızı ekleyin.</p>
                        </div>
                    </div>
                </Card>
            ) : (
                <div className="fields-grid">
                    {enrichedFields.map((field) => {
                        const statusBadge = getStatusBadge(field.status);
                        const moisture = field.sensorData.moisture;
                        const moistureNum = typeof moisture === 'number' ? moisture : 0;
                        const plantName = field.plant_type?.name || 'default';
                        const plantImage = getPlantImage(plantName);

                        return (
                            <div
                                key={field.id}
                                className={`field-card field-${field.status}`}
                                onClick={() => navigate(`/fields/${field.id}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="field-header">
                                    <div className="field-info">
                                        <h3 className="field-name">{field.name}</h3>
                                        <p className="field-location">📍 {field.location}, {field.ilce}</p>
                                    </div>
                                    <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span>
                                </div>

                                <div
                                    className="field-plant"
                                    style={{
                                        backgroundImage: `linear-gradient(90deg, rgba(15, 23, 42, 0.7) 0%, rgba(15, 23, 42, 0.5) 100%), url(${plantImage.image})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                >
                                    <span className="plant-name">{field.plant_type?.name || 'Bilinmiyor'}</span>
                                </div>

                                <div className="field-sensors">
                                    <div className="sensor-item">
                                        <div className="sensor-header">
                                            <span className="sensor-icon">💧</span>
                                            <span className="sensor-label">Nem</span>
                                        </div>
                                        <div className="sensor-value-container">
                                            <span className="sensor-value" style={{ color: getMoistureColor(moisture) }}>
                                                {moisture !== '-' ? `%${moisture}` : 'Veri yok'}
                                            </span>
                                            {moisture !== '-' && (
                                                <div className="progress-bar">
                                                    <div
                                                        className="progress-bar-fill"
                                                        style={{ width: `${moistureNum}%`, background: getMoistureColor(moisture) }}
                                                    ></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="sensor-item">
                                        <div className="sensor-header">
                                            <span className="sensor-icon">🌡️</span>
                                            <span className="sensor-label">Sıcaklık</span>
                                        </div>
                                        <span className="sensor-value">
                                            {field.sensorData.temperature !== '-' ? `${field.sensorData.temperature}°C` : 'Veri yok'}
                                        </span>
                                    </div>
                                </div>

                                <div className="field-footer">
                                    <span className="last-watered">💧 Son veri: {formatTimestamp(field.sensorData.timestamp)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Fields;
