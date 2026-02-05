import './Card.css';

/**
 * Card Bileşeni
 * Single Responsibility: Kart görünümü sağlamaktan sorumlu
 * Open/Closed: Props ile özelleştirilebilir, variant ile genişletilebilir
 */
const Card = ({
    children,
    title,
    subtitle,
    icon,
    variant = 'default',
    className = '',
    onClick
}) => {
    const cardClass = `card card-${variant} ${className} ${onClick ? 'card-clickable' : ''}`;

    return (
        <div className={cardClass} onClick={onClick}>
            {(icon || title || subtitle) && (
                <div className="card-header">
                    {icon && <span className="card-icon">{icon}</span>}
                    <div className="card-header-text">
                        {title && <h3 className="card-title">{title}</h3>}
                        {subtitle && <p className="card-subtitle">{subtitle}</p>}
                    </div>
                </div>
            )}
            <div className="card-content">
                {children}
            </div>
        </div>
    );
};

export default Card;
