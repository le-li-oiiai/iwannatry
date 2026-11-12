/*
 * engine.js —— 游戏引擎的装配层
 *
 * 职责：
 *   1. 创建共享状态 S（关卡数据、玩家、子弹、粒子……）
 *   2. 依次装配 输入 / 更新 / 渲染 三个模块
 *   3. 跑固定步长的主循环，并返回 { stop } 供退出关卡时调用
 *
 * 一局游戏 = 调用一次 startGameEngine()；退出时 stop() 会注销所有监听器。
 */
(function (IW) {
  'use strict';

  var geometry = IW.geometry;
  var clamp = geometry.clamp, rnd = geometry.rnd;
  var rectHit = geometry.rectHit, getHitboxRect = geometry.getHitboxRect;

  IW.startGameEngine = function startGameEngine(cvs, L, onWinCallback) {

    var ctx = cvs.getContext('2d');
    var W = 960, H = 540;
    cvs.width = W; cvs.height = H;
    ctx.imageSmoothingEnabled = false;

    var running = true;
    var rafId = null;
    var listeners = [];

    /* 注册监听器并记账，stop() 时统一注销 */
    function on(target, event, fn, opts){
      target.addEventListener(event, fn, opts);
      listeners.push({ target: target, event: event, fn: fn, opts: opts });
    }

    /* ---------- 关卡数据 ---------- */
    var WORLD_W = L.worldW;
    var WORLD_H = L.worldH;
    var MAX_HP  = L.playerMaxHp;
    var SPAWN   = L.spawn;
    var staticSolids = L.solids;
    var movers       = L.movers;
    var spikes       = L.spikes;
    var adv_spikes   = L.adv_spikes;
    var enemies      = L.enemies;
    var checkpoints  = L.checkpoints;
    var goal         = L.goal;
    var healthpacks  = L.healthpacks;
    var weapons      = L.weapons;

    var solids = staticSolids.concat(movers);

    solids.forEach(function(e){
      e.ow = e.w; e.oh = e.h; e.ox = e.x; e.oy = e.y;
      if(e.hitboxes) e.hitboxes.forEach(function(h){ h._hits = 0; h._curCollide = false; });
    });
    adv_spikes.forEach(function(e){
      e.ow = e.w; e.oh = e.h; e.ox = e.x; e.oy = e.y;
      if(e.hitboxes) e.hitboxes.forEach(function(h){ h._hits = 0; h._curCollide = false; });
    });
    enemies.forEach(function(e){
      if(e.hitboxes) e.hitboxes.forEach(function(h){ h._hits = 0; h._curCollide = false; });
      if(e.hp === undefined) e.hp = 1;
      if(e.maxHp === undefined) e.maxHp = e.hp;
      if(e.damage === undefined) e.damage = 1;
    });

    var state = {
      mode: 'play', deaths: 0, camX: 0, shake: 0, deadTimer: 0, winTimer: 0, t: 0,
      spawn: { x: SPAWN.x, y: SPAWN.y },
      winTriggered: false
    };
    var player = {
      x: SPAWN.x, y: SPAWN.y, w: 14, h: 22, vx: 0, vy: 0,
      onGround: false, ground: null, jumpsLeft: 1, coyote: 0, jumpBuffer: 0,
      facing: 1, shootCd: 0, aimAngle: 0,
      maxHp: MAX_HP, hp: MAX_HP, invTimer: 0,
      slowTimer: 0, fastTimer: 0, bounceCd: 0,
      weapons: [],        // 装备栏：最多 2 把，{ type, damage }
      weaponIndex: 0,     // 当前主武器下标
      qHold: -1,          // 长按 Q 的读条帧数，-1 表示没按
      qDropped: false     // 本次长按是否已经丢过枪
    };
    var bullets = [], enemyBullets = [], particles = [];

    /* 关卡里配置的初始武器 */
    L.playerWeapons.forEach(function(w){
      player.weapons.push({ type: w.type, damage: w.damage });
    });

    /* 地上的武器：记下出生点，玩家死亡时复原 */
    weapons.forEach(function(w){
      w.alive = true;
      w._fromLevel = true;
      w._spawnX = w.x;
      w._spawnY = w.y;
      w._dropLock = 0;
      w._toss = null;
    });

    /* 输入状态：键盘 / 鼠标 / 触摸 / 瞄准（各模块共享同一份对象） */
    var keys = {};
    var mouse = { x: W*0.8, y: H/2, down: false };
    var touchState = { left: false, right: false, jump: false };
    var aim = { touchId: null, x: W * 0.8, y: H / 2, active: false };
    var lastTouch = { time: 0 };

    /* 交给各模块的共享上下文 */
    var S = {
      cvs: cvs, ctx: ctx, W: W, H: H,
      state: state, player: player,
      bullets: bullets, enemyBullets: enemyBullets, particles: particles,
      solids: solids, staticSolids: staticSolids, movers: movers, spikes: spikes,
      adv_spikes: adv_spikes, enemies: enemies,
      checkpoints: checkpoints, goal: goal,
      healthpacks: healthpacks, weapons: weapons,
      WORLD_W: WORLD_W, WORLD_H: WORLD_H, MAX_HP: MAX_HP,
      keys: keys, mouse: mouse, touchState: touchState, aim: aim, lastTouch: lastTouch,
      clamp: clamp, rnd: rnd, rectHit: rectHit, getHitboxRect: getHitboxRect,
      audio: IW.makeAudio(), on: on,
      isTouchDevice: IW.isTouchDevice,
      killPlayer: null,          // 由 update 模块填入
      isAdvSpikeVisible: null,   // 由 update 模块填入，供 draw 使用
      onWin: function (deaths) {
        if(typeof onWinCallback === 'function') onWinCallback(deaths);
      }
    };

    var updaters = IW.makeUpdaters(S);
    S.killPlayer = updaters.killPlayer;
    S.isAdvSpikeVisible = updaters.isAdvSpikeVisible;

    IW.makeInput(S);
    var drawers = IW.makeDrawers(S);

    /* ---------- 主循环（固定 60 步/秒的逻辑步长） ---------- */
    var lastTime = performance.now();
    var accumulator = 0;
    var STEP = 1000 / 60;

    function loop(now){
      if(!running) return;
      rafId = requestAnimationFrame(loop);

      var delta = now - lastTime;
      lastTime = now;
      if(delta > 100) delta = 100;
      accumulator += delta;

      var guard = 0;
      while(accumulator >= STEP && guard < 5){
        updaters.update();
        accumulator -= STEP;
        guard++;
      }
      if(guard >= 5) accumulator = 0;

      drawers.render();
    }

    state.camX = 0;
    rafId = requestAnimationFrame(loop);

    return {
      stop: function(){
        running = false;
        if(rafId) cancelAnimationFrame(rafId);
        rafId = null;
        for(var i = 0; i < listeners.length; i++){
          var l = listeners[i];
          try{ l.target.removeEventListener(l.event, l.fn, l.opts); }catch(e){}
        }
        listeners = [];
        /* 清掉触屏按钮的按下状态，避免下次进关卡时按钮卡住 */
        var bl = IW.$('btn-left');
        var br = IW.$('btn-right');
        var bj = IW.$('btn-jump');
        if(bl) bl.classList.remove('active');
        if(br) br.classList.remove('active');
        if(bj) bj.classList.remove('active');
      },

      /* 引擎内部状态，调试用：player / state / bullets / weapons … 都在这里 */
      context: S
    };
  };
})(window.IW = window.IW || {});
