import { getState, setState, initialState } from '../state.js';
import { loginUser, getMe } from '../api.js';
import { saveSession } from '../session.js';
import { escapeHTML, validateUsername, validatePassword } from '../utils.js';
import { pageHeader } from '../components.js';

const updateLogin = (patch) => setState({ login: { ...getState().login, ...patch } });

const field = (id, label, type, value, error, autocomplete) => `
  <div class="field">
    <label for="${id}">${label}</label>
    <input id="${id}" name="${id}" type="${type}" value="${escapeHTML(value)}" autocomplete="${autocomplete}"
      class="${error ? 'is-invalid' : ''}" aria-invalid="${Boolean(error)}" aria-describedby="${id}-error">
    <p class="field-error" id="${id}-error">${escapeHTML(error ?? '')}</p>
  </div>`;

export const render = ({ login: form }) => `
  <section class="auth-panel">
    ${pageHeader('Log in', 'Use any DummyJSON user, for example emilys / emilyspass.')}
    <form id="login-form" novalidate>
      ${field('username', 'Username', 'text', form.username, form.errors.username, 'username')}
      ${field('password', 'Password', 'password', '', form.errors.password, 'current-password')}
      <p class="field-error" id="form-error" role="alert">${escapeHTML(form.serverError)}</p>
      <button type="submit" ${form.status === 'loading' ? 'disabled' : ''}>
        ${form.status === 'loading' ? 'Logging in…' : 'Log in'}</button>
    </form>
  </section>`;

// Keeps only the fields that failed validation.
const collectErrors = (username, password) => Object.fromEntries(
  Object.entries({ username: validateUsername(username), password: validatePassword(password) })
    .filter(([, message]) => message),
);

// After login, land on the route the guest originally wanted.
function goToIntended() {
  const { route } = getState();
  setState({ route: { ...route, intended: null } });
  location.hash = `#${route.intended ?? '/'}`;
}

async function signIn(username, password) {
  updateLogin({ username, errors: {}, serverError: '', status: 'loading' });
  try {
    const { accessToken, refreshToken, ...user } = await loginUser(username, password);
    const tokens = { accessToken, refreshToken };
    setState({ auth: { user, ...tokens } }); // the token must be in state before /auth/me
    const me = await getMe();
    setState({ auth: { user: me, ...tokens }, login: initialState.login });
    saveSession(tokens);
    goToIntended();
  } catch (error) {
    setState({ auth: initialState.auth });
    updateLogin({ status: 'error', serverError: error.message });
  }
}

function handleSubmit(event) {
  if (event.target.id !== 'login-form') return;
  event.preventDefault();
  const { username = '', password = '' } = Object.fromEntries(new FormData(event.target));
  const errors = collectErrors(username, password);
  if (Object.keys(errors).length > 0) {
    updateLogin({ username, errors, serverError: '', status: 'idle' });
    return;
  }
  signIn(username, password);
}

export function mount(outlet) {
  if (getState().login.status !== 'loading') setState({ login: initialState.login });
  outlet.addEventListener('submit', handleSubmit);
  return () => outlet.removeEventListener('submit', handleSubmit);
}
