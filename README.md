# 蔷薇游戏大厅 🎮

> iirosē (蔷薇花园) 站内游戏大厅插件 — 10 款联机小游戏合集

无需外部服务器，所有游戏数据通过 iirosē 站内 WSS 转发协议传输。

---

## 功能

- **10 款游戏**：五子棋、井字棋、海战棋、翻翻乐、21 点、谁是卧底、狼人杀、你画我猜、炸弹猫、UNO
- **匹配池机制**：广播邀请 → 满员自动开局
- **Favicon.im 集成**：自动显示对手网站图标
- **CDN 加速**：游戏图标和卡牌图片全部通过 jsdelivr 加载
- **毛玻璃 UI**：粉色毛玻璃风格面板

## 安装

### 方式一：JS 终端注入（推荐）

1. 在 iirosē 聊天页按 `` ` `` 打开 JS 终端
2. 粘贴以下代码：

```js
(async function(){
  var B='https://cdn.jsdelivr.net/gh/你的GitHub用户名/iirose-gamehub@main';
  ['lib/core.js','lib/ui.js','lib/favicon.js','lib/assets.js','gamehub.js'].forEach(function(p){
    var s=document.createElement('script');
    s.src=B+'/'+p;
    document.head.appendChild(s)
  });
})();
```

### 方式二：安装器

复制 [installer.js](installer.js) 内容到 JS 终端执行。

## 使用

| 命令 | 说明 |
|------|------|
| `/gh` | 打开/关闭游戏面板 |
| `/gh list` | 显示可用游戏 |
| `/gh join <游戏ID>` | 加入匹配池 |
| `/gh quit <游戏ID>` | 退出匹配池 |
| `/gh help` | 帮助信息 |

点击游戏卡片 →「加入匹配」→ 等待其他玩家 → 自动开局

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

### CDN 资源来源

| 资源 | 来源 | 协议 | 用途 |
|------|------|------|------|
| 游戏图标 | [Feather Icons](https://feathericons.com/) | MIT | 大厅卡片图标 |
| UNO 卡牌 | [shiawasenahikari/UnoCard](https://github.com/shiawasenahikari/UnoCard) | 免费 | UNO 牌面 |
| 扑克牌 | [SVG-cards](https://github.com/htdebeer/SVG-cards) | LGPL-2.1 | 21 点牌面 |
| 网站图标 | [Favicon.im](https://favicon.im/) | CC0 | 对手头像 |

所有资源通过 [jsdelivr](https://www.jsdelivr.com/) CDN 加速，适配国内网络。

## 部署到 GitHub Pages

```bash
cd d:\CHAJIAN\iirose-gamehub
git init
git add .
git commit -m "init: 游戏大厅 10款游戏"
# 新建 GitHub 仓库 → 推送到 main 分支
# 启用 GitHub Pages（Source: main 分支, /root）
```

部署后替换安装脚本中的 `你的GitHub用户名` 为实际用户名。

## 协议

MIT
