import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getChatbotFields, sendChatbotMessage } from '../services/api';
import aiIcon from '../assets/icons/ai.png';
import generativeIcon from '../assets/icons/generative.png';
import './Chatbot.css';

const Chatbot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Mesaj listesi her güncellendiğinde aşağı kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Pencere açıldığında tarlaları çek
  useEffect(() => {
    if (isOpen && user && fields.length === 0) {
      fetchFields();
    }
  }, [isOpen, user]);

  // Tarla seçildikten sonra input'a odaklan
  useEffect(() => {
    if (selectedField && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedField]);

  const fetchFields = async () => {
    setFieldsLoading(true);
    try {
      const res = await getChatbotFields(user.id);
      setFields(res.data);
    } catch (err) {
      console.error('Tarlalar yüklenemedi:', err);
    } finally {
      setFieldsLoading(false);
    }
  };

  const handleFieldSelect = (field) => {
    setSelectedField(field);
    setMessages([
      {
        role: 'assistant',
        content: `Merhaba! 🌱 **${field.name}** tarlası için size nasıl yardımcı olabilirim?\n\nSulama, hava durumu, bitki bakımı veya herhangi bir konuda soru sorabilirsiniz.`,
      },
    ]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || !selectedField) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Geçmişi hazırla (system hariç, sadece user/assistant)
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await sendChatbotMessage(
        user.id,
        selectedField.id,
        text,
        history
      );

      setMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      console.error('Chatbot hatası:', err);
      const errorMsg = err.response?.data?.detail || 'Bir hata oluştu, lütfen tekrar deneyin.';
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `⚠️ ${errorMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBack = () => {
    setSelectedField(null);
    setMessages([]);
    setInput('');
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Markdown bold (**text**) basit render
  const renderMessage = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      // Satır sonlarını <br/> yap
      return part.split('\n').map((line, j) => (
        <span key={`${i}-${j}`}>
          {j > 0 && <br />}
          {line}
        </span>
      ));
    });
  };

  if (!user) return null;

  return (
    <>
      {/* Yuvarlak Chatbot Butonu */}
      <button className="chatbot-fab" onClick={toggleChat} title="Tarım Danışmanı">
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <img className="chatbot-fab-icon" src={aiIcon} alt="AI" />
        )}
      </button>

      {/* Chat Penceresi */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-glow-trace" aria-hidden="true">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chatbotGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(34, 211, 238)" />
                  <stop offset="50%" stopColor="rgb(34, 197, 94)" />
                  <stop offset="100%" stopColor="rgb(59, 130, 246)" />
                </linearGradient>
              </defs>
              <rect
                className="chatbot-glow-path"
                x="0.5"
                y="0.5"
                width="99"
                height="99"
                rx="3"
                ry="3"
                pathLength="100"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div className="chatbot-window-inner">
            {/* Header */}
            <div className="chatbot-header">
              {selectedField && (
                <button className="chatbot-back-btn" onClick={handleBack} title="Tarla Seçimine Dön">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}
              <div className="chatbot-header-info">
                <span className="chatbot-header-title">Tarım Danışmanı</span>
                {selectedField && (
                  <span className="chatbot-header-field">
                    {selectedField.plant_icon || '🌱'} {selectedField.name}
                  </span>
                )}
              </div>
              <button className="chatbot-close-btn" onClick={toggleChat}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="chatbot-body">
              {!selectedField ? (
                /* Tarla Seçim Ekranı */
                <div className="chatbot-field-select">
                  <div className="chatbot-welcome">
                    <div className="chatbot-welcome-icon">
                      <img src={generativeIcon} alt="Yapay zeka" />
                    </div>
                    <h3>Hoş Geldiniz!</h3>
                    <p>Danışmanlık almak istediğiniz tarlayı seçin</p>
                  </div>

                  {fieldsLoading ? (
                    <div className="chatbot-loading">
                      <div className="chatbot-spinner" />
                      <span>Tarlalar yükleniyor...</span>
                    </div>
                  ) : fields.length === 0 ? (
                    <div className="chatbot-empty">
                      <p>Henüz tarlanız bulunmuyor.</p>
                      <p>Tarlalarım sayfasından tarla ekleyebilirsiniz.</p>
                    </div>
                  ) : (
                    <div className="chatbot-field-list">
                      {fields.map((field) => (
                        <button
                          key={field.id}
                          className="chatbot-field-btn"
                          onClick={() => handleFieldSelect(field)}
                        >
                          <span className="chatbot-field-icon">
                            {field.plant_icon || '🌱'}
                          </span>
                          <div className="chatbot-field-info">
                            <span className="chatbot-field-name">{field.name}</span>
                            <span className="chatbot-field-detail">
                              {field.plant_type_name || 'Bitki seçilmedi'} • {field.location}
                            </span>
                          </div>
                          <svg className="chatbot-field-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Mesaj Alanı */
                <div className="chatbot-messages">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`chatbot-msg ${msg.role === 'user' ? 'chatbot-msg-user' : 'chatbot-msg-bot'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="chatbot-msg-avatar">🌾</div>
                      )}
                      <div className="chatbot-msg-bubble">
                        {renderMessage(msg.content)}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="chatbot-msg chatbot-msg-bot">
                      <div className="chatbot-msg-avatar">🌾</div>
                      <div className="chatbot-msg-bubble chatbot-typing">
                        <span className="chatbot-dot" />
                        <span className="chatbot-dot" />
                        <span className="chatbot-dot" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Footer - Input Alanı (sadece tarla seçildiyse) */}
            {selectedField && (
              <div className="chatbot-footer">
                <input
                  ref={inputRef}
                  type="text"
                  className="chatbot-input"
                  placeholder="Sorunuzu yazın..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
                <button
                  className="chatbot-send-btn"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
