// Small render functions that return markup. All text is escaped.
import { escapeHTML, formatPrice } from './utils.js';
import { discountedPrice } from './cart-logic.js';

export const pageHeader = (title, subtitle = '') => `
  <header class="page-header">
    <h1>${escapeHTML(title)}</h1>
    ${subtitle ? `<p>${escapeHTML(subtitle)}</p>` : ''}
  </header>`;

export const loadingBlock = (label = 'Loading…') => `
  <p class="state-loading" role="status"><span class="spinner" aria-hidden="true"></span>${escapeHTML(label)}</p>`;

export const emptyBlock = (message) => `<p class="state-empty">${escapeHTML(message)}</p>`;

// `action` is the data-action the view's delegated listener uses to repeat the request.
export const errorBlock = (message, action = 'retry') => `
  <div class="state-error" role="alert">
    <p>${escapeHTML(message)}</p>
    <button type="button" data-action="${escapeHTML(action)}">Retry</button>
  </div>`;

export const notFoundBlock = (title, href, linkLabel) => `
  <section class="not-found">
    <h1>${escapeHTML(title)}</h1>
    <p class="state-empty">We could not find what you were looking for. <a href="${escapeHTML(href)}">${escapeHTML(linkLabel)}</a></p>
  </section>`;

// The three UI states in one place: loading, error, then empty-or-success.
export function renderByStatus(slice, { isEmpty, emptyMessage, retryAction = 'retry' }, renderSuccess) {
  const { status, error } = slice;
  if (status === 'loading') return loadingBlock();
  if (status === 'error') return errorBlock(error, retryAction);
  if (status === 'success') return isEmpty ? emptyBlock(emptyMessage) : renderSuccess();
  return '';
}

export function productCard(product) {
  const { id, title, price, discountPercentage, rating, stock, thumbnail, category } = product;
  const outOfStock = stock === 0;
  const image = thumbnail
    ? `<img src="${escapeHTML(thumbnail)}" alt="${escapeHTML(title)}" loading="lazy">`
    : `<div class="card-media-empty" role="img" aria-label="${escapeHTML(title)}">No image</div>`;
  return `
    <article class="card product-card ${outOfStock ? 'is-out-of-stock' : ''}" data-action="open-product" data-id="${escapeHTML(id)}">
      <div class="card-media">${image}</div>
      <div class="card-body">
        <p class="card-meta">${escapeHTML(category)}</p>
        <h2 class="card-title"><a href="#/shop/${escapeHTML(id)}">${escapeHTML(title)}</a></h2>
        <p class="price">${formatPrice(discountedPrice(product))}
          ${discountPercentage ? `<s>${formatPrice(price)}</s>` : ''}</p>
        <p class="card-meta">Rating ${escapeHTML(rating)}, ${outOfStock ? 'out of stock' : `${escapeHTML(stock)} in stock`}</p>
      </div>
    </article>`;
}

export const renderOptions = (entries, selected) => entries
  .map(([value, label]) => `<option value="${escapeHTML(value)}" ${value === selected ? 'selected' : ''}>${escapeHTML(label)}</option>`)
  .join('');

export const selectField = (id, label, entries, selected) => `
  <div class="field"><label for="${id}">${escapeHTML(label)}</label>
    <select id="${id}">${renderOptions(entries, selected)}</select></div>`;
