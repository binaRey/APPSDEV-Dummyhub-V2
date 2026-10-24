import { getState, setState } from '../state.js';
import { getPosts, getPostTags } from '../api.js';
import { loadSlice } from '../loaders.js';
import { debounce, escapeHTML, tagLabel, tagSlug, toggleReaction } from '../utils.js';
import { pageHeader, renderByStatus } from '../components.js';

const PAGE_SIZE = 10;
const TAG_CHIPS = 20;

const updateCommunity = (patch) => setState({ community: { ...getState().community, ...patch } });

function loadFirstPage() {
  const { q, tag } = getState().community;
  return loadSlice('community', () => getPosts({ limit: PAGE_SIZE, skip: 0, q, tag }),
    ({ posts, total }) => ({ items: posts, total, loadingMore: false, moreError: '' }));
}

// "Load more": the next page is appended with spread, never pushed.
async function loadMore() {
  const { items, q, tag } = getState().community;
  updateCommunity({ loadingMore: true, moreError: '' });
  try {
    const { posts, total } = await getPosts({ limit: PAGE_SIZE, skip: items.length, q, tag });
    updateCommunity({ items: [...getState().community.items, ...posts], total, loadingMore: false });
  } catch (error) {
    console.error('Could not load more posts:', error);
    updateCommunity({ loadingMore: false, moreError: error.message });
  }
}

async function loadTags() {
  try {
    updateCommunity({ tags: await getPostTags() });
  } catch (error) {
    console.error('Could not load post tags:', error);
  }
}

// Likes and dislikes live in local state only (the server would not keep them).
function react(id, type) {
  const { items, reacted } = getState().community;
  const post = items.find((item) => item.id === id);
  if (!post) return;
  const result = toggleReaction(post.reactions, reacted[id], type);
  updateCommunity({
    items: items.map((item) => (item.id === id ? { ...item, reactions: result.reactions } : item)),
    reacted: { ...reacted, [id]: result.mine },
  });
}

const renderChip = (tag, active) => `
  <button type="button" class="chip ${tagSlug(tag) === active ? 'is-active' : ''}" data-action="tag"
    data-tag="${escapeHTML(tagSlug(tag))}" aria-pressed="${tagSlug(tag) === active}">${escapeHTML(tagLabel(tag))}</button>`;

function renderPost(post, mine) {
  const reactionButton = (type, label) => `
    <button type="button" class="btn-ghost" data-action="${type}" data-id="${escapeHTML(post.id)}"
      aria-pressed="${mine === type}">${label} ${escapeHTML(post.reactions[type])}</button>`;
  return `
    <article class="card post-card"><div class="card-body">
      <h2 class="card-title"><a href="#/community/${escapeHTML(post.id)}">${escapeHTML(post.title)}</a></h2>
      <p>${escapeHTML(post.body)}</p>
      <p class="card-meta">${post.tags.map((tag) => `#${escapeHTML(tag)}`).join(' ')}</p>
      <p class="card-meta">By <a href="#/people/${escapeHTML(post.userId)}">user ${escapeHTML(post.userId)}</a>, ${escapeHTML(post.views)} views</p>
      <div class="reactions">${reactionButton('likes', 'Like')}${reactionButton('dislikes', 'Dislike')}</div>
    </div></article>`;
}

function renderFeed({ items, total, reacted, loadingMore, moreError }) {
  return `
    <div class="stack">${items.map((post) => renderPost(post, reacted[post.id])).join('')}</div>
    ${moreError ? `<p class="field-error" role="alert">${escapeHTML(moreError)}</p>` : ''}
    ${items.length < total
    ? `<p class="center"><button type="button" data-action="more" ${loadingMore ? 'disabled' : ''}>${loadingMore ? 'Loading…' : 'Load more'}</button></p>`
    : ''}`;
}

export function render({ community }) {
  return `
    <section>
      ${pageHeader('Community', 'Read what people are talking about.')}
      <form id="community-form" class="toolbar" role="search" aria-label="Search posts">
        <div class="field"><label for="post-search">Search</label>
          <input id="post-search" type="search" value="${escapeHTML(community.q)}" autocomplete="off"></div>
      </form>
      <div class="chips" role="group" aria-label="Filter by tag">
        ${community.tags.slice(0, TAG_CHIPS).map((tag) => renderChip(tag, community.tag)).join('')}
      </div>
      ${renderByStatus(community, { isEmpty: community.items.length === 0, emptyMessage: 'No posts match your search.' },
        () => renderFeed(community))}
    </section>`;
}

function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const { community } = getState();
  const id = Number(target.dataset.id);
  const actions = {
    tag: () => {
      const tag = community.tag === target.dataset.tag ? '' : target.dataset.tag;
      updateCommunity({ tag, q: '' });
      loadFirstPage();
    },
    more: loadMore,
    likes: () => react(id, 'likes'),
    dislikes: () => react(id, 'dislikes'),
    retry: loadFirstPage,
  };
  actions[target.dataset.action]?.();
}

export function mount(outlet) {
  const { status, tags } = getState().community;
  if (status === 'idle') loadFirstPage();
  if (tags.length === 0) loadTags();

  const search = debounce(() => loadFirstPage(), 300);
  const onInput = (event) => {
    if (event.target.id !== 'post-search') return;
    updateCommunity({ q: event.target.value, tag: '' });
    search();
  };
  const onSubmit = (event) => event.preventDefault();

  outlet.addEventListener('click', handleClick);
  outlet.addEventListener('input', onInput);
  outlet.addEventListener('submit', onSubmit);
  return () => {
    outlet.removeEventListener('click', handleClick);
    outlet.removeEventListener('input', onInput);
    outlet.removeEventListener('submit', onSubmit);
  };
}
