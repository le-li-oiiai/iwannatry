/*
 * game-screen.js —— 进入 / 退出关卡、画布自适应、胜利界面、全屏
 *
 * 这一层只负责「舞台」：显示哪些 DOM、画布多大、什么时候把控制权交给引擎。
 */
(function (IW) {
  'use strict';

  var $ = IW.$;
  var dom = IW.dom;
  var app = IW.app;

  var menuEl = dom.menu, wrapEl = dom.wrap, exitBtn = dom.exitBtn;
  var winOverlay = dom.winOverlay, winDeathsEl = dom.winDeaths;
  var btnNextLevel = dom.btnNextLevel, btnBackMenu = dom.btnBackMenu;
  var statusEl = dom.status;

  /* ============================================================
   *  全屏 / 退出
   * ============================================================ */
  function tryFullscreen(){
    try{
      var el = document.documentElement;
      if(el.requestFullscreen){
        var p = el.requestFullscreen();
        if(p && p.catch) p.catch(function(){});
      } else if(el.webkitRequestFullscreen){
        el.webkitRequestFullscreen();
      } else if(el.msRequestFullscreen){
        el.msRequestFullscreen();
      }
    }catch(e){}
  }

  function tryExitFullscreen(){
    try{
      if(document.fullscreenElement){
        if(document.exitFullscreen) document.exitFullscreen().catch(function(){});
        else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    }catch(e){}
  }

  /* 浏览器返回键 / 手势返回：如果在关卡内则回到选关 */
  window.addEventListener('popstate', function(){
    if(wrapEl.classList.contains('visible')){
      exitLevel(true);
    }
  });

  /* ============================================================
   *  进入关卡
   * ============================================================ */
  function enterLevel(item, index){
    // 在点击手势上下文中尝试全屏（移动端）
    tryFullscreen();

    app.currentLevelIndex = (index !== undefined) ? index : app.allLevels.indexOf(item);

    if(item.type === 'local'){
      var txt = IW.store.getLocalData(item.id);
      if(!txt){ alert('本地关卡数据丢失'); IW.list.refreshLevelList(); return; }
      loadAndStart(txt, item.name);
      return;
    }

    statusEl.textContent = '正在加载「' + item.name + '」...';
    statusEl.classList.remove('error');

    fetch(item.url + '?_=' + Date.now())
      .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function(txt){ loadAndStart(txt, item.name); })
      .catch(function(e){
        statusEl.textContent = '关卡加载失败：' + e.message;
        statusEl.classList.add('error');
      });
  }

  function loadAndStart(raw, displayName){
    var data;
    try{ data = JSON.parse(raw); }
    catch(e){ alert('关卡 JSON 解析失败：' + e.message); return; }

    var level;
    try{ level = IW.normalize.normalizeLevel(data); }
    catch(e){ alert('关卡数据格式不正确：' + e.message); return; }

    if(app.currentGame){ try{ app.currentGame.stop(); }catch(e){} app.currentGame = null; }

    winOverlay.classList.remove('visible');

    var oldCvs = document.getElementById('game');
    var newCvs = document.createElement('canvas');
    newCvs.id = 'game';
    oldCvs.parentNode.replaceChild(newCvs, oldCvs);

    menuEl.classList.add('hidden');
    wrapEl.classList.add('visible');
    exitBtn.classList.add('visible');

    // 让 canvas 适配全屏（保持 16:9 居中）
    resizeGameCanvas();

    // 压入历史记录，让浏览器返回键可以回到选关
    try{ history.pushState({ inGame: true }, '', location.href); }catch(e){}

    try{
      app.currentGame = IW.startGameEngine(newCvs, level, function(deaths){
        showWinScreen(deaths);
      });
    }catch(e){
      wrapEl.classList.remove('visible');
      exitBtn.classList.remove('visible');
      menuEl.classList.remove('hidden');
      tryExitFullscreen();
      alert('游戏启动失败：' + e.message);
    }
  }

  /* ============================================================
   *  Canvas 尺寸计算（保持 16:9 居中，全屏黑边填充）
   * ============================================================ */
  function resizeGameCanvas(){
    var cvs = document.getElementById('game');
    if(!cvs || !wrapEl.classList.contains('visible')) return;

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var ratio = 960 / 540;

    var cw, ch;
    if(vw / vh > ratio){
      ch = vh;
      cw = vh * ratio;
    } else {
      cw = vw;
      ch = vw / ratio;
    }
    cvs.style.width = cw + 'px';
    cvs.style.height = ch + 'px';
  }

  window.addEventListener('resize', resizeGameCanvas);
  window.addEventListener('orientationchange', function(){
    setTimeout(resizeGameCanvas, 120);
  });

  /* ============================================================
   *  胜利 / 退出
   * ============================================================ */
  function showWinScreen(deaths){
    winDeathsEl.textContent = deaths;
    winOverlay.classList.add('visible');

    if(app.currentLevelIndex >= 0 && app.currentLevelIndex < app.allLevels.length - 1){
      btnNextLevel.disabled = false;
      btnNextLevel.textContent = '下一关 ▶';
      btnNextLevel.style.opacity = '1';
      btnNextLevel.style.cursor = 'pointer';
    } else {
      btnNextLevel.disabled = true;
      btnNextLevel.textContent = '已是最后一关';
      btnNextLevel.style.opacity = '0.5';
      btnNextLevel.style.cursor = 'default';
    }
  }

  function exitLevel(skipConfirm){
    var isWin = winOverlay.classList.contains('visible');
    if(!skipConfirm && !isWin){
      if(!confirm('退出并回到选关界面？')) return;
    }

    if(app.currentGame){ try{ app.currentGame.stop(); }catch(e){} app.currentGame = null; }

    winOverlay.classList.remove('visible');
    wrapEl.classList.remove('visible');
    exitBtn.classList.remove('visible');
    menuEl.classList.remove('hidden');

    tryExitFullscreen();

    var cvs = document.getElementById('game');
    if(cvs){ var ctx = cvs.getContext('2d'); ctx.clearRect(0,0,cvs.width,cvs.height); }
  }

  exitBtn.addEventListener('click', function(){ exitLevel(false); });
  btnBackMenu.addEventListener('click', function(){ exitLevel(true); });

  btnNextLevel.addEventListener('click', function(){
    if(app.currentLevelIndex >= 0 && app.currentLevelIndex < app.allLevels.length - 1){
      enterLevel(app.allLevels[app.currentLevelIndex + 1], app.currentLevelIndex + 1);
    }
  });

  IW.screen = {
    enterLevel: enterLevel,
    loadAndStart: loadAndStart,
    exitLevel: exitLevel,
    resizeGameCanvas: resizeGameCanvas,
    showWinScreen: showWinScreen
  };
})(window.IW = window.IW || {});
