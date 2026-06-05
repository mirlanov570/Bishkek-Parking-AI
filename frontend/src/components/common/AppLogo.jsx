import { APP_NAME } from '../../utils/constants';

function AppLogo({ className = '', decorative = false }) {
  const accessibilityProps = decorative
    ? { 'aria-hidden': 'true' }
    : { role: 'img', 'aria-label': APP_NAME };

  return (
    <span className={['app-logo', className].filter(Boolean).join(' ')} {...accessibilityProps}>
      <svg className="app-logo__svg" viewBox="0 0 64 64" focusable="false">
        <path
          className="app-logo__pin"
          d="M32 6C21.5 6 13 14.1 13 24.2C13 39.3 32 58 32 58C32 58 51 39.3 51 24.2C51 14.1 42.5 6 32 6Z"
        />
        <path
          className="app-logo__inner"
          d="M32 15.5C25.9 15.5 21 20.2 21 26.1C21 32 25.9 36.7 32 36.7C38.1 36.7 43 32 43 26.1C43 20.2 38.1 15.5 32 15.5Z"
        />
        <path
          className="app-logo__road"
          d="M29.8 21.2H34.2L37.6 43.8H26.4L29.8 21.2Z"
        />
        <path className="app-logo__mark" d="M32 22.8V29.2" />
        <path className="app-logo__mark" d="M32 33.6V39.2" />
        <circle className="app-logo__dot" cx="32" cy="26.1" r="3.2" />
      </svg>
    </span>
  );
}

export default AppLogo;