import { AuthProvider } from './context/AuthContext';
import { BackgroundThemeProvider } from './context/BackgroundThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import AppRouter from './router/AppRouter';

function App() {
  return (
    <LanguageProvider>
      <BackgroundThemeProvider>
        <div className="app-shell">
          <div className="app-background" aria-hidden="true">
            <div className="app-background__grid" />
            <div className="app-background__mesh">
              <span className="app-background__orb app-background__orb--one" />
              <span className="app-background__orb app-background__orb--two" />
              <span className="app-background__orb app-background__orb--three" />
            </div>
            <div className="app-background__vignette" />
          </div>

          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </div>
      </BackgroundThemeProvider>
    </LanguageProvider>
  );
}

export default App;