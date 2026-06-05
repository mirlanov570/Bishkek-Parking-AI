import { useBackgroundTheme } from '../../context/BackgroundThemeContext';

function ThemeModeSwitch({ className = '' }) {
  const { backgroundTheme, themes, setBackgroundTheme } = useBackgroundTheme();

  const classes = ['theme-mode-switch', className].filter(Boolean).join(' ');

  return (
    <div className={classes} aria-label="Переключатель фонового режима">
      <div className="theme-mode-switch__nodes" role="group" aria-label="Режим фона">
        {themes.map((theme) => {
          const isActive = backgroundTheme === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              className={isActive ? 'theme-mode-switch__node is-active' : 'theme-mode-switch__node'}
              data-theme-node={theme.id}
              aria-label={theme.title}
              aria-pressed={isActive}
              title={theme.title}
              onClick={() => setBackgroundTheme(theme.id)}
            >
              <span>{theme.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ThemeModeSwitch;