/*
 * geometry.js —— 游戏引擎用到的纯几何 / 数学工具（无状态，可单独复用）
 */
(function (IW) {
  'use strict';

  var clamp = function(v,a,b){ return v<a?a:v>b?b:v; };
  var rnd = function(a,b){ return a + Math.random()*(b-a); };
  var rectHit = function(a,b){
    return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  };

  /* ---------- 碰撞箱计算 ---------- */
  function getHitboxRect(ent, h, t) {
    if (!h.isRelative) {
      return { x: h.x, y: h.y, w: h.w, h: h.h };
    }
    var morph = ent.morph || 'none';
    if (ent.morphDemo === false) morph = 'none';

    var ow = ent.ow !== undefined ? ent.ow : ent.w;
    var oh = ent.oh !== undefined ? ent.oh : ent.h;
    var ox = ent.ox !== undefined ? ent.ox : ent.x;
    var oy = ent.oy !== undefined ? ent.oy : ent.y;

    var cw = ow, ch = oh;
    if (morph === 'pulse') {
      var scale = 1 + Math.sin(t * 0.1) * 0.2;
      cw = ow * scale; ch = oh * scale;
    } else if (morph === 'stretch') {
      var p = (Math.sin(t * 0.05) + 1) / 2;
      cw = ow + ((ent.targetW || ow) - ow) * p;
      ch = oh + ((ent.targetH || oh) - oh) * p;
    }

    var sx = cw / ow, sy = ch / oh;
    var ecx = ent.x + ent.w / 2, ecy = ent.y + ent.h / 2;
    var ocx = ox + ow / 2, ocy = oy + oh / 2;
    var ohcx = ox + h.x + h.w / 2, ohcy = oy + h.y + h.h / 2;
    var offsetX = ohcx - ocx, offsetY = ohcy - ocy;
    var new_hcx = ecx + offsetX * sx, new_hcy = ecy + offsetY * sy;
    var new_hw = h.w * sx, new_hh = h.h * sy;

    return { x: new_hcx - new_hw / 2, y: new_hcy - new_hh / 2, w: new_hw, h: new_hh };
  }

  IW.geometry = {
    clamp: clamp,
    rnd: rnd,
    rectHit: rectHit,
    getHitboxRect: getHitboxRect
  };
})(window.IW = window.IW || {});
