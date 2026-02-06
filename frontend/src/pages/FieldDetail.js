import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFields, getPlantTypes, loginUser, updateFieldPlantType } from '../services/api';
import { getPlantImage } from '../data/plantImages';
import Card from '../components/Card';
import './FieldDetail.css';

/**
 * FieldDetail Bileşeni
 * Single Responsibility: Tarla detaylarını gösterme ve bitki türü değiştirme
 */
const FieldDetail = () => {
    const { fieldId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [field, setField] = useState(null);
    const [loading, setLoading] = useState(true);
    const [plantTypes, setPlantTypes] = useState([]);

    // Bitki değiştirme state'leri
    const [showChangePlant, setShowChangePlant] = useState(false);
    const [selectedPlantId, setSelectedPlantId] = useState('');
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [password, setPassword] = useState('');
    const [changingPlant, setChangingPlant] = useState(false);
    const [changeError, setChangeError] = useState('');
    const [changeSuccess, setChangeSuccess] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [fieldsRes, plantTypesRes] = await Promise.all([
                    getFields(user.id),
                    getPlantTypes()
                ]);
                const found = fieldsRes.data.find(f => f.id === parseInt(fieldId));
                setField(found || null);
                setPlantTypes(plantTypesRes.data);
            } catch (err) {
                console.error('Veriler yüklenemedi:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user.id, fieldId]);

    // Sensör verileri
    const getLastSensorData = (field) => {
        const logs = field.sensor_logs || [];
        if (logs.length === 0) return { moisture: '-', temperature: '-', timestamp: null };
        const last = logs[logs.length - 1];
        return { moisture: last.moisture, temperature: last.temperature, timestamp: last.timestamp };
    };

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

    const formatTimestamp = (ts) => {
        if (!ts) return 'Veri yok';
        const date = new Date(ts);
        const now = new Date();
        const diff = Math.floor((now - date) / 60000);
        if (diff < 60) return `${diff} dk önce`;
        if (diff < 1440) return `${Math.floor(diff / 60)} saat önce`;
        return date.toLocaleDateString('tr-TR');
    };

    const getMoistureColor = (moisture) => {
        if (moisture === '-') return 'var(--gray-400)';
        if (moisture >= 60) return 'var(--success)';
        if (moisture >= 40) return 'var(--warning)';
        return 'var(--danger)';
    };

    // Bitki değiştirme: Seçim yaptıktan sonra şifre sor
    const handlePlantSelect = (plantId) => {
        if (parseInt(plantId) === field.plant_type?.id) {
            setChangeError('Zaten bu bitki türü ekili.');
            return;
        }
        setSelectedPlantId(plantId);
        setChangeError('');
        setShowPasswordConfirm(true);
    };

    // Şifre doğrula ve bitki değiştir
    const handleConfirmChange = async (e) => {
        e.preventDefault();
        setChangeError('');
        setChangingPlant(true);

        try {
            // 1. Şifre doğrula (login endpoint ile)
            await loginUser(user.email, password);

            // 2. Bitki türünü güncelle
            await updateFieldPlantType(user.id, field.id, parseInt(selectedPlantId));

            const newPlant = plantTypes.find(pt => pt.id === parseInt(selectedPlantId));
            setChangeSuccess(`Bitki türü "${newPlant?.name}" olarak değiştirildi!`);
            setShowPasswordConfirm(false);
            setShowChangePlant(false);
            setPassword('');

            // Veriyi yeniden çek
            const fieldsRes = await getFields(user.id);
            const found = fieldsRes.data.find(f => f.id === parseInt(fieldId));
            setField(found || field);

        } catch (err) {
            if (err.response?.status === 401) {
                setChangeError('Şifre yanlış! Lütfen tekrar deneyin.');
            } else if (err.response?.status === 404 || err.response?.status === 405) {
                setChangeError('Backend endpoint henüz hazır değil. Arkadaşına PUT /users/{id}/fields/{id}/plant-type endpoint eklemesini söyle.');
            } else {
                setChangeError('Bir hata oluştu. Lütfen tekrar deneyin.');
            }
        } finally {
            setChangingPlant(false);
        }
    };

    const handleCancelChange = () => {
        setShowPasswordConfirm(false);
        setPassword('');
        setChangeError('');
        setSelectedPlantId('');
    };

    if (loading) {
        return (
            <div className="field-detail-page">
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                    <p style={{ fontSize: '2rem' }}>⏳</p>
                    <p>Tarla bilgileri yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (!field) {
        return (
            <div className="field-detail-page">
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                    <p style={{ fontSize: '2rem' }}>❌</p>
                    <p>Tarla bulunamadı.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/fields')} style={{ marginTop: '1rem' }}>
                        ← Tarlalarıma Dön
                    </button>
                </div>
            </div>
        );
    }

    const sensor = getLastSensorData(field);
    const status = getFieldStatus(field);
    const plantName = field.plant_type?.name || 'default';
    const plantImage = getPlantImage(plantName);
    const moisture = sensor.moisture;
    const moistureNum = typeof moisture === 'number' ? moisture : 0;

    const statusConfig = {
        optimal: { label: 'Optimal', class: 'badge-success' },
        normal: { label: 'Normal', class: 'badge-info' },
        warning: { label: 'Dikkat', class: 'badge-warning' },
        critical: { label: 'Kritik', class: 'badge-danger' },
    };
    const statusBadge = statusConfig[status] || statusConfig.normal;

    return (
        <div className="field-detail-page">
            {/* Geri butonu + Başlık */}
            <div className="detail-header">
                <button className="detail-back-btn" onClick={() => navigate('/fields')}>
                    ← Geri
                </button>
                <div className="detail-title-section">
                    <h1 className="detail-title">{field.name}</h1>
                    <p className="detail-subtitle">📍 {field.location}, {field.ilce}</p>
                </div>
                <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span>
            </div>

            {/* Bitki Banner */}
            <div
                className="detail-plant-banner"
                style={{
                    backgroundImage: `linear-gradient(90deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.4) 100%), url(${plantImage.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <div className="detail-plant-info">
                    <span className="detail-plant-label">Ekili Bitki</span>
                    <span className="detail-plant-name">{field.plant_type?.name || 'Bilinmiyor'}</span>
                </div>
                <button
                    className="btn btn-sm detail-change-plant-btn"
                    onClick={() => {
                        setShowChangePlant(!showChangePlant);
                        setChangeError('');
                        setChangeSuccess('');
                        setShowPasswordConfirm(false);
                    }}
                >
                    ✏️ Bitki Değiştir
                </button>
            </div>

            {/* Başarı mesajı */}
            {changeSuccess && (
                <div className="detail-success-msg">
                    ✅ {changeSuccess}
                </div>
            )}

            {/* Bitki Değiştirme Paneli */}
            {showChangePlant && !showPasswordConfirm && (
                <Card className="detail-change-panel">
                    <div className="change-panel-header">
                        <h3>⚠️ Bitki Türünü Değiştir</h3>
                        <p className="change-warning">
                            Bitki türünü değiştirmek, tüm sulama planlarını, nem eşik değerlerini ve yapay zeka tahminlerini sıfırlayacaktır. 
                            Bu işlem geri alınamaz.
                        </p>
                    </div>
                    <div className="plant-type-grid">
                        {plantTypes.map((pt) => {
                            const ptImage = getPlantImage(pt.name);
                            const isCurrent = pt.id === field.plant_type?.id;
                            return (
                                <button
                                    key={pt.id}
                                    className={`plant-type-option ${isCurrent ? 'current' : ''}`}
                                    onClick={() => !isCurrent && handlePlantSelect(pt.id)}
                                    disabled={isCurrent}
                                    style={{
                                        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.5)), url(${ptImage.image})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                >
                                    <span className="plant-type-name">{pt.name}</span>
                                    {isCurrent && <span className="plant-type-current-badge">Mevcut</span>}
                                </button>
                            );
                        })}
                    </div>
                    {changeError && <p className="change-error">{changeError}</p>}
                </Card>
            )}

            {/* Şifre Onay Modalı */}
            {showPasswordConfirm && (
                <div className="password-overlay" onClick={handleCancelChange}>
                    <div className="password-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="password-modal-header">
                            <span className="password-modal-icon">🔒</span>
                            <h3>Güvenlik Doğrulaması</h3>
                        </div>
                        <div className="password-modal-warning">
                            <p>⚠️ Bitki türünü <strong>"{plantTypes.find(pt => pt.id === parseInt(selectedPlantId))?.name}"</strong> olarak değiştirmek üzeresiniz.</p>
                            <p>Bu işlem tüm sulama ayarlarını etkileyecektir. Devam etmek için şifrenizi girin.</p>
                        </div>
                        <form onSubmit={handleConfirmChange}>
                            <div className="password-input-group">
                                <label>Şifreniz</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Şifrenizi girin..."
                                    required
                                    autoFocus
                                />
                            </div>
                            {changeError && <p className="change-error">{changeError}</p>}
                            <div className="password-modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={handleCancelChange}>
                                    İptal
                                </button>
                                <button type="submit" className="btn btn-danger" disabled={changingPlant || !password}>
                                    {changingPlant ? 'Doğrulanıyor...' : '🔓 Onayla ve Değiştir'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sensör Verileri */}
            <div className="detail-grid">
                <Card className="detail-sensor-card">
                    <h3 className="detail-card-title">💧 Nem Durumu</h3>
                    <div className="detail-sensor-big">
                        <span className="detail-big-value" style={{ color: getMoistureColor(moisture) }}>
                            {moisture !== '-' ? `%${moisture}` : 'Veri yok'}
                        </span>
                        {moisture !== '-' && (
                            <div className="detail-progress-bar">
                                <div
                                    className="detail-progress-fill"
                                    style={{ width: `${moistureNum}%`, background: getMoistureColor(moisture) }}
                                ></div>
                            </div>
                        )}
                        {field.plant_type && (
                            <div className="detail-thresholds">
                                <span>Kritik: %{field.plant_type.critical_moisture}</span>
                                <span>Min: %{field.plant_type.min_moisture}</span>
                                <span>Max: %{field.plant_type.max_moisture}</span>
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="detail-sensor-card">
                    <h3 className="detail-card-title">🌡️ Sıcaklık</h3>
                    <div className="detail-sensor-big">
                        <span className="detail-big-value" style={{ color: 'var(--info)' }}>
                            {sensor.temperature !== '-' ? `${sensor.temperature}°C` : 'Veri yok'}
                        </span>
                    </div>
                </Card>

                <Card className="detail-sensor-card">
                    <h3 className="detail-card-title">📊 Tarla Bilgileri</h3>
                    <div className="detail-info-list">
                        <div className="detail-info-row">
                            <span className="detail-info-label">Pompa Debisi</span>
                            <span className="detail-info-value">{field.pump_flow_rate} L/dk</span>
                        </div>
                        <div className="detail-info-row">
                            <span className="detail-info-label">Su Birim Fiyatı</span>
                            <span className="detail-info-value">₺{field.water_unit_price}/L</span>
                        </div>
                        <div className="detail-info-row">
                            <span className="detail-info-label">Son Veri</span>
                            <span className="detail-info-value">{formatTimestamp(sensor.timestamp)}</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default FieldDetail;
