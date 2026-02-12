import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFields, getCurrentWeather, getHourlyForecast } from '../services/api';
import Card from '../components/Card';
import LoadingScreen from '../components/LoadingScreen';
import './Weather.css';

const Weather = () => {
    const { user } = useAuth();
    const [weatherData, setWeatherData] = useState({});
    const [fieldsMap, setFieldsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchWeather = async () => {
            setLoading(true);
            setError('');
            try {
                // Kullanıcının tarlalarını çek
                const fieldsRes = await getFields(user.id);
                const userFields = fieldsRes.data;

                // İlçelere göre tarlaları grupla
                const ilceFieldsMap = {};
                userFields.forEach(f => {
                    const key = f.ilce;
                    if (!ilceFieldsMap[key]) ilceFieldsMap[key] = [];
                    ilceFieldsMap[key].push(f);
                });

                setFieldsMap(ilceFieldsMap);

                // Her benzersiz ilçe için hava durumu çek
                const uniqueIlceler = Object.keys(ilceFieldsMap);
                if (uniqueIlceler.length === 0) {
                    setWeatherData({});
                    setLoading(false);
                    return;
                }

                const weatherResults = {};
                await Promise.all(
                    uniqueIlceler.map(async (ilce) => {
                        try {
                            const [currentRes, forecastRes] = await Promise.all([
                                getCurrentWeather(ilce),
                                getHourlyForecast(ilce, 120),
                            ]);
                            const current = currentRes.data;
                            const forecast = forecastRes.data;

                            // Saatlik tahminden günlük tahmine dönüştür
                            const dailyForecast = buildDailyForecast(forecast.saatlik_tahmin || []);

                            // Uyarıları oluştur
                            const alerts = buildAlerts(forecast, current);

                            weatherResults[ilce] = {
                                city: current.konum?.split('/')[0] || ilce,
                                district: current.konum?.split('/')[1] || ilce,
                                temperature: Math.round(current.sicaklik),
                                feelsLike: current.hissedilen != null ? Math.round(current.hissedilen) : Math.round(current.sicaklik),
                                humidity: current.nem != null ? current.nem : '-',
                                windSpeed: current.ruzgar_hizi != null ? current.ruzgar_hizi : '-',
                                windDirection: current.ruzgar_yonu_text || '',
                                condition: current.durum || 'Bilinmiyor',
                                conditionIcon: current.emoji || '🌡️',
                                precipitation: forecast.onumuzdeki_6_saat_yagis ? 'Var' : 'Yok',
                                forecast: dailyForecast,
                                alerts,
                                hourlyData: forecast,
                            };
                        } catch {
                            weatherResults[ilce] = {
                                city: ilce, district: ilce,
                                temperature: '-', condition: 'Veri alınamadı',
                                conditionIcon: '⚠️', forecast: [], alerts: [],
                            };
                        }
                    })
                );

                setWeatherData(weatherResults);

                // DEBUG: Animasyonları test etmek için mock data ekle
                const mockForecast = [
                    { day: 'Bugün', high: 22, low: 14, icon: '☀️', condition: 'Açık', humidity: 45, windSpeed: 8, rainProb: 0 },
                    { day: 'Yarın', high: 20, low: 12, icon: '🌤️', condition: 'Az Bulutlu', humidity: 50, windSpeed: 10, rainProb: 10 },
                    { day: 'Çarşamba', high: 18, low: 10, icon: '⛅', condition: 'Parçalı Bulutlu', humidity: 55, windSpeed: 12, rainProb: 20 },
                    { day: 'Perşembe', high: 16, low: 9, icon: '🌧️', condition: 'Yağmurlu', humidity: 80, windSpeed: 15, rainProb: 70 },
                    { day: 'Cuma', high: 19, low: 11, icon: '☀️', condition: 'Açık', humidity: 40, windSpeed: 8, rainProb: 5 },
                ];
                const debugWeatherData = {
                    'debug-sunny': {
                        city: 'Antalya', district: '☀️ Güneşli Test',
                        temperature: 28, feelsLike: 30, humidity: 45, windSpeed: 8,
                        condition: 'Açık', conditionIcon: '☀️',
                        precipitation: 'Yok', forecast: mockForecast, alerts: []
                    },
                    'debug-few-clouds': {
                        city: 'İzmir', district: '🌤️ Az Bulutlu Test',
                        temperature: 22, feelsLike: 23, humidity: 55, windSpeed: 12,
                        condition: 'Az Bulutlu', conditionIcon: '🌤️',
                        precipitation: 'Yok', forecast: mockForecast, alerts: []
                    },
                    'debug-partly-cloudy': {
                        city: 'İstanbul', district: '⛅ Parçalı Bulutlu Test',
                        temperature: 18, feelsLike: 17, humidity: 60, windSpeed: 15,
                        condition: 'Parçalı Bulutlu', conditionIcon: '⛅',
                        precipitation: 'Yok', forecast: mockForecast, alerts: []
                    },
                    'debug-cloudy': {
                        city: 'Trabzon', district: '☁️ Kapalı Test',
                        temperature: 14, feelsLike: 12, humidity: 75, windSpeed: 20,
                        condition: 'Kapalı', conditionIcon: '☁️',
                        precipitation: 'Yok', forecast: mockForecast, alerts: [{ type: 'wind', message: 'Kuvvetli rüzgar bekleniyor' }]
                    },
                    'debug-rain': {
                        city: 'Rize', district: '🌧️ Yağmurlu Test',
                        temperature: 12, feelsLike: 10, humidity: 90, windSpeed: 18,
                        condition: 'Orta Yağmur', conditionIcon: '🌧️',
                        precipitation: 'Var', forecast: mockForecast, alerts: [{ type: 'rain', message: 'Yağış bekleniyor' }]
                    },
                    'debug-snow': {
                        city: 'Erzurum', district: '❄️ Karlı Test',
                        temperature: -5, feelsLike: -10, humidity: 80, windSpeed: 25,
                        condition: 'Orta Kar', conditionIcon: '❄️',
                        precipitation: 'Var', forecast: mockForecast, alerts: [{ type: 'frost', message: 'Don riski - Bitkileri korumaya alın' }]
                    },
                    'debug-storm': {
                        city: 'Adana', district: '⛈️ Fırtına Test',
                        temperature: 20, feelsLike: 18, humidity: 85, windSpeed: 45,
                        condition: 'Gök Gürültülü Fırtına', conditionIcon: '⛈️',
                        precipitation: 'Var', forecast: mockForecast, alerts: [{ type: 'storm', message: 'Şiddetli fırtına bekleniyor!' }]
                    },
                    'debug-fog': {
                        city: 'Bursa', district: '🌫️ Sisli Test',
                        temperature: 8, feelsLike: 6, humidity: 95, windSpeed: 5,
                        condition: 'Sisli', conditionIcon: '🌫️',
                        precipitation: 'Yok', forecast: mockForecast, alerts: []
                    },
                };
                setWeatherData(prev => ({ ...debugWeatherData, ...prev }));
                // DEBUG SONU

            } catch (err) {
                setError('Hava durumu verileri yüklenirken hata oluştu.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [user.id]);

    // Saatlik tahminlerden günlük tahmine dönüştür
    const buildDailyForecast = (saatlikTahmin) => {
        if (!saatlikTahmin || saatlikTahmin.length === 0) return [];
        const days = {};
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const today = new Date().toDateString();
        const tomorrow = new Date(Date.now() + 86400000).toDateString();

        saatlikTahmin.forEach(h => {
            const date = new Date(h.tam_zaman);
            const dateStr = date.toDateString();
            if (!days[dateStr]) {
                let dayLabel;
                if (dateStr === today) dayLabel = 'Bugün';
                else if (dateStr === tomorrow) dayLabel = 'Yarın';
                else dayLabel = dayNames[date.getDay()];

                days[dateStr] = { day: dayLabel, temps: [], emojis: [], conditions: [], humidities: [], windSpeeds: [], rainProbs: [] };
            }
            days[dateStr].temps.push(h.sicaklik);
            days[dateStr].emojis.push(h.emoji || '🌡️');
            days[dateStr].conditions.push(h.durum || '');
            if (h.nem != null) days[dateStr].humidities.push(h.nem);
            if (h.ruzgar_hizi != null) days[dateStr].windSpeeds.push(h.ruzgar_hizi);
            if (h.yagis_olasiligi != null) days[dateStr].rainProbs.push(h.yagis_olasiligi);
        });

        return Object.values(days).slice(0, 5).map(d => {
            const avgHumidity = d.humidities.length > 0 ? Math.round(d.humidities.reduce((a, b) => a + b, 0) / d.humidities.length) : null;
            const avgWind = d.windSpeeds.length > 0 ? Math.round(d.windSpeeds.reduce((a, b) => a + b, 0) / d.windSpeeds.length * 10) / 10 : null;
            const maxRainProb = d.rainProbs.length > 0 ? Math.max(...d.rainProbs) : 0;
            return {
                day: d.day,
                high: Math.round(Math.max(...d.temps)),
                low: Math.round(Math.min(...d.temps)),
                icon: d.emojis[Math.floor(d.emojis.length / 2)] || '🌡️',
                condition: d.conditions[Math.floor(d.conditions.length / 2)] || '',
                humidity: avgHumidity,
                windSpeed: avgWind,
                rainProb: maxRainProb,
            };
        });
    };

    // Tahmin verisinden uyarılar oluştur
    const buildAlerts = (forecast, current) => {
        const alerts = [];
        if (current.sicaklik <= 2) {
            alerts.push({ type: 'frost', message: 'Don riski - Bitkileri korumaya alın' });
        }
        if (forecast.onumuzdeki_1_saat_yagis) {
            alerts.push({ type: 'rain', message: '1 saat içinde yağış bekleniyor' });
        } else if (forecast.onumuzdeki_3_saat_yagis) {
            alerts.push({ type: 'rain', message: '3 saat içinde yağış bekleniyor' });
        }
        return alerts;
    };

    // Hava durumuna göre animasyon class'ı döndür
    const getWeatherClass = (condition) => {
        const conditionLower = (condition || '').toLowerCase();

        // Fırtına
        if (conditionLower.includes('fırtına') || conditionLower.includes('dolu')) {
            return 'weather-storm';
        }
        // Kar
        if (conditionLower.includes('kar')) {
            return 'weather-snow';
        }
        // Yağmur veya sağanak
        if (conditionLower.includes('yağmur') || conditionLower.includes('sağanak') || conditionLower.includes('çisenti')) {
            return 'weather-rain';
        }
        // Sis
        if (conditionLower.includes('sis') || conditionLower.includes('kırağı')) {
            return 'weather-fog';
        }
        // Kapalı
        if (conditionLower.includes('kapalı')) {
            return 'weather-cloudy';
        }
        // Parçalı bulutlu
        if (conditionLower.includes('parçalı')) {
            return 'weather-partly-cloudy';
        }
        // Az bulutlu
        if (conditionLower.includes('az bulutlu')) {
            return 'weather-few-clouds';
        }
        // Açık / Güneşli
        if (conditionLower.includes('açık') || conditionLower === '') {
            return 'weather-sunny';
        }

        return 'weather-default';
    };

    const getFieldsByIlce = (ilce) => fieldsMap[ilce] || [];
    const locations = Object.keys(weatherData);

    if (loading) {
        return (
            <div className="weather-page">
                <LoadingScreen
                    title="Hava Durumu"
                    subtitle="Hava durumu verileri yükleniyor..."
                />
            </div>
        );
    }

    return (
        <div className="weather-page">
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Hava Durumu</h1>
                    <p className="page-subtitle">Tarlalarınızın bulunduğu konumlardaki hava durumu</p>
                </div>
            </div>

            {error && (
                <Card className="weather-info-note" variant="warning">
                    <div className="info-note-content">
                        <span className="info-note-icon">⚠️</span>
                        <div className="info-note-text"><p>{error}</p></div>
                    </div>
                </Card>
            )}

            {locations.length === 0 && !error ? (
                <Card className="weather-info-note">
                    <div className="info-note-content">
                        <span className="info-note-icon">📍</span>
                        <div className="info-note-text">
                            <h4>Henüz tarla eklenmemiş</h4>
                            <p>Hava durumu verilerini görmek için önce "Tarlalarım" sayfasından tarla ekleyin.</p>
                        </div>
                    </div>
                </Card>
            ) : (
                <div className="weather-grid">
                    {locations.map((ilce) => {
                        const weather = weatherData[ilce];
                        const locationFields = getFieldsByIlce(ilce);

                        return (
                            <Card key={ilce} className={`weather-card ${getWeatherClass(weather.condition)}`}>
                                {/* Animasyon overlay */}
                                <div className="weather-animation-layer"></div>

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

                                {weather.alerts && weather.alerts.length > 0 && (
                                    <div className="weather-alerts">
                                        {weather.alerts.map((alert, index) => (
                                            <div key={index} className={`weather-alert alert-${alert.type}`}>
                                                <span className="alert-icon">⚠️</span>
                                                <span>{alert.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="weather-details">
                                    <div className="weather-detail">
                                        <span className="detail-icon">🌡️</span>
                                        <span className="detail-label">Hissedilen</span>
                                        <span className="detail-value">{weather.feelsLike}°C</span>
                                    </div>
                                    <div className="weather-detail">
                                        <span className="detail-icon">💧</span>
                                        <span className="detail-label">Nem</span>
                                        <span className="detail-value">{weather.humidity !== '-' ? `%${weather.humidity}` : '-'}</span>
                                    </div>
                                    <div className="weather-detail">
                                        <span className="detail-icon">🌬️</span>
                                        <span className="detail-label">Rüzgar</span>
                                        <span className="detail-value">{weather.windSpeed !== '-' ? `${weather.windSpeed} km/s` : '-'}{weather.windDirection ? ` ${weather.windDirection}` : ''}</span>
                                    </div>
                                    <div className="weather-detail">
                                        <span className="detail-icon">🌧️</span>
                                        <span className="detail-label">Yağış (6s)</span>
                                        <span className="detail-value">{weather.precipitation}</span>
                                    </div>
                                </div>

                                {weather.forecast && weather.forecast.length > 0 && (
                                    <div className="weather-forecast">
                                        <h4>📅 5 Günlük Hava Tahmini</h4>
                                        <div className="forecast-list">
                                            {weather.forecast.map((day, index) => (
                                                <div key={index} className="forecast-day">
                                                    <span className="forecast-name">{day.day}</span>
                                                    <span className="forecast-icon">{day.icon}</span>
                                                    <span className="forecast-temps">
                                                        <span className="temp-high">{day.high}°</span>
                                                        <span className="temp-low">{day.low}°</span>
                                                    </span>
                                                    <span className="forecast-extra">
                                                        {day.humidity != null && <span className="forecast-humidity">💧 %{day.humidity}</span>}
                                                        {day.windSpeed != null && <span className="forecast-wind">🌬️ {day.windSpeed} km/s</span>}
                                                        {day.rainProb > 0 && <span className="forecast-rain">🌧️ %{day.rainProb}</span>}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

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
            )}

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
