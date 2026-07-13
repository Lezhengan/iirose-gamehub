/**
 * iirose 游戏大厅 — 单入口加载器
 * 包名: gamehub | 版本: 1.0.0
 *
 * 使用方式 (在 iirose JS 终端执行):
 *   (async()=>{
 *     var s=document.createElement('script');
 *     s.src='https://cdn.jsdelivr.net/gh/Lezhengan/iirose-gamehub@main/gamehub.js';
 *     document.head.appendChild(s);
 *   })();
 *
 * 说明: 自动加载 lib/core.js → lib/ui.js → lib/favicon.js → 游戏模块
 *       用户只需加载 gamehub.js 这一个文件
 */
(function () {
  // 如果已安装，清理旧状态重新初始化
  if (window.__ghAppInstalled) {
    console.log('[GameHub] 重新初始化...');
    // 清理全局实例，让 bootstrap 全部重建
    if (window.GhUI && window.GhUI.reinit) window.GhUI.reinit();
    if (window.GhCore && window.GhCore.cleanup) window.GhCore.cleanup();
    window.GhCore = null;
    window.GhUI = null;
    window.GhFavicon = null;
    // 走完整初始化流程
    bootstrap();
    return;
  }
  window.__ghAppInstalled = true;

  /* ==================== 解析 CDN 基路径 ==================== */
  var BASE = '';
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src || '';
    var idx = src.indexOf('/gamehub.js');
    if (idx !== -1) { BASE = src.substring(0, idx); break; }
  }
  // fallback: 如果从本地加载，用 GitHub raw
  if (!BASE) BASE = 'https://cdn.jsdelivr.net/gh/Lezhengan/iirose-gamehub@main';

  /* ==================== 依赖列表 ==================== */
  var DEPS = [
    { name: 'GhCore',    url: BASE + '/lib/core.js' },
    { name: 'GhUI',      url: BASE + '/lib/ui.js' },
    { name: 'GhFavicon', url: BASE + '/lib/favicon.js' },
  ];

  /* ==================== 游戏配置 ==================== */
  var ICON_BASE = 'https://cdn.jsdelivr.net/npm/feather-icons@4.29.2/dist/icons';

  var GAMES = [
    { id: 'gomoku',    imgUrl: ICON_BASE + '/grid.svg',           icon: '\u265F', name: '\u4E94\u5B50\u68CB',   players: '2\u4EBA',    desc: '\u4E94\u5B50\u8FDE\u73E0', state: 'idle' },
    { id: 'tictactoe', imgUrl: ICON_BASE + '/x.svg',              icon: '\u2B55', name: '\u4E95\u5B57\u68CB',   players: '2\u4EBA',    desc: '\u4E09\u8FDE\u5373\u80DC', state: 'idle' },
    { id: 'battleship',imgUrl: ICON_BASE + '/anchor.svg',         icon: '\uD83D\uDEA2', name: '\u6D77\u6218\u68CB',   players: '2\u4EBA',    desc: '\u51FB\u6C89\u654C\u8230', state: 'idle' },
    { id: 'memory',    imgUrl: ICON_BASE + '/layers.svg',         icon: '\uD83C\uDCCF', name: '\u7FFB\u7FFB\u4E50',   players: '2\u4EBA',    desc: '\u914D\u5BF9\u8BB0\u5FC6', state: 'idle' },
    { id: 'blackjack', imgUrl: ICON_BASE + '/dollar-sign.svg',    icon: '\uD83C\uDCCF', name: '21\u70B9\u5BF9\u8D4C', players: '2\u4EBA',    desc: '\u6BD4\u70B9\u6570',   state: 'idle' },
    { id: 'spy',       imgUrl: ICON_BASE + '/search.svg',         icon: '\uD83D\uDD75\uFE0F', name: '\u8C01\u662F\u5367\u5E95', players: '4-8\u4EBA',  desc: '\u627E\u51FA\u5367\u5E95', state: 'idle' },
    { id: 'werewolf',  imgUrl: ICON_BASE + '/moon.svg',           icon: '\uD83D\uDC3A', name: '\u72FC\u4EBA\u6740',   players: '4-10\u4EBA', desc: '\u7B80\u7248\u72FC\u4EBA\u6740', state: 'idle' },
    { id: 'drawguess', imgUrl: ICON_BASE + '/edit-3.svg',         icon: '\uD83C\uDFA8', name: '\u4F60\u753B\u6211\u731C', players: '2-6\u4EBA',  desc: '\u731C\u753B\u4F5C',  state: 'idle' },
    { id: 'bombcat',   imgUrl: ICON_BASE + '/alert-triangle.svg', icon: '\uD83D\uDCA3', name: '\u70B8\u5F39\u732B',   players: '2-5\u4EBA',  desc: '\u62C6\u5F39\u5BF9\u51B3', state: 'idle' },
    { id: 'uno',       imgUrl: ICON_BASE + '/sun.svg',            icon: '\uD83C\uDFAF', name: 'UNO',      players: '2-4\u4EBA',  desc: '\u51FA\u724C\u53D8\u8272', state: 'idle' },
  ];

  /* ==================== 依赖加载器 ==================== */
  var loaded = {};

  function loadScript(url, cb) {
    var s = document.createElement('script');
    s.src = url;
    s.onload = function () { cb(null); };
    s.onerror = function () { cb(new Error('加载失败: ' + url)); };
    document.head.appendChild(s);
  }

  function loadDeps(callback) {
    var pending = DEPS.length;
    var hasErr = false;

    DEPS.forEach(function (dep) {
      // 如果全局已有，直接跳过
      if (window[dep.name]) {
        loaded[dep.name] = true;
        pending--;
        if (pending === 0) callback(null);
        return;
      }
      loadScript(dep.url, function (err) {
        if (err) {
          if (!hasErr) { hasErr = true; callback(err); }
          return;
        }
        loaded[dep.name] = true;
        pending--;
        if (pending === 0) callback(null);
      });
    });
  }

  /* ==================== 初始化 ==================== */
  function init() {
    initRetries++;
    core = window.GhCore;
    ui = window.GhUI;

    if (!core || !ui) {
      if (initRetries >= MAX_INIT_RETRIES) {
        console.error('[GameHub] 依赖加载失败，已达最大重试次数 ' + MAX_INIT_RETRIES);
        return;
      }
      console.warn('[GameHub] 依赖加载中... (' + initRetries + '/' + MAX_INIT_RETRIES + ')');
      setTimeout(init, 1000);
      return;
    }

    core.init();

    // 注册匹配回调
    core.onMatchReady(function (gameId, players) {
      onMatchReady(gameId, players);
    });

    // 初始化 UI
    ui.init(GAMES, {
      onGameAction: function (gameId, state) {
        if (state === 'playing') return;
        if (activeGames[gameId]) {
          ui.showToast('\u8BE5\u6E38\u620F\u6B63\u5728\u8FDB\u884C\u4E2D', true);
          return;
        }
        joinMatch(gameId);
      },
    });

    // 劫持输入框命令
    setupCommandListener();

    console.log('[GameHub] \u6E38\u620F\u5927\u5385\u5DF2\u542F\u52A8');
    ui.showToast('\uD83C\uDFAE \u6E38\u620F\u5927\u5385\u5DF2\u542F\u52A8', false);
  }

  /* ==================== 状态 ==================== */
  var core = null;
  var ui = null;
  var gameModules = {};
  var activeGames = {};
  var initRetries = 0;
  var MAX_INIT_RETRIES = 5;

  function parsePlayerCount(str) {
    var nums = str.match(/\d+/g);
    if (!nums) return 2;
    return parseInt(nums[nums.length - 1], 10);
  }

  function getGameConfig(gameId) {
    for (var i = 0; i < GAMES.length; i++) {
      if (GAMES[i].id === gameId) return GAMES[i];
    }
    return null;
  }

  /* ==================== 匹配 ==================== */
  function joinMatch(gameId) {
    var game = getGameConfig(gameId);
    if (!game) return;
    if (activeGames[gameId]) {
      ui.showToast('\u8BE5\u6E38\u620F\u6B63\u5728\u8FDB\u884C\u4E2D', true);
      return;
    }
    var count = parsePlayerCount(game.players);
    var ok = core.joinMatch(gameId, count);
    if (!ok) {
      ui.showToast('\u5DF2\u5728 ' + game.name + ' \u5339\u914D\u961F\u5217\u4E2D', true);
      return;
    }
    game.state = 'waiting';
    ui.updateCardState(gameId, 'waiting');
    ui.showToast('\u5DF2\u52A0\u5165 ' + game.name + ' \u5339\u914D (' + game.players + ')', false);
  }

  function leaveMatch(gameId) {
    var ok = core.leaveMatch(gameId);
    if (!ok && !activeGames[gameId]) return;
    var game = getGameConfig(gameId);
    if (game) { game.state = 'idle'; ui.updateCardState(gameId, 'idle'); }
    if (activeGames[gameId]) {
      try { if (activeGames[gameId].module && activeGames[gameId].module.cleanup) activeGames[gameId].module.cleanup(); } catch (e) {}
      delete activeGames[gameId];
    }
    ui.showToast('\u5DF2\u9000\u51FA', false);
  }

  function onMatchReady(gameId, players) {
    var game = getGameConfig(gameId);
    if (!game) return;
    game.state = 'playing';
    ui.updateCardState(gameId, 'playing');

    loadGameModule(gameId, function (err, module) {
      if (err || !module) {
        console.error('[GameHub] \u52A0\u8F7D\u6E38\u620F\u6A21\u5757\u5931\u8D25:', gameId, err);
        ui.showToast('\u6E38\u620F\u6A21\u5757\u52A0\u8F7D\u5931\u8D25', true);
        game.state = 'idle';
        ui.updateCardState(gameId, 'idle');
        return;
      }
      var myUid = core.getMyUid();
      var playerList = [];
      for (var i = 0; i < players.length; i++) {
        playerList.push({ uid: players[i], name: players[i] });
      }
      var myIndex = -1;
      for (var j = 0; j < playerList.length; j++) {
        if (playerList[j].uid === myUid) { myIndex = j; break; }
      }
      var config = { players: playerList, myIndex: myIndex, core: core, ui: ui, gameId: gameId };
      activeGames[gameId] = { players: players, module: module, config: config };
      try {
        module.start(config);
        ui.showToast(game.name + ' \u5DF2\u5F00\u59CB\uFF01', false);
      } catch (e) {
        console.error('[GameHub] \u542F\u52A8\u6E38\u620F\u5931\u8D25:', gameId, e);
        ui.showToast('\u6E38\u620F\u542F\u52A8\u5931\u8D25', true);
        delete activeGames[gameId];
        game.state = 'idle';
        ui.updateCardState(gameId, 'idle');
      }
    });
  }

  /* ==================== 游戏模块加载 ==================== */
  function loadGameModule(gameId, callback) {
    if (gameModules[gameId]) { callback(null, gameModules[gameId]); return; }
    if (window.GameModules && window.GameModules[gameId]) {
      gameModules[gameId] = window.GameModules[gameId];
      callback(null, gameModules[gameId]);
      return;
    }
    // 使用完整 CDN 路径，非相对路径
    var url = BASE + '/games/' + gameId + '.js';
    var script = document.createElement('script');
    script.src = url;
    script.onload = function () {
      if (window.GameModules && window.GameModules[gameId]) {
        gameModules[gameId] = window.GameModules[gameId];
        callback(null, gameModules[gameId]);
      } else {
        callback(new Error('\u6A21\u5757\u672A\u6CE8\u518C'), null);
      }
    };
    script.onerror = function () { callback(new Error('\u52A0\u8F7D\u5931\u8D25: ' + url), null); };
    document.head.appendChild(script);
  }

  /* ==================== 命令监听 ==================== */
  function setupCommandListener() {
    var inputEl = document.getElementById('moveinput');
    if (!inputEl) { setTimeout(setupCommandListener, 500); return; }
    if (inputEl.__gh_hooked) return;
    inputEl.__gh_hooked = true;

    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        var text = inputEl.value.trim();
        if (text.indexOf('/gh ') === 0) {
          e.preventDefault();
          e.stopImmediatePropagation();
          handleCommand(text);
          inputEl.value = '';
        }
      }
    }, true);

    var btn = document.getElementsByClassName('moveinputSendBtn')[0];
    if (btn && !btn.__gh_hooked) {
      btn.__gh_hooked = true;
      btn.addEventListener('mousedown', function (e) {
        var text = inputEl.value.trim();
        if (text.indexOf('/gh ') === 0) {
          e.preventDefault();
          e.stopImmediatePropagation();
          handleCommand(text);
          inputEl.value = '';
        }
      }, true);
    }
  }

  function handleCommand(text) {
    var parts = text.slice(4).trim().split(/\s+/);
    var cmd = parts[0], arg = parts[1] || '';
    switch (cmd) {
      case 'join':
        if (arg) { joinMatch(arg); }
        else { ui.show(); }
        break;
      case 'quit':
        if (arg) { leaveMatch(arg); }
        else { for (var i = 0; i < GAMES.length; i++) leaveMatch(GAMES[i].id); }
        break;
      case 'list':
        var names = [];
        for (var j = 0; j < GAMES.length; j++) names.push(GAMES[j].name + '(' + GAMES[j].id + ')');
        ui.showToast('\uD83C\uDFAE ' + names.join(' / '), false);
        break;
      case 'help':
        ui.showToast('/gh join <id> \u52A0\u5165 | /gh quit <id> \u9000\u51FA | /gh list \u5217\u8868', false);
        break;
      default:
        ui.showToast('\u672A\u77E5\u547D\u4EE4: /gh ' + cmd, true);
    }
  }

  /* ==================== 启动流程 ==================== */
  function bootstrap() {
    // 第1步: 加载所有依赖
    loadDeps(function (err) {
      if (err) {
        console.error('[GameHub] 依赖加载失败:', err);
        return;
      }
      // 第2步: 等 DOM 就绪
      function waitDOM() {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 200); });
        } else {
          setTimeout(init, 200);
        }
      }
      waitDOM();
    });
  }

  bootstrap();

  /* ==================== 导出 ==================== */
  window.GhApp = {
    PKG: 'gamehub',
    GAMES: GAMES,
    joinMatch: joinMatch,
    leaveMatch: leaveMatch,
    getActiveGames: function () { return activeGames; },
  };

})();
