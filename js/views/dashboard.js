import { getState, setState } from '../state.js';
import { getRandomQuote, getMyCarts, getMyTodos, getMyPosts } from '../api.js';
import { loadSlice } from '../loaders.js';
import { escapeHTML, formatPrice } from '../utils.js';
import { renderByStatus } from '../components.js';

const updateDashboard = (patch) => setState({ dashboard: { ...getState().dashboard, ...patch } });

// Four independent requests run in parallel through the /auth-prefixed endpoints.
function loadDashboard() {
  const { id } = getState().auth.user;
  return loadSlice('dashboard',
    async () => {
      const [quote, carts, todos, posts] = await Promise.all([
        getRandomQuote(), getMyCarts(id), getMyTodos(id), getMyPosts(id),
      ]);
      return { quote, carts: carts.carts, todos: todos.todos, posts: posts.posts };
    },
    (data) => ({ ...data, quoteError: '' }));
}

// Only the quote card changes.
async function loadAnotherQuote() {
  updateDashboard({ quoteLoading: true, quoteError: '' });
  try {
    updateDashboard({ quote: await getRandomQuote(), quoteLoading: false });
  } catch (error) {
    console.error('Could not load quote:', error);
    updateDashboard({ quoteLoading: false, quoteError: error.message });
  }
}

// Summary numbers are computed with reduce.
function summarize({ carts, todos, posts }) {
  const cartTotal = carts.reduce((sum, cart) => sum + cart.discountedTotal, 0);
  const completed = todos.reduce((count, todo) => count + (todo.completed ? 1 : 0), 0);
  return [
    ['Past carts', carts.length, `${formatPrice(cartTotal)} combined`],
    ['Completed todos', completed, ''],
    ['Pending todos', todos.length - completed, ''],
    ['Posts', posts.length, ''],
  ];
}

const renderCard = ([label, value, note]) => `
  <article class="card summary-card">
    <p class="card-meta">${escapeHTML(label)}</p>
    <p class="stat">${escapeHTML(value)}</p>
    ${note ? `<p class="card-meta">${escapeHTML(note)}</p>` : ''}
  </article>`;

function renderQuote({ quote, quoteLoading, quoteError }) {
  return `
    <section class="card quote-card" aria-label="Quote of the moment">
      <blockquote><p>${escapeHTML(quote?.quote ?? '')}</p><footer>${escapeHTML(quote?.author ?? '')}</footer></blockquote>
      ${quoteError ? `<p class="field-error" role="alert">${escapeHTML(quoteError)}</p>` : ''}
      <button type="button" data-action="new-quote" ${quoteLoading ? 'disabled' : ''}>${quoteLoading ? 'Loading…' : 'New quote'}</button>
    </section>`;
}

export function render({ auth, dashboard }) {
  return `
    <section class="hero">
      <h1>Welcome back, ${escapeHTML(auth.user?.firstName ?? 'there')}</h1>
      <p>Your orders, tasks and posts at a glance.</p>
    </section>
    ${renderByStatus(dashboard, { isEmpty: false, emptyMessage: '' }, () => `
      <section aria-label="Summary" class="grid summary-grid">${summarize(dashboard).map(renderCard).join('')}</section>
      ${renderQuote(dashboard)}`)}`;
}

export function mount(outlet) {
  if (getState().dashboard.status !== 'success') loadDashboard();
  const onClick = (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'new-quote') loadAnotherQuote();
    if (action === 'retry') loadDashboard();
  };
  outlet.addEventListener('click', onClick);
  return () => outlet.removeEventListener('click', onClick);
}
