/**
 * 你画我猜 — iirose 游戏大厅模块
 * 包名: nekonya.gamehub
 */
(function () {
  'use strict';

  if (window.GameModules && window.GameModules['drawguess']) return;

  /* ==================== 词库 ==================== */
  var WORD_LIST = [
    '\u732B', '\u72D7', '\u9C7C', '\u82B1', '\u592A\u9633', '\u6708\u4EAE',
    '\u6811', '\u623F\u5B50', '\u661F\u661F', '\u5FC3', '\u706B\u7130',
    '\u96E8\u4F1E', '\u86DB\u7F51', '\u86DB\u86DB', '\u971C\u971C', '\u5DF4\u58EB',
    '\u98DE\u673A', '\u81EA\u884C\u8F66', '\u6C7D\u8F66', '\u706B\u8F66',
    '\u86CB\u7CD5', '\u82F9\u679C', '\u9999\u8549', '\u897F\u74DC', '\u6A59\u5B50',
    '\u7B11\u8138', '\u54ED\u6CE3', '\u751F\u6C14', '\u60CA\u8BB6', '\u7728\u7728\u773C',
    '\u592A\u9633\u955C', '\u9526\u65D7', '\u94B1\u5305', '\u949F\u8868', '\u94A5\u5319',
    '\u6247\u5B50', '\u68F1\u5F62', '\u7B52\u7B52', '\u5F69\u8679', '\u96EA\u82B1',
  ];

  /* ==================== 常量 ==================== */
  var ROUND_TIME = 60;          // 每轮秒数
  var CANVAS_SIZE = 300;        // 画布尺寸
  var POINTS_PER_GUESS = 10;    // 猜对得分
  var SEND_INTERVAL = 200;      // 发送间隔 ms

  /* ==================== 状态 ==================== */
  var state = null;
  var config = null;
  var timerId = null;
  var sendTimerId = null;
  var canvasEl = null;
  var ctx = null;
  var isDrawing = false;
  var currentStroke = null;     // { points: [{x,y}], color, size }
  var pendingStrokes = [];      // 待发送的笔画
  var allStrokes = [];          // 本局所有笔画
  var lastDrawTime = 0;

  // 猜词相关
  var guessInputEl = null;
  var guessLogEl = null;

  /* ==================== 工具函数 ==================== */
  function getMyIndex() {
    return config ? config.myIndex : -1;
  }

  function getMyUid() {
    return config && config.players && config.players[config.myIndex]
      ? config.players[config.myIndex].uid : null;
  }

  function getPlayerName(index) {
    var p = config && config.players && config.players[index];
    return p ? (p.name || p.uid) : '\u672A\u77E5';
  }

  function getPlayerIndexByUid(uid) {
    if (!config || !config.players) return -1;
    for (var i = 0; i < config.players.length; i++) {
      if (config.players[i].uid === uid) return i;
    }
    return -1;
  }

  /* ==================== 游戏初始化 ==================== */
  function initGame() {
    var playerCount = config.players.length;
    var players = [];
    for (var i = 0; i < playerCount; i++) {
      players.push({
        index: i,
        uid: config.players[i].uid,
        name: config.players[i].name || config.players[i].uid,
        score: 0,
        guessedThisRound: false,
      });
    }

    state = {
      phase: 'lobby',          // lobby, word_select, drawing, ended
      round: 0,
      totalRounds: Math.min(playerCount * 2, 8), // 每人画2次，最多8轮
      players: players,
      painterIndex: -1,
      currentWord: '',
      timeLeft: 0,
      guessLog: [],
      gameOver: false,
    };
  }

  /* ==================== 发送消息 ==================== */
  function sendTo(uid, action, payload) {
    var msg = { action: action };
    if (payload) {
      for (var k in payload) {
        if (payload.hasOwnProperty(k)) msg[k] = payload[k];
      }
    }
    config.core.sendToUid(uid, {
      type: 'game_action',
      gameId: 'drawguess',
      payload: msg,
    });
  }

  function broadcast(type, payload) {
    for (var i = 0; i < config.players.length; i++) {
      sendTo(config.players[i].uid, type, payload);
    }
  }

  function broadcastExceptMe(type, payload) {
    var myUid = getMyUid();
    for (var i = 0; i < config.players.length; i++) {
      if (config.players[i].uid !== myUid) {
        sendTo(config.players[i].uid, type, payload);
      }
    }
  }

  /* ==================== 渲染主界面 ==================== */
  function render() {
    if (!config || !config.ui) return;

    if (state.phase === 'lobby') {
      renderLobby();
    } else if (state.phase === 'word_select') {
      renderWordSelect();
    } else if (state.phase === 'drawing') {
      renderDrawing();
    } else if (state.phase === 'ended') {
      renderEnded();
    }
  }

  /* ==================== 大厅渲染 ==================== */
  function renderLobby() {
    var myIndex = getMyIndex();
    var html = '';

    html += '<div style="text-align:center;margin-bottom:12px;">';
    html += '<span style="display:inline-block;padding:4px 16px;border-radius:12px;font-size:13px;font-weight:600;background:#8e44ad;color:#fff;">';
    html += '\uD83C\uDFA8 \u4F60\u753B\u6211\u731C\uFF08\u7B2C' + (state.round + 1) + '/' + state.totalRounds + '\u8F6E\uFF09';
    html += '</span></div>';

    // 分数榜
    html += renderScoreboard();

    if (myIndex === 0) {
      html += '<button class="gh-btn gh-btn-primary" data-action="start-game" style="width:100%;margin-top:8px;">\uD83C\uDFC0 \u5F00\u59CB\u6E38\u620F</button>';
    } else {
      html += '<div style="text-align:center;padding:12px 0;color:#95a5a6;">\u7B49\u5F85\u623F\u4E3B\u5F00\u59CB...</div>';
    }

    config.ui.showModal('\uD83C\uDFA8 \u4F60\u753B\u6211\u731C', html);
  }

  function renderScoreboard() {
    var html = '<div style="font-size:13px;font-weight:600;color:#bdc3c7;margin-bottom:6px;">\uD83C\uDFC6 \u5F97\u5206\u699C</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">';
    for (var i = 0; i < state.players.length; i++) {
      var p = state.players[i];
      var isMe = i === getMyIndex();
      html += '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;' +
        (isMe ? 'background:#3498db;color:#fff;font-weight:600;' : 'background:rgba(255,255,255,0.1);color:#ecf0f1;') +
        '">' + p.name + ': ' + p.score + '\u5206</span>';
    }
    html += '</div>';
    return html;
  }

  /* ==================== 选词渲染 ==================== */
  function renderWordSelect() {
    var myIndex = getMyIndex();
    var html = '';

    html += '<div style="text-align:center;margin-bottom:12px;">';
    html += '<span style="display:inline-block;padding:4px 16px;border-radius:12px;font-size:13px;font-weight:600;background:#e67e22;color:#fff;">';
    html += '\uD83C\uDFA8 \u8F6E\u5230 ' + state.players[state.painterIndex].name + ' \u753B\u753B';
    html += '</span></div>';

    html += renderScoreboard();

    if (myIndex === state.painterIndex) {
      // 画师选词
      html += '<div style="font-size:14px;font-weight:600;color:#f1c40f;margin-bottom:8px;">\u8BF7\u9009\u62E9\u4E00\u4E2A\u8BCD\u8BED</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">';

      // 随机选6个词供选择
      var choices = getRandomWords(6);
      for (var i = 0; i < choices.length; i++) {
        html += '<button class="gh-btn gh-btn-primary gh-btn-sm" data-action="pick-word" data-word="' + choices[i] + '">' + choices[i] + '</button>';
      }
      html += '</div>';
    } else {
      html += '<div style="text-align:center;padding:20px 0;color:#95a5a6;font-size:14px;">\u7B49\u5F85\u753B\u5E08\u9009\u8BCD...</div>';
    }

    config.ui.showModal('\uD83C\uDFA8 \u4F60\u753B\u6211\u731C', html);
  }

  function getRandomWords(count) {
    var shuffled = WORD_LIST.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    return shuffled.slice(0, count);
  }

  /* ==================== 绘画阶段渲染 ==================== */
  function renderDrawing() {
    var myIndex = getMyIndex();
    var html = '';

    // 顶部信息
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
    html += '<span style="font-size:13px;font-weight:600;color:#e67e22;">\uD83C\uDFA8 ' + state.players[state.painterIndex].name + ' \u753B\u753B</span>';
    html += '<span style="font-size:13px;font-weight:600;color:' + (state.timeLeft <= 10 ? '#e74c3c' : '#2ecc71') + ';">\u23F1 ' + state.timeLeft + 's</span>';
    html += '</div>';

    // Canvas 容器
    html += '<div style="text-align:center;margin-bottom:8px;">';
    html += '<canvas id="dg-canvas" width="' + CANVAS_SIZE + '" height="' + CANVAS_SIZE + '" ' +
      'style="width:' + CANVAS_SIZE + 'px;height:' + CANVAS_SIZE + 'px;border:2px solid #555;border-radius:8px;cursor:crosshair;background:#fff;display:block;margin:0 auto;"></canvas>';
    html += '</div>';

    html += renderScoreboard();

    // 猜词日志
    if (myIndex !== state.painterIndex) {
      // 猜词输入框
      html += '<div style="display:flex;gap:4px;margin-bottom:6px;">';
      html += '<input id="dg-guess-input" type="text" placeholder="\u8F93\u5165\u4F60\u7684\u731C\u6D4B..." ' +
        'style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid #555;background:#2c3e50;color:#ecf0f1;font-size:13px;outline:none;" />';
      html += '<button class="gh-btn gh-btn-primary gh-btn-sm" data-action="send-guess">\u731C</button>';
      html += '</div>';
    } else {
      var word = state.currentWord;
      var hiddenWord = '';
      for (var i = 0; i < word.length; i++) {
        hiddenWord += word.charAt(i) + ' ';
      }
      html += '<div style="text-align:center;padding:6px;background:rgba(241,196,15,0.15);border-radius:6px;margin-bottom:6px;">';
      html += '<span style="font-size:16px;font-weight:700;color:#f1c40f;letter-spacing:4px;">' + hiddenWord.trim() + '</span>';
      html += '</div>';

      // 清除画布按钮
      html += '<div style="display:flex;gap:4px;">';
      html += '<button class="gh-btn gh-btn-secondary gh-btn-sm" data-action="clear-canvas" style="flex:1;">\uD83D\uDDD1\uFE0F \u6E05\u7A7A</button>';
      html += '<button class="gh-btn gh-btn-secondary gh-btn-sm" data-action="undo-stroke" style="flex:1;">\u2934\uFE0F \u64A4\u9500</button>';
      html += '</div>';
    }

    // 猜词记录
    var logHtml = '';
    for (var i = 0; i < state.guessLog.length; i++) {
      var entry = state.guessLog[i];
      var prefix = entry.correct ? '\u2714\uFE0F' : '\uD83D\uDCAC';
      logHtml += '<div style="font-size:12px;padding:1px 0;color:' + (entry.correct ? '#2ecc71' : '#bdc3c7') + ';">' +
        prefix + ' ' + entry.name + ': ' + entry.word + '</div>';
    }
    if (logHtml) {
      html += '<div style="max-height:60px;overflow-y:auto;margin-top:4px;padding:4px 6px;background:rgba(0,0,0,0.2);border-radius:4px;">' + logHtml + '</div>';
    }

    config.ui.showModal('\uD83C\uDFA8 \u4F60\u753B\u6211\u731C', html);

    // 挂载 canvas 和输入框
    setTimeout(function () {
      mountCanvas();
      mountGuessInput();
    }, 50);
  }

  /* ==================== Canvas 挂载 ==================== */
  function mountCanvas() {
    var el = document.getElementById('dg-canvas');
    if (!el) return;
    if (el === canvasEl) return; // 已挂载

    canvasEl = el;
    ctx = el.getContext('2d');

    // 画布样式
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 重绘所有笔画
    redrawAllStrokes();

    var myIndex = getMyIndex();
    var isPainter = myIndex === state.painterIndex;

    if (isPainter) {
      // 画师：绑定鼠标事件
      el.addEventListener('mousedown', onMouseDown);
      el.addEventListener('mousemove', onMouseMove);
      el.addEventListener('mouseup', onMouseUp);
      el.addEventListener('mouseleave', onMouseUp);

      // 启动定时发送
      startStrokeSender();
    }
  }

  /* ==================== 猜词输入挂载 ==================== */
  function mountGuessInput() {
    var input = document.getElementById('dg-guess-input');
    if (!input) return;
    if (input === guessInputEl) return;

    guessInputEl = input;

    // Enter 发送
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendGuess();
      }
    });

    // 焦点
    setTimeout(function () { input.focus(); }, 100);
  }

  /* ==================== 绘画鼠标事件 ==================== */
  function onMouseDown(e) {
    if (!ctx || !canvasEl) return;
    var rect = canvasEl.getBoundingClientRect();
    var scaleX = CANVAS_SIZE / rect.width;
    var scaleY = CANVAS_SIZE / rect.height;
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top) * scaleY;

    // 限制边界
    x = Math.max(0, Math.min(CANVAS_SIZE - 1, x));
    y = Math.max(0, Math.min(CANVAS_SIZE - 1, y));

    isDrawing = true;
    currentStroke = {
      points: [{ x: x, y: y }],
      color: '#000000',
      size: 4,
    };

    // 开始路径
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onMouseMove(e) {
    if (!isDrawing || !ctx || !canvasEl || !currentStroke) return;
    e.preventDefault();

    var rect = canvasEl.getBoundingClientRect();
    var scaleX = CANVAS_SIZE / rect.width;
    var scaleY = CANVAS_SIZE / rect.height;
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top) * scaleY;

    x = Math.max(0, Math.min(CANVAS_SIZE - 1, x));
    y = Math.max(0, Math.min(CANVAS_SIZE - 1, y));

    currentStroke.points.push({ x: x, y: y });

    ctx.strokeStyle = currentStroke.color;
    ctx.lineWidth = currentStroke.size;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onMouseUp(e) {
    if (!isDrawing) return;
    isDrawing = false;

    if (currentStroke && currentStroke.points.length > 0) {
      // 加入待发送队列
      pendingStrokes.push({
        points: currentStroke.points.slice(),
        color: currentStroke.color,
        size: currentStroke.size,
      });

      // 加入全部笔画
      allStrokes.push({
        points: currentStroke.points.slice(),
        color: currentStroke.color,
        size: currentStroke.size,
      });

      // 立即发送
      flushStrokes();
    }

    currentStroke = null;
    if (ctx) ctx.beginPath();
  }

  /* ==================== 笔画发送 ==================== */
  function startStrokeSender() {
    stopStrokeSender();
    sendTimerId = setInterval(function () {
      flushStrokes();
    }, SEND_INTERVAL);
  }

  function stopStrokeSender() {
    if (sendTimerId) {
      clearInterval(sendTimerId);
      sendTimerId = null;
    }
  }

  function flushStrokes() {
    if (pendingStrokes.length === 0) return;

    var strokesToSend = pendingStrokes.slice();
    pendingStrokes = [];

    broadcastExceptMe('dg_draw', {
      strokes: strokesToSend,
    });
  }

  /* ==================== 接收并渲染远程笔画 ==================== */
  function receiveStrokes(strokes) {
    for (var s = 0; s < strokes.length; s++) {
      var stroke = strokes[s];
      allStrokes.push(stroke);
    }
    redrawAllStrokes();
  }

  function redrawAllStrokes() {
    if (!ctx) return;

    // 清空
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    for (var s = 0; s < allStrokes.length; s++) {
      var stroke = allStrokes[s];
      var points = stroke.points;
      if (!points || points.length === 0) continue;

      ctx.strokeStyle = stroke.color || '#000000';
      ctx.lineWidth = stroke.size || 4;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (var p = 1; p < points.length; p++) {
        ctx.lineTo(points[p].x, points[p].y);
      }
      ctx.stroke();
    }
  }

  /* ==================== 猜词 ==================== */
  function sendGuess() {
    if (!guessInputEl) return;
    var word = guessInputEl.value.trim();
    if (!word) return;

    guessInputEl.value = '';

    var myIndex = getMyIndex();
    var myUid = getMyUid();

    // 检查是否已猜对
    if (state.players[myIndex].guessedThisRound) {
      config.ui.showToast('\u4F60\u5DF2\u731C\u5BF9\uFF0C\u8BF7\u7B49\u5F85\u4E0B\u4E00\u8F6E', 'info');
      return;
    }

    // 发送给所有人
    broadcast('dg_guess', {
      from: myIndex,
      word: word,
    });
  }

  function handleGuess(fromIndex, guessedWord) {
    if (state.phase !== 'drawing') return;

    var player = state.players[fromIndex];

    // 重复猜测去重
    for (var i = 0; i < state.guessLog.length; i++) {
      if (state.guessLog[i].from === fromIndex && state.guessLog[i].word === guessedWord) {
        return;
      }
    }

    // 检查是否正确
    var isCorrect = guessedWord === state.currentWord;

    state.guessLog.push({
      from: fromIndex,
      name: player.name,
      word: guessedWord,
      correct: isCorrect,
    });

    if (isCorrect && !player.guessedThisRound) {
      player.guessedThisRound = true;
      player.score += POINTS_PER_GUESS;
      config.ui.showToast(player.name + ' \u731C\u5BF9\u4E86\uFF01\u5F97 ' + POINTS_PER_GUESS + ' \u5206', 'success');
    }

    render();

    // 检查是否所有人都猜对了
    checkAllGuessed();
  }

  function checkAllGuessed() {
    // 排除画师
    var guessers = [];
    for (var i = 0; i < state.players.length; i++) {
      if (i !== state.painterIndex && state.players[i].guessedThisRound === false) {
        guessers.push(i);
      }
    }
    if (guessers.length === 0) {
      // 所有人都猜对了，提前结束本轮
      endRound();
    }
  }

  /* ==================== 轮次管理 ==================== */
  function startRound() {
    state.round++;
    if (state.round > state.totalRounds) {
      endGame();
      return;
    }

    state.painterIndex = (state.round - 1) % state.players.length;
    state.currentWord = '';
    state.timeLeft = ROUND_TIME;
    state.guessLog = [];
    allStrokes = [];
    pendingStrokes = [];
    currentStroke = null;

    // 重置猜对标记
    for (var i = 0; i < state.players.length; i++) {
      state.players[i].guessedThisRound = false;
    }

    // 进入选词阶段
    state.phase = 'word_select';
    broadcast('phase_change', { phase: 'word_select', painterIndex: state.painterIndex, round: state.round });
    render();
  }

  function onWordPicked(word) {
    state.currentWord = word;
    state.phase = 'drawing';
    state.timeLeft = ROUND_TIME;

    // 画师本人
    startTimer();
    render();

    // 私密告知其他玩家开始画（不含答案）
    var myUid = getMyUid();
    for (var i = 0; i < config.players.length; i++) {
      if (config.players[i].uid !== myUid) {
        sendTo(config.players[i].uid, 'start_drawing', {
          painterIndex: state.painterIndex,
          round: state.round,
        });
      }
    }
  }

  function startTimer() {
    stopTimer();
    timerId = setInterval(function () {
      state.timeLeft--;
      if (state.timeLeft <= 0) {
        endRound();
      } else {
        render();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function endRound() {
    stopTimer();
    stopStrokeSender();
    unbindCanvasEvents();

    // 显示正确答案
    if (state.currentWord) {
      var correctCount = 0;
      for (var i = 0; i < state.players.length; i++) {
        if (i !== state.painterIndex && state.players[i].guessedThisRound) {
          correctCount++;
        }
      }
      var revealMsg = '\uD83D\uDCDD \u672C\u8F6E\u7B54\u6848: ' + state.currentWord + ' (' + correctCount + '/' + (state.players.length - 1) + ' \u731C\u5BF9)';
      config.ui.showToast(revealMsg, 'info');
    }

    broadcast('round_end', {
      word: state.currentWord,
    });

    // 短暂延迟后进入下一轮
    var nextRoundDelay = setTimeout(function () {
      startRound();
      clearTimeout(nextRoundDelay);
    }, 2000);
  }

  function endGame() {
    stopTimer();
    stopStrokeSender();
    state.phase = 'ended';
    state.gameOver = true;

    broadcast('game_over', {});
    render();
  }

  /* ==================== 结束渲染 ==================== */
  function renderEnded() {
    var html = '';

    html += '<div style="text-align:center;margin-bottom:12px;">';
    html += '<span style="display:inline-block;padding:4px 16px;border-radius:12px;font-size:13px;font-weight:600;background:#9b59b6;color:#fff;">';
    html += '\uD83C\uDFC6 \u6E38\u620F\u7ED3\u675F';
    html += '</span></div>';

    // 排序
    var sorted = state.players.slice().sort(function (a, b) { return b.score - a.score; });

    html += '<div style="font-size:13px;font-weight:600;color:#bdc3c7;margin-bottom:6px;">\uD83C\uDFC6 \u6700\u7EC8\u6392\u540D</div>';
    html += '<table style="width:100%;font-size:13px;border-collapse:collapse;">';
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      var medal = i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : (i + 1) + '.';
      var isMe = p.index === getMyIndex();
      html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.05);' + (isMe ? 'background:rgba(52,152,219,0.2);' : '') + '">';
      html += '<td style="padding:6px 8px;font-weight:' + (isMe ? '700' : '400') + ';">' + medal + '</td>';
      html += '<td style="padding:6px 8px;">' + p.name + '</td>';
      html += '<td style="padding:6px 8px;text-align:right;color:#f1c40f;">' + p.score + ' \u5206</td>';
      html += '</tr>';
    }
    html += '</table>';

    html += '<button class="gh-btn gh-btn-secondary" data-action="close-game" style="width:100%;margin-top:12px;">\u2715 \u5173\u95ED\u6E38\u620F</button>';

    config.ui.showModal('\uD83C\uDFA8 \u4F60\u753B\u6211\u731C', html);
  }

  /* ==================== 事件处理 ==================== */
  function handleModalClick(e) {
    var target = e.target;
    if (target.tagName !== 'BUTTON') return;
    var action = target.getAttribute('data-action');
    if (!action) return;

    e.preventDefault();
    e.stopPropagation();

    switch (action) {
      case 'start-game':
        handleStartGame();
        break;
      case 'pick-word':
        var word = target.getAttribute('data-word');
        handlePickWord(word);
        break;
      case 'send-guess':
        sendGuess();
        break;
      case 'clear-canvas':
        handleClearCanvas();
        break;
      case 'undo-stroke':
        handleUndoStroke();
        break;
      case 'close-game':
        cleanup();
        break;
    }
  }

  function handleStartGame() {
    if (getMyIndex() !== 0) return;
    broadcast('game_start', {});
    startRound();
  }

  function handlePickWord(word) {
    if (getMyIndex() !== state.painterIndex) return;

    // 私密告诉画师的词
    onWordPicked(word);
  }

  function handleClearCanvas() {
    if (getMyIndex() !== state.painterIndex) return;
    allStrokes = [];
    pendingStrokes = [];
    if (ctx) {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
    broadcastExceptMe('dg_clear', {});
    render();
  }

  function handleUndoStroke() {
    if (getMyIndex() !== state.painterIndex) return;
    if (allStrokes.length === 0) return;

    allStrokes.pop();
    // 从待发送中也移除
    if (pendingStrokes.length > 0) {
      pendingStrokes.pop();
    }
    redrawAllStrokes();
    broadcastExceptMe('dg_undo', {});
    render();
  }

  /* ==================== 解绑 Canvas 事件 ==================== */
  function unbindCanvasEvents() {
    if (!canvasEl) return;
    canvasEl.removeEventListener('mousedown', onMouseDown);
    canvasEl.removeEventListener('mousemove', onMouseMove);
    canvasEl.removeEventListener('mouseup', onMouseUp);
    canvasEl.removeEventListener('mouseleave', onMouseUp);
  }

  /* ==================== 消息接收 ==================== */
  function onDataReceived(uid, data) {
    if (!state || state.gameOver) return;
    if (!data || data.type !== 'game_action' || data.gameId !== 'drawguess') return;

    var payload = data.payload;
    if (!payload) return;

    var senderIndex = getPlayerIndexByUid(uid);
    if (senderIndex === -1) return;

    switch (payload.action) {
      case 'game_start':
        if (getMyIndex() !== 0) startRound();
        break;

      case 'phase_change':
        state.phase = payload.phase;
        state.painterIndex = payload.painterIndex;
        state.round = payload.round;
        render();
        break;

      case 'start_drawing':
        state.phase = 'drawing';
        state.painterIndex = payload.painterIndex;
        state.timeLeft = ROUND_TIME;
        // 清空笔画
        allStrokes = [];
        pendingStrokes = [];
        guessInputEl = null;
        startTimer();
        render();
        break;

      case 'round_end':
        stopTimer();
        stopStrokeSender();
        unbindCanvasEvents();
        // 显示答案
        config.ui.showToast('\uD83D\uDCDD \u7B54\u6848: ' + payload.word, 'info');
        break;

      case 'game_over':
        state.gameOver = true;
        state.phase = 'ended';
        stopTimer();
        stopStrokeSender();
        unbindCanvasEvents();
        render();
        break;

      case 'dg_draw':
        if (payload.strokes) {
          receiveStrokes(payload.strokes);
        }
        break;

      case 'dg_clear':
        allStrokes = [];
        if (ctx) ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        render();
        break;

      case 'dg_undo':
        if (allStrokes.length > 0) {
          allStrokes.pop();
          redrawAllStrokes();
        }
        render();
        break;

      case 'dg_guess':
        handleGuess(payload.from, payload.word);
        break;
    }
  }

  /* ==================== 清理 ==================== */
  function cleanup() {
    stopTimer();
    stopStrokeSender();
    unbindCanvasEvents();

    if (config && config.ui) {
      config.ui.closeModal();
    }

    canvasEl = null;
    ctx = null;
    guessInputEl = null;
    state = null;
    config = null;
  }

  /* ==================== 模块导出 ==================== */
  window.GameModules = window.GameModules || {};
  window.GameModules['drawguess'] = {
    start: function (cfg) {
      config = cfg;

      // 去重保护
      if (state) {
        cleanup();
      }

      initGame();

      // 注册消息接收
      config.core.onData(function (uid, data) {
        onDataReceived(uid, data);
      });

      // 绑定弹窗事件
      document.addEventListener('click', handleModalClick);

      // 渲染
      render();
    },

    cleanup: function () {
      document.removeEventListener('click', handleModalClick);
      cleanup();
    },

    getState: function () {
      return state;
    },
  };

})();
