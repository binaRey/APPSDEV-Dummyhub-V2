// Session persistence (sessionStorage) and logout.
import { getState, setState, initialState } from './state.js';
import { getMe } from './api.js';

const KEY = 'dummyhub.session';

export function saveSession({ accessToken, refreshToken }) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ accessToken, refreshToken }));
  } catch (error) {
    console.error('Could not save session:', error);
  }
}

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY));
  } catch (error) {
    console.error('Could not read session:', error);
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch (error) {
    console.error('Could not clear session:', error);
  }
}

// On start: if tokens were saved, confirm them with GET /auth/me before trusting them.
export async function restoreSession() {
  const tokens = loadSession();
  if (!tokens?.accessToken) return;
  setState({ auth: { ...initialState.auth, ...tokens } });
  try {
    const user = await getMe();
    setState({ auth: { ...getState().auth, user } });
  } catch (error) {
    console.error('Saved session is no longer valid:', error);
    clearSession();
    setState({ auth: initialState.auth });
  }
}

// Clears the auth slice and everything that belongs to the user, then goes to the login view.
export function logout() {
  clearSession();
  const { auth, login, cart, checkout, pastCarts, dashboard, tasks } = initialState;
  setState({ auth, login, cart, checkout, pastCarts, dashboard, tasks });
  location.hash = '#/login';
}
