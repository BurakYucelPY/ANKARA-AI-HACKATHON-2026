import './LoadingScreen.css';
import waterIcon from '../assets/icons/clean-water.png';
import moneyIcon from '../assets/icons/money.png';

const LoadingScreen = ({ title = 'Yukleniyor...', subtitle }) => {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-orbit">
        <div className="loading-flip">
          <img className="loading-icon loading-icon-water" src={waterIcon} alt="" />
          <img className="loading-icon loading-icon-money" src={moneyIcon} alt="" />
        </div>
      </div>
      {title && <div className="loading-title">{title}</div>}
      {subtitle && <div className="loading-subtitle">{subtitle}</div>}
    </div>
  );
};

export default LoadingScreen;
