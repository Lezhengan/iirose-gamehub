# 通信协议

## 概述

游戏大厅利用 iirosē 站内 WSS 转发接口进行通信，无需搭建外部服务器。

```
发送: /<包名>uid1,uid2,...:数据
接收: /<包名>发送人uid:数据
```

## 包名

所有通信使用统一包名: **gamehub**

## 数据格式

### 匹配协议

```js
// 加入匹配广播
{ "_ghType": "match_join", "gameId": "uno" }

// 游戏大厅状态查询
{ "_ghType": "match_list" }
```

### 游戏通用

```js
// 发送消息（游戏模块内使用 core.sendToUid）
{
  type: "game_action",       // 消息类型
  payload: { ... },          // 具体数据
  gameId: "uno"              // 游戏 ID（可选）
}

// 游戏状态同步
{
  type: "game_state",
  payload: { state: "playing", ... }
}
```

## 匹配池机制

1. 玩家 A 发送 `/_ghType:match_join, gameId: "uno"`（广播）
2. 其他玩家收到后，可调用 `core.joinMatch("uno", 4)` 加入
3. 达到人数上限后，触发 `onMatchReady` 回调
4. 房主（第一个加入者）负责分发游戏初始状态

## 游戏消息流

```
房主 ←→ 玩家  (点对点)
  └── 全部通过 core.sendToUid / core.onData 收发
  └── 无需广播，仅在匹配阶段使用广播
```
