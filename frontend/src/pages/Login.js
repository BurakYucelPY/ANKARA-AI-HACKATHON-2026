import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Su dolum yüzdesi: her karakter dolumu artırır
  const fillPercent = useMemo(() => {
    const totalChars = email.length + password.length + (isRegister ? fullName.length : 0);
    const maxChars = isRegister ? 30 : 20; // Beklenen toplam karakter
    return Math.min(Math.round((totalChars / maxChars) * 85), 85); // Max %85, geri kalan submit'te
  }, [email, password, fullName, isRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, fullName, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Bir hata oluştu';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Arka plan kabarcıkları */}
      <div className="login-bg-bubbles">
        <span /><span /><span /><span /><span /><span /><span />
      </div>

      <div className="login-drop-wrapper">
        {/* SVG clip-path tanımı */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <clipPath id="dropClip" clipPathUnits="objectBoundingBox">
              <path d="M 0.5 0.0 C 0.5 0.0 1.0 0.3 1.0 0.55 C 1.0 0.8 0.78 1.0 0.5 1.0 C 0.22 1.0 0.0 0.8 0.0 0.55 C 0.0 0.3 0.5 0.0 0.5 0.0 Z" />
            </clipPath>
          </defs>
        </svg>

        {/* Dış glow border */}
        <div className="login-drop-border">
          <div className={`login-drop ${loading ? 'submitting' : ''}`}>
            {/* Su dolum katmanı */}
            <div
              className="drop-water-fill"
              style={{ height: loading ? '100%' : `${fillPercent}%` }}
            />
            {/* Parlama */}
            <div className="drop-shine" />

          <div className="drop-content">
            <div className="login-header">
              <span className="login-logo">💧</span>
              <h1>AquaSmart</h1>
              <p>Akıllı Sulama Sistemi</p>
            </div>

            <div className="login-tabs">
              <button
                className={`login-tab ${!isRegister ? 'active' : ''}`}
                onClick={() => { setIsRegister(false); setError(''); }}
              >
                Giriş Yap
              </button>
              <button
                className={`login-tab ${isRegister ? 'active' : ''}`}
                onClick={() => { setIsRegister(true); setError(''); }}
              >
                Kayıt Ol
              </button>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {isRegister && (
                <div className="form-group">
                  <label>Ad Soyad</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Adınız Soyadınız"
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label>E-posta</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && <div className="login-error">{error}</div>}

              <button
                type="submit"
                className={`login-btn ${fillPercent >= 80 ? 'btn-full' : ''}`}
                disabled={loading}
              >
                {loading ? '💧 Giriş yapılıyor...' : (isRegister ? 'Kayıt Ol' : 'Giriş Yap')}
              </button>
            </form>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
