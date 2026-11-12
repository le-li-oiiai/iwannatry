# I Wanna Shoot · 类 iwanna 射击小游戏

## 怎么运行

- **直接双击 `index.html`**：可以玩“保存在浏览器本地”的关卡。
- **走了本地服务器**（例如在文件夹里执行 `python -m http.server`，再打开 `http://localhost:8000/`）：
  `levels.json` 里的在线关卡列表也能读到。

  > 说明：浏览器不允许 `file://` 页面用 `fetch` 读本地文件，所以双击打开时列表会提示读取失败——
  > 这是改造前就有的限制，与拆分无关。

## 操作

| 操作 | 键 |
| --- | --- |
| 移动 / 跳跃（二段） | `A` `D` / `空格` |
| 射击 | 鼠标左键（或 `J`） |
| 换枪 | 短按 `Q` |
| 丢枪 | 长按 `Q`（读条约 0.7 秒） |
| 重开本局 | `R` |

触屏设备用左下方向键 + 右下跳跃键，点画面射击；换枪/丢枪目前是键盘 `Q`。

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
│  ├─ weapons.js         武器定义表（射速 / 弹速 / 霰弹数量 / 是否穿墙 / 默认伤害）
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
│     ├─ update.js       每帧逻辑：物理、敌人、子弹、拾取、死亡重生
│     ├─ draw.js         渲染：背景、地形、尖刺、敌人、子弹、粒子、HUD
│     └─ engine.js       装配各模块 + 固定步长主循环 + stop()
```

加载顺序写在 `index.html` 底部，用普通 `<script>`（不是 ES Module），所以双击打开也能跑。
所有模块都挂在 `window.IW` 上，互相之间通过 `IW.xxx()` 调用。

## 武器 / 血包怎么算的

- **装备栏 2 格**，开局带什么由关卡的 `playerWeapons` 决定（编辑器里可配）。
- 地上的武器碰到即捡：**已有同款就忽略**；**两格都满也捡不起来**。
- 长按 `Q` 丢出当前主武器（会飞出一小段距离落地，落地前和刚丢出的瞬间不能被自己捡回）。
- 三种武器：
  | 武器 | 特点 |
  | --- | --- |
  | 突击步枪 | 单发、射速快，和改造前的手感一致 |
  | 霰弹枪 | 一次 5 发扇形散开，射程短、后坐力大 |
  | 狙击步枪 | 伤害高、射速慢，**子弹能穿过实体方块（掩体）**，但打中敌人就停 |
- 伤害不写在武器定义里，而是跟着**每一把武器实体**走（编辑器可改）。
- **血包**：绿色十字，碰到回血；回复量可编辑；满血时不消耗；可以配轨迹来回移动。
- 玩家死亡复活时：血包复原、地图上原有的武器回到出生点、玩家掉在地上的武器消失；**自己装备栏里的武器保留**。

## 关卡 JSON 新增字段

```jsonc
{
  "playerWeapons": [ { "type": "rifle", "damage": 1 } ],   // 初始武器，最多 2 把；不写则默认 1 把突击步枪
  "healthpacks": [
    { "x": 250, "y": 440, "w": 22, "h": 22, "heal": 2,
      "path": [ {"x":250,"y":440}, {"x":450,"y":440} ], "pathSpeed": 2 }
  ],
  "weapons": [
    { "x": 400, "y": 350, "w": 28, "h": 14, "type": "shotgun", "damage": 2,
      "path": [], "pathSpeed": 2 }
  ]
}
```

老关卡没有这些字段也能照常玩（自动补一把突击步枪）。

## 想改东西去哪儿

| 想改什么 | 改哪个文件 |
| --- | --- |
| 武器手感（射速/弹速/霰弹数量/散角） | `js/weapons.js` |
| 跳跃力度、重力、移动速度 | `js/engine/update.js` |
| 拾取 / 丢枪 / 血包的判定规则 | `js/engine/update.js` |
| 武器与血包长什么样、HUD、读条 | `js/engine/draw.js` |
| 触屏按钮、按键响应 | `js/engine/input.js` |
| 新增一种实体或字段 | `js/level/normalize.js`（数据）+ `update.js`（逻辑）+ `draw.js`（画面） |
| 选关界面、卡片样式 | `js/ui/level-list.js` + `css/menu.css` |
| 胜利界面、下一关逻辑 | `js/ui/game-screen.js` |
| 音效 | `js/engine/audio.js` |

关卡文件（`level.json` / `level2.json` / `levels.json`）由同目录的编辑器生成，格式见上一节。
