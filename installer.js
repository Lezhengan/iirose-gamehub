/**
 * iirose 游戏大厅 — 安装器
 *
 * 使用方式 (在 iirose 聊天页 JS 终端 或 F12 控制台 执行):
 *
 *   // ====== 方法1: GitHub Pages 完整版 ======
 *   (function(){
 *     var BASE = 'https://Lezhengan.github.io/iirose-gamehub';
 *     ['lib/core.js','lib/ui.js','lib/favicon.js','gamehub.js'].forEach(function(p){
 *       var s=document.createElement('script');
 *       s.src=BASE+'/'+p;
 *       document.head.appendChild(s);
 *     });
 *   })();
 *
 *   // ====== 方法2: 单文件加载 ======
 *   (function(){
 *     var SRC='https://你的地址/gamehub-bundle.js';
 *     if(window.__ghBundleLoaded)return;
 *     window.__ghBundleLoaded=true;
 *     var m=document.getElementById('mainFrame');
 *     var w=m?m.contentWindow:window;
 *     var d=w.document;
 *     var s=d.createElement('script');
 *     s.src=SRC+'?t='+Date.now();
 *     d.head.appendChild(s);
 *   })();
 *
 *   // ====== 方法3: 本地开发 ======
 *   // 在 messages.html 控制台依次执行:
 *   var B='http://localhost:8000';
 *   ['lib/core.js','lib/ui.js','lib/favicon.js','gamehub.js'].forEach(function(p){
 *     var s=document.createElement('script');
 *     s.src=B+'/'+p;
 *     document.head.appendChild(s);
 *   });
 */

console.log('[GameHub] \u5B89\u88C5\u5668\u5DF2\u52A0\u8F7D\u3002\u8BF7\u4F7F\u7528\u4E0A\u65B9\u8BF4\u660E\u4E2D\u7684\u65B9\u6CD5\u5B89\u88C5\u3002');
