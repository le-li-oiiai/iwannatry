/*
 * main.js —— 启动入口
 *
 * 做两件事：填充选关列表；如果 URL 带 ?level=xxx.json，则直接进入该关卡。
 */
(function (IW) {
  'use strict';

  var app = IW.app;
  var statusEl = IW.dom.status;

  (function init(){
    IW.list.refreshLevelList();

    var levelUrl = null;
    try{ levelUrl = new URLSearchParams(location.search).get('level'); }catch(e){}

    if(levelUrl){
      statusEl.textContent = '正在从 URL 加载关卡...';
      fetch(levelUrl)
        .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function(txt){
          var nm = levelUrl.split('/').pop().replace(/\.json$/i, '');
          app.currentLevelIndex = -1;
          IW.screen.loadAndStart(txt, nm);
        })
        .catch(function(e){
          statusEl.textContent = '自动加载失败：' + e.message;
          statusEl.classList.add('error');
        });
      return;
    }
  })();
})(window.IW = window.IW || {});
