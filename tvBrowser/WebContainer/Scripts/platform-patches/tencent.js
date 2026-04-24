(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        /* 腾讯视频移动端顶部导航 */
        .site_header, .m-header, .top-fix-bar,
        .mobile_app_banner, .app-download-tip,
        .bottom_nav, .m-bottom-nav, .tab_bar {
            display: none !important;
        }

        /* 腾讯视频列表间距 */
        .mod_figure .list_item,
        .m-video-list .video-item {
            margin-bottom: 16px !important;
        }

        /* 增大标题 */
        .figure_title, .video_title, .title_text {
            font-size: 1.3em !important;
        }
    `;
    document.head.appendChild(style);
})();
