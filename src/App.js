import { useEffect, useState } from 'react';
import Login from './pages/Login';
import KSKDashboard from './KSKDashboard';
import { makeT, getSavedLang } from './i18n';
import { getToken, clearSession } from './auth';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const t = makeT(getSavedLang());

  useEffect(() => {
    // getToken() devuelve null si el token ha caducado (antes bastaba con que existiera,
    // y el panel se abría con una sesión muerta: todo devolvía 401 sin avisar).
    setAuthenticated(!!getToken());
    setLoading(false);

    // Si caduca con el panel abierto, se vuelve al login solo en menos de un minuto.
    const id = setInterval(() => {
      if (!getToken()) setAuthenticated(false);
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    clearSession();
    setAuthenticated(false);
  };

  if (loading) {
    return <div>{t('login_loading')}</div>;
  }

  if (!authenticated) {
    return <Login onLoginSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div>
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: '#f0f0f0',
        borderBottom: '1px solid #ccc'
      }}>
        <h2>ksk-dashboard</h2>
        <div>
          <span style={{ marginRight: '15px' }}>
            {t('login_user')}: {localStorage.getItem('auth_user')}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Tu dashboard va aquí */}
      <KSKDashboard />
    </div>
  );
}
