class I18n {
    constructor() {
        this.currentLang = 'ru';
        this.translations = {};
        this.onLanguageChangeCallbacks = [];
    }
    onLanguageChange(callback) {
        if (typeof callback === 'function') {
            this.onLanguageChangeCallbacks.push(callback);
        }
    }
    async loadLanguage(lang) {
        try {
            const response = await fetch(`locales/${lang}.json`);
            this.translations = await response.json();
            this.currentLang = lang;
            this.updateUI();
                        this.onLanguageChangeCallbacks.forEach(callback => {
                try {
                    callback(lang);
                } catch (err) {
                    console.error('Error in language change callback:', err);
                }
            });
        } catch (error) {
            console.error('Failed to load language:', error);
        }
    }
    t(key, replacements = {}) {
        const keys = key.split('.');
        let value = this.translations;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key;             }
        }
        if (typeof value === 'string' && replacements) {
            for (const [k, v] of Object.entries(replacements)) {
                value = value.replace(`{${k}}`, v);
            }
        }
        return value;
    }
    updateUI() {
                document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });
                document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });
    }
}
window.i18n = new I18n();
