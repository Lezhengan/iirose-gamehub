/**
 * iirose 游戏大厅 — 井字棋模块
 * 3×3 棋盘，先手（myIndex===0）为 X，后手为 O
 */
(function () {
  'use strict';

  /* ==================== 去重保护 ==================== */
  if (window.__gamehubTictactoeInstalled) return;
  window.__gamehubTictactoeInstalled = true;

  /* ==================== 常量 ==================== */
  var CELL_COUNT = 9;

  /* ==================== 内部状态 ==================== */
  var config = null;
  var cells = [];               // cells[0..8]: -1=空, 0=X(先手), 1=O(后手)
  var currentPlayer = 0;       // 0=X回合, 1=O回合
  var myMark = -1;             // 0=X, 1=O
  var gameOver = false;
  var modalOpen = false;

  /* ==================== 工具函数 ==================== */
  function getMyUid() {
    return config.core.getMyUid();
  }

  function getOpponent() {
    for (var i = 0; i < config.players.length; i++) {
      if (config.players[i].uid !== getMyUid()) {
        return config.players[i];
      }
    }
    return null;
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /* ==================== 核心逻辑 ==================== */
  function initCells() {
    cells = [];
    for (var i = 0; i < CELL_COUNT; i++) {
      cells[i] = -1;
    }
  }

  /**
   * 检测是否胜利
   * 所有胜利组合：横3 + 竖3 + 斜2 = 8 种
   */
  function checkWin(mark) {
    var winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // 横
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // 竖
      [0, 4, 8], [2, 4, 6],             // 斜
    ];

    for (var p = 0; p < winPatterns.length; p++) {
      var pattern = winPatterns[p];
      if (cells[pattern[0]] === mark &&
          cells[pattern[1]] === mark &&
          cells[pattern[2]] === mark) {
        return true;
      }
    }
    return false;
  }

  /** 检测是否平局（棋盘已满且无人获胜） */
  function checkDraw() {
    for (var i = 0; i < CELL_COUNT; i++) {
      if (cells[i] === -1) return false;
    }
    return true;
  }

  function handleCellClick(index) {
    if (gameOver) return;
    if (currentPlayer !== myMark) return;
    if (cells[index] !== -1) return;

    // 落子
    cells[index] = myMark;

    // 发送给对方
    var opponent = getOpponent();
    if (opponent) {
      config.core.sendToUid(opponent.uid, {
        type: 'ttt_move',
        payload: { cell: index },
      });
    }

    // 检测胜利
    if (checkWin(myMark)) {
      gameOver = true;
      renderBoard();
      setTimeout(function () {
        config.ui.showModal(
          '🏆 井字棋 - 游戏结束',
          '<div style="text-align:center;padding:20px;font-size:20px;color:#ffd700;">' +
            '🎉 <strong>你赢了！</strong>' +
          '</div>'
        );
      }, 100);
      return;
    }

    // 检测平局
    if (checkDraw()) {
      gameOver = true;
      renderBoard();
      setTimeout(function () {
        config.ui.showModal(
          '🤝 井字棋 - 游戏结束',
          '<div style="text-align:center;padding:20px;font-size:18px;color:#aaa;">' +
            '平局！' +
          '</div>'
        );
      }, 100);
      return;
    }

    // 切换回合
    currentPlayer = 1 - myMark;
    renderBoard();
  }

  function handleOpponentMove(uid, payload) {
    if (gameOver) return;
    var index = payload.cell;
    if (index < 0 || index >= CELL_COUNT) return;
    if (cells[index] !== -1) return;

    // 落子
    var opponentMark = 1 - myMark;
    cells[index] = opponentMark;

    // 检测胜利
    if (checkWin(opponentMark)) {
      gameOver = true;
      renderBoard();
      var opponentName = getOpponent() ? getOpponent().name : '对手';
      setTimeout(function () {
        config.ui.showModal(
          '🏆 井字棋 - 游戏结束',
          '<div style="text-align:center;padding:20px;font-size:20px;color:#ffd700;">' +
            '🎉 <strong>' + escapeHtml(opponentName) + '</strong> 获胜！' +
          '</div>'
        );
      }, 100);
      return;
    }

    // 检测平局
    if (checkDraw()) {
      gameOver = true;
      renderBoard();
      setTimeout(function () {
        config.ui.showModal(
          '🤝 井字棋 - 游戏结束',
          '<div style="text-align:center;padding:20px;font-size:18px;color:#aaa;">' +
            '平局！' +
          '</div>'
        );
      }, 100);
      return;
    }

    // 切换回合
    currentPlayer = myMark;
    renderBoard();
  }

  /* ==================== UI 渲染 ==================== */
  function renderBoard() {
    if (!modalOpen) return;

    var opponent = getOpponent();
    var opponentName = opponent ? opponent.name : '对手';

    // 状态栏
    var statusText = '';
    if (gameOver) {
      statusText = '游戏结束';
    } else if (currentPlayer === myMark) {
      statusText = '轮到你了 (' + (myMark === 0 ? 'X' : 'O') + ')';
    } else {
      statusText = '等待 ' + escapeHtml(opponentName) + ' 落子...';
    }

    var myName = '';
    for (var i = 0; i < config.players.length; i++) {
      if (config.players[i].uid === getMyUid()) {
        myName = config.players[i].name;
        break;
      }
    }

    // 标记符号
    var markSymbols = ['X', 'O'];
    var mySymbol = markSymbols[myMark];
    var oppSymbol = markSymbols[1 - myMark];

    var html = '';
    html += '<div style="text-align:center;margin-bottom:6px;font-size:13px;color:#aaa;">';
    html += '<span style="color:#fff;">' + escapeHtml(myName) + '</span>';
    html += ' <span style="color:#666;">(' + mySymbol + ') vs</span> ';
    html += '<span style="color:#fff;">' + escapeHtml(opponentName) + '</span>';
    html += ' <span style="color:#666;">(' + oppSymbol + ')</span>';
    html += '</div>';

    html += '<div style="text-align:center;margin-bottom:8px;font-size:14px;font-weight:600;color:' +
      (currentPlayer === myMark && !gameOver ? '#4fc3f7' : '#999') + ';">' +
      escapeHtml(statusText) + '</div>';

    // 棋盘 3×3
    html += '<div class="gh-ttt-board" style="display:inline-grid;grid-template-columns:repeat(3,80px);' +
      'grid-template-rows:repeat(3,80px);gap:3px;background:#333;padding:3px;border-radius:6px;">';

    for (var i = 0; i < CELL_COUNT; i++) {
      var cellStyle = 'background:#1a1a2e;display:flex;align-items:center;justify-content:center;' +
        'font-size:36px;font-weight:bold;border-radius:4px;user-select:none;';
      var cellContent = '';
      var clickable = false;

      if (cells[i] === 0) {
        // X
        cellContent = 'X';
        cellStyle += 'color:#4fc3f7;';
      } else if (cells[i] === 1) {
        // O
        cellContent = 'O';
        cellStyle += 'color:#ff7043;';
      } else if (!gameOver && currentPlayer === myMark) {
        clickable = true;
        cellStyle += 'cursor:pointer;';
      }

      html += '<div class="gh-ttt-cell" data-index="' + i + '"' +
        ' style="' + cellStyle + '">' + cellContent + '</div>';
    }

    html += '</div>';

    // 退出按钮
    html += '<div style="text-align:center;margin-top:10px;">' +
      '<button class="gh-btn gh-btn-secondary gh-ttt-quit" style="font-size:12px;padding:4px 12px;">退出游戏</button>' +
      '</div>';

    config.ui.showModal('井字棋', html);

    // 绑定点击事件
    var bodyEl = document.querySelector('.gh-modal-body');
    if (!bodyEl) return;

    var cellEls = bodyEl.querySelectorAll('.gh-ttt-cell');
    for (var ci = 0; ci < cellEls.length; ci++) {
      (function (el) {
        var idx = parseInt(el.getAttribute('data-index'), 10);
        if (cells[idx] === -1 && !gameOver && currentPlayer === myMark) {
          el.addEventListener('click', function () {
            handleCellClick(idx);
          });
          el.addEventListener('mouseenter', function () {
            if (!gameOver && currentPlayer === myMark) {
              el.style.background = '#2a2a4e';
            }
          });
          el.addEventListener('mouseleave', function () {
            if (!gameOver && currentPlayer === myMark) {
              el.style.background = '#1a1a2e';
            }
          });
        }
      })(cellEls[ci]);
    }

    // 退出按钮事件
    var quitBtn = bodyEl.querySelector('.gh-ttt-quit');
    if (quitBtn) {
      quitBtn.addEventListener('click', function () {
        doCleanup();
      });
    }
  }

  /* ==================== 清理 ==================== */
  function doCleanup() {
    gameOver = true;
    modalOpen = false;
    config.core.onData(null);
    config.ui.closeModal();
  }

  /* ==================== 公开接口 ==================== */
  window.GameModules = window.GameModules || {};
  window.GameModules.tictactoe = {
    start: function (cfg) {
      config = cfg;
      myMark = config.myIndex;    // 0=X(先手), 1=O(后手)
      currentPlayer = 0;          // X 始终先手
      gameOver = false;
      modalOpen = true;

      initCells();

      // 注册数据接收
      config.core.onData(function (uid, data) {
        if (data && data.type === 'ttt_move' && data.payload) {
          handleOpponentMove(uid, data.payload);
        }
      });

      // 渲染棋盘
      renderBoard();
    },

    cleanup: function () {
      doCleanup();
    },
  };
})();
