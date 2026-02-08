import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import './IrrigationPlan.css';

/* ============================================================
   DEBUG / MOCK VERİLER
   Backend hazır olduğunda bu kısım API çağrısıyla değiştirilecek.
   ============================================================ */
export const MOCK_IRRIGATION_PLANS = {
  // field_id bazlı haftalık planlar
  1: {
    fieldName: 'Tarla 1 — Domates',
    weeklyPlan: [
      { day: 'Pazartesi', slots: [{ start: '06:00', end: '06:45', amount: 120, note: 'Sabah sulama' }] },
      { day: 'Salı', slots: [{ start: '08:00', end: '08:30', amount: 80, note: 'Hafif sulama' }] },
      { day: 'Çarşamba', slots: [] },
      { day: 'Perşembe', slots: [{ start: '06:00', end: '07:00', amount: 150, note: 'Derin sulama' }, { start: '18:00', end: '18:20', amount: 50, note: 'Akşam takviye' }] },
      { day: 'Cuma', slots: [{ start: '07:00', end: '07:30', amount: 90, note: 'Standart sulama' }] },
      { day: 'Cumartesi', slots: [] },
      { day: 'Pazar', slots: [{ start: '06:30', end: '07:15', amount: 110, note: 'Hafta sonu sulama' }] },
    ],
  },
  2: {
    fieldName: 'Tarla 2 — Buğday',
    weeklyPlan: [
      { day: 'Pazartesi', slots: [{ start: '07:00', end: '07:30', amount: 70, note: 'Sabah sulama' }] },
      { day: 'Salı', slots: [] },
      { day: 'Çarşamba', slots: [{ start: '06:00', end: '06:40', amount: 100, note: 'Orta sulama' }] },
      { day: 'Perşembe', slots: [] },
      { day: 'Cuma', slots: [{ start: '07:00', end: '07:20', amount: 60, note: 'Hafif sulama' }] },
      { day: 'Cumartesi', slots: [{ start: '08:00', end: '08:45', amount: 110, note: 'Hafta sonu sulama' }] },
      { day: 'Pazar', slots: [] },
    ],
  },
  3: {
    fieldName: 'Tarla 3 — Mısır',
    weeklyPlan: [
      { day: 'Pazartesi', slots: [{ start: '05:30', end: '06:30', amount: 160, note: 'Erken sabah derin sulama' }] },
      { day: 'Salı', slots: [{ start: '17:30', end: '18:00', amount: 70, note: 'Akşam sulama' }] },
      { day: 'Çarşamba', slots: [{ start: '06:00', end: '06:45', amount: 130, note: 'Sabah sulama' }] },
      { day: 'Perşembe', slots: [] },
      { day: 'Cuma', slots: [{ start: '06:00', end: '07:00', amount: 150, note: 'Derin sulama' }] },
      { day: 'Cumartesi', slots: [{ start: '07:00', end: '07:20', amount: 50, note: 'Hafif takviye' }] },
      { day: 'Pazar', slots: [{ start: '06:00', end: '06:30', amount: 90, note: 'Pazar sulama' }] },
    ],
  },
};

const DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAYS_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
/* ============================================================ */

const IrrigationPlan = () => {
  const { user } = useAuth();
  const [selectedFieldId, setSelectedFieldId] = useState(
    parseInt(Object.keys(MOCK_IRRIGATION_PLANS)[0])
  );
  const [selectedDay, setSelectedDay] = useState(null); // null = tüm hafta

  const plan = MOCK_IRRIGATION_PLANS[selectedFieldId];
  const fieldIds = Object.keys(MOCK_IRRIGATION_PLANS).map(Number);

  // Haftalık toplam su
  const weeklyTotal = useMemo(() => {
    if (!plan) return 0;
    return plan.weeklyPlan.reduce((sum, day) =>
      sum + day.slots.reduce((s, slot) => s + slot.amount, 0), 0
    );
  }, [plan]);

  // Haftalık toplam sulama sayısı
  const weeklySlotCount = useMemo(() => {
    if (!plan) return 0;
    return plan.weeklyPlan.reduce((sum, day) => sum + day.slots.length, 0);
  }, [plan]);

  // Bugünkü gün indexi
  const todayIndex = new Date().getDay(); // 0=Pazar
  const todayMapped = todayIndex === 0 ? 6 : todayIndex - 1; // 0=Pazartesi

  // Görüntülenecek günler
  const visibleDays = selectedDay !== null
    ? [plan.weeklyPlan[selectedDay]]
    : plan.weeklyPlan;

  return (
    <div className="irrigation-page">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Sulama Planı</h1>
          <p className="page-subtitle">Yapay zeka destekli haftalık sulama takvimi</p>
        </div>
      </div>

      {/* Tarla Seçici */}
      <div className="irrigation-field-selector">
        {fieldIds.map((id) => (
          <button
            key={id}
            className={`irrigation-field-btn ${selectedFieldId === id ? 'active' : ''}`}
            onClick={() => { setSelectedFieldId(id); setSelectedDay(null); }}
          >
            🌾 {MOCK_IRRIGATION_PLANS[id].fieldName}
          </button>
        ))}
      </div>

      {/* Özet Kartları */}
      <div className="irrigation-stats">
        <Card className="irrigation-stat-card">
          <span className="stat-value">{weeklyTotal} L</span>
          <span className="stat-label">Haftalık Toplam Su</span>
        </Card>
        <Card className="irrigation-stat-card">
          <span className="stat-value">{weeklySlotCount}</span>
          <span className="stat-label">Sulama Sayısı</span>
        </Card>
        <Card className="irrigation-stat-card">
          <span className="stat-value">
            {plan.weeklyPlan.reduce((sum, d) => sum + d.slots.reduce((s, sl) => {
              const [sh, sm] = sl.start.split(':').map(Number);
              const [eh, em] = sl.end.split(':').map(Number);
              return s + (eh * 60 + em) - (sh * 60 + sm);
            }, 0), 0)} dk
          </span>
          <span className="stat-label">Toplam Süre</span>
        </Card>
      </div>

      {/* Gün Seçici */}
      <div className="irrigation-day-tabs">
        <button
          className={`day-tab ${selectedDay === null ? 'active' : ''}`}
          onClick={() => setSelectedDay(null)}
        >
          Tüm Hafta
        </button>
        {DAYS_SHORT.map((d, i) => (
          <button
            key={i}
            className={`day-tab ${selectedDay === i ? 'active' : ''} ${i === todayMapped ? 'today' : ''}`}
            onClick={() => setSelectedDay(i)}
          >
            {d}
            {plan.weeklyPlan[i].slots.length > 0 && (
              <span className="day-dot" />
            )}
          </button>
        ))}
      </div>

      {/* Haftalık Plan */}
      <div className="irrigation-schedule">
        {visibleDays.map((day, idx) => {
          const dayIndex = selectedDay !== null ? selectedDay : idx;
          const isToday = dayIndex === todayMapped;
          const dayTotal = day.slots.reduce((s, sl) => s + sl.amount, 0);

          return (
            <Card key={dayIndex} className={`schedule-day-card ${isToday ? 'is-today' : ''} ${day.slots.length === 0 ? 'no-slots' : ''}`}>
              <div className="schedule-day-header">
                <div className="schedule-day-left">
                  {isToday && <span className="today-badge">Bugün</span>}
                  <span className="schedule-day-name">{DAYS_FULL[dayIndex]}</span>
                </div>
                <div className="schedule-day-right">
                  {day.slots.length > 0 && (
                    <span className="schedule-day-total">💧 {dayTotal} L</span>
                  )}
                  <span className={`schedule-day-count ${day.slots.length === 0 ? 'empty' : ''}`}>
                    {day.slots.length > 0 ? `${day.slots.length} sulama` : 'Dinlenme'}
                  </span>
                </div>
              </div>

              {day.slots.length > 0 ? (
                <div className="schedule-slots">
                  {day.slots.map((slot, si) => {
                    const [sh, sm] = slot.start.split(':').map(Number);
                    const [eh, em] = slot.end.split(':').map(Number);
                    const duration = (eh * 60 + em) - (sh * 60 + sm);
                    return (
                      <div key={si} className="schedule-slot-card">
                        <div className="slot-time-badge">{slot.start}</div>
                        <div className="slot-card-body">
                          <div className="slot-card-row">
                            <span className="slot-time-range">{slot.start} — {slot.end}</span>
                            <span className="slot-duration-badge">{duration} dk</span>
                          </div>
                          <div className="slot-card-stats">
                            <span className="slot-stat">💧 {slot.amount} L</span>
                            <span className="slot-stat">⏱️ {duration} dk</span>
                          </div>
                          {slot.note && <p className="slot-note">{slot.note}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="schedule-empty">
                  🌿 Bu gün sulama planlanmamış — toprak dinleniyor
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* AI Notu */}
      <Card className="irrigation-ai-note">
        <div className="ai-note-header">
          <span>🤖</span>
          <strong>AI Sulama Asistanı</strong>
        </div>
        <p>
          Bu plan, hava durumu tahminleri, toprak nem verileri ve bitki türü gereksinimlerine göre otomatik oluşturulmuştur.
          Koşullar değiştikçe plan güncellenir.
        </p>
      </Card>
    </div>
  );
};

export default IrrigationPlan;
