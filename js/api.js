// The only file allowed to call fetch(). It never touches the DOM.
import { getState, setState } from './state.js';

const BASE = 'https://dummyjson.com';

// Open the app with ?delay=1500 to slow every GET and demo the loading state.
const delayParam = new URLSearchParams(location.search).get('delay');
const DELAY = /^\d{1,4}$/.test(delayParam ?? '') ? delayParam : '';

const withDelay = (path, method) => {
  if (!DELAY || method !== 'GET') return path;
  return `${path}${path.includes('?') ? '&' : '?'}delay=${DELAY}`;
};

// Builds a query string, skipping empty values.
const toQuery = (params) => new URLSearchParams(
  Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
).toString();

// main.js registers what happens after a token refresh or when the session cannot be saved.
const hooks = { onRefresh: null, onExpired: null };
export const setSessionHooks = (next) => Object.assign(hooks, next);

// One HTTP round trip. auth: true prefixes /auth and sends the Bearer token.
async function send(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const { accessToken } = getState().auth;
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let res;
  try {
    res = await fetch(`${BASE}${auth ? '/auth' : ''}${withDelay(path, method)}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    console.error('Network failure:', error);
    throw new Error('Network error. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function refreshTokens() {
  const { refreshToken } = getState().auth;
  const { res, data } = await send('/auth/refresh', { method: 'POST', body: { refreshToken, expiresInMins: 30 } });
  if (!res.ok) throw new Error(data.message || 'Could not refresh the session.');
  const tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
  setState({ auth: { ...getState().auth, ...tokens } });
  hooks.onRefresh?.(tokens);
}

// Several requests can hit a 401 together; they share one refresh.
let pendingRefresh = null;
async function refreshOnce() {
  pendingRefresh ??= refreshTokens();
  try {
    await pendingRefresh;
  } finally {
    pendingRefresh = null;
  }
}

// Every request in the app goes through here: it checks res.ok and throws readable errors.
export async function request(path, options = {}) {
  let { res, data } = await send(path, options);
  if (res.status === 401 && options.auth && getState().auth.refreshToken) {
    try {
      await refreshOnce();
    } catch (error) {
      console.error('Token refresh failed:', error);
      hooks.onExpired?.();
      throw new Error('Your session expired. Please log in again.');
    }
    ({ res, data } = await send(path, options)); // retry once with the new token
  }
  // fetch() only rejects on network failure; HTTP 4xx/5xx must be checked here.
  if (!res.ok) {
    const error = new Error(data.message || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

// ---- Auth ----
export const loginUser = (username, password) =>
  request('/auth/login', { method: 'POST', body: { username, password, expiresInMins: 30 } });

export const getMe = () => request('/me', { auth: true });

// ---- Products ----
const productListPath = ({ q, category }) => {
  if (q) return '/products/search';
  if (category) return `/products/category/${encodeURIComponent(category)}`;
  return '/products';
};

export const getProducts = ({ limit = 12, skip = 0, select, sortBy, order, q, category } = {}) =>
  request(`${productListPath({ q, category })}?${toQuery({ q, limit, skip, select, sortBy, order })}`);

export const getProduct = (id) => request(`/products/${encodeURIComponent(id)}`);

export const getCategories = () => request('/products/categories');

// ---- Carts ----
export const checkoutCart = (userId, lines) =>
  request('/carts/add', {
    method: 'POST',
    body: { userId, products: lines.map(({ id, quantity }) => ({ id, quantity })) },
  });

export const getUserCarts = (userId) => request(`/carts/user/${userId}`);

// ---- Recipes ----
const recipeListPath = ({ q, tag, mealType }) => {
  if (q) return '/recipes/search';
  if (tag) return `/recipes/tag/${encodeURIComponent(tag)}`;
  if (mealType) return `/recipes/meal-type/${encodeURIComponent(mealType)}`;
  return '/recipes';
};

// limit=0 asks DummyJSON for every recipe so the client-side filters see the full set.
export const getRecipes = ({ limit = 0, skip = 0, select, sortBy, order, q, tag, mealType } = {}) =>
  request(`${recipeListPath({ q, tag, mealType })}?${toQuery({ q, limit, skip, select, sortBy, order })}`);

export const getRecipe = (id) => request(`/recipes/${encodeURIComponent(id)}`);
export const getRecipeTags = () => request('/recipes/tags');

// ---- Posts and comments ----
const postListPath = ({ q, tag }) => {
  if (q) return '/posts/search';
  if (tag) return `/posts/tag/${encodeURIComponent(tag)}`;
  return '/posts';
};

export const getPosts = ({ limit = 10, skip = 0, q, tag } = {}) =>
  request(`${postListPath({ q, tag })}?${toQuery({ q, limit, skip })}`);

export const getPost = (id) => request(`/posts/${encodeURIComponent(id)}`);
export const getPostTags = () => request('/posts/tag-list');
export const getPostComments = (id) => request(`/posts/${encodeURIComponent(id)}/comments`);

export const addComment = ({ body, postId, userId }) =>
  request('/comments/add', { method: 'POST', body: { body, postId, userId } });

// ---- Users ----
const userListPath = ({ q, role }) => {
  if (q) return '/users/search';
  if (role) return '/users/filter';
  return '/users';
};

export const getUsers = ({ limit = 24, skip = 0, select, sortBy, order, q, role } = {}) => {
  const filter = !q && role ? { key: 'role', value: role } : {};
  return request(`${userListPath({ q, role })}?${toQuery({ q, ...filter, limit, skip, select, sortBy, order })}`);
};

export const getUser = (id) => request(`/users/${encodeURIComponent(id)}`);
export const getUserPosts = (id) => request(`/users/${encodeURIComponent(id)}/posts`);
export const getUserTodos = (id) => request(`/users/${encodeURIComponent(id)}/todos`);
export const getProfileCarts = (id) => request(`/users/${encodeURIComponent(id)}/carts`);

// ---- Logged-in reads (the /auth-prefixed form) ----
export const getMyTodos = (userId) => request(`/users/${userId}/todos`, { auth: true });
export const getMyCarts = (userId) => request(`/carts/user/${userId}`, { auth: true });
export const getMyPosts = (userId) => request(`/users/${userId}/posts`, { auth: true });
export const getRandomQuote = () => request('/quotes/random');

// ---- Todos (writes are simulated by the server) ----
export const addTodo = (todo, userId) =>
  request('/todos/add', { method: 'POST', body: { todo, completed: false, userId } });

export const updateTodo = (id, completed) =>
  request(`/todos/${id}`, { method: 'PUT', body: { completed } });

export const deleteTodo = (id) => request(`/todos/${id}`, { method: 'DELETE' });
