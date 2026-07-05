import { useState } from 'react';
import { LANGS, makeT, getSavedLang } from '../i18n';

export default function Login({ onLoginSuccess }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lang, setLang] = useState(getSavedLang);
  const t = makeT(lang);

  const changeLang = (l) => { setLang(l); localStorage.setItem('ui_lang', l); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass }),
      });

      if (!res.ok) {
        throw new Error(t('login_invalid'));
      }

      const { token } = await res.json();
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', user);

      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '100px auto',
      padding: '20px',
      fontFamily: 'sans-serif',
      border: '1px solid #ccc',
      borderRadius: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <h1 style={{ margin: 0 }}>ksk-dashboard</h1>
        <select value={lang} onChange={(e) => changeLang(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}>
          {LANGS.map(l => (
            <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
          ))}
        </select>
      </div>
      <p style={{ color: '#666' }}>{t('login_subtitle')}</p>

      {error && (
        <div style={{
          padding: '10px',
          background: '#fee',
          color: '#c00',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>{t('login_user')}:</label>
          <input
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>{t('login_pass')}:</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? t('login_loading') : t('login_enter')}
        </button>
      </form>
    </div>
  );
}
