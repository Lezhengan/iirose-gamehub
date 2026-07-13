/**
 * iirose 游戏大厅 — 游戏图形资源注册表
 * 包名: gamehub
 * 版本: 1.0.0
 *
 * 所有资源均通过 jsdelivr CDN 加载，适配国内网络环境。
 * 资源来源及许可:
 *   - Feather Icons (MIT): https://github.com/feathericons/feather
 *   - Game Icons (CC BY 3.0): https://game-icons.net/
 *   - svg-cards (LGPL-2.1): https://github.com/htdebeer/SVG-cards
 *   - UnoCard (MIT-like): https://github.com/shiawasenahikari/UnoCard
 *   - Wikimedia Commons (CC0 / CC BY-SA)
 *
 * 用法: GhAssets.getIcon('gomoku') 返回 SVG/CDN 路径
 *       GhAssets.getUnoCard('r', '5') 返回 UNO 牌面 URL
 *       GhAssets.getPokerCard('ace', 'spades') 返回扑克牌 SVG 引用
 */
(function () {
  if (window.GhAssets) return;

  /* ==================== CDN 基础路径 ==================== */
  var CDN = {
    // Feather Icons — MIT 协议，无需署名
    // 图标列表: https://github.com/feathericons/feather/tree/main/icons
    FEATHER: 'https://cdn.jsdelivr.net/npm/feather-icons@4.29.2/dist/icons',

    // Game Icons — CC BY 3.0，需署名
    // 图标列表: https://github.com/game-icons/icons/tree/master/svg/delapouite
    GAME_ICONS: 'https://cdn.jsdelivr.net/gh/game-icons/icons@master/svg/delapouite',

    // svg-cards — LGPL-2.1
    SVG_CARDS: 'https://cdn.jsdelivr.net/npm/svg-cards@4.0.0/svg-cards.svg',

    // UnoCard — GitHub 仓库含预切割 PNG 卡牌
    UNO_CARDS: 'https://cdn.jsdelivr.net/gh/shiawasenahikari/UnoCard@master/UnoCard/resource',
  };

  /* ==================== 游戏图标映射 ==================== */
  // 所有游戏图标使用 Feather Icons (MIT)
  var GAME_ICONS = {
    gomoku:    CDN.FEATHER + '/grid.svg',
    tictactoe: CDN.FEATHER + '/x.svg',
    battleship: CDN.FEATHER + '/anchor.svg',
    memory:    CDN.FEATHER + '/layers.svg',
    blackjack: CDN.FEATHER + '/dollar-sign.svg',
    spy:       CDN.FEATHER + '/search.svg',
    werewolf:  CDN.FEATHER + '/moon.svg',
    drawguess: CDN.FEATHER + '/edit-3.svg',
    bombcat:   CDN.FEATHER + '/alert-triangle.svg',
    uno:       CDN.FEATHER + '/sun.svg',
  };

  /* ==================== 游戏内图形映射 ==================== */

  // 井字棋符号
  var TICTACTOE = {
    x: CDN.FEATHER + '/x.svg',
    o: CDN.FEATHER + '/circle.svg',
  };

  // 翻翻乐卡面图标（8 对配对的图案）
  var MEMORY_ICONS = [
    CDN.FEATHER + '/star.svg',
    CDN.FEATHER + '/heart.svg',
    CDN.FEATHER + '/moon.svg',
    CDN.FEATHER + '/sun.svg',
    CDN.FEATHER + '/gift.svg',
    CDN.FEATHER + '/zap.svg',
    CDN.FEATHER + '/bell.svg',
    CDN.FEATHER + '/music.svg',
  ];

  // 海战棋图标
  var BATTLESHIP = {
    ship:     CDN.FEATHER + '/anchor.svg',
    hit:      CDN.FEATHER + '/target.svg',
    miss:     CDN.FEATHER + '/crosshair.svg',
    water:    CDN.FEATHER + '/droplet.svg',
    explode:  CDN.FEATHER + '/zap-off.svg',
  };

  // 炸弹猫图标
  var BOMBCAT = {
    bomb:      CDN.FEATHER + '/alert-triangle.svg',
    cat:       CDN.FEATHER + '/github.svg',
    defuse:    CDN.FEATHER + '/shield.svg',
    skip:      CDN.FEATHER + '/skip-forward.svg',
    reverse:   CDN.FEATHER + '/rotate-ccw.svg',
    foresee:   CDN.FEATHER + '/eye.svg',
    shuffle:   CDN.FEATHER + '/shuffle.svg',
    explode:   CDN.FEATHER + '/zap.svg',
  };

  // 狼人杀角色图标 (Game Icons — CC BY 3.0)
  var WEREWOLF = {
    werewolf:  CDN.GAME_ICONS + '/werewolf.svg',
    wolfHead:  CDN.GAME_ICONS + '/wolf-head.svg',
    civilian:  CDN.GAME_ICONS + '/peasant.svg',
    seer:      CDN.GAME_ICONS + '/crystal-ball.svg',
    hunter:    CDN.GAME_ICONS + '/crossbow.svg',
    guard:     CDN.GAME_ICONS + '/shield.svg',
    witch:     CDN.GAME_ICONS + '/potion-ball.svg',
    necromancer: CDN.GAME_ICONS + '/dead-head.svg',
    crown:     CDN.GAME_ICONS + '/crown.svg',
    skull:     CDN.GAME_ICONS + '/skull.svg',
    knight:    CDN.GAME_ICONS + '/sword.svg',
  };

  // 谁是卧底/你画我猜 图标
  var PARTY = {
    spy:     CDN.FEATHER + '/search.svg',
    palette: CDN.FEATHER + '/edit-3.svg',
    brush:   CDN.FEATHER + '/edit-2.svg',
    users:   CDN.FEATHER + '/users.svg',
    message: CDN.FEATHER + '/message-square.svg',
    clock:   CDN.FEATHER + '/clock.svg',
    thumbsUp: CDN.FEATHER + '/thumbs-up.svg',
  };

  /* ==================== UNO 牌面映射 ==================== */
  // 颜色缩写映射: red→r, yellow→y, blue→b, green→g
  var UNO_COLOR_MAP = { red: 'r', yellow: 'y', blue: 'b', green: 'g' };
  // 数值映射: 0-9 → 0-9, skip → $, reverse → +, +2 → @
  var UNO_VALUE_MAP = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    'skip': '$', 'reverse': '+', '+2': '@',
  };

  /**
   * 获取 UNO 牌面图片 URL
   * @param {string} color - red/yellow/blue/green
   * @param {string} value - 0-9 / skip / reverse / +2
   * @param {boolean} [dark=false] - 是否使用暗色版本
   */
  function getUnoCard(color, value, dark) {
    var prefix = dark ? 'dark' : 'front';
    var c = UNO_COLOR_MAP[color] || color;
    var v = UNO_VALUE_MAP[value] || value;
    return CDN.UNO_CARDS + '/' + prefix + '_' + c + '' + v + '.png';
  }

  /**
   * 获取 UNO 万能牌图片 URL
   * @param {boolean} [draw4=false] - 是否 +4 版本
   * @param {boolean} [dark=false]
   */
  function getUnoWild(draw4, dark) {
    var prefix = dark ? 'dark' : 'front';
    var suffix = draw4 ? 'w+' : 'w';
    return CDN.UNO_CARDS + '/' + prefix + '_kw' + (draw4 ? '+' : '') + '.png';
  }

  /** 获取 UNO 牌背图片 URL */
  function getUnoBack() {
    return CDN.UNO_CARDS + '/back.png';
  }

  /* ==================== 扑克牌面映射 ==================== */
  // 使用 svg-cards (LGPL-2.1) — 通过 SVG <use> 引用
  // 牌名: {花色}_{点数} 例: spade_ace, heart_queen, club_10, diamond_jack
  var SUIT_MAP = {
    spades: 'spade', hearts: 'heart', clubs: 'club', diamonds: 'diamond',
  };
  var RANK_MAP = {
    'A': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
    '7': '7', '8': '8', '9': '9', '10': '10',
    'J': 'jack', 'Q': 'queen', 'K': 'king',
  };

  /**
   * 获取 svg-cards 中扑克牌的引用 ID
   * @param {string} rank - A/2-10/J/Q/K
   * @param {string} suit - spades/hearts/clubs/diamonds
   */
  function getPokerCardRef(rank, suit) {
    var s = SUIT_MAP[suit] || suit;
    var r = RANK_MAP[rank] || rank;
    return s + '_' + r;
  }

  /** 获取 svg-cards 的 SVG sprite URL */
  function getPokerSpriteUrl() {
    return CDN.SVG_CARDS;
  }

  /**
   * 生成扑克牌的 SVG <use> 标签 HTML
   * @param {string} rank
   * @param {string} suit
   * @param {number} [width=70]
   * @param {number} [height=100]
   */
  function getPokerCardHtml(rank, suit, width, height) {
    var ref = getPokerCardRef(rank, suit);
    var w = width || 70;
    var h = height || 100;
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 169.075 244.64">'
      + '<use href="' + CDN.SVG_CARDS + '#' + ref + '"/>'
      + '</svg>';
  }

  /** 扑克牌背 HTML */
  function getPokerBackHtml(width, height) {
    var w = width || 70;
    var h = height || 100;
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 169.075 244.64">'
      + '<use href="' + CDN.SVG_CARDS + '#back"/>'
      + '</svg>';
  }

  /* ==================== 工具函数 ==================== */

  /** 获取游戏图标 URL（用于游戏大厅卡片） */
  function getGameIcon(gameId) {
    return GAME_ICONS[gameId] || null;
  }

  /** 获取所有游戏图标映射 */
  function getAllGameIcons() {
    var result = {};
    for (var id in GAME_ICONS) {
      if (GAME_ICONS.hasOwnProperty(id)) {
        result[id] = GAME_ICONS[id];
      }
    }
    return result;
  }

  /** 用 Fetch API 加载 SVG 并注入到目标元素 */
  function loadSvgToElement(url, targetEl, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        targetEl.innerHTML = xhr.responseText;
        // 给内联 SVG 添加样式以便着色
        var svg = targetEl.querySelector('svg');
        if (svg) {
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
          svg.style.fill = 'currentColor';
        }
        if (callback) callback(null, targetEl);
      } else {
        if (callback) callback(new Error('加载失败: ' + url));
      }
    };
    xhr.onerror = function () {
      if (callback) callback(new Error('网络错误: ' + url));
    };
    xhr.send();
  }

  /* ==================== 导出 ==================== */
  var GhAssets = {
    // CDN 基础路径
    CDN: CDN,

    // 游戏图标
    getGameIcon: getGameIcon,
    getAllGameIcons: getAllGameIcons,

    // UNO 卡牌
    getUnoCard: getUnoCard,
    getUnoWild: getUnoWild,
    getUnoBack: getUnoBack,

    // 扑克牌
    getPokerCardRef: getPokerCardRef,
    getPokerSpriteUrl: getPokerSpriteUrl,
    getPokerCardHtml: getPokerCardHtml,
    getPokerBackHtml: getPokerBackHtml,

    // 游戏专用图标组
    icons: {
      tictactoe: TICTACTOE,
      memory: MEMORY_ICONS,
      battleship: BATTLESHIP,
      bombcat: BOMBCAT,
      werewolf: WEREWOLF,
      party: PARTY,
    },

    // 工具
    loadSvgToElement: loadSvgToElement,
  };

  window.GhAssets = GhAssets;
  console.log('[GhAssets] 已加载 ' + Object.keys(GAME_ICONS).length + ' 款游戏图标');
})();
