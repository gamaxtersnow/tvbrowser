(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        /* 全局字体放大 */
        html {
            font-size: 18px !important;
        }
        body {
            font-size: 18px !important;
            line-height: 1.6 !important;
        }
        h1, h2, h3, h4, h5, h6 {
            font-size: 1.5em !important;
        }
        p, span, div {
            font-size: 1.1em !important;
        }
        a, button {
            font-size: 1.2em !important;
            min-height: 44px !important;
        }

        /* 增大列表项间距 */
        li, .list-item, .video-item, .video-card {
            margin-bottom: 12px !important;
            padding: 8px !important;
        }

        /* 隐藏常见移动端导航 */
        .app-header, .mobile-header, .m-top-nav, .top-bar,
        .bottom-nav, .bottom-tab-bar, .mobile-footer, .m-bottom-nav,
        .tab-bar, .fix-bottom, .fix-nav, .app-nav,
        [class*="mobile-nav"], [class*="app-nav"],
        [id*="mobile-header"], [id*="app-header"] {
            display: none !important;
        }

        /* 视频播放器全屏适配 */
        video {
            max-width: 100vw !important;
            max-height: 100vh !important;
        }

        /* 滚动条隐藏 */
        ::-webkit-scrollbar {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
})();
