import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFields, createField, getPlantTypes, getIlceler } from '../services/api';
import Card from '../components/Card';
import './Fields.css';

const Fields = () => {
    const { user } = useAuth();
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [plantTypes, setPlantTypes] = useState([]);
    const [ilceler, setIlceler] = useState({});
    const [newField, setNewField] = useState({ name: '', location: '', ilce: '', plant_type_id: '', pump_flow_rate: 100, water_unit_price: 1.5 });
    const [submitting, setSubmitting] = useState(false);
    const [addError, setAddError] = useState('');

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

    useEffect(() => { fetchFields(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.id]);

    const openAddModal = async () => {
        setShowAddModal(true);
        setAddError('');
        try {
            const [ptRes, ilceRes] = await Promise.all([getPlantTypes(), getIlceler()]);
            setPlantTypes(ptRes.data);
            setIlceler(ilceRes.data.iller || ilceRes.data);
        } catch (err) {
            console.error('Form verileri yüklenemedi:', err);
        }
    };

    const handleAddField = async (e) => {
        e.preventDefault();
        setAddError('');
        setSubmitting(true);
        try {
            await createField(user.id, {
                name: newField.name,
                location: newField.location,
                ilce: newField.ilce,
                plant_type_id: parseInt(newField.plant_type_id),
                pump_flow_rate: parseFloat(newField.pump_flow_rate),
                water_unit_price: parseFloat(newField.water_unit_price),
            });
            setShowAddModal(false);
            setNewField({ name: '', location: '', ilce: '', plant_type_id: '', pump_flow_rate: 100, water_unit_price: 1.5 });
            await fetchFields();
        } catch (err) {
            setAddError(err.response?.data?.detail || 'Tarla eklenirken hata oluştu');
        } finally {
            setSubmitting(false);
        }
    };

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
                <button className="btn btn-primary" onClick={openAddModal}>
                    <span>➕</span> Yeni Tarla Ekle
                </button>
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
                        return (
                            <Card key={field.id} className={`field-card field-${field.status}`}>
                                <div className="field-header">
                                    <div className="field-info">
                                        <h3 className="field-name">{field.name}</h3>
                                        <p className="field-location">📍 {field.location}, {field.ilce}</p>
                                    </div>
                                    <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span>
                                </div>

                                <div className="field-plant">
                                    <span className="plant-icon">🌱</span>
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
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Yeni Tarla Ekleme Modalı */}
            {showAddModal && (
                <div className="plant-modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="plant-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
                        <div className="modal-header">
                            <span className="modal-icon">🌾</span>
                            <div className="modal-title-section">
                                <h2>Yeni Tarla Ekle</h2>
                            </div>
                        </div>
                        <div className="modal-content">
                            <form onSubmit={handleAddField}>
                                <div className="info-grid">
                                    <div className="info-card full-width">
                                        <div className="info-details" style={{ width: '100%' }}>
                                            <label className="info-label">Tarla Adı</label>
                                            <input className="input" type="text" required value={newField.name}
                                                onChange={e => setNewField({ ...newField, name: e.target.value })}
                                                placeholder="Örn: Buğday Tarlası" />
                                        </div>
                                    </div>
                                    <div className="info-card">
                                        <div className="info-details" style={{ width: '100%' }}>
                                            <label className="info-label">Konum</label>
                                            <input className="input" type="text" required value={newField.location}
                                                onChange={e => setNewField({ ...newField, location: e.target.value })}
                                                placeholder="Örn: Ankara" />
                                        </div>
                                    </div>
                                    <div className="info-card">
                                        <div className="info-details" style={{ width: '100%' }}>
                                            <label className="info-label">İlçe</label>
                                            <select className="input" required value={newField.ilce}
                                                onChange={e => setNewField({ ...newField, ilce: e.target.value })}>
                                                <option value="">İlçe seçin</option>
                                                {Object.entries(ilceler).map(([il, ilcelerList]) => (
                                                    <optgroup key={il} label={il}>
                                                        {(Array.isArray(ilcelerList) ? ilcelerList : Object.keys(ilcelerList)).map(ilce => (
                                                            <option key={typeof ilce === 'string' ? ilce : ilce} value={typeof ilce === 'string' ? ilce : ilce}>
                                                                {typeof ilce === 'string' ? ilce : ilce}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="info-card full-width">
                                        <div className="info-details" style={{ width: '100%' }}>
                                            <label className="info-label">Bitki Türü</label>
                                            <select className="input" required value={newField.plant_type_id}
                                                onChange={e => setNewField({ ...newField, plant_type_id: e.target.value })}>
                                                <option value="">Bitki türü seçin</option>
                                                {plantTypes.map(pt => (
                                                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="info-card">
                                        <div className="info-details" style={{ width: '100%' }}>
                                            <label className="info-label">Pompa Debisi (L/dk)</label>
                                            <input className="input" type="number" step="0.1" value={newField.pump_flow_rate}
                                                onChange={e => setNewField({ ...newField, pump_flow_rate: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="info-card">
                                        <div className="info-details" style={{ width: '100%' }}>
                                            <label className="info-label">Su Birim Fiyatı (₺/L)</label>
                                            <input className="input" type="number" step="0.01" value={newField.water_unit_price}
                                                onChange={e => setNewField({ ...newField, water_unit_price: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                                {addError && <div style={{ color: '#f44336', textAlign: 'center', margin: '1rem 0', fontSize: '0.9rem' }}>{addError}</div>}
                                <button type="submit" className="btn btn-primary" disabled={submitting}
                                    style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem' }}>
                                    {submitting ? 'Ekleniyor...' : '✅ Tarla Ekle'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Fields;
