/**
 * Globe Map Quiz - Application State
 * Centralized reactive state management
 */

import { CONFIG } from './config.js';

// Application state with change notification
class StateManager {
    constructor() {
        this._state = {
            // App state
            initialized: false,
            loading: true,
            loadProgress: 0,

            // Theme
            theme: 'cyber',

            // Audio settings
            audio: {
                enabled: true,
                volume: 0.5
            },

            // Globe state
            globe: {
                ready: false,
                rotating: true,
                autoRotate: true,
                rotateSpeed: CONFIG.globe.rotateSpeed
            },

            // Country data
            countries: {
                loaded: false,
                data: [],
                byId: new Map(),
                byName: new Map(),
                selected: null,
                highlighted: null,
                found: new Set()
            },

            // Quiz state
            quiz: {
                active: false,
                mode: null,
                difficulty: 'medium',
                pool: [],
                current: null,
                currentIndex: 0,

                // Scoring
                score: 0,
                streak: 0,
                maxStreak: 0,
                correct: 0,
                wrong: 0,
                lives: 3,

                // Timer
                timeLimit: 0,
                timeRemaining: 0,
                timerInterval: null,

                // MCQ
                mcqOptions: [],

                // Custom quiz settings
                custom: {
                    given: 'name',
                    find: 'country',
                    regions: new Set(),
                    questionCount: 20,
                    timeLimit: 30,
                    lives: 3
                }
            },

            // UI state
            ui: {
                sidebarOpen: false,
                settingsOpen: false,
                quizBuilderOpen: false,
                crosshairVisible: true,
                flagSize: 'medium'
            },

            // Statistics (persisted)
            stats: {
                gamesPlayed: 0,
                totalCorrect: 0,
                totalWrong: 0,
                bestStreak: 0,
                countriesLearned: new Set(),
                timeSpent: 0
            }
        };

        this._listeners = new Map();
        this._loadFromStorage();
    }

    // Get state value by path (e.g., 'quiz.score')
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this._state);
    }

    // Set state value by path
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key], this._state);

        const oldValue = target[lastKey];
        target[lastKey] = value;

        this._notify(path, value, oldValue);
        this._saveToStorage();
    }

    // Update multiple values
    update(updates) {
        Object.entries(updates).forEach(([path, value]) => {
            this.set(path, value);
        });
    }

    // Subscribe to state changes
    subscribe(path, callback) {
        if (!this._listeners.has(path)) {
            this._listeners.set(path, new Set());
        }
        this._listeners.get(path).add(callback);

        // Return unsubscribe function
        return () => this._listeners.get(path).delete(callback);
    }

    // Notify listeners of state change
    _notify(path, newValue, oldValue) {
        // Notify exact path listeners
        if (this._listeners.has(path)) {
            this._listeners.get(path).forEach(cb => cb(newValue, oldValue, path));
        }

        // Notify parent path listeners
        const parts = path.split('.');
        while (parts.length > 1) {
            parts.pop();
            const parentPath = parts.join('.');
            if (this._listeners.has(parentPath)) {
                this._listeners.get(parentPath).forEach(cb =>
                    cb(this.get(parentPath), null, path)
                );
            }
        }
    }

    // Persist to localStorage
    _saveToStorage() {
        try {
            const persistedState = {
                theme: this._state.theme,
                audio: {
                    enabled: this._state.audio.enabled,
                    volume: this._state.audio.volume
                },
                stats: {
                    ...this._state.stats,
                    countriesLearned: [...this._state.stats.countriesLearned]
                },
                ui: {
                    flagSize: this._state.ui.flagSize
                }
            };
            localStorage.setItem('globeQuizState', JSON.stringify(persistedState));
        } catch (e) {
            console.warn('Failed to save state:', e);
        }
    }

    // Load from localStorage
    _loadFromStorage() {
        try {
            const saved = localStorage.getItem('globeQuizState');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.theme) this._state.theme = parsed.theme;
                if (parsed.audio) {
                    if (typeof parsed.audio.enabled === 'boolean') {
                        this._state.audio.enabled = parsed.audio.enabled;
                    }
                    if (typeof parsed.audio.volume === 'number') {
                        this._state.audio.volume = parsed.audio.volume;
                    }
                }
                if (parsed.stats) {
                    Object.assign(this._state.stats, parsed.stats);
                    if (parsed.stats.countriesLearned) {
                        this._state.stats.countriesLearned = new Set(parsed.stats.countriesLearned);
                    }
                }
                if (parsed.ui?.flagSize) this._state.ui.flagSize = parsed.ui.flagSize;
            }
        } catch (e) {
            console.warn('Failed to load state:', e);
        }
    }

    // Reset quiz state
    resetQuiz() {
        this._state.quiz = {
            ...this._state.quiz,
            active: false,
            pool: [],
            current: null,
            currentIndex: 0,
            score: 0,
            streak: 0,
            correct: 0,
            wrong: 0,
            lives: this._state.quiz.custom.lives,
            timeRemaining: 0,
            mcqOptions: []
        };

        if (this._state.quiz.timerInterval) {
            clearInterval(this._state.quiz.timerInterval);
            this._state.quiz.timerInterval = null;
        }

        this._state.countries.found.clear();
        this._state.countries.highlighted = null;
        this._notify('quiz', this._state.quiz, null);
    }

    // Get full state (for debugging)
    getFullState() {
        return JSON.parse(JSON.stringify(this._state, (key, value) => {
            if (value instanceof Set) return [...value];
            if (value instanceof Map) return Object.fromEntries(value);
            return value;
        }));
    }
}

// Singleton instance
export const state = new StateManager();
export default state;
