/*
 * weapons.js —— 武器定义表（攻击方式）
 *
 * 每把武器只描述「怎么打」：射速、弹速、一次几发、散角、能不能穿墙。
 * 伤害不在这里固定，而是跟着关卡里的每一把武器走（编辑器里可编辑）。
 *
 * 新增一种武器：
 *   1. 在这里加一条定义
 *   2. draw.js 的 drawWeaponItems() 加一个外观
 *   3. 编辑器 core.js 的 WEAPON_OPTIONS 里加一项
 */
(function (IW) {
  'use strict';

  IW.WEAPONS = {
    /* 和以前一样的单发步枪 */
    rifle: {
      name: '突击步枪',
      short: '突击',
      cd: 9,              // 射击间隔（帧）
      speed: 14,          // 子弹速度
      life: 80,           // 子弹存活帧数
      pellets: 1,         // 每次发射几颗
      spread: 0,          // 散角（弧度，每颗之间）
      pierce: false,      // 是否穿透实体方块
      recoil: 0.6,        // 后坐力（反向推动玩家）
      shake: 2.2,         // 屏幕震动
      color: '#fde047',   // 子弹 / 枪口颜色
      damage: 1           // 默认伤害（关卡里可以改）
    },

    /* 一次打出 5 颗、呈扇形散开，射程短 */
    shotgun: {
      name: '霰弹枪',
      short: '霰弹',
      cd: 34,
      speed: 12,
      life: 26,
      pellets: 5,
      spread: 0.17,
      pierce: false,
      recoil: 2.4,
      shake: 3.4,
      color: '#fb923c',
      damage: 1
    },

    /* 伤害高、射速慢，子弹能穿过掩体（实体方块） */
    sniper: {
      name: '狙击步枪',
      short: '狙击',
      cd: 52,
      speed: 24,
      life: 90,
      pellets: 1,
      spread: 0,
      pierce: true,
      recoil: 1.8,
      shake: 3,
      color: '#a78bfa',
      damage: 3
    }
  };

  IW.WEAPON_ORDER = ['rifle', 'shotgun', 'sniper'];

  /* 装备栏格数 */
  IW.MAX_WEAPON_SLOTS = 2;

  /* 长按 Q 丢枪需要的帧数（约 0.7 秒） */
  IW.WEAPON_DROP_HOLD = 42;

  /* 丢出去的水平距离 */
  IW.WEAPON_DROP_DIST = 74;

  /* 类型校验：不认识的类型一律当作突击步枪 */
  IW.weaponDef = function (type) {
    return IW.WEAPONS[type] || IW.WEAPONS.rifle;
  };

  IW.weaponDefaultDamage = function (type) {
    return IW.weaponDef(type).damage;
  };
})(window.IW = window.IW || {});
