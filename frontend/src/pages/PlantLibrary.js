import { useState, useEffect } from 'react';
import { getPlantTypes } from '../services/api';
import Card from '../components/Card';
import './PlantLibrary.css';

const PlantLibrary = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlant, setSelectedPlant] = useState(null);
    const [plants, setPlants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlants = async () => {
            try {
                const res = await getPlantTypes();
                const backendPlants = res.data;

                // Tüm veriler artık backend'den geliyor
                const mapped = backendPlants.map(bp => {
                    let tips = [];
                    try {
                        tips = bp.tips ? JSON.parse(bp.tips) : [];
                    } catch {
                        tips = bp.tips ? [bp.tips] : [];
                    }
                    return {
                        id: bp.id,
                        name: bp.name,
                        icon: bp.icon || '🌱',
                        category: bp.category || 'Genel',
                        plantingTime: bp.planting_time || '-',
                        harvestTime: bp.harvest_time || '-',
                        waterNeed: bp.water_need || 'Orta',
                        waterAmount: bp.water_amount || '-',
                        soilType: bp.soil_type || '-',
                        temperature: bp.ideal_temp || '-',
                        tips: tips,
                        min_moisture: bp.min_moisture,
                        max_moisture: bp.max_moisture,
                        critical_moisture: bp.critical_moisture,
                        max_wait_hours: bp.max_wait_hours,
                    };
                });

                setPlants(mapped);
            } catch (err) {
                console.error('Bitki verileri yüklenemedi:', err);
                setPlants([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPlants();
    }, []);

    const filteredPlants = plants.filter(plant =>
        plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plant.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getWaterNeedClass = (need) => {
        switch (need) {
            case 'Düşük':
            case 'Düşük-Orta':
                return 'water-low';
            case 'Orta':
                return 'water-medium';
            case 'Yüksek':
            case 'Orta-Yüksek':
                return 'water-high';
            default:
                return 'water-medium';
        }
    };

    if (loading) {
        return (
            <div className="plant-library">
                <div className="page-header">
                    <div className="page-header-content">
                        <h1 className="page-title">🌱 Bitki Kütüphanesi</h1>
                        <p className="page-subtitle">Veriler yükleniyor...</p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
                    <p style={{ fontSize: '2rem' }}>⏳</p>
                    <p>Bitki bilgileri yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="plant-library">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">🌱 Bitki Kütüphanesi</h1>
                    <p className="page-subtitle">Bitkiler hakkında detaylı bilgi edinin</p>
                </div>
            </div>

            {/* Arama */}
            <div className="search-container">
                <input
                    type="text"
                    className="input search-input"
                    placeholder="🔍 Bitki ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Bitki Grid */}
            <div className="plants-grid">
                {filteredPlants.map((plant) => (
                    <Card
                        key={plant.id}
                        className="plant-card"
                        onClick={() => setSelectedPlant(plant)}
                    >
                        <div className="plant-icon-large">{plant.icon}</div>
                        <h3 className="plant-name">{plant.name}</h3>
                        <span className="plant-category">{plant.category}</span>

                        <div className="plant-quick-info">
                            <div className="quick-info-item">
                                <span className="info-label">Su İhtiyacı</span>
                                <span className={`info-value ${getWaterNeedClass(plant.waterNeed)}`}>
                                    {plant.waterNeed}
                                </span>
                            </div>
                            <div className="quick-info-item">
                                <span className="info-label">Hasat</span>
                                <span className="info-value">{plant.harvestTime}</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Detay Modal */}
            {selectedPlant && (
                <div className="plant-modal-overlay" onClick={() => setSelectedPlant(null)}>
                    <div className="plant-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedPlant(null)}>✕</button>

                        <div className="modal-header">
                            <span className="modal-icon">{selectedPlant.icon}</span>
                            <div className="modal-title-section">
                                <h2>{selectedPlant.name}</h2>
                                <span className="plant-category">{selectedPlant.category}</span>
                            </div>
                        </div>

                        <div className="modal-content">
                            <div className="info-grid">
                                <div className="info-card">
                                    <span className="info-icon">📅</span>
                                    <div className="info-details">
                                        <span className="info-label">Ekim Zamanı</span>
                                        <span className="info-value">{selectedPlant.plantingTime}</span>
                                    </div>
                                </div>

                                <div className="info-card">
                                    <span className="info-icon">🌾</span>
                                    <div className="info-details">
                                        <span className="info-label">Hasat Zamanı</span>
                                        <span className="info-value">{selectedPlant.harvestTime}</span>
                                    </div>
                                </div>

                                <div className="info-card">
                                    <span className="info-icon">💧</span>
                                    <div className="info-details">
                                        <span className="info-label">Su İhtiyacı</span>
                                        <span className={`info-value ${getWaterNeedClass(selectedPlant.waterNeed)}`}>
                                            {selectedPlant.waterNeed} ({selectedPlant.waterAmount})
                                        </span>
                                    </div>
                                </div>

                                <div className="info-card">
                                    <span className="info-icon">🌡️</span>
                                    <div className="info-details">
                                        <span className="info-label">Sıcaklık</span>
                                        <span className="info-value">{selectedPlant.temperature}</span>
                                    </div>
                                </div>

                                <div className="info-card full-width">
                                    <span className="info-icon">🌍</span>
                                    <div className="info-details">
                                        <span className="info-label">Toprak Tipi</span>
                                        <span className="info-value">{selectedPlant.soilType}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Backend'den gelen teknik sulama verileri */}
                            {selectedPlant.min_moisture != null && (
                                <div className="info-grid" style={{ marginTop: '1rem' }}>
                                    <div className="info-card">
                                        <span className="info-icon">💦</span>
                                        <div className="info-details">
                                            <span className="info-label">Min Nem</span>
                                            <span className="info-value">%{selectedPlant.min_moisture}</span>
                                        </div>
                                    </div>
                                    <div className="info-card">
                                        <span className="info-icon">💦</span>
                                        <div className="info-details">
                                            <span className="info-label">Max Nem</span>
                                            <span className="info-value">%{selectedPlant.max_moisture}</span>
                                        </div>
                                    </div>
                                    <div className="info-card">
                                        <span className="info-icon">🚨</span>
                                        <div className="info-details">
                                            <span className="info-label">Kritik Nem</span>
                                            <span className="info-value">%{selectedPlant.critical_moisture}</span>
                                        </div>
                                    </div>
                                    <div className="info-card">
                                        <span className="info-icon">⏱️</span>
                                        <div className="info-details">
                                            <span className="info-label">Maks Bekleme</span>
                                            <span className="info-value">{selectedPlant.max_wait_hours} saat</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="tips-section">
                                <h4>💡 Yetiştirme İpuçları</h4>
                                <ul className="tips-list">
                                    {selectedPlant.tips.map((tip, index) => (
                                        <li key={index}>{tip}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlantLibrary;
