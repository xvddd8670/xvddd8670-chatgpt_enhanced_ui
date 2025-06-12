// ==UserScript==
// @name         ChatGPT Folder Manager Enhanced (Title Support)
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Улучшенное управление папками в интерфейсе ChatGPT с сохранением названий чатов даже если они не загружены в списке слева.
// @author       xv
// @match        https://chatgpt.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const storageKey = 'gpt_folders';

    const getFolders = () => JSON.parse(localStorage.getItem(storageKey) || '{}');
    const saveFolders = folders => localStorage.setItem(storageKey, JSON.stringify(folders));

    const createFolder = name => {
        const folders = getFolders();
        if (!folders[name]) {
            folders[name] = [];
            saveFolders(folders);
        }
    };

    const deleteFolder = name => {
        const folders = getFolders();
        delete folders[name];
        saveFolders(folders);
    };

    const renameFolder = (oldName, newName) => {
        const folders = getFolders();
        if (folders[oldName]) {
            folders[newName] = folders[oldName];
            delete folders[oldName];
            saveFolders(folders);
        }
    };

    const assignChatToFolder = (chatId, folderName) => {
        const folders = getFolders();
        if (!folders[folderName]) folders[folderName] = [];

        const title = getChatTitleById(chatId) || chatId;
        const alreadyExists = folders[folderName].some(c => c.id === chatId);
        if (!alreadyExists) {
            folders[folderName].push({ id: chatId, title });
            saveFolders(folders);
        }
    };

    const removeChatFromFolder = (chatId, folderName) => {
        const folders = getFolders();
        if (folders[folderName]) {
            folders[folderName] = folders[folderName].filter(c => c.id !== chatId);
            saveFolders(folders);
        }
    };

    const getChatTitleById = (chatId) => {
        const link = document.querySelector(`a[href="/c/${chatId}"]`);
        return link ? link.textContent.trim() : null;
    };

    const getChatIdFromUrl = () => {
        const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9\-]+)/);
        return match ? match[1] : null;
    };


    const showFolderListModal = () => {
      const overlay = document.createElement('div');
      overlay.style = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9998;
      `;

      const modal = document.createElement('div');
      modal.innerHTML = `
        <div id="folderModal" style="
            position: fixed;
            top: 10%;
            left: 50%;
            transform: translateX(-50%);
            max-height: 80%;
            width: 80%;
            background: black;
            border: 1px solid #30A419;
            padding: 1rem;
            overflow-y: auto;
            z-index: 9999;
            box-shadow: 0 0 20px rgba(0,255,0,0.5);
            font-family: monospace;
            font-size: 14px;
            color: #30A419;
        ">
            <div style="text-align: right;">
                <button id="closeModalBtn" style="
                    background: transparent;
                    border: 1px solid #30a419;
                    color: #30a419;
                    padding: 0.25rem 0.5rem;
                    cursor: pointer;
                    font-size: 14px;
                ">✖</button>
            </div>
                <h3 style="margin-top: 0; color: #30a419; display: flex; align-items: center;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#30a419" viewBox="0 0 24 24" style="margin-right: 8px;">
                    <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/>
                  </svg>
                  Folders and chats
                </h3>
            <div id="folderListContainer"></div>
        </div>
      `;

      document.body.appendChild(overlay);
      document.body.appendChild(modal);

      const modalElement = modal.querySelector('#folderModal');
      const container = modal.querySelector('#folderListContainer');

      // Закрытие модалки
      const closeModal = () => {
        document.body.removeChild(modal);
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', handleKeyDown);
      };

      // Обработчик клавиш
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          const confirmBox = document.getElementById('confirmBox');
          if (confirmBox) {
            confirmBox.remove();
            document.getElementById('confirmOverlay')?.remove();
          } else {
            closeModal();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Закрытие по клику вне модального окна
      overlay.addEventListener('click', closeModal);

      modal.querySelector('#closeModalBtn').onclick = closeModal;

      const refreshFolderList = () => {
        const folders = getFolders();
        container.innerHTML = Object.entries(folders).map(([name, chats]) => {
          const chatList = chats.map(c =>
              `<div style="display: flex; align-items: center; margin-bottom: 2px;">
                  <button data-folder="${encodeURIComponent(name)}" data-id="${c.id}" style="
                      background: none;
                      border: none;
                      color: #30A419;
                      cursor: pointer;
                      font-size: 12px;
                      margin-right: 6px;
                  ">✖</button>
                  <a href="/c/${c.id}" style="color: #30a419; text-decoration: underline; flex: 1;">
                      ${c.title}
                  </a>
              </div>`
          ).join('');
          return `<div style="margin-bottom: 1em;">
              <strong style="color:#30a419;">${name}</strong><br>${chatList || '<i style="color:gray;">(пусто)</i>'}
          </div>`;
        }).join('') || '<i>Empty</i>';
      };

      container.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON' && e.target.dataset.id) {
          const folder = decodeURIComponent(e.target.dataset.folder);
          const chatId = e.target.dataset.id;
          const chatTitle = getFolders()[folder]?.find(c => c.id === chatId)?.title || chatId;

          const confirmOverlay = document.createElement('div');
          confirmOverlay.id = 'confirmOverlay';
          confirmOverlay.style = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
          `;

          const confirmBox = document.createElement('div');
          confirmBox.id = 'confirmBox';
          confirmBox.style = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: black;
            border: 1px solid #30a419;
            color: #30a419;
            font-family: monospace;
            padding: 1rem;
            z-index: 10001;
            text-align: center;
          `;
          confirmBox.innerHTML = `
            <div style="margin-bottom: 1rem;">Del chat "<b>${chatTitle}</b>" from folder "<b>${folder}</b>"?</div>
            <button id="confirmYes" style="
                margin-right: 1rem;
                padding: 0.25rem 0.75rem;
                background: black;
                border: 1px solid #30a419;
                color: #30a419;
                cursor: pointer;
            ">Y</button>
            <button id="confirmNo" style="
                padding: 0.25rem 0.75rem;
                background: black;
                border: 1px solid #ff5555;
                color: #ff5555;
                cursor: pointer;
            ">N</button>
          `;

          document.body.appendChild(confirmOverlay);
          document.body.appendChild(confirmBox);

          confirmOverlay.addEventListener('click', () => {
            confirmBox.remove();
            confirmOverlay.remove();
          });

          confirmBox.querySelector('#confirmYes').onclick = () => {
            removeChatFromFolder(chatId, folder);
            confirmBox.remove();
            confirmOverlay.remove();
            refreshFolderList();
          };

          confirmBox.querySelector('#confirmNo').onclick = () => {
            confirmBox.remove();
            confirmOverlay.remove();
          };
        }
      });

      refreshFolderList();
    };




    const addFolderButton = () => {
        const newChatBtn = document.querySelector('a[href="/"]');
        if (!newChatBtn || document.getElementById('folder-button')) return;

        const folderBtn = document.createElement('button');
        folderBtn.id = 'folder-button';
        folderBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="gray" viewBox="0 0 24 24">
            <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/>
          </svg>
        `;
        folderBtn.className = newChatBtn.className;
        folderBtn.style.marginTop = '0.5rem';
        folderBtn.style.display = 'flex';
        folderBtn.style.alignItems = 'center';
        folderBtn.style.justifyContent = 'center';
        folderBtn.style.gap = '6px';
        folderBtn.onclick = showFolderMenu;

        const listBtn = document.createElement('button');
        listBtn.id = 'folder-list-button';
        listBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="gray" viewBox="0 0 24 24">
            <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
          </svg>
        `;
        listBtn.className = newChatBtn.className;
        listBtn.style.marginTop = '0.5rem';
        listBtn.style.display = 'flex';
        listBtn.style.alignItems = 'center';
        listBtn.style.justifyContent = 'center'; // или 'center', если нужно по центру
        listBtn.style.gap = '6px';
        listBtn.onclick = showFolderListModal;

        // Вставить перед кнопкой "Новый чат"
        newChatBtn.parentNode.insertBefore(listBtn, newChatBtn.nextSibling);
        newChatBtn.parentNode.insertBefore(folderBtn, listBtn.nextSibling);
    };

    const showFolderMenu = () => {
        const folders = getFolders();
        const folderNames = Object.keys(folders);
        const chatId = getChatIdFromUrl();

        const numberedFolders = folderNames.map((name, index) => `${index + 1}. ${name}`).join('\n');

        const choice = prompt(
            '📁 Folders menu:\n' +
            '1. New folder\n' +
            '2. Rename folder\n' +
            '3. Remove folder\n' +
            '4. Add the current chat to a folder\n' +
            '5. Add several\n' +
            '6. Delete a chat from a folder\n' +
            '7. Show folders and chats\n' +
            '8. Filter chats by folder\n' +
            '9. Reset the filter\n\n' +
            'Enter the action number:'
        );

        switch (choice) {
            case '1': {
                const name = prompt('Name of the new folder:');
                if (name) createFolder(name);
                break;
            }
            case '2': {
                if (folderNames.length === 0) return alert('No folders.');
                const idx = prompt(`Папки:\n${numberedFolders}`);
                const oldName = folderNames[parseInt(idx) - 1];
                if (!oldName) return alert('Wrong choice');
                const newName = prompt('New folder name:');
                if (newName) renameFolder(oldName, newName);
                break;
            }
            case '3': {
                if (folderNames.length === 0) return alert('No folders.');
                const idx = prompt(`Папки:\n${numberedFolders}`);
                const name = folderNames[parseInt(idx) - 1];
                if (!name) return alert('Wrong choice');
                deleteFolder(name);
                break;
            }
            case '4': {
                if (!chatId) return alert('Chat is not selected.');
                let title = getChatTitleById(chatId) || prompt('Enter the chat name (the name is not visible):', chatId);
                if (!title) title = chatId;

                const input = prompt(
                    `Select a folder or enter a new name:\n${numberedFolders}`
                );

                let folderName;
                const index = parseInt(input);
                if (!isNaN(index) && folderNames[index - 1]) {
                    folderName = folderNames[index - 1];
                } else if (input?.trim()) {
                    folderName = input.trim();
                    createFolder(folderName);
                } else {
                    return alert('Incorrect input');
                }

                assignChatToFolder(chatId, folderName);
                alert(`✅ Chat "${title}" adding to folder "${folderName}"`);
                break;
            }
            case '5': {
                const allChatLinks = [...document.querySelectorAll('nav a[href^="/c/"]')];
                if (allChatLinks.length === 0) return alert('No chats to add.');

                const folderNames = Object.keys(folders);
                if (folderNames.length === 0) return alert('First, create at least one folder.');

                const folderList = folderNames.map((name, i) => `${i + 1}. ${name}`).join('\n');
                const folderIndex = prompt(`Select a folder to add chats:\n${folderList}`);
                const folderName = folderNames[parseInt(folderIndex) - 1];
                if (!folderName) return alert('Wrong number');

                const chats = allChatLinks.map((link, i) => {
                    const idMatch = link.href.match(/\/c\/([a-zA-Z0-9\-]+)/);
                    const id = idMatch?.[1];
                    const title = link.textContent.trim() || id;
                    return { index: i + 1, id, title };
                });

                const chatList = chats.map(c => `${c.index}. ${c.title}`).join('\n');
                const input = prompt(
                    `Select the chats to add to the folder "${folderName}":\n${chatList}\n\n` +
                    `Enter numbers separated by commas and/or ranges (for example: 1,3,5-7):`
                );
                if (!input) return;

                const selectedIndices = new Set();
                input.split(',').forEach(part => {
                    const match = part.trim().match(/^(\d+)-(\d+)$/);
                    if (match) {
                        let [_, start, end] = match.map(Number);
                        for (let i = start; i <= end; i++) selectedIndices.add(i - 1);
                    } else {
                        const num = parseInt(part.trim());
                        if (!isNaN(num)) selectedIndices.add(num - 1);
                    }
                });

                const selectedChats = [...selectedIndices]
                    .map(i => chats[i])
                    .filter(c => c && c.id);

                if (selectedChats.length === 0) return alert('No correct numbers were selected..');

                selectedChats.forEach(c => assignChatToFolder(c.id, folderName));
                alert(`✅ Chats added to folder "${folderName}":\n\n${selectedChats.map(c => '- ' + c.title).join('\n')}`);
                break;
            }

            case '6': {
                if (Object.keys(folders).length === 0) return alert('No folders.');
                const folderList = Object.entries(folders)
                    .map(([name, chats], index) => `${index + 1}. ${name} (${chats.length} chats)`)
                    .join('\n');

                const folderIndex = prompt(`Select the folder from which to delete chats:\n${folderList}`);
                const folderName = Object.keys(folders)[parseInt(folderIndex) - 1];

                if (!folderName || !folders[folderName]) return alert('Invalid folder number.');

                const chatObjs = folders[folderName];
                if (chatObjs.length === 0) return alert('There are no chats in the folder.');

                const chatList = chatObjs.map((chat, i) => {
                    const domTitle = getChatTitleById(chat.id);
                    const title = domTitle || chat.title || chat.id;
                    return `${i + 1}. ${title}`;
                }).join('\n');

                const input = prompt(
                    `Select the chats to delete from the folder "${folderName}":\n` +
                    `${chatList}\n\nEnter numbers separated by commas and/or ranges (for example: 1,3,5-7):`
                );

                if (!input) return;

                const indicesToRemove = new Set();
                input.split(',').forEach(part => {
                    const rangeMatch = part.trim().match(/^(\d+)-(\d+)$/);
                    if (rangeMatch) {
                        let [_, start, end] = rangeMatch.map(Number);
                        for (let i = start; i <= end; i++) {
                            indicesToRemove.add(i - 1);
                        }
                    } else {
                        const single = parseInt(part.trim());
                        if (!isNaN(single)) indicesToRemove.add(single - 1);
                    }
                });

                const chatsToDelete = [...indicesToRemove]
                    .map(i => chatObjs[i])
                    .filter(c => !!c);

                if (chatsToDelete.length === 0) return alert('No correct numbers were selected.');

                const confirmText = chatsToDelete
                    .map(c => `- ${c.title || getChatTitleById(c.id) || c.id}`)
                    .join('\n');

                const confirmed = confirm(
                    `Delete the following chats from a folder "${folderName}"?\n\n${confirmText}`
                );

                if (confirmed) {
                    chatsToDelete.forEach(c => removeChatFromFolder(c.id, folderName));
                    alert('✅ Selected chats have been deleted from the folder.');
                }

                break;
            }

            case '7': {
                showFolderListModal();
                break;
            }

            case '8': {
                const idx = prompt(`Select a folder:\n${numberedFolders}`);
                const name = folderNames[parseInt(idx) - 1];
                if (!name) return alert('Wrong choice');
                const chatIds = folders[name].map(c => c.id);
                filterChatsByFolder(chatIds);
                break;
            }
            case '9': {
                resetChatFilter();
                break;
            }
        }
    };

    const filterChatsByFolder = (chatIds) => {
        const allChats = document.querySelectorAll('nav a[href^="/c/"]');
        allChats.forEach(link => {
            const idMatch = link.href.match(/\/c\/([a-zA-Z0-9\-]+)/);
            if (!idMatch || !chatIds.includes(idMatch[1])) {
                link.style.display = 'none';
            } else {
                link.style.display = '';
            }
        });
    };

    const resetChatFilter = () => {
        const allChats = document.querySelectorAll('nav a[href^="/c/"]');
        allChats.forEach(link => {
            link.style.display = '';
        });
    };

    const waitForElement = (selector, callback) => {
        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                callback(el);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    waitForElement('a[href="/"]', () => {
        addFolderButton();
        addDotsMenuEnhancer();
        setInterval(addFolderButton, 3000);
    });

    function findClosestChatLink(el) {
        while (el) {
            if (el.tagName === 'A' && el.href.includes('/c/')) return el;
            el = el.parentElement;
        }
        return null;
    }

    function addDotsMenuEnhancer() {
        const observer = new MutationObserver(() => {
            const dotsMenus = document.querySelectorAll('button[aria-haspopup="menu"]');

            dotsMenus.forEach(menu => {
                if (!menu.dataset.folderEnhanced) {
                    menu.dataset.folderEnhanced = 'true';

                    menu.addEventListener('click', () => {
                        setTimeout(() => {
                            const dropdown = menu.closest('[role="menu"]') || document.querySelector('[role="menu"]');
                            const dropdownItems = dropdown?.querySelectorAll('[role="menuitem"]');

                            if (dropdownItems?.length > 0) {
                                const newItem = document.createElement('div');
                                newItem.className = dropdownItems[0].className;
                                newItem.textContent = '📁 Add to Folder';
                                newItem.style.cursor = 'pointer';

                                newItem.onclick = () => {
                                    const chatLink = findClosestChatLink(menu);
                                    if (!chatLink) return alert('❌ Couldn\'t find the chat link');

                                    const match = chatLink.href.match(/\/c\/([a-zA-Z0-9\-]+)/);
                                    const chatId = match?.[1];
                                    if (!chatId) return alert('❌ Couldn\'t extract the chatId');

                                    const title = chatLink.textContent.trim() || prompt('Enter chat name:', chatId);

                                    const folders = getFolders();
                                    const folderNames = Object.keys(folders);
                                    let folderName;

                                    if (folderNames.length === 0) {
                                        const newName = prompt('There are no folders. Enter the name of the new folder:');
                                        if (!newName) return;
                                        createFolder(newName);
                                        folderName = newName;
                                    } else {
                                        const list = folderNames.map((name, i) => `${i + 1}. ${name}`).join('\n');
                                        const input = prompt(
                                            `📁 Select a folder:\n${list}\n\nEnter a number or a new name:`
                                        );

                                        const index = parseInt(input);
                                        if (!isNaN(index) && folderNames[index - 1]) {
                                            folderName = folderNames[index - 1];
                                        } else if (input?.trim()) {
                                            folderName = input.trim();
                                            createFolder(folderName);
                                        } else {
                                            return alert('❌ Incorrect input.');
                                        }
                                    }

                                    assignChatToFolder(chatId, folderName);
                                    alert(`✅ Chat added to folder "${folderName}"`);
                                };

                                if (![...dropdownItems].some(item => item.textContent === newItem.textContent)) {
                                    dropdownItems[0].parentNode.appendChild(newItem);
                                }
                            }
                        }, 0);
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

})();
