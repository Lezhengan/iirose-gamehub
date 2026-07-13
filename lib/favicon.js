/**
 * iirose 游戏大厅 — Favicon 工具模块
 * 基于 Favicon.im API (https://favicon.im/)
 * 免费、免密钥、CORS 支持
 *
 * 用法:
 *   GhFavicon.getUrl('github.com')        → 'https://favicon.im/github.com'
 *   GhFavicon.getUrl('github.com', true)  → 'https://favicon.im/github.com?larger=true'
 *   GhFavicon.getImg('github.com')        → <img src="..." alt="github.com" loading="lazy">
 *
 * 注册: window.GhFavicon
 */
(function () {
  if (window.__ghFaviconInstalled) return;
  window.__ghFaviconInstalled = true;

  var BASE = 'https://favicon.im';

  /**
   * 从任意 URL 或域名中提取纯域名
   *   'https://www.google.com/search?q=test' → 'google.com'
   *   'sub.example.co.jp/path'              → 'sub.example.co.jp'
   */
  function extractDomain(input) {
    if (!input || typeof input !== 'string') return '';
    input = input.trim().toLowerCase();
    // 去掉协议
    input = input.replace(/^https?:\/\//, '');
    // 去掉路径/参数
    input = input.split('/')[0].split('?')[0].split('#')[0];
    // 去掉 www. 前缀（保留 subdomain）
    input = input.replace(/^www\./, '');
    return input;
  }

  /**
   * 获取 Favicon URL
   * @param {string} domain - 域名或完整 URL
   * @param {boolean} [larger] - 是否要大尺寸 (256px)
   * @returns {string} Favicon 图片 URL
   */
  function getUrl(domain, larger) {
    var d = extractDomain(domain);
    if (!d) return BASE + '/unknown';
    return larger ? BASE + '/' + d + '?larger=true' : BASE + '/' + d;
  }

  /**
   * 创建 favicon <img> 元素
   * @param {string} domain - 域名或完整 URL
   * @param {object} [opts] - 选项
   * @param {boolean} [opts.larger] - 大尺寸
   * @param {number} [opts.size] - 宽高 (px)
   * @param {string} [opts.alt] - 替代文本
   * @param {string} [opts.className] - CSS 类名
   * @returns {HTMLImageElement}
   */
  function getImg(domain, opts) {
    opts = opts || {};
    var img = document.createElement('img');
    img.src = getUrl(domain, opts.larger);
    img.alt = opts.alt || extractDomain(domain) || 'favicon';
    img.loading = 'lazy';
    if (opts.size) {
      img.width = opts.size;
      img.height = opts.size;
    }
    if (opts.className) img.className = opts.className;
    // 加载失败时显示默认占位
    img.onerror = function () {
      this.onerror = null;
      this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Crect fill="%23333" width="32" height="32" rx="6"/%3E%3Ctext x="16" y="22" text-anchor="middle" fill="%23999" font-size="18"%3E🌐%3C/text%3E%3C/svg%3E';
    };
    return img;
  }

  /**
   * 预加载多个域名的 favicon (不显示, 触发缓存)
   * @param {string[]} domains
   */
  function preload(domains) {
    if (!domains || !domains.length) return;
    for (var i = 0; i < domains.length; i++) {
      var img = new Image();
      img.src = getUrl(domains[i], true);
    }
  }

  window.GhFavicon = {
    extractDomain: extractDomain,
    getUrl: getUrl,
    getImg: getImg,
    preload: preload,
    BASE: BASE,
  };

  console.log('[GhFavicon] 已加载, API:', BASE);
})();
