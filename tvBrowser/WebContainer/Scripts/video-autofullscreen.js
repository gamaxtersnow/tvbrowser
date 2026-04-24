(function() {
    'use strict';

    function notifyNative(type) {
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.tvOSBridge) {
            window.webkit.messageHandlers.tvOSBridge.postMessage({ type: type });
        }
    }

    function handleVideoPlay(video) {
        notifyNative('videoPlaying');
    }

    function handleVideoEnded(video) {
        notifyNative('videoEnded');
    }

    function attachVideoListeners(video) {
        if (video._tvOSListenerAttached) return;
        video._tvOSListenerAttached = true;

        video.addEventListener('play', function() {
            handleVideoPlay(video);
        });
        video.addEventListener('ended', function() {
            handleVideoEnded(video);
        });
    }

    function scanVideos() {
        document.querySelectorAll('video').forEach(attachVideoListeners);
    }

    // 初始扫描
    scanVideos();

    // 监听新插入的 video 元素
    const observer = new MutationObserver(function(mutations) {
        let hasNewVideo = false;
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'VIDEO') {
                    attachVideoListeners(node);
                    hasNewVideo = true;
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('video').forEach(attachVideoListeners);
                    hasNewVideo = true;
                }
            });
        });
        if (hasNewVideo) {
            // 如果检测到新视频，自动尝试触发播放（某些网站需要交互才能开始）
            setTimeout(scanVideos, 500);
        }
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }
})();
