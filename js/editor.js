window.addEventListener('error', function(e) {
  // 【修复】忽略 ResizeObserver 的警告，它通常不影响运行
  if (e.message && String(e.message).includes('ResizeObserver')) {
    return;
  }
  
  console.error("编辑器报错:", e.message, e.filename, e.lineno);
  if (!window.__editorInited) {
    alert("编辑器加载失败: " + e.message + "\n请检查控制台。");
  }
});

(function(){
"use strict";

/* ---------------- 默认关卡 ---------------- */
function defaultLevel(){
  return {
    worldW: 4000,
    worldH: 540,
    spawn: { x: 60, y: 458 },
    solids: [
      {x:0,    y:480, w:560, h:60},{x:720,  y:480, w:480, h:60},
      {x:1400, y:480, w:600, h:60},{x:2150, y:480, w:550, h:60},
      {x:2900, y:480, w:700, h:60},{x:3800, y:480, w:200, h:60},
      {x:180,  y:380, w:120, h:18},{x:400,  y:300, w:110, h:18},
      {x:600,  y:400, w:90,  h:18},{x:830,  y:360, w:140, h:18},
      {x:1080, y:290, w:110, h:18},{x:1300, y:410, w:80,  h:18},
      {x:1500, y:380, w:130, h:18},{x:1750, y:300, w:120, h:18},
      {x:1980, y:390, w:90,  h:18},{x:2200, y:380, w:130, h:18},
      {x:2450, y:310, w:110, h:18},{x:2950, y:360, w:140, h:18},
      {x:3250, y:290, w:110, h:18},{x:3550, y:390, w:100, h:18},
      {x:2500, y:460, w:60,  h:20},{x:3350, y:460, w:60,  h:20}
    ],
    movers: [
      {x:2680, y:390, w:90, h:16, ax:90, ay:0,  spd:0.018, phase:0},
      {x:1200, y:390, w:80, h:16, ax:0,  ay:60, spd:0.022, phase:0}
    ],
    spikes: [
      {x:300,  y:456, w:70,  h:24},{x:900,  y:456, w:90,  h:24},
      {x:1600, y:456, w:110, h:24},{x:2300, y:456, w:90,  h:24},
      {x:3050, y:456, w:80,  h:24},{x:3450, y:456, w:70,  h:24},
      {x:470,  y:284, w:40,  h:16},{x:2500, y:454, w:60,  h:6}
    ],
    enemies: [
      {type:'walker',  x:950,  y:446, w:22, h:34, minX:860,  maxX:1150, vx:1.5},
      {type:'walker',  x:1650, y:446, w:22, h:34, minX:1450, maxX:1950, vx:1.8},
      {type:'walker',  x:2400, y:446, w:22, h:34, minX:2200, maxX:2650, vx:1.6},
      {type:'walker',  x:3150, y:446, w:22, h:34, minX:2960, maxX:3550, vx:1.9},
      {type:'shooter', x:1480, y:210, w:26, h:26, baseY:210, phase:0,   cd:60},
      {type:'shooter', x:2260, y:180, w:26, h:26, baseY:180, phase:1.5, cd:90},
      {type:'shooter', x:3320, y:200, w:26, h:26, baseY:200, phase:3.0, cd:120}
    ],
    checkpoints: [
      {x:60,   y:440, w:20, h:40, spawnX:60,   spawnY:458},
      {x:730,  y:440, w:20, h:40, spawnX:730,  spawnY:458},
      {x:1420, y:440, w:20, h:40, spawnX:1420, spawnY:458},
      {x:2170, y:440, w:20, h:40, spawnX:2170, spawnY:458},
      {x:2920, y:440, w:20, h:40, spawnX:2920, spawnY:458}
    ],
    goal: { x:3900, y:400, w:34, h:80 }
  };
}

var TOOLS = [
  { id:'select',     name:'选择 / 移动',   color:'#5eead4', key:'1' },
  { id:'solid',      name:'实体方块',      color:'#4d4d7d', key:'2' },
  { id:'mover',      name:'移动平台',      color:'#a78bfa', key:'3' },
  { id:'spike',      name:'尖刺',          color:'#e94560', key:'4' },
  { id:'walker',     name:'巡逻敌人',      color:'#f59e0b', key:'5' },
  { id:'shooter',    name:'射击敌人',      color:'#e94560', key:'6' },
  { id:'checkpoint', name:'存档点',        color:'#4ade80', key:'7' },
  { id:'goal',       name:'终点',          color:'#fde047', key:'8' },
  { id:'erase',      name:'橡皮擦',        color:'#6a7290', key:'9' }
];

var TOOL_DEFAULT = { solid:{w:100,h:20}, mover:{w:90,h:16}, spike:{w:60,h:24}, walker:{w:22,h:34}, shooter:{w:26,h:26}, checkpoint:{w:20,h:40}, goal:{w:34,h:80} };
var FIELDS = { solid:['x','y','w','h'], mover:['x','y','w','h','ax','ay','spd'], spike:['x','y','w','h'], walker:['x','y','w','h','minX','maxX','vx'], shooter:['x','y','w','h','baseY','phase','cd'], checkpoint:['x','y','w','h','spawnX','spawnY'], goal:['x','y','w','h'] };
var FIELD_META = { x:{label:'X',step:1,min:-99999}, y:{label:'Y',step:1,min:-99999}, w:{label:'宽',step:1,min:2}, h:{label:'高',step:1,min:2}, ax:{label:'水平振幅',step:1,min:0}, ay:{label:'垂直振幅',step:1,min:0}, spd:{label:'速度',step:0.001,min:0.0001}, minX:{label:'左边界',step:1,min:-99999}, maxX:{label:'右边界',step:1,min:-99999}, vx:{label:'巡逻速度',step:0.1,min:0.1}, baseY:{label:'基准 Y',step:1,min:-99999}, phase:{label:'相位',step:0.1,min:0}, cd:{label:'射击间隔',step:1,min:10}, spawnX:{label:'重生 X',step:1,min:-99999}, spawnY:{label:'重生 Y',step:1,min:-99999} };
var TYPE_NAME = { solid:'实体方块', mover:'移动平台', spike:'尖刺', walker:'巡逻敌人', shooter:'射击敌人', checkpoint:'存档点', goal:'终点' };
var TYPE_COLOR = { solid:'#4d4d7d', mover:'#a78bfa', spike:'#e94560', walker:'#f59e0b', shooter:'#e94560', checkpoint:'#4ade80', goal:'#fde047' };

var $ = function(id){ return document.getElementById(id); };
var cvs = $('cv');
var ctx = cvs.getContext('2d');
var dpr = window.devicePixelRatio || 1;
var level = defaultLevel();
var ed = { tool: 'select', cam: { x: -40, y: -40 }, zoom: 0.7, selected: null, drag: null, panning: false, spaceDown: false, snap: true, gridSize: 10, mouseScreen: { x:0, y:0 }, mouseWorld: { x:0, y:0 }, dirty: true };
var viewW = 800, viewH = 600;
var history = { undo: [], redo: [], limit: 80 };
var gameTemplateStr = ''; 

function cloneLevel(){
  return JSON.parse(JSON.stringify({ worldW: level.worldW, worldH: level.worldH, spawn: level.spawn, solids: level.solids, movers: level.movers, spikes: level.spikes, enemies: level.enemies, checkpoints: level.checkpoints, goal: level.goal }));
}
function pushHistory(){
  history.undo.push(JSON.stringify(cloneLevel()));
  if(history.undo.length > history.limit) history.undo.shift();
  history.redo.length = 0; updateHistoryButtons();
}
function restoreFrom(str){
  var d = JSON.parse(str);
  level.worldW = d.worldW; level.worldH = d.worldH; level.spawn = d.spawn; level.solids = d.solids; level.movers = d.movers; level.spikes = d.spikes; level.enemies = d.enemies; level.checkpoints = d.checkpoints; level.goal = d.goal;
  ed.selected = null; refreshAll();
}
function doUndo(){ if(!history.undo.length) return; history.redo.push(JSON.stringify(cloneLevel())); restoreFrom(history.undo.pop()); updateHistoryButtons(); }
function doRedo(){ if(!history.redo.length) return; history.undo.push(JSON.stringify(cloneLevel())); restoreFrom(history.redo.pop()); updateHistoryButtons(); }
function updateHistoryButtons(){ $('btn-undo').disabled = history.undo.length === 0; $('btn-redo').disabled = history.redo.length === 0; }

function w2s(wx, wy){ return { x: (wx - ed.cam.x) * ed.zoom, y: (wy - ed.cam.y) * ed.zoom }; }
function s2w(sx, sy){ return { x: sx / ed.zoom + ed.cam.x, y: sy / ed.zoom + ed.cam.y }; }
function w2r(e){ return { x: (e.x - ed.cam.x) * ed.zoom, y: (e.y - ed.cam.y) * ed.zoom, w: e.w * ed.zoom, h: e.h * ed.zoom }; }
function snapVal(v){ return ed.snap ? Math.round(v / ed.gridSize) * ed.gridSize : Math.round(v); }

function collectEntities(){
  var out = [], i, e;
  for(i=0;i<level.solids.length;i++){ e=level.solids[i]; out.push({type:'solid', e:e, arr:level.solids}); }
  for(i=0;i<level.movers.length;i++){ e=level.movers[i]; out.push({type:'mover', e:e, arr:level.movers}); }
  for(i=0;i<level.spikes.length;i++){ e=level.spikes[i]; out.push({type:'spike', e:e, arr:level.spikes}); }
  for(i=0;i<level.enemies.length;i++){ e=level.enemies[i]; out.push({type:e.type, e:e, arr:level.enemies}); }
  for(i=0;i<level.checkpoints.length;i++){ e=level.checkpoints[i]; out.push({type:'checkpoint', e:e, arr:level.checkpoints}); }
  if(level.goal) out.push({type:'goal', e:level.goal, arr:[level.goal]});
  return out;
}
function hitTest(wx, wy){
  var list = collectEntities();
  for(var i=list.length-1;i>=0;i--){ var it = list[i]; var e = it.e; if(wx >= e.x && wx <= e.x + e.w && wy >= e.y && wy <= e.y + e.h) return it; }
  return null;
}
function hitHandle(sx, sy, e){
  var r = w2r(e), hs = 8;
  var pts = { nw: [r.x, r.y], ne: [r.x + r.w, r.y], sw: [r.x, r.y + r.h], se: [r.x + r.w, r.y + r.h] };
  for(var k in pts){ if(Math.abs(sx - pts[k][0]) <= hs && Math.abs(sy - pts[k][1]) <= hs) return k; }
  return null;
}
function createEntity(type, x, y, w, h){
  var e;
  if(type === 'solid') e = { x:x, y:y, w:w, h:h };
  else if(type === 'mover') e = { x:x, y:y, w:w, h:h, ax:60, ay:0, spd:0.02, phase:0 };
  else if(type === 'spike') e = { x:x, y:y, w:w, h:h };
  else if(type === 'walker') e = { type:'walker', x:x, y:y, w:w, h:h, minX: x-100, maxX: x+w+100, vx:1.5 };
  else if(type === 'shooter') e = { type:'shooter', x:x, y:y, w:w, h:h, baseY:y, phase:0, cd:90 };
  else if(type === 'checkpoint') e = { x:x, y:y, w:w, h:h, spawnX: Math.round(x + w/2 - 7), spawnY: Math.round(y + h - 22) };
  else if(type === 'goal') e = { x:x, y:y, w:w, h:h };
  return e;
}
function addEntity(type, x, y, w, h){
  pushHistory(); var e = createEntity(type, x, y, w, h);
  if(type === 'solid') level.solids.push(e); else if(type === 'mover') level.movers.push(e); else if(type === 'spike') level.spikes.push(e); else if(type === 'walker' || type === 'shooter') level.enemies.push(e); else if(type === 'checkpoint') level.checkpoints.push(e);
  else if(type === 'goal'){ if(level.goal){ alert('关卡中已经有终点，请先删除旧的。'); history.undo.pop(); return; } level.goal = e; }
  ed.selected = { type:type, e:e, arr:null }; refreshAll();
}
function deleteSelected(){
  if(!ed.selected) return; var it = ed.selected; pushHistory();
  if(it.type === 'goal') level.goal = null;
  else { var arr = (it.type === 'solid') ? level.solids : (it.type === 'mover') ? level.movers : (it.type === 'spike') ? level.spikes : (it.type === 'walker' || it.type === 'shooter') ? level.enemies : level.checkpoints; var idx = arr.indexOf(it.e); if(idx >= 0) arr.splice(idx, 1); }
  ed.selected = null; refreshAll();
}

// 【修复】使用 requestAnimationFrame 避免 ResizeObserver 死循环
var resizePending = false;
function safeResize() {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizeCanvas();
    resizePending = false;
  });
}

function resizeCanvas(){ 
  var rect = cvs.getBoundingClientRect(); 
  if(rect.width === 0 || rect.height === 0) return;
  viewW = rect.width; viewH = rect.height; 
  cvs.width = Math.round(viewW * dpr); cvs.height = Math.round(viewH * dpr); 
  ed.dirty = true; 
}
function fitView(){ ed.zoom = clamp(Math.min(viewW / level.worldW, viewH / level.worldH) * 0.94, 0.05, 3); ed.cam.x = level.worldW / 2 - viewW / (2 * ed.zoom); ed.cam.y = level.worldH / 2 - viewH / (2 * ed.zoom); updateZoomLabel(); ed.dirty = true; }
function clamp(v,a,b){ return v<a?a:v>b?b:v; }
function updateZoomLabel(){ $('zoom-label').textContent = Math.round(ed.zoom * 100) + '%'; }

function render(){
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, viewW, viewH); ctx.fillStyle = '#08080f'; ctx.fillRect(0, 0, viewW, viewH); drawGrid();
  var wb = w2r({ x:0, y:0, w:level.worldW, h:level.worldH }); ctx.strokeStyle = 'rgba(120,150,255,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(wb.x + 0.5, wb.y + 0.5, wb.w, wb.h);
  var i; for(i=0;i<level.solids.length;i++) drawEntity('solid', level.solids[i]); for(i=0;i<level.movers.length;i++) drawEntity('mover', level.movers[i]); for(i=0;i<level.spikes.length;i++) drawEntity('spike', level.spikes[i]); for(i=0;i<level.enemies.length;i++) drawEntity(level.enemies[i].type, level.enemies[i]); for(i=0;i<level.checkpoints.length;i++) drawEntity('checkpoint', level.checkpoints[i]); if(level.goal) drawEntity('goal', level.goal);
  drawSpawnMarker(); if(ed.selected) drawSelection(ed.selected.e);
  if(ed.drag && ed.drag.mode === 'draw'){ var r = w2r(ed.drag.preview); ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 1.5; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h); ctx.fillStyle = 'rgba(94,234,212,0.12)'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore(); }
}
function drawGrid(){
  var step = ed.gridSize; while(step * ed.zoom < 9) step *= 2;
  var x0 = Math.floor(ed.cam.x / step) * step, y0 = Math.floor(ed.cam.y / step) * step, x1 = ed.cam.x + viewW / ed.zoom, y1 = ed.cam.y + viewH / ed.zoom, x, y;
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(70,90,150,0.09)'; ctx.beginPath();
  for(x = x0; x <= x1; x += step){ var sx = Math.round((x - ed.cam.x) * ed.zoom) + 0.5; ctx.moveTo(sx, 0); ctx.lineTo(sx, viewH); }
  for(y = y0; y <= y1; y += step){ var sy = Math.round((y - ed.cam.y) * ed.zoom) + 0.5; ctx.moveTo(0, sy); ctx.lineTo(viewW, sy); }
  ctx.stroke();
  var major = step * 5; ctx.strokeStyle = 'rgba(70,90,150,0.16)'; ctx.beginPath();
  for(x = Math.floor(ed.cam.x / major) * major; x <= x1; x += major){ var mx2 = Math.round((x - ed.cam.x) * ed.zoom) + 0.5; ctx.moveTo(mx2, 0); ctx.lineTo(mx2, viewH); }
  for(y = Math.floor(ed.cam.y / major) * major; y <= y1; y += major){ var my2 = Math.round((y - ed.cam.y) * ed.zoom) + 0.5; ctx.moveTo(0, my2); ctx.lineTo(viewW, my2); }
  ctx.stroke();
}
function drawEntity(type, e){
  var r = w2r(e); if(r.x + r.w < -60 || r.x > viewW + 60 || r.y + r.h < -60 || r.y > viewH + 60) return; var i, x, y, n, tw;
  if(type === 'solid'){ ctx.fillStyle = '#2c2c4a'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = '#55558a'; ctx.fillRect(r.x, r.y, r.w, Math.min(3, r.h)); ctx.strokeStyle = '#3e3e66'; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, Math.max(0, r.w - 1), Math.max(0, r.h - 1)); }
  else if(type === 'mover'){
    var range = w2r({ x: e.x - e.ax, y: e.y - e.ay, w: e.w + e.ax*2, h: e.h + e.ay*2 }); ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(167,139,250,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(range.x + 0.5, range.y + 0.5, range.w, range.h); ctx.restore();
    ctx.fillStyle = '#4a3b7a'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = '#a78bfa'; ctx.fillRect(r.x, r.y, r.w, Math.min(3, r.h));
    var ac = w2s(e.x, e.y); ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ac.x - 4, ac.y); ctx.lineTo(ac.x + 4, ac.y); ctx.moveTo(ac.x, ac.y - 4); ctx.lineTo(ac.x, ac.y + 4); ctx.stroke();
  }
  else if(type === 'spike'){ n = Math.max(1, Math.round(e.w / 14)); tw = r.w / n; ctx.fillStyle = 'rgba(233,69,96,0.85)'; for(i = 0; i < n; i++){ ctx.beginPath(); ctx.moveTo(r.x + i*tw, r.y + r.h); ctx.lineTo(r.x + i*tw + tw/2, r.y); ctx.lineTo(r.x + i*tw + tw, r.y + r.h); ctx.closePath(); ctx.fill(); } }
  else if(type === 'walker'){
    var pr = w2r({ x: e.minX, y: e.y + e.h - 4, w: Math.max(1, e.maxX - e.minX), h: 1 }); ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(245,158,11,0.35)'; ctx.beginPath(); ctx.moveTo(pr.x, pr.y + 0.5); ctx.lineTo(pr.x + pr.w, pr.y + 0.5); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = '#b45309'; ctx.fillRect(r.x, r.y + r.h - Math.max(2, r.h*0.18), r.w, Math.max(2, r.h*0.18)); var es = Math.max(2, r.w * 0.22); ctx.fillStyle = '#1a0a00'; ctx.fillRect(r.x + r.w*0.2, r.y + r.h*0.22, es, es); ctx.fillRect(r.x + r.w*0.6, r.y + r.h*0.22, es, es);
  }
  else if(type === 'shooter'){
    var cx = r.x + r.w/2, cy = r.y + r.h/2, rad = Math.max(r.w, r.h) / 2, vr = w2r({ x: e.x + e.w/2, y: e.baseY - 14, w: 1, h: e.h + 28 }); ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(233,69,96,0.3)'; ctx.beginPath(); ctx.moveTo(vr.x + 0.5, vr.y); ctx.lineTo(vr.x + 0.5, vr.y + vr.h); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#e94560'; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#1a0a12'; ctx.beginPath(); ctx.arc(cx, cy, rad*0.5, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(cx, cy, rad*0.22, 0, Math.PI*2); ctx.fill();
  }
  else if(type === 'checkpoint'){ ctx.fillStyle = '#7a86a8'; ctx.fillRect(r.x + r.w/2 - 1, r.y, 2, r.h); ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.moveTo(r.x + r.w/2 + 1, r.y + r.h*0.08); ctx.lineTo(r.x + r.w/2 + r.w*0.9, r.y + r.h*0.25); ctx.lineTo(r.x + r.w/2 + 1, r.y + r.h*0.45); ctx.closePath(); ctx.fill(); }
  else if(type === 'goal'){ ctx.fillStyle = '#fde047'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = '#0b0b18'; ctx.fillRect(r.x + r.w*0.16, r.y + r.h*0.06, r.w*0.68, r.h*0.92); ctx.fillStyle = 'rgba(253,224,71,0.65)'; for(i = 0; i < 4; i++){ ctx.fillRect(r.x + r.w*0.25, r.y + r.h*(0.16 + i*0.2), r.w*0.5, Math.max(1, r.h*0.035)); } }
}
function drawSpawnMarker(){
  var s = w2s(level.spawn.x + 7, level.spawn.y + 11); if(s.x < -40 || s.x > viewW + 40 || s.y < -40 || s.y > viewH + 40) return; ctx.strokeStyle = 'rgba(94,234,212,0.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s.x - 15, s.y); ctx.lineTo(s.x - 6, s.y); ctx.moveTo(s.x + 6, s.y); ctx.lineTo(s.x + 15, s.y); ctx.moveTo(s.x, s.y - 15); ctx.lineTo(s.x, s.y - 6); ctx.moveTo(s.x, s.y + 6); ctx.lineTo(s.x, s.y + 15); ctx.stroke(); ctx.fillStyle = 'rgba(94,234,212,0.9)'; ctx.font = '10px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.fillText('出生点', s.x, s.y + 28);
}
function drawSelection(e){
  var r = w2r(e); ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 1.5; ctx.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1); var hs = 4; var pts = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]; ctx.fillStyle = '#5eead4'; ctx.strokeStyle = '#062a26'; ctx.lineWidth = 1;
  for(var i = 0; i < pts.length; i++){ ctx.fillRect(pts[i][0] - hs, pts[i][1] - hs, hs*2, hs*2); ctx.strokeRect(pts[i][0] - hs + 0.5, pts[i][1] - hs + 0.5, hs*2 - 1, hs*2 - 1); }
}

function loop(){ requestAnimationFrame(loop); if(ed.dirty){ render(); ed.dirty = false; } }
function evtPos(ev){ var rect = cvs.getBoundingClientRect(); return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }; }

cvs.addEventListener('mousedown', function(ev){
  var sp = evtPos(ev), wp = s2w(sp.x, sp.y); ed.mouseScreen = sp; ed.mouseWorld = wp;
  if(ev.button === 1 || (ev.button === 0 && ed.spaceDown)){ ev.preventDefault(); ed.panning = true; ed.panStart = { sx: sp.x, sy: sp.y, cx: ed.cam.x, cy: ed.cam.y }; return; }
  if(ev.button !== 0) return; var tool = ed.tool;
  if(tool === 'select'){
    if(ed.selected){ var h = hitHandle(sp.x, sp.y, ed.selected.e); if(h){ pushHistory(); ed.drag = { mode: 'resize', handle: h, startWorld: { x: wp.x, y: wp.y }, orig: { x: ed.selected.e.x, y: ed.selected.e.y, w: ed.selected.e.w, h: ed.selected.e.h }, target: ed.selected }; return; } }
    var hit = hitTest(wp.x, wp.y);
    if(hit){ ed.selected = hit; pushHistory(); ed.drag = { mode: 'move', startWorld: { x: wp.x, y: wp.y }, orig: { x: hit.e.x, y: hit.e.y }, target: hit }; refreshInspector(); refreshObjList(); }
    else { ed.selected = null; refreshInspector(); refreshObjList(); }
  } else if(tool === 'erase'){
    var eh = hitTest(wp.x, wp.y);
    if(eh){ pushHistory(); var arr = eh.arr; if(eh.type === 'goal') level.goal = null; else { var idx = arr.indexOf(eh.e); if(idx >= 0) arr.splice(idx, 1); } if(ed.selected && ed.selected.e === eh.e) ed.selected = null; refreshAll(); }
  } else {
    var x0 = snapVal(wp.x), y0 = snapVal(wp.y); ed.drag = { mode: 'draw', type: tool, startWorld: { x: x0, y: y0 }, preview: { x: x0, y: y0, w: 0, h: 0 } };
  }
  ed.dirty = true;
});

cvs.addEventListener('mousemove', function(ev){
  var sp = evtPos(ev), wp = s2w(sp.x, sp.y); ed.mouseScreen = sp; ed.mouseWorld = wp;
  if(ed.panning){ ed.cam.x = ed.panStart.cx - (sp.x - ed.panStart.sx) / ed.zoom; ed.cam.y = ed.panStart.cy - (sp.y - ed.panStart.sy) / ed.zoom; ed.dirty = true; return; }
  if(!ed.drag) return;
  if(ed.drag.mode === 'move'){ var dx = wp.x - ed.drag.startWorld.x, dy = wp.y - ed.drag.startWorld.y, t = ed.drag.target.e; t.x = snapVal(ed.drag.orig.x + dx); t.y = snapVal(ed.drag.orig.y + dy); ed.dirty = true; }
  else if(ed.drag.mode === 'resize'){
    var wdx = wp.x - ed.drag.startWorld.x, wdy = wp.y - ed.drag.startWorld.y, o = ed.drag.orig, hd = ed.drag.handle, nx = o.x, ny = o.y, nw = o.w, nh = o.h;
    if(hd.indexOf('w') >= 0){ nx = o.x + wdx; nw = o.w - wdx; } if(hd.indexOf('e') >= 0){ nw = o.w + wdx; } if(hd.indexOf('n') >= 0){ ny = o.y + wdy; nh = o.h - wdy; } if(hd.indexOf('s') >= 0){ nh = o.h + wdy; }
    if(nw < 8){ nw = 8; if(hd.indexOf('w') >= 0) nx = o.x + o.w - 8; } if(nh < 8){ nh = 8; if(hd.indexOf('n') >= 0) ny = o.y + o.h - 8; }
    if(ed.snap){ nx = snapVal(nx); ny = snapVal(ny); nw = snapVal(nw); nh = snapVal(nh); if(nw < 8) nw = 8; if(nh < 8) nh = 8; }
    var te = ed.drag.target.e; te.x = nx; te.y = ny; te.w = nw; te.h = nh; ed.dirty = true; refreshInspector();
  } else if(ed.drag.mode === 'draw'){
    var sx0 = ed.drag.startWorld.x, sy0 = ed.drag.startWorld.y, x1 = snapVal(wp.x), y1 = snapVal(wp.y); ed.drag.preview = { x: Math.min(sx0, x1), y: Math.min(sy0, y1), w: Math.abs(x1 - sx0), h: Math.abs(y1 - sy0) }; ed.dirty = true;
  }
});

window.addEventListener('mouseup', function(ev){
  if(ed.panning){ ed.panning = false; return; } if(!ed.drag) return; var d = ed.drag; ed.drag = null;
  if(d.mode === 'draw'){ var p = d.preview, def = TOOL_DEFAULT[d.type], w = p.w, h = p.h, x = p.x, y = p.y; if(w < 4 || h < 4){ w = def.w; h = def.h; x = d.startWorld.x; y = d.startWorld.y; } addEntity(d.type, x, y, w, h); }
  else { refreshAll(); }
  ed.dirty = true;
});

cvs.addEventListener('wheel', function(ev){ ev.preventDefault(); var sp = evtPos(ev), wp = s2w(sp.x, sp.y), factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12; ed.zoom = clamp(ed.zoom * factor, 0.05, 4); ed.cam.x = wp.x - sp.x / ed.zoom; ed.cam.y = wp.y - sp.y / ed.zoom; updateZoomLabel(); ed.dirty = true; }, { passive: false });
cvs.addEventListener('contextmenu', function(ev){ ev.preventDefault(); });

window.addEventListener('keydown', function(ev){
  var tag = (document.activeElement && document.activeElement.tagName) || ''; if(/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  if(ev.code === 'Space'){ ed.spaceDown = true; cvs.style.cursor = 'grab'; ev.preventDefault(); }
  if(ev.ctrlKey || ev.metaKey){ if(ev.code === 'KeyZ'){ ev.preventDefault(); if(ev.shiftKey) doRedo(); else doUndo(); return; } if(ev.code === 'KeyY'){ ev.preventDefault(); doRedo(); return; } if(ev.code === 'KeyS'){ ev.preventDefault(); saveJSON(); return; } return; }
  if(ev.code === 'Delete' || ev.code === 'Backspace'){ ev.preventDefault(); deleteSelected(); return; }
  if(ev.code === 'Escape'){ ed.selected = null; refreshInspector(); refreshObjList(); ed.dirty = true; return; }
  var num = { Digit1:'select', Digit2:'solid', Digit3:'mover', Digit4:'spike', Digit5:'walker', Digit6:'shooter', Digit7:'checkpoint', Digit8:'goal', Digit9:'erase' }; if(num[ev.code]){ setTool(num[ev.code]); }
});

window.addEventListener('keyup', function(ev){ if(ev.code === 'Space'){ ed.spaceDown = false; if(!ed.panning) cvs.style.cursor = ''; } });

function buildTools(){
  var box = $('tools'); box.innerHTML = '';
  TOOLS.forEach(function(t){
    var b = document.createElement('button'); b.className = 'tool' + (ed.tool === t.id ? ' active' : ''); b.dataset.tool = t.id;
    b.innerHTML = '<span class="dot" style="background:' + t.color + '"></span><span>' + t.name + '</span><span class="kbd">' + t.key + '</span>';
    b.addEventListener('click', function(){ setTool(t.id); }); box.appendChild(b);
  });
}
function setTool(id){
  ed.tool = id; var els = document.querySelectorAll('.tool');
  for(var i = 0; i < els.length; i++){ els[i].classList.toggle('active', els[i].dataset.tool === id); }
  cvs.style.cursor = id === 'erase' ? 'not-allowed' : (id === 'select' ? 'default' : 'crosshair');
}

function refreshInspector(){
  var box = $('inspector');
  if(!ed.selected){ box.innerHTML = '<div class="empty">未选中对象<br><span>用「选择」工具点击对象，或使用左侧工具在画布上拖拽绘制</span></div>'; return; }
  var type = ed.selected.type, e = ed.selected.e, fields = FIELDS[type] || [], html = '<div class="type-tag" style="color:' + TYPE_COLOR[type] + '">' + TYPE_NAME[type] + '</div>';
  fields.forEach(function(k){ var meta = FIELD_META[k] || { label:k, step:1 }, val = (e[k] === undefined ? 0 : e[k]); html += '<div class="field"><label>' + meta.label + '</label><input type="number" data-key="' + k + '" value="' + val + '" step="' + (meta.step || 1) + '"' + (meta.min !== undefined ? ' min="' + meta.min + '"' : '') + '></div>'; });
  if(type === 'checkpoint') html += '<button class="mini-btn" id="cp-auto">↧ 重生点对齐到检查点底部</button>';
  if(type === 'mover') html += '<button class="mini-btn" id="mv-reset">↺ 重置相位</button>';
  box.innerHTML = html;
  var inputs = box.querySelectorAll('input[data-key]');
  for(var i = 0; i < inputs.length; i++){
    (function(inp){
      inp.addEventListener('change', function(){
        var k = inp.dataset.key, v = parseFloat(inp.value); if(isNaN(v)) v = 0; var meta = FIELD_META[k] || {}; if(meta.min !== undefined && v < meta.min) v = meta.min;
        pushHistory(); ed.selected.e[k] = v;
        if(ed.selected.type === 'mover'){ if(k === 'x'){ ed.selected.e.ox = v; } if(k === 'y'){ ed.selected.e.oy = v; } }
        if(ed.selected.type === 'walker'){ if(k === 'x'){ ed.selected.e.minX = v - 100; ed.selected.e.maxX = v + ed.selected.e.w + 100; refreshInspector(); } }
        refreshObjList(); ed.dirty = true;
      });
    })(inputs[i]);
  }
  var cpAuto = box.querySelector('#cp-auto');
  if(cpAuto){ cpAuto.addEventListener('click', function(){ pushHistory(); var c = ed.selected.e; c.spawnX = Math.round(c.x + c.w/2 - 7); c.spawnY = Math.round(c.y + c.h - 22); refreshInspector(); ed.dirty = true; }); }
  var mvReset = box.querySelector('#mv-reset');
  if(mvReset){ mvReset.addEventListener('click', function(){ pushHistory(); ed.selected.e.phase = 0; refreshInspector(); }); }
}

function refreshObjList(){
  var box = $('objlist'), list = collectEntities();
  if(!list.length){ box.innerHTML = '<div class="obj-item" style="cursor:default;color:#3a3f58">（空）</div>'; return; }
  var html = '';
  for(var i = 0; i < list.length; i++){ var it = list[i], sel = (ed.selected && ed.selected.e === it.e) ? ' sel' : '', name = TYPE_NAME[it.type], coord = 'x:' + Math.round(it.e.x) + ' y:' + Math.round(it.e.y); html += '<div class="obj-item' + sel + '" data-idx="' + i + '"><span class="dot" style="background:' + TYPE_COLOR[it.type] + '"></span><span class="nm">' + name + ' <span style="opacity:.55">' + coord + '</span></span></div>'; }
  box.innerHTML = html;
  var items = box.querySelectorAll('.obj-item[data-idx]');
  for(var j = 0; j < items.length; j++){
    (function(el){
      el.addEventListener('click', function(){ var idx = parseInt(el.dataset.idx, 10), l = collectEntities(); if(l[idx]){ ed.selected = l[idx]; refreshInspector(); refreshObjList(); ed.dirty = true; } });
      el.addEventListener('dblclick', function(){ var idx = parseInt(el.dataset.idx, 10), l = collectEntities(); if(!l[idx]) return; var e = l[idx].e; ed.cam.x = e.x + e.w/2 - viewW / (2 * ed.zoom); ed.cam.y = e.y + e.h/2 - viewH / (2 * ed.zoom); ed.dirty = true; });
    })(items[j]);
  }
}

function refreshWorldInputs(){ $('world-w').value = level.worldW; $('world-h').value = level.worldH; $('spawn-x').value = level.spawn.x; $('spawn-y').value = level.spawn.y; }
function bindWorldInputs(){
  $('world-w').addEventListener('change', function(){ var v = clamp(parseInt(this.value, 10) || 4000, 400, 20000); pushHistory(); level.worldW = v; this.value = v; ed.dirty = true; });
  $('world-h').addEventListener('change', function(){ var v = clamp(parseInt(this.value, 10) || 540, 200, 3000); pushHistory(); level.worldH = v; this.value = v; ed.dirty = true; });
  $('spawn-x').addEventListener('change', function(){ var v = parseInt(this.value, 10) || 0; pushHistory(); level.spawn.x = v; this.value = v; ed.dirty = true; });
  $('spawn-y').addEventListener('change', function(){ var v = parseInt(this.value, 10) || 0; pushHistory(); level.spawn.y = v; this.value = v; ed.dirty = true; });
  $('snap-toggle').addEventListener('change', function(){ ed.snap = this.checked; });
  $('grid-size').addEventListener('change', function(){ var v = clamp(parseInt(this.value, 10) || 10, 1, 200); ed.gridSize = v; this.value = v; ed.dirty = true; });
}

function refreshAll(){ refreshInspector(); refreshObjList(); refreshWorldInputs(); updateHistoryButtons(); ed.dirty = true; }

function serializeLevel(){
  var movers = level.movers.map(function(m){ return { x: m.x, y: m.y, w: m.w, h: m.h, ox: m.x, oy: m.y, ax: m.ax, ay: m.ay, spd: m.spd, phase: m.phase || 0, dx: 0, dy: 0 }; });
  var cps = level.checkpoints.map(function(c){ return { x: c.x, y: c.y, w: c.w, h: c.h, spawnX: c.spawnX, spawnY: c.spawnY, active: false }; });
  return { worldW: level.worldW, worldH: level.worldH, spawn: { x: level.spawn.x, y: level.spawn.y }, solids: level.solids, movers: movers, spikes: level.spikes, enemies: level.enemies, checkpoints: cps, goal: level.goal || { x: 0, y: 0, w: 0, h: 0 } };
}

function generateGameHTML(){
  var lv = serializeLevel();
  var block = [ '/* ---- 关卡数据（由编辑器生成） ---- */', 'var WORLD_W = ' + lv.worldW + ';', 'var WORLD_H = ' + lv.worldH + ';', 'var SPAWN = { x: ' + lv.spawn.x + ', y: ' + lv.spawn.y + ' };', '', 'var staticSolids = ' + JSON.stringify(lv.solids) + ';', '', 'var movers = ' + JSON.stringify(lv.movers) + ';', '', 'var spikes = ' + JSON.stringify(lv.spikes) + ';', '', 'var enemies = ' + JSON.stringify(lv.enemies) + ';', '', 'var checkpoints = ' + JSON.stringify(lv.checkpoints) + ';', '', 'var goal = ' + JSON.stringify(lv.goal) + ';' ].join('\n');
  return gameTemplateStr.replace('/*__LEVEL_DATA__*/', function(){ return block; });
}

var currentBlobUrl = null;
function testPlay(){
  if(!gameTemplateStr) { alert("模板还未加载完毕，请稍等..."); return; }
  try{
    var html = generateGameHTML(), blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    if(currentBlobUrl){ URL.revokeObjectURL(currentBlobUrl); }
    currentBlobUrl = URL.createObjectURL(blob);
    var iframe = $('test-frame');
    
    // 监听 iframe 加载完成，强制让其获取焦点，否则无法响应键盘事件
    iframe.onload = function() { 
      try { iframe.contentWindow.focus(); } catch(e) {}
    };
    iframe.src = currentBlobUrl;
    $('test-overlay').classList.remove('hidden');
  }catch(err){ alert('生成测试页面失败：' + err.message); }
}
function closeTest(){ $('test-overlay').classList.add('hidden'); $('test-frame').src = 'about:blank'; if(currentBlobUrl){ URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; } }
function downloadBlob(blob, filename){ var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 200); }
function exportHTML(){ var html = generateGameHTML(); downloadBlob(new Blob([html], { type:'text/html;charset=utf-8' }), 'i-wanna-shoot.html'); }
function saveJSON(){ var data = JSON.stringify(serializeLevel(), null, 2); downloadBlob(new Blob([data], { type:'application/json;charset=utf-8' }), 'level.json'); }

function loadJSON(){
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.addEventListener('change', function(){
    var f = inp.files && inp.files[0]; if(!f) return;
    var reader = new FileReader();
    reader.onload = function(){
      try{
        var d = JSON.parse(reader.result); if(!d || typeof d !== 'object') throw new Error('格式错误'); pushHistory();
        level.worldW = d.worldW || 4000; level.worldH = d.worldH || 540; level.spawn = d.spawn || { x:60, y:458 }; level.solids = d.solids || [];
        level.movers = (d.movers || []).map(function(m){ return { x:m.x, y:m.y, w:m.w, h:m.h, ax:m.ax||0, ay:m.ay||0, spd:m.spd||0.02, phase:m.phase||0 }; });
        level.spikes = d.spikes || [];
        level.enemies = (d.enemies || []).map(function(e){ if(e.type === 'walker'){ return { type:'walker', x:e.x, y:e.y, w:e.w, h:e.h, minX:e.minX, maxX:e.maxX, vx:e.vx || 1.5 }; } return { type:'shooter', x:e.x, y:e.y, w:e.w, h:e.h, baseY: e.baseY !== undefined ? e.baseY : e.y, phase: e.phase || 0, cd: e.cd || 90 }; });
        level.checkpoints = (d.checkpoints || []).map(function(c){ return { x:c.x, y:c.y, w:c.w, h:c.h, spawnX: c.spawnX !== undefined ? c.spawnX : Math.round(c.x + c.w/2 - 7), spawnY: c.spawnY !== undefined ? c.spawnY : Math.round(c.y + c.h - 22) }; });
        level.goal = d.goal && d.goal.w ? d.goal : null; ed.selected = null; refreshAll(); fitView(); render();
      }catch(err){ alert('加载失败：' + err.message); }
    }; reader.readAsText(f);
  }); inp.click();
}

async function init(){
  buildTools(); bindWorldInputs();
  $('btn-undo').addEventListener('click', doUndo); $('btn-redo').addEventListener('click', doRedo); $('btn-fit').addEventListener('click', fitView); $('btn-test').addEventListener('click', testPlay); $('btn-close-test').addEventListener('click', closeTest); $('btn-export').addEventListener('click', exportHTML); $('btn-save').addEventListener('click', saveJSON); $('btn-load').addEventListener('click', loadJSON);
  
  window.addEventListener('resize', function(){ safeResize(); ed.dirty = true; });
  
  resizeCanvas(); fitView(); refreshAll();
  
  // 修复：把 ResizeObserver 的死循环警告降至最低，并用 rAF 防止报错
  if(window.ResizeObserver){ 
    new ResizeObserver(function(){ 
      safeResize(); 
    }).observe(cvs.parentElement); 
  }

  // 异步获取游戏模板
  try {
    const resp = await fetch('./game/template.html');
    if(!resp.ok) throw new Error("HTTP " + resp.status + " - 找不到 game/template.html");
    gameTemplateStr = await resp.text();
  } catch (e) {
    if (window.location.protocol === 'file:') {
      alert("浏览器 CORS 安全策略禁止读取本地文件。\n\n请务必使用本地服务器（如 VSCode 的 Live Server 插件）运行，或直接部署到 GitHub Pages 上访问。");
    } else {
      alert("加载游戏模板失败，请确保 game/template.html 路径正确。\n错误信息：" + e.message);
    }
  }

  requestAnimationFrame(loop);
  window.__editorInited = true;
}

init();
})();
