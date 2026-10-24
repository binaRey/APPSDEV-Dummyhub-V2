import { getState, setState } from '../state.js';
import { getProducts, getCategories } from '../api.js';
import { debounce, escapeHTML } from '../utils.js';
import { pageHeader, productCard, renderByStatus, renderOptions } from '../components.js';

const PAGE_SIZE = 12;
const CARD_FIELDS = 'title,price,discountPercentage,rating,stock,thumbnail,category';
const SORTS = [
  ['', 'Default'], ['title-asc', 'Title A-Z'], ['title-desc', 'Title Z-A'],
  ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'],
  ['rating-asc', 'Rating: low to high'], ['rating-desc', 'Rating: high to low'],
];

const updateShop = (patch) => setState({ shop: { ...getState().shop, ...patch } });

// ---------- data ----------
async function loadProducts() {
  const requestId = getState().shop.requestId + 1;
  updateShop({ status: 'loading', error: null, requestId });
  const { q, category, sortBy, order, page } = getState().shop;
  try {
    const { products, total } = await getProducts({
      limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, select: CARD_FIELDS, sortBy, order, q, category,
    });
    if (getState().shop.requestId === requestId) updateShop({ status: 'success', items: products, total });
  } catch (error) {
    console.error('Could not load products:', error);
    if (getState().shop.requestId === requestId) updateShop({ status: 'error', error: error.message });
  }
}

async function loadCategories() {
  try {
    updateShop({ categories: await getCategories() });
  } catch (error) {
    console.error('Could not load categories:', error);
  }
}

// Any filter change goes back to page 1 and asks the server again.
function applyFilters(patch) {
  updateShop({ page: 1, ...patch });
  loadProducts();
}

// ---------- markup ----------
function renderToolbar(shop) {
  const categories = [['', 'All categories'], ...shop.categories.map(({ slug, name }) => [slug, name])];
  const sortKey = shop.sortBy ? `${shop.sortBy}-${shop.order}` : '';
  return `
    <form id="shop-form" class="toolbar" role="search" aria-label="Filter products">
      <div class="field"><label for="shop-search">Search</label>
        <input id="shop-search" type="search" value="${escapeHTML(shop.q)}" autocomplete="off"></div>
      <div class="field"><label for="shop-category">Category</label>
        <select id="shop-category">${renderOptions(categories, shop.category)}</select></div>
      <div class="field"><label for="shop-sort">Sort by</label>
        <select id="shop-sort">${renderOptions(SORTS, sortKey)}</select></div>
      <label class="check"><input id="in-stock-only" type="checkbox" ${shop.inStockOnly ? 'checked' : ''}> In stock only</label>
    </form>`;
}

function renderPagination({ page, total }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return `
    <nav class="pagination" aria-label="Pagination">
      <button type="button" data-action="prev" ${page <= 1 ? 'disabled' : ''}>Previous</button>
      <span>Page ${page} of ${pages}</span>
      <button type="button" data-action="next" ${page >= pages ? 'disabled' : ''}>Next</button>
    </nav>`;
}

export function render({ shop }) {
  // Derived view: filtered at render time, never stored.
  const visible = shop.inStockOnly ? shop.items.filter((product) => product.stock > 0) : shop.items;
  return `
    <section>
      ${pageHeader('Shop', 'Browse products and add them to your cart.')}
      ${renderToolbar(shop)}
      ${renderByStatus(shop, { isEmpty: visible.length === 0, emptyMessage: 'No products match your filters.' },
        () => `<div class="grid">${visible.map(productCard).join('')}</div>`)}
      ${shop.status === 'success' && shop.total > 0 ? renderPagination(shop) : ''}
    </section>`;
}

// ---------- events (delegated, attached once per mount) ----------
function goToPage(page) {
  updateShop({ page });
  loadProducts();
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const { page } = getState().shop;
  const actions = {
    'open-product': () => { location.hash = `#/shop/${target.dataset.id}`; },
    prev: () => goToPage(page - 1),
    next: () => goToPage(page + 1),
    retry: loadProducts,
  };
  actions[target.dataset.action]?.();
}

function handleChange(event) {
  const { id, value, checked } = event.target;
  const handlers = {
    'shop-category': () => applyFilters({ category: value, q: '' }),
    'shop-sort': () => {
      const [sortBy = '', order = 'asc'] = value.split('-');
      applyFilters({ sortBy, order });
    },
    'in-stock-only': () => updateShop({ inStockOnly: checked }),
  };
  handlers[id]?.();
}

export function mount(outlet) {
  const { status, categories } = getState().shop;
  if (status === 'idle') loadProducts();
  if (categories.length === 0) loadCategories();

  // Closure: debounce() remembers its timer between keystrokes.
  const search = debounce(() => applyFilters({}), 300);
  const onInput = (event) => {
    if (event.target.id !== 'shop-search') return;
    updateShop({ q: event.target.value, category: '' });
    search();
  };
  const onSubmit = (event) => event.preventDefault(); // Enter in the search box must not reload

  outlet.addEventListener('click', handleClick);
  outlet.addEventListener('change', handleChange);
  outlet.addEventListener('input', onInput);
  outlet.addEventListener('submit', onSubmit);
  return () => {
    outlet.removeEventListener('click', handleClick);
    outlet.removeEventListener('change', handleChange);
    outlet.removeEventListener('input', onInput);
    outlet.removeEventListener('submit', onSubmit);
  };
}
