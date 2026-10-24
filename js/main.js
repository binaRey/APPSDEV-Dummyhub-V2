// Bootstrap: wire the shell, restore a saved session (verified with /auth/me), then start the router.
import { initShell } from './shell.js';
import { restoreSession } from './session.js';
import { startRouter } from './router.js';

initShell();
await restoreSession();
startRouter(document.getElementById('app'));
