import { getState, setState } from '../state.js';
import { checkoutCart, getUserCarts } from '../api.js';
import { cartTotals, changeQuantity, discountedPrice, lineTotal, removeLine } from '../cart-logic.js';
import { escapeHTML, formatPrice } from '../utils.js';
import { emptyBlock, errorBlock, pageHeader, renderByStatus } from '../components.js';

// ---------- data ----------
async function loadPastCarts() {
  const { auth, pastCarts } = getState();
  setState({ pastCarts: { ...pastCarts, status: 'loading', error: null } });
  try {
    const { carts } = await getUserCarts(auth.user.id);
    setState({ pastCarts: { status: 'success', items: carts, error: null } });
  } catch (error) {
    console.error('Could not load past carts:', error);
    setState({ pastCarts: { ...getState().pastCarts, status: 'error', error: error.message } });
  }
}

async function checkout() {
  const { cart, auth } = getState();
  setState({ checkout: { status: 'loading', receipt: null, error: null } });
  try {
    const receipt = await checkoutCart(auth.user.id, cart);
    const { pastCarts } = getState();
    setState({
      cart: [],
      checkout: { status: 'success', receipt, error: null },
      pastCarts: { ...pastCarts, items: [receipt, ...pastCarts.items] }, // the server does not store it
    });
  } catch (error) {
    console.error('Checkout failed:', error);
    setState({ checkout: { status: 'error', receipt: null, error: error.message } });
  }
}

// ---------- markup ----------
const renderLine = (line) => `
  <li class="cart-line">
    <div>
      <a href="#/shop/${escapeHTML(line.id)}">${escapeHTML(line.title)}</a>
      <p class="card-meta">${formatPrice(discountedPrice(line))} each</p>
    </div>
    <div class="qty-controls">
      <button type="button" data-action="dec" data-id="${escapeHTML(line.id)}"
        aria-label="Decrease quantity of ${escapeHTML(line.title)}" ${line.quantity <= line.minimumOrderQuantity ? 'disabled' : ''}>−</button>
      <span aria-live="polite">${line.quantity}</span>
      <button type="button" data-action="inc" data-id="${escapeHTML(line.id)}"
        aria-label="Increase quantity of ${escapeHTML(line.title)}" ${line.quantity >= line.stock ? 'disabled' : ''}>+</button>
    </div>
    <p class="line-total">${formatPrice(lineTotal(line))}</p>
    <button type="button" class="btn-ghost" data-action="remove" data-id="${escapeHTML(line.id)}">Remove</button>
  </li>`;

function renderSummary(cart, { status, error }) {
  const { subtotal, discount, total } = cartTotals(cart);
  const placing = status === 'loading';
  return `
    <aside class="card summary" aria-label="Order summary">
      <dl>
        <div><dt>Subtotal</dt><dd>${formatPrice(subtotal)}</dd></div>
        <div><dt>Discount</dt><dd>−${formatPrice(discount)}</dd></div>
        <div class="grand"><dt>Total</dt><dd>${formatPrice(total)}</dd></div>
      </dl>
      <button type="button" data-action="checkout" ${placing ? 'disabled' : ''}>${placing ? 'Placing order…' : 'Checkout'}</button>
      ${status === 'error' ? errorBlock(error, 'checkout') : ''}
    </aside>`;
}

const renderCart = (cart, checkoutState) => (cart.length === 0
  ? `${emptyBlock('Your cart is empty.')}<p><a href="#/shop">Browse the shop</a></p>`
  : `<div class="cart-layout">
       <ul class="stack">${cart.map(renderLine).join('')}</ul>
       ${renderSummary(cart, checkoutState)}
     </div>`);

// The receipt shows the totals the server returned.
const renderReceipt = ({ receipt }) => `
  <section class="card receipt" aria-labelledby="receipt-title">
    <h2 id="receipt-title">Order placed</h2>
    <ul>${receipt.products.map((p) => `<li>${escapeHTML(p.title)} × ${escapeHTML(p.quantity)}: ${formatPrice(p.discountedTotal)}</li>`).join('')}</ul>
    <p>Total before discount: ${formatPrice(receipt.total)}</p>
    <p><strong>You pay: ${formatPrice(receipt.discountedTotal)}</strong></p>
    <a href="#/shop">Keep shopping</a>
  </section>`;

const renderPastCart = (cart) => `
  <li class="card past-cart">
    <p><strong>Order ${escapeHTML(cart.id)}</strong>: ${escapeHTML(cart.totalQuantity)} items, ${formatPrice(cart.discountedTotal)}</p>
    <p class="card-meta">${cart.products.map((p) => escapeHTML(p.title)).join(', ')}</p>
  </li>`;

export function render({ cart, checkout: checkoutState, pastCarts }) {
  const body = checkoutState.status === 'success' ? renderReceipt(checkoutState) : renderCart(cart, checkoutState);
  return `
    <section>${pageHeader('Cart')}${body}</section>
    <section class="past-carts" aria-labelledby="past-title">
      <h2 id="past-title">Past orders</h2>
      ${renderByStatus(pastCarts,
        { isEmpty: pastCarts.items.length === 0, emptyMessage: 'No past orders yet.', retryAction: 'retry-carts', skeleton: 'list' },
        () => `<ul class="stack">${pastCarts.items.map(renderPastCart).join('')}</ul>`)}
    </section>`;
}

// ---------- events: one delegated listener for +/-, remove, checkout, retry ----------
const updateCart = (cart) => setState({ cart });

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const id = Number(target.dataset.id);
  const actions = {
    inc: () => updateCart(changeQuantity(getState().cart, id, 1)),
    dec: () => updateCart(changeQuantity(getState().cart, id, -1)),
    remove: () => updateCart(removeLine(getState().cart, id)),
    checkout,
    'retry-carts': loadPastCarts,
  };
  actions[target.dataset.action]?.();
}

export function mount(outlet) {
  if (['idle', 'error'].includes(getState().pastCarts.status)) loadPastCarts();
  outlet.addEventListener('click', handleClick);
  return () => outlet.removeEventListener('click', handleClick);
}
