(function () {
  'use strict';

  /* ==================== 去重保护 ==================== */
  if (window.__gamehubBlackjackInstalled) return;
  window.__gamehubBlackjackInstalled = true;

  /* ==================== 工具函数 ==================== */
  var SUITS = ['♠', '♥', '♦', '♣'];
  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var FACE = { J: 10, Q: 10, K: 10 };

  // svg-cards CDN (LGPL-2.1)
  var SVG_CARDS_CDN = 'https://cdn.jsdelivr.net/npm/svg-cards@4.0.0/svg-cards.svg';
  var SVG_SUIT_MAP = { '♠': 'spade', '♥': 'heart', '♦': 'diamond', '♣': 'club' };
  var SVG_RANK_MAP = { 'A': '1', 'J': 'jack', 'Q': 'queen', 'K': 'king' };

  function createDeck() {
    var deck = [];
    for (var i = 0; i < SUITS.length; i++) {
      for (var j = 0; j < RANKS.length; j++) {
        deck.push({ suit: SUITS[i], rank: RANKS[j] });
      }
    }
    return deck;
  }

  function shuffle(d) {
    for (var i = d.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }

  function cardVal(rank) {
    if (rank === 'A') return 11;
    if (FACE[rank]) return FACE[rank];
    return parseInt(rank, 10);
  }

  function calcScore(cards) {
    var s = 0, aces = 0;
    for (var i = 0; i < cards.length; i++) {
      var v = cardVal(cards[i].rank);
      s += v;
      if (cards[i].rank === 'A') aces++;
    }
    while (s > 21 && aces > 0) { s -= 10; aces--; }
    return s;
  }

  function cardHTML(card, hidden) {
    if (hidden) {
      return '<span class="gh-bj-card" style="overflow:hidden;padding:0;background:transparent">' +
        '<svg width="40" height="52" viewBox="0 0 169.075 244.64" style="display:block">' +
        '<use href="' + SVG_CARDS_CDN + '#back"/>' +
        '</svg></span>';
    }
    var suit = SVG_SUIT_MAP[card.suit] || 'spade';
    var rank = SVG_RANK_MAP[card.rank] || card.rank;
    var cardId = suit + '_' + rank;
    return '<span class="gh-bj-card" style="overflow:hidden;padding:0;background:transparent">' +
      '<svg width="40" height="52" viewBox="0 0 169.075 244.64" style="display:block">' +
      '<use href="' + SVG_CARDS_CDN + '#' + cardId + '"/>' +
      '</svg></span>';
  }

  /* ==================== CSS ==================== */
  var CSS_ID = 'gh-bj-css';
  function injectCSS() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent = [
      '.gh-bj-wrap{position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483645;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center}',
      '.gh-bj-panel{background:rgba(22,22,34,0.96);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px 28px;min-width:340px;max-width:440px;color:#eee;font-family:sans-serif;box-shadow:0 8px 40px rgba(0,0,0,0.7)}',
      '.gh-bj-panel .gh-bj-title{font-size:20px;font-weight:700;text-align:center;margin-bottom:18px;color:#f6a}',
      '.gh-bj-sec{margin-bottom:14px}',
      '.gh-bj-sec-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px}',
      '.gh-bj-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.gh-bj-card{display:inline-flex;align-items:center;justify-content:center;min-width:40px;height:52px;padding:4px 8px;border-radius:8px;background:#f5f5f5;font-size:15px;font-weight:700;color:#222;box-shadow:0 2px 6px rgba(0,0,0,0.3)}',
      '.gh-bj-back{background:rgba(255,102,170,0.2);color:#f6a;font-size:20px}',
      '.gh-bj-red{color:#d32f2f}',
      '.gh-bj-score{font-size:14px;font-weight:700;color:#f6a;margin-left:6px}',
      '.gh-bj-info{font-size:12px;color:#999;margin-left:8px}',
      '.gh-bj-actions{display:flex;gap:10px;margin:12px 0 8px}',
      '.gh-bj-btn{flex:1;padding:10px;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;transition:.2s}',
      '.gh-bj-btn:disabled{opacity:.35;cursor:not-allowed}',
      '.gh-bj-btn-hit{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}',
      '.gh-bj-btn-hit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 4px 16px rgba(102,126,234,.4)}',
      '.gh-bj-btn-stand{background:linear-gradient(135deg,#f093fb,#f5576c);color:#fff}',
      '.gh-bj-btn-stand:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 4px 16px rgba(245,87,108,.4)}',
      '.gh-bj-status{text-align:center;padding:10px 12px;border-radius:8px;background:rgba(255,255,255,.04);font-size:13px;color:#bbb;margin-top:6px}',
      '.gh-bj-res{text-align:center;padding:14px;border-radius:10px;margin-top:10px}',
      '.gh-bj-res-win{background:rgba(80,220,140,.12);border:1px solid rgba(80,220,140,.25)}',
      '.gh-bj-res-lose{background:rgba(220,80,80,.12);border:1px solid rgba(220,80,80,.25)}',
      '.gh-bj-res-push{background:rgba(255,180,60,.12);border:1px solid rgba(255,180,60,.25)}',
      '.gh-bj-res-t{font-size:17px;font-weight:700;margin-bottom:2px}',
      '.gh-bj-res-win .gh-bj-res-t{color:#6edb9e}',
      '.gh-bj-res-lose .gh-bj-res-t{color:#e74c3c}',
      '.gh-bj-res-push .gh-bj-res-t{color:#f0b34b}',
      '.gh-bj-res-d{font-size:12px;color:#aaa}',
      '.gh-bj-opp{font-size:12px;color:#888;margin-top:6px;text-align:center}',
      '.gh-bj-close{display:block;margin:14px auto 0;padding:8px 28px;border:none;border-radius:8px;background:rgba(255,255,255,.08);color:#ddd;font-size:13px;cursor:pointer}',
      '.gh-bj-close:hover{background:rgba(255,255,255,.15)}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ==================== 游戏主模块 ==================== */
  window.GameModules = window.GameModules || {};

  var _inst = null;

  window.GameModules['blackjack'] = {
    start: function (cfg) {
      if (_inst) _inst.cleanup();
      _inst = new Blackjack(cfg);
    },
    cleanup: function () {
      if (_inst) { _inst.cleanup(); _inst = null; }
    },
  };

  /* ==================== Blackjack 实现 ==================== */
  function Blackjack(cfg) {
    var self = this;
    var players = cfg.players;
    var myIdx = cfg.myIndex;
    var core = cfg.core;
    var ui = cfg.ui;
    var IS_HOST = (myIdx === 0);
    var myUid = core.getMyUid();
    var hostUid = players[0].uid;

    // 找到对手
    var otherUid = null, otherName = '';
    for (var k = 0; k < players.length; k++) {
      if (players[k].uid !== myUid) { otherUid = players[k].uid; otherName = players[k].name; break; }
    }

    // 游戏状态
    var deck = [];
    var hands = {};         // { uid: [{suit,rank}] }
    var dHand = [];         // dealer
    var scores = {};
    var busted = {};
    var stood = {};
    var turnIdx = 0;
    var over = false;
    var cleaned = false;
    var dScore = 0;

    // DOM
    var wrap, panel, dealerRow, dealerScore, playerRow, playerScore;
    var hitBtn, standBtn, statusEl, resEl, oppEl, closeBtn;

    // ===== 构建 UI =====
    function buildUI() {
      injectCSS();
      wrap = document.createElement('div');
      wrap.className = 'gh-bj-wrap';
      panel = document.createElement('div');
      panel.className = 'gh-bj-panel';
      panel.innerHTML = [
        '<div class="gh-bj-title">\uD83C\uDCCF 21\u70B9\u5BF9\u8D4C</div>',
        '<div class="gh-bj-sec"><div class="gh-bj-sec-label">\u5E84\u5BB6</div><div class="gh-bj-row" id="gh-bj-dr"></div><span class="gh-bj-score" id="gh-bj-ds"></span></div>',
        '<div class="gh-bj-sec"><div class="gh-bj-sec-label">\u4F60\u7684\u624B\u724C</div><div class="gh-bj-row" id="gh-bj-pr"></div><span class="gh-bj-score" id="gh-bj-ps"></span></div>',
        '<div class="gh-bj-actions" id="gh-bj-acts" style="display:none"><button class="gh-bj-btn gh-bj-btn-hit" id="gh-bj-hit">\u8981\u724C</button><button class="gh-bj-btn gh-bj-btn-stand" id="gh-bj-st">\u505C\u724C</button></div>',
        '<div class="gh-bj-status" id="gh-bj-sts"></div>',
        '<div id="gh-bj-res"></div>',
        '<div class="gh-bj-opp" id="gh-bj-opp"></div>',
        '<button class="gh-bj-close" id="gh-bj-close" style="display:none">\u5173\u95ED</button>',
      ].join('');
      wrap.appendChild(panel);
      document.body.appendChild(wrap);

      dealerRow = document.getElementById('gh-bj-dr');
      dealerScore = document.getElementById('gh-bj-ds');
      playerRow = document.getElementById('gh-bj-pr');
      playerScore = document.getElementById('gh-bj-ps');
      hitBtn = document.getElementById('gh-bj-hit');
      standBtn = document.getElementById('gh-bj-st');
      statusEl = document.getElementById('gh-bj-sts');
      resEl = document.getElementById('gh-bj-res');
      oppEl = document.getElementById('gh-bj-opp');
      closeBtn = document.getElementById('gh-bj-close');

      hitBtn.addEventListener('click', function () { doAction('hit'); });
      standBtn.addEventListener('click', function () { doAction('stand'); });
      closeBtn.addEventListener('click', function () { self.cleanup(); });
      wrap.addEventListener('click', function (e) { if (e.target === wrap && over) self.cleanup(); });
    }

    function refreshDealer(showAll) {
      var html = '';
      for (var i = 0; i < dHand.length; i++) {
        html += cardHTML(dHand[i], !showAll && i === 1);
      }
      dealerRow.innerHTML = html;
      dealerScore.textContent = showAll ? ('' + dScore) : (calcScore([dHand[0]]) + ' + ?');
    }

    function refreshPlayer(uid) {
      var h = hands[uid] || [];
      var html = '';
      for (var i = 0; i < h.length; i++) html += cardHTML(h[i], false);
      playerRow.innerHTML = html;
      playerScore.textContent = '' + (scores[uid] || 0) + (busted[uid] ? ' \u8D85\u70B9' : '');
    }

    function showActions(show) {
      document.getElementById('gh-bj-acts').style.display = show ? '' : 'none';
    }

    function setStatus(msg) {
      statusEl.textContent = msg || '';
    }

    function setOpponentInfo(msg) {
      oppEl.textContent = msg || '';
    }

    // ===== 通信 =====
    function sendTo(uid, data) {
      core.sendToUid(uid, data);
    }

    function sendState(uid, action, extra) {
      var msg = { type: 'bj_state', action: action };
      for (var x in extra) { if (extra.hasOwnProperty(x)) msg[x] = extra[x]; }
      sendTo(uid, msg);
    }

    // ===== 数据接收 =====
    var dataHandler = function (uid, data) {
      if (cleaned || over) return;
      if (!data || !data.type) return;

      if (IS_HOST && data.type === 'bj_action' && uid === otherUid) {
        var act = data.payload;
        if (act && (act.action === 'hit' || act.action === 'stand')) {
          processAction(uid, act.action);
        }
      }

      if (!IS_HOST && data.type === 'bj_state') {
        handleState(data);
      }
    };

    core.onData(dataHandler);

    // ===== 状态处理（非主机） =====
    function handleState(msg) {
      switch (msg.action) {
        case 'dealt':
          hands[myUid] = msg.hand || [];
          scores[myUid] = msg.score || 0;
          dHand = msg.dealerUpCard ? [msg.dealerUpCard, { suit: '?', rank: '?' }] : [];
          refreshDealer(false);
          refreshPlayer(myUid);
          setStatus('\u6E38\u620F\u5F00\u59CB\uFF0C\u7B49\u5F85\u5BF9\u624B\u64CD\u4F5C...');
          break;
        case 'your_turn':
          showActions(true);
          setStatus('\u8F6E\u5230\u4F60\u4E86\uFF0C\u8BF7\u9009\u62E9\u64CD\u4F5C');
          break;
        case 'hit_result':
          hands[myUid] = msg.hand || [];
          scores[myUid] = msg.score || 0;
          refreshPlayer(myUid);
          if (msg.bust) {
            showActions(false);
            setStatus('\u8D85\u70B9\u4E86\uFF01\u7B49\u5F85\u5BF9\u624B\u7ED3\u675F...');
          } else {
            setStatus('\u7EE7\u7EED\u9009\u62E9');
          }
          break;
        case 'stand_ack':
          showActions(false);
          setStatus('\u5DF2\u505C\u724C\uFF0C\u7B49\u5F85\u5BF9\u624B\u7ED3\u675F...');
          break;
        case 'dealer_turn':
          setStatus('\u5E84\u5BB6\u6B63\u5728\u53D1\u724C...');
          break;
        case 'waiting':
          showActions(false);
          setStatus(msg.message || '\u7B49\u5F85\u4E2D...');
          break;
        case 'over':
          over = true;
          showActions(false);
          dHand = msg.dealerHand || [];
          dScore = msg.dealerScore || 0;
          refreshDealer(true);
          refreshPlayer(myUid);
          showResult(msg);
          break;
      }
    }

    function showResult(msg) {
      var cls = 'gh-bj-res-' + msg.result;
      var txt = '';
      if (msg.result === 'win') txt = '\u4F60\u8D62\u4E86\uFF01';
      else if (msg.result === 'lose') txt = '\u4F60\u8F93\u4E86';
      else txt = '\u5E73\u5C40';
      resEl.className = 'gh-bj-res ' + cls;
      resEl.innerHTML = '<div class="gh-bj-res-t">' + txt + '</div><div class="gh-bj-res-d">' +
        msg.resultDetail + '</div>';
      closeBtn.style.display = '';
      setOpponentInfo('\u5BF9\u624B ' + otherName + ': ' + msg.opponentDetail);
    }

    // ===== 主机逻辑 =====
    function dealInitial() {
      deck = shuffle(createDeck());
      dHand = [deck.pop(), deck.pop()];
      dScore = calcScore(dHand);

      for (var i = 0; i < players.length; i++) {
        var uid = players[i].uid;
        hands[uid] = [deck.pop(), deck.pop()];
        scores[uid] = calcScore(hands[uid]);
        busted[uid] = false;
        stood[uid] = false;

        if (uid === myUid) {
          refreshDealer(false);
          refreshPlayer(myUid);
        } else {
          sendState(uid, 'dealt', {
            hand: hands[uid].slice(),
            score: scores[uid],
            dealerUpCard: dHand[0],
          });
        }
      }
    }

    function processAction(uid, action) {
      if (over) return;
      var hand = hands[uid];

      if (action === 'hit') {
        var card = deck.pop();
        hand.push(card);
        var sc = calcScore(hand);
        scores[uid] = sc;

        if (uid === myUid) {
          refreshPlayer(myUid);
          if (sc > 21) {
            busted[uid] = true;
            setStatus('\u4F60\u8D85\u70B9\u4E86\uFF01');
            showActions(false);
            advanceTurn();
          } else {
            setStatus('\u7EE7\u7EED\u9009\u62E9');
          }
        } else {
          sendState(uid, 'hit_result', { hand: hand.slice(), score: sc, card: card, bust: sc > 21 });
          if (sc > 21) {
            busted[uid] = true;
            advanceTurn();
          } else {
            // 继续该玩家的回合
            sendState(uid, 'your_turn', {});
          }
        }
      } else if (action === 'stand') {
        stood[uid] = true;
        if (uid === myUid) {
          showActions(false);
          setStatus('\u4F60\u5DF2\u505C\u724C');
        } else {
          sendState(uid, 'stand_ack', {});
        }
        advanceTurn();
      }
    }

    function advanceTurn() {
      // 检查是否全部完成
      var allDone = true;
      for (var i = 0; i < players.length; i++) {
        var uid = players[i].uid;
        if (!stood[uid] && !busted[uid]) { allDone = false; break; }
      }

      if (allDone) {
        dealerPlay();
        return;
      }

      // 找下一个未完成的玩家
      var nextIdx = (turnIdx + 1) % players.length;
      var tries = 0;
      while (tries < players.length) {
        var uid2 = players[nextIdx].uid;
        if (!stood[uid2] && !busted[uid2]) {
          turnIdx = nextIdx;
          if (nextIdx === myIdx) {
            showActions(true);
            setStatus('\u8F6E\u5230\u4F60\u4E86\uFF0C\u8BF7\u9009\u62E9\u64CD\u4F5C');
            sendState(otherUid, 'waiting', { message: '\u7B49\u5F85 ' + players[myIdx].name + ' \u64CD\u4F5C...' });
          } else {
            showActions(false);
            setStatus('\u7B49\u5F85 ' + otherName + ' \u64CD\u4F5C...');
            sendState(uid2, 'your_turn', {});
          }
          return;
        }
        nextIdx = (nextIdx + 1) % players.length;
        tries++;
      }

      // 安全兜底
      dealerPlay();
    }

    function dealerPlay() {
      // 揭示庄家手牌
      setStatus('\u5E84\u5BB6\u53D1\u724C\u4E2D...');
      dScore = calcScore(dHand);

      // 庄家规则：16点及以下必须要牌，17点及以上停牌
      while (dScore < 17) {
        dHand.push(deck.pop());
        dScore = calcScore(dHand);
      }

      refreshDealer(true);

      // 判断结果
      for (var i = 0; i < players.length; i++) {
        var uid = players[i].uid;
        var pScore = scores[uid];
        var res = judgeResult(pScore, dScore);
        var detail = '\u4F60: ' + pScore + ' \u70B9 | \u5E84\u5BB6: ' + dScore + ' \u70B9';
        var oppDetail = players[i === 0 ? 1 : 0].name + ': ' + (scores[players[i === 0 ? 1 : 0].uid] || 0) + ' \u70B9';

        if (uid === myUid) {
          var cls2 = 'gh-bj-res-' + res;
          var txt2 = '';
          if (res === 'win') txt2 = '\u4F60\u8D62\u4E86\uFF01';
          else if (res === 'lose') txt2 = '\u4F60\u8F93\u4E86';
          else txt2 = '\u5E73\u5C40';
          resEl.className = 'gh-bj-res ' + cls2;
          resEl.innerHTML = '<div class="gh-bj-res-t">' + txt2 + '</div><div class="gh-bj-res-d">' + detail + '</div>';
          closeBtn.style.display = '';
          setOpponentInfo('\u5BF9\u624B ' + otherName + ': ' + oppDetail);
        } else {
          sendState(uid, 'over', {
            result: res,
            resultDetail: detail,
            opponentDetail: oppDetail,
            playerScore: pScore,
            dealerScore: dScore,
            dealerHand: dHand.slice(),
          });
        }
      }

      over = true;
    }

    function judgeResult(pScore, dScore) {
      if (pScore > 21) return 'lose';
      if (dScore > 21) return 'win';
      if (pScore > dScore) return 'win';
      if (pScore < dScore) return 'lose';
      return 'push';
    }

    function doAction(action) {
      if (over || cleaned) return;

      if (IS_HOST) {
        processAction(myUid, action);
      } else {
        sendTo(hostUid, { type: 'bj_action', payload: { action: action } });
        showActions(false);
        if (action === 'hit') setStatus('\u5DF2\u8981\u724C\uFF0C\u7B49\u5F85\u7ED3\u679C...');
        else setStatus('\u5DF2\u505C\u724C\uFF0C\u7B49\u5F85\u5BF9\u624B\u7ED3\u675F...');
      }
    }

    // ===== 初始化 =====
    function init() {
      buildUI();

      if (IS_HOST) {
        dealInitial();
        // 主机先手
        turnIdx = 0;
        showActions(true);
        setStatus('\u6E38\u620F\u5F00\u59CB\uFF0C\u8F6E\u5230\u4F60\u4E86');
        // 通知对手等待（dealt 已在 dealInitial 中发送）
        if (otherUid) {
          sendState(otherUid, 'waiting', { message: '\u7B49\u5F85 ' + players[0].name + ' \u64CD\u4F5C...' });
        }
      } else {
        setStatus('\u6B63\u5728\u7B49\u5F85\u53D1\u724C...');
      }
    }

    // ===== 清理 =====
    this.cleanup = function () {
      if (cleaned) return;
      cleaned = true;
      over = true;
      core.onData(null);
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if (ui && ui.showToast) ui.showToast('\u21C2\u70B9\u5BF9\u8D4C\u5DF2\u7ED3\u675F', false);
      if (_inst === self) _inst = null;
    };

    init();
  }
})();
