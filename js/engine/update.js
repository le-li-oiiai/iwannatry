/*
 * update.js —— 每帧的逻辑更新（物理、敌人、子弹、危险检测、死亡与重生）
 *
 * 纯逻辑，不画任何东西。所有状态都放在 S 里（由 engine.js 创建），
 * 这样逻辑和渲染可以各自独立成文件，又共享同一份数据。
 */
(function (IW) {
  'use strict';

  IW.makeUpdaters = function (S) {
    var W = S.W, H = S.H;
    var state = S.state, player = S.player;
    var bullets = S.bullets, enemyBullets = S.enemyBullets, particles = S.particles;
    var enemies = S.enemies, adv_spikes = S.adv_spikes, movers = S.movers;
    var solids = S.solids, staticSolids = S.staticSolids, spikes = S.spikes;
    var checkpoints = S.checkpoints, goal = S.goal;
    var WORLD_W = S.WORLD_W, WORLD_H = S.WORLD_H;
    var keys = S.keys, touchState = S.touchState, aim = S.aim, mouse = S.mouse;
    var clamp = S.clamp, rnd = S.rnd, rectHit = S.rectHit, getHitboxRect = S.getHitboxRect;
    var beep = S.audio.beep;
    var onWin = S.onWin;

    /* ---------- 轨迹运动 ---------- */
    function updatePath(e){
      if(!e.path || e.path.length < 2) return;
      var totalLen = 0, lens = [];
      for(var i=0; i<e.path.length-1; i++){
        var dx = e.path[i+1].x - e.path[i].x;
        var dy = e.path[i+1].y - e.path[i].y;
        var l = Math.hypot(dx, dy);
        lens.push(l); totalLen += l;
      }
      if(totalLen === 0) return;
      if(e.pathDist === undefined) e.pathDist = 0;
      if(e.pathDir === undefined) e.pathDir = 1;

      e.pathDist += (e.pathSpeed || 2) * e.pathDir;
      if(e.pathDist > totalLen){ e.pathDist = totalLen; e.pathDir = -1; }
      if(e.pathDist < 0){ e.pathDist = 0; e.pathDir = 1; }

      var d = e.pathDist;
      for(var i=0; i<lens.length; i++){
        if(d <= lens[i] || i === lens.length - 1){
          var t = d / lens[i]; if(t > 1) t = 1;
          var pcx = e.path[i].x + (e.path[i+1].x - e.path[i].x) * t;
          var pcy = e.path[i].y + (e.path[i+1].y - e.path[i].y) * t;
          e.x = pcx - e.w / 2;
          e.y = pcy - e.h / 2;
          break;
        }
        d -= lens[i];
      }
    }

    /* ---------- 形变 ---------- */
    function updateMorphs(){
      var all = solids.concat(adv_spikes);
      for(var i=0; i<all.length; i++){
        var e = all[i];
        var active = true;

        if (e.hitboxes && e.hitboxes.length) {
          var hasMorphTrigger = false;
          for (var j=0; j<e.hitboxes.length; j++) {
            if (e.hitboxes[j].triggerMorph) { hasMorphTrigger = true; break; }
          }
          if (hasMorphTrigger) active = !!e._morphActivated;
        }

        var newW = e.ow, newH = e.oh;
        var offX = 0, offY = 0;

        if (active && e.morph === 'pulse') {
          var scale = 1 + Math.sin(state.t * 0.1) * 0.2;
          newW = e.ow * scale; newH = e.oh * scale;
        } else if (active && e.morph === 'stretch') {
          var p;
          if (e.morphLoop === false) {
            if (e._morphStartT === undefined) e._morphStartT = state.t;
            p = clamp((state.t - e._morphStartT) / 60, 0, 1);
          } else {
            p = (Math.sin(state.t * 0.05) + 1) / 2;
          }
          newW = e.ow + ((e.targetW || e.ow) - e.ow) * p;
          newH = e.oh + ((e.targetH || e.oh) - e.oh) * p;
          offX = (e.targetOffX || 0) * p;
          offY = (e.targetOffY || 0) * p;
        }

        var prevOffX = e._morphOffX || 0, prevOffY = e._morphOffY || 0;
        if (newW !== e.w || newH !== e.h || offX !== prevOffX || offY !== prevOffY) {
          var cx = e.x + e.w / 2, cy = e.y + e.h / 2;
          var ddx = offX - prevOffX, ddy = offY - prevOffY;
          e.w = newW; e.h = newH;
          e.x = cx + ddx - e.w / 2;
          e.y = cy + ddy - e.h / 2;
          e._morphOffX = offX; e._morphOffY = offY;
        }
      }
    }

    /* ---------- 粒子 ---------- */
    function addParticles(x, y, n, color, spd, life){
      life = life || 30;
      for(var i=0;i<n;i++){
        var a = Math.random()*Math.PI*2, s = rnd(spd*0.3, spd);
        particles.push({
          x: x, y: y,
          vx: Math.cos(a)*s, vy: Math.sin(a)*s - 1,
          life: rnd(life*0.5, life), maxLife: life,
          color: color, size: rnd(1.5, 3.5)
        });
      }
    }
    function updateParticles(){
      for(var i=particles.length-1;i>=0;i--){
        var p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.97; p.life--;
        if(p.life <= 0) particles.splice(i,1);
      }
    }

    /* ---------- 物理移动 ---------- */
    function moveEntity(e, list){
      e.x += e.vx;
      for(var i=0;i<list.length;i++){
        var s = list[i];
        if(s._hidden) continue;
        if(rectHit(e, s)){
          if(e.vx > 0) e.x = s.x - e.w;
          else if(e.vx < 0) e.x = s.x + s.w;
          e.vx = 0;
        }
      }
      e.y += e.vy;
      e.onGround = false; e.ground = null;
      for(var j=0;j<list.length;j++){
        var t = list[j];
        if(t._hidden) continue;
        if(rectHit(e, t)){
          if(e.vy >= 0){ e.y = t.y - e.h; e.vy = 0; e.onGround = true; e.ground = t; }
          else { e.y = t.y + t.h; e.vy = 0; }
        }
      }
    }

    /* ---------- 移动平台 ---------- */
    function updateMovers(){
      for(var i=0;i<movers.length;i++){
        var m = movers[i], px = m.x, py = m.y;

        var triggerMove = false, hasMoveTrigger = false;
        if (m.hitboxes) {
          for(var j=0; j<m.hitboxes.length; j++){
            var h = m.hitboxes[j];
            if (h.triggerMove) {
              hasMoveTrigger = true;
              var hmTc = h.triggerCount || 0;
              if (hmTc === 0) {
                if (rectHit(player, getHitboxRect(m, h, state.t))) triggerMove = true;
              } else if (h._hits >= hmTc) {
                triggerMove = true;
              }
            }
          }
        }

        m._activeMove = hasMoveTrigger ? triggerMove : true;

        if (m._activeMove) {
          if (m.path && m.path.length >= 2) {
            updatePath(m);
          } else {
            m.phase += m.spd;
            m.x = m.ox + Math.sin(m.phase) * m.ax;
            m.y = m.oy + Math.sin(m.phase) * m.ay;
          }
        }

        m.dx = m.x - px; m.dy = m.y - py;
        if(player.onGround && player.ground === m && state.mode === 'play'){
          player.x += m.dx; player.y += m.dy;
        }
      }
    }

    /* ---------- 玩家 ---------- */
    function updatePlayer(){
      var p = player;

      if (p.slowTimer > 0) p.slowTimer--;
      if (p.fastTimer > 0) p.fastTimer--;
      if (p.bounceCd > 0) p.bounceCd--;

      var spdMod = 1;
      if (p.slowTimer > 0) spdMod = 0.5;
      else if (p.fastTimer > 0) spdMod = 1.8;

      var ax = 0;
      if(keys['ArrowLeft'] || keys['KeyA'] || touchState.left) ax--;
      if(keys['ArrowRight']|| keys['KeyD'] || touchState.right) ax++;
      if(ax !== 0){ p.vx += ax * 1.25 * spdMod; p.facing = ax; }
      else { p.vx *= 0.78; if(Math.abs(p.vx) < 0.15) p.vx = 0; }
      p.vx = clamp(p.vx, -4.6 * spdMod, 4.6 * spdMod);

      p.vy += 0.62;
      if(p.vy > 15) p.vy = 15;

      moveEntity(p, solids);

      if(p.onGround){ p.jumpsLeft = 1; p.coyote = 8; }
      else if(p.coyote > 0) p.coyote--;

      if(p.jumpBuffer > 0) p.jumpBuffer--;
      if(p.jumpBuffer > 0){
        if(p.onGround || p.coyote > 0){
          p.vy = -11.6; p.jumpsLeft = 1; p.coyote = 0; p.onGround = false; p.jumpBuffer = 0;
          addParticles(p.x + p.w/2, p.y + p.h, 6, '#5eead4', 2.5, 18);
          beep(430, 0.07, 'square', 0.018);
        } else if(p.jumpsLeft > 0){
          p.vy = -10.2; p.jumpsLeft = 0; p.jumpBuffer = 0;
          addParticles(p.x + p.w/2, p.y + p.h, 12, '#a78bfa', 4, 22);
          beep(680, 0.08, 'square', 0.018);
        }
      }

      if(p.invTimer > 0) p.invTimer--;

      // 瞄准：触屏优先，否则鼠标
      var aimX = aim.active ? aim.x : mouse.x;
      var aimY = aim.active ? aim.y : mouse.y;
      var wmx = aimX + state.camX;
      p.aimAngle = Math.atan2(aimY - (p.y + p.h/2), wmx - (p.x + p.w/2));

      if(p.shootCd > 0) p.shootCd--;
      var wantShoot = mouse.down || keys['KeyJ'] || aim.active;
      if(wantShoot && p.shootCd <= 0){
        shoot();
        p.shootCd = 9;
      }

      checkHitboxTriggers();
      checkHazards();
    }

    function shoot(){
      var p = player, a = p.aimAngle;
      var cx = p.x + p.w/2 + Math.cos(a)*14;
      var cy = p.y + p.h/2 + Math.sin(a)*14;
      bullets.push({ x: cx, y: cy, vx: Math.cos(a)*14, vy: Math.sin(a)*14, life: 80 });
      p.vx -= Math.cos(a) * 0.6;
      addParticles(cx, cy, 4, '#fde047', 3, 12);
      state.shake = Math.max(state.shake, 2.2);
      beep(900 + rnd(-60,60), 0.045, 'square', 0.012);
    }

    /* ---------- 子弹 ---------- */
    function updateBullets(){
      for(var i=bullets.length-1;i>=0;i--){
        var b = bullets[i];
        b.x += b.vx; b.y += b.vy; b.life--;
        var hit = b.life <= 0;

        if(!hit){
          for(var k=0;k<solids.length;k++){
            var s = solids[k];
            if(s._hidden) continue;
            if(b.x > s.x && b.x < s.x+s.w && b.y > s.y && b.y < s.y+s.h){ hit = true; break; }
          }
        }
        if(!hit){
          for(var m=0;m<enemies.length;m++){
            var e = enemies[m];
            if(!e.alive || e._hidden) continue;
            if(b.x > e.x && b.x < e.x+e.w && b.y > e.y && b.y < e.y+e.h){
              e.hp = (e.hp === undefined ? 1 : e.hp) - 1;
              hit = true;
              if (e.hp <= 0) {
                e.alive = false;
                addParticles(b.x, b.y, 16, '#f59e0b', 5.5, 30);
                addParticles(b.x, b.y, 8, '#fde047', 3.5, 20);
                state.shake = 8; beep(260, 0.13, 'sawtooth', 0.03);
              } else {
                addParticles(b.x, b.y, 8, '#f59e0b', 3.5, 16);
                beep(620, 0.05, 'square', 0.02);
              }
              break;
            }
          }
        }
        if(hit) bullets.splice(i,1);
      }

      for(var n=enemyBullets.length-1;n>=0;n--){
        var eb = enemyBullets[n];
        eb.x += eb.vx; eb.y += eb.vy; eb.life--;
        var ehit = eb.life <= 0;

        if(!ehit){
          for(var q=0;q<solids.length;q++){
            var ss = solids[q];
            if(ss._hidden) continue;
            if(eb.x > ss.x && eb.x < ss.x+ss.w && eb.y > ss.y && eb.y < ss.y+ss.h){ ehit = true; break; }
          }
        }
        if(!ehit && state.mode === 'play'){
          if(rectHit({x:eb.x-3,y:eb.y-3,w:6,h:6}, player)){
            ehit = true;
            if(player.invTimer <= 0){
              player.hp--;
              player.invTimer = 60;
              addParticles(player.x+7, player.y+11, 10, '#e94560', 4, 20);
              beep(320, 0.09, 'sawtooth', 0.03);
              if(player.hp <= 0) killPlayer();
            }
          }
        }
        if(ehit) enemyBullets.splice(n,1);
      }
    }

    /* ---------- 敌人 ---------- */
    function updateEnemies(){
      for(var i=0;i<enemies.length;i++){
        var e = enemies[i];
        if(!e.alive) continue;

        var triggerMove = false, hasMoveTrigger = false;
        if (e.hitboxes) {
          for(var j=0; j<e.hitboxes.length; j++){
            var hb = e.hitboxes[j];
            if (hb.triggerMove) {
              hasMoveTrigger = true;
              var heTc = hb.triggerCount || 0;
              if (heTc === 0) {
                if (rectHit(player, getHitboxRect(e, hb, state.t))) triggerMove = true;
              } else if (hb._hits >= heTc) {
                triggerMove = true;
              }
            }
          }
        }
        e._activeMove = hasMoveTrigger ? triggerMove : true;

        if(e.type === 'walker'){
          if (e._activeMove) {
            if (e.path && e.path.length >= 2) {
              updatePath(e);
            } else {
              e.x += e.vx;
              if(e.x < e.minX){ e.x = e.minX; e.vx *= -1; }
              if(e.x + e.w > e.maxX){ e.x = e.maxX - e.w; e.vx *= -1; }
            }
          }
        } else if(e.type === 'shooter'){
          if (e._activeMove) {
            if (e.path && e.path.length >= 2) {
              updatePath(e);
            } else {
              e.phase += 0.05;
              e.y = e.baseY + Math.sin(e.phase) * 14;
            }
          }
          e.cd--;
          if(e.cd <= 0 && state.mode === 'play' && !e._hidden){
            var dx = (player.x + player.w/2) - (e.x + e.w/2);
            var dy = (player.y + player.h/2) - (e.y + e.h/2);
            var d = Math.hypot(dx, dy) || 1;
            if(d < 540){
              var sp = 4.2;
              enemyBullets.push({ x: e.x + e.w/2, y: e.y + e.h/2, vx: dx/d*sp, vy: dy/d*sp, life: 220 });
              e.cd = 95;
              beep(200, 0.1, 'sawtooth', 0.02);
            } else {
              e.cd = 25;
            }
          }
        }
      }
    }

    /* ---------- 自设尖刺移动 ---------- */
    function updateAdvSpikes(){
      for(var i=0;i<adv_spikes.length;i++){
        var s = adv_spikes[i];

        var triggerMove = false, hasMoveTrigger = false;
        if (s.hitboxes) {
          for(var j=0; j<s.hitboxes.length; j++){
            var h = s.hitboxes[j];
            if (h.triggerMove) {
              hasMoveTrigger = true;
              var hsTc = h.triggerCount || 0;
              if (hsTc === 0) {
                if (rectHit(player, getHitboxRect(s, h, state.t))) triggerMove = true;
              } else if (h._hits >= hsTc) {
                triggerMove = true;
              }
            }
          }
        }
        s._activeMove = hasMoveTrigger ? triggerMove : true;

        if (s._activeMove) {
          if (s.path && s.path.length >= 2) {
            updatePath(s);
          } else {
            s.phase += s.moveSpeed || 0.02;
            if (s.moveType === 'horizontal') s.x = s.ox + Math.sin(s.phase) * s.moveRange;
            if (s.moveType === 'vertical')   s.y = s.oy + Math.sin(s.phase) * s.moveRange;
          }
        }
      }
    }

    function isAdvSpikeVisible(s){
      if(!s._activeVis) return false;
      if(s.visibility === 'always') return true;
      if(s.visibility === 'blink') return Math.floor(state.t * 0.05) % 2 === 0;
      if(s.visibility === 'near'){
        var cx = s.x + s.w/2, cy = s.y + s.h/2;
        var px = player.x + player.w/2, py = player.y + player.h/2;
        return Math.hypot(px - cx, py - cy) < 160;
      }
      return true;
    }

    /* ---------- 碰撞箱触发 ---------- */
    function checkHitboxTriggers(){
      var p = player;
      var allEnts = staticSolids.concat(movers).concat(adv_spikes).concat(enemies);

      for(var i=0; i<allEnts.length; i++){
        allEnts[i]._trigMove = false;
        allEnts[i]._trigVis = false;
      }

      for(var i=0; i<allEnts.length; i++){
        var ent = allEnts[i];
        if(!ent.hitboxes) continue;
        for(var j=0; j<ent.hitboxes.length; j++){
          var hb = ent.hitboxes[j];
          var rect = getHitboxRect(ent, hb, state.t);
          var isCol = rectHit(p, rect);

          if (isCol && !hb._curCollide) hb._hits++;
          hb._curCollide = isCol;

          var tc = hb.triggerCount || 0;
          var canTrig = (tc === 0) ? isCol : (hb._hits >= tc);

          if (canTrig) {
            if (hb.triggerMove) ent._trigMove = true;
            if (hb.triggerVisibility) ent._trigVis = true;
            if (hb.triggerMorph) ent._morphActivated = true;

            if (isCol) {
              if (hb.triggerSlow) p.slowTimer = 20;
              if (hb.triggerFast) p.fastTimer = 20;
              if (hb.triggerBounce && p.bounceCd <= 0){
                p.vx = 0; p.vy = -12; p.bounceCd = 40; beep(600, 0.1, 'sine', 0.05);
              }
            }
          }
        }
      }

      for(var i=0; i<allEnts.length; i++){
        var ent = allEnts[i];
        if(ent.hitboxes && ent.hitboxes.length > 0){
          var hasVisTrigger = false;
          for(var j=0; j<ent.hitboxes.length; j++){
            if(ent.hitboxes[j].triggerVisibility) hasVisTrigger = true;
          }
          if (hasVisTrigger && !ent._trigVis) ent._hidden = true;
          else ent._hidden = false;
        }
      }
    }

    /* ---------- 危险检测 ---------- */
    function checkHazards(){
      var p = player, i;

      for(i=0;i<spikes.length;i++){
        var s = spikes[i];
        var spx = Math.min(3, s.w * 0.25), spy = Math.min(7, s.h * 0.4);
        if(rectHit(p, {
          x: s.x + spx, y: s.y + spy,
          w: Math.max(1, s.w - spx*2), h: Math.max(1, s.h - spy)
        })){ killPlayer(); return; }
      }

      for(i=0;i<enemies.length;i++){
        var e = enemies[i];
        if(!e.alive || e._hidden) continue;
        var epx = Math.min(3, e.w * 0.25), epy = Math.min(3, e.h * 0.25);
        if(rectHit(p, {
          x: e.x + epx, y: e.y + epy,
          w: Math.max(1, e.w - epx*2), h: Math.max(1, e.h - epy*2)
        })){
          if (p.invTimer <= 0) {
            p.hp -= (e.damage || 1);
            p.invTimer = 60;
            addParticles(p.x+7, p.y+11, 10, '#e94560', 4, 20);
            beep(300, 0.1, 'sawtooth', 0.03);
            if (p.hp <= 0) { killPlayer(); return; }
          }
        }
      }

      if(p.y > H + 120){ killPlayer(); return; }

      for(i=0;i<adv_spikes.length;i++){
        var s2 = adv_spikes[i];
        var triggerVis = false, triggerDmg = false;
        var hasVisTrigger = false, hasDmgTrigger = false;

        if (s2.hitboxes) {
          for(var j=0; j<s2.hitboxes.length; j++){
            var h = s2.hitboxes[j];
            if (h.triggerVisibility) hasVisTrigger = true;
            if (h.triggerDamage) hasDmgTrigger = true;

            var tc = h.triggerCount || 0;
            var colNow = rectHit(player, getHitboxRect(s2, h, state.t));
            var canTrig = (tc === 0) ? colNow : (h._hits >= tc);
            if (canTrig) {
              if (h.triggerVisibility) triggerVis = true;
              if (h.triggerDamage) triggerDmg = true;
            }
          }
        }

        s2._activeVis = hasVisTrigger ? triggerVis : true;
        s2._activeDmg = hasDmgTrigger ? triggerDmg : true;

        if (s2._activeVis && isAdvSpikeVisible(s2)) {
          var hitSpike = false;
          if (hasDmgTrigger) {
            for(var j2=0; j2<s2.hitboxes.length; j2++){
              var h2 = s2.hitboxes[j2];
              if (!h2.triggerDamage) continue;
              var tcd = h2.triggerCount || 0;
              var dmgRect = getHitboxRect(s2, h2, state.t);
              var colDmg = rectHit(player, dmgRect);
              if (tcd === 0) { if (colDmg) { hitSpike = true; break; } }
              else if (h2._hits >= tcd && colDmg) { hitSpike = true; break; }
            }
          } else {
            var apx = Math.min(3, s2.w * 0.25), apy = Math.min(3, s2.h * 0.25);
            if(rectHit(player, {
              x: s2.x + apx, y: s2.y + apy,
              w: Math.max(1, s2.w - apx*2), h: Math.max(1, s2.h - apy*2)
            })) hitSpike = true;
          }

          if (hitSpike) {
            if (player.invTimer <= 0) {
              player.hp -= s2.damage;
              player.invTimer = 60;
              addParticles(player.x+7, player.y+11, 10, '#e94560', 4, 20);
              beep(300, 0.1, 'sawtooth', 0.03);
              if(player.hp <= 0){ killPlayer(); return; }
            }
          }
        }
      }

      for(i=0;i<checkpoints.length;i++){
        var c = checkpoints[i];
        if(!c.active){
          var hit = false;
          if (c.type === 'trigger') {
            if (player.x + player.w > c.x) hit = true;
          } else {
            hit = rectHit(p, c);
          }
          if (hit) {
            c.active = true;
            state.spawn = { x: c.spawnX, y: c.spawnY };
            addParticles(c.x + c.w/2, c.y + c.h/2, 18, '#4ade80', 4, 36);
            beep(520, 0.1, 'sine', 0.03);
            setTimeout(function(){ beep(780, 0.12, 'sine', 0.03); }, 90);
          }
        }
      }

      if(rectHit(p, goal)){
        state.mode = 'win';
        state.winTimer = 0;
        addParticles(goal.x + goal.w/2, goal.y + goal.h/2, 40, '#fde047', 7, 50);
        beep(660, 0.15, 'sine', 0.04);
        setTimeout(function(){ beep(880, 0.15, 'sine', 0.04); }, 140);
        setTimeout(function(){ beep(1100, 0.25, 'sine', 0.04); }, 280);
      }
    }

    /* ---------- 死亡 / 复活 ---------- */
    function killPlayer(){
      if(state.mode !== 'play') return;
      state.mode = 'dead';
      state.deadTimer = 28;
      state.deaths++;
      state.shake = 14;
      addParticles(player.x + player.w/2, player.y + player.h/2, 26, '#e94560', 6.5, 40);
      addParticles(player.x + player.w/2, player.y + player.h/2, 14, '#ffffff', 4, 24);
      beep(140, 0.28, 'sawtooth', 0.045);
    }

    function respawn(){
      player.x = state.spawn.x;
      player.y = state.spawn.y;
      player.vx = 0; player.vy = 0;
      player.jumpsLeft = 1; player.coyote = 0; player.jumpBuffer = 0;
      player.onGround = false; player.ground = null; player.shootCd = 0;
      player.hp = player.maxHp; player.invTimer = 0;
      player.slowTimer = 0; player.fastTimer = 0; player.bounceCd = 0;

      enemyBullets.length = 0;
      state.mode = 'play';
      state.camX = clamp(player.x + player.w/2 - W/2, 0, Math.max(0, WORLD_W - W));
      addParticles(player.x + player.w/2, player.y + player.h/2, 16, '#5eead4', 4, 28);

      var allEnts = staticSolids.concat(movers).concat(adv_spikes).concat(enemies);
      for(var i=0; i<allEnts.length; i++) {
        var ent = allEnts[i];
        var shouldReset = false;
        if(ent.hitboxes) {
          for(var j=0; j<ent.hitboxes.length; j++) {
            var hb = ent.hitboxes[j];
            hb._curCollide = false;
            if (hb.resetOnDeath || hb.resetOnDeath === undefined) {
              hb._hits = 0;
              shouldReset = true;
            }
          }
        }
        if (shouldReset) {
          if (ent.path) ent.pathDist = 0;
          ent.phase = 0;
          ent._morphActivated = false;
          ent._morphStartT = undefined;
          ent._morphOffX = 0;
          ent._morphOffY = 0;
          if (ent.ow !== undefined) ent.w = ent.ow;
          if (ent.oh !== undefined) ent.h = ent.oh;
          if (ent.ox !== undefined) ent.x = ent.ox;
          if (ent.oy !== undefined) ent.y = ent.oy;
        }
      }

      for(var i=0; i<enemies.length; i++){
        var en = enemies[i];
        if (en.resetOnDeath !== false) {
          en.alive = true;
          en.hp = en.maxHp !== undefined ? en.maxHp : 1;
        }
      }

      for(var i=0; i<adv_spikes.length; i++){
        adv_spikes[i]._activeVis = false;
        adv_spikes[i]._activeDmg = false;
      }
      for(var i=0; i<movers.length; i++){
        movers[i]._activeMove = false;
      }
    }

    /* ---------- 主更新 ---------- */
    function update(){
      state.t++;
      updateMovers();
      updateAdvSpikes();
      updateMorphs();

      if(state.mode === 'play'){
        updatePlayer();
      } else if(state.mode === 'dead'){
        state.deadTimer--;
        if(state.deadTimer <= 0) respawn();
      } else if(state.mode === 'win'){
        state.winTimer++;
        if(!state.winTriggered){
          state.winTriggered = true;
          if(typeof onWin === 'function') onWin(state.deaths);
        }
      }

      updateBullets();
      updateEnemies();
      updateParticles();

      if(state.mode !== 'win'){
        var targetX = clamp(player.x + player.w/2 - W/2 + player.vx * 6, 0, Math.max(0, WORLD_W - W));
        state.camX += (targetX - state.camX) * 0.12;
      }

      if(state.shake > 0.1) state.shake *= 0.87;
      else state.shake = 0;
    }

    /* 暴露给引擎 / 渲染层使用 */
    return {
      update: update,
      killPlayer: killPlayer,
      respawn: respawn,
      isAdvSpikeVisible: isAdvSpikeVisible
    };
  };
})(window.IW = window.IW || {});
