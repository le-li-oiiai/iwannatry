# I Wanna Shoot · 类 iwanna 射击小游戏

## 怎么运行

- **直接双击 `index.html`**：可以玩“保存在浏览器本地”的关卡。
- **走了本地服务器**（例如在文件夹里执行 `python -m http.server`，再打开 `http://localhost:8000/`）：
  `levels.json` 里的在线关卡列表也能读到。

  > 说明：浏览器不允许 `file://` 页面用 `fetch` 读本地文件，所以双击打开时列表会提示读取失败——
  > 这是改造前就有的限制，与拆分无关。

## 文件结构

```
iwanna小游戏/
├─ index.html            页面骨架：只有 DOM 结构和 <link>/<script> 引用
├─ css/
│  ├─ base.css           全局重置、通用按钮、滚动条
│  ├─ menu.css           选关界面样式
│  └─ game.css           游戏界面样式（画布、触屏按钮、退出、胜利）
├─ js/
│  ├─ core.js            命名空间 IW、$()、触屏判断、共享状态 IW.app、DOM 引用
│  ├─ main.js            启动：填充关卡列表，处理 ?level=xxx.json
│  ├─ ui/
│  │  ├─ storage.js      本地关卡读写（localStorage）
│  │  ├─ level-list.js   关卡列表 + 「添加关卡」表单
│  │  └─ game-screen.js  进入/退出关卡、画布自适应、胜利界面、全屏
│  ├─ level/
│  │  └─ normalize.js    关卡 JSON 规范化（缺字段补默认值、限制范围）
│  └─ engine/
│     ├─ geometry.js     clamp / rnd / 矩形碰撞 / 碰撞箱坐标换算
│     ├─ audio.js        WebAudio 小音效
│     ├─ input.js        键盘、鼠标、触屏按钮、触摸瞄准
│     ├─ update.js       每帧逻辑：物理、敌人、子弹、危险检测、死亡重生
│     ├─ draw.js         渲染：背景、地形、尖刺、敌人、子弹、粒子、HUD
│     └─ engine.js       装配各模块 + 固定步长主循环 + stop()
```

加载顺序写在 `index.html` 底部，用普通 `<script>`（不是 ES Module），所以双击打开也能跑。
所有模块都挂在 `window.IW` 上，互相之间通过 `IW.xxx()` 调用。

## 想改东西去哪儿

| 想改什么 | 改哪个文件 |
| --- | --- |
| 跳跃力度、重力、移动速度、子弹速度 | `js/engine/update.js` |
| 玩家/敌人/地形长什么样、HUD 文字 | `js/engine/draw.js` |
| 触屏按钮、按键响应 | `js/engine/input.js` |
| 新增一种实体或字段 | `js/level/normalize.js`（数据）+ `update.js`（逻辑）+ `draw.js`（画面） |
| 选关界面、卡片样式 | `js/ui/level-list.js` + `css/menu.css` |
| 胜利界面、下一关逻辑 | `js/ui/game-screen.js` |
| 音效 | `js/engine/audio.js` |

关卡文件（`level1.json` / `level2.json` / `levels.json`）由同目录的编辑器生成，格式不变。
