/*
 * draw.js —— 渲染：背景、地形、尖刺、敌人、子弹、粒子、HUD
 *
 * 只读状态、只调 canvas，不改任何逻辑数据（唯一例外是背景星数组，属于纯视觉缓存）。
 */
(function (IW) {
  'use strict';

  IW.makeDrawers = function (S) {
    var ctx = S.ctx, W = S.W, H = S.H;
    var state = S.state, player = S.player;
    var bullets = S.bullets, enemyBullets = S.enemyBullets, particles = S.particles;
    var enemies = S.enemies, adv_spikes = S.adv_spikes, movers = S.movers;
    var solids = S.solids, spikes = S.spikes;
    var checkpoints = S.checkpoints, goal = S.goal;
    var healthpacks = S.healthpacks, weapons = S.weapons;
    var mouse = S.mouse, aim = S.aim;
    var clamp = S.clamp, rnd = S.rnd;
    var isAdvSpikeVisible = S.isAdvSpikeVisible;
    var isTouchDevice = S.isTouchDevice;

    /* ---------- 背景星 ---------- */
    var stars = [];
    for(var si=0;si<160;si++){
      stars.push({
        x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*1.6 + 0.3,
        d: Math.random()*0.7 + 0.15,
        a: Math.random()*0.6 + 0.25
      });
    }

    function drawBackground(){
      var g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#07070f'); g.addColorStop(0.55,'#100e1e'); g.addColorStop(1,'#1c1330');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

      for(var i=0;i<stars.length;i++){
        var s = stars[i];
        var x = s.x - state.camX * s.d;
        x = ((x % W) + W) % W;
        ctx.globalAlpha = s.a;
        ctx.fillStyle = '#9fb4ff';
        ctx.fillRect(x, s.y, s.r, s.r);
      }
      ctx.globalAlpha = 1;

      var mx = 780 - state.camX * 0.08;
      ctx.globalAlpha = 0.55;
      var mg = ctx.createRadialGradient(mx, 110, 10, mx, 110, 90);
      mg.addColorStop(0, 'rgba(160,180,255,0.45)');
      mg.addColorStop(1, 'rgba(160,180,255,0)');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(mx, 110, 90, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#20264a'; ctx.beginPath(); ctx.arc(mx, 110, 42, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#2b3260'; ctx.beginPath(); ctx.arc(mx - 14, 100, 8, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 12, 124, 5, 0, Math.PI*2); ctx.fill();
    }

    function drawSolids(){
      for(var i=0;i<solids.length;i++){
        var s = solids[i];
        if(s._hidden) continue;
        if(s.x + s.w < state.camX - 120 || s.x > state.camX + W + 120) continue;
        var isMover = movers.indexOf(s) >= 0;

        ctx.fillStyle = isMover ? '#3b2f5e' : '#242440';
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = isMover ? '#8b6ee8' : '#4d4d7d';
        ctx.fillRect(s.x, s.y, s.w, 3);
        ctx.fillStyle = isMover ? '#a78bfa' : '#6a6aa8';
        ctx.fillRect(s.x, s.y, s.w, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(s.x, s.y + s.h - 3, s.w, 3);
      }
    }

    function drawSpikes(){
      for(var i=0;i<spikes.length;i++){
        var s = spikes[i];
        if(s.x + s.w < state.camX - 120 || s.x > state.camX + W + 120) continue;
        var n = Math.max(1, Math.round(s.w / 14));
        var tw = s.w / n;
        for(var j=0;j<n;j++){
          var x = s.x + j*tw;
          ctx.beginPath();
          ctx.moveTo(x, s.y + s.h);
          ctx.lineTo(x + tw/2, s.y);
          ctx.lineTo(x + tw, s.y + s.h);
          ctx.closePath();
          ctx.fillStyle = '#e94560'; ctx.fill();

          ctx.beginPath();
          ctx.moveTo(x + tw/2, s.y);
          ctx.lineTo(x + tw*0.72, s.y + s.h);
          ctx.lineTo(x + tw/2, s.y + s.h);
          ctx.closePath();
          ctx.fillStyle = 'rgba(255,180,200,0.45)'; ctx.fill();
        }
      }
    }

    function drawAdvSpikes(layer){
      for(var i=0;i<adv_spikes.length;i++){
        var s = adv_spikes[i];
        if(s.layer !== layer) continue;
        if(s._hidden) continue;
        if(s.x + s.w < state.camX - 120 || s.x > state.camX + W + 120) continue;
        if(!isAdvSpikeVisible(s)) continue;

        var cx = s.x + s.w/2, cy = s.y + s.h/2;
        var rad = Math.max(s.w, s.h) / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = '#ff8c00';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;

        if (s.shape === 'triangle') {
          var n = 4, tw = s.w / n;
          for(var j=0;j<n;j++){
            var x = -s.w/2 + j*tw;
            ctx.beginPath();
            ctx.moveTo(x, s.h/2);
            ctx.lineTo(x + tw/2, -s.h/2);
            ctx.lineTo(x + tw, s.h/2);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
          }
        } else if (s.shape === 'square') {
          ctx.fillRect(-s.w/2, -s.h/2, s.w, s.h);
          ctx.strokeRect(-s.w/2, -s.h/2, s.w, s.h);
        } else if (s.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, rad, 0, Math.PI*2);
          ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }
    }

    function drawCheckpoints(){
      for(var i=0;i<checkpoints.length;i++){
        var c = checkpoints[i];
        if(c.x + c.w < state.camX - 120 || c.x > state.camX + W + 120) continue;

        if (c.type === 'trigger') {
          ctx.fillStyle = c.active ? 'rgba(74,222,128,0.2)' : 'rgba(56,189,248,0.2)';
          ctx.fillRect(c.x, c.y, c.w, c.h);
          ctx.fillStyle = c.active ? '#4ade80' : '#38bdf8';
          ctx.fillRect(c.x + c.w/2 - 1, c.y, 2, c.h);
          if(c.active){
            ctx.globalAlpha = 0.25 + Math.sin(state.t*0.1)*0.12;
            ctx.fillStyle = '#4ade80';
            ctx.beginPath(); ctx.arc(c.x + c.w/2, c.y + c.h/2, 20, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
          }
        } else {
          ctx.fillStyle = c.active ? '#9aa4c0' : '#4a4a68';
          ctx.fillRect(c.x + c.w/2 - 2, c.y, 4, c.h);

          var wave = Math.sin(state.t * 0.08) * 3;
          ctx.beginPath();
          ctx.moveTo(c.x + c.w/2 + 2, c.y + 4);
          ctx.lineTo(c.x + c.w/2 + 24, c.y + 12 + wave);
          ctx.lineTo(c.x + c.w/2 + 2, c.y + 22);
          ctx.closePath();
          ctx.fillStyle = c.active ? '#4ade80' : '#3a3a55';
          ctx.fill();

          if(c.active){
            ctx.globalAlpha = 0.25 + Math.sin(state.t*0.1)*0.12;
            ctx.fillStyle = '#4ade80';
            ctx.beginPath(); ctx.arc(c.x + c.w/2, c.y + 20, 22, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    function drawGoal(){
      var g = goal;
      if(g.x + g.w < state.camX - 160 || g.x > state.camX + W + 160) return;

      var pulse = Math.sin(state.t * 0.09) * 0.5 + 0.5;
      var rg = ctx.createRadialGradient(g.x + g.w/2, g.y + g.h/2, 4, g.x + g.w/2, g.y + g.h/2, 70);
      rg.addColorStop(0, 'rgba(253,224,71,' + (0.35 + pulse*0.25) + ')');
      rg.addColorStop(1, 'rgba(253,224,71,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(g.x - 60, g.y - 60, g.w + 120, g.h + 120);

      ctx.fillStyle = '#fde047'; ctx.fillRect(g.x, g.y, g.w, g.h);
      ctx.fillStyle = '#0b0b18'; ctx.fillRect(g.x + 5, g.y + 5, g.w - 10, g.h - 5);

      ctx.globalAlpha = 0.5 + pulse * 0.5;
      ctx.fillStyle = '#fef9c3';
      for(var i=0;i<4;i++) ctx.fillRect(g.x + 9, g.y + 14 + i*16, g.w - 18, 3);
      ctx.globalAlpha = 1;
    }

    function drawEnemies(){
      for(var i=0;i<enemies.length;i++){
        var e = enemies[i];
        if(!e.alive || e._hidden) continue;
        if(e.x + e.w < state.camX - 120 || e.x > state.camX + W + 120) continue;

        if(e.type === 'walker'){
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(e.x, e.y, e.w, e.h);
          ctx.fillStyle = '#b45309';
          ctx.fillRect(e.x, e.y + e.h - 6, e.w, 6);
          ctx.fillStyle = '#1a0a00';
          var ex = e.vx > 0 ? e.x + e.w - 9 : e.x + 3;
          ctx.fillRect(ex, e.y + 8, 5, 5);
          ctx.fillStyle = '#fff7ed';
          ctx.fillRect(e.x + 5, e.y + e.h - 12, 3, 4);
          ctx.fillRect(e.x + e.w - 9, e.y + e.h - 12, 3, 4);

          if (e.maxHp > 1) {
            var pct = clamp(e.hp / e.maxHp, 0, 1);
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x, e.y - 6, e.w, 3);
            ctx.fillStyle = '#e94560'; ctx.fillRect(e.x, e.y - 6, e.w * pct, 3);
          }
        } else if(e.type === 'shooter'){
          var cx = e.x + e.w/2, cy = e.y + e.h/2;
          var rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
          rg.addColorStop(0, 'rgba(233,69,96,0.5)');
          rg.addColorStop(1, 'rgba(233,69,96,0)');
          ctx.fillStyle = rg;
          ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI*2); ctx.fill();

          ctx.fillStyle = '#e94560';
          ctx.beginPath(); ctx.arc(cx, cy, e.w/2, 0, Math.PI*2); ctx.fill();

          ctx.fillStyle = '#1a0a12';
          ctx.beginPath(); ctx.arc(cx, cy, e.w/4, 0, Math.PI*2); ctx.fill();

          var pulse = Math.sin(state.t*0.15)*0.5+0.5;
          ctx.fillStyle = 'rgba(255,220,120,' + (0.5+pulse*0.5) + ')';
          ctx.beginPath(); ctx.arc(cx, cy, 3.5 + pulse*1.5, 0, Math.PI*2); ctx.fill();

          if (e.maxHp > 1) {
            var pct2 = clamp(e.hp / e.maxHp, 0, 1);
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.x, e.y - 6, e.w, 3);
            ctx.fillStyle = '#e94560'; ctx.fillRect(e.x, e.y - 6, e.w * pct2, 3);
          }
        }
      }
    }

    function drawBullets(){
      for(var i=0;i<bullets.length;i++){
        var b = bullets[i];
        var def = IW.weaponDef(b.type);
        var trail = b.pierce ? 26 : 14;      // 狙击弹拖尾更长
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx));
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = def.color; ctx.fillRect(-trail, -1.5, trail, 3);
        ctx.globalAlpha = 1;
        ctx.fillStyle = def.color; ctx.fillRect(-3, -2.5, 8, 5);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -1.5, 4, 3);
        ctx.restore();
      }
      for(var j=0;j<enemyBullets.length;j++){
        var eb = enemyBullets[j];
        var rg = ctx.createRadialGradient(eb.x, eb.y, 0, eb.x, eb.y, 10);
        rg.addColorStop(0, 'rgba(255,120,160,1)');
        rg.addColorStop(1, 'rgba(233,69,96,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(eb.x, eb.y, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff6b8a';
        ctx.beginPath(); ctx.arc(eb.x, eb.y, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(eb.x, eb.y, 1.8, 0, Math.PI*2); ctx.fill();
      }
    }

    /* ---------- 血包：绿色十字 ---------- */
    function drawHealthPacks(){
      for(var i=0;i<healthpacks.length;i++){
        var h = healthpacks[i];
        if(!h.active) continue;
        if(h.x + h.w < state.camX - 120 || h.x > state.camX + W + 120) continue;

        var cx = h.x + h.w/2, cy = h.y + h.h/2;
        var half = Math.min(h.w, h.h) / 2;
        var pulse = 0.5 + Math.sin(state.t * 0.1) * 0.5;

        var rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, half + 12 + pulse * 6);
        rg.addColorStop(0, 'rgba(74,222,128,0.45)');
        rg.addColorStop(1, 'rgba(74,222,128,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(cx, cy, half + 12 + pulse * 6, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = '#065f46';
        ctx.fillRect(cx - half - 1, cy - half - 1, half*2 + 2, half*2 + 2);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(cx - half*0.32, cy - half*0.9, half*0.64, half*1.8);
        ctx.fillRect(cx - half*0.9, cy - half*0.32, half*1.8, half*0.64);
        ctx.fillStyle = 'rgba(226,255,238,0.9)';
        ctx.fillRect(cx - half*0.14, cy - half*0.72, half*0.28, half*1.44);
        ctx.fillRect(cx - half*0.72, cy - half*0.14, half*1.44, half*0.28);
      }
    }

    /* ---------- 地上的武器 ---------- */
    function drawWeaponItems(){
      for(var i=0;i<weapons.length;i++){
        var w = weapons[i];
        if(!w.alive) continue;
        if(w.x + w.w < state.camX - 120 || w.x > state.camX + W + 120) continue;

        var def = IW.weaponDef(w.type);
        var cx = w.x + w.w/2, cy = w.y + w.h/2 + Math.sin(state.t * 0.06 + i) * 1.5;
        var pulse = 0.5 + Math.sin(state.t * 0.12) * 0.5;

        var rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22 + pulse * 6);
        rg.addColorStop(0, 'rgba(148,163,184,0.3)');
        rg.addColorStop(1, 'rgba(148,163,184,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(cx, cy, 22 + pulse * 6, 0, Math.PI*2); ctx.fill();

        ctx.save();
        ctx.translate(cx, cy);
        if(w.type === 'rifle'){
          ctx.fillStyle = '#475569'; ctx.fillRect(-13, -3, 21, 6);
          ctx.fillStyle = '#94a3b8'; ctx.fillRect(6, -2, 9, 4);
          ctx.fillStyle = '#334155'; ctx.fillRect(-9, 3, 5, 6);
        } else if(w.type === 'shotgun'){
          ctx.fillStyle = '#7c2d12'; ctx.fillRect(-15, 0, 14, 6);
          ctx.fillStyle = def.color; ctx.fillRect(-2, -5, 16, 4);
          ctx.fillRect(-2, 0, 16, 4);
        } else {
          ctx.fillStyle = '#4c1d95'; ctx.fillRect(-16, -2, 25, 5);
          ctx.fillStyle = def.color; ctx.fillRect(7, -1.5, 13, 3);
          ctx.fillStyle = '#c4b5fd'; ctx.fillRect(-7, -8, 11, 5);
          ctx.fillStyle = '#312e81'; ctx.fillRect(-8, 3, 6, 5);
        }
        ctx.restore();

        /* 武器颜色的小圆点，方便一眼区分 */
        ctx.fillStyle = def.color;
        ctx.beginPath(); ctx.arc(cx + 16, cy - 8, 2.5, 0, Math.PI*2); ctx.fill();
      }
    }

    /* ---------- 长按 Q 的丢枪读条 ---------- */
    function drawDropProgress(){
      var p = player;
      if(p.qHold < 0 || p.weapons.length === 0) return;
      var pr = clamp(p.qHold / IW.WEAPON_DROP_HOLD, 0, 1);
      var bx = p.x + p.w/2 - 26, by = p.y - 18;
      ctx.fillStyle = 'rgba(8,8,16,0.82)';
      ctx.fillRect(bx, by, 52, 8);
      ctx.fillStyle = pr >= 1 ? '#f87171' : '#38bdf8';
      ctx.fillRect(bx + 1, by + 1, 50 * pr, 6);
      ctx.strokeStyle = 'rgba(160,180,220,0.65)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, 51, 7);
    }

    function drawPlayer(){
      var p = player;

      if(state.mode === 'dead'){
        var t = 1 - state.deadTimer / 28;
        ctx.globalAlpha = Math.max(0, 1 - t*1.4);
        ctx.fillStyle = '#e94560';
        ctx.fillRect(p.x - 4*t, p.y - 4*t, p.w + 8*t, p.h + 8*t);
        ctx.globalAlpha = 1;
        return;
      }

      if(state.mode === 'win') ctx.globalAlpha = 0.6 + Math.sin(state.t*0.3)*0.4;
      if(p.invTimer > 0 && Math.floor(state.t/4)%2===0) { ctx.globalAlpha = 0.3; }

      var cx = p.x + p.w/2, cy = p.y + p.h/2;
      var rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 24);
      rg.addColorStop(0, 'rgba(94,234,212,0.28)');
      rg.addColorStop(1, 'rgba(94,234,212,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI*2); ctx.fill();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(p.aimAngle);
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(2, -2.5, 14, 5);
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(12, -2, 5, 4);
      ctx.restore();

      ctx.fillStyle = '#5eead4';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);

      ctx.fillStyle = '#062a26';
      if(p.facing >= 0){
        ctx.fillRect(p.x + p.w - 7, p.y + 5, 3, 4);
        ctx.fillRect(p.x + p.w - 3, p.y + 5, 2, 4);
      } else {
        ctx.fillRect(p.x + 2, p.y + 5, 3, 4);
        ctx.fillRect(p.x + 6, p.y + 5, 2, 4);
      }
      ctx.fillStyle = '#0d9488';
      ctx.fillRect(p.x - 1, p.y + p.h - 6, p.w + 2, 3);
      ctx.globalAlpha = 1;
    }

    function drawParticles(){
      for(var i=0;i<particles.length;i++){
        var p = particles[i];
        var a = clamp(p.life / p.maxLife, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        var s = p.size * (0.4 + a * 0.6);
        ctx.fillRect(p.x - s/2, p.y - s/2, s, s);
      }
      ctx.globalAlpha = 1;
    }

    function roundRect(x, y, w, h, r){
      ctx.beginPath();
      ctx.moveTo(x+r, y);
      ctx.arcTo(x+w, y, x+w, y+h, r);
      ctx.arcTo(x+w, y+h, x, y+h, r);
      ctx.arcTo(x, y+h, x, y, r);
      ctx.arcTo(x, y, x+w, y, r);
      ctx.closePath();
    }

    function drawHUD(){
      ctx.fillStyle = 'rgba(10,10,20,0.65)';
      roundRect(14, 14, 192, 36, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(120,150,255,0.3)';
      ctx.lineWidth = 1;
      roundRect(14.5, 14.5, 191, 35, 6); ctx.stroke();

      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 16px "Courier New",monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('☠ 死亡', 26, 33);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(('00' + state.deaths).slice(-3), 118, 33);

      if (player.maxHp <= 8) {
        for (var i=0; i<player.maxHp; i++) {
          ctx.beginPath();
          var hx = 155 + i * 12, hy = 33;
          ctx.arc(hx, hy, 4, 0, Math.PI*2);
          if (i < player.hp) { ctx.fillStyle = '#e94560'; ctx.fill(); }
          else { ctx.strokeStyle = '#e94560'; ctx.lineWidth = 1; ctx.stroke(); }
        }
      } else {
        ctx.font = 'bold 14px "Courier New",monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#e94560';
        ctx.fillText('❤ ' + player.hp + ' / ' + player.maxHp, 155, 33);
      }

      /* ---------- 武器栏：2 格，当前主武器高亮 ---------- */
      var slotY = 56;
      ctx.fillStyle = 'rgba(10,10,20,0.65)';
      roundRect(14, slotY, 192, 30, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(120,150,255,0.22)';
      ctx.lineWidth = 1;
      roundRect(14.5, slotY + 0.5, 191, 29, 6); ctx.stroke();

      for(var s = 0; s < IW.MAX_WEAPON_SLOTS; s++){
        var slot = player.weapons[s];
        var bx2 = 22 + s * 94, by2 = slotY + 5;
        var isActive = !!slot && s === player.weaponIndex;

        ctx.fillStyle = isActive ? 'rgba(94,234,212,0.16)' : 'rgba(255,255,255,0.04)';
        roundRect(bx2, by2, 88, 20, 4); ctx.fill();
        if(isActive){
          ctx.strokeStyle = '#5eead4';
          roundRect(bx2 + 0.5, by2 + 0.5, 87, 19, 4); ctx.stroke();
        }
        ctx.font = 'bold 11px "Courier New",monospace';
        ctx.textAlign = 'left';
        if(slot){
          ctx.fillStyle = isActive ? '#a7fff0' : 'rgba(160,180,220,0.7)';
          ctx.fillText(IW.weaponDef(slot.type).short + ' ×' + slot.damage, bx2 + 8, by2 + 10);
        } else {
          ctx.fillStyle = 'rgba(160,180,220,0.3)';
          ctx.fillText('空', bx2 + 8, by2 + 10);
        }
      }

      ctx.fillStyle = 'rgba(160,180,220,0.55)';
      ctx.font = '13px "Courier New",monospace';
      ctx.textAlign = 'right';
      if (isTouchDevice) {
        ctx.fillText('左下移动 · 右下跳跃 · 点空白射击', W - 18, 32);
      } else {
        ctx.fillText('A/D 移动 · SPACE 跳跃 · 鼠标射击 · Q 换枪(长按丢枪) · R 重来', W - 18, 32);
      }

      var prog = clamp(player.x / (goal.x || 1), 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(W/2 - 180, H - 22, 360, 5);
      ctx.fillStyle = '#5eead4';
      ctx.fillRect(W/2 - 180, H - 22, 360 * prog, 5);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(W/2 + 177, H - 26, 6, 13);
      ctx.fillStyle = '#5eead4';
      ctx.beginPath(); ctx.arc(W/2 - 180 + 360*prog, H - 19.5, 4, 0, Math.PI*2); ctx.fill();

      // 准星：触屏时显示在触摸位置，否则鼠标位置
      var mx = aim.active ? aim.x : mouse.x;
      var my = aim.active ? aim.y : mouse.y;
      ctx.strokeStyle = 'rgba(253,224,71,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 15, my); ctx.lineTo(mx - 5, my);
      ctx.moveTo(mx + 5, my);  ctx.lineTo(mx + 15, my);
      ctx.moveTo(mx, my - 15); ctx.lineTo(mx, my - 5);
      ctx.moveTo(mx, my + 5);  ctx.lineTo(mx, my + 15);
      ctx.stroke();
    }

    function drawDeadOverlay(){
      if(state.mode === 'dead'){
        var a = (state.deadTimer / 28) * 0.35;
        ctx.fillStyle = 'rgba(233,69,96,' + a + ')';
        ctx.fillRect(0,0,W,H);
      }
    }

    function render(){
      ctx.clearRect(0,0,W,H);
      drawBackground();

      var sx = state.shake > 0.2 ? rnd(-state.shake, state.shake) : 0;
      var sy = state.shake > 0.2 ? rnd(-state.shake, state.shake) : 0;

      ctx.save();
      ctx.translate(-Math.round(state.camX) + sx, sy);
      drawSolids();
      drawSpikes();
      drawCheckpoints();
      drawGoal();
      drawHealthPacks();
      drawWeaponItems();
      drawAdvSpikes('bottom');
      drawEnemies();
      drawBullets();
      drawPlayer();
      drawDropProgress();
      drawAdvSpikes('top');
      drawParticles();
      ctx.restore();

      drawHUD();
      drawDeadOverlay();
    }

    return { render: render };
  };
})(window.IW = window.IW || {});
