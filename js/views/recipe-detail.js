import { getState, setState } from '../state.js';
import { getRecipe } from '../api.js';
import { loadSlice } from '../loaders.js';
import { escapeHTML } from '../utils.js';
import { notFoundBlock, renderByStatus } from '../components.js';

const MAX_SERVINGS = 24;

const loadRecipe = (id) => loadSlice('recipeDetail', () => getRecipe(id),
  (recipe) => ({ item: recipe, servings: recipe.servings, notFound: false }),
  { reset: { item: null, notFound: false }, onError: (error) => ({ notFound: error.status === 404 }) });

const list = (items, tag) => `<${tag}>${items.map((text) => `<li>${escapeHTML(text)}</li>`).join('')}</${tag}>`;

function renderServings({ item, servings }) {
  const perServing = item.caloriesPerServing;
  return `
    <div class="servings" role="group" aria-label="Servings">
      <button type="button" data-action="dec-servings" aria-label="Fewer servings" ${servings <= 1 ? 'disabled' : ''}>−</button>
      <span>${servings} ${servings === 1 ? 'serving' : 'servings'}</span>
      <button type="button" data-action="inc-servings" aria-label="More servings" ${servings >= MAX_SERVINGS ? 'disabled' : ''}>+</button>
    </div>
    <p>${escapeHTML(perServing)} kcal per serving, ${perServing * servings} kcal in total.</p>`;
}

function renderRecipe(detail) {
  const { item } = detail;
  return `
    <article class="detail">
      <p><a href="#/recipes">Back to recipes</a></p>
      <div class="detail-layout">
        <div class="gallery-main"><img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}"></div>
        <div class="detail-info">
          <h1>${escapeHTML(item.name)}</h1>
          <p class="card-meta">${escapeHTML(item.cuisine)}, ${escapeHTML(item.difficulty)}, rating ${escapeHTML(item.rating)}</p>
          <p>Prep ${escapeHTML(item.prepTimeMinutes)} min, cook ${escapeHTML(item.cookTimeMinutes)} min.</p>
          ${renderServings(detail)}
        </div>
      </div>
      <section aria-labelledby="ing-title"><h2 id="ing-title">Ingredients</h2>${list(item.ingredients, 'ul')}</section>
      <section aria-labelledby="ins-title"><h2 id="ins-title">Instructions</h2>${list(item.instructions, 'ol')}</section>
    </article>`;
}

export function render({ recipeDetail }, params) {
  if (recipeDetail.notFound) return notFoundBlock('Recipe not found', '#/recipes', 'Back to recipes');
  const stale = recipeDetail.item && String(recipeDetail.item.id) !== params.id;
  const slice = stale ? { ...recipeDetail, status: 'loading' } : recipeDetail;
  return `<section>${renderByStatus(slice, { isEmpty: !recipeDetail.item, emptyMessage: 'Recipe unavailable.' },
    () => renderRecipe(recipeDetail))}</section>`;
}

export function mount(outlet, params) {
  loadRecipe(params.id);
  const onClick = (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    const { recipeDetail } = getState();
    const change = (delta) => setState({ recipeDetail: { ...recipeDetail, servings: recipeDetail.servings + delta } });
    if (action === 'inc-servings' && recipeDetail.servings < MAX_SERVINGS) change(1);
    if (action === 'dec-servings' && recipeDetail.servings > 1) change(-1);
    if (action === 'retry') loadRecipe(params.id);
  };
  outlet.addEventListener('click', onClick);
  return () => outlet.removeEventListener('click', onClick);
}
