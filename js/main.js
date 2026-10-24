// Bootstrap: register session hooks, restore session and cart, then start the router.
import { setSessionHooks } from './api.js';
import { initShell } from './shell.js';
import { initCartPersistence, logout, restoreCart, restoreSession, saveSession } from './session.js';
import { startRouter } from './router.js';

setSessionHooks({ onRefresh: saveSession, onExpired: logout });
initShell();
await restoreSession(); // verifies saved tokens with GET /auth/me
restoreCart();
initCartPersistence();
startRouter(document.getElementById('app'));
