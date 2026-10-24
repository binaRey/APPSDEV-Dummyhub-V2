import { getState, setState } from '../state.js';
import { getRecipes, getRecipeTags } from '../api.js';
import { loadSlice } from '../loaders.js';
import { debounce, escapeHTML, tagLabel, tagSlug } from '../utils.js';
import { pageHeader, renderByStatus, selectField } from '../components.js';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const TIME_LIMITS = ['15', '30', '45', '60'];
const LIST_FIELDS = 'name,image,difficulty,prepTimeMinutes,cookTimeMinutes,caloriesPerServing,rating,mealType,tags';
const SORTS = [
  ['', 'Default'], ['name-asc', 'Name A-Z'], ['name-desc', 'Name Z-A'], ['rating-desc', 'Top rated'],
  ['caloriesPerServing-asc', 'Calories: low to high'], ['caloriesPerServing-desc', 'Calories: high to low'],
];

const updateRecipes = (patch) => setState({ recipes: { ...getState().recipes, ...patch } });

function loadRecipes() {
  const { q, tag, mealType, sortBy, order } = getState().recipes;
  return loadSlice('recipes',
    () => getRecipes({ select: LIST_FIELDS, sortBy, order, q, tag, mealType }),
    ({ recipes }) => ({ items: recipes }));
}

async function loadTags() {
  try {
    updateRecipes({ tags: await getRecipeTags() });
  } catch (error) {
    console.error('Could not load recipe tags:', error);
  }
}

// Server-side filters (search, tag, meal type) replace each other; derived filters stay local.
const applyFilters = (patch) => {
  updateRecipes({ q: '', tag: '', mealType: '', ...patch });
  loadRecipes();
};

const totalMinutes = (recipe) => recipe.prepTimeMinutes + recipe.cookTimeMinutes;

function renderToolbar(r) {
  const tags = [['', 'All tags'], ...r.tags.map((tag) => [tagSlug(tag), tagLabel(tag)])];
  const meals = [['', 'All meals'], ...MEAL_TYPES.map((meal) => [meal, meal])];
  const levels = [['', 'Any difficulty'], ...DIFFICULTIES.map((level) => [level, level])];
  const times = [['', 'Any time'], ...TIME_LIMITS.map((min) => [min, `Under ${min} minutes`])];
  return `
    <form id="recipe-form" class="toolbar" role="search" aria-label="Filter recipes">
      <div class="field"><label for="recipe-search">Search</label>
        <input id="recipe-search" type="search" value="${escapeHTML(r.q)}" autocomplete="off"></div>
      ${selectField('recipe-tag', 'Tag', tags, r.tag)}
      ${selectField('recipe-meal', 'Meal type', meals, r.mealType)}
      ${selectField('recipe-sort', 'Sort by', SORTS, r.sortBy ? `${r.sortBy}-${r.order}` : '')}
      ${selectField('recipe-difficulty', 'Difficulty', levels, r.difficulty)}
      ${selectField('recipe-time', 'Ready in', times, r.maxMinutes)}
    </form>`;
}

const renderCard = (recipe) => `
  <article class="card recipe-card" data-action="open-recipe" data-id="${escapeHTML(recipe.id)}">
    <div class="card-media"><img src="${escapeHTML(recipe.image)}" alt="${escapeHTML(recipe.name)}" loading="lazy"></div>
    <div class="card-body">
      <p class="card-meta">${escapeHTML([recipe.mealType].flat().join(', '))}</p>
      <h2 class="card-title"><a href="#/recipes/${escapeHTML(recipe.id)}">${escapeHTML(recipe.name)}</a></h2>
      <p class="card-meta">${escapeHTML(recipe.difficulty)}, ${totalMinutes(recipe)} min, ${escapeHTML(recipe.caloriesPerServing)} kcal</p>
      <p class="card-meta">Rating ${escapeHTML(recipe.rating)}</p>
    </div>
  </article>`;

export function render({ recipes }) {
  // Derived view: difficulty and total time are filtered at render time.
  const visible = recipes.items.filter((recipe) =>
    (!recipes.difficulty || recipe.difficulty === recipes.difficulty) &&
    (!recipes.maxMinutes || totalMinutes(recipe) <= Number(recipes.maxMinutes)));
  return `
    <section>
      ${pageHeader('Recipes', 'Find something to cook.')}
      ${renderToolbar(recipes)}
      ${renderByStatus(recipes, { isEmpty: visible.length === 0, emptyMessage: 'No recipes match your filters.' },
        () => `<div class="grid">${visible.map(renderCard).join('')}</div>`)}
    </section>`;
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (target?.dataset.action === 'open-recipe') location.hash = `#/recipes/${target.dataset.id}`;
  if (target?.dataset.action === 'retry') loadRecipes();
}

function handleChange({ target: { id, value } }) {
  const handlers = {
    'recipe-tag': () => applyFilters({ tag: value }),
    'recipe-meal': () => applyFilters({ mealType: value }),
    'recipe-sort': () => {
      const [sortBy = '', order = 'asc'] = value.split('-');
      updateRecipes({ sortBy, order });
      loadRecipes();
    },
    'recipe-difficulty': () => updateRecipes({ difficulty: value }),
    'recipe-time': () => updateRecipes({ maxMinutes: value }),
  };
  handlers[id]?.();
}

export function mount(outlet) {
  const { status, tags } = getState().recipes;
  if (status === 'idle') loadRecipes();
  if (tags.length === 0) loadTags();

  const search = debounce(() => loadRecipes(), 300);
  const onInput = (event) => {
    if (event.target.id !== 'recipe-search') return;
    updateRecipes({ q: event.target.value, tag: '', mealType: '' });
    search();
  };
  const onSubmit = (event) => event.preventDefault();

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
