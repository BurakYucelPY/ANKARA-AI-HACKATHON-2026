import { useState } from 'react';
import Card from '../components/Card';
import './PlantLibrary.css';

/**
 * PlantLibrary Sayfası - Bitki Kütüphanesi
 * Bitkiler hakkında eğitici bilgiler
 */
const PlantLibrary = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlant, setSelectedPlant] = useState(null);

    const plants = [
        {
            id: 1,
            name: 'Buğday',
            icon: '🌾',
            category: 'Tahıl',
            plantingTime: 'Ekim-Kasım (Kışlık) / Mart-Nisan (Yazlık)',
            harvestTime: 'Haziran-Temmuz',
            waterNeed: 'Orta',
            waterAmount: '400-600 mm/sezon',
            soilType: 'Derin, verimli, drenajlı toprak',
            temperature: '15-25°C',
            tips: [
                'Toprağın iyi işlenmesi verim için önemlidir',
                'Azotlu gübre kullanımı verimi artırır',
                'Hastalık ve zararlılara karşı koruma yapılmalıdır',
            ],
        },
        {
            id: 2,
            name: 'Domates',
            icon: '🍅',
            category: 'Sebze',
            plantingTime: 'Nisan-Mayıs (Fide)',
            harvestTime: 'Temmuz-Eylül',
            waterNeed: 'Yüksek',
            waterAmount: '600-800 mm/sezon',
            soilType: 'Organik maddece zengin, drenajlı',
            temperature: '20-30°C',
            tips: [
                'Düzenli sulama önemlidir, ani değişikliklerden kaçının',
                'Destekleme/çapalama yapılmalıdır',
                'Yaprakları ıslatmadan sulayın',
            ],
        },
        {
            id: 3,
            name: 'Mısır',
            icon: '🌽',
            category: 'Tahıl',
            plantingTime: 'Nisan-Mayıs',
            harvestTime: 'Ağustos-Eylül',
            waterNeed: 'Yüksek',
            waterAmount: '500-800 mm/sezon',
            soilType: 'Derin, verimli, tınlı toprak',
            temperature: '18-30°C',
            tips: [
                'Çiçeklenme döneminde su çok önemlidir',
                'Rüzgarlı bölgelerde tozlaşma sorunları olabilir',
                'Azot ihtiyacı yüksektir',
            ],
        },
        {
            id: 4,
            name: 'Ayçiçeği',
            icon: '🌻',
            category: 'Yağlı Tohum',
            plantingTime: 'Nisan',
            harvestTime: 'Ağustos-Eylül',
            waterNeed: 'Orta',
            waterAmount: '400-500 mm/sezon',
            soilType: 'Her türlü toprakta yetişir',
            temperature: '18-28°C',
            tips: [
                'Kuraklığa dayanıklıdır',
                'Derin kök sistemi suyu verimli kullanır',
                'Kuş hasarına karşı önlem alınmalıdır',
            ],
        },
        {
            id: 5,
            name: 'Biber',
            icon: '🌶️',
            category: 'Sebze',
            plantingTime: 'Mayıs-Haziran (Fide)',
            harvestTime: 'Temmuz-Ekim',
            waterNeed: 'Orta-Yüksek',
            waterAmount: '500-700 mm/sezon',
            soilType: 'Kumlu-tınlı, organik zengin',
            temperature: '20-30°C',
            tips: [
                'Soğuğa karşı hassastır',
                'Düzenli hasat verimı artırır',
                'Sera ortamında daha başarılıdır',
            ],
        },
        {
            id: 6,
            name: 'Patates',
            icon: '🥔',
            category: 'Yumru',
            plantingTime: 'Mart-Nisan',
            harvestTime: 'Haziran-Temmuz',
            waterNeed: 'Orta-Yüksek',
            waterAmount: '500-700 mm/sezon',
            soilType: 'Hafif, kumlu, iyi drenajlı',
            temperature: '15-22°C',
            tips: [
                'Yumru oluşum döneminde düzenli sulama şart',
                'Boğaz doldurma işlemi yapılmalıdır',
                'Mildiyö hastalığına dikkat edilmelidir',
            ],
        },
        {
            id: 7,
            name: 'Soğan',
            icon: '🧅',
            category: 'Sebze',
            plantingTime: 'Şubat-Mart veya Eylül-Ekim',
            harvestTime: 'Haziran-Temmuz veya Mayıs-Haziran',
            waterNeed: 'Düşük-Orta',
            waterAmount: '350-500 mm/sezon',
            soilType: 'Kumlu-tınlı, iyi drenajlı',
            temperature: '13-24°C',
            tips: [
                'Hasattan 2-3 hafta önce sulama kesilmeli',
                'Yabancı ot kontrolü önemlidir',
                'Soğanlar yeşermeye başladığında olgunlaşmıştır',
            ],
        },
        {
            id: 8,
            name: 'Arpa',
            icon: '🌿',
            category: 'Tahıl',
            plantingTime: 'Ekim-Kasım (Kışlık)',
            harvestTime: 'Haziran',
            waterNeed: 'Düşük-Orta',
            waterAmount: '300-450 mm/sezon',
            soilType: 'Her türlü toprak (alkali hariç)',
            temperature: '12-25°C',
            tips: [
                'Buğdaydan daha az su ihtiyacı var',
                'Tuzlu topraklara toleranslı',
                'Erken hasat malt kalitesini artırır',
            ],
        },
    ];

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
