/**
 * 狼人杀（简版）— iirose 游戏大厅模块
 * 包名: nekonya.gamehub
 */
(function () {
  'use strict';

  if (window.GameModules && window.GameModules['werewolf']) return;

  /* ==================== 常量 ==================== */
  var PHASE_NIGHT = 'night';
  var PHASE_DAY   = 'day';
  var PHASE_VOTE  = 'vote';
  var PHASE_END   = 'end';

  var ROLE_WEREWOLF = 'werewolf';
  var ROLE_SEER     = 'seer';
  var ROLE_HUNTER   = 'hunter';
  var ROLE_CIVILIAN = 'civilian';

  var ROLE_NAMES = {};
  ROLE_NAMES[ROLE_WEREWOLF] = '\u72FC\u4EBA';
  ROLE_NAMES[ROLE_SEER]     = '\u9884\u8A00\u5BB6';
  ROLE_NAMES[ROLE_HUNTER]   = '\u730E\u4EBA';
  ROLE_NAMES[ROLE_CIVILIAN] = '\u5E73\u6C11';

  var ROLE_COLORS = {};
  ROLE_COLORS[ROLE_WEREWOLF] = '#c0392b';
  ROLE_COLORS[ROLE_SEER]     = '#2980b9';
  ROLE_COLORS[ROLE_HUNTER]   = '#27ae60';
  ROLE_COLORS[ROLE_CIVILIAN] = '#7f8c8d';

  /* ==================== 模块状态 ==================== */
  var state = null;   // 当前游戏状态对象
  var config = null;  // 外部传入配置
  var timerId = null;

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

  function getPlayerByUid(uid) {
    if (!config || !config.players) return null;
    for (var i = 0; i < config.players.length; i++) {
      if (config.players[i].uid === uid) return config.players[i];
    }
    return null;
  }

  function getPlayerIndexByUid(uid) {
    if (!config || !config.players) return -1;
    for (var i = 0; i < config.players.length; i++) {
      if (config.players[i].uid === uid) return i;
    }
    return -1;
  }

  /* ==================== 角色分配 ==================== */
  function assignRoles(playerCount) {
    var roles = [];
    var i;

    // 狼人数量
    var wolfCount = playerCount <= 6 ? 1 : 2;
    // 预言家
    var seerCount = 1;
    // 猎人
    var hunterCount = 1;
    // 平民 = 剩余
    var civilianCount = playerCount - wolfCount - seerCount - hunterCount;
    if (civilianCount < 0) civilianCount = 0;

    for (i = 0; i < wolfCount; i++) roles.push(ROLE_WEREWOLF);
    for (i = 0; i < seerCount; i++) roles.push(ROLE_SEER);
    for (i = 0; i < hunterCount; i++) roles.push(ROLE_HUNTER);
    for (i = 0; i < civilianCount; i++) roles.push(ROLE_CIVILIAN);

    // 随机打乱 (Fisher-Yates)
    for (i = roles.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = roles[i];
      roles[i] = roles[j];
      roles[j] = tmp;
    }

    return roles;
  }

  /* ==================== 状态初始化 ==================== */
  function initGame() {
    var playerCount = config.players.length;
    var roles = assignRoles(playerCount);

    var players = [];
    for (var i = 0; i < playerCount; i++) {
      players.push({
        index: i,
        uid: config.players[i].uid,
        name: config.players[i].name || config.players[i].uid,
        role: roles[i],
        alive: true,
        isWolf: roles[i] === ROLE_WEREWOLF,
      });
    }

    state = {
      phase: PHASE_NIGHT,
      round: 0,
      players: players,
      aliveCount: playerCount,
      wolfCount: roles.filter(function (r) { return r === ROLE_WEREWOLF; }).length,
      deadTonight: null,  // 今晚被杀的玩家 index
      seerChecked: null,  // 预言家查验结果
      votes: {},          // { voterIndex: targetIndex }
      votedPlayers: [],   // 已投票玩家 index 列表
      messageBuffer: [],  // 待展示消息
      gameOver: false,
      hunterKillTarget: null, // 猎人带走目标
    };
  }

  /* ==================== 存活玩家列表 ==================== */
  function getAlivePlayers() {
    return state.players.filter(function (p) { return p.alive; });
  }

  function getAliveWolves() {
    return state.players.filter(function (p) { return p.alive && p.isWolf; });
  }

  function getAliveNonWolves() {
    return state.players.filter(function (p) { return p.alive && !p.isWolf; });
  }

  /* ==================== 发送消息 ==================== */
  function sendTo(uid, type, payload) {
    config.core.sendToUid(uid, {
      type: 'game_action',
      gameId: 'werewolf',
      payload: payload,
    });
  }

  function broadcast(type, payload) {
    for (var i = 0; i < config.players.length; i++) {
      sendTo(config.players[i].uid, type, payload);
    }
  }

  /* ==================== 弹窗渲染 ==================== */
  function render() {
    if (!config || !config.ui) return;

    var myIndex = getMyIndex();
    var me = state.players[myIndex];

    var html = '';

    // 阶段信息
    html += '<div style="text-align:center;margin-bottom:12px;">';
    html += '<span style="display:inline-block;padding:4px 16px;border-radius:12px;font-size:13px;font-weight:600;';
    if (state.phase === PHASE_NIGHT) {
      html += 'background:#2c3e50;color:#ecf0f1;">\uFE0F\u2600 \u591C\u665A\u9636\u6BB5 (\u7B2C' + (state.round + 1) + '\u665A)';
    } else if (state.phase === PHASE_DAY) {
      html += 'background:#f39c12;color:#fff;">\u2600\uFE0F \u767D\u5929\u9636\u6BB5 (\u7B2C' + (state.round + 1) + '\u5929)';
    } else if (state.phase === PHASE_VOTE) {
      html += 'background:#e74c3c;color:#fff;">\uD83D\uDD12 \u6295\u7968\u9636\u6BB5';
    } else if (state.phase === PHASE_END) {
      html += 'background:#9b59b6;color:#fff;">\uD83C\uDFC6 \u6E38\u620F\u7ED3\u675F';
    }
    html += '</span></div>';

    // 公告区
    if (state.messageBuffer.length > 0) {
      html += '<div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:13px;color:#f1c40f;text-align:center;">';
      for (var m = 0; m < state.messageBuffer.length; m++) {
        html += '<div>' + state.messageBuffer[m] + '</div>';
      }
      html += '</div>';
    }

    // 存活玩家列表
    var alive = getAlivePlayers();
    html += '<div style="font-size:13px;font-weight:600;color:#bdc3c7;margin-bottom:6px;">\uD83D\uDC65 \u5B58\u6D3B\u73A9\u5BB6 (' + alive.length + '/' + state.players.length + ')</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">';
    for (var i = 0; i < state.players.length; i++) {
      var p = state.players[i];
      if (!p.alive) continue;
      var isMe = i === myIndex;
      var label = p.name;
      // 如果是我自己或游戏结束，显示角色
      if (isMe || state.phase === PHASE_END) {
        label += ' (' + ROLE_NAMES[p.role] + ')';
      }
      html += '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;';
      if (isMe) {
        html += 'background:' + ROLE_COLORS[p.role] + ';color:#fff;font-weight:600;';
      } else {
        html += 'background:rgba(255,255,255,0.1);color:#ecf0f1;';
      }
      html += '">' + label + '</span>';
    }
    html += '</div>';

    // 根据阶段显示操作内容
    if (state.phase === PHASE_NIGHT) {
      renderNightPhase(html, me, myIndex, function (newHtml) {
        config.ui.showModal('\uD83D\uDC3A \u72FC\u4EBA\u6740', newHtml);
      });
    } else if (state.phase === PHASE_DAY) {
      renderDayPhase(html, me, myIndex, function (newHtml) {
        config.ui.showModal('\uD83D\uDC3A \u72FC\u4EBA\u6740', newHtml);
      });
    } else if (state.phase === PHASE_VOTE) {
      renderVotePhase(html, me, myIndex, function (newHtml) {
        config.ui.showModal('\uD83D\uDC3A \u72FC\u4EBA\u6740', newHtml);
      });
    } else if (state.phase === PHASE_END) {
      renderEndPhase(html, function (newHtml) {
        config.ui.showModal('\uD83D\uDC3A \u72FC\u4EBA\u6740', newHtml);
      });
    }
  }

  /* ==================== 夜晚阶段渲染 ==================== */
  function renderNightPhase(baseHtml, me, myIndex, callback) {
    var html = baseHtml;

    if (me.role === ROLE_WEREWOLF && me.alive) {
      var targets = getAlivePlayers().filter(function (p) { return p.index !== myIndex; });
      html += '<div style="font-size:14px;font-weight:600;color:#e74c3c;margin-bottom:8px;">\uD83D\uDD2A \u8BF7\u9009\u62E9\u6740\u5BB3\u76EE\u6807</div>';
      html += '<div style="display:flex;flex-direction:column;gap:4px;">';
      for (var i = 0; i < targets.length; i++) {
        html += '<button class="gh-btn gh-btn-primary gh-btn-sm" data-action="wolf-kill" data-target="' + targets[i].index + '" style="text-align:left;">' +
          '\uD83D\uDD2A ' + targets[i].name + '</button>';
      }
      html += '</div>';
    } else if (me.role === ROLE_SEER && me.alive) {
      var checkTargets = getAlivePlayers().filter(function (p) { return p.index !== myIndex; });
      html += '<div style="font-size:14px;font-weight:600;color:#3498db;margin-bottom:8px;">\uD83D\uDD2D \u8BF7\u9009\u62E9\u9A8C\u4EBA\u76EE\u6807</div>';
      html += '<div style="display:flex;flex-direction:column;gap:4px;">';
      for (var i = 0; i < checkTargets.length; i++) {
        html += '<button class="gh-btn gh-btn-primary gh-btn-sm" data-action="seer-check" data-target="' + checkTargets[i].index + '" style="text-align:left;">' +
          '\uD83D\uDD2D ' + checkTargets[i].name + '</button>';
      }
      html += '</div>';
    } else if (me.role === ROLE_HUNTER && !me.alive && state.hunterKillTarget === null) {
      // 猎人死亡后可以开枪
      var hunterTargets = getAlivePlayers().filter(function (p) { return p.index !== myIndex; });
      html += '<div style="font-size:14px;font-weight:600;color:#27ae60;margin-bottom:8px;">\uD83D\uDEE1\uFE0F \u730E\u4EBA\u5F00\u67AA\uFF0C\u8BF7\u9009\u62E9\u5E26\u8D70\u76EE\u6807</div>';
      html += '<div style="display:flex;flex-direction:column;gap:4px;">';
      for (var i = 0; i < hunterTargets.length; i++) {
        html += '<button class="gh-btn gh-btn-primary gh-btn-sm" data-action="hunter-kill" data-target="' + hunterTargets[i].index + '" style="text-align:left;">' +
          '\uD83C\uDFAF ' + hunterTargets[i].name + '</button>';
      }
      html += '</div>';
    } else {
      html += '<div style="text-align:center;padding:20px 0;color:#95a5a6;font-size:14px;">\u0024\u0024\u0024\u0024 \u95ED\u4E0A\u773C\u776B\uFF0C\u7B49\u5F85\u591C\u665A\u7ED3\u675F...\u0024\u0024\u0024\u0024</div>';
    }

    callback(html);
  }

  /* ==================== 白天阶段渲染 ==================== */
  function renderDayPhase(baseHtml, me, myIndex, callback) {
    var html = baseHtml;

    // 公告死者
    if (state.deadTonight !== null) {
      var deadPlayer = state.players[state.deadTonight];
      html += '<div style="background:rgba(231,76,60,0.2);border:1px solid rgba(231,76,60,0.4);border-radius:8px;padding:10px;margin-bottom:12px;text-align:center;">';
      html += '<div style="font-size:13px;color:#e74c3c;">\u2620\uFE0F ' + deadPlayer.name + ' \u5728\u591C\u665A\u4E2D\u88AB\u6740\u5BB3\u4E86</div>';
      if (state.phase === PHASE_END) {
        html += '<div style="font-size:12px;color:#95a5a6;margin-top:4px;">\u89D2\u8272: ' + ROLE_NAMES[deadPlayer.role] + '</div>';
      }
      html += '</div>';
    } else {
      html += '<div style="background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);border-radius:8px;padding:10px;margin-bottom:12px;text-align:center;color:#2ecc71;">\uD83D\uDC4F \u6628\u665A\u662F\u5E73\u5B89\u591C\uFF0C\u6CA1\u6709\u4EBA\u6B7B\u4EA1</div>';
    }

    html += '<div style="font-size:13px;color:#bdc3c7;margin-bottom:8px;">\u8BF7\u5927\u5BB6\u8BA8\u8BBA\uFF0C\u5373\u5C06\u8FDB\u5165\u6295\u7968\u9636\u6BB5...</div>';

    if (me.alive) {
      html += '<button class="gh-btn gh-btn-primary" data-action="start-vote" style="width:100%;margin-top:4px;">\uD83D\uDD12 \u5F00\u59CB\u6295\u7968</button>';
    }

    callback(html);
  }

  /* ==================== 投票阶段渲染 ==================== */
  function renderVotePhase(baseHtml, me, myIndex, callback) {
    var html = baseHtml;

    if (!me.alive) {
      html += '<div style="text-align:center;padding:20px 0;color:#95a5a6;font-size:14px;">\uD83D\uDC80 \u5DF2\u6B7B\u4EA1\uFF0C\u65E0\u6CD5\u6295\u7968</div>';
      callback(html);
      return;
    }

    // 检查是否已投票
    var hasVoted = state.votedPlayers.indexOf(myIndex) !== -1;
    if (hasVoted) {
      html += '<div style="text-align:center;padding:20px 0;color:#2ecc71;font-size:14px;">\u2714\uFE0F \u5DF2\u6295\u7968</div>';
      callback(html);
      return;
    }

    var voteTargets = getAlivePlayers().filter(function (p) { return p.index !== myIndex; });
    html += '<div style="font-size:14px;font-weight:600;color:#f39c12;margin-bottom:8px;">\uD83D\uDD12 \u8BF7\u6295\u7968\u653E\u9010\u4E00\u540D\uFF08\u5F97\u7968\u6700\u591A\u8005\u51FA\u5C40\uFF09</div>';
    html += '<div style="display:flex;flex-direction:column;gap:4px;">';
    for (var i = 0; i < voteTargets.length; i++) {
      html += '<button class="gh-btn gh-btn-primary gh-btn-sm" data-action="vote" data-target="' + voteTargets[i].index + '" style="text-align:left;">' +
        '\uD83D\uDD12 ' + voteTargets[i].name + '</button>';
    }
    html += '</div>';

    callback(html);
  }

  /* ==================== 结束阶段渲染 ==================== */
  function renderEndPhase(baseHtml, callback) {
    var html = baseHtml;

    // 判定结果
    var wolves = getAliveWolves();
    var nonWolves = getAliveNonWolves();
    var winner = wolves.length === 0 ? '\u597D\u4EBA\u65B9' : '\u72FC\u4EBA\u65B9';

    html += '<div style="text-align:center;padding:16px 0;">';
    html += '<div style="font-size:24px;margin-bottom:8px;">' + (wolves.length === 0 ? '\uD83C\uDFC6' : '\uD83D\uDC3A') + '</div>';
    html += '<div style="font-size:16px;font-weight:600;color:#f1c40f;margin-bottom:12px;">' + winner + ' \u83B7\u80DC\uFF01</div>';
    html += '</div>';

    // 显示所有玩家角色
    html += '<div style="font-size:13px;font-weight:600;color:#bdc3c7;margin-bottom:6px;">\uD83D\uDCCA \u89D2\u8272\u62AB\u9732</div>';
    html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
    for (var i = 0; i < state.players.length; i++) {
      var p = state.players[i];
      var statusIcon = p.alive ? '\uD83D\uDFE2' : '\u274C';
      html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">';
      html += '<td style="padding:4px 8px;">' + statusIcon + '</td>';
      html += '<td style="padding:4px 8px;">' + p.name + '</td>';
      html += '<td style="padding:4px 8px;color:' + ROLE_COLORS[p.role] + ';">' + ROLE_NAMES[p.role] + '</td>';
      html += '</tr>';
    }
    html += '</table>';

    html += '<div style="text-align:center;margin-top:12px;">';
    html += '<button class="gh-btn gh-btn-secondary" data-action="close-game" style="width:100%;">\u2715 \u5173\u95ED\u6E38\u620F</button>';
    html += '</div>';

    callback(html);
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
      case 'wolf-kill':
        var wolfTarget = parseInt(target.getAttribute('data-target'), 10);
        handleWolfKill(wolfTarget);
        break;
      case 'seer-check':
        var seerTarget = parseInt(target.getAttribute('data-target'), 10);
        handleSeerCheck(seerTarget);
        break;
      case 'hunter-kill':
        var hunterTarget = parseInt(target.getAttribute('data-target'), 10);
        handleHunterKill(hunterTarget);
        break;
      case 'start-vote':
        handleStartVote();
        break;
      case 'vote':
        var voteTarget = parseInt(target.getAttribute('data-target'), 10);
        handleVote(voteTarget);
        break;
      case 'close-game':
        cleanup();
        break;
    }
  }

  /* ==================== 夜晚阶段逻辑 ==================== */
  function handleWolfKill(targetIndex) {
    var myIndex = getMyIndex();
    if (myIndex === -1) return;

    // 记录击杀目标并广播
    state.deadTonight = targetIndex;

    broadcast(PHASE_NIGHT, {
      action: 'wolf_kill',
      from: myIndex,
      target: targetIndex,
    });

    config.ui.showToast('\u5DF2\u9009\u62E9\u6740\u5BB3 ' + state.players[targetIndex].name, 'info');

    // 狼人确认后，延迟2秒进入白天（给预言家一点时间）
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(function () {
      timerId = null;
      startDay();
    }, 2000);
  }

  function handleSeerCheck(targetIndex) {
    var myIndex = getMyIndex();
    if (myIndex === -1) return;

    // 广播预言家查验
    broadcast(PHASE_NIGHT, {
      action: 'seer_check',
      from: myIndex,
      target: targetIndex,
    });

    // 本地显示结果
    var targetPlayer = state.players[targetIndex];
    var isWolf = targetPlayer.isWolf;
    var result = isWolf ? '\uD83D\uDC3A \u662F\u72FC\u4EBA\uFF01' : '\uD83D\uDC64 \u4E0D\u662F\u72FC\u4EBA';
    config.ui.showToast('\u9A8C\u8BC1\u7ED3\u679C: ' + targetPlayer.name + ' ' + result, isWolf ? 'warn' : 'info');

    state.seerChecked = targetIndex;
  }

  function handleHunterKill(targetIndex) {
    state.hunterKillTarget = targetIndex;
    state.players[targetIndex].alive = false;
    state.aliveCount--;

    broadcast(PHASE_NIGHT, {
      action: 'hunter_kill',
      from: getMyIndex(),
      target: targetIndex,
    });

    config.ui.showToast('\u730E\u4EBA\u5E26\u8D70\u4E86 ' + state.players[targetIndex].name, 'info');

    if (checkGameOver()) return;

    // 猎人开枪后进入白天
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(function () {
      timerId = null;
      startDay();
    }, 1500);
  }

  /* ==================== 白天/投票逻辑 ==================== */
  function handleStartVote() {
    var myIndex = getMyIndex();
    state.phase = PHASE_VOTE;
    state.votes = {};
    state.votedPlayers = [];

    broadcast(PHASE_VOTE, {
      action: 'start_vote',
      from: myIndex,
    });

    config.ui.showToast('\u6295\u7968\u5F00\u59CB\uFF0C\u8BF7\u9009\u62E9\u653E\u9010\u76EE\u6807', 'info');
    render();
  }

  function handleVote(targetIndex) {
    var myIndex = getMyIndex();
    if (state.votedPlayers.indexOf(myIndex) !== -1) return;

    state.votes[myIndex] = targetIndex;
    state.votedPlayers.push(myIndex);

    broadcast(PHASE_VOTE, {
      action: 'vote',
      from: myIndex,
      target: targetIndex,
    });

    config.ui.showToast('\u5DF2\u6295\u7968', 'info');

    // 检查是否所有人都投票了
    checkVoteComplete();
  }

  function checkVoteComplete() {
    var alive = getAlivePlayers();
    var aliveIndices = alive.map(function (p) { return p.index; });
    var allVoted = true;
    for (var i = 0; i < aliveIndices.length; i++) {
      if (state.votedPlayers.indexOf(aliveIndices[i]) === -1) {
        allVoted = false;
        break;
      }
    }

    if (allVoted) {
      tallyVotes();
    } else {
      render();
    }
  }

  /* ==================== 计票 ==================== */
  function tallyVotes() {
    var tally = {};
    var voteKeys = Object.keys(state.votes);
    for (var i = 0; i < voteKeys.length; i++) {
      var target = state.votes[voteKeys[i]];
      tally[target] = (tally[target] || 0) + 1;
    }

    // 找最高票
    var maxVotes = 0;
    var maxTargets = [];
    var tallyKeys = Object.keys(tally);
    for (var j = 0; j < tallyKeys.length; j++) {
      var t = parseInt(tallyKeys[j], 10);
      if (tally[t] > maxVotes) {
        maxVotes = tally[t];
        maxTargets = [t];
      } else if (tally[t] === maxVotes) {
        maxTargets.push(t);
      }
    }

    // 平票则无人出局
    var eliminated = maxTargets.length === 1 ? maxTargets[0] : null;

    if (eliminated !== null) {
      state.players[eliminated].alive = false;
      state.aliveCount--;

      var role = state.players[eliminated].role;
      state.messageBuffer = ['\u2620\uFE0F ' + state.players[eliminated].name + ' \u88AB\u6295\u51FA\u5C40 (' + ROLE_NAMES[role] + ')'];

      // 如果是猎人被投出，可以开枪
      if (role === ROLE_HUNTER) {
        state.hunterKillTarget = null;
        // 通知猎人开枪（会在下一轮夜晚处理）
      }
    } else {
      state.messageBuffer = ['\u270B \u672C\u6B21\u6295\u7968\u5E73\u7968\uFF0C\u65E0\u4EBA\u88AB\u653E\u9010'];
    }

    // 检查游戏结束条件
    if (checkGameOver()) return;

    // 进入下一轮夜晚
    startNextRound();
  }

  /* ==================== 检查游戏结束 ==================== */
  function checkGameOver() {
    var wolves = getAliveWolves();
    var nonWolves = getAliveNonWolves();

    // 狼人全部死亡 → 好人胜利
    if (wolves.length === 0) {
      endGame(true);
      return true;
    }

    // 狼人数 >= 非狼人数（且至少有一狼）→ 狼人胜利
    if (wolves.length > 0 && wolves.length >= nonWolves.length) {
      endGame(false);
      return true;
    }

    return false;
  }

  /* ==================== 下一轮 ==================== */
  function startNextRound() {
    state.round++;
    state.phase = PHASE_NIGHT;
    state.deadTonight = null;
    state.seerChecked = null;
    state.votes = {};
    state.votedPlayers = [];

    // 处理猎人开枪（上一轮出局的猎人）
    // 猎人的开枪在夜晚阶段通过 UI 处理

    broadcast(PHASE_NIGHT, {
      action: 'new_round',
      round: state.round,
    });

    config.ui.showToast('\u7B2C' + (state.round + 1) + '\u5929\u5F00\u59CB', 'info');
    render();
  }

  /* ==================== 结束游戏 ==================== */
  function endGame(humansWin) {
    state.phase = PHASE_END;
    state.gameOver = true;

    if (humansWin) {
      state.messageBuffer = ['\uD83C\uDFC6 \u597D\u4EBA\u65B9\u83B7\u80DC\uFF01'];
    } else {
      state.messageBuffer = ['\uD83C\uDFC6 \u72FC\u4EBA\u65B9\u83B7\u80DC\uFF01'];
    }

    broadcast(PHASE_END, {
      action: 'game_over',
      humansWin: humansWin,
    });

    render();
  }

  /* ==================== 消息接收 ==================== */
  function onDataReceived(uid, data) {
    if (!state || state.gameOver) return;
    if (!data || data.type !== 'game_action' || data.gameId !== 'werewolf') return;

    var payload = data.payload;
    if (!payload) return;

    var senderIndex = getPlayerIndexByUid(uid);
    if (senderIndex === -1) return;

    // 根据当前阶段处理消息
    switch (state.phase) {
      case PHASE_NIGHT:
        handleNightMessage(senderIndex, payload);
        break;
      case PHASE_DAY:
        handleDayMessage(senderIndex, payload);
        break;
      case PHASE_VOTE:
        handleVoteMessage(senderIndex, payload);
        break;
    }
  }

  function handleNightMessage(senderIndex, payload) {
    if (payload.action === 'wolf_kill') {
      // 记录狼人击杀目标
      if (state.players[senderIndex].isWolf && state.players[senderIndex].alive) {
        state.deadTonight = payload.target;
        // 接收端也延迟进入白天，与发送端同步
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(function () {
          timerId = null;
          startDay();
        }, 2000);
      }
    } else if (payload.action === 'seer_check') {
      // 预言家查验信息，仅在本地显示
    } else if (payload.action === 'hunter_kill') {
      state.hunterKillTarget = payload.target;
      state.players[payload.target].alive = false;
      state.aliveCount--;

      if (checkGameOver()) return;

      // 进入白天
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(function () {
        timerId = null;
        startDay();
      }, 1500);
    } else if (payload.action === 'new_round') {
      // 同步轮次状态
      state.round = payload.round;
      state.phase = PHASE_NIGHT;
      state.deadTonight = null;
      state.seerChecked = null;
      state.votes = {};
      state.votedPlayers = [];
      state.messageBuffer = [];
      render();
    }
  }

  function handleDayMessage(senderIndex, payload) {
    if (payload.action === 'start_vote') {
      state.phase = PHASE_VOTE;
      state.votes = {};
      state.votedPlayers = [];
      render();
    }
  }

  function handleVoteMessage(senderIndex, payload) {
    if (payload.action === 'vote') {
      var voter = payload.from;
      var target = payload.target;
      if (state.votedPlayers.indexOf(voter) === -1) {
        state.votes[voter] = target;
        state.votedPlayers.push(voter);
        checkVoteComplete();
      }
    } else if (payload.action === 'start_vote') {
      state.phase = PHASE_VOTE;
      state.votes = {};
      state.votedPlayers = [];
      render();
    }
  }

  /* ==================== 进入白天 ==================== */
  function startDay() {
    state.phase = PHASE_DAY;

    if (state.deadTonight !== null) {
      state.players[state.deadTonight].alive = false;
      state.aliveCount--;

      var deadRole = state.players[state.deadTonight].role;
      state.messageBuffer = ['\u2620\uFE0F ' + state.players[state.deadTonight].name + ' \u5728\u591C\u665A\u88AB\u6740\u5BB3\u4E86'];

      // 猎人被杀可以开枪
      if (deadRole === ROLE_HUNTER) {
        state.hunterKillTarget = null;
        // 在夜晚阶段UI中处理猎人开枪
      }
    } else {
      state.messageBuffer = ['\uD83D\uDC4F \u5E73\u5B89\u591C'];
    }

    if (checkGameOver()) return;

    broadcast(PHASE_DAY, {
      action: 'day_start',
      round: state.round,
      deadTonight: state.deadTonight,
    });

    render();
  }

  /* ==================== 清理 ==================== */
  function cleanup() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (config && config.ui) {
      config.ui.closeModal();
    }
    state = null;
    config = null;
  }

  /* ==================== 模块导出 ==================== */
  window.GameModules = window.GameModules || {};
  window.GameModules['werewolf'] = {
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

      // 第一次渲染
      render();

      // 给房主一个开始按钮（玩家0即房主）
      if (config.myIndex === 0) {
        config.ui.showToast('\u4F60\u662F\u623F\u4E3B\uFF0C\u8BF7\u7B49\u5F85\u591C\u665A\u64CD\u4F5C', 'info');
      }
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
