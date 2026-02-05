import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/', label: 'Ana Sayfa', icon: '🏠' },
    { path: '/fields', label: 'Tarlalarım', icon: '🌾' },
    { path: '/weather', label: 'Hava Durumu', icon: '🌤️' },
    { path: '/plants', label: 'Bitki Kütüphanesi', icon: '🌱' },
    { path: '/manual', label: 'Manuel Yönetim', icon: '🎛️' },
    { path: '/sensors', label: 'Sensörler', icon: '📡' },
  ];

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobil Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <button className="hamburger-btn" onClick={toggleMenu} aria-label="Menü">
            <span className={`hamburger-icon ${isOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <div className="mobile-brand">
            <span className="navbar-logo">💧</span>
            <span className="navbar-title">AquaSmart</span>
          </div>
        </div>
      </header>

      {/* Overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={closeMenu}
      ></div>

      {/* Sidebar */}
      <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="navbar-logo">💧</span>
          <span className="navbar-title">AquaSmart</span>
        </div>

        <ul className="sidebar-menu">
          {navItems.map((item) => (
            <li key={item.path} className="sidebar-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
                onClick={closeMenu}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-user-info">
                <span className="sidebar-user-icon">👤</span>
                <span className="sidebar-user-name">{user.full_name || user.email}</span>
              </div>
              <button className="sidebar-logout-btn" onClick={logout} title="Çıkış Yap">
                🚪
              </button>
            </div>
          )}
          <p>© 2026 AquaSmart</p>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
