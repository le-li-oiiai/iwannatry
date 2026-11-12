/*
 * input.js —— 输入：键盘、鼠标、触屏按钮、触摸瞄准
 *
 * 所有监听都用引擎传进来的 on() 注册，方便退出关卡时统一注销，避免多次进入关卡后
 * 监听器越积越多。
 */
(function (IW) {
  'use strict';

  IW.makeInput = function (S) {
    var cvs = S.cvs, W = S.W, H = S.H;
    var player = S.player, state = S.state;
    var keys = S.keys, mouse = S.mouse, touchState = S.touchState;
    var aim = S.aim, lastTouch = S.lastTouch;
    var audio = S.audio, on = S.on, killPlayer = S.killPlayer;

    /* ============================================================
     *  触摸输入
     * ============================================================ */


    function getCanvasPos(t){
      var r = cvs.getBoundingClientRect();
      return {
        x: (t.clientX - r.left) * (W / r.width),
        y: (t.clientY - r.top)  * (H / r.height)
      };
    }

    function onCanvasTouchStart(e){
      e.preventDefault();
      audio.init();
      for(var i = 0; i < e.changedTouches.length; i++){
        var t = e.changedTouches[i];
        if(aim.touchId === null){
          aim.touchId = t.identifier;
          var p = getCanvasPos(t);
          aim.x = p.x;
          aim.y = p.y;
          aim.active = true;
        }
      }
    }
    function onCanvasTouchMove(e){
      e.preventDefault();
      for(var i = 0; i < e.changedTouches.length; i++){
        var t = e.changedTouches[i];
        if(t.identifier === aim.touchId){
          var p = getCanvasPos(t);
          aim.x = p.x;
          aim.y = p.y;
        }
      }
    }
    function onCanvasTouchEnd(e){
      e.preventDefault();
      for(var i = 0; i < e.changedTouches.length; i++){
        var t = e.changedTouches[i];
        if(t.identifier === aim.touchId){
          aim.touchId = null;
          aim.active = false;
        }
      }
    }

    on(cvs, 'touchstart', onCanvasTouchStart, { passive: false });
    on(cvs, 'touchmove',  onCanvasTouchMove,  { passive: false });
    on(cvs, 'touchend',   onCanvasTouchEnd,   { passive: false });
    on(cvs, 'touchcancel',onCanvasTouchEnd,   { passive: false });

    /* ---------- 触屏按钮（HTML 元素，固定在屏幕边缘） ---------- */
    function bindHoldButton(btn, onDown, onUp){
      if(!btn) return;
      function down(e){
        e.preventDefault();
        e.stopPropagation();
        audio.init();
        btn.classList.add('active');
        onDown();
      }
      function up(e){
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove('active');
        onUp();
      }
      on(btn, 'touchstart', down, { passive: false });
      on(btn, 'touchend',   up,   { passive: false });
      on(btn, 'touchcancel',up,   { passive: false });
    }

    bindHoldButton(IW.$('btn-left'),
      function(){ touchState.left = true; },
      function(){ touchState.left = false; });

    bindHoldButton(IW.$('btn-right'),
      function(){ touchState.right = true; },
      function(){ touchState.right = false; });

    bindHoldButton(IW.$('btn-jump'),
      function(){ touchState.jump = true; player.jumpBuffer = 8; },
      function(){ touchState.jump = false; });

    /* ---------- 键盘 ---------- */

    on(window, 'keydown', function(e){
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
      if(!keys[e.code]){
        if(e.code==='Space' || e.code==='KeyW' || e.code==='ArrowUp') player.jumpBuffer = 8;
        if(e.code === 'KeyR' && state.mode === 'play') killPlayer();
      }
      keys[e.code] = true;
      audio.init();
    });
    on(window, 'keyup', function(e){ keys[e.code] = false; });
    on(window, 'blur', function(){
      for(var k in keys) keys[k] = false;
      mouse.down = false;
      touchState.left = touchState.right = touchState.jump = false;
      aim.active = false;
      aim.touchId = null;
    });

    /* ---------- 鼠标（过滤触摸后 500ms 内的模拟鼠标事件） ---------- */
    on(cvs, 'mousemove', function(e){
      if(Date.now() - lastTouch.time < 500) return;
      var r = cvs.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (W / r.width);
      mouse.y = (e.clientY - r.top)  * (H / r.height);
    });
    on(cvs, 'mousedown', function(e){
      if(Date.now() - lastTouch.time < 500) return;
      mouse.down = true;
      audio.init();
      e.preventDefault();
    });
    on(window, 'mouseup', function(){ mouse.down = false; });
    on(cvs, 'contextmenu', function(e){ e.preventDefault(); });

    // 触摸时更新 lastTouch.time（阻止触摸后的模拟鼠标事件）
    on(window, 'touchstart', function(){ lastTouch.time = Date.now(); }, { passive: true });

  };
})(window.IW = window.IW || {});
