/**
 * UNO - iirose 游戏大厅游戏模块
 * 包名: nekonya.gamehub
 * 版本: 1.0.0
 *
 * 简化规则:
 *   - 2-4 人，每人发 7 张牌
 *   - 牌分颜色(红黄蓝绿) + 数字(0-9) / +2 / 反转 / 禁止
 *   - 轮流出牌，匹配颜色或数字/符号
 *   - 出到剩 1 张时自动喊 "UNO"
 *   - 先出完者胜
 *
 * 通信方式:
 *   Player → Host(索引0): { type: 'uno_action', payload: { action: 'play'|'draw', card: {color, value} } }
 *   Host → Player:        { type: 'uno_state', payload: { ... } }
 */
(function () {
  'use strict';

  /* ==================== 去重保护 ==================== */
  if (window.__unoInstalled) return;
  window.__unoInstalled = true;

  /* ==================== 卡牌常量 ==================== */
  var COLORS = ['red', 'yellow', 'blue', 'green'];
  var COLOR_MAP = {
    red:    { bg: '#e53935', text: '#fff', label: '红' },
    yellow: { bg: '#fdd835', text: '#000', label: '黄' },
    blue:   { bg: '#1e88e5', text: '#fff', label: '蓝' },
    green:  { bg: '#43a047', text: '#fff', label: '绿' },
  };

  var VALUE_MAP = {
    '0':     { label: '0', type: 'number' },
    '1':     { label: '1', type: 'number' },
    '2':     { label: '2', type: 'number' },
    '3':     { label: '3', type: 'number' },
    '4':     { label: '4', type: 'number' },
    '5':     { label: '5', type: 'number' },
    '6':     { label: '6', type: 'number' },
    '7':     { label: '7', type: 'number' },
    '8':     { label: '8', type: 'number' },
    '9':     { label: '9', type: 'number' },
    'skip':  { label: '🚫', type: 'action' },
    'reverse': { label: '🔄', type: 'action' },
    '+2':    { label: '+2', type: 'action' },
  };

  /* ==================== CDN 基础路径 ==================== */
  var UNO_CDN = 'https://cdn.jsdelivr.net/gh/shiawasenahikari/UnoCard@master/UnoCard/resource';
  var UNO_COLOR_PREFIX = { red: 'r', yellow: 'y', blue: 'b', green: 'g' };
  var UNO_VALUE_PREFIX = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    'skip': '$', 'reverse': '+', '+2': '@',
  };

  /** 获取 UNO 牌面图片 URL */
  function cardImgUrl(card) {
    if (!card || !card.color || !card.value) return '';
    var c = UNO_COLOR_PREFIX[card.color] || card.color;
    var v = UNO_VALUE_PREFIX[card.value] || card.value;
    return UNO_CDN + '/front_' + c + '' + v + '.png';
  }

  /** 获取 UNO 牌背图片 URL */
  function backImgUrl() {
    return UNO_CDN + '/back.png';
  }

  /* ==================== 内部状态 ==================== */
  var config = null;
  var gameState = null;
  var isHost = false;
  var isCleanedUp = false;
  var containerEl = null;
  var hostUid = null;
  var myHand = [];

  /* ==================== DOM 工具 ==================== */
  function ce(tag, cls) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  /* ==================== 牌堆工具 ==================== */
  function buildDeck() {
    var deck = [];
    for (var c = 0; c < COLORS.length; c++) {
      var color = COLORS[c];
      // 每个颜色一张 0
      deck.push({ color: color, value: '0' });
      // 每个颜色两张 1-9
      for (var n = 1; n <= 9; n++) {
        deck.push({ color: color, value: String(n) });
        deck.push({ color: color, value: String(n) });
      }
      // 每个颜色两张功能牌
      deck.push({ color: color, value: 'skip' });
      deck.push({ color: color, value: 'skip' });
      deck.push({ color: color, value: 'reverse' });
      deck.push({ color: color, value: 'reverse' });
      deck.push({ color: color, value: '+2' });
      deck.push({ color: color, value: '+2' });
    }
    return deck;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function cardMatches(a, b) {
    return a.color === b.color || a.value === b.value;
  }

  /* ==================== 主机逻辑 ==================== */
  function hostInit() {
    var deck = shuffle(buildDeck());

    var players = [];
    for (var i = 0; i < config.players.length; i++) {
      var hand = [];
      for (var j = 0; j < 7; j++) hand.push(deck.pop());
      players.push({
        uid: config.players[i].uid,
        name: config.players[i].name,
        hand: hand,
      });
    }

    // 翻开第一张牌作为顶牌（如果是功能牌则重新翻）
    var topCard = deck.pop();
    while (topCard.value === 'skip' || topCard.value === 'reverse' || topCard.value === '+2') {
      deck.unshift(topCard);
      topCard = deck.pop();
    }

    gameState = {
      players: players,
      deck: deck,
      discardPile: [topCard],
      currentTurn: 0,
      direction: 1,
      phase: 'playing',
      winner: null,
      currentColor: topCard.color,
      currentValue: topCard.value,
      unoCalled: {},   // { playerIndex: true }
    };

    hostBroadcastState();
  }

  function hostBroadcastState() {
    if (isCleanedUp || !gameState) return;

    for (var i = 0; i < gameState.players.length; i++) {
      var p = gameState.players[i];

      var publicPlayers = [];
      for (var j = 0; j < gameState.players.length; j++) {
        var pj = gameState.players[j];
        publicPlayers.push({
          uid: pj.uid,
          name: pj.name,
          cardCount: pj.hand.length,
        });
      }

      var top = gameState.discardPile[gameState.discardPile.length - 1];

      config.core.sendToUid(p.uid, {
        type: 'uno_state',
        payload: {
          players: publicPlayers,
          currentTurn: gameState.currentTurn,
          direction: gameState.direction,
          phase: gameState.phase,
          deckSize: gameState.deck.length,
          winner: gameState.winner,
          currentColor: gameState.currentColor,
          currentValue: gameState.currentValue,
          topCard: top,
          myHand: p.hand.slice(),
        },
      });
    }
  }

  function hostNextTurn() {
    if (gameState.phase !== 'playing') return;
    var next = gameState.currentTurn + gameState.direction;
    var len = gameState.players.length;
    if (next < 0) next = len - 1;
    if (next >= len) next = 0;
    gameState.currentTurn = next;
  }

  function hostCheckWinner() {
    for (var i = 0; i < gameState.players.length; i++) {
      if (gameState.players[i].hand.length === 0) {
        gameState.phase = 'ended';
        gameState.winner = i;
        return true;
      }
    }
    return false;
  }

  function hostDrawCard(playerIndex) {
    if (gameState.deck.length === 0) {
      // 牌堆空，洗回收牌（保留顶牌）
      var top = gameState.discardPile.pop();
      while (gameState.discardPile.length > 0) {
        gameState.deck.push(gameState.discardPile.pop());
      }
      gameState.discardPile.push(top);
      shuffle(gameState.deck);
    }

    var card = gameState.deck.pop();
    gameState.players[playerIndex].hand.push(card);
  }

  function hostProcessAction(senderUid, action) {
    if (!gameState || gameState.phase !== 'playing') return;

    var senderIdx = -1;
    for (var i = 0; i < gameState.players.length; i++) {
      if (gameState.players[i].uid === senderUid) {
        senderIdx = i;
        break;
      }
    }
    if (senderIdx === -1) return;

    if (senderIdx !== gameState.currentTurn) return;

    if (action.action === 'draw') {
      // 抽一张牌
      hostDrawCard(senderIdx);
      hostNextTurn();
      hostBroadcastState();

    } else if (action.action === 'play') {
      var card = action.card;
      if (!card || !card.color || !card.value) return;

      var hand = gameState.players[senderIdx].hand;
      var foundIdx = -1;
      for (var j = 0; j < hand.length; j++) {
        if (hand[j].color === card.color && hand[j].value === card.value) {
          foundIdx = j;
          break;
        }
      }
      if (foundIdx === -1) return;

      // 检查匹配
      var top = gameState.discardPile[gameState.discardPile.length - 1];
      if (!cardMatches(card, top)) return;

      // 出牌
      var played = hand.splice(foundIdx, 1)[0];
      gameState.discardPile.push(played);
      gameState.currentColor = played.color;
      gameState.currentValue = played.value;

      // UNO 声明
      if (hand.length === 1) {
        gameState.unoCalled[senderIdx] = true;
      }

      // 检查胜利
      if (hostCheckWinner()) {
        hostBroadcastState();
        handleGameEnd();
        return;
      }

      // 功能牌效果
      if (played.value === 'skip') {
        hostNextTurn(); // 跳过一个玩家
        hostNextTurn();
      } else if (played.value === 'reverse') {
        gameState.direction *= -1;
        hostNextTurn();
      } else if (played.value === '+2') {
        var nextIdx = gameState.currentTurn + gameState.direction;
        var len = gameState.players.length;
        if (nextIdx < 0) nextIdx = len - 1;
        if (nextIdx >= len) nextIdx = 0;
        // 下家抽2张
        hostDrawCard(nextIdx);
        hostDrawCard(nextIdx);
        hostNextTurn();
        hostNextTurn(); // 再跳过下家
      } else {
        hostNextTurn();
      }

      hostBroadcastState();
    }
  }

  /* ==================== 数据接收 ==================== */
  function handleData(uid, data) {
    if (!data || !data.type) return;

    if (data.type === 'uno_action') {
      if (!isHost) return;
      hostProcessAction(uid, data.payload || {});

    } else if (data.type === 'uno_state') {
      if (isHost) return;
      var pl = data.payload || {};
      myHand = pl.myHand || [];
      if (gameState) {
        gameState.players = pl.players || [];
        gameState.currentTurn = pl.currentTurn;
        gameState.direction = pl.direction;
        gameState.phase = pl.phase;
        gameState.deckSize = pl.deckSize;
        gameState.winner = pl.winner;
        gameState.currentColor = pl.currentColor;
        gameState.currentValue = pl.currentValue;
        gameState.topCard = pl.topCard;
      } else {
        gameState = {
          players: pl.players || [],
          currentTurn: pl.currentTurn,
          direction: pl.direction,
          phase: pl.phase,
          deckSize: pl.deckSize,
          winner: pl.winner,
          currentColor: pl.currentColor,
          currentValue: pl.currentValue,
          topCard: pl.topCard,
        };
      }
      render();

      if (gameState.phase === 'ended' && gameState.winner != null) {
        handleGameEnd();
      }
    }
  }

  /* ==================== 渲染 ==================== */
  function createContainer() {
    containerEl = ce('div', 'gh-game-container');
    containerEl.id = 'uno-container';
    containerEl.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'background:rgba(0,0,0,0.7);font-family:Arial,sans-serif;color:#fff;' +
      'overflow-y:auto;';
    document.body.appendChild(containerEl);
  }

  function getColorStyle(color) {
    return COLOR_MAP[color] || { bg: '#555', text: '#fff', label: color };
  }

  function getValueLabel(value) {
    return (VALUE_MAP[value] && VALUE_MAP[value].label) || value;
  }

  function render() {
    if (!containerEl || !gameState) return;

    var isMyTurn = gameState.currentTurn === config.myIndex;
    var top = gameState.topCard || gameState.discardPile[gameState.discardPile.length - 1];

    containerEl.innerHTML = '';

    // ---- 标题 ----
    var titleEl = ce('div', '');
    titleEl.style.cssText = 'font-size:22px;font-weight:bold;margin-bottom:8px;';
    titleEl.textContent = '🎯 UNO';
    containerEl.appendChild(titleEl);

    // ---- 玩家列表 ----
    var playersEl = ce('div', '');
    playersEl.style.cssText =
      'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:10px;';
    for (var i = 0; i < gameState.players.length; i++) {
      var p = gameState.players[i];
      var pEl = ce('div', '');
      pEl.style.cssText =
        'padding:5px 12px;border-radius:10px;font-size:12px;' +
        (i === gameState.currentTurn
          ? 'background:#ff9800;color:#000;font-weight:bold;'
          : 'background:rgba(255,255,255,0.12);');
      var label = p.name + ' (' + p.cardCount + ')';
      if (i === config.myIndex) label += ' ←你';
      if (p.cardCount === 1) label += ' UNO!';
      pEl.textContent = label;
      playersEl.appendChild(pEl);
    }
    containerEl.appendChild(playersEl);

    // ---- 牌堆 & 方向 ----
    var centerEl = ce('div', '');
    centerEl.style.cssText =
      'display:flex;align-items:center;gap:16px;margin-bottom:14px;';

    var dirLabel = gameState.direction === 1 ? '→' : '←';
    var dirEl = ce('div', '');
    dirEl.style.cssText = 'font-size:20px;color:#aaa;';
    dirEl.textContent = dirLabel;
    centerEl.appendChild(dirEl);

    // 顶牌 — 使用真实牌面图片
    if (top) {
      var topImg = ce('img', '');
      topImg.src = cardImgUrl(top);
      topImg.alt = getValueLabel(top.value);
      topImg.style.cssText =
        'width:70px;height:100px;border-radius:8px;' +
        'border:2px solid rgba(255,255,255,0.3);' +
        'box-shadow:0 0 16px rgba(255,255,255,0.15);' +
        'object-fit:cover;';
      topImg.loading = 'lazy';
      centerEl.appendChild(topImg);
    }

    // 牌堆 — 使用牌背图片
    var deckWrapper = ce('div', '');
    deckWrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';
    var deckImg = ce('img', '');
    deckImg.src = backImgUrl();
    deckImg.alt = '牌堆';
    deckImg.style.cssText =
      'width:50px;height:72px;border-radius:6px;' +
      'object-fit:cover;opacity:0.9;';
    deckImg.loading = 'lazy';
    var deckLabel = ce('div', '');
    deckLabel.style.cssText = 'font-size:12px;color:#aaa;';
    deckLabel.textContent = '\uD83D\uDD83 ' + gameState.deckSize + ' 张';
    deckWrapper.appendChild(deckImg);
    deckWrapper.appendChild(deckLabel);
    centerEl.appendChild(deckWrapper);

    containerEl.appendChild(centerEl);

    // ---- 回合信息 ----
    if (gameState.phase === 'ended') {
      var endEl = ce('div', '');
      endEl.style.cssText = 'font-size:18px;margin-bottom:12px;font-weight:bold;';
      if (gameState.winner === config.myIndex) {
        endEl.textContent = '🎉 你赢了！';
        endEl.style.color = '#ffd700';
      } else {
        var wn = gameState.players[gameState.winner]
          ? gameState.players[gameState.winner].name : '未知';
        endEl.textContent = '😿 ' + wn + ' 获胜';
        endEl.style.color = '#ff6b6b';
      }
      containerEl.appendChild(endEl);

      var quitBtn = ce('button', '');
      quitBtn.style.cssText =
        'margin-top:10px;padding:8px 24px;border:none;border-radius:8px;' +
        'background:#666;color:#fff;font-size:14px;cursor:pointer;';
      quitBtn.textContent = '退出游戏';
      quitBtn.addEventListener('click', function () { cleanup(); });
      containerEl.appendChild(quitBtn);
      return;
    }

    if (isMyTurn) {
      var turnEl = ce('div', '');
      turnEl.style.cssText = 'font-size:15px;color:#ff9800;margin-bottom:8px;font-weight:bold;';
      turnEl.textContent = '▶ 轮到你了！';
      containerEl.appendChild(turnEl);
    } else {
      var waitEl = ce('div', '');
      waitEl.style.cssText = 'font-size:13px;color:#aaa;margin-bottom:8px;';
      var curName = gameState.players[gameState.currentTurn]
        ? gameState.players[gameState.currentTurn].name : '';
      waitEl.textContent = '⏳ 等待 ' + curName + ' 操作...';
      containerEl.appendChild(waitEl);
    }

    // ---- 手牌 ----
    var handTitle = ce('div', '');
    handTitle.style.cssText = 'font-size:14px;color:#ccc;margin-bottom:6px;';
    handTitle.textContent = '📜 你的手牌 (' + myHand.length + ' 张):';
    if (myHand.length === 1) {
      handTitle.textContent += ' 🔔 UNO!';
    }
    containerEl.appendChild(handTitle);

    var handEl = ce('div', '');
    handEl.style.cssText =
      'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:14px;' +
      'max-width:600px;';

    for (var k = 0; k < myHand.length; k++) {
      (function (idx) {
        var card = myHand[idx];
        var canPlay = isMyTurn && top && cardMatches(card, top);

        var cardEl = ce('button', '');
        cardEl.style.cssText =
          'width:64px;height:92px;border-radius:8px;padding:0;overflow:hidden;' +
          'border:2px solid ' + (canPlay ? '#ff9800' : 'rgba(255,255,255,0.12)') + ';' +
          'cursor:' + (canPlay ? 'pointer' : 'default') + ';' +
          'transition:transform 0.15s,box-shadow 0.15s;background:transparent;';

        var cardImg = ce('img', '');
        cardImg.src = cardImgUrl(card);
        cardImg.alt = card.color + '-' + card.value;
        cardImg.style.cssText =
          'width:100%;height:100%;object-fit:cover;display:block;';
        cardImg.loading = 'lazy';
        cardEl.appendChild(cardImg);

        if (canPlay) {
          cardEl.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-8px)';
            this.style.boxShadow = '0 8px 20px rgba(255,152,0,0.4)';
          });
          cardEl.addEventListener('mouseleave', function () {
            this.style.transform = '';
            this.style.boxShadow = '';
          });
          cardEl.addEventListener('click', function () {
            if (isHost) {
              hostProcessAction(config.players[config.myIndex].uid, {
                action: 'play',
                card: { color: card.color, value: card.value },
              });
            } else {
              config.core.sendToUid(hostUid, {
                type: 'uno_action',
                payload: {
                  action: 'play',
                  card: { color: card.color, value: card.value },
                },
              });
            }
          });
        }

        handEl.appendChild(cardEl);
      })(k);
    }
    containerEl.appendChild(handEl);

    // ---- 操作按钮 ----
    if (isMyTurn) {
      var btnGroup = ce('div', '');
      btnGroup.style.cssText = 'display:flex;gap:12px;';

      var drawBtn = ce('button', '');
      drawBtn.style.cssText =
        'padding:10px 30px;border:none;border-radius:8px;' +
        'background:#4caf50;color:#fff;font-size:15px;font-weight:bold;cursor:pointer;' +
        'transition:background 0.2s;';
      drawBtn.textContent = '🃏 抽牌';
      drawBtn.addEventListener('mouseenter', function () { this.style.background = '#388e3c'; });
      drawBtn.addEventListener('mouseleave', function () { this.style.background = '#4caf50'; });
      drawBtn.addEventListener('click', function () {
        if (isHost) {
          hostProcessAction(config.players[config.myIndex].uid, { action: 'draw' });
        } else {
          config.core.sendToUid(hostUid, {
            type: 'uno_action',
            payload: { action: 'draw' },
          });
        }
      });
      btnGroup.appendChild(drawBtn);

      containerEl.appendChild(btnGroup);
    }
  }

  /* ==================== 游戏结束 ==================== */
  function handleGameEnd() {
    if (isCleanedUp || !gameState) return;

    if (config.ui && config.ui.showToast) {
      if (gameState.winner != null) {
        var winnerName = gameState.players[gameState.winner]
          ? gameState.players[gameState.winner].name : '未知';
        config.ui.showToast('🏆 UNO 游戏结束！' + winnerName + ' 获胜！', 'success');
      } else {
        config.ui.showToast('🎯 UNO 游戏结束', 'info');
      }
    }

    setTimeout(function () {
      cleanup();
    }, 3000);
  }

  /* ==================== 清理 ==================== */
  function cleanup() {
    isCleanedUp = true;
    if (containerEl && containerEl.parentNode) {
      containerEl.parentNode.removeChild(containerEl);
    }
    containerEl = null;
    gameState = null;
    config = null;
    myHand = [];
  }

  /* ==================== 模块导出 ==================== */
  var module = {
    start: function (cfg) {
      config = cfg;
      hostUid = config.players[0].uid;
      isHost = (config.myIndex === 0);
      isCleanedUp = false;
      myHand = [];

      createContainer();

      config.core.onData(function (uid, data) {
        if (isCleanedUp) return;
        handleData(uid, data);
      });

      if (isHost) {
        hostInit();
      }
    },

    cleanup: function () {
      cleanup();
    },
  };

  window.GameModules = window.GameModules || {};
  window.GameModules.uno = module;

})();
