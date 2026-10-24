import { getState, setState } from '../state.js';
import { getMyTodos, addTodo, updateTodo, deleteTodo } from '../api.js';
import { loadSlice } from '../loaders.js';
import { escapeHTML, nextId, validateText } from '../utils.js';
import { pageHeader, renderByStatus } from '../components.js';

const FILTERS = [['all', 'All'], ['active', 'Active'], ['completed', 'Completed']];

const updateTasks = (patch) => setState({ tasks: { ...getState().tasks, ...patch } });
const findTask = (id) => getState().tasks.items.find((task) => task.id === id);

const loadTasks = () => loadSlice('tasks', () => getMyTodos(getState().auth.user.id),
  ({ todos }) => ({ items: todos }), { reset: { actionError: '' } });

const replaceTask = (next) => updateTasks({
  items: getState().tasks.items.map((task) => (task.id === next.id ? next : task)),
  actionError: '',
});
const removeTask = (id) => updateTasks({ items: getState().tasks.items.filter((task) => task.id !== id), actionError: '' });

function setBusy(id, isBusy) {
  const { busy } = getState().tasks;
  updateTasks({ busy: isBusy ? [...busy, id] : busy.filter((busyId) => busyId !== id) });
}

// ---------- actions ----------
async function addTask(event) {
  if (event.target.id !== 'task-form') return;
  event.preventDefault();
  const text = String(new FormData(event.target).get('todo') ?? '');
  const problem = validateText(text, { min: 3, max: 120 });
  if (problem) {
    updateTasks({ draft: text, formError: 'Write 3-120 characters.' });
    return;
  }
  updateTasks({ draft: text, formError: '', adding: true });
  try {
    const created = await addTodo(text.trim(), getState().auth.user.id);
    const { items } = getState().tasks;
    // The server hands back the same new id every time, so each local task gets its own id.
    updateTasks({ items: [{ ...created, id: nextId(items), local: true }, ...items], draft: '', adding: false });
  } catch (error) {
    console.error('Could not add task:', error);
    updateTasks({ adding: false, formError: error.message });
  }
}

// Local tasks never reached the server, so they change in state only (no 404 for the user).
async function toggleTask(id) {
  const task = findTask(id);
  if (!task || getState().tasks.busy.includes(id)) return;
  if (task.local) {
    replaceTask({ ...task, completed: !task.completed });
    return;
  }
  setBusy(id, true);
  try {
    const updated = await updateTodo(id, !task.completed);
    replaceTask({ ...task, completed: updated.completed });
  } catch (error) {
    console.error('Could not update task:', error);
    updateTasks({ actionError: error.message });
  }
  setBusy(id, false);
}

async function deleteTask(id) {
  const task = findTask(id);
  if (!task || getState().tasks.busy.includes(id)) return;
  if (task.local) {
    removeTask(id);
    return;
  }
  setBusy(id, true);
  try {
    const result = await deleteTodo(id);
    if (result.isDeleted === true) removeTask(id);
    else updateTasks({ actionError: 'The server did not confirm the delete.' });
  } catch (error) {
    console.error('Could not delete task:', error);
    updateTasks({ actionError: error.message });
  }
  setBusy(id, false);
}

// ---------- markup ----------
const renderTask = (task, isBusy) => `
  <li class="card task ${task.completed ? 'is-done' : ''}">
    <span class="task-text">${escapeHTML(task.todo)}</span>
    <button type="button" class="btn-ghost" data-action="toggle" data-id="${escapeHTML(task.id)}" ${isBusy ? 'disabled' : ''}>
      ${task.completed ? 'Mark active' : 'Mark done'}</button>
    <button type="button" class="btn-ghost" data-action="delete" data-id="${escapeHTML(task.id)}" ${isBusy ? 'disabled' : ''}>Delete</button>
  </li>`;

const renderFilters = (current) => `
  <div class="chips" role="group" aria-label="Filter tasks">
    ${FILTERS.map(([value, label]) => `
      <button type="button" class="chip ${value === current ? 'is-active' : ''}" data-action="filter"
        data-filter="${value}" aria-pressed="${value === current}">${label}</button>`).join('')}
  </div>`;

export function render({ tasks }) {
  // Derived in render: the filtered list and the counter are never stored.
  const visible = tasks.items.filter((task) => tasks.filter === 'all' || (tasks.filter === 'active' ? !task.completed : task.completed));
  const remaining = tasks.items.reduce((count, task) => count + (task.completed ? 0 : 1), 0);
  const emptyMessage = tasks.items.length === 0 ? 'No tasks yet. Add your first one above.' : `No ${tasks.filter} tasks.`;
  return `
    <section>
      ${pageHeader('Tasks', 'Keep track of what you need to do.')}
      <form id="task-form" class="task-form" novalidate>
        <div class="field"><label for="new-task">New task</label>
          <input id="new-task" name="todo" type="text" value="${escapeHTML(tasks.draft)}" autocomplete="off"
            class="${tasks.formError ? 'is-invalid' : ''}" aria-describedby="task-error">
          <p class="field-error" id="task-error" role="alert">${escapeHTML(tasks.formError)}</p></div>
        <button type="submit" ${tasks.adding ? 'disabled' : ''}>${tasks.adding ? 'Adding…' : 'Add task'}</button>
      </form>
      ${tasks.actionError ? `<p class="field-error" role="alert">${escapeHTML(tasks.actionError)}</p>` : ''}
      ${renderFilters(tasks.filter)}
      <p class="card-meta" aria-live="polite">${remaining} ${remaining === 1 ? 'item' : 'items'} left</p>
      ${renderByStatus(tasks, { isEmpty: visible.length === 0, emptyMessage },
        () => `<ul class="stack">${visible.map((task) => renderTask(task, tasks.busy.includes(task.id))).join('')}</ul>`)}
    </section>`;
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const id = Number(target.dataset.id);
  const actions = {
    filter: () => updateTasks({ filter: target.dataset.filter }),
    toggle: () => toggleTask(id),
    delete: () => deleteTask(id),
    retry: loadTasks,
  };
  actions[target.dataset.action]?.();
}

export function mount(outlet) {
  if (getState().tasks.status === 'idle' || getState().tasks.status === 'error') loadTasks();
  outlet.addEventListener('click', handleClick);
  outlet.addEventListener('submit', addTask);
  return () => {
    outlet.removeEventListener('click', handleClick);
    outlet.removeEventListener('submit', addTask);
  };
}
