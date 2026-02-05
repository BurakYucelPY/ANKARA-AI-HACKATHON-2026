import Card from '../components/Card';
import './Weather.css';

/**
 * Weather Sayfası - Hava Durumu
 * Tarla konumlarındaki hava durumlarını gösterir
 */
const Weather = () => {
    // Tarla verileri (gerçek uygulamada context/state management'dan gelecek)
    const fields = [
        { id: 1, name: 'Buğday Tarlası', city: 'Ankara', district: 'Polatlı' },
        { id: 2, name: 'Domates Serası', city: 'Ankara', district: 'Polatlı' },
        { id: 6, name: 'Patates Tarlası', city: 'Ankara', district: 'Polatlı' },
        { id: 3, name: 'Mısır Tarlası', city: 'Konya', district: 'Ereğli' },
        { id: 4, name: 'Ayçiçeği Tarlası', city: 'Konya', district: 'Ereğli' },
        { id: 5, name: 'Biber Serası', city: 'Antalya', district: 'Kumluca' },
    ];

    // Mock hava durumu verileri (gerçek uygulamada API'den gelecek)
    const weatherData = {
        'Ankara-Polatlı': {
            city: 'Ankara',
            district: 'Polatlı',
            temperature: 12,
            feelsLike: 10,
            humidity: 65,
            windSpeed: 15,
            windDirection: 'KB',
            condition: 'Parçalı Bulutlu',
            conditionIcon: '⛅',
            precipitation: 20,
            uvIndex: 3,
            pressure: 1015,
            visibility: 10,
            forecast: [
                { day: 'Bugün', high: 14, low: 5, icon: '⛅', condition: 'Parçalı Bulutlu' },
                { day: 'Yarın', high: 16, low: 7, icon: '☀️', condition: 'Güneşli' },
                { day: 'Perşembe', high: 18, low: 8, icon: '☀️', condition: 'Açık' },
                { day: 'Cuma', high: 15, low: 6, icon: '🌧️', condition: 'Yağmurlu' },
                { day: 'Cumartesi', high: 13, low: 4, icon: '🌧️', condition: 'Sağanak' },
            ],
            alerts: [],
        },
        'Konya-Ereğli': {
            city: 'Konya',
            district: 'Ereğli',
            temperature: 10,
            feelsLike: 8,
            humidity: 55,
            windSpeed: 20,
            windDirection: 'K',
            condition: 'Açık',
            conditionIcon: '☀️',
            precipitation: 5,
            uvIndex: 4,
            pressure: 1018,
            visibility: 15,
            forecast: [
                { day: 'Bugün', high: 12, low: 2, icon: '☀️', condition: 'Açık' },
                { day: 'Yarın', high: 14, low: 4, icon: '☀️', condition: 'Güneşli' },
                { day: 'Perşembe', high: 15, low: 5, icon: '⛅', condition: 'Parçalı Bulutlu' },
                { day: 'Cuma', high: 13, low: 3, icon: '☀️', condition: 'Açık' },
                { day: 'Cumartesi', high: 11, low: 1, icon: '❄️', condition: 'Soğuk' },
            ],
            alerts: [
                { type: 'frost', message: 'Cumartesi günü don uyarısı - Bitkileri korumaya alın' }
            ],
        },
        'Antalya-Kumluca': {
            city: 'Antalya',
            district: 'Kumluca',
            temperature: 22,
            feelsLike: 24,
            humidity: 70,
            windSpeed: 10,
            windDirection: 'G',
            condition: 'Güneşli',
            conditionIcon: '☀️',
            precipitation: 0,
            uvIndex: 7,
            pressure: 1012,
            visibility: 20,
            forecast: [
                { day: 'Bugün', high: 24, low: 15, icon: '☀️', condition: 'Güneşli' },
                { day: 'Yarın', high: 25, low: 16, icon: '☀️', condition: 'Güneşli' },
                { day: 'Perşembe', high: 26, low: 17, icon: '⛅', condition: 'Az Bulutlu' },
                { day: 'Cuma', high: 24, low: 15, icon: '☀️', condition: 'Güneşli' },
                { day: 'Cumartesi', high: 23, low: 14, icon: '🌤️', condition: 'Parçalı Güneşli' },
            ],
            alerts: [
                { type: 'uv', message: 'Yüksek UV indeksi - Sera örtülerini kontrol edin' }
            ],
        },
    };

    // Konumlara göre tarlaları grupla
    const getFieldsByLocation = (city, district) => {
        return fields.filter(f => f.city === city && f.district === district);
    };

    // Benzersiz konumları al
    const locations = Object.keys(weatherData);

    return (
        <div className="weather-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">🌤️ Hava Durumu</h1>
                    <p className="page-subtitle">Tarlalarınızın bulunduğu konumlardaki hava durumu</p>
                </div>
            </div>

            {/* Hava Durumu Kartları */}
            <div className="weather-grid">
                {locations.map((locationKey) => {
                    const weather = weatherData[locationKey];
                    const locationFields = getFieldsByLocation(weather.city, weather.district);

                    return (
                        <Card key={locationKey} className="weather-card">
                            {/* Konum ve Mevcut Durum */}
                            <div className="weather-header">
                                <div className="weather-location">
                                    <h2>{weather.city}</h2>
                                    <p>{weather.district}</p>
                                </div>
                                <div className="weather-current">
                                    <span className="weather-icon">{weather.conditionIcon}</span>
                                    <span className="weather-temp">{weather.temperature}°C</span>
                                </div>
                            </div>

                            <p className="weather-condition">{weather.condition}</p>

                            {/* Uyarılar */}
                            {weather.alerts.length > 0 && (
                                <div className="weather-alerts">
                                    {weather.alerts.map((alert, index) => (
                                        <div key={index} className={`weather-alert alert-${alert.type}`}>
                                            <span className="alert-icon">⚠️</span>
                                            <span>{alert.message}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Detaylar */}
                            <div className="weather-details">
                                <div className="weather-detail">
                                    <span className="detail-icon">🌡️</span>
                                    <span className="detail-label">Hissedilen</span>
                                    <span className="detail-value">{weather.feelsLike}°C</span>
                                </div>
                                <div className="weather-detail">
                                    <span className="detail-icon">💧</span>
                                    <span className="detail-label">Nem</span>
                                    <span className="detail-value">%{weather.humidity}</span>
                                </div>
                                <div className="weather-detail">
                                    <span className="detail-icon">💨</span>
                                    <span className="detail-label">Rüzgar</span>
                                    <span className="detail-value">{weather.windSpeed} km/h {weather.windDirection}</span>
                                </div>
                                <div className="weather-detail">
                                    <span className="detail-icon">🌧️</span>
                                    <span className="detail-label">Yağış İhtimali</span>
                                    <span className="detail-value">%{weather.precipitation}</span>
                                </div>
                                <div className="weather-detail">
                                    <span className="detail-icon">☀️</span>
                                    <span className="detail-label">UV İndeksi</span>
                                    <span className="detail-value">{weather.uvIndex}</span>
                                </div>
                                <div className="weather-detail">
                                    <span className="detail-icon">👁️</span>
                                    <span className="detail-label">Görüş</span>
                                    <span className="detail-value">{weather.visibility} km</span>
                                </div>
                            </div>

                            {/* 5 Günlük Tahmin */}
                            <div className="weather-forecast">
                                <h4>5 Günlük Tahmin</h4>
                                <div className="forecast-list">
                                    {weather.forecast.map((day, index) => (
                                        <div key={index} className="forecast-day">
                                            <span className="forecast-name">{day.day}</span>
                                            <span className="forecast-icon">{day.icon}</span>
                                            <span className="forecast-temps">
                                                <span className="temp-high">{day.high}°</span>
                                                <span className="temp-low">{day.low}°</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bu Konumdaki Tarlalar */}
                            <div className="weather-fields">
                                <h4>📍 Bu Konumdaki Tarlalar</h4>
                                <div className="field-tags">
                                    {locationFields.map((field) => (
                                        <span key={field.id} className="field-tag">
                                            🌱 {field.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Bilgi Notu */}
            <Card className="weather-info-note">
                <div className="info-note-content">
                    <span className="info-note-icon">ℹ️</span>
                    <div className="info-note-text">
                        <h4>Hava Durumu ve Sulama</h4>
                        <p>
                            Akıllı sulama sistemimiz hava durumu verilerini analiz ederek sulama planını otomatik olarak ayarlar.
                            Yağmur beklendiğinde sulama ertelenir, sıcak havalarda sulama miktarı artırılır.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Weather;
