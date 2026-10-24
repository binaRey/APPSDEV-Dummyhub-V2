import { getState, setState, initialState } from '../state.js';
import { getProduct } from '../api.js';
import { addLine, checkAddable, discountedPrice } from '../cart-logic.js';
import { escapeHTML, formatPrice } from '../utils.js';
import { emptyBlock, notFoundBlock, renderByStatus } from '../components.js';

const updateDetail = (patch) => setState({ detail: { ...getState().detail, ...patch } });

async function loadProduct(id) {
  updateDetail({ status: 'loading', item: null, error: null, notFound: false, imageIndex: 0, notice: null });
  try {
    const item = await getProduct(id);
    if (getState().route.params.id === id) updateDetail({ status: 'success', item });
  } catch (error) {
    console.error('Could not load product:', error);
    if (getState().route.params.id !== id) return;
    updateDetail(error.status === 404
      ? { status: 'error', notFound: true }
      : { status: 'error', error: error.message });
  }
}

// ---------- markup ----------
function renderGallery({ images, thumbnail, title }, imageIndex) {
  const gallery = images?.length ? images : [thumbnail];
  const main = gallery[imageIndex] ?? gallery[0];
  const thumbs = gallery.map((src, index) => `
    <button type="button" class="thumb ${index === imageIndex ? 'is-active' : ''}" data-action="select-image"
      data-index="${index}" aria-pressed="${index === imageIndex}">
      <img src="${escapeHTML(src)}" alt="${escapeHTML(title)} view ${index + 1}">
    </button>`).join('');
  return `
    <div class="gallery">
      <div class="gallery-main"><img src="${escapeHTML(main)}" alt="${escapeHTML(title)}"></div>
      <div class="thumbs" role="group" aria-label="Product images">${thumbs}</div>
    </div>`;
}

function renderBuyBox(item, notice) {
  const minimum = item.minimumOrderQuantity ?? 1;
  const soldOut = item.stock === 0;
  const message = notice ? `
    <p class="notice is-${escapeHTML(notice.type)}" role="status">${escapeHTML(notice.text)}
      ${notice.type === 'success' ? '<a href="#/cart">View cart</a>' : ''}</p>` : '';
  return `
    <form id="add-form" class="buy-box" novalidate>
      <div class="field"><label for="qty">Quantity</label>
        <input id="qty" name="quantity" type="number" min="${minimum}" max="${item.stock}" value="${minimum}" ${soldOut ? 'disabled' : ''}></div>
      <button type="submit" ${soldOut ? 'disabled' : ''}>${soldOut ? 'Out of stock' : 'Add to cart'}</button>
      ${message}
    </form>`;
}

const renderReview = (review) => `
  <li class="card review">
    <p><strong>${escapeHTML(review.reviewerName)}</strong> rated it ${escapeHTML(review.rating)} of 5</p>
    <p>${escapeHTML(review.comment)}</p>
    <p class="card-meta">${escapeHTML(new Date(review.date).toLocaleDateString())}</p>
  </li>`;

const renderReviews = (reviews = []) => `
  <section class="reviews" aria-labelledby="reviews-title">
    <h2 id="reviews-title">Reviews</h2>
    ${reviews.length ? `<ul class="stack">${reviews.map(renderReview).join('')}</ul>` : emptyBlock('No reviews yet.')}
  </section>`;

function renderProduct({ item, imageIndex, notice }) {
  const minimum = item.minimumOrderQuantity ?? 1;
  return `
    <article class="detail">
      <p><a href="#/shop">Back to the shop</a></p>
      <div class="detail-layout">
        ${renderGallery(item, imageIndex)}
        <div class="detail-info">
          <h1>${escapeHTML(item.title)}</h1>
          ${item.brand ? `<p class="card-meta">by ${escapeHTML(item.brand)}</p>` : ''}
          <p class="price">${formatPrice(discountedPrice(item))}
            ${item.discountPercentage ? `<s>${formatPrice(item.price)}</s> <span class="discount">${escapeHTML(item.discountPercentage)}% off</span>` : ''}</p>
          <p>Rating ${escapeHTML(item.rating)} of 5. ${item.stock > 0 ? `${escapeHTML(item.stock)} in stock.` : 'Out of stock.'}
            ${minimum > 1 ? `Minimum order: ${minimum}.` : ''}</p>
          <p>${escapeHTML(item.description)}</p>
          ${renderBuyBox(item, notice)}
        </div>
      </div>
      ${renderReviews(item.reviews)}
    </article>`;
}

export function render({ detail }, params) {
  if (detail.notFound) return notFoundBlock('Product not found', '#/shop', 'Back to the shop');
  // After navigating between products, the old item may still be in state for one frame.
  const stale = detail.item && String(detail.item.id) !== params.id;
  const slice = stale ? { ...detail, status: 'loading' } : detail;
  return `<section>${renderByStatus(slice, { isEmpty: !detail.item, emptyMessage: 'Product unavailable.' },
    () => renderProduct(detail))}</section>`;
}

// ---------- events ----------
function handleAddToCart(event) {
  if (event.target.id !== 'add-form') return;
  event.preventDefault();
  const quantity = Number(new FormData(event.target).get('quantity'));
  const { cart, detail } = getState();
  const problem = checkAddable(cart, detail.item, quantity);
  if (problem) {
    updateDetail({ notice: { type: 'error', text: problem } });
    return;
  }
  setState({
    cart: addLine(cart, detail.item, quantity),
    checkout: initialState.checkout,
    detail: { ...detail, notice: { type: 'success', text: `Added ${quantity} to your cart.` } },
  });
}

export function mount(outlet, params) {
  loadProduct(params.id);
  const onClick = (event) => {
    const target = event.target.closest('[data-action]');
    if (target?.dataset.action === 'select-image') updateDetail({ imageIndex: Number(target.dataset.index) });
    if (target?.dataset.action === 'retry') loadProduct(params.id);
  };
  outlet.addEventListener('click', onClick);
  outlet.addEventListener('submit', handleAddToCart);
  return () => {
    outlet.removeEventListener('click', onClick);
    outlet.removeEventListener('submit', handleAddToCart);
  };
}
