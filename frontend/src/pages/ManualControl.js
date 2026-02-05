import { useState } from 'react';
import Card from '../components/Card';
import './ManualControl.css';

/**
 * ManualControl Sayfası - Manuel Yönetim
 * Ekstrem durumlar için sulama sisteminin manuel kontrolü
 */
const ManualControl = () => {
    const [selectedField, setSelectedField] = useState('');
    const [duration, setDuration] = useState(15);
    const [isWatering, setIsWatering] = useState(false);
    const [wateringFieldId, setWateringFieldId] = useState(null);

    const fields = [
        { id: 1, name: 'Buğday Tarlası', moisture: 68, status: 'normal' },
        { id: 2, name: 'Domates Serası', moisture: 75, status: 'optimal' },
        { id: 3, name: 'Mısır Tarlası', moisture: 35, status: 'warning' },
        { id: 4, name: 'Ayçiçeği Tarlası', moisture: 55, status: 'normal' },
        { id: 5, name: 'Biber Serası', moisture: 20, status: 'critical' },
        { id: 6, name: 'Patates Tarlası', moisture: 62, status: 'optimal' },
    ];

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
                            <label htmlFor="field-select">Tarla Seçin</label>
                            <select
                                id="field-select"
                                className="select"
                                value={selectedField}
                                onChange={(e) => setSelectedField(e.target.value)}
                                disabled={isWatering}
                            >
                                <option value="">-- Tarla Seçin --</option>
                                {fields.map((field) => (
                                    <option key={field.id} value={field.id}>
                                        {field.name} (Nem: %{field.moisture})
                                    </option>
                                ))}
                            </select>
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
                                    <span className="moisture-label">Nem: %{field.moisture}</span>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${field.moisture}%`,
                                                background: field.moisture >= 60 ? 'var(--success)' : field.moisture >= 40 ? 'var(--warning)' : 'var(--danger)'
                                            }}
                                        ></div>
                                    </div>
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
