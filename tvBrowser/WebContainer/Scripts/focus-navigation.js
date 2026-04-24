(function() {
    'use strict';

    if (window.tvOSFocus) return;

    const SELECTORS = [
        'a[href]',
        'button',
        '[role="button"]',
        '[role="link"]',
        'input',
        'textarea',
        'select',
        '[tabindex]:not([tabindex="-1"])',
        '.video-item',
        '.video-card',
        '.play-btn',
        '.v-pic'
    ].join(', ');

    let focusableElements = [];
    let currentIndex = -1;
    let focusStyle = null;

    function injectFocusStyle() {
        if (focusStyle) return;
        focusStyle = document.createElement('style');
        focusStyle.textContent = `
            .tv-focused {
                outline: 4px solid #00a8ff !important;
                outline-offset: 4px !important;
                transform: scale(1.05) !important;
                transition: all 0.15s ease !important;
                z-index: 99999 !important;
                position: relative !important;
            }
        `;
        document.head.appendChild(focusStyle);
    }

    function updateFocusableElements() {
        focusableElements = Array.from(document.querySelectorAll(SELECTORS))
            .filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 &&
                       getComputedStyle(el).display !== 'none' &&
                       getComputedStyle(el).visibility !== 'hidden';
            });
    }

    function setFocus(index) {
        if (currentIndex >= 0 && currentIndex < focusableElements.length) {
            focusableElements[currentIndex].classList.remove('tv-focused');
        }
        currentIndex = index;
        if (currentIndex >= 0 && currentIndex < focusableElements.length) {
            const el = focusableElements[currentIndex];
            el.classList.add('tv-focused');
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }

    function getElementCenter(el) {
        const rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    function distance(a, b) {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }

    function findNextFocus(direction) {
        if (focusableElements.length === 0) return -1;
        if (currentIndex < 0) return 0;

        const current = getElementCenter(focusableElements[currentIndex]);
        let bestIndex = -1;
        let bestScore = Infinity;

        focusableElements.forEach((el, index) => {
            if (index === currentIndex) return;
            const center = getElementCenter(el);
            const dx = center.x - current.x;
            const dy = center.y - current.y;

            let valid = false;
            let score = 0;
            switch (direction) {
                case 'up':
                    valid = dy < -10;
                    score = Math.abs(dx) * 2 + Math.abs(dy);
                    break;
                case 'down':
                    valid = dy > 10;
                    score = Math.abs(dx) * 2 + Math.abs(dy);
                    break;
                case 'left':
                    valid = dx < -10;
                    score = Math.abs(dy) * 2 + Math.abs(dx);
                    break;
                case 'right':
                    valid = dx > 10;
                    score = Math.abs(dy) * 2 + Math.abs(dx);
                    break;
            }

            if (valid && score < bestScore) {
                bestScore = score;
                bestIndex = index;
            }
        });

        return bestIndex >= 0 ? bestIndex : currentIndex;
    }

    function move(direction) {
        updateFocusableElements();
        const next = findNextFocus(direction);
        if (next >= 0) {
            setFocus(next);
        }
    }

    function select() {
        if (currentIndex >= 0 && currentIndex < focusableElements.length) {
            const el = focusableElements[currentIndex];
            el.click();
            el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    }

    function init() {
        injectFocusStyle();
        updateFocusableElements();
        if (focusableElements.length > 0 && currentIndex < 0) {
            setFocus(0);
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // DOM 变化时更新可聚焦元素列表
    const observer = new MutationObserver(() => {
        updateFocusableElements();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 暴露全局 API 供原生层调用
    window.tvOSFocus = {
        move: move,
        select: select,
        init: init
    };
})();
