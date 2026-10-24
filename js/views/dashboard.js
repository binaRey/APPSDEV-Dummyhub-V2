import { escapeHTML } from '../utils.js';

// Summary cards are filled with real numbers (computed with reduce) in Phase 3.
const SUMMARY = ['Past carts', 'Completed todos', 'Pending todos', 'Posts'];

export function render({ auth }) {
  const name = auth.user ? auth.user.firstName : 'there';
  return `
    <section class="hero">
      <h1>Welcome back, ${escapeHTML(name)}</h1>
      <p>Your orders, tasks and posts at a glance.</p>
    </section>
    <section aria-label="Summary" class="grid summary-grid">
      ${SUMMARY.map((label) => `
        <article class="card summary-card"><p class="card-meta">${label}</p><p class="stat">–</p></article>`).join('')}
    </section>
    <section class="card quote-card" aria-label="Quote of the moment">
      <p>A quote will appear here.</p>
    </section>`;
}

export const mount = () => () => {};
