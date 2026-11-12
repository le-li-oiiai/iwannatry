/*
 * audio.js —— 极简 WebAudio 音效
 *
 * 浏览器要求音频必须由用户手势触发，所以 init() 会在第一次点击/按键时调用。
 */
(function (IW) {
  'use strict';

  /* 返回一个独立的音效句柄；没有 WebAudio 时所有函数都静默失败 */
  IW.makeAudio = function () {
    var audioCtx = null;
    function initAudio(){
      if(!audioCtx){ try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
    }
    function beep(freq, dur, type, vol){
      if(!audioCtx) return;
      try{
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(freq, audioCtx.currentTime);
        g.gain.setValueAtTime(vol || 0.02, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + dur);
      }catch(e){}
    }

    return { init: initAudio, beep: beep };
  };
})(window.IW = window.IW || {});
