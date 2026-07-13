# API 参考

## GhCore — 通信层 (`lib/core.js`)

### 初始化
```js
var core = new GhCore('gamehub')
```

### 方法
| 方法 | 说明 |
|------|------|
| `sendToUid(uid, payload)` | 发送数据到指定用户 |
| `sendToUids(uids, payload)` | 发送数据到多个用户 |
| `onData(callback)` | 监听入站消息 |
| `joinMatch(gameId, playerCount)` | 加入匹配池 |
| `leaveMatch(gameId)` | 离开匹配池 |
| `onMatchReady(callback)` | 匹配成功回调 |
| `broadcastMatchJoin(gameId)` | 广播匹配请求 |

### 消息格式
```js
// 发送
core.sendToUid('12345', { type: 'action', payload: { ... } })

// 接收
core.onData(function(data) {
  // data = { type: 'action', payload: {...}, fromUid: '12345' }
})
```

## GhUI — 界面层 (`lib/ui.js`)

### 方法
| 方法 | 说明 |
|------|------|
| `renderCards(list)` | 渲染游戏卡片列表 |
| `showToast(msg, duration?)` | 显示提示 |
| `showModal(opts)` | 显示弹窗 |
| `showPanel()` / `hidePanel()` | 显示/隐藏面板 |
| `updateCardState(id, state)` | 更新卡片状态（idle/waiting/playing） |

### 游戏卡片格式
```js
{
  id: 'uno',          // 游戏 ID
  name: 'UNO',        // 显示名称
  imgUrl: '...svg',   // 图片 URL（可选）
  icon: '🎯',         // Emoji 回退
  players: '2-4人',   // 人数
  desc: '出牌变色',   // 简介
  state: 'idle'       // 状态: idle/waiting/playing
}
```

## GhAssets — 资源注册表 (`lib/assets.js`)

### UNO 卡牌
```js
GhAssets.getUnoCard('red', '5')           // → 红 5
GhAssets.getUnoCard('blue', 'skip')       // → 蓝跳过
GhAssets.getUnoCard('yellow', 'reverse')  // → 黄反转
GhAssets.getUnoCard('green', '+2')        // → 绿 +2
GhAssets.getUnoWild(false)                // → 万能牌
GhAssets.getUnoWild(true)                 // → 万能 +4
GhAssets.getUnoBack()                     // → 牌背
```

### 扑克牌
```js
GhAssets.getPokerCardRef('A', 'spades')   // → 'spade_1'
GhAssets.getPokerCardHtml('K', 'hearts')  // → <svg>...</svg>
GhAssets.getPokerBackHtml()               // → 牌背 HTML
```

### 游戏图标
```js
GhAssets.getGameIcon('gomoku')            // → Feather SVG URL
GhAssets.icons.werewolf.seer              // → 狼人杀·先知
GhAssets.icons.bombcat.bomb               // → 炸弹猫·炸弹
```

### 加载 SVG
```js
GhAssets.loadSvgToElement(url, domElement, callback)
```
