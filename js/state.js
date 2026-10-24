// The single source of truth. Views read via getState() and change it only via setState().
export const initialState = {
  auth: { user: null, accessToken: null, refreshToken: null },
  route: { name: 'dashboard', params: {}, intended: null }, // intended = guarded route a guest asked for
  login: { status: 'idle', username: '', errors: {}, serverError: '' },
  cart: [], // [{ id, title, price, discountPercentage, thumbnail, stock, minimumOrderQuantity, quantity }]
  checkout: { status: 'idle', receipt: null, error: null },
  pastCarts: { status: 'idle', items: [], error: null },
  dashboard: { status: 'idle', quote: null, quoteLoading: false, quoteError: '', carts: [], todos: [], posts: [], requestId: 0, error: null },
  shop: {
    status: 'idle', items: [], total: 0, page: 1, q: '', category: '', categories: [],
    sortBy: '', order: 'asc', inStockOnly: false, requestId: 0, error: null,
  },
  detail: { status: 'idle', item: null, error: null, notFound: false, imageIndex: 0, notice: null },
  recipes: {
    status: 'idle', items: [], tags: [], q: '', tag: '', mealType: '', sortBy: '', order: 'asc',
    difficulty: '', maxMinutes: '', requestId: 0, error: null,
  },
  recipeDetail: { status: 'idle', item: null, servings: 1, notFound: false, requestId: 0, error: null },
  community: {
    status: 'idle', items: [], total: 0, tags: [], q: '', tag: '', reacted: {},
    loadingMore: false, moreError: '', requestId: 0, error: null,
  },
  postDetail: {
    status: 'idle', post: null, comments: [], author: null, draft: '', commentError: '',
    posting: false, notFound: false, requestId: 0, error: null,
  },
  people: { status: 'idle', items: [], total: 0, q: '', role: '', sortBy: '', order: 'asc', requestId: 0, error: null },
  profile: { status: 'idle', user: null, posts: [], todos: [], carts: [], notFound: false, requestId: 0, error: null },
  tasks: {
    status: 'idle', items: [], filter: 'all', draft: '', formError: '', adding: false,
    busy: [], actionError: '', requestId: 0, error: null,
  },
};

let current = initialState;
const listeners = new Set();

export const getState = () => current;

// Merges the patch immutably (new top-level object), then notifies subscribers (the router re-renders).
export function setState(patch) {
  current = { ...current, ...patch };
  listeners.forEach((listener) => listener(current));
}

// Lets router.js re-render on every change without state.js importing the DOM or views.
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
