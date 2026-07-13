/**
 * 海战棋 (Battleship) - iirose 游戏大厅二人对战模块
 * 6×6 网格，每人布置 3 艘船（2格、3格、3格）
 */
(function () {
  'use strict';

  if (window.GameModules && window.GameModules.battleship) return;

  var GRID = 6;
  var SHIPS = [
    { name: '巡逻艇', size: 2 },
    { name: '驱逐舰', size: 3 },
    { name: '战列舰', size: 3 },
  ];

  // ====== 运行时状态 ======
  var C = null;            // config
  var STATE = null;        // 'placement' | 'battle' | 'gameover'
  var DOM = {};            // DOM 引用集合

  var myBoard = [];        // 自己的棋盘 6×6, 0=空, n=shipId+1
  var myShips = [];        // [{name, size, cells:[], hits}]
  var oppBoard = [];       // 对方棋盘 6×6, 0=未知, 1=未命中, 2=命中
  var oppSunkCount = 0;    // 已击沉对方船只数
  var mySunkShips = {};    // 记录自己被击沉的船名

  var myTurn = false;
  var placementDone = false;
  var oppReady = false;
  var gameOver = false;

  // 放置阶段状态
  var placeIdx = 0;        // 当前放置第几艘船
  var placeCells = [];     // 当前船已选的格子 [{r,c}]

  // ====== 对手 UID 快捷 ======
  function getOpponentUid() {
    if (!C || !C.players || C.players.length < 2) return null;
    return C.players[1 - C.myIndex].uid;
  }

  // ====== 工具 ======
  function createEl(tag, cls, html) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }

  // ====== 模块接口 ======
  function start(config) {
    cleanup(); // 确保清理旧状态
    C = config;
    STATE = 'placement';
    gameOver = false;
    placementDone = false;
    oppReady = false;
    myTurn = (C.myIndex === 0);
    placeIdx = 0;
    placeCells = [];
    oppSunkCount = 0;
    mySunkShips = {};

    // 初始化棋盘
    myBoard = [];
    for (var r = 0; r < GRID; r++) {
      myBoard[r] = [];
      for (var c = 0; c < GRID; c++) myBoard[r][c] = 0;
    }
    oppBoard = [];
    for (var r = 0; r < GRID; r++) {
      oppBoard[r] = [];
      for (var c = 0; c < GRID; c++) oppBoard[r][c] = 0;
    }
    myShips = SHIPS.map(function (s) {
      return { name: s.name, size: s.size, cells: [], hits: 0 };
    });

    C.core.onData(onData);
    showPlacementUI();
  }

  function cleanup() {
    gameOver = true;
    removeUI();
    C = null;
    STATE = null;
  }

  // ====== UI 管理 ======
  function removeUI() {
    if (DOM.container && DOM.container.parentNode) {
      DOM.container.parentNode.removeChild(DOM.container);
    }
    DOM = {};
  }

  // ----- 放置界面 -----
  function showPlacementUI() {
    removeUI();
    var container = createEl('div', 'bs-container');
    container.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483646;' +
      'background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;';
    DOM.container = container;

    var panel = createEl('div', 'bs-panel');
    panel.style.cssText =
      'background:#1e1e30;border:1px solid rgba(255,255,255,0.1);border-radius:12px;' +
      'padding:20px;max-width:420px;width:90%;text-align:center;color:#fff;' +
      'box-shadow:0 8px 40px rgba(0,0,0,0.6);';
    DOM.panel = panel;

    // 标题
    var title = createEl('div', 'bs-title');
    title.textContent = '🚢 海战棋 - 部署阶段';
    title.style.cssText = 'font-size:18px;font-weight:700;margin-bottom:6px;';
    panel.appendChild(title);

    // 提示文字
    var hint = createEl('div', 'bs-hint');
    hint.style.cssText = 'font-size:13px;color:#aaa;margin-bottom:12px;';
    panel.appendChild(hint);
    DOM.hint = hint;

    // 状态文字
    var status = createEl('div', 'bs-status');
    status.style.cssText = 'font-size:12px;color:#888;margin-bottom:8px;';
    panel.appendChild(status);
    DOM.statusEl = status;

    // 网格容器
    var gridWrap = createEl('div', 'bs-grid-wrap');
    gridWrap.style.cssText =
      'display:inline-grid;grid-template-columns:repeat(' + GRID + ',1fr);' +
      'gap:3px;margin:0 auto;';
    panel.appendChild(gridWrap);
    DOM.gridWrap = gridWrap;

    renderPlacementGrid(gridWrap);

    // 按钮区
    var btnRow = createEl('div', 'bs-btn-row');
    btnRow.style.cssText = 'margin-top:14px;display:flex;gap:10px;justify-content:center;';

    var resetBtn = createEl('button', 'bs-btn');
    resetBtn.textContent = '重新部署';
    resetBtn.style.cssText =
      'padding:8px 18px;border:none;border-radius:8px;cursor:pointer;' +
      'font-size:13px;background:#444;color:#fff;';
    resetBtn.addEventListener('click', resetPlacement);
    btnRow.appendChild(resetBtn);

    panel.appendChild(btnRow);
    container.appendChild(panel);
    document.body.appendChild(container);

    updatePlacementHint();
  }

  function renderPlacementGrid(wrap) {
    wrap.innerHTML = '';
    DOM.cells = [];
    for (var r = 0; r < GRID; r++) {
      DOM.cells[r] = [];
      for (var c = 0; c < GRID; c++) {
        var cell = createEl('div', 'bs-cell');
        cell.style.cssText =
          'width:48px;height:48px;border-radius:6px;background:#2a2a40;' +
          'cursor:pointer;display:flex;align-items:center;justify-content:center;' +
          'font-size:14px;transition:background 0.15s;border:1px solid rgba(255,255,255,0.05);';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.addEventListener('click', onPlacementClick);
        cell.addEventListener('mouseenter', function () {
          if (this.style.background !== 'rgb(80, 120, 220)') {
            this.style.background = '#353550';
          }
        });
        cell.addEventListener('mouseleave', function () {
          if (this.style.background !== 'rgb(80, 120, 220)') {
            var rr = parseInt(this.dataset.r);
            var cc = parseInt(this.dataset.c);
            if (myBoard[rr][cc] > 0) {
              this.style.background = '#3a6a9a';
            } else {
              this.style.background = '#2a2a40';
            }
          }
        });
        wrap.appendChild(cell);
        DOM.cells[r][c] = cell;
      }
    }
    // 坐标标注
    updatePlacementGrid();
  }

  function updatePlacementGrid() {
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var cell = DOM.cells[r][c];
        if (myBoard[r][c] > 0) {
          cell.style.background = '#3a6a9a';
          cell.textContent = '🚢';
          cell.style.fontSize = '18px';
        } else {
          cell.style.background = '#2a2a40';
          cell.textContent = '';
        }
      }
    }
    // 高亮当前选中
    for (var i = 0; i < placeCells.length; i++) {
      var pc = placeCells[i];
      var el = DOM.cells[pc.r][pc.c];
      el.style.background = '#5080dc';
      el.textContent = (i + 1) + '';
      el.style.fontSize = '16px';
      el.style.fontWeight = '700';
    }
  }

  function updatePlacementHint() {
    if (placeIdx >= SHIPS.length) {
      DOM.hint.textContent = '✅ 所有船只部署完毕，等待对手...';
      DOM.statusEl.textContent = '已发送就绪信号';
      return;
    }
    var ship = SHIPS[placeIdx];
    var progress = placeCells.length + '/' + ship.size;
    DOM.hint.textContent = '请部署 ' + ship.name + '（' + ship.size + '格）— 依次点击 ' + ship.size + ' 个连续格子 (' + progress + ')';
    DOM.statusEl.textContent = '剩余船只: ' + SHIPS.slice(placeIdx).map(function (s) { return s.name + '(' + s.size + ')'; }).join(' | ');
  }

  // ====== 放置逻辑 ======
  function onPlacementClick(e) {
    if (STATE !== 'placement' || placementDone || gameOver) return;
    if (placeIdx >= SHIPS.length) return;

    var r = parseInt(this.dataset.r);
    var c = parseInt(this.dataset.c);
    var shipSize = SHIPS[placeIdx].size;

    // 点击已选格子 = 取消选择
    for (var i = 0; i < placeCells.length; i++) {
      if (placeCells[i].r === r && placeCells[i].c === c) {
        // 移除该格子及之后的所有选择
        placeCells = placeCells.slice(0, i);
        updatePlacementGrid();
        updatePlacementHint();
        return;
      }
    }

    // 格子已被占用
    if (myBoard[r][c] > 0) {
      showToast('该位置已有船只', true);
      return;
    }

    if (placeCells.length === 0) {
      // 第一个格子
      placeCells.push({ r: r, c: c });
    } else {
      // 后续格子：必须在同一行或列，且连续
      var first = placeCells[0];
      var last = placeCells[placeCells.length - 1];
      var isHorizontal = (first.r === last.r);
      var isVertical = (first.c === last.c);

      // 判断方向
      if (placeCells.length === 1) {
        // 第二个格子：必须在同一行或同一列且相邻
        var dr = Math.abs(r - first.r);
        var dc = Math.abs(c - first.c);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
          placeCells.push({ r: r, c: c });
        } else {
          showToast('必须与起点相邻（上下左右）', true);
          return;
        }
      } else {
        // 第三个及后续格子：必须沿既定方向延伸
        if (isHorizontal) {
          if (r !== first.r) { showToast('必须放在同一行', true); return; }
          // 判断是否在两端延伸
          var minC = Math.min.apply(null, placeCells.map(function (p) { return p.c; }));
          var maxC = Math.max.apply(null, placeCells.map(function (p) { return p.c; }));
          if (c === minC - 1 || c === maxC + 1) {
            // 检查中间是否有空隙（应该没有，因为是逐个延伸）
            placeCells.push({ r: r, c: c });
          } else {
            showToast('必须紧挨已放置的格子延伸', true);
            return;
          }
        } else if (isVertical) {
          if (c !== first.c) { showToast('必须放在同一列', true); return; }
          var minR = Math.min.apply(null, placeCells.map(function (p) { return p.r; }));
          var maxR = Math.max.apply(null, placeCells.map(function (p) { return p.r; }));
          if (r === minR - 1 || r === maxR + 1) {
            placeCells.push({ r: r, c: c });
          } else {
            showToast('必须紧挨已放置的格子延伸', true);
            return;
          }
        } else {
          showToast('船只必须水平或垂直放置', true);
          return;
        }
      }
    }

    updatePlacementGrid();
    updatePlacementHint();

    // 船已填满 → 确认放置
    if (placeCells.length === shipSize) {
      confirmPlacement();
    }
  }

  function confirmPlacement() {
    var shipIdx = placeIdx;
    var ship = myShips[shipIdx];
    var cells = placeCells.slice();

    // 写入棋盘
    for (var i = 0; i < cells.length; i++) {
      myBoard[cells[i].r][cells[i].c] = shipIdx + 1;
    }
    ship.cells = cells;
    placeCells = [];
    placeIdx++;

    updatePlacementGrid();
    updatePlacementHint();

    if (placeIdx >= SHIPS.length) {
      // 所有船只部署完毕
      placementDone = true;
      DOM.hint.textContent = '✅ 所有船只部署完毕！等待对手...';
      DOM.statusEl.textContent = '';
      sendToOpponent({ type: 'bs_ready' });
      checkStartBattle();
    }
  }

  function resetPlacement() {
    if (STATE !== 'placement') return;
    placeIdx = 0;
    placeCells = [];
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) myBoard[r][c] = 0;
    }
    for (var i = 0; i < myShips.length; i++) {
      myShips[i].cells = [];
      myShips[i].hits = 0;
    }
    placementDone = false;
    oppReady = false;
    updatePlacementGrid();
    updatePlacementHint();
  }

  // ====== 战斗界面 ======
  function showBattleUI() {
    removeUI();
    var container = createEl('div', 'bs-container');
    container.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483646;' +
      'background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;';
    DOM.container = container;

    var panel = createEl('div', 'bs-panel');
    panel.style.cssText =
      'background:#1e1e30;border:1px solid rgba(255,255,255,0.1);border-radius:12px;' +
      'padding:20px;max-width:760px;width:94%;color:#fff;box-shadow:0 8px 40px rgba(0,0,0,0.6);' +
      'text-align:center;';
    DOM.panel = panel;

    // 标题
    var title = createEl('div', 'bs-title');
    title.textContent = '🚢 海战棋';
    title.style.cssText = 'font-size:18px;font-weight:700;margin-bottom:8px;';
    panel.appendChild(title);

    // 回合信息
    var turnInfo = createEl('div', 'bs-turn');
    turnInfo.style.cssText = 'font-size:14px;margin-bottom:12px;color:#ffd700;';
    panel.appendChild(turnInfo);
    DOM.turnInfo = turnInfo;

    // 网格并排容器
    var gridsRow = createEl('div', 'bs-grids');
    gridsRow.style.cssText =
      'display:flex;gap:20px;justify-content:center;flex-wrap:wrap;';
    panel.appendChild(gridsRow);

    // 自己的网格（左侧）
    var mySide = createSidePanel('我方海域', true);
    gridsRow.appendChild(mySide);

    // 对方的网格（右侧）
    var oppSide = createSidePanel('敌方海域', false);
    gridsRow.appendChild(oppSide);

    container.appendChild(panel);
    document.body.appendChild(container);

    updateBattleUI();
  }

  function createSidePanel(label, isMine) {
    var side = createEl('div', 'bs-side');
    side.style.cssText = 'text-align:center;';

    var lbl = createEl('div', 'bs-side-label');
    lbl.textContent = label;
    lbl.style.cssText = 'font-size:13px;font-weight:600;margin-bottom:6px;color:#ccc;';
    side.appendChild(lbl);

    var gridWrap = createEl('div', 'bs-grid-wrap');
    gridWrap.style.cssText =
      'display:inline-grid;grid-template-columns:repeat(' + GRID + ',1fr);' +
      'gap:3px;';
    side.appendChild(gridWrap);

    var cells = [];
    for (var r = 0; r < GRID; r++) {
      cells[r] = [];
      for (var c = 0; c < GRID; c++) {
        var cell = createEl('div', 'bs-cell');
        cell.style.cssText =
          'width:44px;height:44px;border-radius:6px;background:#2a2a40;' +
          'display:flex;align-items:center;justify-content:center;' +
          'font-size:18px;transition:background 0.15s;border:1px solid rgba(255,255,255,0.05);' +
          'cursor:' + (isMine ? 'default' : 'pointer') + ';';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.dataset.mine = isMine ? '1' : '0';
        if (!isMine) {
          cell.addEventListener('click', onAttackClick);
          cell.addEventListener('mouseenter', function () {
            if (this.style.background !== 'rgb(200, 60, 60)' &&
                this.style.background !== 'rgb(60, 160, 80)' &&
                this.style.background !== 'rgb(100, 130, 220)' &&
                this.dataset.fired !== '1') {
              this.style.background = '#353550';
            }
          });
          cell.addEventListener('mouseleave', function () {
            if (this.dataset.fired !== '1' &&
                this.style.background !== 'rgb(200, 60, 60)' &&
                this.style.background !== 'rgb(60, 160, 80)' &&
                this.style.background !== 'rgb(100, 130, 220)') {
              this.style.background = '#2a2a40';
            }
          });
        }
        gridWrap.appendChild(cell);
        cells[r][c] = cell;
      }
    }

    if (isMine) {
      DOM.myGridWrap = gridWrap;
      DOM.myCells = cells;
    } else {
      DOM.oppGridWrap = gridWrap;
      DOM.oppCells = cells;
    }

    return side;
  }

  function updateBattleUI() {
    if (!DOM.myCells || !DOM.oppCells) return;

    // 更新自己的网格（显示对方攻击结果）
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var cell = DOM.myCells[r][c];
        var hasShip = myBoard[r][c] > 0;
        var attacked = oppBoard[r][c] > 0;

        cell.textContent = '';
        if (hasShip && !attacked) {
          cell.style.background = '#3a6a9a';
          cell.textContent = '🚢';
        } else if (hasShip && attacked && oppBoard[r][c] === 2) {
          cell.style.background = '#c83c3c';
          cell.textContent = '💥';
        } else if (hasShip && attacked && oppBoard[r][c] === 1) {
          // shouldn't happen (hit ship should be hit=2), but just in case
          cell.style.background = '#c83c3c';
          cell.textContent = '💥';
        } else if (!hasShip && attacked && oppBoard[r][c] === 1) {
          cell.style.background = '#3a4050';
          cell.textContent = '·';
          cell.style.color = '#666';
        } else if (!hasShip && attacked && oppBoard[r][c] === 2) {
          // shouldn't happen
          cell.style.background = '#c83c3c';
          cell.textContent = '💥';
        } else {
          cell.style.background = '#2a2a40';
        }
      }
    }

    // 更新对方网格（显示我的攻击结果）
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var cell = DOM.oppCells[r][c];
        var val = oppBoard[r][c];

        if (val === 2) {
          cell.style.background = '#c83c3c';
          cell.textContent = '💥';
          cell.dataset.fired = '1';
        } else if (val === 1) {
          cell.style.background = '#3a4050';
          cell.textContent = '·';
          cell.style.color = '#666';
          cell.dataset.fired = '1';
        } else {
          cell.style.background = '#2a2a40';
          cell.textContent = '';
          cell.dataset.fired = '0';
        }
      }
    }

    // 回合信息
    if (gameOver) {
      DOM.turnInfo.textContent = '⏹ 游戏结束';
    } else if (myTurn) {
      DOM.turnInfo.textContent = '🎯 你的回合 — 点击敌方网格进攻';
      DOM.turnInfo.style.color = '#4fc3f7';
    } else {
      DOM.turnInfo.textContent = '⏳ 对手回合 — 等待中...';
      DOM.turnInfo.style.color = '#ffd700';
    }
  }

  // ====== 攻击逻辑 ======
  function onAttackClick() {
    if (gameOver || STATE !== 'battle') return;
    if (!myTurn) {
      showToast('现在是对方的回合', true);
      return;
    }

    var r = parseInt(this.dataset.r);
    var c = parseInt(this.dataset.c);

    // 已攻击过
    if (oppBoard[r][c] > 0) {
      showToast('此位置已攻击过', true);
      return;
    }

    // 发送攻击
    myTurn = false;
    sendToOpponent({ type: 'bs_attack', payload: { x: r, y: c } });
    showToast('攻击已发送！', false);
    updateBattleUI();
  }

  // ====== 通信处理 ======
  function sendToOpponent(payload) {
    var uid = getOpponentUid();
    if (uid && C.core.sendToUid) {
      C.core.sendToUid(uid, payload);
    }
  }

  function onData(uid, data) {
    if (gameOver || !data || !data.type) return;

    switch (data.type) {
      case 'bs_ready':
        oppReady = true;
        checkStartBattle();
        break;
      case 'bs_attack':
        if (data.payload) receiveAttack(data.payload);
        break;
      case 'bs_result':
        if (data.payload) receiveResult(data.payload);
        break;
    }
  }

  function checkStartBattle() {
    if (STATE === 'placement' && placementDone && oppReady) {
      STATE = 'battle';
      showBattleUI();
      if (C.ui) C.ui.showToast('🚢 海战棋开始！', false);
    }
  }

  function receiveAttack(payload) {
    if (gameOver || STATE !== 'battle') return;
    var x = payload.x;
    var y = payload.y;
    if (x < 0 || x >= GRID || y < 0 || y >= GRID) return;

    var hit = (myBoard[x][y] > 0);
    var sunk = null;

    if (hit) {
      var shipId = myBoard[x][y] - 1;
      myShips[shipId].hits++;
      oppBoard[x][y] = 2; // mark hit on my board (for display)

      // 判断是否击沉
      if (myShips[shipId].hits >= myShips[shipId].size) {
        sunk = myShips[shipId].name;
        mySunkShips[sunk] = true;
      }
    } else {
      oppBoard[x][y] = 1; // mark miss on my board
    }

    // 回传结果
    sendToOpponent({
      type: 'bs_result',
      payload: { x: x, y: y, hit: hit, sunk: sunk },
    });

    updateBattleUI();

    // 检查自己是否全灭
    if (hit && sunk) {
      var allDead = true;
      for (var i = 0; i < myShips.length; i++) {
        if (myShips[i].hits < myShips[i].size) {
          allDead = false;
          break;
        }
      }
      if (allDead) {
        gameOver = true;
        STATE = 'gameover';
        DOM.turnInfo.textContent = '💀 你输了... 所有船只被击沉';
        DOM.turnInfo.style.color = '#ff4444';
        setTimeout(function () {
          if (C.ui) C.ui.showToast('💀 海战棋结束 — 你输了', true);
          setTimeout(function () { endGame(); }, 2000);
        }, 500);
      }
    }

    // 轮到本玩家进攻（接收攻击并回复结果后，本玩家成为进攻方）
    myTurn = true;
    updateBattleUI();
  }

  function receiveResult(payload) {
    if (gameOver || STATE !== 'battle') return;
    var x = payload.x;
    var y = payload.y;
    var hit = payload.hit;
    var sunk = payload.sunk;

    if (x < 0 || x >= GRID || y < 0 || y >= GRID) return;

    oppBoard[x][y] = hit ? 2 : 1;

    if (sunk) {
      oppSunkCount++;
      if (C.ui) C.ui.showToast('💥 击沉 ' + sunk + '！', false);
    }

    updateBattleUI();

    // 检查是否获胜
    if (oppSunkCount >= SHIPS.length) {
      gameOver = true;
      STATE = 'gameover';
      DOM.turnInfo.textContent = '🎉 你赢了！击沉所有敌舰！';
      DOM.turnInfo.style.color = '#4caf50';
      setTimeout(function () {
        if (C.ui) C.ui.showToast('🎉 海战棋胜利！', false);
        setTimeout(function () { endGame(); }, 2000);
      }, 500);
      return;
    }

    // 现在是对方的回合（我攻击完轮到对方）
    myTurn = false;
    updateBattleUI();
  }

  // ====== 游戏结束 ======
  function endGame() {
    if (STATE === 'gameover' && gameOver) return; // 防止重复调用
    gameOver = true;
    STATE = 'gameover';
    var selfCleanup = function () {
      removeUI();
      // 清理模块状态
      C = null;
      STATE = null;
    };
    // 延迟移除 UI
    setTimeout(selfCleanup, 2000);
  }

  // ====== Toast ======
  function showToast(msg, isErr) {
    if (C && C.ui && C.ui.showToast) {
      C.ui.showToast(msg, isErr);
    }
  }

  // ====== 注册模块 ======
  window.GameModules = window.GameModules || {};
  window.GameModules.battleship = {
    start: start,
    cleanup: cleanup,
  };

})();
