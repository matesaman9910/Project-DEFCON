/* DEFCON Doorbell v1 — public visitor button, Firebase SDK 8 compat. */
(() => {
  'use strict';
  const panel = document.getElementById('defconDoorbellPublic');
  const button = document.getElementById('defconDoorbellRing');
  const message = document.getElementById('defconDoorbellFeedback');
  if (!panel || !button || !message) return;

  const COOLDOWN_MS = 30_000; // MUST match Firebase Security Rules.
  let transportUp = false;
  let enabled = false;
  let enabledLoaded = false;
  let lastRingAt = 0;
  let serverClockOffset = 0;
  let busy = false;
  let database;
  const serverNow = () => Date.now() + serverClockOffset;

  function paint() {
    // Fail closed: without a confirmed connection and enabled setting, no button.
    panel.hidden = !transportUp || !enabledLoaded || !enabled;
    if (panel.hidden) return;
    const remaining = Math.max(0, Math.ceil((lastRingAt + COOLDOWN_MS - serverNow()) / 1000));
    button.disabled = busy || remaining > 0;
    button.textContent = busy ? 'SENDING REQUEST…'
      : remaining > 0 ? `PLEASE WAIT ${remaining}s`
      : '🔔 RING CONTROL ROOM DOORBELL';
  }

  try {
    if (!window.firebase || !window.DEFCON_FIREBASE_CONFIG) throw new Error('Firebase not configured');
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(window.DEFCON_FIREBASE_CONFIG);
    database = app.database();
    database.ref('.info/connected').on('value', snap => {
      const wasUp = transportUp;
      transportUp = snap.val() === true;
      if (!transportUp) {
        enabledLoaded = false;
        enabled = false;
      } else if (!wasUp) {
        enabledLoaded = false;
        // Re-verify switches after reconnect. Cached state must not make the
        // public doorbell appear enabled after an admin disabled it offline.
        database.ref('doorbell/enabled').once('value').then(current => {
          if (!transportUp) return;
          enabled = current.val() === true;
          enabledLoaded = true;
          paint();
        }).catch(fail);
        database.ref('doorbell/ringAt').once('value').then(current => {
          lastRingAt = Number(current.val()) || 0;
          paint();
        }).catch(fail);
      }
      paint();
    }, fail);
    database.ref('.info/serverTimeOffset').on('value', snap => {
      serverClockOffset = Number(snap.val()) || 0;
      paint();
    });
    database.ref('doorbell/enabled').on('value', snap => {
      enabledLoaded = true;
      enabled = snap.val() === true;
      paint();
    }, fail);
    database.ref('doorbell/ringAt').on('value', snap => {
      lastRingAt = Number(snap.val()) || 0;
      paint();
    }, fail);
  } catch (error) { fail(error); }

  function fail(error) {
    console.error('[DEFCON Doorbell] Public subscription failed:', error);
    enabled = false;
    enabledLoaded = false;
    transportUp = false;
    paint();
  }

  button.addEventListener('click', async () => {
    if (!database || !transportUp || !enabled || busy) return;
    if (lastRingAt + COOLDOWN_MS > serverNow()) return;
    busy = true;
    message.textContent = 'CONTACTING CONTROL ROOM…';
    paint();
    try {
      // Server resolves TIMESTAMP. The security rules check exact server time
      // and enforce a 30-second GLOBAL cooldown, including across browsers.
      await database.ref('doorbell/ringAt').set(firebase.database.ServerValue.TIMESTAMP);
      message.textContent = 'REQUEST SENT. Wait for the operator to respond.';
    } catch (error) {
      console.error('[DEFCON Doorbell] Ring rejected:', error);
      message.textContent = error.code === 'PERMISSION_DENIED'
        ? 'Doorbell unavailable or someone just rang. Try again later.'
        : 'Could not send request. Check your connection.';
    } finally {
      busy = false;
      paint();
    }
  });
  setInterval(paint, 1000);
})();
