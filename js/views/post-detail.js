import { getState, setState } from '../state.js';
import { getPost, getPostComments, getUser, addComment } from '../api.js';
import { loadSlice } from '../loaders.js';
import { escapeHTML, validateText } from '../utils.js';
import { notFoundBlock, renderByStatus, emptyBlock } from '../components.js';

const updatePost = (patch) => setState({ postDetail: { ...getState().postDetail, ...patch } });

// The author id lives on the post, so the author request starts as soon as the post arrives
// while the comments request is already running in parallel.
async function fetchEverything(id) {
  const postPromise = getPost(id);
  const fetchAuthor = async () => getUser((await postPromise).userId);
  const [post, commentData, author] = await Promise.all([postPromise, getPostComments(id), fetchAuthor()]);
  return { post, comments: commentData.comments, author };
}

const loadPost = (id) => loadSlice('postDetail', () => fetchEverything(id),
  (data) => ({ ...data, notFound: false, draft: '', commentError: '' }),
  { reset: { post: null, notFound: false }, onError: (error) => ({ notFound: error.status === 404 }) });

// ---------- markup ----------
const renderComment = ({ body, user }) => `
  <li class="card comment">
    <p class="card-meta">${escapeHTML(user?.fullName ?? user?.username ?? 'Unknown')}</p>
    <p>${escapeHTML(body)}</p>
  </li>`;

function renderCommentForm({ draft, commentError, posting }, user) {
  if (!user) return '<p>Log in to leave a comment. <a href="#/login">Log in</a></p>';
  return `
    <form id="comment-form" novalidate>
      <div class="field"><label for="comment-body">Add a comment</label>
        <textarea id="comment-body" name="body" rows="3" class="${commentError ? 'is-invalid' : ''}"
          aria-describedby="comment-error">${escapeHTML(draft)}</textarea>
        <p class="field-error" id="comment-error" role="alert">${escapeHTML(commentError)}</p></div>
      <button type="submit" ${posting ? 'disabled' : ''}>${posting ? 'Posting…' : 'Post comment'}</button>
    </form>`;
}

function renderPost(detail, user) {
  const { post, author, comments } = detail;
  return `
    <article class="detail">
      <p><a href="#/community">Back to community</a></p>
      <h1>${escapeHTML(post.title)}</h1>
      <p class="author"><img class="avatar" src="${escapeHTML(author.image)}" alt="${escapeHTML(`${author.firstName} ${author.lastName}`)}">
        <a href="#/people/${escapeHTML(author.id)}">${escapeHTML(`${author.firstName} ${author.lastName}`)}</a></p>
      <p>${escapeHTML(post.body)}</p>
      <p class="card-meta">${post.tags.map((tag) => `#${escapeHTML(tag)}`).join(' ')}</p>
      <p class="card-meta">${escapeHTML(post.reactions.likes)} likes, ${escapeHTML(post.reactions.dislikes)} dislikes, ${escapeHTML(post.views)} views</p>
      <section aria-labelledby="comments-title">
        <h2 id="comments-title">Comments (${comments.length})</h2>
        ${comments.length ? `<ul class="stack">${comments.map(renderComment).join('')}</ul>` : emptyBlock('No comments yet. Start the conversation.')}
        ${renderCommentForm(detail, user)}
      </section>
    </article>`;
}

export function render({ postDetail, auth }, params) {
  if (postDetail.notFound) return notFoundBlock('Post not found', '#/community', 'Back to community');
  const stale = postDetail.post && String(postDetail.post.id) !== params.id;
  const slice = stale ? { ...postDetail, status: 'loading' } : postDetail;
  return `<section>${renderByStatus(slice, { isEmpty: !postDetail.post, emptyMessage: 'Post unavailable.' },
    () => renderPost(postDetail, auth.user))}</section>`;
}

// ---------- events ----------
async function submitComment(event) {
  if (event.target.id !== 'comment-form') return;
  event.preventDefault();
  const body = String(new FormData(event.target).get('body') ?? '');
  const problem = validateText(body, { min: 1, max: 280 });
  if (problem) {
    updatePost({ draft: body, commentError: 'Write 1-280 characters (not only spaces).' });
    return;
  }
  updatePost({ draft: body, commentError: '', posting: true });
  try {
    const { post } = getState().postDetail;
    const comment = await addComment({ body: body.trim(), postId: post.id, userId: getState().auth.user.id });
    updatePost({ comments: [...getState().postDetail.comments, comment], draft: '', posting: false });
  } catch (error) {
    console.error('Could not post comment:', error);
    updatePost({ posting: false, commentError: error.message });
  }
}

export function mount(outlet, params) {
  loadPost(params.id);
  const onClick = (event) => {
    if (event.target.closest('[data-action="retry"]')) loadPost(params.id);
  };
  outlet.addEventListener('click', onClick);
  outlet.addEventListener('submit', submitComment);
  return () => {
    outlet.removeEventListener('click', onClick);
    outlet.removeEventListener('submit', submitComment);
  };
}
