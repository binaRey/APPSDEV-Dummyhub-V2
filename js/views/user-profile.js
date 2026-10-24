import { getState } from '../state.js';
import { getUser, getUserPosts, getUserTodos, getProfileCarts } from '../api.js';
import { loadSlice } from '../loaders.js';
import { escapeHTML, formatPrice } from '../utils.js';
import { emptyBlock, notFoundBlock, renderByStatus } from '../components.js';

// Four independent requests run in parallel.
const loadProfile = (id) => loadSlice('profile',
  async () => {
    const [user, posts, todos, carts] = await Promise.all([
      getUser(id), getUserPosts(id), getUserTodos(id), getProfileCarts(id),
    ]);
    return { user, posts: posts.posts, todos: todos.todos, carts: carts.carts };
  },
  (data) => ({ ...data, notFound: false }),
  { reset: { user: null, notFound: false }, onError: (error) => ({ notFound: error.status === 404 }) });

const section = (title, items, renderItem, emptyMessage) => `
  <section class="profile-section">
    <h2>${title}</h2>
    ${items.length ? `<ul class="stack">${items.map(renderItem).join('')}</ul>` : emptyBlock(emptyMessage)}
  </section>`;

const renderPostItem = (post) => `<li class="card"><div class="card-body"><a href="#/community/${escapeHTML(post.id)}">${escapeHTML(post.title)}</a></div></li>`;
const renderTodoItem = (todo) => `<li class="card"><div class="card-body ${todo.completed ? 'is-done' : ''}">${escapeHTML(todo.todo)} (${todo.completed ? 'done' : 'pending'})</div></li>`;
const renderCartItem = (cart) => `<li class="card"><div class="card-body">Cart ${escapeHTML(cart.id)}: ${escapeHTML(cart.totalProducts)} products, ${formatPrice(cart.discountedTotal)}</div></li>`;

function renderProfile({ user, posts, todos, carts }) {
  const fullName = `${user.firstName} ${user.lastName}`;
  return `
    <article>
      <p><a href="#/people">Back to people</a></p>
      <header class="profile-head">
        <img class="avatar-lg" src="${escapeHTML(user.image)}" alt="${escapeHTML(fullName)}">
        <div>
          <h1>${escapeHTML(fullName)}</h1>
          <p class="card-meta">${escapeHTML(user.role)}, ${escapeHTML(user.company?.title ?? '')} at ${escapeHTML(user.company?.name ?? '')}</p>
          <p class="card-meta">${escapeHTML(user.email)}</p>
        </div>
      </header>
      ${section('Posts', posts, renderPostItem, 'No posts yet.')}
      ${section('Todos', todos, renderTodoItem, 'No todos yet.')}
      ${section('Carts', carts, renderCartItem, 'No carts yet.')}
    </article>`;
}

export function render({ profile }, params) {
  if (profile.notFound) return notFoundBlock('Person not found', '#/people', 'Back to people');
  const stale = profile.user && String(profile.user.id) !== params.id;
  const slice = stale ? { ...profile, status: 'loading' } : profile;
  return `<section>${renderByStatus(slice, { isEmpty: !profile.user, emptyMessage: 'Profile unavailable.' },
    () => renderProfile(profile))}</section>`;
}

export function mount(outlet, params) {
  loadProfile(params.id);
  const onClick = (event) => {
    if (event.target.closest('[data-action="retry"]')) loadProfile(params.id);
  };
  outlet.addEventListener('click', onClick);
  return () => outlet.removeEventListener('click', onClick);
}
