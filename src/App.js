import { useEffect, useState } from 'react';
import Login from './pages/Login';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setAuthenticated(!!token);
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthenticated(false);
  };

  if (loading) {
    return <div>Cargando...</div>;
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
            Usuario: {localStorage.getItem('auth_user')}
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
      
      {/* Tu contenido del dashboard va aquí */}
    </div>
  );
}
