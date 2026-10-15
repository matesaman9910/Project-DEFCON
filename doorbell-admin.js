/* DEFCON Doorbell v1 — authorized Control Room notifications and settings. */
import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js';
import { getDatabase, ref, onValue, get, set } from 'https://www.gstatic.com/firebasejs/10.10.0/firebase-database.js';

const card = document.getElementById('defconDoorbellAdmin');
const visibility = document.getElementById('defconDoorbellVisibility');
const soundButton = document.getElementById('defconDoorbellSound');
const testButton = document.getElementById('defconDoorbellTest');
const notifyButton = document.getElementById('defconDoorbellNotifications');
const stateLabel = document.getElementById('defconDoorbellState');
const lastRingLabel = document.getElementById('defconDoorbellLastRing');
const feedback = document.getElementById('defconDoorbellAdminFeedback');
const originalTitle = document.title;
const ringtone = new Audio('https://file.garden/aACuwggY3QmuIi9B/Ring%20Doorbell%20Sound.mp3');
ringtone.preload = 'auto';
ringtone.volume = 0.85;

let database;
let auth;
let authorized = false;
let transportUp = false;
let enabled = false;
let enabledLoaded = false;
let soundArmed = false; // Always require a user interaction each time the page loads.
let unsubscribers = [];
let firstRingRead = true;
let lastRingSeen = 0;
let flashTimer;

function isAllowed(user) {
  if (!user) return false;
  const list = Array.isArray(window.DEFCON_ADMIN_UIDS) ? window.DEFCON_ADMIN_UIDS
    : [window.DEFCON_ADMIN_UID];
  return list.includes(user.uid);
}
function say(message) { feedback.textContent = message; }
function render() {
  card.hidden = !authorized;
  visibility.disabled = !authorized || !transportUp || !enabledLoaded;
  visibility.textContent = !enabledLoaded ? 'LOADING VISIBILITY…'
    : enabled ? 'HIDE PUBLIC DOORBELL' : 'SHOW PUBLIC DOORBELL';
  stateLabel.textContent = !transportUp ? 'DATABASE OFFLINE'
    : !enabledLoaded ? 'VERIFYING SETTINGS…'
    : enabled ? 'PUBLIC BUTTON VISIBLE' : 'PUBLIC BUTTON HIDDEN';
  soundButton.textContent = soundArmed ? 'MUTE SOUND ON THIS DEVICE' : 'ENABLE SOUND + TEST';
  notifyButton.textContent = typeof Notification === 'undefined' ? 'DESKTOP ALERTS UNSUPPORTED'
    : Notification.permission === 'granted' ? 'DESKTOP ALERTS ALLOWED'
    : 'ENABLE DESKTOP ALERTS';
  notifyButton.disabled = !authorized || typeof Notification === 'undefined' || Notification.permission !== 'default';
}
async function playSound() {
  ringtone.pause();
  ringtone.currentTime = 0;
  await ringtone.play();
}
function showRing(time) {
  lastRingLabel.textContent = `LAST DOORBELL: ${new Date(time).toLocaleString()}`;
  card.classList.add('is-ringing');
  document.title = '🔔 DOORBELL — ' + originalTitle;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    card.classList.remove('is-ringing');
    document.title = originalTitle;
  }, 9000);
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification('DEFCON — CONTROL ROOM DOORBELL', {
      body: 'Someone is requesting door access.', tag: 'defcon-doorbell'
    }); } catch (error) { console.warn('[DEFCON Doorbell] Desktop notification:', error); }
  }
  if (soundArmed) {
    playSound().then(() => say('🔔 DOORBELL RECEIVED — sound playing.'))
      .catch(error => say('🔔 DOORBELL RECEIVED — browser blocked sound. Click ENABLE SOUND + TEST.'));
  } else {
    say('🔔 DOORBELL RECEIVED — ringer muted on this device.');
  }
}
function disconnectListeners() {
  for (const stop of unsubscribers) stop();
  unsubscribers = [];
  firstRingRead = true;
  lastRingSeen = 0;
  enabledLoaded = false;
  transportUp = false;
  ringtone.pause();
  clearTimeout(flashTimer);
  document.title = originalTitle;
}
function subscriptionError(error) {
  console.error('[DEFCON Doorbell] Admin Firebase listener:', error);
  say('DOORBELL DATABASE ERROR — ' + (error.code || error.message || 'check console'));
}
function startListeners() {
  unsubscribers.push(onValue(ref(database, '.info/connected'), snap => {
    const wasUp = transportUp;
    transportUp = snap.val() === true;
    if (!transportUp) enabledLoaded = false;
    else if (!wasUp) {
      enabledLoaded = false;
      get(ref(database, 'doorbell/enabled')).then(current => {
        if (!authorized || !transportUp) return;
        enabled = current.val() === true;
        enabledLoaded = true;
        render();
      }).catch(subscriptionError);
    }
    render();
  }, subscriptionError));
  unsubscribers.push(onValue(ref(database, 'doorbell/enabled'), snap => {
    enabledLoaded = true;
    enabled = snap.val() === true;
    render();
  }, subscriptionError));
  unsubscribers.push(onValue(ref(database, 'doorbell/ringAt'), snap => {
    const at = Number(snap.val()) || 0;
    if (firstRingRead) {
      firstRingRead = false; // Never play old rings when opening the admin panel.
      lastRingSeen = at;
      if (at) lastRingLabel.textContent = 'LAST DOORBELL: ' + new Date(at).toLocaleString();
      return;
    }
    if (at <= lastRingSeen) return;
    lastRingSeen = at;
    // Ignore delayed/stale ring events. No catch-up noise after a long disconnect.
    if (at < Date.now() - 60_000 || at > Date.now() + 60_000) return;
    showRing(at);
  }, subscriptionError));
}

visibility.addEventListener('click', async () => {
  if (!authorized || !transportUp || !enabledLoaded) return;
  visibility.disabled = true;
  say('UPDATING PUBLIC VISIBILITY…');
  const nextEnabled = !enabled;
  try {
    await set(ref(database, 'doorbell/enabled'), nextEnabled);
    say(nextEnabled ? 'PUBLIC DOORBELL ENABLED.' : 'PUBLIC DOORBELL DISABLED.');
  } catch (error) {
    say('COULD NOT CHANGE VISIBILITY: ' + (error.code || error.message));
  } finally { render(); }
});

soundButton.addEventListener('click', async () => {
  if (!authorized) return;
  if (soundArmed) {
    soundArmed = false;
    ringtone.pause();
    say('SOUND MUTED ON THIS DEVICE. Public button visibility unchanged.');
  } else {
    try {
      await playSound(); // Gesture-unlock audio and confirm the actual MP3 loads.
      soundArmed = true;
      say('SOUND ENABLED ON THIS DEVICE. Keep this admin page open to hear rings.');
    } catch (error) {
      soundArmed = false;
      say('AUDIO FAILED: ' + error.message);
    }
  }
  render();
});

testButton.addEventListener('click', async () => {
  if (!authorized) return;
  try { await playSound(); say('LOCAL SOUND TEST ONLY — no Firebase ring was sent.'); }
  catch (error) { say('AUDIO TEST FAILED: ' + error.message); }
});
notifyButton.addEventListener('click', async () => {
  if (!authorized || typeof Notification === 'undefined' || Notification.permission !== 'default') return;
  const permission = await Notification.requestPermission();
  say(permission === 'granted' ? 'DESKTOP NOTIFICATIONS ENABLED WHILE PAGE IS OPEN.' : 'DESKTOP NOTIFICATIONS NOT ALLOWED.');
  render();
});

try {
  if (!window.DEFCON_FIREBASE_CONFIG) throw new Error('Firebase configuration missing');
  const app = getApps().length ? getApp() : initializeApp(window.DEFCON_FIREBASE_CONFIG);
  database = getDatabase(app);
  auth = getAuth(app);
  onAuthStateChanged(auth, user => {
    disconnectListeners();
    authorized = isAllowed(user);
    if (authorized) startListeners();
    render();
  }, subscriptionError);
} catch (error) {
  console.error('[DEFCON Doorbell] Failed to initialize:', error);
  say('DOORBELL MODULE ERROR — ' + error.message);
}
render();
