(function () {
  'use strict';

  /* ==================== 去重保护 ==================== */
  if (window.__gamehubSpyInstalled) return;
  window.__gamehubSpyInstalled = true;

  /* ==================== 词库 ==================== */
  var WORD_PAIRS = [
    ['\u82F9\u679C', '\u68A8\u5B50'],
    ['\u624B\u673A', '\u5E73\u677F'],
    ['\u732B', '\u8001\u864E'],
    ['\u94A2\u7434', '\u7535\u5B50\u7434'],
    ['\u98DE\u673A', '\u76F4\u5347\u673A'],
    ['\u592A\u9633', '\u6708\u4EAE'],
    ['\u6CB3\u6D41', '\u6E56\u6CCA'],
    ['\u8DB3\u7403', '\u7BEE\u7403'],
    ['\u533B\u751F', '\u62A4\u58EB'],
    ['\u8001\u5E08', '\u6559\u6388'],
    ['\u5496\u5561', '\u5976\u8336'],
    ['\u9762\u5305', '\u86CB\u7CD5'],
    ['\u96E8\u4F1E', '\u96E8\u8863'],
    ['\u6C99\u53D1', '\u6905\u5B50'],
    ['\u51B0\u7BB1', '\u7A7A\u8C03'],
    ['\u706B\u8F66', '\u9AD8\u94C1'],
    ['\u94B1\u5305', '\u5305\u5305'],
    ['\u773C\u955C', '\u592A\u9633\u955C'],
    ['\u86CB\u7CCD', '\u6708\u997C'],
    ['\u6CB9\u6761', '\u9EBB\u82B1'],
  ];

  /* ==================== CSS ==================== */
  var CSS_ID = 'gh-spy-css';
  function injectCSS() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent = [
      '.gh-spy-wrap{position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483645;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center}',
      '.gh-spy-panel{background:rgba(22,22,34,0.96);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px 28px;min-width:340px;max-width:440px;color:#eee;font-family:sans-serif;box-shadow:0 8px 40px rgba(0,0,0,0.7)}',
      '.gh-spy-panel .gh-spy-title{font-size:20px;font-weight:700;text-align:center;margin-bottom:18px;color:#f6a}',
      '.gh-spy-section{margin-bottom:16px}',
      '.gh-spy-section-title{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px}',
      '.gh-spy-word-box{text-align:center;padding:16px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);margin-bottom:10px}',
      '.gh-spy-word{font-size:28px;font-weight:700;color:#f6a;letter-spacing:2px}',
      '.gh-spy-role{font-size:14px;margin-top:6px}',
      '.gh-spy-role-civilian{color:#6edb9e}',
      '.gh-spy-role-spy{color:#e74c3c}',
      '.gh-spy-phase{text-align:center;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.04);font-size:13px;color:#bbb;margin-bottom:12px}',
      '.gh-spy-vote-list{display:flex;flex-direction:column;gap:6px}',
      '.gh-spy-vote-btn{display:flex;align-items:center;gap:8px;padding:10px 14px;border:none;border-radius:8px;background:rgba(255,255,255,0.06);color:#eee;font-size:14px;cursor:pointer;transition:.2s;text-align:left;width:100%}',
      '.gh-spy-vote-btn:hover{background:rgba(255,102,170,0.15)}',
      '.gh-spy-vote-btn:disabled{opacity:.4;cursor:not-allowed}',
      '.gh-spy-vote-btn .gh-spy-vote-icon{font-size:16px}',
      '.gh-spy-vote-count{font-size:12px;color:#888;margin-top:8px;text-align:center}',
      '.gh-spy-result-item{padding:10px 14px;border-radius:8px;margin-bottom:6px;background:rgba(255,255,255,0.04)}',
      '.gh-spy-result-item .gh-spy-result-name{font-weight:600}',
      '.gh-spy-result-item .gh-spy-result-role{font-size:12px}',
      '.gh-spy-result-item.gh-spy-result-out{background:rgba(220,80,80,0.1);border-left:3px solid #e74c3c}',
      '.gh-spy-result-item.gh-spy-result-safe{background:rgba(80,220,140,0.1);border-left:3px solid #6edb9e}',
      '.gh-spy-game-over{text-align:center;padding:16px;border-radius:10px;margin-top:8px}',
      '.gh-spy-game-over-civilian{background:rgba(80,220,140,.12);border:1px solid rgba(80,220,140,.25)}',
      '.gh-spy-game-over-spy{background:rgba(220,80,80,.12);border:1px solid rgba(220,80,80,.25)}',
      '.gh-spy-game-over .gh-spy-go-t{font-size:18px;font-weight:700;margin-bottom:4px}',
      '.gh-spy-game-over-civilian .gh-spy-go-t{color:#6edb9e}',
      '.gh-spy-game-over-spy .gh-spy-go-t{color:#e74c3c}',
      '.gh-spy-game-over .gh-spy-go-d{font-size:12px;color:#aaa}',
      '.gh-spy-close{display:block;margin:14px auto 0;padding:8px 28px;border:none;border-radius:8px;background:rgba(255,255,255,.08);color:#ddd;font-size:13px;cursor:pointer}',
      '.gh-spy-close:hover{background:rgba(255,255,255,.15)}',
      '.gh-spy-next{display:block;margin:10px auto 0;padding:8px 24px;border:none;border-radius:8px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:13px;cursor:pointer;transition:.2s}',
      '.gh-spy-next:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(102,126,234,.4)}',
      '.gh-spy-reveal{text-align:center;padding:12px;border-radius:8px;margin:8px 0;font-size:14px}',
      '.gh-spy-reveal-spy{background:rgba(220,80,80,.15);border:1px solid rgba(220,80,80,.25);color:#e74c3c}',
      '.gh-spy-reveal-civilian{background:rgba(80,220,140,.12);border:1px solid rgba(80,220,140,.25);color:#6edb9e}',
      '.gh-spy-reveal-text{font-weight:700}',
      '.gh-spy-alive-count{font-size:12px;color:#888;text-align:center;margin-top:6px}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ==================== 游戏模块 ==================== */
  window.GameModules = window.GameModules || {};

  var _inst = null;

  window.GameModules['spy'] = {
    start: function (cfg) {
      if (_inst) _inst.cleanup();
      _inst = new SpyGame(cfg);
    },
    cleanup: function () {
      if (_inst) { _inst.cleanup(); _inst = null; }
    },
  };

  /* ==================== SpyGame 实现 ==================== */
  function SpyGame(cfg) {
    var self = this;
    var players = cfg.players;
    var myIdx = cfg.myIndex;
    var core = cfg.core;
    var ui = cfg.ui;
    var IS_HOST = (myIdx === 0);
    var myUid = core.getMyUid();
    var hostUid = players[0].uid;

    var cleaned = false;
    var over = false;

    // 游戏状态
    var myWord = '';
    var myRole = '';         // '\u5E73\u6C11' or '\u5367\u5E95'
    var isSpy = false;
    var phase = '';          // 'word', 'discuss', 'vote', 'result', 'over'
    var round = 0;
    var votes = {};          // { voterUid: targetUid }
    var votedOut = [];       // [{uid, name, role}]
    var eliminated = {};     // { uid: true }
    var spyUids = [];
    var alivePlayers = [];

    // 构造时初始化玩家列表（含身份标记）
    var playerRoles = {};    // { uid: { isSpy, word } }

    // DOM
    var wrap, panel, wordSection, phaseEl, voteSection, resultSection, closeBtn;
    var wordDisplayEl, roleDisplayEl;

    // ===== 工具 =====
    function randomInt(max) { return Math.floor(Math.random() * max); }

    function shuffleArr(a) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = randomInt(i + 1);
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    function getAlive() {
      return players.filter(function (p) { return !eliminated[p.uid]; });
    }

    function getAliveSpyCount() {
      var c = 0;
      for (var i = 0; i < players.length; i++) {
        if (!eliminated[players[i].uid] && playerRoles[players[i].uid] && playerRoles[players[i].uid].isSpy) c++;
      }
      return c;
    }

    function getAliveCivilianCount() {
      var c = 0;
      for (var i = 0; i < players.length; i++) {
        if (!eliminated[players[i].uid] && playerRoles[players[i].uid] && !playerRoles[players[i].uid].isSpy) c++;
      }
      return c;
    }

    // ===== 通信 =====
    function sendTo(uid, data) {
      core.sendToUid(uid, data);
    }

    // ===== 数据接收 =====
    var dataHandler = function (uid, data) {
      if (cleaned || over) return;
      if (!data || !data.type) return;

      // 主机：接收投票
      if (IS_HOST && data.type === 'spy_vote' && phase === 'vote') {
        var payload = data.payload;
        if (payload && payload.targetUid) {
          receiveVote(uid, payload.targetUid);
        }
      }

      // 非主机：接收游戏状态
      if (!IS_HOST && data.type === 'spy_state') {
        handleState(data);
      }
    };

    core.onData(dataHandler);

    // ===== 非主机状态处理 =====
    function handleState(msg) {
      switch (msg.action) {
        case 'word_assigned':
          myWord = msg.word || '';
          myRole = msg.role || '\u5E73\u6C11';
          isSpy = msg.isSpy || false;
          phase = 'discuss';
          updateWordUI();
          setPhase('\U0001F4AC \u8BA8\u8BBA\u9636\u6BB5 - \u8BF7\u81EA\u7531\u53D1\u8A00\u8BA8\u8BBA');
          showVoteSection(false);
          showResultSection(false);
          break;
        case 'vote_phase':
          phase = 'vote';
          round = msg.round || 1;
          alivePlayers = msg.players || getAlive();
          setPhase('\U0001F5F3 \u6295\u7968\u9636\u6BB5 (\u7B2C' + round + '\u8F6E) - \u8BF7\u9009\u62E9\u8981\u6295\u51FA\u7684\u4EBA');
          showWordSection(true);
          renderVoteButtons();
          showVoteSection(true);
          showResultSection(false);
          break;
        case 'vote_result':
          phase = 'result';
          setPhase('\u672C\u8F6E\u7ED3\u679C');
          showVoteSection(false);
          renderResult(msg);
          showResultSection(true);
          break;
        case 'game_over':
          over = true;
          phase = 'over';
          showVoteSection(false);
          showGameOver(msg);
          break;
      }
    }

    // ===== UI 构建 =====
    function buildUI() {
      injectCSS();
      wrap = document.createElement('div');
      wrap.className = 'gh-spy-wrap';
      panel = document.createElement('div');
      panel.className = 'gh-spy-panel';
      panel.innerHTML = [
        '<div class="gh-spy-title">\uD83D\uDD75 \u8C01\u662F\u5367\u5E95</div>',
        '<div class="gh-spy-phase" id="gh-spy-phase"></div>',
        '<div class="gh-spy-section" id="gh-spy-word-section">',
        '  <div class="gh-spy-word-box">',
        '    <div class="gh-spy-word" id="gh-spy-word"></div>',
        '    <div class="gh-spy-role" id="gh-spy-role"></div>',
        '  </div>',
        '</div>',
        '<div class="gh-spy-section" id="gh-spy-vote-section" style="display:none">',
        '  <div class="gh-spy-section-title">\u6295\u7968</div>',
        '  <div class="gh-spy-vote-list" id="gh-spy-vote-list"></div>',
        '  <div class="gh-spy-vote-count" id="gh-spy-vote-count"></div>',
        '</div>',
        '<div class="gh-spy-section" id="gh-spy-result-section" style="display:none">',
        '  <div class="gh-spy-section-title">\u7ED3\u679C</div>',
        '  <div id="gh-spy-result-body"></div>',
        '</div>',
        '<button class="gh-spy-close" id="gh-spy-close" style="display:none">\u5173\u95ED</button>',
      ].join('');
      wrap.appendChild(panel);
      document.body.appendChild(wrap);

      phaseEl = document.getElementById('gh-spy-phase');
      wordSection = document.getElementById('gh-spy-word-section');
      wordDisplayEl = document.getElementById('gh-spy-word');
      roleDisplayEl = document.getElementById('gh-spy-role');
      voteSection = document.getElementById('gh-spy-vote-section');
      var voteList = document.getElementById('gh-spy-vote-list');
      var voteCount = document.getElementById('gh-spy-vote-count');
      resultSection = document.getElementById('gh-spy-result-section');
      var resultBody = document.getElementById('gh-spy-result-body');
      closeBtn = document.getElementById('gh-spy-close');

      closeBtn.addEventListener('click', function () { self.cleanup(); });
      wrap.addEventListener('click', function (e) { if (e.target === wrap && over) self.cleanup(); });

      // 暴露引用供函数使用
      self._voteList = voteList;
      self._voteCount = voteCount;
      self._resultBody = resultBody;
    }

    function updateWordUI() {
      wordDisplayEl.textContent = myWord;
      roleDisplayEl.textContent = '\u4F60\u662F: ' + myRole;
      roleDisplayEl.className = 'gh-spy-role ' + (isSpy ? 'gh-spy-role-spy' : 'gh-spy-role-civilian');
    }

    function setPhase(text) {
      phaseEl.textContent = text;
    }

    function showWordSection(show) {
      wordSection.style.display = show ? '' : 'none';
    }

    function showVoteSection(show) {
      voteSection.style.display = show ? '' : 'none';
    }

    function showResultSection(show) {
      resultSection.style.display = show ? '' : 'none';
    }

    function renderVoteButtons() {
      var list = self._voteList;
      var count = self._voteCount;
      list.innerHTML = '';
      var alive = getAlive();

      for (var i = 0; i < alive.length; i++) {
        var p = alive[i];
        if (p.uid === myUid) continue; // 不能投自己
        if (eliminated[p.uid]) continue;

        var btn = document.createElement('button');
        btn.className = 'gh-spy-vote-btn';
        btn.innerHTML = '<span class="gh-spy-vote-icon">\uD83D\uDC64</span> ' + (p.name || p.uid);
        btn.addEventListener('click', (function (targetUid) {
          return function () { submitVote(targetUid); };
        })(p.uid));
        list.appendChild(btn);
      }

      if (list.children.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:#888;padding:8px">\u6CA1\u6709\u53EF\u6295\u7968\u7684\u73A9\u5BB6</div>';
      }

      count.textContent = '';
    }

    function renderResult(msg) {
      var body = self._resultBody;
      var html = '';

      if (msg.votedOut) {
        var roleLabel = msg.votedOut.role === '\u5367\u5E95' ? '\u5367\u5E95' : '\u5E73\u6C11';
        var cls = msg.votedOut.role === '\u5367\u5E95' ? 'gh-spy-reveal-spy' : 'gh-spy-reveal-civilian';
        html += '<div class="gh-spy-reveal ' + cls + '">';
        html += '<span class="gh-spy-reveal-text">' + (msg.votedOut.name || msg.votedOut.uid) + '</span> \u88AB\u6295\u51FA\uFF0C\u8EAB\u4EFD\u662F <strong>' + roleLabel + '</strong>';
        html += '</div>';
      }

      if (msg.votes) {
        html += '<div style="font-size:12px;color:#888;margin:6px 0">\u7968\u6570\u7EDF\u8BA1:</div>';
        for (var uid in msg.votes) {
          if (msg.votes.hasOwnProperty(uid)) {
            var name = uid;
            for (var v = 0; v < players.length; v++) {
              if (players[v].uid === uid) { name = players[v].name; break; }
            }
            html += '<div class="gh-spy-result-item' + (msg.votedOut && msg.votedOut.uid === uid ? ' gh-spy-result-out' : ' gh-spy-result-safe') + '">';
            html += '<div class="gh-spy-result-name">' + name + '</div>';
            html += '<div class="gh-spy-result-role">' + msg.votes[uid] + ' \u7968</div></div>';
          }
        }
      }

      // 如果投票信息在 eliminated 数组中，显示所有被淘汰者
      if (msg.eliminated && msg.eliminated.length > 0) {
        html += '<div style="font-size:12px;color:#888;margin:6px 0">\u5DF2\u51FA\u5C40:</div>';
        for (var e = 0; e < msg.eliminated.length; e++) {
          var elim = msg.eliminated[e];
          html += '<div class="gh-spy-result-item gh-spy-result-out">';
          html += '<div class="gh-spy-result-name">' + (elim.name || elim.uid) + '</div>';
          html += '<div class="gh-spy-result-role">' + elim.role + '</div></div>';
        }
      }

      body.innerHTML = html;

      // 如果游戏未结束，添加"下一轮"按钮
      if (!msg.gameOver) {
        var nextBtn = document.createElement('button');
        nextBtn.className = 'gh-spy-next';
        nextBtn.textContent = '\u7B49\u5F85\u4E3B\u673A\u5F00\u59CB\u4E0B\u4E00\u8F6E...';
        nextBtn.disabled = true;
        body.appendChild(nextBtn);
      }
    }

    function showGameOver(msg) {
      var section = resultSection;
      var body = self._resultBody;
      section.style.display = '';
      var cls = msg.winner === '\u5E73\u6C11' ? 'gh-spy-game-over-civilian' : 'gh-spy-game-over-spy';
      var t = msg.winner === '\u5E73\u6C11' ? '\u5E73\u6C11\u65B9\u83B7\u80DC\uFF01\uD83C\uDFC6' : '\u5367\u5E95\u65B9\u83B7\u80DC\uFF01\uD83C\uDFC6';
      var d = '';

      if (msg.spyReveal && msg.spyReveal.length > 0) {
        var spyNames = [];
        for (var i = 0; i < msg.spyReveal.length; i++) {
          spyNames.push(msg.spyReveal[i].name || msg.spyReveal[i].uid);
        }
        d = '\u5367\u5E95: ' + spyNames.join(', ');
      }

      body.innerHTML =
        '<div class="gh-spy-game-over ' + cls + '">' +
        '<div class="gh-spy-go-t">' + t + '</div>' +
        '<div class="gh-spy-go-d">' + d + '</div>' +
        '</div>';

      if (wordSection) wordSection.style.display = 'none';
      voteSection.style.display = 'none';
      setPhase('\u6E38\u620F\u7ED3\u675F');
      closeBtn.style.display = '';
    }

    // ===== 投票 =====
    function submitVote(targetUid) {
      if (phase !== 'vote' || cleaned) return;

      if (IS_HOST) {
        // 主机本地处理自己的投票
        var count = self._voteCount;
        sendTo(hostUid, { type: 'spy_vote', payload: { targetUid: targetUid } });
        receiveVote(myUid, targetUid);
        count.textContent = '\u5DF2\u6295\u7968\uFF0C\u7B49\u5F85\u5176\u4ED6\u73A9\u5BB6...';
      } else {
        sendTo(hostUid, { type: 'spy_vote', payload: { targetUid: targetUid } });
        // 禁用所有投票按钮
        var btns = (self._voteList || document.getElementById('gh-spy-vote-list')).querySelectorAll('.gh-spy-vote-btn');
        for (var i = 0; i < btns.length; i++) btns[i].disabled = true;
        var count2 = self._voteCount;
        count2.textContent = '\u5DF2\u6295\u7968\uFF0C\u7B49\u5F85\u7ED3\u679C...';
      }
    }

    // ===== 主机：接收投票 =====
    function receiveVote(voterUid, targetUid) {
      if (phase !== 'vote') return;
      if (votes[voterUid]) return; // 去重

      // 验证目标是否存活
      if (eliminated[targetUid]) return;
      if (targetUid === voterUid) return; // 不能投自己
      if (targetUid === hostUid || voterUid === hostUid) {
        // 主机可以投别人，别人可以投主机
      }

      votes[voterUid] = targetUid;
      checkVoteComplete();
    }

    function checkVoteComplete() {
      var alive = getAlive();
      var votedCount = 0;
      for (var i = 0; i < alive.length; i++) {
        if (votes[alive[i].uid]) votedCount++;
      }

      // 本地更新票数显示
      var count = self._voteCount;
      if (count) count.textContent = '\u5DF2\u6536\u5230 ' + votedCount + '/' + alive.length + ' \u7968';

      if (votedCount >= alive.length) {
        // 所有人已投票，计票
        countVotes();
      }
    }

    function countVotes() {
      var tally = {};  // { uid: count }
      for (var voter in votes) {
        if (votes.hasOwnProperty(voter)) {
          var target = votes[voter];
          if (!tally[target]) tally[target] = 0;
          tally[target]++;
        }
      }

      // 找最高票
      var maxVotes = 0;
      var maxUid = null;
      for (var t in tally) {
        if (tally.hasOwnProperty(t) && tally[t] > maxVotes) {
          maxVotes = tally[t];
          maxUid = t;
        }
      }

      // 平局检查（如果有多个相同最高票，无人被投出）
      var tie = false;
      var tieCount = 0;
      for (var t2 in tally) {
        if (tally.hasOwnProperty(t2) && tally[t2] === maxVotes) tieCount++;
      }
      if (tieCount > 1) tie = true;

      var votedOutPlayer = null;
      if (!tie && maxUid) {
        // 标记被投出者
        eliminated[maxUid] = true;
        for (var pi = 0; pi < players.length; pi++) {
          if (players[pi].uid === maxUid) {
            var roleLabel = playerRoles[maxUid].isSpy ? '\u5367\u5E95' : '\u5E73\u6C11';
            votedOutPlayer = { uid: maxUid, name: players[pi].name, role: roleLabel };
            break;
          }
        }
      }

      // 构建消除列表
      var elimList = [];
      for (var uid2 in eliminated) {
        if (eliminated.hasOwnProperty(uid2) && eliminated[uid2]) {
          for (var pi2 = 0; pi2 < players.length; pi2++) {
            if (players[pi2].uid === uid2) {
              var rl = playerRoles[uid2].isSpy ? '\u5367\u5E95' : '\u5E73\u6C11';
              elimList.push({ uid: uid2, name: players[pi2].name, role: rl });
              break;
            }
          }
        }
      }

      // 检查游戏结束条件
      var spyCount = getAliveSpyCount();
      var civilianCount = getAliveCivilianCount();
      var gameOver = false;
      var winner = '';

      if (spyCount === 0) {
        gameOver = true;
        winner = '\u5E73\u6C11';
      } else if (spyCount >= civilianCount) {
        gameOver = true;
        winner = '\u5367\u5E95';
      }

      // 构建 spyReveal
      var spyReveal = [];
      for (var si = 0; si < players.length; si++) {
        if (playerRoles[players[si].uid].isSpy) {
          spyReveal.push({ uid: players[si].uid, name: players[si].name });
        }
      }

      // 发送结果给所有玩家
      var resultMsg = {
        type: 'spy_state',
        action: 'vote_result',
        votedOut: votedOutPlayer,
        tie: tie,
        votes: tally,
        eliminated: elimList,
        gameOver: gameOver,
      };

      var stateMsg = {
        type: 'spy_state',
        action: 'game_over',
        winner: winner,
        spyReveal: spyReveal,
      };

      for (var i2 = 0; i2 < players.length; i2++) {
        var puid = players[i2].uid;
        if (puid === myUid) {
          // 主机本地显示
          phase = gameOver ? 'over' : 'result';
          showVoteSection(false);
          if (gameOver) {
            over = true;
            showGameOver(stateMsg);
          } else {
            renderResult(resultMsg);
            showResultSection(true);
            setPhase('\u672C\u8F6E\u7ED3\u679F');
          }
        } else {
          if (gameOver) {
            sendTo(puid, stateMsg);
          } else {
            sendTo(puid, resultMsg);
          }
        }
      }

      if (!gameOver) {
        // 游戏未结束，继续下一轮
        // 为下一轮做准备，添加"继续"按钮
        var nextBtn2 = document.createElement('button');
        nextBtn2.className = 'gh-spy-next';
        nextBtn2.textContent = '\u7EE7\u7EED\u4E0B\u4E00\u8F6E \u2192';
        nextBtn2.addEventListener('click', function () {
          startVotePhase();
        });
        var rb = self._resultBody;
        // 移除旧的继续按钮
        var oldBtn = rb.querySelector('.gh-spy-next');
        if (oldBtn) oldBtn.parentNode.removeChild(oldBtn);
        rb.appendChild(nextBtn2);
      } else {
        closeBtn.style.display = '';
      }

      // 清空投票记录
      votes = {};
    }

    // ===== 主机：开始投票阶段 =====
    function startVotePhase() {
      phase = 'vote';
      round++;

      showVoteSection(true);
      showResultSection(false);
      setPhase('\u6295\u7968\u9636\u6BB5 (\u7B2C' + round + '\u8F6E) - \u8BF7\u9009\u62E9\u8981\u6295\u51FA\u7684\u4EBA');

      var alive = getAlive();
      var playerList = [];
      for (var i = 0; i < alive.length; i++) {
        playerList.push({ uid: alive[i].uid, name: alive[i].name });
      }

      // 通知所有玩家开始投票
      for (var i2 = 0; i2 < players.length; i2++) {
        var puid = players[i2].uid;
        if (puid === myUid) {
          self._voteCount.textContent = '\u7B49\u5F85\u6295\u7968...';
          renderVoteButtons();
        } else {
          sendTo(puid, {
            type: 'spy_state',
            action: 'vote_phase',
            round: round,
            players: playerList,
          });
        }
      }

      votes = {};

      // 主机可以投票
    }

    // ===== 主机初始化 =====
    function hostInit() {
      // 计算卧底数量
      var total = players.length;
      var spyCount = total <= 5 ? 1 : 2;

      // 随机选词
      var pairIdx = randomInt(WORD_PAIRS.length);
      var civilianWord = WORD_PAIRS[pairIdx][0];
      var spyWord = WORD_PAIRS[pairIdx][1];

      // 随机分配卧底
      var indices = [];
      for (var i = 0; i < total; i++) indices.push(i);
      shuffleArr(indices);
      var spyIndices = {};
      for (var si = 0; si < spyCount; si++) {
        spyIndices[indices[si]] = true;
      }

      // 分配角色和词
      spyUids = [];
      for (var pi = 0; pi < players.length; pi++) {
        var uid = players[pi].uid;
        var isSpyPlayer = !!spyIndices[pi];
        var word = isSpyPlayer ? spyWord : civilianWord;
        playerRoles[uid] = { isSpy: isSpyPlayer, word: word };
        if (isSpyPlayer) spyUids.push(uid);
      }

      // 私密发词
      for (var pi2 = 0; pi2 < players.length; pi2++) {
        var puid2 = players[pi2].uid;
        var role = playerRoles[puid2];
        var roleLabel = role.isSpy ? '\u5367\u5E95' : '\u5E73\u6C11';

        if (puid2 === myUid) {
          myWord = role.word;
          myRole = roleLabel;
          isSpy = role.isSpy;
          updateWordUI();
          setPhase('\u8BCD\u8BED\u5DF2\u53D1\u9001\uFF0C\u8BF7\u81EA\u7531\u8BA8\u8BBA');
        } else {
          sendTo(puid2, {
            type: 'spy_state',
            action: 'word_assigned',
            word: role.word,
            role: roleLabel,
            isSpy: role.isSpy,
          });
        }
      }
    }

    // ===== 初始化 =====
    function init() {
      buildUI();
      showVoteSection(false);
      showResultSection(false);

      if (IS_HOST) {
        phase = 'discuss';
        hostInit();
      } else {
        setPhase('\u6B63\u5728\u7B49\u5F85\u5206\u914D\u8BCD\u8BED...');
      }
    }

    // ===== 清理 =====
    this.cleanup = function () {
      if (cleaned) return;
      cleaned = true;
      over = true;
      core.onData(null);
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if (ui && ui.showToast) ui.showToast('\u8C01\u662F\u5367\u5E95\u5DF2\u7ED3\u675F', false);
      if (_inst === self) _inst = null;
    };

    init();
  }
})();
