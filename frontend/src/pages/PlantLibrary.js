import { useState, useEffect } from 'react';
import { getPlantTypes } from '../services/api';
import Card from '../components/Card';
import './PlantLibrary.css';

// Frontend zengin bitki verisi (backend'de olmayan detaylar burada)
const PLANT_ENRICHMENT = {
    'Buğday': { icon: '🌾', category: 'Tahıl', plantingTime: 'Ekim-Kasım (Kışlık) / Mart-Nisan (Yazlık)', harvestTime: 'Haziran-Temmuz', waterNeed: 'Orta', waterAmount: '400-600 mm/sezon', soilType: 'Derin, verimli, drenajlı toprak', temperature: '15-25°C', tips: ['Toprağın iyi işlenmesi verim için önemlidir', 'Azotlu gübre kullanımı verimi artırır', 'Hastalık ve zararlılara karşı koruma yapılmalıdır'] },
    'Domates': { icon: '🍅', category: 'Sebze', plantingTime: 'Nisan-Mayıs (Fide)', harvestTime: 'Temmuz-Eylül', waterNeed: 'Yüksek', waterAmount: '600-800 mm/sezon', soilType: 'Organik maddece zengin, drenajlı', temperature: '20-30°C', tips: ['Düzenli sulama önemlidir, ani değişikliklerden kaçının', 'Destekleme/çapalama yapılmalıdır', 'Yaprakları ıslatmadan sulayın'] },
    'Mısır': { icon: '🌽', category: 'Tahıl', plantingTime: 'Nisan-Mayıs', harvestTime: 'Ağustos-Eylül', waterNeed: 'Yüksek', waterAmount: '500-800 mm/sezon', soilType: 'Derin, verimli, tınlı toprak', temperature: '18-30°C', tips: ['Çiçeklenme döneminde su çok önemlidir', 'Rüzgarlı bölgelerde tozlaşma sorunları olabilir', 'Azot ihtiyacı yüksektir'] },
    'Ayçiçeği': { icon: '🌻', category: 'Yağlı Tohum', plantingTime: 'Nisan', harvestTime: 'Ağustos-Eylül', waterNeed: 'Orta', waterAmount: '400-500 mm/sezon', soilType: 'Her türlü toprakta yetişir', temperature: '18-28°C', tips: ['Kuraklığa dayanıklıdır', 'Derin kök sistemi suyu verimli kullanır', 'Kuş hasarına karşı önlem alınmalıdır'] },
    'Biber': { icon: '🌶️', category: 'Sebze', plantingTime: 'Mayıs-Haziran (Fide)', harvestTime: 'Temmuz-Ekim', waterNeed: 'Orta-Yüksek', waterAmount: '500-700 mm/sezon', soilType: 'Kumlu-tınlı, organik zengin', temperature: '20-30°C', tips: ['Soğuğa karşı hassastır', 'Düzenli hasat verimı artırır', 'Sera ortamında daha başarılıdır'] },
    'Patates': { icon: '🥔', category: 'Yumru', plantingTime: 'Mart-Nisan', harvestTime: 'Haziran-Temmuz', waterNeed: 'Orta-Yüksek', waterAmount: '500-700 mm/sezon', soilType: 'Hafif, kumlu, iyi drenajlı', temperature: '15-22°C', tips: ['Yumru oluşum döneminde düzenli sulama şart', 'Boğaz doldurma işlemi yapılmalıdır', 'Mildiyö hastalığına dikkat edilmelidir'] },
    'Soğan': { icon: '🧅', category: 'Sebze', plantingTime: 'Şubat-Mart veya Eylül-Ekim', harvestTime: 'Haziran-Temmuz veya Mayıs-Haziran', waterNeed: 'Düşük-Orta', waterAmount: '350-500 mm/sezon', soilType: 'Kumlu-tınlı, iyi drenajlı', temperature: '13-24°C', tips: ['Hasattan 2-3 hafta önce sulama kesilmeli', 'Yabancı ot kontrolü önemlidir', 'Soğanlar yeşermeye başladığında olgunlaşmıştır'] },
    'Arpa': { icon: '🌿', category: 'Tahıl', plantingTime: 'Ekim-Kasım (Kışlık)', harvestTime: 'Haziran', waterNeed: 'Düşük-Orta', waterAmount: '300-450 mm/sezon', soilType: 'Her türlü toprak (alkali hariç)', temperature: '12-25°C', tips: ['Buğdaydan daha az su ihtiyacı var', 'Tuzlu topraklara toleranslı', 'Erken hasat malt kalitesini artırır'] },
};

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

                // Backend verilerini zengin frontend verisiyle eşleştir
                const enriched = backendPlants.map(bp => {
                    const extra = PLANT_ENRICHMENT[bp.name] || {};
                    return {
                        id: bp.id,
                        name: bp.name,
                        icon: extra.icon || '🌱',
                        category: extra.category || 'Genel',
                        plantingTime: extra.plantingTime || '-',
                        harvestTime: extra.harvestTime || '-',
                        waterNeed: extra.waterNeed || 'Orta',
                        waterAmount: extra.waterAmount || '-',
                        soilType: extra.soilType || '-',
                        temperature: extra.temperature || '-',
                        tips: extra.tips || [],
                        // Backend'den gelen teknik veriler
                        min_moisture: bp.min_moisture,
                        max_moisture: bp.max_moisture,
                        critical_moisture: bp.critical_moisture,
                        max_wait_hours: bp.max_wait_hours,
                    };
                });

                setPlants(enriched);
            } catch (err) {
                console.error('Bitki verileri yüklenemedi:', err);
                // Fallback: enrichment verisini doğrudan kullan
                const fallback = Object.entries(PLANT_ENRICHMENT).map(([name, data], i) => ({
                    id: i + 1, name, ...data, min_moisture: null, max_moisture: null,
                    critical_moisture: null, max_wait_hours: null,
                }));
                setPlants(fallback);
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
