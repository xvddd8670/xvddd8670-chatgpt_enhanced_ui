// ==UserScript==
// @name         ChatGPT Stars + Color Tags + Filters (June 2025 Fixed)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Звезды, 12 цветных меток, фильтр по звёздочкам и цвету. Полностью рабочий (июнь 2025). Цвет можно снять, фильтр — тоже. Всё циклично работает корректно.
// @author       xv
// @match        https://chatgpt.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STAR_ICON = '⭐';
    const EMPTY_STAR_ICON = '☆';

    const COLORS = [
        '#0d52db', '#00FF00', '#fbff00', '#FF0000'
    ];

    let showOnlyStarred = false;
    let filterColor = null;

    const getStarred = () => JSON.parse(localStorage.getItem('chatgpt_starred_chats') || '[]');
    const saveStarred = (ids) => localStorage.setItem('chatgpt_starred_chats', JSON.stringify(ids));

    const getTags = () => JSON.parse(localStorage.getItem('chatgpt_chat_tags') || '{}');
    const saveTags = (tags) => localStorage.setItem('chatgpt_chat_tags', JSON.stringify(tags));

    const toggleStar = (chatId) => {
        const starred = getStarred();
        const index = starred.indexOf(chatId);
        if (index !== -1) starred.splice(index, 1);
        else starred.push(chatId);
        saveStarred(starred);
        updateChats();
    };

    const cycleTagColor = (chatId) => {
        const tags = getTags();
        const current = tags[chatId] || null;
        const currentIndex = COLORS.indexOf(current);
        const nextColor = COLORS[(currentIndex + 1) % COLORS.length] || COLORS[0];
        const next = current === COLORS[COLORS.length - 1] ? null : COLORS[currentIndex + 1] || COLORS[0];
        if (current === null) tags[chatId] = COLORS[0];
        else if (current === COLORS[COLORS.length - 1]) delete tags[chatId];
        else tags[chatId] = next;
        saveTags(tags);
        updateChats();
    };

    const updateChats = () => {
        const starred = getStarred();
        const tags = getTags();

        document.querySelectorAll('a[href^="/c/"]').forEach(link => {
            const chatId = link.getAttribute('href');
            const titleNode = link.querySelector('div.flex-1') || link.firstChild;
                if (titleNode) {
                    titleNode.style.fontSize = '10px'; // или '11px', если нужно ещё меньше
                    titleNode.style.lineHeight = '1.2';
                    titleNode.style.maxWidth = '100%';
                    titleNode.style.overflow = 'hidden';
                    titleNode.style.textOverflow = 'ellipsis';
                    //titleNode.style.whiteSpace = 'nowrap';
                    titleNode.style.whiteSpace = 'normal';
                    titleNode.style.wordBreak = 'break-word'; // Альтернатива: overflowWrap = 'break-word'
                    titleNode.style.display = '-webkit-box';
                    titleNode.style.webkitLineClamp = '2';
                    titleNode.style.webkitBoxOrient = 'vertical';
                    titleNode.style.overflow = 'hidden';
            }
            if (!chatId) return;

            // ⭐ Star
            let star = link.querySelector('.chatgpt-star');
            if (!star) {
                star = document.createElement('span');
                star.className = 'chatgpt-star';
                star.style.cursor = 'pointer';
                star.style.marginRight = '0px';
                star.style.userSelect = 'none';
                star.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    toggleStar(chatId);
                });
                const title = link.querySelector('div.flex-1') || link.firstChild;
                if (title) title.prepend(star);
            }
            star.textContent = getStarred().includes(chatId) ? STAR_ICON : EMPTY_STAR_ICON;

            // 🎨 Tag
            let tag = link.querySelector('.chatgpt-tag');
            if (!tag) {
                tag = document.createElement('span');
                tag.className = 'chatgpt-tag';
                tag.style.display = 'inline-block';
                tag.style.width = '17px';
                tag.style.height = '17px';
                tag.style.borderRadius = '30%';
                tag.style.marginRight = '0px';
                tag.style.border = '1px solid white';
                tag.style.cursor = 'pointer';
                tag.title = 'Цветная метка';
                tag.style.flexShrink = '0';
                tag.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    cycleTagColor(chatId);
                });
                star.insertAdjacentElement('beforebegin', tag);
            }
            const color = tags[chatId];
            tag.style.backgroundColor = color || 'transparent';

            // Фильтрация
            const visibleByStar = !showOnlyStarred || starred.includes(chatId);
            const visibleByColor = !filterColor || (tags[chatId] === filterColor);
            link.style.display = (visibleByStar && visibleByColor) ? '' : 'none';
        });
    };

    const addFilterControls = () => {
        if (document.getElementById('star-filter-btn')) return;

        const newChatBtn = Array.from(document.querySelectorAll('a')).find(a =>
            a.textContent.includes('New chat') || a.textContent.includes('Новый чат')
        );
        if (!newChatBtn || !newChatBtn.parentNode) return;

        // ⭐ Star Filter Button
        const starBtn = document.createElement('button');
        starBtn.id = 'star-filter-btn';
        starBtn.textContent = '⭐ Only star';
        styleButton(starBtn);
        starBtn.addEventListener('click', () => {
            showOnlyStarred = !showOnlyStarred;
            starBtn.textContent = showOnlyStarred ? '🔍 Show all' : '⭐ Only star';
            updateChats();
        });

        // 🎨 Color Filter Buttons
        const colorFilterContainer = document.createElement('div');
        colorFilterContainer.style.display = 'flex';
        colorFilterContainer.style.flexWrap = 'wrap';
        colorFilterContainer.style.margin = '10px 10px';

        COLORS.forEach(color => {
            const btn = document.createElement('div');
            btn.style.width = '22px';
            btn.style.height = '22px';
            btn.style.borderRadius = '50%';
            btn.style.margin = '3px';
            btn.style.cursor = 'pointer';
            btn.style.border = '2px solid white';
            btn.style.background = color;
            btn.title = 'Фильтр по цвету';
            btn.addEventListener('click', () => {
                filterColor = (filterColor === color) ? null : color;
                updateChats();
            });
            colorFilterContainer.appendChild(btn);
        });

        newChatBtn.parentNode.insertBefore(starBtn, newChatBtn.nextSibling);
        newChatBtn.parentNode.insertBefore(colorFilterContainer, starBtn.nextSibling);
    };

    const styleButton = (btn) => {
        btn.style.margin = '10px auto';
        btn.style.padding = '6px 12px';
        btn.style.border = '1px solid #888';
        btn.style.background = '#555';
        btn.style.color = 'white';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '14px';
        btn.style.width = '90%';
        btn.style.display = 'block';
    };

    const observeSidebar = () => {
        const container = document.querySelector('nav');
        if (!container) return;

        const observer = new MutationObserver(() => {
            addFilterControls();
            updateChats();
        });

        observer.observe(container, {
            childList: true,
            subtree: true
        });

        addFilterControls();
        updateChats();
    };

    const waitForSidebar = () => {
        const interval = setInterval(() => {
            const navReady = document.querySelector('nav') && document.querySelector('a[href^="/c/"]');
            if (navReady) {
                clearInterval(interval);
                observeSidebar();
            }
        }, 500);
    };

    waitForSidebar();
})();
