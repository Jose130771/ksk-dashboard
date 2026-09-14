// Manejo de la sesión del dashboard.
//
// El token que devuelve /api/auth caduca a las 8 horas. Antes solo se miraba si
// existía en localStorage, así que el panel se abría como si estuvieras dentro
// pero /api/anthropic y /api/send-email devolvían 401: ni se generaba el email
// ni se enviaba nada. Aquí se comprueba de verdad si el token sigue vivo.

export function clearSession() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

// Devuelve el token solo si sigue siendo válido. Si ha caducado o está roto,
// limpia la sesión y devuelve null.
export function getToken() {
  const token = localStorage.getItem('auth_token');
  if (!token) return null;
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    if (!payload.exp || payload.exp * 1000 <= Date.now()) {
      clearSession();
      return null;
    }
  } catch (e) {
    clearSession();
    return null;
  }
  return token;
}

export function isLoggedIn() {
  return !!getToken();
}

// Sesión caducada o rechazada por el servidor: avisa, limpia y vuelve al login.
export function sessionExpired(message) {
  clearSession();
  if (message) alert(message);
  window.location.reload();
}
