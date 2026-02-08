import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFields, getPlantTypes, loginUser, updateFieldPlantType } from '../services/api';
import { getPlantImage } from '../data/plantImages';
import './FieldDetail.css';

/**
 * FieldDetail — Modal olarak açılan tarla detay bileşeni
 * Props: field (tarla objesi), onClose (kapatma), onFieldUpdated (güncelleme callback)
 */
const FieldDetail = ({ field: initialField, onClose, onFieldUpdated }) => {
    const { user } = useAuth();

    const [field, setField] = useState(initialField);
    const [plantTypes, setPlantTypes] = useState([]);

    // Hardcoded veriler (backend hazır olunca API'den gelecek)
    const FIELD_AREAS = {
        'Polatlı Buğday Tarlası': 50000,
        'Ayaş Domates Serası': 5000,
        'Haymana Ayçiçeği Tarlası': 80000,
        'Çubuk Patates Tarlası': 30000,
        'Beypazarı Biber Bahçesi': 15000,
        'Kalecik Çilek Bahçesi': 8000,
        'Şereflikoçhisar Soğan Tarlası': 40000,
        'Nallıhan Mısır Tarlası': 60000,
    };
    const PLANT_ECONOMICS = {
        'Domates': { yieldPerDonum: 5500, pricePerKg: 12 },
        'Buğday': { yieldPerDonum: 500, pricePerKg: 9 },
        'Ayçiçeği': { yieldPerDonum: 250, pricePerKg: 20 },
        'Patates': { yieldPerDonum: 3500, pricePerKg: 10 },
        'Kapya Biber': { yieldPerDonum: 3500, pricePerKg: 20 },
        'Çilek': { yieldPerDonum: 2000, pricePerKg: 45 },
        'Soğan': { yieldPerDonum: 4000, pricePerKg: 8 },
        'Mısır': { yieldPerDonum: 1000, pricePerKg: 8.5 },
    };

    // Bitki değiştirme state'leri
    const [showChangePlant, setShowChangePlant] = useState(false);
    const [selectedPlantId, setSelectedPlantId] = useState('');
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [password, setPassword] = useState('');
    const [changingPlant, setChangingPlant] = useState(false);
    const [changeError, setChangeError] = useState('');
    const [changeSuccess, setChangeSuccess] = useState('');

    useEffect(() => {
        const fetchPlantTypes = async () => {
            try {
                const res = await getPlantTypes();
                setPlantTypes(res.data);
            } catch (err) {
                console.error('Bitki türleri yüklenemedi:', err);
            }
        };
        fetchPlantTypes();
    }, []);

    // Sensör verileri
    const getLastSensorData = (f) => {
        const logs = f.sensor_logs || [];
        if (logs.length === 0) return { moisture: '-', temperature: '-', timestamp: null };
        const last = logs[logs.length - 1];
        return { moisture: last.moisture, temperature: last.temperature, timestamp: last.timestamp };
    };

    const getFieldStatus = (f) => {
        const logs = f.sensor_logs || [];
        if (logs.length === 0) return 'normal';
        const lastLog = logs[logs.length - 1];
        const moisture = lastLog.moisture;
        const pt = f.plant_type;
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

    const handleModalMove = (e) => {
        const modal = e.currentTarget;
        const rect = modal.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const tiltX = (-y * 6).toFixed(2);
        const tiltY = (x * 6).toFixed(2);
        modal.style.setProperty('--tilt-x', `${tiltX}deg`);
        modal.style.setProperty('--tilt-y', `${tiltY}deg`);
    };

    const handleModalLeave = (e) => {
        const modal = e.currentTarget;
        modal.style.setProperty('--tilt-x', '0deg');
        modal.style.setProperty('--tilt-y', '0deg');
    };

    // Bitki değiştirme
    const handlePlantSelect = (plantId) => {
        if (parseInt(plantId) === field.plant_type?.id) {
            setChangeError('Zaten bu bitki türü ekili.');
            return;
        }
        setSelectedPlantId(plantId);
        setChangeError('');
        setShowPasswordConfirm(true);
    };

    const handleConfirmChange = async (e) => {
        e.preventDefault();
        setChangeError('');
        setChangingPlant(true);

        try {
            await loginUser(user.email, password);
            await updateFieldPlantType(user.id, field.id, parseInt(selectedPlantId));

            const newPlant = plantTypes.find(pt => pt.id === parseInt(selectedPlantId));
            setChangeSuccess(`Bitki türü "${newPlant?.name}" olarak değiştirildi!`);
            setShowPasswordConfirm(false);
            setShowChangePlant(false);
            setPassword('');

            // Veriyi yeniden çek
            const fieldsRes = await getFields(user.id);
            const found = fieldsRes.data.find(f => f.id === field.id);
            if (found) setField(found);
            if (onFieldUpdated) onFieldUpdated();

        } catch (err) {
            if (err.response?.status === 401) {
                setChangeError('Şifre yanlış! Lütfen tekrar deneyin.');
            } else if (err.response?.status === 404 || err.response?.status === 405) {
                setChangeError('Backend endpoint henüz hazır değil.');
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
        <div className="field-detail-overlay" onClick={onClose}>
            <div
                className="field-detail-modal"
                onClick={(e) => e.stopPropagation()}
                onMouseMove={handleModalMove}
                onMouseLeave={handleModalLeave}
            >
                <button className="modal-close" onClick={onClose}>✕</button>

                {/* Banner Header */}
                <div
                    className="detail-banner-header"
                    style={{
                        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.5), rgba(15, 23, 42, 0.75)), url(${plantImage.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    <div className="detail-title-section">
                        <h2 className="detail-title">{field.name}</h2>
                        <span className="detail-subtitle">{field.location}, {field.ilce}</span>
                    </div>
                    <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span>
                </div>

                {/* Modal Content */}
                <div className="detail-content">
                    {/* Bitki Bilgisi */}
                    <div className="detail-plant-row">
                        <div className="detail-plant-info">
                            <span className="detail-plant-label">Ekili Bitki</span>
                            <span className="detail-plant-name">{field.plant_type?.name || 'Bilinmiyor'}</span>
                        </div>
                        <button
                            className="detail-change-plant-btn"
                            onClick={() => {
                                setShowChangePlant(!showChangePlant);
                                setChangeError('');
                                setChangeSuccess('');
                                setShowPasswordConfirm(false);
                            }}
                        >
                            Bitki Değiştir
                        </button>
                    </div>

                    {/* Başarı mesajı */}
                    {changeSuccess && (
                        <div className="detail-success-msg">{changeSuccess}</div>
                    )}

                    {/* Bitki Değiştirme Paneli */}
                    {showChangePlant && !showPasswordConfirm && (
                        <div className="detail-change-panel">
                            <div className="change-panel-header">
                                <h3>Bitki Türünü Değiştir</h3>
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
                        </div>
                    )}

                    {/* Sensör Verileri */}
                    <div className="info-grid">
                        {/* Alan Bilgisi */}
                        {FIELD_AREAS[field.name] && (
                            <div className="info-card">
                                <div className="info-details">
                                    <span className="info-label">Tarla Alanı</span>
                                    <span className="info-value">
                                        {(FIELD_AREAS[field.name] / 1000) % 1 === 0
                                            ? (FIELD_AREAS[field.name] / 1000)
                                            : (FIELD_AREAS[field.name] / 1000).toFixed(1)} dönüm
                                        <span className="info-sub">({FIELD_AREAS[field.name].toLocaleString('tr-TR')} m²)</span>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Tahmini Gelir */}
                        {FIELD_AREAS[field.name] && PLANT_ECONOMICS[field.plant_type?.name] && (
                            <div className="info-card info-card-income">
                                <div className="info-details">
                                    <span className="info-label">Tahmini Gelir</span>
                                    <span className="info-value info-value-income">
                                        ₺{((FIELD_AREAS[field.name] / 1000) * PLANT_ECONOMICS[field.plant_type.name].yieldPerDonum * PLANT_ECONOMICS[field.plant_type.name].pricePerKg).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                                <div className="income-breakdown">
                                    <span>{(FIELD_AREAS[field.name] / 1000).toFixed(1)} dönüm × {PLANT_ECONOMICS[field.plant_type.name].yieldPerDonum} kg/dönüm × ₺{PLANT_ECONOMICS[field.plant_type.name].pricePerKg}/kg</span>
                                </div>
                            </div>
                        )}

                        <div className="info-card">
                            <div className="info-details">
                                <span className="info-label">Nem</span>
                                <span className="info-value" style={{ color: getMoistureColor(moisture) }}>
                                    {moisture !== '-' ? `%${moisture}` : 'Veri yok'}
                                </span>
                            </div>
                            {moisture !== '-' && (
                                <div className="detail-progress-bar">
                                    <div
                                        className="detail-progress-fill"
                                        style={{ width: `${moistureNum}%`, background: getMoistureColor(moisture) }}
                                    ></div>
                                </div>
                            )}
                        </div>

                        <div className="info-card">
                            <div className="info-details">
                                <span className="info-label">Sıcaklık</span>
                                <span className="info-value" style={{ color: 'var(--info)' }}>
                                    {sensor.temperature !== '-' ? `${sensor.temperature}°C` : 'Veri yok'}
                                </span>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-details">
                                <span className="info-label">Pompa Debisi</span>
                                <span className="info-value">{field.pump_flow_rate} L/dk</span>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-details">
                                <span className="info-label">Su Birim Fiyatı</span>
                                <span className="info-value">₺{field.water_unit_price}/L</span>
                            </div>
                        </div>

                        {field.plant_type && (
                            <div className="info-card full-width">
                                <div className="info-details">
                                    <span className="info-label">Nem Eşikleri</span>
                                    <span className="info-value">
                                        Kritik: %{field.plant_type.critical_moisture} · Min: %{field.plant_type.min_moisture} · Max: %{field.plant_type.max_moisture}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Son Veri */}
                    <div className="detail-footer">
                        <span className="detail-footer-text">Son veri: {formatTimestamp(sensor.timestamp)}</span>
                    </div>
                </div>

                {/* Şifre Onay Modalı */}
                {showPasswordConfirm && (
                    <div className="password-overlay" onClick={handleCancelChange}>
                        <div className="password-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="password-modal-header">
                                <h3>Güvenlik Doğrulaması</h3>
                            </div>
                            <div className="password-modal-warning">
                                <p>Bitki türünü <strong>"{plantTypes.find(pt => pt.id === parseInt(selectedPlantId))?.name}"</strong> olarak değiştirmek üzeresiniz.</p>
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
                                        {changingPlant ? 'Doğrulanıyor...' : 'Onayla ve Değiştir'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FieldDetail;
