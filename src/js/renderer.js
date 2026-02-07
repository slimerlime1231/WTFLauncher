window.onerror = function (message, source, lineno, colno, error) {
    alert("CRITICAL SCRIPT ERROR: " + message + "\nLine: " + lineno + "\nSource: " + source);
};

const state = {
    settings: null,
    accounts: [],
    selectedAccountId: null,
    versions: [],
    filteredVersions: [],
    currentFilter: 'release',
    selectedModloader: 'vanilla',
    modloaderVersions: [],
    isLaunching: false,
    isPlaying: false,
    modpackSearchTimeout: null,
    currentModpackPlatform: 'modrinth',
    currentModpackSort: 'relevance',
    modSearchTimeout: null,
    currentModPlatform: 'modrinth',
    currentModSort: 'relevance',

    resourcePackSearchTimeout: null,
    currentResourcePackPlatform: 'modrinth',
    currentResourcePackSort: 'relevance',

    modpackOffset: 0,
    modpackLoading: false,
    modOffset: 0,
    modLoading: false,
    resourcePackOffset: 0,
    resourcePackLoading: false,

    servers: [],
    news: { launcher: [], minecraft: [] },
    currentNewsTab: 'launcher'
};

function showMainModal(options) {
    return new Promise((resolve) => {
        const { title, message, type = 'alert', placeholder = '' } = options;

        elements.modalTitle.textContent = title || 'Notification';
        elements.modalMessage.textContent = message || '';
        elements.modalInput.value = '';

        elements.modalInput.classList.add('hidden');
        elements.modalBtnCancel.classList.add('hidden');

        if (type === 'prompt') {
            elements.modalInput.classList.remove('hidden');
            elements.modalInput.placeholder = placeholder;
            elements.modalBtnCancel.classList.remove('hidden');
            elements.modalInput.focus();
        } else if (type === 'confirm') {
            elements.modalBtnCancel.classList.remove('hidden');
        }

        elements.customModal.classList.remove('hidden');

        const close = () => {
            elements.customModal.classList.add('hidden');
            cleanup();
        };

        const confirm = () => {
            const value = elements.modalInput.value;
            close();
            resolve({ success: true, value });
        };

        const cancel = () => {
            close();
            resolve({ success: false });
        };

        const onConfirm = () => confirm();
        const onCancel = () => cancel();
        const onKey = (e) => {
            if (e.key === 'Enter') confirm();
            if (e.key === 'Escape') cancel();
        };

        elements.modalBtnConfirm.onclick = onConfirm;
        elements.modalBtnCancel.onclick = onCancel;
        elements.closeCustomModal.onclick = onCancel;
        if (type === 'prompt') {
            elements.modalInput.onkeydown = onKey;
        }

        function cleanup() {
            elements.modalBtnConfirm.onclick = null;
            elements.modalBtnCancel.onclick = null;
            elements.closeCustomModal.onclick = null;
            elements.modalInput.onkeydown = null;
        }
    });
}

let elements = {};

function initializeElements() {
    elements = {
        navItems: document.querySelectorAll('.nav-item'),
        pages: document.querySelectorAll('.page'),

        btnMinimize: document.getElementById('btn-minimize'),
        btnMaximize: document.getElementById('btn-maximize'),
        btnClose: document.getElementById('btn-close'),
        btnDiscord: document.getElementById('btn-discord'), btnTitleSettings: document.getElementById('btn-title-settings'),
        currentAccount: document.getElementById('current-account'),

        profileSelect: document.getElementById('profile-select'),
        deleteProfileBtn: document.getElementById('delete-profile-btn'),
        launchBtn: document.getElementById('launch-btn'),
        progressContainer: document.getElementById('progress-container'),
        progressFill: document.getElementById('progress-fill'),
        progressTask: document.getElementById('progress-task'),
        progressPercent: document.getElementById('progress-percent'),

        versionSelect: document.getElementById('version-select'),
        filterBtns: document.querySelectorAll('.filter-btn'),
        modloaderBtns: document.querySelectorAll('.modloader-btn'),
        modloaderVersionSelect: document.getElementById('modloader-version-select'),
        btnCreateProfile: document.getElementById('btn-create-profile'),

        loginOverlay: document.getElementById('login-overlay'),
        btnLoginMicrosoft: document.getElementById('btn-login-microsoft'),
        btnLoginOffline: document.getElementById('btn-login-offline'),
        loginOfflineUsername: document.getElementById('login-offline-username'),
        mainContainer: document.querySelector('.main-container'),

        btnMicrosoft: document.getElementById('btn-microsoft'),
        btnOffline: document.getElementById('btn-offline'),
        offlineUsername: document.getElementById('offline-username'),
        accountsList: document.getElementById('accounts-list'),

        settingTheme: document.getElementById('setting-theme'),
        settingAccentColor: document.getElementById('setting-accent-color'),
        accentPresets: document.querySelectorAll('.accent-preset'),
        settingLanguage: document.getElementById('setting-language'),
        settingGamePath: document.getElementById('setting-game-path'),
        btnBrowsePath: document.getElementById('btn-browse-path'),
        btnOpenPath: document.getElementById('btn-open-path'),

        settingJavaPath: document.getElementById('setting-java-path'),
        btnBrowseJava: document.getElementById('btn-browse-java'),

        settingMinMemory: document.getElementById('setting-min-memory'),
        settingMaxMemory: document.getElementById('setting-max-memory'),
        minMemoryValue: document.getElementById('min-memory-value'),
        maxMemoryValue: document.getElementById('max-memory-value'),
        settingJavaArgs: document.getElementById('setting-java-args'),
        btnSaveSettings: document.getElementById('btn-save-settings'),

        tabBtns: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        modpackSearchInput: document.getElementById('modpack-search-input'),
        platformBtns: document.querySelectorAll('.platform-btn'),
        modpackSortSelect: document.getElementById('modpack-sort-select'),
        modpackGrid: document.getElementById('modpack-grid'),
        modpackVersionModal: document.getElementById('modpack-version-modal'),
        modpackVersionList: document.getElementById('modpack-version-list'),
        closeVersionModal: document.getElementById('close-version-modal'),

        modSearchInput: document.getElementById('mod-search-input'),
        modPlatformBtns: document.querySelectorAll('#tab-mods .platform-btn'),
        modSortSelect: document.getElementById('mod-sort-select'),
        modGrid: document.getElementById('mod-grid'),
        modVersionModal: document.getElementById('mod-version-modal'),
        modVersionList: document.getElementById('mod-version-list'),
        closeModVersionModal: document.getElementById('close-mod-version-modal'),

        resourcePackSearchInput: document.getElementById('resourcepacks-search-input'),
        resourcePackPlatformBtns: document.querySelectorAll('#tab-resourcepacks .platform-btn'),
        resourcePackSortSelect: document.getElementById('resourcepacks-sort-select'),
        resourcePackGrid: document.getElementById('resourcepacks-grid'),

        sidebarProfilesList: document.getElementById('sidebar-profiles-list'),
        btnSidebarSettings: document.getElementById('btn-sidebar-settings'),
        easterEggImage: document.getElementById('easter-egg-image'),

        newsTabs: document.querySelectorAll('.news-tab'),
        newsContent: document.getElementById('news-content'),

        mainProfileTabs: document.querySelectorAll('.main-tabs-container .tab-btn'),
        profileSections: document.querySelectorAll('.section-content'),
        profilesManagementGrid: document.getElementById('profiles-management-grid'),

        monitoringGrid: document.getElementById('monitoring-grid'),

        customModal: document.getElementById('custom-modal'),
        modalTitle: document.getElementById('modal-title'),
        modalMessage: document.getElementById('modal-message'),
        modalInput: document.getElementById('modal-input'),
        modalBtnConfirm: document.getElementById('modal-btn-confirm'),
        modalBtnCancel: document.getElementById('modal-btn-cancel'),
        closeCustomModal: document.getElementById('close-custom-modal'),

        profileSettingsModal: document.getElementById('profile-settings-modal'),
        profileNameInput: document.getElementById('profile-name-input'),
        profileMinMemory: document.getElementById('profile-min-memory'),
        profileMaxMemory: document.getElementById('profile-max-memory'),
        profileMinMemoryValue: document.getElementById('profile-min-memory-value'),
        profileMaxMemoryValue: document.getElementById('profile-max-memory-value'),
        profileIconPreview: document.getElementById('profile-icon-preview'),
        btnChangeIcon: document.getElementById('btn-change-icon'),
        btnOpenProfileFolder: document.getElementById('btn-open-profile-folder'),
        profileSettingsCancel: document.getElementById('profile-settings-cancel'),
        profileSettingsSave: document.getElementById('profile-settings-save'),
        closeProfileSettings: document.getElementById('close-profile-settings'),

        serverModal: document.getElementById('server-modal'),
        serverNameInput: document.getElementById('server-name-input'),
        serverIpInput: document.getElementById('server-ip-input'),
        btnAddServer: document.getElementById('btn-add-server'),
        serverModalCancel: document.getElementById('server-modal-cancel'),
        serverModalSave: document.getElementById('server-modal-save'),
        closeServerModal: document.getElementById('close-server-modal')
    };
}

async function init() {
    try {
        initializeElements();

        setupEventListeners();
        setupIPCListeners();
        if (typeof setupProfileSettingsListeners === 'function') {
            setupProfileSettingsListeners();
        }

        window.i18n.onLanguageChange(() => {
            if (typeof renderAccounts === 'function') renderAccounts();
            if (typeof updateCurrentAccount === 'function') updateCurrentAccount();
            if (typeof loadInstalledProfiles === 'function') loadInstalledProfiles();
            if (typeof renderServers === 'function') renderServers();
            if (typeof renderNews === 'function') renderNews();
        });

        state.settings = await window.electronAPI.getSettings();

        document.documentElement.setAttribute('data-theme', state.settings.theme);

        await window.i18n.loadLanguage(state.settings.language);

        await loadAccounts();

        if (state.accounts.length === 0) {
            showLoginOverlay();
        } else {
            hideLoginOverlay();
            switchPage('home');
        }

        try {
            await loadInstalledProfiles();
            await loadVersions();
            await loadNews();
            await loadServers();
        } catch (err) {
            // Silently fail
        }

        if (state.settings.accentColor && window.applyAccentColor) {
            window.applyAccentColor(state.settings.accentColor);
        }

        if (typeof applySettingsToUI === 'function') {
            applySettingsToUI();
        } else {
            // Fallback init
            elements.settingTheme.value = state.settings.theme;
            if (state.settings.accentColor) elements.settingAccentColor.value = state.settings.accentColor;
            if (state.settings.backgroundColor) elements.settingBgColor.value = state.settings.backgroundColor;
            if (state.settings.backgroundImage) elements.settingBgImage.value = state.settings.backgroundImage;
            elements.settingLanguage.value = state.settings.language;
            elements.settingGamePath.value = state.settings.gamePath;
            if (state.settings.javaPath) elements.settingJavaPath.value = state.settings.javaPath;
            elements.settingMinMemory.value = state.settings.minMemory;
            elements.minMemoryValue.textContent = `${state.settings.minMemory} MB`;
            elements.settingMaxMemory.value = state.settings.maxMemory;
            elements.maxMemoryValue.textContent = `${state.settings.maxMemory} MB`;
            if (state.settings.javaArgs) elements.settingJavaArgs.value = state.settings.javaArgs;
        }

    } catch (error) {
        alert("Ошибка запуска: " + error.message);
    }
}

function showLoginOverlay() {
    if (elements.loginOverlay && elements.mainContainer) {
        elements.loginOverlay.classList.remove('hidden');
        elements.mainContainer.classList.add('hidden');
    }
}

function hideLoginOverlay() {
    if (elements.loginOverlay && elements.mainContainer) {
        elements.loginOverlay.classList.add('hidden');
        elements.mainContainer.classList.remove('hidden');
    }
}

async function loginOverlayMicrosoft() {
    elements.btnLoginMicrosoft.disabled = true;
    elements.btnLoginMicrosoft.innerHTML = '<span class="auth-icon">⏳</span><span>' + window.i18n.t('home.loading') + '</span>';

    try {
        const result = await window.electronAPI.loginMicrosoft();
        if (result.success) {
            await loadAccounts();
            hideLoginOverlay();
            switchPage('home');
        } else {
            alert(window.i18n.t('errors.loginFailed') + ': ' + result.error);
        }
    } catch (error) {
        alert(window.i18n.t('errors.loginFailed') + ': ' + error.message);
    }

    if (!elements.loginOverlay.classList.contains('hidden')) {
        elements.btnLoginMicrosoft.disabled = false;
        elements.btnLoginMicrosoft.innerHTML = '<span class="auth-icon">🔷</span><span data-i18n="accounts.microsoft">' + window.i18n.t('accounts.microsoft') + '</span>';
    }
}

async function loginOverlayOffline() {
    const username = elements.loginOfflineUsername.value.trim();

    if (username.length < 1) {
        alert(window.i18n.t('errors.invalidUsername'));
        return;
    }

    try {
        const result = await window.electronAPI.loginOffline(username);
        if (result.success) {
            elements.loginOfflineUsername.value = '';
            await loadAccounts();
            hideLoginOverlay();
            switchPage('home');
        }
    } catch (error) {
        alert("Login Error: " + error.message);
    }
}

async function loadInstalledProfiles() {

    const profiles = state.settings.profiles || [];

    elements.profileSelect.innerHTML = '';

    if (profiles.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = window.i18n.t('home.noProfiles');
        elements.profileSelect.appendChild(option);
    } else {
        profiles.forEach((profile, index) => {
            const option = document.createElement('option');
            option.value = index; option.textContent = profile.name || `${profile.version} ${profile.modloader !== 'vanilla' ? profile.modloader : ''}`;
            elements.profileSelect.appendChild(option);
        });

        if (state.settings.lastProfileIndex !== undefined && state.settings.lastProfileIndex < profiles.length) {
            elements.profileSelect.value = state.settings.lastProfileIndex;
        } else {
            elements.profileSelect.value = 0;
            if (profiles.length > 0) window.electronAPI.saveLastProfileIndex(0);
        }
    }

    renderSidebarProfiles(profiles);
    renderProfilesManagement(profiles);
}

async function createProfile() {
    const version = elements.versionSelect.value;
    if (!version) return;

    const modloader = state.selectedModloader;
    const modloaderVersion = modloader !== 'vanilla' ? elements.modloaderVersionSelect.value : null;

    const profile = {
        name: `${version} ${modloader !== 'vanilla' ? `(${modloader})` : ''}`,
        version: version,
        versionType: state.currentFilter,
        modloader: modloader,
        modloaderVersion: modloaderVersion,
        created: Date.now()
    };

    elements.btnCreateProfile.disabled = true;


    try {
        const downloadResult = await window.electronAPI.installVanillaVersion({
            version: version,
            versionType: state.currentFilter,
            modloader: modloader,
            modloaderVersion: modloaderVersion
        });

        if (!downloadResult.success) {
            alert(`Ошибка загрузки: ${downloadResult.error}`);
            return;
        }

        if (!state.settings.profiles) state.settings.profiles = [];
        state.settings.profiles.push(profile);
        state.settings.lastProfileIndex = state.settings.profiles.length - 1;

        await window.electronAPI.saveSettings(state.settings);
        await loadInstalledProfiles();

        showToast(`Версия ${profile.name} успешно установлена!`, 'success');
    } catch (err) {
        alert(`Ошибка: ${err.message}`);
    } finally {
        setTimeout(() => {
            elements.progressContainer.classList.add('hidden');
            elements.btnCreateProfile.disabled = false;
        }, 2000);
    }
}


function setupEventListeners() {
    if (elements.btnLoginMicrosoft) elements.btnLoginMicrosoft.addEventListener('click', loginOverlayMicrosoft);
    if (elements.btnLoginOffline) {
        elements.btnLoginOffline.addEventListener('click', () => {
            loginOverlayOffline();
        });
    }

    if (elements.loginOfflineUsername) {
        elements.loginOfflineUsername.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginOverlayOffline();
        });
    }

    if (elements.btnMinimize) elements.btnMinimize.addEventListener('click', () => window.electronAPI.minimize());
    if (elements.btnMaximize) elements.btnMaximize.addEventListener('click', () => window.electronAPI.maximize());
    if (elements.btnClose) elements.btnClose.addEventListener('click', () => window.electronAPI.close());
    if (elements.btnDiscord) {
        elements.btnDiscord.addEventListener('click', () => {
            window.electronAPI.openExternal('https://discord.gg/sCntAxZrV7');
        });
    }

    if (elements.btnTitleSettings) {
        elements.btnTitleSettings.addEventListener('click', () => {
            switchPage('settings');
        });
    }

    elements.navItems.forEach(item => {
        item.addEventListener('click', () => switchPage(item.dataset.page));
    });

    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => filterVersions(btn.dataset.filter));
    });

    elements.modloaderBtns.forEach(btn => {
        btn.addEventListener('click', () => selectModloader(btn.dataset.loader));
    });

    elements.versionSelect.addEventListener('change', () => {
        if (state.selectedModloader !== 'vanilla') {
            loadModloaderVersions();
        }
    });

    elements.btnCreateProfile.addEventListener('click', createProfile);

    elements.launchBtn.addEventListener('click', () => {
        if (state.isPlaying) {
            stopGame();
        } else {
            launchGame();
        }
    });

    elements.currentAccount.addEventListener('click', () => switchPage('accounts'));
    elements.currentAccount.style.cursor = 'pointer';

    if (elements.deleteProfileBtn) {
        elements.deleteProfileBtn.addEventListener('click', async () => {
            const index = elements.profileSelect.value;
            if (index === "" || index === null) return;

            if (confirm(window.i18n.t('home.deleteConfirm'))) {
                const success = await window.electronAPI.deleteProfile(parseInt(index));
                if (success) {
                    state.settings = await window.electronAPI.getSettings();
                    await loadInstalledProfiles();
                }
            }
        });
    }

    elements.btnMicrosoft.addEventListener('click', loginMicrosoft);
    elements.btnOffline.addEventListener('click', loginOffline);

    elements.settingTheme.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.target.value);
    });

    // Accent Color Logic
    const applyAccentColor = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        document.documentElement.style.setProperty('--accent', hex);
        // Slightly brighter for hover
        document.documentElement.style.setProperty('--accent-hover', adjustColorBrightness(hex, 15));
        // Opacity for glow
        document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.4)`);

        elements.settingAccentColor.value = hex;
    };

    function adjustColorBrightness(hex, percent) {
        let r = parseInt(hex.substring(1, 3), 16);
        let g = parseInt(hex.substring(3, 5), 16);
        let b = parseInt(hex.substring(5, 7), 16);

        r = parseInt(r * (100 + percent) / 100);
        g = parseInt(g * (100 + percent) / 100);
        b = parseInt(b * (100 + percent) / 100);

        r = (r < 255) ? r : 255;
        g = (g < 255) ? g : 255;
        b = (b < 255) ? b : 255;

        const rr = ((r.toString(16).length == 1) ? "0" + r.toString(16) : r.toString(16));
        const gg = ((g.toString(16).length == 1) ? "0" + g.toString(16) : g.toString(16));
        const bb = ((b.toString(16).length == 1) ? "0" + b.toString(16) : b.toString(16));

        return "#" + rr + gg + bb;
    }

    elements.settingAccentColor.addEventListener('input', (e) => {
        applyAccentColor(e.target.value);
    });

    elements.accentPresets.forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.dataset.color;
            applyAccentColor(color);
        });
    });

    // Make applyAccentColor globally available for init
    window.applyAccentColor = applyAccentColor;


    elements.settingLanguage.addEventListener('change', async (e) => {
        await window.i18n.loadLanguage(e.target.value);
    });

    elements.btnBrowsePath.addEventListener('click', async () => {
        const path = await window.electronAPI.selectFolder();
        if (path) {
            elements.settingGamePath.value = path;
        }
    });

    elements.btnOpenPath.addEventListener('click', () => {
        const path = elements.settingGamePath.value;
        if (path) {
            window.electronAPI.openFolder(path);
        }
    });

    elements.btnBrowseJava.addEventListener('click', async () => {
        const path = await window.electronAPI.selectFile({
            title: window.i18n.t('settings.selectJava'),
            filters: [{ name: 'Java Executable', extensions: ['exe'] }]
        });
        if (path) {
            elements.settingJavaPath.value = path;
        }
    });

    elements.settingMinMemory.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        elements.minMemoryValue.textContent = `${value} MB`;

        if (value > parseInt(elements.settingMaxMemory.value)) {
            elements.settingMaxMemory.value = value;
            elements.maxMemoryValue.textContent = `${value} MB`;
        }
    });

    elements.settingMaxMemory.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        elements.maxMemoryValue.textContent = `${value} MB`;

        if (value < parseInt(elements.settingMinMemory.value)) {
            elements.settingMinMemory.value = value;
            elements.minMemoryValue.textContent = `${value} MB`;
        }
    });

    elements.btnSaveSettings.addEventListener('click', saveSettings);

    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;

            elements.tabBtns.forEach(b => b.classList.toggle('active', b === btn));
            elements.tabContents.forEach(c => c.classList.toggle('active', c.id === target));

            if (target === 'tab-modpacks' && elements.modpackGrid.children.length <= 1) {
                searchModpacks();
            }
            if (target === 'tab-mods' && elements.modGrid && elements.modGrid.children.length <= 1) {
                searchMods();
            }
            if (target === 'tab-resourcepacks' && elements.resourcePackGrid && elements.resourcePackGrid.children.length <= 1) {
                searchResourcePacks();
            }
        });
    });

    elements.modpackSearchInput.addEventListener('input', (e) => {
        clearTimeout(state.modpackSearchTimeout);
        state.modpackSearchTimeout = setTimeout(() => {
            searchModpacks();
        }, 600);
    });

    elements.platformBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentModpackPlatform = btn.dataset.platform;
            elements.platformBtns.forEach(b => b.classList.toggle('active', b === btn));
            searchModpacks();
        });
    });

    elements.modpackSortSelect.addEventListener('change', (e) => {
        state.currentModpackSort = e.target.value;
        searchModpacks();
    });

    elements.closeVersionModal.addEventListener('click', () => {
        elements.modpackVersionModal.classList.add('hidden');
        if (elements.modpackSearchInput) {
            const h = elements.modpackSearchInput.closest('.modpacks-header');
            if (h) {
                h.classList.remove('instant-hidden');
                h.style.visibility = '';
            }
        }
    });

    window.onclick = (event) => {
        if (event.target === elements.modpackVersionModal) {
            elements.modpackVersionModal.classList.add('hidden');
            if (elements.modpackSearchInput) {
                const h = elements.modpackSearchInput.closest('.modpacks-header');
                if (h) {
                    h.classList.remove('instant-hidden');
                    h.style.visibility = '';
                }
            }
        }
        if (event.target === elements.modVersionModal) {
            elements.modVersionModal.classList.add('hidden');
            if (elements.modSearchInput) {
                const h = elements.modSearchInput.closest('.modpacks-header');
                if (h) {
                    h.classList.remove('instant-hidden');
                    h.style.visibility = ''; h.style.transition = '';
                }
            }
            if (elements.resourcePackSearchInput) {
                const h = elements.resourcePackSearchInput.closest('.modpacks-header');
                if (h) {
                    h.classList.remove('instant-hidden');
                    h.style.visibility = ''; h.style.transition = '';
                }
            }
        }
    };

    if (elements.modSearchInput) {
        elements.modSearchInput.addEventListener('input', () => {
            clearTimeout(state.modSearchTimeout);
            state.modSearchTimeout = setTimeout(() => {
                searchMods();
            }, 600);
        });
    }

    if (elements.modSortSelect) {
        elements.modSortSelect.addEventListener('change', (e) => {
            state.currentModSort = e.target.value;
            searchMods();
        });
    }

    if (elements.modPlatformBtns) {
        elements.modPlatformBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                state.currentModPlatform = btn.dataset.platform;
                elements.modPlatformBtns.forEach(b => b.classList.toggle('active', b === btn));
                searchMods();
            });
        });
    }

    if (elements.closeModVersionModal) {
        elements.closeModVersionModal.addEventListener('click', () => {
            elements.modVersionModal.classList.add('hidden');
            if (elements.modSearchInput) {
                const h = elements.modSearchInput.closest('.modpacks-header');
                if (h) {
                    h.classList.remove('instant-hidden');
                    h.style.visibility = ''; h.style.transition = '';
                }
            }
            if (elements.resourcePackSearchInput) {
                const h = elements.resourcePackSearchInput.closest('.modpacks-header');
                if (h) {
                    h.classList.remove('instant-hidden');
                    h.style.visibility = ''; h.style.transition = '';
                }
            }
        });
    }

    if (elements.btnSidebarSettings) {
        elements.btnSidebarSettings.addEventListener('click', (e) => {
            e.stopPropagation(); switchPage('settings');
        });
    }

    if (elements.resourcePackSearchInput) {
        elements.resourcePackSearchInput.addEventListener('input', () => {
            clearTimeout(state.resourcePackSearchTimeout);
            state.resourcePackSearchTimeout = setTimeout(() => {
                searchResourcePacks();
            }, 600);
        });
    }

    if (elements.resourcePackSortSelect) {
        elements.resourcePackSortSelect.addEventListener('change', (e) => {
            state.currentResourcePackSort = e.target.value;
            searchResourcePacks();
        });
    }

    if (elements.resourcePackPlatformBtns) {
        elements.resourcePackPlatformBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                state.currentResourcePackPlatform = btn.dataset.platform;
                elements.resourcePackPlatformBtns.forEach(b => b.classList.toggle('active', b === btn));
                searchResourcePacks();
            });
        });
    }

    if (elements.mainProfileTabs) {
        elements.mainProfileTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                elements.mainProfileTabs.forEach(b => b.classList.toggle('active', b === btn));
                elements.profileSections.forEach(s => s.classList.toggle('active', s.id === target));
            });
        });
    }

    const setupInfiniteScroll = (gridElement, searchFn) => {
        if (!gridElement) return;

        const scrollContainer = gridElement.closest('.page');
        if (!scrollContainer) return;

        if (gridElement._hasScrollListener) return;
        gridElement._hasScrollListener = true;

        scrollContainer.addEventListener('scroll', () => {
            if (gridElement.offsetParent === null) return;

            const scrollTop = scrollContainer.scrollTop;
            const scrollHeight = scrollContainer.scrollHeight;
            const clientHeight = scrollContainer.clientHeight;

            if (scrollTop + clientHeight >= scrollHeight - 200) {
                searchFn(true);
            }
        });
    };

    let easterEggClicks = 0;
    const easterEggLimit = 10;
    let easterEggTimeout;

    const handleEasterEggClick = () => {
        clearTimeout(easterEggTimeout);
        easterEggClicks++;

        easterEggTimeout = setTimeout(() => {
            easterEggClicks = 0;
        }, 1000);

        if (easterEggClicks >= easterEggLimit) {
            elements.easterEggImage?.classList.add('easter-egg-visible');
            easterEggClicks = 0;
        }
    };

    elements.btnSidebarSettings?.addEventListener('click', handleEasterEggClick);
    elements.btnTitleSettings?.addEventListener('click', handleEasterEggClick);

    elements.easterEggImage?.addEventListener('click', () => {
        elements.easterEggImage.classList.remove('easter-egg-visible');
    });

    setupInfiniteScroll(elements.modpackGrid, searchModpacks);
    setupInfiniteScroll(elements.modGrid, searchMods);
    setupInfiniteScroll(elements.resourcePackGrid, searchResourcePacks);

}

function setupIPCListeners() {
    window.electronAPI.onLaunchProgress((data) => {
        elements.progressContainer.classList.remove('hidden'); updateProgress(data);
    });

    window.electronAPI.onDownloadStatus((data) => {
        if (data.total > 0) {
            elements.progressContainer.classList.remove('hidden');
            const percent = Math.round((data.current / data.total) * 100);
            elements.progressFill.style.width = `${percent}%`;
            elements.progressPercent.textContent = `${percent}%`;

            // Fix: Show "Downloading..." if name is too long or looks like a hash
            if (data.name && (data.name.length > 30 || /^[a-f0-9]{32,}$/i.test(data.name))) {
                elements.progressTask.textContent = window.i18n.t('downloads.downloading') || "Downloading...";
            } else {
                elements.progressTask.textContent = data.name;
            }

        }
    });

    window.electronAPI.onGameStarted(() => {
        state.isLaunching = false;
        state.isPlaying = true;

        elements.launchBtn.disabled = false;
        elements.launchBtn.querySelector('.launch-text').textContent = window.i18n.t('home.close') || 'ЗАКРЫТЬ';

        elements.progressContainer.classList.add('hidden');
    });

    window.electronAPI.onGameClosed((code) => {
        state.isLaunching = false;
        state.isPlaying = false;

        elements.launchBtn.disabled = false;
        elements.launchBtn.style.background = ''; elements.launchBtn.querySelector('.launch-text').textContent = window.i18n.t('home.play');
        elements.progressContainer.classList.add('hidden');

        const serverBtns = document.querySelectorAll('.server-play-btn');
        serverBtns.forEach(btn => {
            btn.disabled = false;
            btn.textContent = window.i18n.t('monitoring.play') || 'Play';
        });
    });
}

async function stopGame() {
    await window.electronAPI.stopGame();
}

function switchPage(pageId) {
    elements.navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });

    elements.pages.forEach(page => {
        page.classList.toggle('active', page.id === `page-${pageId}`);
    });
}

async function loadVersions() {
    state.versions = await window.electronAPI.getVersions();
    filterVersions('release');
}

function filterVersions(type) {
    state.currentFilter = type;

    elements.filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === type);
    });

    if (type === 'old_beta') {
        state.filteredVersions = state.versions.filter(v =>
            v.type === 'old_beta' || v.type === 'old_alpha'
        );
    } else {
        state.filteredVersions = state.versions.filter(v => v.type === type);
    }

    elements.versionSelect.innerHTML = '';

    state.filteredVersions.slice(0, 100).forEach(version => {
        const option = document.createElement('option');
        option.value = version.id;
        option.textContent = version.id;
        elements.versionSelect.appendChild(option);

    });

    if (state.selectedModloader !== 'vanilla') {
        loadModloaderVersions();
    }
}

function selectModloader(loader) {
    state.selectedModloader = loader;

    elements.modloaderBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.loader === loader);
    });

    if (loader === 'vanilla') {
        elements.modloaderVersionSelect.classList.add('hidden');
    } else {
        elements.modloaderVersionSelect.classList.remove('hidden');
        loadModloaderVersions();
    }
}

async function loadModloaderVersions() {
    const mcVersion = elements.versionSelect.value;
    if (!mcVersion) return;

    elements.modloaderVersionSelect.innerHTML = '<option value="">' + window.i18n.t('home.loading') + '</option>';

    let versions = [];
    if (state.selectedModloader === 'fabric') {
        versions = await window.electronAPI.getFabricVersions(mcVersion);
        elements.modloaderVersionSelect.innerHTML = '';
        versions.forEach(v => {
            const option = document.createElement('option');
            option.value = v.loader;
            option.textContent = `${v.loader}${v.stable ? ' (stable)' : ''}`;
            elements.modloaderVersionSelect.appendChild(option);
        });
    } else if (state.selectedModloader === 'forge') {
        versions = await window.electronAPI.getForgeVersions(mcVersion);
        elements.modloaderVersionSelect.innerHTML = '';
        versions.forEach(v => {
            const option = document.createElement('option');
            option.value = v.version;
            option.textContent = `${v.version} (${v.type})`;
            elements.modloaderVersionSelect.appendChild(option);
        });
    }

    if (versions.length === 0) {
        elements.modloaderVersionSelect.innerHTML = '<option value="">' + window.i18n.t('home.selectVersion') + '</option>';
    }
}

async function searchModpacks(append = false) {
    const query = elements.modpackSearchInput.value.trim();
    const platform = state.currentModpackPlatform;
    const sort = state.currentModpackSort;

    if (!append) {
        state.modpackOffset = 0;
        elements.modpackGrid.innerHTML = `
            <div class="loading-placeholder">
                <div class="spinner"></div>
            </div>
        `;
    }

    if (state.modpackLoading) return;
    state.modpackLoading = true;

    try {
        const results = await window.electronAPI.searchModpacks({ query, platform, sort, offset: state.modpackOffset });
        renderModpacks(results, append);
        state.modpackOffset += results.length;
    } catch (err) {
        if (!append) {
            elements.modpackGrid.innerHTML = `<div class="error-msg">Ошибка поиска: ${err.message}</div>`;
        }
    } finally {
        state.modpackLoading = false;
    }
}

function renderModpacks(modpacks, append = false) {
    if (!modpacks || modpacks.length === 0) {
        if (!append) {
            elements.modpackGrid.innerHTML = `<div class="no-results">Модпаки не найдены</div>`;
        }
        return;
    }

    if (!append) {
        elements.modpackGrid.innerHTML = '';
    }
    modpacks.forEach(modpack => {
        const card = document.createElement('div');
        card.className = 'modpack-card';

        const downloadsFormatted = modpack.downloads ? (modpack.downloads > 1000000 ? (modpack.downloads / 1000000).toFixed(1) + 'M' : (modpack.downloads / 1000).toFixed(0) + 'K') : '0';

        card.innerHTML = `
            <div class="modpack-thumbnail">
                <img src="${modpack.thumbnail || ''}" onerror="this.onerror=null;this.src='https://dummyimage.com/300x170/333/fff.png&text=No+Image';" alt="${modpack.title}">
                <div class="modpack-badge">${modpack.platform.toUpperCase()}</div>
            </div>
            <div class="modpack-info">
                <div class="modpack-title" title="${modpack.title}">${modpack.title}</div>
                <div class="modpack-author">by ${modpack.author}</div>
                <div class="modpack-stats">
                    <span class="stat-item">📥 ${downloadsFormatted}</span>
                    <span class="stat-item">${modpack.follows ? `⭐ ${modpack.follows}` : ''}</span>
                </div>
            </div>
            <button class="modpack-install-btn" data-id="${modpack.id}" data-platform="${modpack.platform}">
                ${window.i18n.t('downloads.install')}
            </button>
        `;

        card.querySelector('.modpack-install-btn').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const platform = e.target.dataset.platform;
            showVersionPicker(id, platform);
        });

        elements.modpackGrid.appendChild(card);
    });
}

async function showVersionPicker(id, platform) {
    elements.modpackVersionModal.classList.remove('hidden');
    if (elements.modpackSearchInput) {
        const h = elements.modpackSearchInput.closest('.modpacks-header');
        if (h) h.classList.add('instant-hidden');
    }
    elements.modpackVersionList.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div></div>';

    try {
        const versions = await window.electronAPI.getModpackVersions({ id, platform });
        renderVersions(id, platform, versions);
    } catch (err) {
        elements.modpackVersionList.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

function renderVersions(id, platform, versions) {
    elements.modpackVersionList.innerHTML = '';

    if (versions.length === 0) {
        elements.modpackVersionList.innerHTML = '<div class="no-versions">No versions found</div>';
        return;
    }

    versions.slice(0, 500).forEach(version => {
        const item = document.createElement('div');
        item.className = 'version-item';

        const date = new Date(version.date).toLocaleDateString();
        const loaders = version.loaders && version.loaders.length > 0 ? version.loaders.join(', ') : '';
        const mcVers = version.mc_versions ? version.mc_versions.join(', ') : '';

        item.innerHTML = `
            <div class="version-item-info">
                <span class="version-item-name">${version.name || version.version_number}</span>
                <span class="version-item-meta">MC: ${mcVers} ${loaders ? `| ${loaders}` : ''} | ${date}</span>
            </div>
            <span class="version-item-type ${version.type}">${version.type}</span>
        `;

        item.addEventListener('click', () => {
            elements.modpackVersionModal.classList.add('hidden');
            if (elements.modpackSearchInput) {
                const h = elements.modpackSearchInput.closest('.modpacks-header');
                if (h) {
                    h.classList.remove('instant-hidden');
                    h.style.visibility = '';
                }
            }
            installModpack(id, platform, version.id);
        });

        elements.modpackVersionList.appendChild(item);
    });
}

async function installModpack(id, platform, versionId = null) {
    if (state.isLaunching || state.isPlaying) return;

    elements.progressFill.style.width = '0%';
    elements.progressPercent.textContent = '0%';

    const btns = document.querySelectorAll('.modpack-install-btn');
    btns.forEach(b => b.disabled = true);

    try {
        const result = await window.electronAPI.installModpack({ id, platform, versionId });

        if (result.success) {
            state.settings = await window.electronAPI.getSettings();
            await loadInstalledProfiles();

            showToast(`Модпак ${result.profile.name} успешно установлен!`, 'success');
        } else {
            alert(`Ошибка установки: ${result.error}`);
        }
    } catch (err) {
        alert(`Произошла критическая ошибка при установке: ${err.message}`);
    } finally {
        elements.progressContainer.classList.add('hidden');
        btns.forEach(b => b.disabled = false);
    }
}

async function searchMods(append = false) {
    const query = elements.modSearchInput?.value || '';

    if (!append) {
        state.modOffset = 0;
        if (elements.modGrid) {
            elements.modGrid.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div></div>';
        }
    }

    if (state.modLoading) return;
    state.modLoading = true;

    try {
        const mods = await window.electronAPI.searchMods({
            query: query,
            platform: state.currentModPlatform,
            sort: state.currentModSort,
            offset: state.modOffset
        });

        renderMods(mods, append);
        state.modOffset += mods.length;
    } catch (err) {
        if (!append && elements.modGrid) {
            elements.modGrid.innerHTML = `<div class="error-msg">Search failed: ${err.message}</div>`;
        }
    } finally {
        state.modLoading = false;
    }
}

function renderMods(mods, append = false) {
    if (!elements.modGrid) return;
    if (!append) {
        elements.modGrid.innerHTML = '';
    }

    if (mods.length === 0) {
        if (!append) {
            elements.modGrid.innerHTML = '<div class="loading-placeholder">No mods found</div>';
        }
        return;
    }

    mods.forEach(mod => {
        const card = document.createElement('div');
        card.className = 'modpack-card';

        const downloadCount = mod.downloads >= 1000000
            ? (mod.downloads / 1000000).toFixed(1) + 'M'
            : mod.downloads >= 1000
                ? (mod.downloads / 1000).toFixed(1) + 'K'
                : mod.downloads;

        const platform = mod.platform || 'modrinth';

        card.innerHTML = `
            <div class="modpack-thumbnail">
                <img src="${mod.thumbnail || ''}" onerror="this.onerror=null;this.src='https://dummyimage.com/300x170/333/fff.png&text=No+Image';" alt="${mod.title}">
                <div class="modpack-badge">${platform.toUpperCase()}</div>
            </div>
            <div class="modpack-info">
                <div class="modpack-title">${mod.title}</div>
                <div class="modpack-author">by ${mod.author || 'Unknown'}</div>
                <div class="modpack-stats">
                    <span>⬇️ ${downloadCount}</span>
                </div>
            </div>
            <button class="modpack-install-btn" data-mod-id="${mod.id}">${window.i18n.t('downloads.downloadMod') || 'Download'}</button>
        `;

        const installBtn = card.querySelector('.modpack-install-btn');
        installBtn.addEventListener('click', () => showModVersionPicker(mod.id, platform));

        elements.modGrid.appendChild(card);
    });
}

async function searchResourcePacks(append = false) {
    const query = elements.resourcePackSearchInput?.value || '';

    if (!append) {
        state.resourcePackOffset = 0;
        if (elements.resourcePackGrid) {
            elements.resourcePackGrid.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div></div>';
        }
    }

    if (state.resourcePackLoading) return;
    state.resourcePackLoading = true;

    try {
        const packs = await window.electronAPI.searchMods({
            query: query,
            platform: state.currentResourcePackPlatform,
            sort: state.currentResourcePackSort,
            type: 'resourcepack',
            offset: state.resourcePackOffset
        });

        renderResourcePacks(packs, append);
        state.resourcePackOffset += packs.length;
    } catch (err) {
        if (!append && elements.resourcePackGrid) {
            elements.resourcePackGrid.innerHTML = `<div class="error-msg">Search failed: ${err.message}</div>`;
        }
    } finally {
        state.resourcePackLoading = false;
    }
}

function renderResourcePacks(packs, append = false) {
    if (!elements.resourcePackGrid) return;
    if (!append) {
        elements.resourcePackGrid.innerHTML = '';
    }

    if (packs.length === 0) {
        if (!append) {
            elements.resourcePackGrid.innerHTML = '<div class="loading-placeholder" data-i18n="downloads.noResults">No resource packs found</div>';
        }
        return;
    }

    packs.forEach(pack => {
        const card = document.createElement('div');
        card.className = 'modpack-card';

        const downloadCount = pack.downloads >= 1000000
            ? (pack.downloads / 1000000).toFixed(1) + 'M'
            : pack.downloads >= 1000
                ? (pack.downloads / 1000).toFixed(1) + 'K'
                : pack.downloads;

        const platform = pack.platform || 'modrinth';

        card.innerHTML = `
            <div class="modpack-thumbnail">
                <img src="${pack.thumbnail || ''}" onerror="this.onerror=null;this.src='https://dummyimage.com/300x170/333/fff.png&text=No+Image';" alt="${pack.title}">
                <div class="modpack-badge">${platform.toUpperCase()}</div>
            </div>
            <div class="modpack-info">
                <div class="modpack-title">${pack.title}</div>
                <div class="modpack-author">by ${pack.author || 'Unknown'}</div>
                <div class="modpack-stats">
                    <span>⬇️ ${downloadCount}</span>
                </div>
            </div>
            <button class="modpack-install-btn" data-pack-id="${pack.id}">${window.i18n.t('downloads.downloadMod') || 'Download'}</button>
        `;

        const installBtn = card.querySelector('.modpack-install-btn');
        installBtn.addEventListener('click', () => showModVersionPicker(pack.id, platform, 'resourcepack'));

        elements.resourcePackGrid.appendChild(card);
    });
}

async function showModVersionPicker(modId, platform = 'modrinth', type = 'mod') {
    elements.modVersionModal.classList.remove('hidden');

    const searchInputId = type === 'resourcepack' ? 'resourcepacks-search-input' : 'mod-search-input';
    const inputEl = document.getElementById(searchInputId);
    if (inputEl) {
        const header = inputEl.closest('.modpacks-header');
        if (header) {
            header.classList.add('instant-hidden');
        }
    }

    elements.modVersionList.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div></div>';

    try {
        const versions = await window.electronAPI.getModVersions({ id: modId, platform, type });
        renderModVersions(modId, versions, type);
    } catch (err) {
        elements.modVersionList.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

function renderModVersions(modId, versions, type = 'mod') {
    elements.modVersionList.innerHTML = '';

    if (versions.length === 0) {
        elements.modVersionList.innerHTML = '<div class="no-versions">No versions found</div>';
        return;
    }

    versions.slice(0, 100).forEach(version => {
        const item = document.createElement('div');
        item.className = 'version-item';

        const date = new Date(version.date).toLocaleDateString();
        const loaders = version.loaders && version.loaders.length > 0 ? version.loaders.join(', ') : '';
        const mcVers = version.mc_versions ? version.mc_versions.slice(0, 5).join(', ') : '';

        const primaryFile = version.files?.find(f => f.primary) || version.files?.[0];
        const fileName = primaryFile?.filename || `${version.version_number}.jar`;
        const downloadUrl = primaryFile?.url || '';

        item.innerHTML = `
            <div class="version-item-info">
                <span class="version-item-name">${version.name || version.version_number}</span>
                <span class="version-item-meta">MC: ${mcVers} ${loaders ? `| ${loaders}` : ''} | ${date}</span>
            </div>
            <span class="version-item-type ${version.type}">${version.type}</span>
        `;

        item.addEventListener('click', () => {
            elements.modVersionModal.classList.add('hidden');
            const searchInputId = type === 'resourcepack' ? 'resourcepacks-search-input' : 'mod-search-input';
            const inputEl = document.getElementById(searchInputId);
            if (inputEl) {
                const h = inputEl.closest('.modpacks-header');
                if (h) {
                    h.classList.remove('instant-hidden');
                    h.style.visibility = '';
                }
            }
            downloadMod(modId, version.id, fileName, downloadUrl, type);
        });

        elements.modVersionList.appendChild(item);
    });
}

async function downloadMod(modId, versionId, fileName, downloadUrl, type = 'mod') {
    if (!downloadUrl) {
        alert('Download URL not available');
        return;
    }

    elements.progressContainer.classList.remove('hidden');
    elements.progressFill.style.width = '0%';
    elements.progressPercent.textContent = '0%';

    try {
        const result = await window.electronAPI.downloadMod({
            modId,
            versionId,
            fileName,
            downloadUrl,
            type
        });

        if (result.success) {
            const successKey = type === 'resourcepack' ? 'downloads.downloadSuccessPack' : 'downloads.downloadSuccessMod';
            const defaultMsg = type === 'resourcepack' ? `Resource pack ${fileName} downloaded successfully!` : `Mod ${fileName} downloaded successfully!`;
            showToast(window.i18n.t(successKey, { name: fileName }) || defaultMsg, 'success');
        } else {
            alert(`Download failed: ${result.error}`);
        }
    } catch (err) {
        alert(`Download error: ${err.message}`);
    } finally {
        setTimeout(() => {
            elements.progressContainer.classList.add('hidden');
        }, 2000);
    }
}

async function loadAccounts() {
    state.accounts = await window.electronAPI.getAccounts();
    state.selectedAccountId = await window.electronAPI.getSelectedAccount();

    renderAccounts();
    updateCurrentAccount();

    await loadNews();
    await loadServers();
}

function renderAccounts() {
    elements.accountsList.innerHTML = '';

    state.accounts.forEach(account => {
        const card = document.createElement('div');
        card.className = `account-card${account.id === state.selectedAccountId ? ' selected' : ''}`;
        const skinUrl = `https://mc-heads.net/avatar/${account.name}/48`;
        card.innerHTML = `
            <img class="account-avatar" src="${skinUrl}" alt="Avatar">
            <div class="account-details">
                <span class="account-name">${account.name}</span>
                <span class="account-type">${account.type === 'microsoft'
                ? window.i18n.t('accounts.microsoftType')
                : window.i18n.t('accounts.offlineType')}</span>
            </div>
            <button class="remove-btn" data-id="${account.id}">${window.i18n.t('accounts.remove')}</button>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-btn')) {
                selectAccount(account.id);
            }
        });

        card.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeAccount(account.id);
        });

        elements.accountsList.appendChild(card);
    });
}

function updateCurrentAccount() {
    const account = state.accounts.find(a => a.id === state.selectedAccountId);

    if (account) {
        const skinUrl = `https://mc-heads.net/avatar/${account.name}/48`;
        elements.currentAccount.innerHTML = `
            <img class="account-avatar" src="${skinUrl}" alt="Avatar">
            <div class="account-info">
                <span class="account-name">${account.name}</span>
                <span class="account-type">${account.type === 'microsoft'
                ? window.i18n.t('accounts.microsoftType')
                : window.i18n.t('accounts.offlineType')}</span>
            </div>
        `;
    } else {
        elements.currentAccount.innerHTML = `
            <img class="account-avatar" src="https://mc-heads.net/avatar/MHF_Steve/48" alt="Avatar">
            <div class="account-info">
                <span class="account-name">${window.i18n.t('accounts.noAccount')}</span>
                <span class="account-type"></span>
            </div>
        `;
    }
}

async function selectAccount(accountId) {
    await window.electronAPI.selectAccount(accountId);
    state.selectedAccountId = accountId;
    renderAccounts();
    updateCurrentAccount();

    await loadNews();
    await loadServers();
}

async function removeAccount(accountId) {
    await window.electronAPI.removeAccount(accountId);
    await loadAccounts();
}

async function loginMicrosoft() {
    elements.btnMicrosoft.disabled = true;
    elements.btnMicrosoft.innerHTML = '<span class="auth-icon">⏳</span><span>' + window.i18n.t('home.loading') + '</span>';

    try {
        const result = await window.electronAPI.loginMicrosoft();

        if (result.success) {
            await loadAccounts();
        } else {
            alert(window.i18n.t('errors.loginFailed') + ': ' + result.error);
        }
    } catch (error) {
        alert(window.i18n.t('errors.loginFailed') + ': ' + error.message);
    }

    elements.btnMicrosoft.disabled = false;
    elements.btnMicrosoft.innerHTML = '<span class="auth-icon">🔷</span><span>' + window.i18n.t('accounts.microsoft') + '</span>';
}

async function loginOffline() {
    const username = elements.offlineUsername.value.trim();

    if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
        alert(window.i18n.t('errors.invalidUsername'));
        return;
    }

    const result = await window.electronAPI.loginOffline(username);

    if (result.success) {
        elements.offlineUsername.value = '';
        await loadAccounts();
    }
}

function applySettingsToUI() {
    elements.settingTheme.value = state.settings.theme;
    elements.settingLanguage.value = state.settings.language;
    elements.settingGamePath.value = state.settings.gamePath;
    elements.settingMinMemory.value = state.settings.minMemory;
    elements.settingMaxMemory.value = state.settings.maxMemory;
    elements.minMemoryValue.textContent = `${state.settings.minMemory} MB`;
    elements.maxMemoryValue.textContent = `${state.settings.maxMemory} MB`;
    elements.settingJavaArgs.value = state.settings.javaArgs || '';
}

async function saveSettings() {
    state.settings = {
        theme: elements.settingTheme.value,
        accentColor: elements.settingAccentColor.value,
        backgroundColor: elements.settingBgColor.value,
        backgroundImage: elements.settingBgImage.value,
        language: elements.settingLanguage.value,
        gamePath: elements.settingGamePath.value,
        javaPath: elements.settingJavaPath.value,
        minMemory: parseInt(elements.settingMinMemory.value),
        maxMemory: parseInt(elements.settingMaxMemory.value),
        javaArgs: elements.settingJavaArgs.value
    };

    await window.electronAPI.saveSettings(state.settings);

    const originalText = elements.btnSaveSettings.innerHTML;
    elements.btnSaveSettings.innerHTML = '<span>✓ ' + window.i18n.t('settings.saved') + '</span>';
    elements.btnSaveSettings.style.background = 'var(--success)';

    setTimeout(() => {
        elements.btnSaveSettings.innerHTML = originalText;
        elements.btnSaveSettings.style.background = '';
    }, 2000);
}

async function launchGame() {
    if (!state.selectedAccountId) {
        alert(window.i18n.t('errors.noAccount'));
        switchPage('accounts');
        return;
    }

    const profileIndex = elements.profileSelect.value;
    const profiles = state.settings.profiles || [];
    const profile = profiles[profileIndex];

    if (!profile) {
        alert(window.i18n.t('errors.noVersion')); switchPage('downloads');
        return;
    }

    state.settings.lastProfileIndex = profileIndex;
    await window.electronAPI.saveSettings(state.settings);

    state.isLaunching = true;
    elements.launchBtn.disabled = true;
    elements.launchBtn.querySelector('.launch-text').textContent = window.i18n.t('home.launching');
    elements.progressContainer.classList.remove('hidden');
    elements.progressFill.style.width = '0%';

    const options = {
        version: profile.version,
        versionType: profile.versionType,
        modloader: profile.modloader,
        modloaderVersion: profile.modloaderVersion,
        gamePath: profile.gamePath
    };

    try {
        const result = await window.electronAPI.launchGame(options);

        if (!result.success) {
            alert(window.i18n.t('errors.launchFailed') + ': ' + result.error);
            state.isLaunching = false;
            elements.launchBtn.disabled = false;
            elements.progressContainer.classList.add('hidden');
            elements.launchBtn.querySelector('.launch-text').textContent = window.i18n.t('home.play');
        } else {
            elements.launchBtn.querySelector('.launch-text').textContent = window.i18n.t('home.running');
        }
    } catch (error) {
        alert(window.i18n.t('errors.launchFailed') + ': ' + error.message);
        state.isLaunching = false;
        elements.launchBtn.disabled = false;
        elements.progressContainer.classList.add('hidden');
        elements.launchBtn.querySelector('.launch-text').textContent = window.i18n.t('home.play');
    }
}

function updateProgress(data) {
    const task = data.task || data.type || '';
    const current = typeof data.progress === 'number' ? data.progress : (typeof data.task === 'number' ? data.task : 0);
    const total = data.total || 100;

    elements.progressTask.textContent = task;

    if (total > 0) {
        let percent = 0;
        if (typeof data.total === 'number' && typeof current === 'number') {
            percent = Math.round((current / total) * 100);
        } else if (typeof data.total === 'number') {
            percent = data.total;
        }

        elements.progressFill.style.width = `${percent}%`;
        elements.progressPercent.textContent = `${percent}%`;
    }
}

function renderSidebarProfiles(profiles) {
    if (!elements.sidebarProfilesList) return;
    elements.sidebarProfilesList.innerHTML = '';

    profiles.forEach((profile, index) => {
        const item = document.createElement('div');
        item.className = 'sidebar-profile-item';
        item.dataset.index = index;
        if (profile.modCount) item.title = `${profile.modCount} mods`;

        const iconSrc = profile.icon || '../assets/logo1.png';

        item.innerHTML = `
            <img src="${iconSrc}" class="sidebar-profile-icon">
            <span class="sidebar-profile-name">${profile.name || 'Profile ' + (index + 1)}</span>
            <button class="sidebar-play-btn" title="${window.i18n.t('home.play')}">▶</button>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('sidebar-play-btn')) {
                selectProfileAndLaunch(index);
            } else {
                elements.profileSelect.value = index;
                const bottomSelect = document.querySelector('.bottom-profile-select');
                if (bottomSelect) bottomSelect.value = index;

                document.querySelectorAll('.sidebar-profile-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
            }
        });

        elements.sidebarProfilesList.appendChild(item);
    });
}

async function selectProfileAndLaunch(index) {
    elements.profileSelect.value = index;
    elements.profileSelect.dispatchEvent(new Event('change'));
    document.getElementById('launch-btn').click();
}

function renderProfilesManagement(profiles) {
    if (!elements.profilesManagementGrid) return;
    elements.profilesManagementGrid.innerHTML = '';

    profiles.forEach((profile, index) => {
        const card = document.createElement('div');
        card.className = 'manage-profile-card';

        const iconSrc = profile.icon || '../assets/logo1.png';
        const versionText = `${profile.version} ${profile.modloader !== 'vanilla' ? profile.modloader : ''}`;
        const modsText = profile.modCount ? ` • ${profile.modCount} mods` : '';

        card.innerHTML = `
            <img src="${iconSrc}" class="manage-profile-icon">
            <div class="manage-profile-info">
                <span class="manage-profile-name">${profile.name || 'Profile ' + (index + 1)}</span>
                <span class="manage-profile-meta">${versionText}${modsText}</span>
            </div>
            <div class="manage-profile-actions">
                <button class="profile-action-btn play" data-index="${index}">▶</button>
                <button class="profile-action-btn edit" data-index="${index}">✏️</button>
                <button class="profile-action-btn delete" data-index="${index}">🗑️</button>
            </div>
        `;

        const playBtn = card.querySelector('.profile-action-btn.play');
        const editBtn = card.querySelector('.profile-action-btn.edit');
        const deleteBtn = card.querySelector('.profile-action-btn.delete');

        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectProfileAndLaunch(index);
        });

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editProfile(index);
        });

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();

            try {
                if (confirm(window.i18n.t('home.deleteConfirm'))) {
                    const success = await window.electronAPI.deleteProfile(parseInt(index));

                    if (success) {
                        state.settings = await window.electronAPI.getSettings();
                        await loadInstalledProfiles();
                        if (typeof showToast === 'function') {
                            showToast(window.i18n.t('home.deleteSuccess') || 'Profile deleted', 'success');
                        }
                    } else {
                        alert('Could not delete profile');
                    }
                }
            } catch (err) { }
        });

        elements.profilesManagementGrid.appendChild(card);
    });
}

let editingProfileIndex = null;

function editProfile(index) {
    editingProfileIndex = index;
    const profile = state.settings.profiles[index];

    elements.profileNameInput.value = profile.name || '';
    elements.profileMinMemory.value = profile.minMemory || 2048;
    elements.profileMaxMemory.value = profile.maxMemory || 4096;
    elements.profileMinMemoryValue.textContent = (profile.minMemory || 2048) + ' MB';
    elements.profileMaxMemoryValue.textContent = (profile.maxMemory || 4096) + ' MB';
    elements.profileIconPreview.src = profile.icon || '../assets/logo1.png';

    elements.profileSettingsModal.classList.remove('hidden');
}

function closeProfileSettingsModal() {
    elements.profileSettingsModal.classList.add('hidden');
    editingProfileIndex = null;
}

async function saveProfileSettings() {
    if (editingProfileIndex === null) return;

    const profile = state.settings.profiles[editingProfileIndex];
    profile.name = elements.profileNameInput.value;
    profile.minMemory = parseInt(elements.profileMinMemory.value);
    profile.maxMemory = parseInt(elements.profileMaxMemory.value);

    await window.electronAPI.saveSettings(state.settings);
    closeProfileSettingsModal();
    loadInstalledProfiles();
}

async function openProfileFolder() {
    if (editingProfileIndex === null) return;
    const profile = state.settings.profiles[editingProfileIndex];
    const folderPath = profile.gamePath || state.settings.gamePath;
    await window.electronAPI.openFolder(folderPath);
}

async function changeProfileIcon() {
    const result = await window.electronAPI.selectIcon();
    if (result.success && result.path) {
        elements.profileIconPreview.src = result.path;
        if (editingProfileIndex !== null) {
            state.settings.profiles[editingProfileIndex].icon = result.path;
        }
    }
}

function setupProfileSettingsListeners() {
    if (elements.profileSettingsCancel) {
        elements.profileSettingsCancel.addEventListener('click', closeProfileSettingsModal);
    }
    if (elements.closeProfileSettings) {
        elements.closeProfileSettings.addEventListener('click', closeProfileSettingsModal);
    }
    if (elements.profileSettingsSave) {
        elements.profileSettingsSave.addEventListener('click', saveProfileSettings);
    }
    if (elements.btnOpenProfileFolder) {
        elements.btnOpenProfileFolder.addEventListener('click', openProfileFolder);
    }
    if (elements.btnChangeIcon) {
        elements.btnChangeIcon.addEventListener('click', changeProfileIcon);
    }

    if (elements.profileMinMemory) {
        elements.profileMinMemory.addEventListener('input', (e) => {
            elements.profileMinMemoryValue.textContent = e.target.value + ' MB';
        });
    }
    if (elements.profileMaxMemory) {
        elements.profileMaxMemory.addEventListener('input', (e) => {
            elements.profileMaxMemoryValue.textContent = e.target.value + ' MB';
        });
    }
}

async function deleteProfile(index) {
    const result = await showMainModal({
        title: window.i18n.t('profiles.delete') || "Delete Profile",
        message: window.i18n.t('profiles.confirmDelete') || "Delete this profile?",
        type: "confirm"
    });

    if (result.success) {
        state.settings.profiles.splice(index, 1);
        await window.electronAPI.saveSettings(state.settings);
        await loadInstalledProfiles();
    }
}

async function loadServers() {
    state.servers = await window.electronAPI.getServers();
    renderServers();
}

function renderServers() {
    if (!elements.monitoringGrid) return;

    if (window.serverStatusInterval) clearInterval(window.serverStatusInterval);

    if (state.servers.length === 0) {
        elements.monitoringGrid.innerHTML = `<div class="no-servers-msg">${window.i18n.t('monitoring.noServers') || 'No servers added'}</div>`;
        return;
    }

    elements.monitoringGrid.innerHTML = '';
    state.servers.forEach((server, index) => {
        const card = document.createElement('div');
        card.className = 'server-card';

        let iconSrc = server.icon || `https://api.mcstatus.io/v2/icon/${server.ip}`;

        card.innerHTML = `
            <div class="server-header">
                <img src="${iconSrc}" class="server-icon" id="server-icon-${index}" onerror="this.src='../assets/logo1.png'">
                <div class="server-info">
                    <h3>${server.name}</h3>
                    <div class="server-ip">${server.ip}</div>
                </div>
            </div>
            
            <div class="server-status" id="server-status-${index}">
                 <div class="status-left">
                     <span class="status-indicator status-offline"></span>
                     <span class="status-text">${window.i18n.t('monitoring.offline') || 'Offline'}</span>
                 </div>
            </div>

            <button class="server-play-btn">
                ${window.i18n.t('monitoring.play') || 'Play'}
            </button>
        `;

        card.querySelector('.server-play-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            playServer(index);
        });

        elements.monitoringGrid.appendChild(card);
        fetchServerStatus(server.ip, index);
    });

    window.serverStatusInterval = setInterval(() => {
        state.servers.forEach((server, index) => fetchServerStatus(server.ip, index));
    }, 60000);
}
async function fetchServerStatus(ip, index) {
    try {
        const data = await window.electronAPI.getServerStatus(ip);
        const statusEl = document.getElementById(`server-status-${index}`);
        if (!statusEl) return;

        if (data && data.online) {
            statusEl.innerHTML = `
                <div class="status-left">
                    <span class="status-indicator status-online"></span>
                    <span class="status-text">${window.i18n.t('monitoring.online') || 'Online'}</span>
                </div>
                <div class="status-right">
                    <span class="player-count">${data.players.online}/${data.players.max}</span>
                </div>
            `;
        } else {
            statusEl.innerHTML = `
                <div class="status-left">
                    <span class="status-indicator status-offline"></span>
                    <span class="status-text">${window.i18n.t('monitoring.offline') || 'Offline'}</span>
                </div>
            `;
        }
    } catch (e) {
        // Silently fail
    }
}

async function playServer(index) {
    const server = state.servers[index];
    const profileIndex = state.settings.lastProfileIndex || 0;
    const profiles = state.settings.profiles || [];
    const profile = profiles[profileIndex];

    if (!profile) {
        showMainModal({
            title: window.i18n.t('errors.launchFailed') || 'Error',
            message: "No valid profile selected to launch with.",
            type: "alert"
        });
        return;
    }

    const launchOptions = {
        profileIndex: profileIndex,
        server: server.ip,
        version: profile.version,
        versionType: profile.versionType,
        modloader: profile.modloader,
        modloaderVersion: profile.modloaderVersion,
        gamePath: profile.gamePath
    };

    const btn = document.querySelector(`.server-card:nth-child(${index + 1}) .server-play-btn`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = window.i18n.t('home.loading') || 'Loading...';
    }

    if (elements.launchBtn) {
        elements.launchBtn.disabled = true;
        elements.launchBtn.querySelector('.launch-text').textContent = window.i18n.t('home.loading');
    }

    try {
        const response = await window.electronAPI.launchGame(launchOptions);

        if (!response.success) {
            showMainModal({
                title: window.i18n.t('errors.launchFailed'),
                message: response.error,
                type: "alert"
            });
            if (btn) {
                btn.disabled = false;
                btn.textContent = window.i18n.t('monitoring.play') || 'Play';
            }
        } else {
            if (btn) btn.textContent = window.i18n.t('home.running') || 'Running';
        }
    } catch (e) {
        showMainModal({
            title: window.i18n.t('errors.launchFailed'),
            message: e.message || "Unknown error",
            type: "alert"
        });
        if (btn) {
            btn.disabled = false;
            btn.textContent = window.i18n.t('monitoring.play') || 'Play';
        }
    }
}



async function loadNews() {
    try {
        state.news = await window.electronAPI.getNews();
    } catch (e) {
        state.news = { launcher: [], minecraft: [] };
    }

    if (!state.news) state.news = { launcher: [], minecraft: [] };
    if (!state.news.launcher) state.news.launcher = [];
    if (!state.news.minecraft) state.news.minecraft = [];

    renderNews();
}

function renderNews() {
    if (!elements.newsContent) return;
    elements.newsContent.innerHTML = '';

    const isLauncherTab = state.currentNewsTab === 'launcher';
    const newsItems = state.news[state.currentNewsTab] || [];

    newsItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.style.cursor = 'pointer'; let actionsHtml = '';

        const img = item.image && !item.image.includes('undefined') ? item.image : '../assets/logo1.png';

        card.innerHTML = `
            ${actionsHtml}
            <img src="${img}" class="news-image" onerror="this.src='../assets/logo1.png'">
            <div class="news-info">
                <div class="news-title">${item.title}</div>
                <div class="news-date">${item.date}</div>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.news-actions')) return;

            if (item.link) {
                window.electronAPI.openExternal(item.link);
            } else {
                openNewsReader(item);
            }
        });

        elements.newsContent.appendChild(card);
    });
}

function openNewsReader(item) {
    if (!item) {
        return;
    }

    const img = item.image && !item.image.includes('undefined') ? item.image : '../assets/logo1.png';
    const textContent = (item.text || 'Нет описания').replace(/\n/g, '<br>');

    const readerHtml = `
        <div id="news-reader-modal" class="modal-overlay">
            <div class="modal-content news-reader" onclick="event.stopPropagation()">
                <div class="news-reader-header">
                    <img src="${img}" class="news-reader-image" onerror="this.src='../assets/logo1.png'">
                    <div class="news-reader-meta">
                        <h2>${item.title || 'Без названия'}</h2>
                        <span class="news-reader-date">${item.date || ''}</span>
                    </div>
                </div>
                <div class="news-reader-body">
                    ${textContent}
                </div>
                <button class="news-reader-close" onclick="window.closeNewsReader()">✕</button>
            </div>
        </div>
    `;

    const existing = document.getElementById('news-reader-modal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', readerHtml);

    document.getElementById('news-reader-modal').addEventListener('click', (e) => {
        if (e.target.id === 'news-reader-modal') {
            window.closeNewsReader();
        }
    });
}

window.closeNewsReader = function () {
    const el = document.getElementById('news-reader-modal');
    if (el) el.remove();
};

window.selectProfileAndLaunch = selectProfileAndLaunch;
window.deleteProfile = deleteProfile;
window.editProfile = editProfile;
window.loginOverlayOffline = loginOverlayOffline;
window.loginOverlayMicrosoft = loginOverlayMicrosoft;
window.switchPage = switchPage;
window.hideLoginOverlay = hideLoginOverlay;
window.loadAccounts = loadAccounts;
window.openNewsReader = openNewsReader;

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, duration);
}

window.showToast = showToast;

document.addEventListener('DOMContentLoaded', init);
