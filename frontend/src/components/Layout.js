import Navbar from './Navbar';
import './Layout.css';

/**
 * Layout Bileşeni
 * Single Responsibility: Sayfa yapısını düzenlemekten sorumlu
 * Open/Closed: children prop ile genişletilebilir
 */
const Layout = ({ children }) => {
    return (
        <div className="layout">
            <Navbar />
            <main className="layout-main">
                {children}
            </main>
        </div>
    );
};

export default Layout;
