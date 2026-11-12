/*
 * normalize.js —— 把关卡 JSON 补全成游戏引擎需要的完整数据结构
 *
 * 编辑器导出的、手写的、老版本的关卡文件字段可能残缺或者超出范围，
 * 这里统一补默认值并做范围限制，引擎就只需要面对一种数据结构。
 */
(function (IW) {
  'use strict';

  function num(v, def){
    var n = Number(v);
    return isFinite(n) ? n : def;
  }
  function clampNum(v, min, max, def){
    var n = Number(v);
    if(!isFinite(n)) n = def;
    return Math.max(min, Math.min(max, n));
  }
  function posNum(v, def){
    var n = Number(v);
    if(!isFinite(n) || n <= 0) return def;
    return n;
  }

  function normalizeHitboxes(arr){
    if(!Array.isArray(arr)) return [];
    var out = [];
    for(var i = 0; i < arr.length; i++){
      var h = arr[i] || {};
      out.push({
        x: num(h.x, 0),
        y: num(h.y, 0),
        w: num(h.w, 20),
        h: num(h.h, 20),
        isRelative: !!h.isRelative,
        triggerCount: Math.max(0, Math.floor(num(h.triggerCount, 0))),
        resetOnDeath: h.resetOnDeath !== false,
        triggerMove: !!h.triggerMove,
        triggerMorph: !!h.triggerMorph,
        triggerVisibility: !!h.triggerVisibility,
        triggerSlow: !!h.triggerSlow,
        triggerFast: !!h.triggerFast,
        triggerBounce: !!h.triggerBounce,
        triggerDamage: !!h.triggerDamage
      });
    }
    return out;
  }

  function normalizePath(p){
    if(!Array.isArray(p)) return [];
    var out = [];
    for(var i = 0; i < p.length; i++){
      var n = p[i] || {};
      out.push({ x: num(n.x, 0), y: num(n.y, 0) });
    }
    return out;
  }

  function normalizeLevel(d){
    if(!d || typeof d !== 'object') throw new Error('关卡数据格式错误');

    var L = {
      worldW:      clampNum(d.worldW, 400, 20000, 4000),
      worldH:      clampNum(d.worldH, 200, 3000, 540),
      playerMaxHp: clampNum(d.playerMaxHp, 1, 99, 3),
      spawn: {
        x: num(d.spawn && d.spawn.x, 60),
        y: num(d.spawn && d.spawn.y, 458)
      },
      solids: [], movers: [], spikes: [], adv_spikes: [],
      enemies: [], checkpoints: [], goal: null
    };

    (d.solids || []).forEach(function(s){
      s = s || {};
      var w = posNum(s.w, 1), h = posNum(s.h, 1);
      L.solids.push({
        x: num(s.x, 0), y: num(s.y, 0), w: w, h: h,
        morph: s.morph || 'none',
        morphLoop: s.morphLoop !== false,
        targetW: s.targetW !== undefined ? posNum(s.targetW, w) : w,
        targetH: s.targetH !== undefined ? posNum(s.targetH, h) : h,
        targetOffX: num(s.targetOffX, 0),
        targetOffY: num(s.targetOffY, 0),
        hitboxes: normalizeHitboxes(s.hitboxes)
      });
    });

    (d.movers || []).forEach(function(m){
      m = m || {};
      var w = posNum(m.w, 1), h = posNum(m.h, 1);
      L.movers.push({
        x: num(m.x, 0), y: num(m.y, 0), w: w, h: h,
        ax: num(m.ax, 0),
        ay: num(m.ay, 0),
        spd: m.spd !== undefined ? num(m.spd, 0.02) : 0.02,
        phase: num(m.phase, 0),
        path: normalizePath(m.path),
        pathSpeed: m.pathSpeed !== undefined ? num(m.pathSpeed, 2) : 2,
        pathDist: num(m.pathDist, 0),
        pathDir: m.pathDir === -1 ? -1 : 1,
        morph: m.morph || 'none',
        morphLoop: m.morphLoop !== false,
        targetW: m.targetW !== undefined ? posNum(m.targetW, w) : w,
        targetH: m.targetH !== undefined ? posNum(m.targetH, h) : h,
        targetOffX: num(m.targetOffX, 0),
        targetOffY: num(m.targetOffY, 0),
        hitboxes: normalizeHitboxes(m.hitboxes)
      });
    });

    (d.spikes || []).forEach(function(s){
      s = s || {};
      L.spikes.push({
        x: num(s.x, 0), y: num(s.y, 0),
        w: posNum(s.w, 1), h: posNum(s.h, 1)
      });
    });

    (d.adv_spikes || []).forEach(function(s){
      s = s || {};
      var w = posNum(s.w, 1), h = posNum(s.h, 1);
      var dmg = num(s.damage, 1);
      if(dmg <= 0) dmg = 1;
      L.adv_spikes.push({
        x: num(s.x, 0), y: num(s.y, 0), w: w, h: h,
        damage: dmg,
        shape: s.shape || 'triangle',
        visibility: s.visibility || 'always',
        morph: s.morph || 'none',
        morphLoop: s.morphLoop !== false,
        layer: s.layer || 'top',
        targetW: s.targetW !== undefined ? posNum(s.targetW, w) : w,
        targetH: s.targetH !== undefined ? posNum(s.targetH, h) : h,
        targetOffX: num(s.targetOffX, 0),
        targetOffY: num(s.targetOffY, 0),
        hitboxes: normalizeHitboxes(s.hitboxes),
        phase: num(s.phase, 0),
        path: normalizePath(s.path),
        pathSpeed: s.pathSpeed !== undefined ? num(s.pathSpeed, 2) : 2,
        pathDist: num(s.pathDist, 0),
        pathDir: s.pathDir === -1 ? -1 : 1
      });
    });

    (d.enemies || []).forEach(function(e){
      e = e || {};
      var type = e.type === 'shooter' ? 'shooter' : 'walker';
      var w = posNum(e.w, 1), h = posNum(e.h, 1);
      var hp = Math.max(1, Math.floor(num(e.hp, 1)));
      var maxHp = Math.max(1, Math.floor(num(e.maxHp !== undefined ? e.maxHp : hp, hp)));
      var dmg = Math.max(1, Math.floor(num(e.damage, 1)));

      var base = {
        type: type,
        x: num(e.x, 0), y: num(e.y, 0), w: w, h: h,
        alive: true,
        path: normalizePath(e.path),
        pathSpeed: e.pathSpeed !== undefined ? num(e.pathSpeed, 2) : 2,
        pathDist: num(e.pathDist, 0),
        pathDir: e.pathDir === -1 ? -1 : 1,
        hitboxes: normalizeHitboxes(e.hitboxes),
        hp: hp,
        maxHp: maxHp,
        damage: dmg,
        resetOnDeath: e.resetOnDeath !== false
      };

      if(type === 'walker'){
        base.minX = e.minX !== undefined ? num(e.minX, num(e.x, 0) - 100) : num(e.x, 0) - 100;
        base.maxX = e.maxX !== undefined ? num(e.maxX, num(e.x, 0) + w + 100) : num(e.x, 0) + w + 100;
        base.vx   = e.vx !== undefined ? num(e.vx, 1.5) : 1.5;
      } else {
        base.baseY = e.baseY !== undefined ? num(e.baseY, num(e.y, 0)) : num(e.y, 0);
        base.phase = num(e.phase, 0);
        base.cd    = e.cd !== undefined ? num(e.cd, 90) : 90;
      }
      L.enemies.push(base);
    });

    (d.checkpoints || []).forEach(function(c){
      c = c || {};
      var cx = num(c.x, 0), cy = num(c.y, 0);
      var cw = posNum(c.w, 20), ch = posNum(c.h, 40);
      L.checkpoints.push({
        type: c.type === 'trigger' ? 'trigger' : 'checkpoint',
        x: cx, y: cy, w: cw, h: ch,
        spawnX: c.spawnX !== undefined ? num(c.spawnX, cx + cw/2 - 7) : Math.round(cx + cw/2 - 7),
        spawnY: c.spawnY !== undefined ? num(c.spawnY, cy + ch - 22)   : Math.round(cy + ch - 22),
        active: false
      });
    });

    if(d.goal && (posNum(d.goal.w, 0) > 0 || posNum(d.goal.h, 0) > 0)){
      L.goal = {
        x: num(d.goal.x, 0),
        y: num(d.goal.y, 0),
        w: posNum(d.goal.w, 34),
        h: posNum(d.goal.h, 80)
      };
    } else {
      L.goal = { x: Math.max(0, L.worldW - 120), y: 400, w: 34, h: 80 };
    }

    return L;
  }

  IW.normalize = {
    num: num,
    clampNum: clampNum,
    posNum: posNum,
    normalizeHitboxes: normalizeHitboxes,
    normalizePath: normalizePath,
    normalizeLevel: normalizeLevel
  };
})(window.IW = window.IW || {});
