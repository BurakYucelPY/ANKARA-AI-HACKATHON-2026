import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFields, checkIrrigation } from '../services/api';
import Card from '../components/Card';
import './ManualControl.css';

const ManualControl = () => {
    const { user } = useAuth();
    const [selectedField, setSelectedField] = useState('');
    const [duration, setDuration] = useState(15);
    const [isWatering, setIsWatering] = useState(false);
    const [wateringFieldId, setWateringFieldId] = useState(null);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [irrigationAdvice, setIrrigationAdvice] = useState(null);

    useEffect(() => {
        const fetchFields = async () => {
            try {
                const res = await getFields(user.id);
                const backendFields = res.data.map(f => {
                    const logs = f.sensor_logs || [];
                    const last = logs.length > 0 ? logs[logs.length - 1] : null;
                    const moisture = last ? last.moisture : null;
                    const pt = f.plant_type;
                    let status = 'normal';
                    if (moisture !== null && pt) {
                        if (moisture < pt.critical_moisture) status = 'critical';
                        else if (moisture < pt.min_moisture) status = 'warning';
                        else if (moisture >= pt.min_moisture && moisture <= pt.max_moisture) status = 'optimal';
                    }
                    return { id: f.id, name: f.name, moisture: moisture ?? '-', status };
                });
                setFields(backendFields);
            } catch (err) {
                console.error('Tarlalar yüklenemedi:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchFields();
    }, [user.id]);

    // Tarla seçildiğinde sulama tavsiyesi çek
    useEffect(() => {
        if (!selectedField) { setIrrigationAdvice(null); return; }
        const fetchAdvice = async () => {
            try {
                const res = await checkIrrigation(parseInt(selectedField));
                setIrrigationAdvice(res.data);
            } catch {
                setIrrigationAdvice(null);
            }
        };
        fetchAdvice();
    }, [selectedField]);

    const handleStartWatering = () => {
        if (!selectedField) return;
        setIsWatering(true);
        setWateringFieldId(parseInt(selectedField));
        // Simüle edilmiş sulama - gerçek uygulamada API çağrısı olacak
        setTimeout(() => {
            setIsWatering(false);
            setWateringFieldId(null);
        }, duration * 1000); // Demo için saniye cinsinden süre
    };

    const handleStopWatering = () => {
        setIsWatering(false);
        setWateringFieldId(null);
    };

    const criticalFields = fields.filter(f => f.status === 'critical' || f.status === 'warning');

    if (loading) {
        return (
            <div className="manual-control">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1 className="page-title">🎛️ Manuel Yönetim</h1>
                        <p className="page-subtitle">Veriler yükleniyor...</p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                    <p style={{ fontSize: '2rem' }}>⏳</p>
                </div>
            </div>
        );
    }

    return (
        <div className="manual-control">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">🎛️ Manuel Yönetim</h1>
                    <p className="page-subtitle">Sulama sistemini manuel olarak kontrol edin</p>
                </div>
            </div>

            {/* Uyarı Kartı */}
            {criticalFields.length > 0 && (
                <Card variant="warning" className="warning-card">
                    <div className="warning-content">
                        <span className="warning-icon">⚠️</span>
                        <div className="warning-text">
                            <h3>Dikkat Gereken Tarlalar</h3>
                            <p>
                                {criticalFields.map(f => f.name).join(', ')} - Nem seviyeleri düşük. Acil sulama gerekebilir.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            <div className="control-grid">
                {/* Sulama Kontrol Paneli */}
                <Card title="Sulama Kontrolü" icon="💧" className="control-panel">
                    <div className="control-form">
                        <div className="form-group">
                            <label>Tarla Seçin</label>
                            <div className="field-selector">
                                {fields.map((field) => {
                                    const isSelected = selectedField === String(field.id);
                                    const statusEmoji = field.status === 'optimal' ? '🟢' : field.status === 'normal' ? '🔵' : field.status === 'warning' ? '🟡' : '🔴';
                                    return (
                                        <button
                                            key={field.id}
                                            type="button"
                                            className={`field-selector-item ${isSelected ? 'selected' : ''} ${field.status}`}
                                            onClick={() => !isWatering && setSelectedField(String(field.id))}
                                            disabled={isWatering}
                                        >
                                            <div className="field-selector-top">
                                                <span className="field-selector-name">{field.name}</span>
                                                <span className="field-selector-status">{statusEmoji}</span>
                                            </div>
                                            <div className="field-selector-moisture">
                                                {field.moisture !== '-' ? (
                                                    <>
                                                        <div className="field-selector-bar">
                                                            <div
                                                                className="field-selector-bar-fill"
                                                                style={{
                                                                    width: `${field.moisture}%`,
                                                                    background: field.moisture >= 60 ? 'var(--success)' : field.moisture >= 40 ? 'var(--warning)' : 'var(--danger)'
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="field-selector-value">%{field.moisture}</span>
                                                    </>
                                                ) : (
                                                    <span className="field-selector-nodata">Veri yok</span>
                                                )}
                                            </div>
                                            {isSelected && <div className="field-selector-check">✓</div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="duration">Sulama Süresi (dakika)</label>
                            <div className="duration-control">
                                <button
                                    className="duration-btn"
                                    onClick={() => setDuration(d => Math.max(5, d - 5))}
                                    disabled={isWatering}
                                >
                                    -
                                </button>
                                <input
                                    id="duration"
                                    type="number"
                                    className="input duration-input"
                                    value={duration}
                                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 0))}
                                    disabled={isWatering}
                                    min="1"
                                    max="120"
                                />
                                <button
                                    className="duration-btn"
                                    onClick={() => setDuration(d => Math.min(120, d + 5))}
                                    disabled={isWatering}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="control-buttons">
                            {!isWatering ? (
                                <button
                                    className="btn btn-success btn-large"
                                    onClick={handleStartWatering}
                                    disabled={!selectedField}
                                >
                                    <span>💧</span> Sulamayı Başlat
                                </button>
                            ) : (
                                <button
                                    className="btn btn-danger btn-large"
                                    onClick={handleStopWatering}
                                >
                                    <span>⏹️</span> Sulamayı Durdur
                                </button>
                            )}
                        </div>

                        {isWatering && (
                            <div className="watering-status">
                                <div className="watering-animation">
                                    <span className="water-drop">💧</span>
                                    <span className="water-drop">💧</span>
                                    <span className="water-drop">💧</span>
                                </div>
                                <p>
                                    <strong>{fields.find(f => f.id === wateringFieldId)?.name}</strong> sulanıyor...
                                </p>
                                <p className="watering-duration">Kalan süre: {duration} dakika</p>
                            </div>
                        )}

                        {/* Sulama tavsiyesi (backend'den) */}
                        {irrigationAdvice && irrigationAdvice.karar && (
                            <div style={{
                                marginTop: '1rem', padding: '0.75rem 1rem',
                                background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)',
                                borderRadius: 'var(--radius-md)', fontSize: '0.85rem'
                            }}>
                                <strong>Sistem Tavsiyesi:</strong> {irrigationAdvice.karar.detay}
                                <br/>
                                <span style={{ color: 'var(--gray-400)' }}>
                                    Pompa: {irrigationAdvice.karar.pompa} | Aciliyet: {irrigationAdvice.karar.aciliyet}
                                </span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Tarla Durumları */}
                <Card title="Tarla Durumları" icon="📊" className="status-panel">
                    <div className="field-status-list">
                        {fields.map((field) => (
                            <div
                                key={field.id}
                                className={`field-status-item ${field.status} ${wateringFieldId === field.id ? 'watering' : ''}`}
                            >
                                <div className="field-status-info">
                                    <span className="field-status-name">{field.name}</span>
                                    <span className={`badge badge-${field.status === 'optimal' ? 'success' : field.status === 'normal' ? 'info' : field.status === 'warning' ? 'warning' : 'danger'}`}>
                                        {field.status === 'optimal' ? 'Optimal' : field.status === 'normal' ? 'Normal' : field.status === 'warning' ? 'Dikkat' : 'Kritik'}
                                    </span>
                                </div>
                                <div className="field-moisture">
                                    <span className="moisture-label">Nem: {field.moisture !== '-' ? `%${field.moisture}` : 'Veri yok'}</span>
                                    {field.moisture !== '-' && (
                                        <div className="progress-bar">
                                            <div
                                                className="progress-bar-fill"
                                                style={{
                                                    width: `${field.moisture}%`,
                                                    background: field.moisture >= 60 ? 'var(--success)' : field.moisture >= 40 ? 'var(--warning)' : 'var(--danger)'
                                                }}
                                            ></div>
                                        </div>
                                    )}
                                </div>
                                {wateringFieldId === field.id && (
                                    <div className="field-watering-indicator">
                                        <span>💧 Sulanıyor</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Bilgi Notu */}
            <Card className="info-note">
                <div className="note-content">
                    <span className="note-icon">ℹ️</span>
                    <div className="note-text">
                        <h4>Manuel Sulama Hakkında</h4>
                        <p>
                            Manuel sulama sadece ekstrem durumlar için önerilir. Normal koşullarda akıllı sulama sistemi,
                            sensör verilerini analiz ederek en uygun sulama zamanlarını otomatik olarak belirler.
                            Manuel sulama, sistemin otomatik plan yapmasını geçici olarak devre dışı bırakır.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ManualControl;
