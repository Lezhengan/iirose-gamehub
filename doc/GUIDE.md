# 使用指南

## 快速开始

### 1. 注入脚本

在 iirosē 聊天页按 `` ` `` 打开 JS 终端，执行：

```js
(async function(){
  var s=document.createElement('script');
  s.src='https://lezhengan.github.io/iirose-gamehub/gamehub.js';
  document.head.appendChild(s);
})();
```

### 2. 打开面板

在输入框输入 `/gh` 回车，或点击页面右下角的 🎮 按钮。

### 3. 开始游戏

1. 点击游戏卡片上的「加入匹配」
2. 等待其他玩家加入
3. 匹配成功后自动进入游戏

## 命令列表

| 命令 | 说明 |
|------|------|
| `/gh` | 打开/关闭游戏大厅面板 |
| `/gh list` | 列出所有可用游戏 |
| `/gh join <游戏ID>` | 加入指定游戏的匹配 |
| `/gh quit <游戏ID>` | 退出指定游戏的匹配 |
| `/gh help` | 查看帮助 |

## 游戏规则简览

### 五子棋
15×15 棋盘，双方轮流落子，先五子连珠者胜。

### 井字棋
3×3 棋盘，三连即胜。

### 海战棋
6×6 海域，布置战舰，轮流轰炸，击沉所有敌舰者胜。

### 翻翻乐
8 对配对，轮流翻牌，找到配对最多者胜。

### 21 点对赌
双方各发两张牌，可继续要牌，点数最接近 21 点且不超过者胜。

### 谁是卧底
每人获得一个词语，其中少数人（卧底）拿到不同词语，通过描述找出卧底。

### 狼人杀（简版）
狼人夜晚杀人，好人白天投票。简化版：狼人 vs 村民，无复杂角色。

### 你画我猜
一人绘画，其他人猜测画作内容。

### 炸弹猫
轮流抽牌，抽到炸弹牌需用拆除牌解拆，否则淘汰。留到最后者胜。

### UNO
打出手牌，匹配花色或数字。先出完所有手牌者胜。支持跳过、反转、+2 和万能牌。

## CDN 加速说明

所有图标和卡牌图片通过 jsdelivr CDN 加载：

- **大厅图标**: Feather Icons (MIT) — `cdn.jsdelivr.net/npm/feather-icons@4.29.2/`
- **UNO 牌面**: UnoCard — `cdn.jsdelivr.net/gh/shiawasenahikari/UnoCard@master/`
- **扑克牌**: SVG-cards (LGPL-2.1) — `cdn.jsdelivr.net/npm/svg-cards@4.0.0/`
- **网站图标**: Favicon.im (CC0) — `favicon.im`

无需额外配置，加载失败会自动回退到 emoji 图标。
