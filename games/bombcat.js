/**
 * 炸弹猫 - iirose 游戏大厅游戏模块
 * 包名: nekonya.gamehub
 * 版本: 1.0.0
 *
 * 简化规则:
 *   - 每名玩家初始 4 张手牌，再从牌堆抽 1 张
 *   - 功能牌: 跳过(跳过抽牌) / 转向(换方向) / 预知(看牌堆顶3张) / 拆除(拆炸弹)
 *   - 抽到炸弹猫则出局(除非有拆除牌自动使用)
 *   - 最后存活者获胜
 *
 * 通信方式:
 *   Player → Host(索引0): { type: 'bc_action', payload: { action: 'draw'|'use', cardIndex: N } }
 *   Host → Player:        { type: 'bc_state', payload: { ... } }
 *   Host → Player:        { type: 'bc_foresee', payload: { cards: [...] } }
 */
(function () {
  'use strict';

  /* ==================== 去重保护 ==================== */
  if (window.__bombcatInstalled) return;
  window.__bombcatInstalled = true;

  /* ==================== 卡牌常量 ==================== */
  var C = {
    BOMB:    { id: 'bomb',    name: '💣 炸弹猫',    desc: '抽到即出局' },
    DEFUSE:  { id: 'defuse',  name: '🔧 拆除牌',    desc: '自动拆除炸弹' },
    SKIP:    { id: 'skip',    name: '⏭ 跳过',      desc: '跳过本次抽牌' },
    REVERSE: { id: 'reverse', name: '🔄 转向',      desc: '改变出牌方向' },
    FORESEE: { id: 'foresee', name: '🔮 预知',      desc: '查看牌堆顶3张' },
    BLANK:   { id: 'blank',  name: '😺 普通猫',    desc: '无害猫咪' },
  };

  var CARD_ID_MAP = {};
  CARD_ID_MAP[C.BOMB.id]    = C.BOMB;
  CARD_ID_MAP[C.DEFUSE.id]  = C.DEFUSE;
  CARD_ID_MAP[C.SKIP.id]    = C.SKIP;
  CARD_ID_MAP[C.REVERSE.id] = C.REVERSE;
  CARD_ID_MAP[C.FORESEE.id] = C.FORESEE;
  CARD_ID_MAP[C.BLANK.id]   = C.BLANK;

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
  function buildDeck(playerCount) {
    var deck = [];
    // 炸弹数量 = 玩家数 - 1（最后一人存活）
    for (var i = 0; i < playerCount - 1; i++) deck.push({ type: C.BOMB.id });
    // 拆除牌 = 玩家数
    for (var i = 0; i < playerCount; i++) deck.push({ type: C.DEFUSE.id });
    // 功能牌
    for (var i = 0; i < 4; i++) deck.push({ type: C.SKIP.id });
    for (var i = 0; i < 4; i++) deck.push({ type: C.REVERSE.id });
    for (var i = 0; i < 3; i++) deck.push({ type: C.FORESEE.id });
    // 填充普通猫牌
    var filler = Math.max(8, 16 - playerCount * 2);
    for (var i = 0; i < filler; i++) deck.push({ type: C.BLANK.id });
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

  /* ==================== 主机逻辑 ==================== */
  function hostInit() {
    var playerCount = config.players.length;
    var deck = shuffle(buildDeck(playerCount));

    var players = [];
    for (var i = 0; i < playerCount; i++) {
      var hand = [];
      for (var j = 0; j < 4; j++) hand.push(deck.pop());
      hand.push(deck.pop()); // 首轮额外抽1张
      players.push({
        uid: config.players[i].uid,
        name: config.players[i].name,
        hand: hand,
        alive: true,
      });
    }

    gameState = {
      players: players,
      deck: deck,
      currentTurn: 0,
      direction: 1,
      phase: 'action',
      winner: null,
    };

    hostBroadcastState();
  }

  function hostBroadcastState() {
    if (isCleanedUp || !gameState) return;

    for (var i = 0; i < gameState.players.length; i++) {
      var p = gameState.players[i];
      if (!p.alive) continue;

      var publicPlayers = [];
      for (var j = 0; j < gameState.players.length; j++) {
        var pj = gameState.players[j];
        publicPlayers.push({
          uid: pj.uid,
          name: pj.name,
          alive: pj.alive,
          cardCount: pj.alive ? pj.hand.length : 0,
        });
      }

      config.core.sendToUid(p.uid, {
        type: 'bc_state',
        payload: {
          players: publicPlayers,
          currentTurn: gameState.currentTurn,
          direction: gameState.direction,
          phase: gameState.phase,
          deckSize: gameState.deck.length,
          winner: gameState.winner,
          myHand: p.hand.slice(),
        },
      });
    }
  }

  function hostSendForesee(playerIndex) {
    var p = gameState.players[playerIndex];
    var top3 = [];
    var deck = gameState.deck;
    for (var i = 0; i < 3 && i < deck.length; i++) {
      top3.push(deck[deck.length - 1 - i]);
    }
    config.core.sendToUid(p.uid, {
      type: 'bc_foresee',
      payload: { cards: top3 },
    });
  }

  function hostNextTurn() {
    if (gameState.phase === 'ended' || !gameState) return;
    var next = gameState.currentTurn + gameState.direction;
    var len = gameState.players.length;
    if (next < 0) next = len - 1;
    if (next >= len) next = 0;

    var attempts = 0;
    while (!gameState.players[next].alive && attempts < len) {
      next += gameState.direction;
      if (next < 0) next = len - 1;
      if (next >= len) next = 0;
      attempts++;
    }
    gameState.currentTurn = next;
  }

  function hostCheckWinner() {
    var alive = [];
    for (var i = 0; i < gameState.players.length; i++) {
      if (gameState.players[i].alive) alive.push(i);
    }
    if (alive.length <= 1) {
      gameState.phase = 'ended';
      gameState.winner = alive.length === 1 ? alive[0] : -1;
      return true;
    }
    return false;
  }

  function hostProcessAction(senderUid, action) {
    if (!gameState || gameState.phase === 'ended') return;

    var senderIdx = -1;
    for (var i = 0; i < gameState.players.length; i++) {
      if (gameState.players[i].uid === senderUid) {
        senderIdx = i;
        break;
      }
    }
    if (senderIdx === -1) return;

    var cur = gameState.currentTurn;
    if (senderIdx !== cur || !gameState.players[senderIdx].alive) return;

    var p = gameState.players[senderIdx];
    var hand = p.hand;

    if (action.action === 'draw') {
      // 抽牌
      if (gameState.deck.length === 0) {
        // 牌堆空: 重新洗牌（简化处理）
        hostBroadcastState();
        return;
      }

      var drawn = gameState.deck.pop();

      if (drawn.type === C.BOMB.id) {
        // 检查是否有拆除牌
        var defuseIdx = -1;
        for (var j = 0; j < hand.length; j++) {
          if (hand[j].type === C.DEFUSE.id) {
            defuseIdx = j;
            break;
          }
        }

        if (defuseIdx !== -1) {
          // 自动使用拆除牌
          hand.splice(defuseIdx, 1);
          // 炸弹移除（简化规则）
          hostNextTurn();
        } else {
          // 出局
          p.alive = false;
          var over = hostCheckWinner();
          if (over) {
            hostBroadcastState();
            handleGameEnd();
            return;
          }
          hostNextTurn();
        }
      } else {
        // 普通牌加入手牌
        hand.push(drawn);
        hostNextTurn();
      }

      hostBroadcastState();

    } else if (action.action === 'use') {
      var cardIdx = action.cardIndex;
      if (cardIdx == null || cardIdx < 0 || cardIdx >= hand.length) return;
      var card = hand[cardIdx];

      if (card.type === C.SKIP.id) {
        hand.splice(cardIdx, 1);
        hostNextTurn();
        hostBroadcastState();

      } else if (card.type === C.REVERSE.id) {
        hand.splice(cardIdx, 1);
        gameState.direction *= -1;
        hostNextTurn();
        hostBroadcastState();

      } else if (card.type === C.FORESEE.id) {
        hand.splice(cardIdx, 1);
        hostSendForesee(senderIdx);
        hostNextTurn();
        hostBroadcastState();

      } else {
        // 其他牌(炸弹/拆除/普通猫)不能主动使用
        return;
      }
    }
  }

  /* ==================== 数据接收 ==================== */
  function handleData(uid, data) {
    if (!data || !data.type) return;

    if (data.type === 'bc_action') {
      // 非主机不处理动作
      if (!isHost) return;
      hostProcessAction(uid, data.payload || {});

    } else if (data.type === 'bc_state') {
      // 收到主机广播的状态
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
      } else {
        gameState = {
          players: pl.players || [],
          currentTurn: pl.currentTurn,
          direction: pl.direction,
          phase: pl.phase,
          deckSize: pl.deckSize,
          winner: pl.winner,
        };
      }
      render();

      if (gameState.phase === 'ended' && gameState.winner != null) {
        handleGameEnd();
      }

    } else if (data.type === 'bc_foresee') {
      // 预知结果
      if (isHost) return;
      var cards = (data.payload && data.payload.cards) || [];
      showForeseeModal(cards);
    }
  }

  /* ==================== 渲染 ==================== */
  function createContainer() {
    containerEl = ce('div', 'gh-game-container');
    containerEl.id = 'bombcat-container';
    containerEl.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'background:rgba(0,0,0,0.7);font-family:Arial,sans-serif;color:#fff;';
    document.body.appendChild(containerEl);
  }

  function render() {
    if (!containerEl || !gameState) return;

    var isMyTurn = gameState.currentTurn === config.myIndex;
    var me = gameState.players[config.myIndex];
    var isAlive = me ? me.alive : true;

    containerEl.innerHTML = '';

    // ---- 标题 ----
    var titleEl = ce('div', '');
    titleEl.style.cssText = 'font-size:22px;font-weight:bold;margin-bottom:8px;';
    titleEl.textContent = '💣 炸弹猫';
    containerEl.appendChild(titleEl);

    // ---- 玩家列表 ----
    var playersEl = ce('div', '');
    playersEl.style.cssText =
      'display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:12px;';
    for (var i = 0; i < gameState.players.length; i++) {
      var p = gameState.players[i];
      var pEl = ce('div', '');
      pEl.style.cssText =
        'padding:6px 14px;border-radius:12px;font-size:13px;' +
        (p.alive
          ? (i === gameState.currentTurn ? 'background:#ff9800;color:#000;font-weight:bold;' : 'background:rgba(255,255,255,0.15);')
          : 'background:rgba(200,50,50,0.4);text-decoration:line-through;');
      var label = p.name + ' (' + p.cardCount + ')';
      if (i === config.myIndex) label += ' ←你';
      pEl.textContent = label;
      playersEl.appendChild(pEl);
    }
    containerEl.appendChild(playersEl);

    // ---- 牌堆信息 ----
    var infoEl = ce('div', '');
    infoEl.style.cssText = 'font-size:13px;margin-bottom:10px;color:#aaa;';
    infoEl.textContent = '🃏 牌堆剩余: ' + gameState.deckSize + ' 张';
    containerEl.appendChild(infoEl);

    // ---- 回合信息 ----
    if (!isAlive) {
      var deadEl = ce('div', '');
      deadEl.style.cssText = 'font-size:18px;color:#ff6b6b;margin-bottom:12px;font-weight:bold;';
      deadEl.textContent = '💀 你已出局';
      containerEl.appendChild(deadEl);
    } else if (gameState.phase === 'ended') {
      var endEl = ce('div', '');
      endEl.style.cssText = 'font-size:18px;margin-bottom:12px;font-weight:bold;';
      if (gameState.winner === config.myIndex) {
        endEl.textContent = '🎉 你赢了！';
        endEl.style.color = '#ffd700';
      } else {
        endEl.textContent = '😿 游戏结束';
        endEl.style.color = '#ff6b6b';
      }
      containerEl.appendChild(endEl);
    } else if (isMyTurn) {
      var turnEl = ce('div', '');
      turnEl.style.cssText = 'font-size:16px;color:#ff9800;margin-bottom:10px;font-weight:bold;';
      turnEl.textContent = '▶ 轮到你了！';
      containerEl.appendChild(turnEl);
    } else {
      var waitEl = ce('div', '');
      waitEl.style.cssText = 'font-size:14px;color:#aaa;margin-bottom:10px;';
      var curName = gameState.players[gameState.currentTurn]
        ? gameState.players[gameState.currentTurn].name : '';
      waitEl.textContent = '⏳ 等待 ' + curName + ' 操作...';
      containerEl.appendChild(waitEl);
    }

    if (!isAlive || gameState.phase === 'ended') {
      // 显示退出按钮
      var quitBtn = ce('button', '');
      quitBtn.style.cssText =
        'margin-top:12px;padding:8px 24px;border:none;border-radius:8px;' +
        'background:#666;color:#fff;font-size:14px;cursor:pointer;';
      quitBtn.textContent = '退出游戏';
      quitBtn.addEventListener('click', function () { cleanup(); });
      containerEl.appendChild(quitBtn);
      return;
    }

    // ---- 手牌 ----
    if (isAlive) {
      var handTitle = ce('div', '');
      handTitle.style.cssText = 'font-size:14px;color:#ccc;margin-bottom:6px;';
      handTitle.textContent = '📜 你的手牌 (' + myHand.length + ' 张):';
      containerEl.appendChild(handTitle);

      var handEl = ce('div', '');
      handEl.style.cssText =
        'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:14px;';
      for (var k = 0; k < myHand.length; k++) {
        (function (idx) {
          var card = myHand[idx];
          var info = CARD_ID_MAP[card.type] || { name: card.type, desc: '' };
          var isPlayable = isMyTurn &&
            (card.type === C.SKIP.id || card.type === C.REVERSE.id || card.type === C.FORESEE.id);

          var FEATHER = 'https://cdn.jsdelivr.net/npm/feather-icons@4.29.2/dist/icons';
          var cardIconMap = {
            'bomb':    FEATHER + '/alert-triangle.svg',
            'defuse':  FEATHER + '/shield.svg',
            'skip':    FEATHER + '/skip-forward.svg',
            'reverse': FEATHER + '/rotate-ccw.svg',
            'foresee': FEATHER + '/eye.svg',
          };
          var cardEl = ce('button', '');
          cardEl.style.cssText =
            'width:90px;height:120px;border-radius:10px;padding:6px;border:2px solid ' +
            (isPlayable ? '#ff9800' : 'rgba(255,255,255,0.2)') + ';' +
            'background:' + (card.type === C.BOMB.id ? '#d32f2f' :
                             card.type === C.DEFUSE.id ? '#388e3c' :
                             card.type === C.SKIP.id ? '#1565c0' :
                             card.type === C.REVERSE.id ? '#7b1fa2' :
                             card.type === C.FORESEE.id ? '#00838f' : '#546e7a') + ';' +
            'color:#fff;font-size:13px;cursor:' + (isPlayable ? 'pointer' : 'default') + ';' +
            'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
            'gap:4px;word-break:break-word;text-align:center;';

          // 添加 CDN 小图标
          var iconUrl = cardIconMap[card.type];
          if (iconUrl) {
            var iconImg = ce('img', '');
            iconImg.src = iconUrl;
            iconImg.alt = card.type;
            iconImg.style.cssText = 'width:28px;height:28px;object-fit:contain;filter:brightness(10);';
            iconImg.loading = 'lazy';
            cardEl.appendChild(iconImg);
          }
          cardEl.style.transition = 'transform 0.15s';
          cardEl.textContent = info.name;

          if (isPlayable) {
            cardEl.addEventListener('mouseenter', function () {
              this.style.transform = 'translateY(-6px)';
            });
            cardEl.addEventListener('mouseleave', function () {
              this.style.transform = '';
            });
            cardEl.addEventListener('click', function () {
              // 发送使用牌动作
              if (isHost) {
                hostProcessAction(config.players[config.myIndex].uid, {
                  action: 'use',
                  cardIndex: idx,
                });
              } else {
                config.core.sendToUid(hostUid, {
                  type: 'bc_action',
                  payload: { action: 'use', cardIndex: idx },
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
        btnGroup.style.cssText = 'display:flex;gap:12px;margin-top:4px;';

        // 抽牌按钮
        var drawBtn = ce('button', '');
        drawBtn.style.cssText =
          'padding:10px 30px;border:none;border-radius:8px;' +
          'background:#4caf50;color:#fff;font-size:16px;font-weight:bold;cursor:pointer;' +
          'transition:background 0.2s;';
        drawBtn.textContent = '🃏 抽牌';
        drawBtn.addEventListener('mouseenter', function () { this.style.background = '#388e3c'; });
        drawBtn.addEventListener('mouseleave', function () { this.style.background = '#4caf50'; });
        drawBtn.addEventListener('click', function () {
          if (isHost) {
            hostProcessAction(config.players[config.myIndex].uid, { action: 'draw' });
          } else {
            config.core.sendToUid(hostUid, {
              type: 'bc_action',
              payload: { action: 'draw' },
            });
          }
        });
        btnGroup.appendChild(drawBtn);

        containerEl.appendChild(btnGroup);
      }
    }
  }

  /* ==================== 预知弹窗 ==================== */
  function showForeseeModal(cards) {
    var overlay = ce('div', '');
    overlay.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;' +
      'display:flex;align-items:center;justify-content:center;' +
      'background:rgba(0,0,0,0.75);';
    overlay.id = 'bombcat-foresee-overlay';

    var modal = ce('div', '');
    modal.style.cssText =
      'background:#1e1e2e;border-radius:16px;padding:24px;min-width:300px;' +
      'text-align:center;color:#fff;border:1px solid rgba(255,255,255,0.1);';

    var title = ce('div', '');
    title.style.cssText = 'font-size:18px;font-weight:bold;margin-bottom:16px;color:#4dd0e1;';
    title.textContent = '🔮 牌堆顶3张';
    modal.appendChild(title);

    var cardsEl = ce('div', '');
    cardsEl.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-bottom:16px;';
    for (var i = 0; i < cards.length; i++) {
      var info = CARD_ID_MAP[cards[i].type] || { name: cards[i].type, desc: '' };
      var cEl = ce('div', '');
      cEl.style.cssText =
        'width:80px;height:100px;border-radius:8px;border:2px solid rgba(255,255,255,0.15);' +
        'background:' + (cards[i].type === C.BOMB.id ? '#d32f2f' :
                         cards[i].type === C.DEFUSE.id ? '#388e3c' : '#546e7a') + ';' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'font-size:12px;padding:4px;text-align:center;';
      cEl.textContent = info.name;
      cardsEl.appendChild(cEl);
    }
    modal.appendChild(cardsEl);

    var okBtn = ce('button', '');
    okBtn.style.cssText =
      'padding:8px 28px;border:none;border-radius:8px;background:#00838f;' +
      'color:#fff;font-size:14px;cursor:pointer;';
    okBtn.textContent = '知道了';
    okBtn.addEventListener('click', function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    });
    modal.appendChild(okBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 点击背景关闭
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
  }

  /* ==================== 游戏结束 ==================== */
  function handleGameEnd() {
    if (isCleanedUp) return;
    if (!gameState) return;

    if (config.ui && config.ui.showToast) {
      if (gameState.winner != null) {
        var winnerName = gameState.players[gameState.winner]
          ? gameState.players[gameState.winner].name : '未知';
        config.ui.showToast('🏆 炸弹猫游戏结束！' + winnerName + ' 获胜！', 'success');
      } else {
        config.ui.showToast('💣 炸弹猫游戏结束', 'info');
      }
    }

    // 自动清理
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
    // 移除预知弹窗
    var foreseeOverlay = document.getElementById('bombcat-foresee-overlay');
    if (foreseeOverlay && foreseeOverlay.parentNode) {
      foreseeOverlay.parentNode.removeChild(foreseeOverlay);
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

      // 注册数据监听
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
  window.GameModules.bombcat = module;

})();
