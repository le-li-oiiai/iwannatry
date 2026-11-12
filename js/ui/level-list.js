/*
 * level-list.js —— 选关界面的关卡列表 + 「添加关卡」表单
 *
 * 列表来源有两个：
 *   1. 本地：localStorage 里保存的关卡（storage.js）
 *   2. 在线：同目录 levels.json 里登记的 .json 文件
 */
(function (IW) {
  'use strict';

  var $ = IW.$;
  var dom = IW.dom;
  var app = IW.app;

  /* 本模块用到的元素 */
  var gridEl = dom.grid, statusEl = dom.status;
  var pasteBox = dom.pasteBox, nameInput = dom.nameInput;

  /* ============================================================
   *  在线关卡列表
   * ============================================================ */
  function fetchOnlineLevels(){
    return fetch('levels.json?_=' + Date.now())
      .then(function(r){
        if(!r.ok) throw new Error('找不到 levels.json 文件 (HTTP ' + r.status + ')');
        return r.json();
      })
      .then(function(arr){
        if(!Array.isArray(arr)) throw new Error('levels.json 格式错误：必须是一个数组 []');
        var list = [];
        arr.forEach(function(item){
          if(typeof item === 'string'){
            list.push({ type:'remote', name: item.replace(/\.json$/i,''), url: item });
          } else if(item && (item.file || item.url)){
            list.push({ type:'remote', name: item.name || item.file || item.url, url: item.url || item.file });
          }
        });
        return list;
      });
  }

  function refreshLevelList(){
    statusEl.textContent = '正在读取关卡列表...';
    statusEl.classList.remove('error');
    gridEl.innerHTML = '';

    var local = IW.store.getLocalIndex().map(function(x){
      return { type:'local', id:x.id, name:x.name };
    });

    fetchOnlineLevels()
      .then(function(remoteList){
        app.allLevels = local.concat(remoteList);

        if(app.allLevels.length === 0){
          gridEl.innerHTML =
            '<div class="empty-tip">还没有可用的关卡<br>' +
            '<span>请检查 levels.json 是否有内容，或粘贴到下方保存</span></div>';
          statusEl.textContent = '';
          return;
        }

        statusEl.textContent =
          '共 ' + app.allLevels.length + ' 个关卡（本地 ' + local.length + ' · 在线 ' + remoteList.length + '）';

        app.allLevels.forEach(function(item, index){
          gridEl.appendChild(buildLevelCard(item, index));
        });
      })
      .catch(function(err){
        app.allLevels = local.slice();
        if(app.allLevels.length > 0){
          app.allLevels.forEach(function(item, index){ gridEl.appendChild(buildLevelCard(item, index)); });
          statusEl.textContent = '在线列表获取失败：' + err.message + '（仅显示本地关卡）';
        } else {
          gridEl.innerHTML =
            '<div class="empty-tip">未能加载在线关卡<br>' +
            '<span>请确保 index.html 同目录下存在 levels.json 且格式正确</span></div>';
          statusEl.textContent = '加载失败：' + err.message;
        }
        statusEl.classList.add('error');
      });
  }

  function buildLevelCard(item, index){
    var card = document.createElement('div');
    card.className = 'level-card';

    var badge = document.createElement('div');
    badge.className = 'card-badge';
    badge.textContent = item.type === 'local' ? '本地' : '在线';

    var name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = item.name;

    card.appendChild(badge);
    card.appendChild(name);

    if(item.type === 'local'){
      var actions = document.createElement('div');
      actions.className = 'card-actions';
      var delBtn = document.createElement('button');
      delBtn.className = 'card-del';
      delBtn.title = '删除本地关卡';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', function(e){
        e.stopPropagation();
        if(confirm('删除本地关卡「' + item.name + '」？')){
          IW.store.removeLocalLevel(item.id);
          refreshLevelList();
        }
      });
      actions.appendChild(delBtn);
      card.appendChild(actions);
    }

    card.addEventListener('click', function(){ IW.screen.enterLevel(item, index); });
    return card;
  }

  /* ============================================================
   *  菜单表单
   * ============================================================ */
  IW.$('btn-save-local').addEventListener('click', function(){
    var txt = pasteBox.value.trim();
    if(!txt){ alert('请先粘贴关卡 JSON 文本'); return; }
    var data;
    try{ data = JSON.parse(txt); }catch(e){ alert('JSON 解析失败：' + e.message); return; }
    try{ IW.normalize.normalizeLevel(data); }catch(e){ alert('关卡数据无效：' + e.message); return; }

    var name = nameInput.value.trim() || (data && data.name) || '';
    if(!name){
      name = prompt('给这个关卡起个名字：', '我的关卡');
      if(!name) return;
    }
    IW.store.addLocalLevel(name, JSON.stringify(data));
    pasteBox.value = '';
    nameInput.value = '';
    refreshLevelList();
  });

  IW.$('btn-download').addEventListener('click', function(){
    var txt = pasteBox.value.trim();
    if(!txt){ alert('请先粘贴关卡 JSON 文本'); return; }
    var data;
    try{ data = JSON.parse(txt); }catch(e){ alert('JSON 解析失败：' + e.message); return; }
    try{ IW.normalize.normalizeLevel(data); }catch(e){ alert('关卡数据无效：' + e.message); return; }

    var name = nameInput.value.trim() || (data && data.name) || 'level';
    var safe = String(name).replace(/[\\/:*?"<>|\s]+/g, '_') + '.json';
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = safe;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      URL.revokeObjectURL(a.href);
      document.body.removeChild(a);
    }, 200);
  });

  IW.$('btn-refresh').addEventListener('click', refreshLevelList);

  /* 供其他模块调用 */
  IW.list = {
    fetchOnlineLevels: fetchOnlineLevels,
    refreshLevelList: refreshLevelList,
    buildLevelCard: buildLevelCard
  };
})(window.IW = window.IW || {});
