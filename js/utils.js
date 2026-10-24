// Pure helpers: no DOM, no state, no side effects.

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Every piece of API or user text must pass through this before reaching innerHTML.
export const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

export const formatPrice = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

// Closure: `timerId` is remembered between calls of the returned function.
export function debounce(fn, delay = 300) {
  let timerId;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), delay);
  };
}

// Rest parameters: sums any number of values (cart totals, dashboard counts).
export const sum = (...numbers) => numbers.reduce((total, n) => total + n, 0);

// Regex validators return an error message, or '' when the value is valid.
export const validateUsername = (value) =>
  /^[a-zA-Z0-9_]{3,20}$/.test(value) ? '' : 'Use 3-20 letters, numbers or underscores.';

export const validatePassword = (value) =>
  value.length >= 6 ? '' : 'Password must be at least 6 characters.';

export const validateText = (value, { min = 1, max = 280 } = {}) => {
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max ? '' : `Enter ${min}-${max} characters.`;
};

// Tag lists come back as strings or {slug, name} objects depending on the endpoint.
export const tagSlug = (tag) => (typeof tag === 'string' ? tag : tag.slug);
export const tagLabel = (tag) => (typeof tag === 'string' ? tag : tag.name);

// Next unused id in a list (used for tasks created locally).
export const nextId = (items) => items.reduce((max, item) => Math.max(max, item.id), 0) + 1;

// Returns new reaction counts and the person's current choice ('likes' | 'dislikes' | undefined).
export function toggleReaction(reactions, mine, type) {
  const other = type === 'likes' ? 'dislikes' : 'likes';
  if (mine === type) return { reactions: { ...reactions, [type]: reactions[type] - 1 }, mine: undefined };
  return {
    reactions: {
      ...reactions,
      [type]: reactions[type] + 1,
      [other]: mine === other ? reactions[other] - 1 : reactions[other],
    },
    mine: type,
  };
}
