/**
 * iirose 游戏大厅 — 五子棋模块
 * 15×15 棋盘，双方轮流落子，黑子先手
 */
(function () {
  'use strict';

  /* ==================== 去重保护 ==================== */
  if (window.__gamehubGomokuInstalled) return;
  window.__gamehubGomokuInstalled = true;

  /* ==================== 常量 ==================== */
  var BOARD_SIZE = 15;

  /* ==================== 内部状态 ==================== */
  var config = null;            // start 传入的配置
  var board = [];               // board[x][y]: -1=空, 0=黑, 1=白
  var currentPlayer = 0;       // 0=黑方回合, 1=白方回合
  var myColor = -1;            // 0=黑, 1=白 (依据 myIndex)
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
  function initBoard() {
    board = [];
    for (var x = 0; x < BOARD_SIZE; x++) {
      board[x] = [];
      for (var y = 0; y < BOARD_SIZE; y++) {
        board[x][y] = -1;
      }
    }
  }

  /**
   * 检测 (x,y) 处落子是否形成五连
   * 四个方向：水平、垂直、正斜、反斜
   */
  function checkWin(x, y, color) {
    var directions = [
      [1, 0],   // 水平
      [0, 1],   // 垂直
      [1, 1],   // 正斜 (\)
      [1, -1],  // 反斜 (/)
    ];

    for (var d = 0; d < directions.length; d++) {
      var dx = directions[d][0];
      var dy = directions[d][1];
      var count = 1;

      // 正方向延伸
      for (var step = 1; step < 5; step++) {
        var nx = x + dx * step;
        var ny = y + dy * step;
        if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) break;
        if (board[nx][ny] !== color) break;
        count++;
      }

      // 负方向延伸
      for (var step = 1; step < 5; step++) {
        var nx = x - dx * step;
        var ny = y - dy * step;
        if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) break;
        if (board[nx][ny] !== color) break;
        count++;
      }

      if (count >= 5) return true;
    }

    return false;
  }

  function handleCellClick(x, y) {
    if (gameOver) return;
    if (currentPlayer !== myColor) return;
    if (board[x][y] !== -1) return;

    // 落子
    board[x][y] = myColor;

    // 发送给对方
    var opponent = getOpponent();
    if (opponent) {
      config.core.sendToUid(opponent.uid, {
        type: 'gomoku_move',
        payload: { x: x, y: y },
      });
    }

    // 检测胜利
    if (checkWin(x, y, myColor)) {
      gameOver = true;
      renderBoard();
      setTimeout(function () {
        config.ui.showModal(
          '🏆 五子棋 - 游戏结束',
          '<div style="text-align:center;padding:20px;font-size:20px;color:#ffd700;">' +
            '🎉 <strong>你赢了！</strong>' +
          '</div>'
        );
      }, 100);
      return;
    }

    // 切换回合
    currentPlayer = 1 - myColor;
    renderBoard();
  }

  function handleOpponentMove(uid, payload) {
    if (gameOver) return;
    var x = payload.x;
    var y = payload.y;
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;
    if (board[x][y] !== -1) return;

    // 落子
    var opponentColor = 1 - myColor;
    board[x][y] = opponentColor;

    // 检测胜利
    if (checkWin(x, y, opponentColor)) {
      gameOver = true;
      renderBoard();
      var opponentName = getOpponent() ? getOpponent().name : '对手';
      setTimeout(function () {
        config.ui.showModal(
          '🏆 五子棋 - 游戏结束',
          '<div style="text-align:center;padding:20px;font-size:20px;color:#ffd700;">' +
            '🎉 <strong>' + escapeHtml(opponentName) + '</strong> 获胜！' +
          '</div>'
        );
      }, 100);
      return;
    }

    // 切换回合
    currentPlayer = myColor;
    renderBoard();
  }

  /* ==================== UI 渲染 ==================== */
  function renderBoard() {
    if (!modalOpen) return;

    var opponent = getOpponent();
    var opponentName = opponent ? opponent.name : '对手';

    // 状态栏文字
    var statusText = '';
    if (gameOver) {
      statusText = '游戏结束';
    } else if (currentPlayer === myColor) {
      statusText = '轮到你了 (' + (myColor === 0 ? '● 黑子' : '○ 白子') + ')';
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

    var html = '';
    html += '<div style="text-align:center;margin-bottom:6px;font-size:13px;color:#aaa;">';
    html += '<span style="color:#fff;">' + escapeHtml(myName) + '</span>';
    html += ' <span style="color:#666;">vs</span> ';
    html += '<span style="color:#fff;">' + escapeHtml(opponentName) + '</span>';
    html += '</div>';

    html += '<div style="text-align:center;margin-bottom:8px;font-size:14px;font-weight:600;color:' +
      (currentPlayer === myColor && !gameOver ? '#4fc3f7' : '#999') + ';">' +
      escapeHtml(statusText) + '</div>';

    // 棋盘容器
    html += '<div class="gh-gomoku-board" style="display:inline-grid;grid-template-columns:repeat(' +
      BOARD_SIZE + ',30px);gap:1px;background:#a0763a;padding:4px;border-radius:4px;">';

    for (var y = 0; y < BOARD_SIZE; y++) {
      for (var x = 0; x < BOARD_SIZE; x++) {
        var cellStyle = '';
        var cellContent = '';
        var clickable = false;

        if (board[x][y] === 0) {
          // 黑子
          cellStyle = 'background:radial-gradient(circle at 35% 35%, #555, #000);' +
            'border-radius:50%;box-shadow:1px 1px 2px rgba(0,0,0,0.5);';
        } else if (board[x][y] === 1) {
          // 白子
          cellStyle = 'background:radial-gradient(circle at 35% 35%, #fff, #ccc);' +
            'border-radius:50%;box-shadow:1px 1px 2px rgba(0,0,0,0.3);';
        } else if (!gameOver && currentPlayer === myColor) {
          clickable = true;
          cellStyle = 'background:#c8a96e;cursor:pointer;';
        } else {
          cellStyle = 'background:#c8a96e;';
        }

        if (board[x][y] === -1 && !clickable) {
          // 空位不可点击 - 显示棋盘线交叉点
          cellStyle += 'position:relative;';
        }

        html += '<div class="gh-gomoku-cell" data-x="' + x + '" data-y="' + y + '"' +
          ' style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;' +
          'font-size:16px;user-select:none;' + cellStyle + '"></div>';
      }
    }

    html += '</div>';

    // 退出按钮
    html += '<div style="text-align:center;margin-top:10px;">' +
      '<button class="gh-btn gh-btn-secondary gh-gomoku-quit" style="font-size:12px;padding:4px 12px;">退出游戏</button>' +
      '</div>';

    config.ui.showModal('五子棋', html);

    // 绑定点击事件
    var bodyEl = document.querySelector('.gh-modal-body');
    if (!bodyEl) return;

    var cells = bodyEl.querySelectorAll('.gh-gomoku-cell');
    for (var ci = 0; ci < cells.length; ci++) {
      (function (cell) {
        var cx = parseInt(cell.getAttribute('data-x'), 10);
        var cy = parseInt(cell.getAttribute('data-y'), 10);
        if (board[cx][cy] === -1 && !gameOver && currentPlayer === myColor) {
          cell.addEventListener('click', function () {
            handleCellClick(cx, cy);
          });
          // hover 效果
          cell.addEventListener('mouseenter', function () {
            if (!gameOver && currentPlayer === myColor) {
              cell.style.background = '#dbb97a';
            }
          });
          cell.addEventListener('mouseleave', function () {
            if (!gameOver && currentPlayer === myColor) {
              cell.style.background = '#c8a96e';
            }
          });
        }
      })(cells[ci]);
    }

    // 退出按钮事件
    var quitBtn = bodyEl.querySelector('.gh-gomoku-quit');
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
  window.GameModules.gomoku = {
    start: function (cfg) {
      config = cfg;
      myColor = config.myIndex; // 0=黑(先手), 1=白(后手)
      currentPlayer = 0;        // 黑方始终先手
      gameOver = false;
      modalOpen = true;

      initBoard();

      // 注册数据接收
      config.core.onData(function (uid, data) {
        if (data && data.type === 'gomoku_move' && data.payload) {
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
