import { pageHeader } from '../components.js';

export const render = () => `
  <section class="auth-panel">
    ${pageHeader('Log in', 'Use any DummyJSON user, for example emilys / emilyspass.')}
    <form id="login-form" novalidate>
      <div class="field">
        <label for="username">Username</label>
        <input id="username" name="username" type="text" autocomplete="username">
        <p class="field-error" id="username-error"></p>
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password">
        <p class="field-error" id="password-error"></p>
      </div>
      <p class="field-error" id="form-error" role="alert"></p>
      <button type="submit">Log in</button>
    </form>
  </section>`;

// Phase 3 adds validation and the POST /auth/login request; submit never reloads the page.
export function mount(outlet) {
  const onSubmit = (event) => {
    if (event.target.id === 'login-form') event.preventDefault();
  };
  outlet.addEventListener('submit', onSubmit);
  return () => outlet.removeEventListener('submit', onSubmit);
}
