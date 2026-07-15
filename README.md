# 反复尝试前端仍有bug，暂时不进行更新了+ 请不要使用喵！
#
#
# 蔷薇游戏大厅 🎮

iirosē (蔷薇花园) 站内游戏大厅插件 — 10 款联机小游戏合集

无需外部服务器，所有游戏数据通过 iirosē 站内 WSS 转发协议传输。

---

## 安装

在 iirosē 聊天页按 `` ` `` 打开 JS 终端，粘贴执行：

```js
(async function(){
  var s=document.createElement('script');
  s.src='https://lezhengan.github.io/iirose-gamehub/gamehub.js';
  document.head.appendChild(s);
})();
```

> 只需加载 **这一个文件**，所有依赖会自动加载。不支持油猴(Tampermonkey)。

## 使用

| 命令 | 说明 |
|------|------|
| `/gh` | 打开/关闭游戏面板 |
| `/gh join <游戏ID>` | 加入匹配池 |
| `/gh quit <游戏ID>` | 退出匹配池 |
| `/gh list` | 显示可用游戏 |
| `/gh help` | 帮助信息 |

也可点击侧边栏「工具」分组中的 **游戏大厅** 按钮，或右下角 🎮 FAB 按钮。

## 游戏列表

| 游戏 | ID | 人数 | 说明 |
|------|----|------|------|
| ♟ 五子棋 | gomoku | 2人 | 15×15 棋盘，五子连珠 |
| ⭕ 井字棋 | tictactoe | 2人 | 三连即胜 |
| 🚢 海战棋 | battleship | 2人 | 6×6 击沉敌舰 |
| 🃏 翻翻乐 | memory | 2人 | 配对记忆 |
| 🃏 21 点 | blackjack | 2人 | 比点数对赌 |
| 🕵 谁是卧底 | spy | 4-8人 | 找出卧底 |
| 🐺 狼人杀 | werewolf | 4-10人 | 简版狼人杀 |
| 🎨 你画我猜 | drawguess | 2-6人 | 猜画作 |
| 💣 炸弹猫 | bombcat | 2-5人 | 拆弹对决 |
| 🎯 UNO | uno | 2-4人 | 出牌变色 |

## 技术细节

### 通信协议

使用 iirosē 站内 WSS 转发格式：
- 发送: `/<包名>uid1,uid2:JSON数据`
- 接收: `/<包名>发送人uid:JSON数据`
- 包名: `gamehub`

### CDN 资源

| 资源 | 来源 | 协议 |
|------|------|------|
| 游戏图标 | [Feather Icons](https://feathericons.com/) | MIT |
| UNO 卡牌 | [shiawasenahikari/UnoCard](https://github.com/shiawasenahikari/UnoCard) | 免费 |
| 扑克牌 | [SVG-cards](https://github.com/htdebeer/SVG-cards) | LGPL-2.1 |
| 网站图标 | [Favicon.im](https://favicon.im/) | CC0 |

所有资源通过 [jsdelivr](https://www.jsdelivr.com/) CDN 加速，适配国内网络。

## 协议

MIT
