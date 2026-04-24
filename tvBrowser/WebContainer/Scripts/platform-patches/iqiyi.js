(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        /* 爱奇艺移动端顶部导航 */
        .m-header, .top-nav, .header-wrap,
        .app-download-bar, .mobile-download-banner,
        .m-bottom-nav, .bottom-bar, .tab-bar {
            display: none !important;
        }

        /* 爱奇艺视频列表间距 */
        .qy-video-list .qy-video-item,
        .m-video-list .video-item {
            margin-bottom: 16px !important;
        }

        /* 增大标题 */
        .qy-video-title, .video-title, .title-text {
            font-size: 1.3em !important;
        }
    `;
    document.head.appendChild(style);
})();
