/**
 * iirose 游戏大厅 — 安装器
 *
 * 在 iirose 聊天页 JS 终端执行以下代码:
 *
 *   (function(){
 *     var s=document.createElement('script');
 *     s.src='https://lezhengan.github.io/iirose-gamehub/gamehub.js';
 *     document.head.appendChild(s);
 *   })();
 *
 * 或直接复制本文件全部内容到 JS 终端执行。
 */

(function () {
  if (window.__ghAppInstalled) {
    console.log('[GameHub] 已安装，跳过');
    return;
  }
  var s = document.createElement('script');
  s.src = 'https://lezhengan.github.io/iirose-gamehub/gamehub.js';
  document.head.appendChild(s);
})();
