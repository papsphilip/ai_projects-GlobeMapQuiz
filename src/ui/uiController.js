/**
 * Globe Map Quiz - UI Controller
 * Handles all UI interactions and event listeners
 */

import { CONFIG } from '../core/config.js';
import { state } from '../core/state.js';
import { audio } from '../utils/audio.js';
import { countryRenderer } from '../globe/countries.js';

class UIController {
    constructor() {
        this.elements = {};
    }

    /**
     * Initialize UI elements and event listeners
     */
    init() {
        this._cacheElements();
        this._setupEventListeners();
        this._setupStateSubscriptions();
        this._populateCountryList();
    }

    /**
     * Cache DOM elements
     */
    _cacheElements() {
        this.elements = {
            // Top bar
            btnMenu: document.getElementById('btn-menu'),
            btnSettings: document.getElementById('btn-settings'),
            appTitle: document.getElementById('app-title'),

            // Panels
            sidePanel: document.getElementById('side-panel'),
            settingsPanel: document.getElementById('settings-panel'),
            btnCloseSettings: document.getElementById('btn-close-settings'),

            // Country list
            countrySearch: document.getElementById('country-search'),
            countryList: document.getElementById('country-list'),

            // Settings
            themeButtons: document.getElementById('theme-buttons'),
            soundEnabled: document.getElementById('sound-enabled'),
            soundVolume: document.getElementById('sound-volume'),
            autoRotate: document.getElementById('auto-rotate'),
            showBorders: document.getElementById('show-borders'),

            // HUD
            hud: document.getElementById('hud'),
            hudScore: document.querySelector('#hud-score span'),
            hudStreak: document.querySelector('#hud-streak span'),
            hudLives: document.querySelector('#hud-lives span'),
            hudTimer: document.querySelector('#hud-timer span'),
            hudProgress: document.getElementById('hud-progress'),

            // Question panel
            questionPanel: document.getElementById('question-panel'),
            questionText: document.getElementById('question-text'),
            questionTarget: document.getElementById('question-target'),
            mcqOptions: document.getElementById('mcq-options'),

            // Feedback
            feedback: document.getElementById('feedback'),

            // Country info
            countryInfo: document.getElementById('country-info'),
            countryName: document.getElementById('country-name'),
            countryFlag: document.getElementById('country-flag'),
            countryRegion: document.getElementById('country-region'),

            // Quiz modal
            quizModal: document.getElementById('quiz-modal'),
            quizModes: document.querySelector('.quiz-modes'),
            difficultySelect: document.querySelector('.difficulty-select'),
            btnStartQuiz: document.getElementById('btn-start-quiz'),
            btnCancelQuiz: document.getElementById('btn-cancel-quiz'),

            // Loading
            loadProgress: document.getElementById('load-progress'),
            loadStatus: document.getElementById('load-status')
        };
    }

    /**
     * Setup all event listeners
     */
    _setupEventListeners() {
        // Menu button - toggle side panel
        this.elements.btnMenu?.addEventListener('click', () => {
            audio.play('click');
            this._togglePanel('side');
        });

        // Settings button - toggle settings panel
        this.elements.btnSettings?.addEventListener('click', () => {
            audio.play('click');
            this._togglePanel('settings');
        });

        // Close settings button
        this.elements.btnCloseSettings?.addEventListener('click', () => {
            audio.play('click');
            this._closePanel('settings');
        });

        // Theme buttons
        this.elements.themeButtons?.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn && btn.dataset.theme) {
                audio.play('click');
                state.set('theme', btn.dataset.theme);
                this._updateActiveThemeButton(btn.dataset.theme);
            }
        });

        // Sound enabled checkbox
        this.elements.soundEnabled?.addEventListener('change', (e) => {
            state.set('audio.enabled', e.target.checked);
        });

        // Volume slider
        this.elements.soundVolume?.addEventListener('input', (e) => {
            state.set('audio.volume', e.target.value / 100);
        });

        // Auto-rotate checkbox
        this.elements.autoRotate?.addEventListener('change', (e) => {
            state.set('globe.autoRotate', e.target.checked);
        });

        // Show borders checkbox
        this.elements.showBorders?.addEventListener('change', (e) => {
            countryRenderer.setBordersVisible(e.target.checked);
        });

        // Country search
        this.elements.countrySearch?.addEventListener('input', (e) => {
            this._filterCountryList(e.target.value);
        });

        // Quiz mode buttons
        this.elements.quizModes?.addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn');
            if (btn) {
                audio.play('click');
                this._selectQuizMode(btn);
            }
        });

        // Difficulty buttons
        this.elements.difficultySelect?.addEventListener('click', (e) => {
            const btn = e.target.closest('.diff-btn');
            if (btn) {
                audio.play('click');
                this._selectDifficulty(btn);
            }
        });

        // Start quiz button
        this.elements.btnStartQuiz?.addEventListener('click', () => {
            audio.play('click');
            this._startQuiz();
        });

        // Cancel quiz button
        this.elements.btnCancelQuiz?.addEventListener('click', () => {
            audio.play('click');
            this._closeQuizModal();
        });

        // Click outside panels to close
        document.addEventListener('click', (e) => {
            if (this.elements.sidePanel?.classList.contains('open')) {
                if (!this.elements.sidePanel.contains(e.target) &&
                    !this.elements.btnMenu?.contains(e.target)) {
                    this._closePanel('side');
                }
            }
            if (this.elements.settingsPanel?.classList.contains('open')) {
                if (!this.elements.settingsPanel.contains(e.target) &&
                    !this.elements.btnSettings?.contains(e.target)) {
                    this._closePanel('settings');
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape key
            if (e.key === 'Escape') {
                this._closePanel('side');
                this._closePanel('settings');
                this._closeQuizModal();
            }
            // M key - toggle menu
            if (e.key === 'm' && !e.ctrlKey && !e.metaKey) {
                if (document.activeElement.tagName !== 'INPUT') {
                    this._togglePanel('side');
                }
            }
            // S key - toggle settings
            if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
                if (document.activeElement.tagName !== 'INPUT') {
                    e.preventDefault();
                    this._togglePanel('settings');
                }
            }
            // Q key - open quiz modal
            if (e.key === 'q' && !e.ctrlKey && !e.metaKey) {
                if (document.activeElement.tagName !== 'INPUT' && !state.get('quiz.active')) {
                    this._openQuizModal();
                }
            }
        });
    }

    /**
     * Setup state subscriptions
     */
    _setupStateSubscriptions() {
        // Loading progress
        state.subscribe('loadProgress', (progress) => {
            if (this.elements.loadProgress) {
                this.elements.loadProgress.style.width = `${progress}%`;
            }
        });

        // Quiz score updates
        state.subscribe('quiz.score', (score) => {
            if (this.elements.hudScore) {
                this.elements.hudScore.textContent = score;
            }
        });

        state.subscribe('quiz.streak', (streak) => {
            if (this.elements.hudStreak) {
                this.elements.hudStreak.textContent = streak;
            }
        });

        state.subscribe('quiz.lives', (lives) => {
            if (this.elements.hudLives) {
                this.elements.hudLives.textContent = lives;
            }
        });

        // Theme changes
        state.subscribe('theme', (theme) => {
            this._updateActiveThemeButton(theme);
        });

        // Audio settings
        state.subscribe('audio.enabled', (enabled) => {
            if (this.elements.soundEnabled) {
                this.elements.soundEnabled.checked = enabled;
            }
        });

        state.subscribe('audio.volume', (volume) => {
            if (this.elements.soundVolume) {
                this.elements.soundVolume.value = volume * 100;
            }
        });
    }

    /**
     * Toggle panel open/closed
     */
    _togglePanel(panel) {
        if (panel === 'side') {
            this.elements.sidePanel?.classList.toggle('open');
            this._closePanel('settings');
        } else if (panel === 'settings') {
            this.elements.settingsPanel?.classList.toggle('open');
            this._closePanel('side');
        }
    }

    /**
     * Close a specific panel
     */
    _closePanel(panel) {
        if (panel === 'side') {
            this.elements.sidePanel?.classList.remove('open');
        } else if (panel === 'settings') {
            this.elements.settingsPanel?.classList.remove('open');
        }
    }

    /**
     * Update active theme button
     */
    _updateActiveThemeButton(theme) {
        const buttons = this.elements.themeButtons?.querySelectorAll('button');
        buttons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }

    /**
     * Populate country list in side panel
     */
    _populateCountryList() {
        // Wait for countries to load
        const checkCountries = () => {
            const countries = state.get('countries.data');
            if (countries && countries.length > 0) {
                this._renderCountryList(countries);
            } else {
                setTimeout(checkCountries, 100);
            }
        };
        checkCountries();
    }

    /**
     * Render country list
     */
    _renderCountryList(countries) {
        if (!this.elements.countryList) return;

        const sorted = [...countries].sort((a, b) => a.name.localeCompare(b.name));

        this.elements.countryList.innerHTML = sorted.map(country => `
            <div class="country-item" data-id="${country.id}">
                <span class="country-name">${country.name}</span>
            </div>
        `).join('');

        // Click handler for country items
        this.elements.countryList.addEventListener('click', (e) => {
            const item = e.target.closest('.country-item');
            if (item) {
                audio.play('select');
                const countryId = parseInt(item.dataset.id);
                countryRenderer.flyToCountry(countryId);
                countryRenderer.highlight(countryId);
                this._closePanel('side');
            }
        });
    }

    /**
     * Filter country list
     */
    _filterCountryList(query) {
        const items = this.elements.countryList?.querySelectorAll('.country-item');
        const lowerQuery = query.toLowerCase();

        items?.forEach(item => {
            const name = item.querySelector('.country-name')?.textContent.toLowerCase();
            item.style.display = name?.includes(lowerQuery) ? '' : 'none';
        });
    }

    /**
     * Select quiz mode
     */
    _selectQuizMode(btn) {
        const buttons = this.elements.quizModes?.querySelectorAll('.mode-btn');
        buttons?.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.set('quiz.mode', btn.dataset.mode);
    }

    /**
     * Select difficulty
     */
    _selectDifficulty(btn) {
        const buttons = this.elements.difficultySelect?.querySelectorAll('.diff-btn');
        buttons?.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.set('quiz.difficulty', btn.dataset.diff);
    }

    /**
     * Open quiz modal
     */
    _openQuizModal() {
        this.elements.quizModal?.classList.remove('hidden');
    }

    /**
     * Close quiz modal
     */
    _closeQuizModal() {
        this.elements.quizModal?.classList.add('hidden');
    }

    /**
     * Start quiz
     */
    _startQuiz() {
        const mode = state.get('quiz.mode') || 'locate';
        const difficulty = state.get('quiz.difficulty') || 'medium';

        // Set up quiz state
        const diffSettings = CONFIG.difficulty[difficulty];
        state.update({
            'quiz.active': true,
            'quiz.mode': mode,
            'quiz.difficulty': difficulty,
            'quiz.lives': diffSettings.lives,
            'quiz.timeLimit': diffSettings.timeLimit,
            'quiz.score': 0,
            'quiz.streak': 0,
            'quiz.correct': 0,
            'quiz.wrong': 0,
            'quiz.currentIndex': 0
        });

        // Show HUD
        this.elements.hud?.classList.remove('hidden');
        this.elements.questionPanel?.classList.remove('hidden');

        // Close modal
        this._closeQuizModal();

        // Emit event for quiz logic to handle
        window.dispatchEvent(new CustomEvent('quizStart', {
            detail: { mode, difficulty }
        }));
    }

    /**
     * Show feedback message
     */
    showFeedback(type, message) {
        if (!this.elements.feedback) return;

        this.elements.feedback.textContent = message || (type === 'correct' ? 'Correct!' : 'Wrong!');
        this.elements.feedback.className = type;
        this.elements.feedback.classList.remove('hidden');

        setTimeout(() => {
            this.elements.feedback.classList.add('hidden');
        }, 1500);
    }

    /**
     * Update question display
     */
    updateQuestion(questionText, targetText) {
        if (this.elements.questionText) {
            this.elements.questionText.textContent = questionText;
        }
        if (this.elements.questionTarget) {
            this.elements.questionTarget.textContent = targetText;
        }
    }

    /**
     * Update HUD progress
     */
    updateProgress(current, total) {
        if (this.elements.hudProgress) {
            this.elements.hudProgress.textContent = `${current} / ${total}`;
        }
    }

    /**
     * Update timer display
     */
    updateTimer(time) {
        if (this.elements.hudTimer) {
            this.elements.hudTimer.textContent = time > 0 ? time : '--';
        }
    }

    /**
     * Show country info panel
     */
    showCountryInfo(country) {
        if (!this.elements.countryInfo) return;

        if (this.elements.countryName) {
            this.elements.countryName.textContent = country.name;
        }
        // Flag would be set here if we had flag data

        this.elements.countryInfo.classList.remove('hidden');
    }

    /**
     * Hide country info panel
     */
    hideCountryInfo() {
        this.elements.countryInfo?.classList.add('hidden');
    }

    /**
     * End quiz and show results
     */
    endQuiz(stats) {
        // Hide game UI
        this.elements.hud?.classList.add('hidden');
        this.elements.questionPanel?.classList.add('hidden');

        state.set('quiz.active', false);

        // Could show a results modal here
        console.log('Quiz ended:', stats);
    }
}

// Singleton instance
export const uiController = new UIController();
export default uiController;
