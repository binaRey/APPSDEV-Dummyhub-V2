import { getState, setState } from '../state.js';
import { getUsers } from '../api.js';
import { loadSlice } from '../loaders.js';
import { debounce, escapeHTML } from '../utils.js';
import { pageHeader, renderByStatus, selectField } from '../components.js';

const LIST_FIELDS = 'firstName,lastName,image,role,company,age';
const ROLES = [['', 'All roles'], ['admin', 'Admin'], ['moderator', 'Moderator'], ['user', 'User']];
const SORTS = [
  ['', 'Default'], ['firstName-asc', 'First name A-Z'], ['firstName-desc', 'First name Z-A'],
  ['lastName-asc', 'Last name A-Z'], ['lastName-desc', 'Last name Z-A'],
  ['age-asc', 'Age: youngest first'], ['age-desc', 'Age: oldest first'],
];

const updatePeople = (patch) => setState({ people: { ...getState().people, ...patch } });

function loadPeople() {
  const { q, role, sortBy, order } = getState().people;
  return loadSlice('people', () => getUsers({ select: LIST_FIELDS, sortBy, order, q, role }),
    ({ users, total }) => ({ items: users, total }));
}

const renderUser = (user) => `
  <article class="card user-card" data-action="open-user" data-id="${escapeHTML(user.id)}">
    <img class="avatar-lg" src="${escapeHTML(user.image)}" alt="${escapeHTML(`${user.firstName} ${user.lastName}`)}" loading="lazy">
    <div>
      <h2 class="card-title"><a href="#/people/${escapeHTML(user.id)}">${escapeHTML(`${user.firstName} ${user.lastName}`)}</a></h2>
      <p class="card-meta">${escapeHTML(user.role)}</p>
      <p class="card-meta">${escapeHTML(user.company?.title ?? '')} at ${escapeHTML(user.company?.name ?? '')}</p>
    </div>
  </article>`;

export function render({ people }) {
  return `
    <section>
      ${pageHeader('People', 'Look up members of the community.')}
      <form id="people-form" class="toolbar" role="search" aria-label="Filter people">
        <div class="field"><label for="people-search">Search</label>
          <input id="people-search" type="search" value="${escapeHTML(people.q)}" autocomplete="off"></div>
        ${selectField('people-role', 'Role', ROLES, people.role)}
        ${selectField('people-sort', 'Sort by', SORTS, people.sortBy ? `${people.sortBy}-${people.order}` : '')}
      </form>
      ${renderByStatus(people, { isEmpty: people.items.length === 0, emptyMessage: 'No people match your search.' },
        () => `<div class="grid">${people.items.map(renderUser).join('')}</div>`)}
    </section>`;
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (target?.dataset.action === 'open-user') location.hash = `#/people/${target.dataset.id}`;
  if (target?.dataset.action === 'retry') loadPeople();
}

function handleChange({ target: { id, value } }) {
  if (id === 'people-role') {
    updatePeople({ role: value, q: '' });
    loadPeople();
  }
  if (id === 'people-sort') {
    const [sortBy = '', order = 'asc'] = value.split('-');
    updatePeople({ sortBy, order });
    loadPeople();
  }
}

export function mount(outlet) {
  if (getState().people.status === 'idle') loadPeople();

  const search = debounce(() => loadPeople(), 300);
  const onInput = (event) => {
    if (event.target.id !== 'people-search') return;
    updatePeople({ q: event.target.value, role: '' });
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
