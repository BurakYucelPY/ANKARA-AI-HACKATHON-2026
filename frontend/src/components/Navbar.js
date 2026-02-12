import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';
import iconHome from '../assets/icons/home.png';
import iconField from '../assets/icons/field.png';
import iconCloudy from '../assets/icons/cloudy.png';
import iconLeaves from '../assets/icons/leaves.png';
import iconSettings from '../assets/icons/settings.png';
import iconClipboard from '../assets/icons/clipboard.png';
import iconSensor from '../assets/icons/sensor.png';
import iconFarmer from '../assets/icons/farmer.png';
import iconExit from '../assets/icons/exit.png';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const menuRef = useRef(null);
  const indicatorDotSize = 6;
  const [indicator, setIndicator] = useState({
    top: 0,
    height: 0,
    visible: false,
    isMoving: false,
  });
  const hasIndicatorRef = useRef(false);

  const navItems = [
    { path: '/', label: 'Ana Sayfa', icon: iconHome },
    { path: '/fields', label: 'Tarlalarım', icon: iconField },
    { path: '/weather', label: 'Hava Durumu', icon: iconCloudy },
    { path: '/plants', label: 'Bitki Kütüphanesi', icon: iconLeaves },
    { path: '/manual', label: 'Manuel Yönetim', icon: iconSettings },
    { path: '/irrigation', label: 'Sulama Planı', icon: iconClipboard },
    { path: '/sensors', label: 'Sensörler', icon: iconSensor },
  ];

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const updateIndicator = (nextMoving) => {
    const menuEl = menuRef.current;
    if (!menuEl) {
      return;
    }

    const activeLink = menuEl.querySelector('.sidebar-link-active');
    if (!activeLink) {
      setIndicator((prev) => ({ ...prev, visible: false, isMoving: false }));
      return;
    }

    const menuRect = menuEl.getBoundingClientRect();
    const activeRect = activeLink.getBoundingClientRect();
    const top = activeRect.top - menuRect.top + menuEl.scrollTop + activeRect.height * 0.2;
    const height = activeRect.height * 0.6;

    setIndicator((prev) => ({
      top,
      height,
      visible: true,
      isMoving: typeof nextMoving === 'boolean' ? nextMoving : prev.isMoving,
    }));
    hasIndicatorRef.current = true;
  };

  const handleIndicatorTransitionEnd = (event) => {
    if (event.propertyName !== 'transform') {
      return;
    }

    setIndicator((prev) => ({ ...prev, isMoving: false }));
  };

  useEffect(() => {
    updateIndicator(hasIndicatorRef.current);

    const handleResize = () => updateIndicator();
    const menuEl = menuRef.current;

    window.addEventListener('resize', handleResize);
    if (menuEl) {
      menuEl.addEventListener('scroll', handleResize, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (menuEl) {
        menuEl.removeEventListener('scroll', handleResize);
      }
    };
  }, [location.pathname, isOpen]);

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

        <ul className="sidebar-menu" ref={menuRef}>
          <span
            className={`sidebar-active-indicator ${indicator.visible ? 'is-visible' : ''} ${indicator.isMoving ? 'is-moving' : ''}`}
            style={{
              transform: `translateY(${indicator.top}px) scaleY(${indicator.isMoving ? indicatorDotSize / Math.max(indicator.height, indicatorDotSize) : 1})`,
              height: `${indicator.height}px`,
            }}
            onTransitionEnd={handleIndicatorTransitionEnd}
          />
          {navItems.map((item) => (
            <li key={item.path} className="sidebar-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
                onClick={closeMenu}
              >
                <span className="sidebar-icon">
                  <img src={item.icon} alt="" aria-hidden="true" />
                </span>
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-user-info">
                <span className="sidebar-user-icon">
                  <img src={iconFarmer} alt="" aria-hidden="true" />
                </span>
                <span className="sidebar-user-name">{user.full_name || user.email}</span>
              </div>
              <button className="sidebar-logout-btn" onClick={logout} title="Çıkış Yap">
                <img src={iconExit} alt="" aria-hidden="true" />
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
