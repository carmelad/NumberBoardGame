// Identity gate, editable guest profile, session analytics. Account login is intentionally not simulated.
const gate = document.getElementById('identity-gate');
const explore = document.getElementById('explore-button');
function updateIdentity() {
  const profile = guestProfile(); gate.hidden = !!profile; explore.hidden = !profile;
  document.getElementById('player-greeting').textContent = profile ? `Playing as ${profile.username} (guest)` : '';
  document.getElementById('welcome-resume-button').hidden = !profile || !readSavedGame() || readSavedGame().playerId !== profile.id;
  updateResumeButtons();
}
document.getElementById('guest-entry').addEventListener('click', () => {
  const name = prompt('Choose your guest username (2–30 characters):');
  if (name === null) return;
  try { createGuest(name); updateIdentity(); document.getElementById('identity-message').textContent = 'Guest profile created. Your progress is stored in this browser.'; }
  catch (e) { document.getElementById('identity-message').textContent = e.message; }
});
for (const id of ['signup-entry','login-entry']) document.getElementById(id).addEventListener('click', () => {
  document.getElementById('identity-message').textContent = 'Secure accounts and cross-device sync are planned, not yet available. Please play as a guest.';
});
function safeText(node, value) { node.textContent = String(value); }
function renderDashboard() {
  const profile = guestProfile(); if (!profile) return;
  document.getElementById('profile-name').value = profile.username;
  const sessions = allSessions().sort((a,b) => b.startedAt.localeCompare(a.startedAt));
  const bests = document.getElementById('personal-bests'); bests.replaceChildren();
  for (const [key,label] of [['solo','Solo'],['ai','Versus AI'],['target','Target Challenge']]) {
    const games = sessions.filter(s => s.mode === key);
    const card = document.createElement('div'); card.className = 'dashboard-card';
    const title = document.createElement('strong'); safeText(title,label);
    const info = document.createElement('p'); safeText(info,`Best score: ${games.length ? Math.max(...games.map(g=>g.score)) : '—'}\nBest level: ${games.length ? Math.max(...games.map(g=>g.highestLevel)) : '—'}\nSessions: ${games.length}`);
    info.style.whiteSpace='pre-line'; card.append(title,info); bests.append(card);
  }
  const modeFilter = document.getElementById('history-mode').value;
  const filtered = sessions.filter(s => s.mode === modeFilter).reverse();
  const chart = document.getElementById('progress-chart'); chart.replaceChildren();
  if (!filtered.length) { chart.textContent='Play a session in this mode to see your progression.'; }
  else {
    const width = Math.max(450, filtered.length * 58 + 55), height = 210, max = Math.max(1,...filtered.map(s=>s.highestLevel));
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`); svg.style.width='100%'; svg.style.minWidth=`${Math.min(width,450)}px`;
    const line = document.createElementNS(svg.namespaceURI,'polyline');
    line.setAttribute('points',filtered.map((s,i)=>`${45+i*58},${165-(s.highestLevel/max)*125}`).join(' '));
    line.setAttribute('fill','none');line.setAttribute('stroke','#426a3c');line.setAttribute('stroke-width','3');svg.append(line);
    filtered.forEach((s,i)=>{
      const x=45+i*58,y=165-(s.highestLevel/max)*125;
      const dot=document.createElementNS(svg.namespaceURI,'circle');dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('r',5);dot.setAttribute('fill','#426a3c');svg.append(dot);
      for (const [label,yy] of [[`L${s.highestLevel}`,y-12],[`${i+1}`,190]]) {
        const t=document.createElementNS(svg.namespaceURI,'text');t.setAttribute('x',x);t.setAttribute('y',yy);t.setAttribute('font-size','12');t.setAttribute('text-anchor','middle');t.textContent=label;svg.append(t);
      }
    }); chart.append(svg);
  }
  const history=document.getElementById('session-history');history.replaceChildren();
  if (!sessions.length) { history.textContent='No sessions yet. Start a game to build your history.'; return; }
  const table=document.createElement('table');const header=document.createElement('tr');
  ['Mode','Score','Level','Outcome','Started'].forEach(t=>{const th=document.createElement('th');th.textContent=t;header.append(th);});table.append(header);
  sessions.slice(0,20).forEach(s=>{const row=document.createElement('tr');[s.mode==='ai'?'Versus AI':s.mode==='target'?'Target':'Solo',s.score,s.highestLevel,s.status,new Date(s.startedAt).toLocaleDateString()].forEach(v=>{const td=document.createElement('td');td.textContent=String(v);row.append(td);});table.append(row);});history.append(table);
}
document.getElementById('dashboard-button').addEventListener('click',()=>{
  document.getElementById('menu-screen').hidden=true;document.getElementById('dashboard-screen').hidden=false;renderDashboard();
});
document.getElementById('dashboard-back').addEventListener('click',()=>{
  document.getElementById('dashboard-screen').hidden=true;document.getElementById('menu-screen').hidden=false;updateIdentity();
});
document.getElementById('save-profile-name').addEventListener('click',()=>{
  try { changeGuestName(document.getElementById('profile-name').value);document.getElementById('profile-message').textContent='Username updated.';updateIdentity();renderDashboard(); }
  catch(e) { document.getElementById('profile-message').textContent=e.message; }
});
document.getElementById('history-mode').addEventListener('change',renderDashboard);
// Avoid creating a new game or opening the menu before a guest identity exists.
for (const id of ['solo-button','ai-button','target-button','explore-button']) {
  document.getElementById(id).addEventListener('click',()=>{if (!guestProfile()) {document.getElementById('welcome-screen').hidden=false;document.getElementById('menu-screen').hidden=true;}},true);
}
updateIdentity();
