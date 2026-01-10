(function(){
  const canvas = document.getElementById('radar');
  const lockBanner = document.getElementById('lock-banner');
  const lockInfo = document.getElementById('lock-info');
  const recentList = document.getElementById('recent-list');
  const btnStart = document.getElementById('btn-start');
  const btnStop = document.getElementById('btn-stop');
  const themeToggle = document.getElementById('toggle-theme');
  const ctx = canvas.getContext('2d');
  let w,h, cx, cy, radius;
  let DPR = window.devicePixelRatio || 1;
  function resize(){
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.floor(w * DPR); canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    cx = w/2; cy = h/2; radius = Math.min(w,h)/2 * 0.86;
    resizeBg();
  }
  window.addEventListener('resize', resize);
  resize();

  let running = false;
  const blips = {};
  let lockId = null;

  // animation & UI controls
  const bgCanvas = document.getElementById('bg-canvas');
  const bgCtx = bgCanvas && bgCanvas.getContext ? bgCanvas.getContext('2d') : null;
  const scanSpeedInput = document.getElementById('scan-speed');
  const particleDensitySelect = document.getElementById('particle-density');
  const toggleStars = document.getElementById('toggle-stars');
  const toggleSound = document.getElementById('toggle-sound');
  let scanSpeed = parseFloat(scanSpeedInput.value || 0.035);
  let particleDensity = parseFloat(particleDensitySelect.value || 0.6);
  let soundEnabled = !!toggleSound.checked;

  const particles = [];
  const stars = [];
  let starSeeded = false;

  function seedStars(){ if(starSeeded) return; starSeeded=true; const count = Math.floor(60 * (window.innerWidth/1200)); for(let i=0;i<count;i++){ stars.push({x: Math.random(), y: Math.random(), r: Math.random()*1.6+0.3, a: 0.6*Math.random()+0.2}); } }

  function resizeBg(){ if(!bgCanvas) return; const bw=bgCanvas.clientWidth, bh=bgCanvas.clientHeight; bgCanvas.width = Math.floor(bw*DPR); bgCanvas.height = Math.floor(bh*DPR); bgCtx.setTransform(DPR,0,0,DPR,0,0); }

  window.addEventListener('resize', resizeBg); resizeBg();

  scanSpeedInput.addEventListener('input', (e)=>{ scanSpeed = parseFloat(e.target.value); });
  particleDensitySelect.addEventListener('change', (e)=>{ particleDensity = parseFloat(e.target.value); });
  toggleSound.addEventListener('change', (e)=>{ soundEnabled = !!e.target.checked; });

  function now(){ return Date.now(); }

  function showLock(text){ lockBanner.textContent = text; lockBanner.classList.add('show'); lockBanner.classList.add('lock-glow'); setTimeout(()=>{ lockBanner.classList.remove('show'); lockBanner.classList.remove('lock-glow'); }, 3800); if(soundEnabled) playBeep(); }

  function playBeep(){ try{ const ac = window._ss_ac || (window._ss_ac = new (window.AudioContext || window.webkitAudioContext)()); const o = ac.createOscillator(); const g = ac.createGain(); o.type='sine'; o.frequency.value = 560; g.gain.value = 0.0001; o.connect(g); g.connect(ac.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.12, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.00001, ac.currentTime + 0.18); setTimeout(()=>{ try{o.stop()}catch(_){} }, 220); }catch(e){}
  }

  function spawnParticle(){ const p = { x: Math.random(), y: Math.random(), vx: (Math.random()*0.6-0.3)*0.002, vy: (Math.random()*0.6-0.3)*0.002, r: Math.random()*1.6+0.6, a: Math.random()*0.6+0.1 }; particles.push(p); }

  function updateParticles(){ if(!bgCtx) return; // spawn depending on density
    const target = Math.floor(24 * particleDensity);
    while(particles.length < target) spawnParticle();
    while(particles.length > target) particles.shift();
    bgCtx.clearRect(0,0,bgCanvas.width/DPR,bgCanvas.height/DPR);
    // draw stars first
    if(toggleStars.checked){ bgCtx.fillStyle = '#000'; bgCtx.fillRect(0,0,bgCanvas.width/DPR,bgCanvas.height/DPR); bgCtx.globalCompositeOperation='lighter'; stars.forEach(s=>{ bgCtx.fillStyle = `rgba(200,255,200,${s.a})`; bgCtx.beginPath(); bgCtx.arc(s.x* (bgCanvas.width/DPR), s.y*(bgCanvas.height/DPR), s.r,0,Math.PI*2); bgCtx.fill(); }); bgCtx.globalCompositeOperation='source-over'; }
    // draw particles
    particles.forEach(p=>{ p.x += p.vx; p.y += p.vy; if(p.x < 0) p.x = 1; if(p.x>1) p.x=0; if(p.y<0) p.y=1; if(p.y>1) p.y=0; bgCtx.fillStyle = `rgba(190,255,200,${p.a})`; bgCtx.beginPath(); bgCtx.arc(p.x*(bgCanvas.width/DPR), p.y*(bgCanvas.height/DPR), p.r,0,Math.PI*2); bgCtx.fill(); });
  }

  function spawnDemo(){
    // dramatic locked target
    const big = { id: 'intruder-1', x: 0.22, y: -0.18, r: 0.11, rssi: -18, alt: 120.5, label: 'Unidentified UAV', threat: true, ts: now(), positions: [{x:0.22,y:-0.18,ts: now()}], speed:0 };
    blips[big.id] = big; lockId = big.id; updateLockInfo(); showLock(big.label);
    addRecent({id:big.id,label:big.label});
    // echoes
    for(let i=0;i<4;i++){
      const t = `echo-${i}`; blips[t] = {id:t, x: big.x + (Math.random()*0.14-0.07), y: big.y + (Math.random()*0.12-0.06), r:0.04, rssi: -60, alt: big.alt + (Math.random()*10-5), label:'echo', threat:false, positions:[{x:0.22 + (Math.random()*0.14-0.07), y:-0.18 + (Math.random()*0.12-0.06), ts: now()}]};
    }
    // background moving targets
    for(let i=0;i<6;i++){
      const id = 'bg-'+i;
      blips[id] = {id:id, x: Math.random()*1.6-0.8, y: Math.random()*1.6-0.8, r: Math.random()*0.06+0.02, rssi: -80+Math.random()*40, alt: 10+Math.random()*200, label:'unknown', positions:[{x:0, y:0, ts: now()}]};
      blips[id].positions[0].x = blips[id].x; blips[id].positions[0].y = blips[id].y;
    }
  }

  function jitter(){
    Object.values(blips).forEach(b=>{
      const last = b.positions[b.positions.length-1];
      const nx = Math.max(-1, Math.min(1, last.x + (Math.random()*0.03-0.015)));
      const ny = Math.max(-1, Math.min(1, last.y + (Math.random()*0.03-0.015)));
      b.positions.push({x:nx,y:ny,ts: now()}); if(b.positions.length>24) b.positions.shift();
      b.x = nx; b.y = ny; b.rssi = (b.rssi || -60) + (Math.random()*2-1);
    });
  }

  function addRecent(msg){
    const li = document.createElement('li'); li.className='d-flex justify-content-between py-1';
    li.innerHTML = `<span><strong class="text-light">${msg.label||msg.id}</strong> <small class="text-muted ms-2">${msg.id}</small></span><span class="text-muted">${new Date().toLocaleTimeString()}</span>`;
    recentList.prepend(li); if(recentList.children.length>20) recentList.removeChild(recentList.lastChild);
  }

  function updateLockInfo(){
    const ldLabel = document.getElementById('ld-label');
    const ldStatus = document.getElementById('ld-status');
    const ldLast = document.getElementById('ld-lastseen');
    const ldPos = document.getElementById('ld-pos');
    const ldAlt = document.getElementById('ld-alt');
    const btnNeutralize = document.getElementById('btn-neutralize');

    if(!lockId){ ldLabel.textContent = 'No target locked'; ldStatus.textContent = 'N/A'; ldLast.textContent = '-'; ldPos.textContent = '-'; ldAlt.textContent = '-'; if(btnNeutralize) btnNeutralize.disabled = true; return; }
    const b = blips[lockId]; if(!b){ ldLabel.textContent = 'No target locked'; ldStatus.textContent = 'N/A'; ldLast.textContent = '-'; ldPos.textContent = '-'; ldAlt.textContent = '-'; if(btnNeutralize) btnNeutralize.disabled = true; return; }
    ldLabel.textContent = `${b.label||b.id}`; ldStatus.textContent = b.neutralized ? `Neutralized (${new Date(b.neutralizedAt).toLocaleTimeString()})` : 'Active'; ldLast.textContent = new Date(b.positions[b.positions.length-1].ts).toLocaleTimeString(); ldPos.textContent = `${(b.x||0).toFixed(3)}, ${(b.y||0).toFixed(3)}`; ldAlt.textContent = `${Math.round(b.alt||0)} m`;
    if(btnNeutralize) btnNeutralize.disabled = !!b.neutralized;
  }

  function drawGrid(){
    ctx.fillStyle = '#001006'; ctx.fillRect(0,0,w,h);
    ctx.save(); ctx.translate(cx,cy);
    const grd = ctx.createRadialGradient(0,0,10,0,0,radius);
    grd.addColorStop(0,'rgba(0,150,80,0.08)'); grd.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(0,0,radius,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(80,220,120,0.09)'; for(let i=1;i<=4;i++){ ctx.beginPath(); ctx.arc(0,0,radius*i/4,0,Math.PI*2); ctx.stroke(); }
    ctx.restore();
  }

  let sweep = 0;
  function drawSweep(){ sweep += (scanSpeed || 0.035) * 0.9; const wA = 0.3; ctx.save(); ctx.translate(cx,cy); ctx.rotate(sweep); ctx.globalCompositeOperation='lighter'; const g = ctx.createLinearGradient(-radius,-radius,radius,radius); g.addColorStop(0,'rgba(120,255,140,0.12)'); g.addColorStop(1,'rgba(120,255,140,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,radius,-wA/2,wA/2); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.globalCompositeOperation='source-over'; }

  function drawTrails(){ Object.values(blips).forEach(b=>{ const pts = b.positions; if(!pts || pts.length<2) return; ctx.beginPath(); for(let i=0;i<pts.length;i++){ const p = pts[i]; const x = cx + p.x*radius; const y = cy - p.y*radius; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); } ctx.strokeStyle = 'rgba(120,255,140,0.18)'; ctx.lineWidth = 2; ctx.stroke(); }); }

  function drawTargets(){ Object.values(blips).forEach(b=>{ const p = b.positions[b.positions.length-1]; const x = cx + p.x*radius; const y = cy - p.y*radius; const alpha = Math.max(0.12, 1 - (now()-p.ts)/7000); ctx.save();
      if(b.neutralized){ ctx.shadowBlur = 0; ctx.fillStyle = `rgba(180,180,180,${alpha})`; const size = Math.max(6, (b.r||0.04)*60); ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fill(); // draw cross
        ctx.strokeStyle = 'rgba(200,90,90,0.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - size*1.2, y - size*1.2); ctx.lineTo(x + size*1.2, y + size*1.2); ctx.moveTo(x - size*1.2, y + size*1.2); ctx.lineTo(x + size*1.2, y - size*1.2); ctx.stroke();
      } else {
        ctx.shadowBlur = b.threat ? 24 : 8; ctx.shadowColor = b.threat ? 'rgba(255,70,70,0.95)' : 'rgba(120,255,140,0.95)'; ctx.fillStyle = b.threat ? `rgba(255,70,70,${alpha})` : `rgba(120,255,140,${alpha})`; const size = Math.max(6, (b.r||0.04)*60); ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fill();
      }
      ctx.restore(); ctx.fillStyle='rgba(220,255,220,0.92)'; ctx.font='13px sans-serif'; // label
      const labelTxt = b.label||b.id; if(b.neutralized){ ctx.fillStyle = 'rgba(200,200,200,0.92)'; }
      ctx.fillText(labelTxt, x+10, y-8);
      // action visuals
      if(b.action && !b.neutralized){ // only draw action badges if not neutralized
        if(b.action === 'monitor'){ ctx.strokeStyle = 'rgba(80,220,140,0.38)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x,y, size*2.2 + Math.sin(now()/400)*2,0,Math.PI*2); ctx.stroke(); }
        if(b.action === 'report'){ ctx.fillStyle='rgba(255,165,60,0.95)'; ctx.beginPath(); ctx.moveTo(x+size+6,y-6); ctx.lineTo(x+size+12,y-2); ctx.lineTo(x+size+6,y+2); ctx.closePath(); ctx.fill(); }
        if(b.action === 'mark'){ ctx.fillStyle='rgba(120,200,240,0.95)'; ctx.fillRect(x+size+6,y-10,8,6); }
      }
      if(b.id===lockId){ if(!b.neutralized){ const pulse = 1 + Math.sin(now()/260)/6; ctx.strokeStyle = 'rgba(255,140,120,0.98)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x,y,size*1.6*pulse,0,Math.PI*2); ctx.stroke(); showLock(b.label||b.id); } else { // show small muted banner
          lockBanner.textContent = `${b.label||b.id} (Neutralized)`; lockBanner.classList.add('show'); setTimeout(()=> lockBanner.classList.remove('show'), 2600);
        }
      } }); }

  function render(){ ctx.clearRect(0,0,w,h); drawGrid(); drawTrails(); drawSweep(); drawTargets(); updateLockInfo(); if(running) requestAnimationFrame(render); }

  let tickHandle = null;
  const reticle = document.getElementById('scanner-reticle');
  const toggleReticle = document.getElementById('toggle-reticle');
  let scanEnabled = !!toggleReticle.checked;
  let retAngle = 0;

  toggleReticle.addEventListener('change', (e)=>{ scanEnabled = !!e.target.checked; if(!scanEnabled) reticle.style.opacity = '0'; else reticle.style.opacity = '0.96'; });

  function tick(){ jitter(); }

  function updateReticle(){
    if(!scanEnabled || !running) return;
    retAngle += scanSpeed || 0.035;
    const scanRadius = radius * 0.82;
    const rx = Math.cos(retAngle);
    const ry = Math.sin(retAngle);
    const px = Math.round(cx + rx * scanRadius);
    const py = Math.round(cy + ry * scanRadius);
    reticle.style.left = px + 'px'; reticle.style.top = py + 'px';
    reticle.classList.add('pulse');
    // proximity check with targets
    Object.values(blips).forEach(b=>{
      const last = b.positions && b.positions[b.positions.length-1]; if(!last) return;
      const tx = cx + last.x * radius; const ty = cy - last.y * radius;
      const dist = Math.hypot(px - tx, py - ty);
      if(dist < 36){ b.hilightUntil = now() + 900; }
    });
  }

  function start(){ if(running) return; running = true; seedStars(); spawnDemo(); tickHandle = setInterval(tick, 450); render(); }
  function stop(){ running = false; clearInterval(tickHandle); }

  // patch render loop to update reticle
  const _origRender = render;
  function patchedRender(){ if(bgCtx) updateParticles(); ctx.clearRect(0,0,w,h); drawGrid(); drawTrails(); drawSweep(); drawTargets(); updateLockInfo(); updateReticle(); if(running) requestAnimationFrame(patchedRender); }

  btnStart.addEventListener('click', ()=>{ start(); });
  btnStop.addEventListener('click', ()=>{ stop(); });
  themeToggle.addEventListener('change', (e)=>{ if(e.target.checked){ document.body.style.background = '#001506'; } else { document.body.style.background = ''; } });

  // Neutralize flow (safe flag only)
  const btnNeutralize = document.getElementById('btn-neutralize');
  const confirmNeutralizeModal = document.getElementById('confirmNeutralizeModal');
  const confirmNeutralizeBtn = document.getElementById('confirm-neutralize');
  let bsModal = null; if(confirmNeutralizeModal) bsModal = new bootstrap.Modal(confirmNeutralizeModal);
  const quickNeutralize = document.getElementById('quick-neutralize');
  if(btnNeutralize){ btnNeutralize.addEventListener('click', ()=>{ if(!lockId) return; if(quickNeutralize && quickNeutralize.checked){ neutralizeTarget(lockId); } else { if(bsModal) bsModal.show(); } }); }
  if(confirmNeutralizeBtn){ confirmNeutralizeBtn.addEventListener('click', ()=>{ if(!lockId) return; neutralizeTarget(lockId); if(bsModal) bsModal.hide(); }); }

  // Action selector flow
  const actionSelect = document.getElementById('action-select');
  const btnApplyAction = document.getElementById('btn-apply-action');
  const confirmActionModal = document.getElementById('confirmActionModal');
  const confirmActionBtn = document.getElementById('confirm-action');
  let actionModal = null; if(confirmActionModal) actionModal = new bootstrap.Modal(confirmActionModal);
  let pendingAction = null;
  if(btnApplyAction){ btnApplyAction.addEventListener('click', ()=>{ if(!lockId) return; pendingAction = actionSelect.value; const mb = document.getElementById('confirmActionBody'); if(mb) mb.textContent = `Seçilen işlem: ${actionSelect.options[actionSelect.selectedIndex].text}. Bu işlem pasif bir işarettir. Onaylıyor musunuz?`; if(actionModal) actionModal.show(); }); }
  if(confirmActionBtn){ confirmActionBtn.addEventListener('click', ()=>{ if(!lockId || !pendingAction) return; performAction(lockId, pendingAction); pendingAction = null; if(actionModal) actionModal.hide(); }); }

  function performAction(id, action){ const b = blips[id]; if(!b) return; b.action = action; b.actionAt = now(); if(action === 'neutralize'){ neutralizeTarget(id); } else { addRecent({id:b.id,label:`${b.label||b.id} -> ${action}`}); updateLockInfo(); showLock(`${b.label||b.id} : ${action}`); } }

  function neutralizeTarget(id){ const b = blips[id]; if(!b) return; b.neutralized = true; b.neutralizedAt = now(); b.action = 'neutralize'; addRecent({id:b.id,label:`${b.label||b.id} marked neutralized`}); updateLockInfo(); showLock(`${b.label||b.id} işaretlendi`); }

  // click-to-lock: click near a blip to lock it
  canvas.addEventListener('click', (ev)=>{
    const rect = canvas.getBoundingClientRect(); const cxp = ev.clientX - rect.left; const cyp = ev.clientY - rect.top; let nearest = null; let best = 9999;
    Object.values(blips).forEach(b=>{ const p = b.positions && b.positions[b.positions.length-1]; if(!p) return; const bx = cx + p.x*radius; const by = cy - p.y*radius; const d = Math.hypot(bx-cxp, by-cyp); if(d < best){ best = d; nearest = b; } });
    if(nearest && best < 48){ lockId = nearest.id; updateLockInfo(); showLock(nearest.label||nearest.id); addRecent({id:nearest.id,label:nearest.label}); }
  });

  // Auto-start
  start();
  // start patched render
  requestAnimationFrame(patchedRender);
})();