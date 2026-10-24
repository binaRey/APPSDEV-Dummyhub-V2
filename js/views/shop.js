import { getState, setState } from '../state.js';
import { escapeHTML } from '../utils.js';
import { pageHeader, productCard, renderByStatus } from '../components.js';

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  ['', 'Default'], ['title-asc', 'Title A-Z'], ['title-desc', 'Title Z-A'],
  ['price-asc', 'Price low-high'], ['price-desc', 'Price high-low'],
  ['rating-desc', 'Top rated'],
];

const renderToolbar = ({ q, inStockOnly }) => `
  <form class="toolbar" role="search" aria-label="Filter products">
    <div class="field"><label for="shop-search">Search</label>
      <input id="shop-search" type="search" value="${escapeHTML(q)}" disabled></div>
    <div class="field"><label for="shop-category">Category</label>
      <select id="shop-category" disabled><option>All categories</option></select></div>
    <div class="field"><label for="shop-sort">Sort by</label>
      <select id="shop-sort" disabled>${SORT_OPTIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
    <label class="check"><input id="in-stock-only" type="checkbox" ${inStockOnly ? 'checked' : ''}> In stock only</label>
  </form>`;

const renderPagination = ({ page, total }) => {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return `
    <nav class="pagination" aria-label="Pagination">
      <button type="button" data-action="prev" ${page <= 1 ? 'disabled' : ''}>Previous</button>
      <span>Page ${page} of ${pages}</span>
      <button type="button" data-action="next" ${page >= pages ? 'disabled' : ''}>Next</button>
    </nav>`;
};

export function render({ shop }) {
  // Derived view: filtered at render time, never stored.
  const visible = shop.inStockOnly ? shop.items.filter((p) => p.stock > 0) : shop.items;
  return `
    <section>
      ${pageHeader('Shop', 'Browse products and add them to your cart.')}
      ${renderToolbar(shop)}
      ${renderByStatus(shop, { isEmpty: visible.length === 0, emptyMessage: 'No products match your filters.' },
        () => `<div class="grid">${visible.map(productCard).join('')}</div>${renderPagination(shop)}`)}
    </section>`;
}

// One delegated listener per container, attached once per mount.
export function mount(outlet) {
  const onClick = (event) => {
    const target = event.target.closest('[data-action]');
    if (target?.dataset.action === 'open-product') location.hash = `#/shop/${target.dataset.id}`;
  };
  const onChange = (event) => {
    if (event.target.id !== 'in-stock-only') return;
    const { shop } = getState();
    setState({ shop: { ...shop, inStockOnly: event.target.checked } });
  };
  outlet.addEventListener('click', onClick);
  outlet.addEventListener('change', onChange);
  return () => {
    outlet.removeEventListener('click', onClick);
    outlet.removeEventListener('change', onChange);
  };
}
