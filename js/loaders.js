// One loading routine for every async slice: loading -> success | error, ignoring stale responses.
import { getState, setState } from './state.js';

const patchSlice = (key, patch) => setState({ [key]: { ...getState()[key], ...patch } });

// fetcher: () => Promise<data>; onSuccess(data) returns the slice patch.
// reset: patch applied while loading; onError(error) may add fields such as { notFound: true }.
export async function loadSlice(key, fetcher, onSuccess, { reset = {}, onError } = {}) {
  const requestId = getState()[key].requestId + 1;
  patchSlice(key, { ...reset, status: 'loading', error: null, requestId });
  try {
    const data = await fetcher();
    if (getState()[key].requestId === requestId) patchSlice(key, { status: 'success', ...onSuccess(data) });
  } catch (error) {
    console.error(`Could not load ${key}:`, error);
    if (getState()[key].requestId !== requestId) return;
    patchSlice(key, { status: 'error', error: error.message, ...(onError ? onError(error) : {}) });
  }
}
