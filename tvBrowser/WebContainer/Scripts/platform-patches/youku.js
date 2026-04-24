(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        /* 优酷移动端顶部导航 */
        .g-header, .m-header, .top-nav, .header-wrap,
        .app-download-banner, .mobile-download-bar,
        .g-bottom-nav, .m-bottom-nav, .fix-bottom-bar {
            display: none !important;
        }

        /* 优酷视频列表间距 */
        .video-list .video-item,
        .m-video-list .m-video-item {
            margin-bottom: 16px !important;
        }

        /* 增大标题 */
        .video-title, .v-title, .title-text {
            font-size: 1.3em !important;
        }
    `;
    document.head.appendChild(style);
})();
