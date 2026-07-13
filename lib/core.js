/**
 * iirose 游戏大厅 — 通信层
 * 基于 WSS 站内转发: /<包名>uid1,uid2:数据 格式
 * 包名: gamehub
 * 版本: 1.0.0
 *
 * 加载方式: iirose JS 终端注入 / 安装器加载, 非油猴
 */
(function () {
  if (window.__ghCoreInstalled) return;
  window.__ghCoreInstalled = true;

  var PKG = 'gamehub';
  var dataCallbacks = [];
  var matchQueues = {};
  var matchReadyCb = null;
  var msgHookInstalled = false;

  // ===================== 工具 =====================

  function findWin() {
    try { if (window.uid && window.socket) return window; } catch (e) {}
    try {
      var iframes = document.querySelectorAll('iframe');
      for (var i = 0; i < iframes.length; i++) {
        try {
          var fw = iframes[i].contentWindow;
          if (fw && fw.uid && fw.socket) return fw;
        } catch (e) {}
      }
    } catch (e) {}
    return window;
  }

  // ===================== 发送 =====================

  /**
   * 发送私密数据给指定 UID 列表
   * 格式: /gamehub uid1,uid2,...:JSON数据
   */
  function sendToUids(uids, payload) {
    try {
      var win = findWin();
      if (!win.socket || !win.uid) return false;
      if (typeof uids === 'string') uids = [uids];
      var targetStr = uids.join(',');
      var dataStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      var msg = '/' + PKG + ' ' + targetStr + ':' + dataStr;
      win.socket.send(JSON.stringify({
        g: win.uid,
        m: msg,
        mc: win.inputcolorhex || '#f6a',
        i: Date.now().toString(36),
      }));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** 单发 */
  function sendToUid(uid, payload) {
    return sendToUids([uid], payload);
  }

  /** 广播给匹配池中所有人 */
  function broadcastToMatch(gameId, payload) {
    var q = matchQueues[gameId];
    if (!q || q.players.length === 0) return false;
    return sendToUids(q.players, payload);
  }

  // ===================== 接收 =====================

  /**
   * 安装消息接收钩子
   * 拦截 WebSocket message 事件, 解析 /<包名>发送人uid:数据 格式
   */
  function installReceiver() {
    if (msgHookInstalled) return;
    var win = findWin();
    if (!win.socket) {
      setTimeout(installReceiver, 500);
      return;
    }

    // 用 addEventListener 拦截入站消息
    try {
      win.socket.addEventListener('message', function (e) {
        try {
          var raw = typeof e.data === 'string' ? e.data : '';
          var parsed = JSON.parse(raw);
          var m = parsed.m || '';
          // 匹配 /gamehub SENDER_UID:DATA
          var re = new RegExp('^/' + PKG + '\\s+([^:]+):(.+)$');
          var match = m.match(re);
          if (!match) return;
          var senderUid = match[1].trim();
          var dataStr = match[2];
          var payload;
          try { payload = JSON.parse(dataStr); } catch (e) { payload = dataStr; }
          // 触发回调
          for (var i = 0; i < dataCallbacks.length; i++) {
            try { dataCallbacks[i](senderUid, payload); } catch (e) {}
          }
          // 匹配池消息处理
          handleMatchMessage(senderUid, payload);
        } catch (e) {}
      });
      msgHookInstalled = true;
    } catch (e) {
      setTimeout(installReceiver, 500);
    }
  }

  // ===================== 匹配池 =====================

  function handleMatchMessage(uid, payload) {
    if (!payload || payload._ghType !== 'match_join') return;
    var q = matchQueues[payload.gameId];
    if (!q) return;
    // 去重
    for (var i = 0; i < q.players.length; i++) {
      if (q.players[i] === uid) return;
    }
    q.players.push(uid);
    // 满员
    if (q.players.length >= q.playerCount) {
      var players = q.players.slice();
      delete matchQueues[payload.gameId];
      if (matchReadyCb) matchReadyCb(payload.gameId, players);
    }
  }

  /**
   * 加入匹配池
   */
  function joinMatch(gameId, playerCount) {
    if (matchQueues[gameId]) return false;
    var win = findWin();
    if (!win.uid) return false;
    matchQueues[gameId] = {
      playerCount: playerCount,
      players: [],
      host: win.uid,
    };
    // 把自己加入
    matchQueues[gameId].players.push(win.uid);
    // 广播匹配请求给所有人（通过公开聊天）
    broadcastMatchJoin(gameId);
    // 单人模式立即触发
    if (playerCount <= 1) {
      var players = [win.uid];
      delete matchQueues[gameId];
      if (matchReadyCb) matchReadyCb(gameId, players);
    }
    return true;
  }

  /** 广播匹配加入请求（通过公开聊天让其他人收到） */
  function broadcastMatchJoin(gameId) {
    try {
      var win = findWin();
      if (!win.socket || !win.uid) return;
      var msg = '/' + PKG + ' __match:' + JSON.stringify({
        _ghType: 'match_join',
        gameId: gameId,
      });
      win.socket.send(JSON.stringify({
        g: win.uid,
        m: msg,
        mc: win.inputcolorhex || '#f6a',
        i: Date.now().toString(36),
      }));
    } catch (e) {}
  }

  function leaveMatch(gameId) {
    if (!matchQueues[gameId]) return false;
    delete matchQueues[gameId];
    return true;
  }

  // ===================== 公开 API =====================

  var GhCore = {
    PKG: PKG,
    getMyUid: function () { return findWin().uid || null; },
    sendToUid: sendToUid,
    sendToUids: sendToUids,
    broadcastToMatch: broadcastToMatch,
    onData: function (cb) { dataCallbacks.push(cb); },
    offData: function (cb) {
      var idx = dataCallbacks.indexOf(cb);
      if (idx !== -1) dataCallbacks.splice(idx, 1);
    },
    joinMatch: joinMatch,
    leaveMatch: leaveMatch,
    onMatchReady: function (cb) { matchReadyCb = cb; },
    getMatchQueue: function (gameId) { return matchQueues[gameId] || null; },
    getAllQueues: function () { return matchQueues; },
    /** 安装接收钩子（启动时调用） */
    init: function () { installReceiver(); },
  };

  window.GhCore = GhCore;
  console.log('[GhCore] 通信层已加载, 包名:', PKG);
})();
