// Reads the hash, matches a route, applies guards, and mounts the view.
// It never fetches data or builds markup.
import { getState, setState, subscribe } from './state.js';
import * as login from './views/login.js';
import * as dashboard from './views/dashboard.js';
import * as shop from './views/shop.js';
import * as productDetail from './views/product-detail.js';
import * as cart from './views/cart.js';
import * as recipes from './views/recipes.js';
import * as recipeDetail from './views/recipe-detail.js';
import * as community from './views/community.js';
import * as postDetail from './views/post-detail.js';
import * as people from './views/people.js';
import * as userProfile from './views/user-profile.js';
import * as tasks from './views/tasks.js';
import * as notFound from './views/not-found.js';

// guard: 'auth' = logged in only, 'guest' = logged out only, undefined = public
const routes = [
  { pattern: '/login', name: 'login', view: login, guard: 'guest' },
  { pattern: '/', name: 'dashboard', view: dashboard, guard: 'auth' },
  { pattern: '/shop', name: 'shop', view: shop },
  { pattern: '/shop/:id', name: 'shop', view: productDetail },
  { pattern: '/cart', name: 'cart', view: cart, guard: 'auth' },
  { pattern: '/recipes', name: 'recipes', view: recipes },
  { pattern: '/recipes/:id', name: 'recipes', view: recipeDetail },
  { pattern: '/community', name: 'community', view: community },
  { pattern: '/community/:id', name: 'community', view: postDetail },
  { pattern: '/people', name: 'people', view: people },
  { pattern: '/people/:id', name: 'people', view: userProfile },
  { pattern: '/tasks', name: 'tasks', view: tasks, guard: 'auth' },
];
const notFoundRoute = { name: 'not-found', view: notFound };

let outlet = null;
let active = notFoundRoute;
let activeParams = {};
let cleanup = null; // returned by a view's mount(); removes its listeners on leave

const toPath = (hash) => hash.replace(/^#/, '').split('?')[0] || '/';
const segments = (path) => path.split('/').filter(Boolean);

// '/shop/:id' + '/shop/12' -> { id: '12' }, or null when it does not match.
function matchPattern(pattern, path) {
  const want = segments(pattern);
  const got = segments(path);
  const matches = want.length === got.length &&
    want.every((seg, i) => seg.startsWith(':') || seg === got[i]);
  if (!matches) return null;
  return want.reduce(
    (params, seg, i) => (seg.startsWith(':') ? { ...params, [seg.slice(1)]: decodeURIComponent(got[i]) } : params),
    {},
  );
}

export function matchRoute(path) {
  const hit = routes
    .map((route) => ({ route, params: matchPattern(route.pattern, path) }))
    .find(({ params }) => params !== null);
  return hit ?? { route: notFoundRoute, params: {} };
}

// Returns a hash to redirect to, or '' when access is allowed.
function checkGuard(route, path) {
  const loggedIn = Boolean(getState().auth.user);
  if (route.guard === 'auth' && !loggedIn) {
    setState({ route: { ...getState().route, intended: path } });
    return '#/login';
  }
  if (route.guard === 'guest' && loggedIn) return '#/';
  return '';
}

// Draws the active view from state. Called on every setState().
function draw() {
  // Re-rendering replaces the DOM, so remember which control had focus and restore it.
  const focused = outlet.contains(document.activeElement) ? document.activeElement : null;
  const { id, selectionStart, selectionEnd } = focused ?? {};
  outlet.innerHTML = active.view.render(getState(), activeParams);
  const next = id ? document.getElementById(id) : null;
  if (!next) return;
  next.focus();
  if (typeof selectionStart === 'number') next.setSelectionRange(selectionStart, selectionEnd);
}

function handleRoute() {
  const path = toPath(location.hash);
  const { route, params } = matchRoute(path);
  const redirect = checkGuard(route, path);
  if (redirect) {
    location.hash = redirect; // fires hashchange again
    return;
  }
  if (cleanup) cleanup();
  active = route;
  activeParams = params;
  setState({ route: { ...getState().route, name: route.name, params } }); // triggers draw()
  cleanup = route.view.mount(outlet, params) ?? null;
}

export function startRouter(outletElement) {
  outlet = outletElement;
  subscribe(draw);
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
