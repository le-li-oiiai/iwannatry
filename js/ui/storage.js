/*
 * storage.js —— 浏览器本地（localStorage）关卡存储
 *
 * 本地关卡会占两条记录：
 *   iwsl_index        —— 关卡索引数组 [{ id, name, created }]
 *   iwsl_data_<id>    —— 该关卡的 JSON 文本
 */
(function (IW) {
  'use strict';

  var LS_INDEX = 'iwsl_index';
  var LS_DATA_PREFIX = 'iwsl_data_';

  function getLocalIndex(){
    try{ return JSON.parse(localStorage.getItem(LS_INDEX) || '[]'); }catch(e){ return []; }
  }
  function saveLocalIndex(idx){ try{ localStorage.setItem(LS_INDEX, JSON.stringify(idx)); }catch(e){} }
  function getLocalData(id){ try{ return localStorage.getItem(LS_DATA_PREFIX + id); }catch(e){ return null; } }

  function addLocalLevel(name, data){
    var idx = getLocalIndex();
    var id = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    idx.push({ id:id, name:name, created: Date.now() });
    saveLocalIndex(idx);
    try{ localStorage.setItem(LS_DATA_PREFIX + id, data); }catch(e){ alert('本地存储已满'); }
    return id;
  }
  function removeLocalLevel(id){
    saveLocalIndex(getLocalIndex().filter(function(x){ return x.id !== id; }));
    try{ localStorage.removeItem(LS_DATA_PREFIX + id); }catch(e){}
  }

  IW.store = {
    getLocalIndex: getLocalIndex,
    saveLocalIndex: saveLocalIndex,
    getLocalData: getLocalData,
    addLocalLevel: addLocalLevel,
    removeLocalLevel: removeLocalLevel
  };
})(window.IW = window.IW || {});
