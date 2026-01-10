const canvas = document.getElementById('radar');
const info = document.getElementById('info');
const timeEl = document.getElementById('time');
const recentList = document.getElementById('recent-list');
const lockInfo = document.getElementById('lock-info');
const ctx = canvas.getContext('2d');
let width, height, cx, cy, radius;
let sweepAngle = 0;

function resize(){
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  cx = width/2; cy = height/2; radius = Math.min(width,height)/2 * 0.86;
}
window.addEventListener('resize', resize);
resize();

const blips = {};
let lockedId = null;

function now(){ return Date.now(); }

function updateTime(){
  const d = new Date();
  timeEl.textContent = d.toLocaleTimeString();
}
setInterval(updateTime, 1000);
updateTime();

function addRecent(msg){
  const li = document.createElement('li');
  const t = new Date().toLocaleTimeString();
  li.innerHTML = `<span><strong>${msg.label || msg.id}</strong> <small style="color:#9fb7d6">${msg.id}</small></span><span>${t}</span>`;
  recentList.prepend(li);
  while(recentList.children.length>30) recentList.removeChild(recentList.lastChild);
}

function lockTarget(id){
  lockedId = id;
}

function drawGrid(){
  ctx.fillStyle = '#001006';
  ctx.fillRect(0,0,width,height);
  ctx.save();
  ctx.translate(cx,cy);
  const grad = ctx.createRadialGradient(0,0,10,0,0,radius);
  grad.addColorStop(0,'rgba(0,120,60,0.09)');
  grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0,0,radius,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(80,220,120,0.09)';
  for(let i=1;i<=4;i++){
    ctx.beginPath(); ctx.arc(0,0,radius*i/4,0,Math.PI*2); ctx.stroke();
  }
  // subtle radial grid lines
  ctx.strokeStyle = 'rgba(30,100,60,0.06)';
  ctx.lineWidth = 1;
  for(let a=0;a<360;a+=15){
    const rad = a*Math.PI/180; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(rad)*radius, Math.sin(rad)*radius); ctx.stroke();
  }
  ctx.fillStyle = '#bfffbf'; ctx.font = '12px sans-serif';
  ctx.fillText('N', -6, -radius+20);
  ctx.restore();
}

function drawSweep(){
  sweepAngle += 0.02;
  const w = 0.28;
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(sweepAngle);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(-radius,-radius,radius,radius);
  g.addColorStop(0,'rgba(120,255,140,0.12)'); g.addColorStop(1,'rgba(120,255,140,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,radius,-w/2,w/2); ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.globalCompositeOperation = 'source-over';
}

function drawTrails(){
  Object.values(blips).forEach(b => {
    const pts = b.positions || [];
    if(pts.length<2) return;
    ctx.beginPath();
    for(let i=0;i<pts.length;i++){
      const p = pts[i];
      const x = cx + p.x*radius; const y = cy - p.y*radius;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle = 'rgba(120,255,140,0.22)'; ctx.lineWidth = 2; ctx.stroke();
  });
}

function drawTargets(){
  Object.values(blips).forEach(b => {
    const p = b.positions[b.positions.length-1];
    const sx = cx + p.x*radius; const sy = cy - p.y*radius;
    const alpha = Math.max(0.12, 1 - (now()-p.ts)/8000);
    ctx.save(); ctx.shadowBlur = b.threat?28:12; ctx.shadowColor = b.threat? 'rgba(255,60,60,0.9)' : 'rgba(80,240,140,0.95)';
    ctx.fillStyle = b.threat? `rgba(255,90,90,${alpha})` : `rgba(120,255,140,${alpha})`;
    const size = Math.max(6, (b.r||0.04)*60);
    ctx.beginPath(); ctx.arc(sx,sy,size,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.fillStyle = `rgba(220,255,220,${Math.min(0.95,alpha)})`; ctx.font = '13px sans-serif'; ctx.fillText(b.label||b.id, sx+10, sy-10);
    if(b.heading!=null){
      ctx.save(); ctx.translate(sx,sy); ctx.rotate(b.heading);
      ctx.fillStyle = 'rgba(200,255,200,0.16)'; ctx.beginPath(); ctx.moveTo(0,-size-4); ctx.lineTo(size+2,0); ctx.lineTo(0,size+4); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    if(lockedId===b.id){
      const pulse = 1 + Math.sin(now()/260)/8;
      ctx.strokeStyle = `rgba(255,120,120,0.95)`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(sx,sy,size*1.6*pulse,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle = `rgba(255,200,200,0.28)`; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(sx,sy,size*2.6*pulse,0,Math.PI*2); ctx.stroke();
      showLockBanner(b.label||b.id);
    }
  });
}

function updateLockInfo(){
  if(!lockedId){ lockInfo.textContent = 'No target locked'; return }
  const b = blips[lockedId];
  if(!b) return;
  const p = b.positions[b.positions.length-1];
  const speed = ((b.speed||0)*100).toFixed(1);
  const hdg = b.headingDeg? b.headingDeg.toFixed(0) : '--';
  const rssi = b.rssi? b.rssi.toFixed(0) : '--';
  const alt = b.alt? b.alt.toFixed(1) : '--';
  lockInfo.innerHTML = `<div><strong>${b.label||b.id}</strong> <small style="color:#9fb7d6">${b.id}</small></div>
  <div style="margin-top:6px">RSSI: ${rssi} dBm</div>
  <div>Alt: ${alt} m</div>
  <div>Speed: ${speed} units</div>
  <div>Heading: ${hdg}°</div>`;
}

let _lockTimer = null;
const lockBanner = document.createElement('div'); lockBanner.id = 'lock-banner'; lockBanner.textContent = '';
document.body.appendChild(lockBanner);
function showLockBanner(text){ lockBanner.textContent = text; lockBanner.classList.add('show'); if(_lockTimer) clearTimeout(_lockTimer); _lockTimer = setTimeout(()=> lockBanner.classList.remove('show'), 3800); }

function animate(){
  ctx.clearRect(0,0,width,height);
  drawGrid(); drawTrails(); drawSweep(); drawTargets(); updateLockInfo(); requestAnimationFrame(animate);
}
animate();

function connectWS(){
  const proto = (location.protocol === 'https:') ? 'wss' : 'ws';
  const url = `${proto}://${location.host}/ws`;
  const ws = new WebSocket(url);
  ws.onopen = () => { info.textContent = 'Connected to backend'; };
  ws.onclose = () => { info.textContent = 'Disconnected — retrying in 2s'; setTimeout(connectWS, 2000); };
  ws.onerror = (e) => { console.error(e); };
  ws.onmessage = (ev) => {
    try{
      const msg = JSON.parse(ev.data);
      if(msg.type === 'heartbeat') return;
      const id = msg.id;
      const nowts = now();
      if(!blips[id]) blips[id] = {id:id, positions:[], r: msg.r || 0.04, label: msg.label || id, threat: !!msg.threat, rssi: msg.rssi, alt: msg.alt};
      const b = blips[id];
      const last = b.positions[b.positions.length-1];
      const x = msg.x; const y = msg.y;
      const p = {x:x, y:y, ts: nowts};
      b.positions.push(p);
      if(b.positions.length>20) b.positions.shift();
      if(last){ const dt = (nowts - last.ts)/1000; const dx = x-last.x; const dy = y-last.y; if(dt>0){ b.speed = Math.hypot(dx,dy)/dt; b.heading = Math.atan2(-dy, dx); b.headingDeg = ((Math.atan2(-dy,dx)*180/Math.PI)+360)%360 } }
      b.rssi = msg.rssi || b.rssi; b.alt = msg.alt || b.alt; b.threat = !!msg.threat; b.label = msg.label || b.label; addRecent(msg);
      if(msg.threat || id==='intruder-1') { lockTarget(id); showLockBanner(b.label || b.id); }
      const cutoff = Date.now() - 20_000; Object.keys(blips).forEach(k=>{ const bb = blips[k]; const lastp = bb.positions[bb.positions.length-1]; if(lastp && lastp.ts < cutoff) delete blips[k]; });
    }catch(e){ console.error('invalid message', e); }
  };
  setTimeout(()=>{ if(ws.readyState !== 1){ info.textContent = 'No backend — running local overlay'; blips['sim-1'] = {id:'sim-1', positions:[{x:0.35,y:0.5,ts:now()}], r:0.12, label:'Simulated UAV', threat:true, rssi:-18, alt:120}; lockTarget('sim-1'); showLockBanner('Simulated UAV'); setTimeout(()=> flashDemo(), 800); } }, 1500);
}

function flashDemo(){ flashOverlay('Simulated UAV detected'); }

const overlay = document.createElement('div'); overlay.id = 'detection-overlay'; overlay.innerHTML = '<div class="card"><div class="title">Detected</div><div id="det-desc">Potential UAV detected nearby</div></div>'; document.body.appendChild(overlay);
function flashOverlay(text){ const desc = document.getElementById('det-desc'); desc.textContent = text; overlay.classList.add('show'); setTimeout(()=> overlay.classList.remove('show'), 3200); }

connectWS();