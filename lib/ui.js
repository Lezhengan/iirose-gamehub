/**
 * iirose 游戏大厅 — UI 组件
 * 包名: gamehub
 * 版本: 1.0.0
 *
 * 加载方式: 由 gamehub.js 动态加载 / 安装器注入
 * 导出: window.GhUI
 */
(function () {
  if (window.__ghUIInstalled) return;
  window.__ghUIInstalled = true;

  /* ---------- CSS 注入 ---------- */
  (function injectCSS() {
    if (document.getElementById('gh-stylesheet')) return;
    var link = document.createElement('link');
    link.id = 'gh-stylesheet';
    link.rel = 'stylesheet';
    // 尝试从脚本 path 推导
    var base = '';
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || '';
      var idx = src.indexOf('/lib/ui.js');
      if (idx !== -1) { base = src.substring(0, idx); break; }
    }
    link.href = base ? base + '/css/gamehub.css' : 'css/gamehub.css';
    document.head.appendChild(link);
  })();

  /* ---------- Toast 动画 ---------- */
  (function injectToastKeyframes() {
    if (document.getElementById('gh-toast-style')) return;
    var style = document.createElement('style');
    style.id = 'gh-toast-style';
    style.textContent = '@keyframes gh-toast-in{from{opacity:0;transform:translateY(-16px) scale(0.92)}to{opacity:1;transform:translateY(0) scale(1)}}';
    document.head.appendChild(style);
  })();

  /* ---------- 内部状态 ---------- */
  var cards = [];
  var callbacks = {};
  var cardElements = {};
  var isVisible = false;
  var dom = {};

  function ce(tag, cls) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  /* ---------- 侧边栏按钮 ---------- */
  function insertSidebarButton() {
    var groups = document.querySelectorAll('.functionButton.functionButtonGroup');
    for (var i = 0; i < groups.length; i++) {
      var label = groups[i].querySelector('.functionBtnFont');
      if (!label || label.textContent.trim() !== '\u5DE5\u5177') continue;
      var box = groups[i].nextElementSibling;
      if (!box || !box.classList.contains('functionItemBox')) continue;
      if (document.getElementById('gh-sidebar-btn')) return true;
      var button = document.createElement('div');
      button.className = 'functionButton';
      button.id = 'gh-sidebar-btn';
      button.innerHTML = '<span class="functionBtnIcon mdi-gamepad-variant-outline"></span><span class="functionBtnFont">\u6E38\u620F\u5927\u5385</span>';
      button.addEventListener('click', function () { toggle(); });
      box.insertBefore(button, box.children[1] || null);
      return true;
    }
    // 如果没找到"工具"分组，延迟重试
    setTimeout(insertSidebarButton, 2000);
    return false;
  }

  /* ---------- 创建 FAB ---------- */
  function createFAB() {
    var fab = ce('button', 'gh-fab');
    fab.textContent = '\uD83C\uDFAE';
    fab.title = '\u6E38\u620F\u5927\u5385';
    fab.addEventListener('click', function () { toggle(); });
    dom.fab = fab;
    document.body.appendChild(fab);
  }

  /* ---------- 创建面板 ---------- */
  function createPanel() {
    var panel = ce('div', 'gh-panel');

    var header = ce('div', 'gh-header');
    var titleEl = ce('span', 'gh-header-title');
    titleEl.textContent = '\uD83C\uDFAE \u6E38\u620F\u5927\u5385';
    var closeBtn = ce('button', 'gh-header-close');
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', function () { hide(); });
    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    var body = ce('div', 'gh-body');
    var grid = ce('div', 'gh-grid');
    body.appendChild(grid);

    var divider = ce('hr', 'gh-divider');
    var queueTitle = ce('div', 'gh-flex-between');
    var queueLabel = ce('span', '');
    queueLabel.textContent = '\u231B \u5339\u914D\u961F\u5217';
    queueLabel.style.cssText = 'font-size:14px;font-weight:600;color:#fff;';
    var queueCount = ce('span', 'gh-text-muted');
    queueCount.textContent = '0 \u4EBA\u7B49\u5F85';
    queueCount.style.fontSize = '12px';
    queueTitle.appendChild(queueLabel);
    queueTitle.appendChild(queueCount);
    var queueContainer = ce('ul', 'gh-queue');
    var empty = ce('div', 'gh-empty');
    empty.innerHTML = '<div class="gh-empty-icon">\uD83C\uDFAE</div><div>\u6682\u65E0\u5339\u914D\u961F\u5217</div>';

    body.appendChild(divider);
    body.appendChild(queueTitle);
    body.appendChild(queueContainer);
    body.appendChild(empty);
    panel.appendChild(body);

    dom.panel = panel;
    dom.grid = grid;
    dom.queueContainer = queueContainer;
    dom.queueEmpty = empty;
    dom.queueCount = queueCount;
    document.body.appendChild(panel);
  }

  /* ---------- 创建弹窗 ---------- */
  function createModal() {
    var overlay = ce('div', 'gh-overlay');
    overlay.style.display = 'none';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    var modal = ce('div', 'gh-modal');
    var titleEl = ce('h3', 'gh-modal-title');
    var bodyEl = ce('div', 'gh-modal-body');
    var footerEl = ce('div', 'gh-modal-footer');
    var closeBtn = ce('button', 'gh-btn gh-btn-secondary');
    closeBtn.textContent = '\u5173\u95ED';
    closeBtn.addEventListener('click', function () { closeModal(); });
    footerEl.appendChild(closeBtn);
    modal.appendChild(titleEl);
    modal.appendChild(bodyEl);
    modal.appendChild(footerEl);
    overlay.appendChild(modal);
    dom.modalOverlay = overlay;
    dom.modal = modal;
    dom.modalTitle = titleEl;
    dom.modalBody = bodyEl;
    dom.modalFooter = footerEl;
    document.body.appendChild(overlay);
  }

  /* ---------- Toast ---------- */
  function createToastContainer() {
    var c = ce('div', '');
    c.id = 'gh-toast-container';
    c.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483648;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;';
    dom.toastContainer = c;
    document.body.appendChild(c);
  }

  /* ---------- 卡片渲染 ---------- */
  function renderCards(list) {
    cards = list || [];
    dom.grid.innerHTML = '';
    cardElements = {};
    cards.forEach(function (card) {
      var el = ce('div', 'gh-card');
      el.setAttribute('data-game-id', card.id);
      var icon = ce('div', 'gh-icon');
      // 支持图片图标 (imgUrl) 优先，其次 emoji (icon)
      if (card.imgUrl) {
        var img = document.createElement('img');
        img.src = card.imgUrl;
        img.alt = card.name || '';
        img.style.cssText = 'width:36px;height:36px;object-fit:contain;';
        img.loading = 'lazy';
        // 图片加载失败时回退到 emoji
        img.onerror = function () {
          icon.textContent = card.icon || '\uD83C\uDFAE';
          img.style.display = 'none';
        };
        icon.appendChild(img);
      } else {
        icon.textContent = card.icon || '\uD83C\uDFAE';
      }
      var title = ce('div', 'gh-title');
      title.textContent = card.name || '';
      var desc = ce('div', 'gh-desc');
      desc.textContent = (card.players || '') + ' \u00B7 ' + (card.desc || '');
      var btn = ce('button', 'gh-btn gh-btn-primary gh-btn-sm');
      btn.setAttribute('data-game-id', card.id);
      var badge = ce('span', 'gh-badge');
      el.appendChild(icon); el.appendChild(title); el.appendChild(desc); el.appendChild(badge); el.appendChild(btn);
      dom.grid.appendChild(el);
      cardElements[card.id] = { el: el, btn: btn, badge: badge };
      updateCardState(card.id, card.state || 'idle');
      btn.addEventListener('click', function (e) { e.stopPropagation(); handleAction(card.id); });
      el.addEventListener('click', function () { handleAction(card.id); });
    });
  }

  function handleAction(gameId) {
    var card = getConfig(gameId);
    if (!card || card.state === 'playing') return;
    var fn = callbacks.onGameAction;
    if (fn) fn(gameId, card.state);
  }

  function getConfig(gameId) {
    for (var i = 0; i < cards.length; i++) { if (cards[i].id === gameId) return cards[i]; }
    return null;
  }

  function updateCardState(gameId, state) {
    var ref = cardElements[gameId];
    if (!ref) return;
    var card = getConfig(gameId);
    if (card) card.state = state;
    var btn = ref.btn;
    var badge = ref.badge;
    badge.className = 'gh-badge';
    var map = {
      idle:    { text: '\u7A7A\u95F2', cls: 'gh-badge-idle',    btnText: '\u52A0\u5165', disabled: false },
      waiting: { text: '\u7B49\u5F85\u4E2D', cls: 'gh-badge-waiting', btnText: '\u7B49\u5F85', disabled: true },
      playing: { text: '\u8FDB\u884C\u4E2D', cls: 'gh-badge-playing', btnText: '\u8FDB\u884C\u4E2D', disabled: true },
    };
    var s = map[state] || map.idle;
    var dot = ce('span', 'gh-badge-dot');
    var label = document.createTextNode(' ' + s.text);
    badge.appendChild(dot);
    badge.appendChild(label);
    badge.classList.add(s.cls);
    btn.textContent = s.btnText;
    btn.disabled = s.disabled;
  }

  function updateQueue(queueData) {
    var container = dom.queueContainer;
    var empty = dom.queueEmpty;
    var countEl = dom.queueCount;
    container.innerHTML = '';
    if (!queueData || !queueData.items || queueData.items.length === 0) {
      empty.style.display = '';
      countEl.textContent = '0 \u4EBA\u7B49\u5F85';
      return;
    }
    empty.style.display = 'none';
    countEl.textContent = queueData.items.length + ' \u4EBA\u7B49\u5F85';
    queueData.items.forEach(function (item) {
      var li = ce('li', 'gh-queue-item');
      var avatar = ce('div', 'gh-queue-avatar');
      avatar.textContent = item.avatar || '\uD83D\uDC64';
      var nameEl = ce('span', 'gh-queue-name');
      nameEl.textContent = item.name || '\u533F\u540D';
      li.appendChild(avatar); li.appendChild(nameEl);
      container.appendChild(li);
    });
  }

  /* ---------- 清理残留 DOM ---------- */
  function cleanupDOM() {
    var selectors = ['#gh-panel', '.gh-fab', '#gh-overlay', '#gh-toast-container', '#gh-sidebar-btn', '#gh-stylesheet', '#gh-toast-style'];
    selectors.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  /* ---------- 公开 API ---------- */
  var GhUI = {
    init: function (cardList, cb) {
      cleanupDOM();
      cards = cardList || [];
      callbacks = cb || {};
      insertSidebarButton(); // 加入 iirosē 侧边栏
      createFAB(); createPanel(); createModal(); createToastContainer();
      renderCards(cards);
    },
    reinit: function () {
      cleanupDOM();
      dom = {};
      isVisible = false;
      insertSidebarButton();
      createFAB(); createPanel(); createModal(); createToastContainer();
      renderCards(cards);
    },
    toggle: function () { isVisible ? hide() : show(); },
    show: function () { if (dom.panel) { dom.panel.classList.add('gh-open'); isVisible = true; } },
    hide: function () { if (dom.panel) { dom.panel.classList.remove('gh-open'); isVisible = false; } },
    showModal: function (title, contentHtml) {
      if (!dom.modalOverlay) return;
      dom.modalTitle.textContent = title || '';
      dom.modalBody.innerHTML = contentHtml || '';
      dom.modalOverlay.style.display = 'flex';
    },
    closeModal: function () { if (dom.modalOverlay) dom.modalOverlay.style.display = 'none'; },
    showToast: function (text, isError) {
      if (!dom.toastContainer) return;
      var toast = ce('div', 'gh-toast');
      toast.style.cssText = 'padding:10px 20px;border-radius:8px;font-size:14px;color:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.4);pointer-events:auto;transition:opacity 0.3s ease,transform 0.3s ease;animation:gh-toast-in 0.3s ease;max-width:320px;text-align:center;line-height:1.4;word-break:break-word;';
      toast.style.background = isError ? 'rgba(220,50,50,0.92)' : 'rgba(30,30,45,0.92)';
      if (!isError) toast.style.border = '1px solid rgba(255,255,255,0.08)';
      toast.textContent = text;
      dom.toastContainer.appendChild(toast);
      setTimeout(function () {
        toast.style.opacity = '0'; toast.style.transform = 'translateY(-12px)';
        setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
      }, 2000);
    },
    updateQueue: function (q) { updateQueue(q); },
    updateCardState: function (gameId, state) { updateCardState(gameId, state); },
  };

  window.GhUI = GhUI;
})();
