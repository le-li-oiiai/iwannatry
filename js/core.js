/*
 * core.js —— 全局命名空间与共享状态
 *
 * 本项目不用 ES Module，而是用普通 <script> 按顺序加载、把接口挂在 window.IW 上。
 * 这样即便直接双击 index.html（file:// 协议）也能正常运行。
 *
 * 加载顺序见 index.html 底部：core -> storage -> normalize -> level-list
 *   -> game-screen -> engine/* -> main
 */
window.IW = window.IW || {};

(function (IW) {
  'use strict';

  /* 便捷的 document.getElementById */
  IW.$ = function (id) { return document.getElementById(id); };

  /* ============================================================
   *  设备检测（触屏才显示触屏按钮）
   * ============================================================ */
  var isTouchDevice = ('ontouchstart' in window) ||
                      (navigator.maxTouchPoints > 0) ||
                      (navigator.msMaxTouchPoints > 0);

  if(isTouchDevice){
    document.body.classList.add('is-touch');
  }

  /* 游戏引擎的 HUD 也要判断是不是触屏 */
  IW.isTouchDevice = isTouchDevice;

  /* 选关界面 / 游戏界面里到处都要用的 DOM 引用，集中在这里取一次 */
  var $ = IW.$;
  IW.dom = {
    menu:         $('menu'),
    wrap:         $('wrap'),
    exitBtn:      $('exit-btn'),
    grid:         $('levels-grid'),
    status:       $('levels-status'),
    pasteBox:     $('paste-box'),
    nameInput:    $('level-name'),
    winOverlay:   $('win-overlay'),
    winDeaths:    $('win-deaths'),
    btnNextLevel: $('btn-next-level'),
    btnBackMenu:  $('btn-back-menu')
  };

  /* 跨模块共享的运行状态（对象本身不变，只改里面的字段） */
  IW.app = {
    currentGame: null,        // 当前关卡的游戏实例，stop() 用来结束本局
    allLevels: [],            // 关卡列表（本地 + 在线）
    currentLevelIndex: -1     // 当前关卡在 allLevels 里的下标；-1 表示用 ?level= 直接打开
  };
})(window.IW = window.IW || {});
