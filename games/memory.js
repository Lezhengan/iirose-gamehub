/**
 * 翻翻乐 (Memory) - iirose 游戏大厅二人对战模块
 * 4×4 卡片（8对配对），轮流翻牌，配对得分
 */
(function () {
  'use strict';

  if (window.GameModules && window.GameModules.memory) return;

  var EMOJIS = ['🎀', '🎮', '🎭', '🎨', '🎪', '🎯', '🎲', '🎸'];
  var TOTAL = 16;   // 4×4
  var PAIRS = 8;

  // ====== 状态 ======
  var C = null;
  var STATE = null;        // 'init' | 'playing' | 'gameover'
  var DOM = {};

  var board = [];          // 16 个 emoji
  var revealed = [];       // boolean[16] 永久翻开
  var flipped = [];        // 当前回合翻开索引 (最多2个)
  var locked = false;      // 翻牌锁定（展示动画时禁止点击）

  var myScore = 0;
  var oppScore = 0;
  var myTurn = false;
  var boardReceived = false;
  var boardSent = false;
  var turnCount = 0;       // 已完成的配对总数（0-8）
  var gameOver = false;
  var cleanupTimer = null;

  // ====== 对手快捷 ======
  function getOpponentUid() {
    if (!C || !C.players || C.players.length < 2) return null;
    return C.players[1 - C.myIndex].uid;
  }

  function getMyUid() {
    return C ? C.players[C.myIndex].uid : null;
  }

  // ====== 工具 ======
  function createEl(tag, cls) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  // ====== 模块接口 ======
  function start(config) {
    cleanup();
    C = config;
    STATE = 'init';
    gameOver = false;
    boardReceived = false;
    boardSent = false;
    myScore = 0;
    oppScore = 0;
    turnCount = 0;
    flipped = [];
    locked = false;
    cleanupTimer = null;

    // 初始化数组
    revealed = [];
    for (var i = 0; i < TOTAL; i++) revealed[i] = false;

    C.core.onData(onData);

    if (C.myIndex === 0) {
      // 玩家 0 生成并发送棋盘
      generateBoard();
      boardSent = true;
      boardReceived = true;
      sendToOpponent({ type: 'mem_board', payload: { board: board.slice() } });
      myTurn = true;
      showGameUI('等待对手接入...');
      STATE = 'playing';
      updateUI();
    } else {
      // 玩家 1 等待接收棋盘
      myTurn = false;
      showGameUI('等待对手发牌...');
    }
  }

  function cleanup() {
    if (cleanupTimer) { clearTimeout(cleanupTimer); cleanupTimer = null; }
    gameOver = true;
    removeUI();
    C = null;
    STATE = null;
  }

  // ====== 棋盘生成 ======
  function generateBoard() {
    board = [];
    for (var i = 0; i < PAIRS; i++) {
      board.push(EMOJIS[i]);
      board.push(EMOJIS[i]);
    }
    // Fisher-Yates 洗牌
    for (var i = TOTAL - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = board[i];
      board[i] = board[j];
      board[j] = tmp;
    }
  }

  // ====== 通信 ======
  function sendToOpponent(payload) {
    var uid = getOpponentUid();
    if (uid && C.core.sendToUid) {
      C.core.sendToUid(uid, payload);
    }
  }

  function onData(uid, data) {
    if (gameOver || !data || !data.type) return;

    switch (data.type) {
      case 'mem_board':
        if (data.payload && data.payload.board) {
          board = data.payload.board;
          boardReceived = true;
          STATE = 'playing';
          showGameUI();
          updateUI();
          if (C.ui) C.ui.showToast('🃏 翻翻乐开始！', false);
        }
        break;

      case 'mem_move':
        if (data.payload && !gameOver && STATE === 'playing') {
          receiveFlip(data.payload);
        }
        break;

      case 'mem_resolve':
        if (data.payload && !gameOver) {
          receiveResolve(data.payload);
        }
        break;

      case 'mem_ready':
        // 玩家 1 已准备好
        if (C.myIndex === 0 && STATE === 'init') {
          STATE = 'playing';
          updateUI();
          if (C.ui) C.ui.showToast('🃏 翻翻乐开始！', false);
        }
        break;
    }
  }

  // ====== UI 管理 ======
  function removeUI() {
    if (DOM.container && DOM.container.parentNode) {
      DOM.container.parentNode.removeChild(DOM.container);
    }
    DOM = {};
  }

  function showGameUI(statusMsg) {
    removeUI();

    var container = createEl('div', 'mem-container');
    container.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483646;' +
      'background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;';
    DOM.container = container;

    var panel = createEl('div', 'mem-panel');
    panel.style.cssText =
      'background:#1e1e30;border:1px solid rgba(255,255,255,0.1);border-radius:12px;' +
      'padding:20px;max-width:420px;width:90%;color:#fff;text-align:center;' +
      'box-shadow:0 8px 40px rgba(0,0,0,0.6);';
    DOM.panel = panel;

    // 标题
    var title = createEl('div', 'mem-title');
    title.textContent = '🃏 翻翻乐';
    title.style.cssText = 'font-size:18px;font-weight:700;margin-bottom:4px;';
    panel.appendChild(title);

    // 状态/回合信息
    var info = createEl('div', 'mem-info');
    info.style.cssText = 'font-size:13px;color:#aaa;margin-bottom:10px;';
    panel.appendChild(info);
    DOM.info = info;

    // 计分板
    var scoreRow = createEl('div', 'mem-scores');
    scoreRow.style.cssText =
      'display:flex;justify-content:space-between;margin-bottom:12px;' +
      'font-size:14px;padding:0 4px;';
    var myName = C && C.players && C.players[C.myIndex] ? C.players[C.myIndex].name : '我';
    var oppName = C && C.players && C.players[1 - C.myIndex] ? C.players[1 - C.myIndex].name : '对手';
    scoreRow.innerHTML =
      '<span>🧑 ' + escapeHtml(myName) + ': <strong id="mem-score-me">0</strong></span>' +
      '<span style="color:#666">|</span>' +
      '<span>👤 ' + escapeHtml(oppName) + ': <strong id="mem-score-opp">0</strong></span>';
    panel.appendChild(scoreRow);
    DOM.scoreRow = scoreRow;

    // 网格
    var grid = createEl('div', 'mem-grid');
    grid.style.cssText =
      'display:inline-grid;grid-template-columns:repeat(4,1fr);' +
      'gap:6px;margin:0 auto;';
    panel.appendChild(grid);
    DOM.grid = grid;

    renderGrid(grid, statusMsg);

    // 提示
    if (statusMsg) {
      var statusEl = createEl('div', 'mem-status');
      statusEl.style.cssText = 'margin-top:12px;font-size:13px;color:#ffd700;';
      statusEl.textContent = statusMsg;
      panel.appendChild(statusEl);
      DOM.statusEl = statusEl;
    }

    container.appendChild(panel);
    document.body.appendChild(container);

    if (!statusMsg) {
      updateUI();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderGrid(grid) {
    grid.innerHTML = '';
    DOM.cardEls = [];

    for (var i = 0; i < TOTAL; i++) {
      var card = createEl('div', 'mem-card');
      card.style.cssText =
        'width:64px;height:64px;border-radius:10px;cursor:pointer;' +
        'display:flex;align-items:center;justify-content:center;' +
        'font-size:28px;transition:all 0.2s ease;' +
        'border:2px solid rgba(255,255,255,0.08);' +
        'user-select:none;';
      card.dataset.index = i;

      var front = createEl('span', 'mem-card-front');
      front.style.cssText = 'display:none;';
      front.textContent = board[i] || '?';
      card.appendChild(front);

      var back = createEl('span', 'mem-card-back');
      back.textContent = '?';
      back.style.cssText = 'color:#888;font-size:20px;font-weight:700;';
      card.appendChild(back);

      card.addEventListener('click', onCardClick);
      card.addEventListener('mouseenter', function () {
        if (this.dataset.revealed !== '1' && this.dataset.flipped !== '1' && !locked) {
          this.style.borderColor = 'rgba(255,255,255,0.3)';
        }
      });
      card.addEventListener('mouseleave', function () {
        if (this.dataset.revealed !== '1' && this.dataset.flipped !== '1') {
          this.style.borderColor = 'rgba(255,255,255,0.08)';
        }
      });

      grid.appendChild(card);
      DOM.cardEls[i] = card;
    }
  }

  // ====== UI 更新 ======
  function updateUI() {
    if (!DOM.cardEls) return;

    // 更新卡片
    for (var i = 0; i < TOTAL; i++) {
      var card = DOM.cardEls[i];
      var front = card.querySelector('.mem-card-front');
      var back = card.querySelector('.mem-card-back');

      if (revealed[i] || flipped.indexOf(i) !== -1) {
        // 翻开
        front.style.display = '';
        back.style.display = 'none';
        card.style.background = revealed[i] ? '#3a5a3a' : '#4a4a6a';
        card.style.borderColor = revealed[i] ? '#5a8a5a' : '#6a6a9a';
        card.dataset.revealed = revealed[i] ? '1' : '0';
        card.dataset.flipped = flipped.indexOf(i) !== -1 ? '1' : '0';
      } else {
        // 盖着
        front.style.display = 'none';
        back.style.display = '';
        card.style.background = '#2a2a40';
        card.style.borderColor = 'rgba(255,255,255,0.08)';
        card.dataset.revealed = '0';
        card.dataset.flipped = '0';
      }
    }

    // 分数
    var scoreMe = document.getElementById('mem-score-me');
    var scoreOpp = document.getElementById('mem-score-opp');
    if (scoreMe) scoreMe.textContent = myScore;
    if (scoreOpp) scoreOpp.textContent = oppScore;

    // 回合信息
    if (DOM.info) {
      if (gameOver) {
        DOM.info.textContent = '⏹ 游戏结束';
        DOM.info.style.color = '#ffd700';
      } else if (myTurn) {
        DOM.info.textContent = '🎯 你的回合 — 点击卡片配对';
        DOM.info.style.color = '#4fc3f7';
      } else {
        DOM.info.textContent = '⏳ 对手回合 — 等待中...';
        DOM.info.style.color = '#ffd700';
      }
    }
  }

  // ====== 翻牌逻辑 ======
  function onCardClick() {
    if (gameOver || STATE !== 'playing' || !boardReceived) return;
    if (!myTurn) {
      showToast('现在是对方的回合', true);
      return;
    }
    if (locked) return;

    var idx = parseInt(this.dataset.index);
    if (isNaN(idx) || idx < 0 || idx >= TOTAL) return;

    // 已永久翻开
    if (revealed[idx]) {
      showToast('该卡片已配对', true);
      return;
    }
    // 当前回合已翻
    if (flipped.indexOf(idx) !== -1) return;
    // 已翻两张
    if (flipped.length >= 2) return;

    // 翻牌
    flipped.push(idx);
    sendToOpponent({ type: 'mem_move', payload: { index: idx } });
    updateUI();

    if (flipped.length === 2) {
      // 翻了两张 → 锁定并判定
      locked = true;

      cleanupTimer = setTimeout(function () {
        cleanupTimer = null;
        resolveTurn();
      }, 900);
    }
  }

  function resolveTurn() {
    if (gameOver || flipped.length < 2) return;

    var i1 = flipped[0];
    var i2 = flipped[1];
    var match = (board[i1] === board[i2]);

    if (match) {
      // 配对成功
      revealed[i1] = true;
      revealed[i2] = true;
      myScore++;
      turnCount++;
      showToast('✅ 配对成功！', false);
    } else {
      showToast('❌ 不匹配', true);
    }

    // 通知对手
    sendToOpponent({
      type: 'mem_resolve',
      payload: {
        match: match,
        myScore: myScore,
        oppScore: oppScore,
        nextTurnUid: match ? getMyUid() : getOpponentUid(),
      },
    });

    flipped = [];

    if (match) {
      // 配对成功，继续本玩家回合
      locked = false;
      // 检查是否全部配完
      if (turnCount >= PAIRS) {
        endGame();
      } else {
        updateUI();
      }
    } else {
      // 不匹配，切换回合
      myTurn = false;
      locked = false;
      updateUI();
    }
  }

  // ====== 接收对手操作 ======
  function receiveFlip(payload) {
    if (gameOver || STATE !== 'playing') return;
    var idx = payload.index;
    if (isNaN(idx) || idx < 0 || idx >= TOTAL) return;
    if (revealed[idx]) return;
    if (flipped.indexOf(idx) !== -1) return;
    if (flipped.length >= 2) return;

    flipped.push(idx);
    updateUI();

    // 对手翻了两张后等 resolve
    if (flipped.length === 2) {
      locked = true;
    }
  }

  function receiveResolve(payload) {
    if (gameOver) return;
    var match = payload.match;
    var i1 = flipped[0];
    var i2 = flipped[1];

    if (match && i1 !== undefined && i2 !== undefined) {
      revealed[i1] = true;
      revealed[i2] = true;
      turnCount++;
    }

    // 分数同步：发送方的 myScore 是对方的分数，oppScore 是本方的分数
    if (payload.myScore !== undefined) oppScore = payload.myScore;
    if (payload.oppScore !== undefined) myScore = payload.oppScore;

    if (match) {
      var myUid = getMyUid();
      var nextUid = payload.nextTurnUid;
      myTurn = (nextUid === myUid);
    } else {
      myTurn = true; // 对手没配对，轮到我了
    }

    flipped = [];
    locked = false;
    updateUI();

    if (turnCount >= PAIRS) {
      endGame();
    }
  }

  // ====== 游戏结束 ======
  function endGame() {
    if (gameOver) return;
    gameOver = true;
    STATE = 'gameover';

    var winner = '';
    if (myScore > oppScore) {
      winner = '🎉 你赢了！' + myScore + ' : ' + oppScore;
      if (C.ui) C.ui.showToast('🎉 翻翻乐胜利！', false);
    } else if (oppScore > myScore) {
      winner = '😞 你输了 ' + myScore + ' : ' + oppScore;
      if (C.ui) C.ui.showToast('😞 翻翻乐惜败', true);
    } else {
      winner = '🤝 平局！' + myScore + ' : ' + oppScore;
      if (C.ui) C.ui.showToast('🤝 翻翻乐平局', false);
    }

    if (DOM.info) {
      DOM.info.textContent = winner;
      DOM.info.style.color = '#ffd700';
      DOM.info.style.fontSize = '15px';
      DOM.info.style.fontWeight = '600';
    }

    sendToOpponent({ type: 'mem_gameover', payload: { myScore: myScore, oppScore: oppScore } });

    // 延迟清理
    cleanupTimer = setTimeout(function () {
      cleanupTimer = null;
      removeUI();
      C = null;
      STATE = null;
    }, 3000);
  }

  // ====== Toast ======
  function showToast(msg, isErr) {
    if (C && C.ui && C.ui.showToast) {
      C.ui.showToast(msg, isErr);
    }
  }

  // ====== 注册模块 ======
  window.GameModules = window.GameModules || {};
  window.GameModules.memory = {
    start: start,
    cleanup: cleanup,
  };

})();
