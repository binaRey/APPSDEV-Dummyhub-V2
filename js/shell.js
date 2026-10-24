// Keeps the shell (nav highlight, cart badge, user area, mobile menu) in sync with state.
import { getState, subscribe } from './state.js';
import { logout } from './session.js';

function updateNav({ route }) {
  document.querySelectorAll('.site-nav a').forEach((link) => {
    const isActive = link.dataset.route === route.name;
    link.classList.toggle('is-active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function updateBadge({ cart }) {
  const totalQuantity = cart.reduce((total, line) => total + line.quantity, 0);
  const badge = document.getElementById('cart-badge');
  badge.textContent = String(totalQuantity);
  badge.classList.toggle('is-empty', totalQuantity === 0);
}

// createElement + textContent: user names never touch innerHTML.
function updateUserArea({ auth }) {
  const area = document.getElementById('user-area');
  area.replaceChildren();
  if (!auth.user) {
    const link = document.createElement('a');
    link.href = '#/login';
    link.textContent = 'Log in';
    area.append(link);
    return;
  }
  const { firstName, lastName, image } = auth.user;
  const avatar = document.createElement('img');
  avatar.className = 'avatar';
  avatar.src = image;
  avatar.alt = `${firstName} ${lastName}`;
  const name = document.createElement('span');
  name.textContent = firstName;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-ghost';
  button.dataset.action = 'logout';
  button.textContent = 'Log out';
  area.append(avatar, name, button);
}

function setMenuOpen(isOpen) {
  document.getElementById('site-nav').classList.toggle('is-open', isOpen);
  document.getElementById('menu-toggle').setAttribute('aria-expanded', String(isOpen));
}

export function initShell() {
  const sync = (state) => {
    updateNav(state);
    updateBadge(state);
    updateUserArea(state);
  };
  subscribe(sync);
  sync(getState());

  const toggle = document.getElementById('menu-toggle');
  toggle.addEventListener('click', () => setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  window.addEventListener('hashchange', () => setMenuOpen(false));
  // One delegated listener: the user area is rebuilt on every state change.
  document.getElementById('user-area').addEventListener('click', (event) => {
    if (event.target.closest('[data-action="logout"]')) logout();
  });
}
