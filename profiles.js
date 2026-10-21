// Browser-only guest identity and session history. Never stores credentials.
const PROFILE_KEY = 'numberBoardGame.guestProfile.v1';
const HISTORY_KEY = 'numberBoardGame.history.v1';
let activeSessionId = null;
function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function guestProfile() { const p = readJSON(PROFILE_KEY, null); return p && typeof p.id === 'string' && typeof p.username === 'string' ? p : null; }
function currentGuestId() { return guestProfile()?.id ?? null; }
function trackedSessionId() { return activeSessionId; }
function makeId() { return crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
function createGuest(username) {
  const name = username.trim();
  if (name.length < 2 || name.length > 30) throw Error('Choose a username between 2 and 30 characters.');
  const profile = { id: makeId(), username: name, type: 'guest', createdAt: new Date().toISOString() };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); return profile;
}
function changeGuestName(username) {
  const profile = guestProfile(); if (!profile) throw Error('Guest profile missing.');
  const name = username.trim(); if (name.length < 2 || name.length > 30) throw Error('Use 2–30 characters.');
  profile.username = name; localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
function allSessions() { const value = readJSON(HISTORY_KEY, []); return Array.isArray(value) ? value.filter(x => x && x.playerId === currentGuestId() && ['solo','ai','target'].includes(x.mode)) : []; }
function writeSessions(items) { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(-500))); }
function beginTrackedSession() {
  const id = currentGuestId(); if (!id || !mode) return;
  activeSessionId = makeId();
  const records = allSessions();
  records.push({ id: activeSessionId, playerId: id, mode, startedAt: new Date().toISOString(), endedAt: null, status: 'in_progress', score: 0, aiScore: 0, highestLevel: 1, elapsedMs: 0 });
  writeSessions(records);
}
function syncTrackedSession() {
  if (!activeSessionId || !currentGuestId() || mode === null) return;
  const records = allSessions(); const rec = records.find(s => s.id === activeSessionId);
  if (!rec || rec.status !== 'in_progress') return;
  rec.score = score; rec.aiScore = aiScore; rec.highestLevel = Math.max(rec.highestLevel, level);
  rec.elapsedMs = Math.max(0, (stoppedAt ?? performance.now()) - runStartedAt);
  writeSessions(records);
}
function finishTrackedSession(status) {
  if (!activeSessionId) return;
  syncTrackedSession();
  const records = allSessions(); const rec = records.find(s => s.id === activeSessionId);
  if (rec && rec.status === 'in_progress') { rec.status = status; rec.endedAt = new Date().toISOString(); writeSessions(records); }
  activeSessionId = null;
}
function resumeTrackedSession(id) {
  const rec = allSessions().find(s => s.id === id && s.status === 'in_progress');
  if (rec) { activeSessionId = rec.id; syncTrackedSession(); }
  else { activeSessionId = null; if (!gameOver) beginTrackedSession(); }
}
