// ============================================
// DÉTECTION ANDROID ET ADAPTATION MOBILE
// ============================================

const isAndroid = () => {
    return navigator.userAgent.toLowerCase().indexOf("android") > -1;
};

// Si Android, forcer le mode mobile
if (isAndroid()) {
    console.log('📱 Android détecté - Mode mobile activé');
    document.documentElement.classList.add('mobile-mode');
    document.body.classList.add('mobile-mode');
}
// Import de l'API HTTP Tauri
const tauriHttp = window.__TAURI__?.http;

// Fonction fetch compatible Tauri et web
async function apiFetch(url, options = {}) {
    if (tauriHttp && tauriHttp.fetch) {
        // Utiliser l'API Tauri
        console.log('Utilisation API HTTP Tauri pour:', url);

        try {
            const response = await tauriHttp.fetch(url, {
                method: options.method || 'GET',
                headers: options.headers || {},
                body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
            });

            // Adapter la réponse Tauri au format fetch standard
            return {
                ok: response.ok,
                status: response.status,
                json: async () => response.data,
                text: async () => JSON.stringify(response.data)
            };
        } catch (error) {
            console.error('❌ Erreur Tauri HTTP:', error);
            throw error;
        }
    } else {
        // Utiliser fetch natif
        console.log('Utilisation fetch natif pour:', url);
        return await fetch(url, options);
    }
}

if (!window.electron) {
    window.electron = {
        closeWindow: () => console.log('Close'),
        minimizeWindow: () => console.log('Minimize'),
        toggleFullscreen: () => console.log('Fullscreen')
    };
}

if (!window.electronAPI) {
    window.electronAPI = window.electron;
}


let config = {
    apiUrl: localStorage.getItem('apiUrl') || 'http://127.0.0.1:8000/api/chatbot/message'
};

let isMinimized = true;
let isFullscreen = false;
// ============================================
// SCROLL
// ============================================

function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// ============================================
// 🆕 GESTIONNAIRE D'ANIMATIONS CENTRALISÉ
// ============================================


const CharlyAnimationManager = {
    current: null,
    currentHeader: null,
    currentState: 'idle',
    idleTimer: null,
    sequenceTimer: null,
    isPlayingSequence: false,
    microMovementTimer: null,

    // 🎭 Séquences d'animations pour Charly
    sequences: {
        // Mode repos - Alternance naturelle
        idle: [
            { animation: 'cat-devil', duration: 5000 },
            { animation: 'star-struck', duration: 2000 },
            { animation: 'squinting-cat', duration: 2000 }
        ],

        // Salutation à l'impératrice 👑
        greeting: [
            { animation: 'cat-devil', duration: 5000 },
            { animation: 'squinting-cat', duration: 5000 }
        ],

        // En train de réfléchir
        thinking: [
            { animation: 'pleading-cat', duration: 2000 },
            { animation: 'cat-ok', duration: 800 },
            { animation: 'pleading-cat', duration: 1500 },
            { animation: 'cat-ok', duration: 800 }
        ],

        // En train de traiter
        processing: [
            { animation: 'cat-beaming', duration: 1500 },
            { animation: 'cat-ok', duration: 800 },
            { animation: 'cat-beaming', duration: 1500 }
        ],

        // En train de parler/répondre
        chatting: [
            { animation: 'cat-ok', duration: 3000 },
            { animation: 'cat-beaming', duration: 2000 },
            { animation: 'cat-ok', duration: 2500 }
        ],

        // Heureux (mission réussie)
        happy: [
            { animation: 'cat-sun', duration: 2000 },
            { animation: 'cat-rainbow', duration: 2000 },
            { animation: 'cat-beaming', duration: 2000 },
            { animation: 'cat-ok', duration: 1500 }
        ],

        // Confus (demande clarification)
        confused: [
            { animation: 'squinting-cat', duration: 2000 },
            { animation: 'pleading-cat', duration: 1500 },
            { animation: 'cat-ok', duration: 1500 }
        ],

        // Erreur (s'excuse auprès de l'impératrice)
        error: [
            { animation: 'cat-crying', duration: 2500 },
            { animation: 'pleading-cat', duration: 2000 },
            { animation: 'cat-ok', duration: 1500 }
        ],

        // Idée/suggestion
        idea: [
            { animation: 'cat-rainbow', duration: 2000 },
            { animation: 'cat-beaming', duration: 1500 },
            { animation: 'cat-ok', duration: 2000 }
        ],

        // Affectueux/admiratif
        loving: [
            { animation: 'star-struck', duration: 2000 },
            { animation: 'cat-eyes', duration: 1800 },
            { animation: 'cat-sun', duration: 1500 },
            { animation: 'cat-ok', duration: 1500 }
        ]
    },

    // États simples (fallback)
    states: {
        IDLE: 'cat-ok',
        GREETING: 'cat-rainbow',
        THINKING: 'pleading-cat',
        PROCESSING: 'cat-beaming',
        CHATTING: 'cat-ok',
        HAPPY: 'cat-sun',
        CONFUSED: 'squinting-cat',
        ERROR: 'cat-crying',
        IDEA: 'cat-rainbow',
        LOVING: 'cat-eyes',
        LOADING: 'star-struck'
    },

    // Détection de sentiment dans les réponses
    detectSentiment(text) {
        const lowerText = text.toLowerCase();

        const patterns = {
            error: ['erreur', 'impossible', 'échec', 'problème', 'désolé', 'malheureusement', 'excuses'],
            confused: ['pourriez-vous préciser', 'je ne comprends pas', 'pouvez-vous clarifier', 'ambig', 'confus'],
            loving: ['impératrice', 'majesté', 'seigneurie', 'altesse', 'merci', 'avec plaisir', 'ravi'],
            happy: ['excellent', 'parfait', 'super', 'bravo', 'réussi', 'génial', 'formidable', 'mission accomplie'],
            idea: ['voici', 'proposition', 'suggestion', 'solution', 'je propose', 'recommandation', 'idée']
        };

        for (const [emotion, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return emotion;
            }
        }

        return 'chatting';
    },

    // 🎬 Lancer une séquence d'animations
    playSequence(sequenceName) {
        const sequence = this.sequences[sequenceName];
        if (!sequence) {
            console.warn(`🎭 Séquence ${sequenceName} introuvable`);
            this.changeAnimationDirect(this.states[sequenceName.toUpperCase()] || 'cat-ok');
            return;
        }

        console.log(`🎬 Démarrage séquence: ${sequenceName}`);

        this.stopSequence();
        this.isPlayingSequence = true;
        this.currentState = sequenceName;
        let index = 0;

        const playNext = () => {
            if (!this.isPlayingSequence) return;

            const step = sequence[index];
            if (!step) {
                // Fin de la séquence, recommencer en boucle
                index = 0;
                setTimeout(playNext, 500);
                return;
            }

            // Changer l'animation
            this.changeAnimationDirect(step.animation);

            // Programmer la suivante
            this.sequenceTimer = setTimeout(() => {
                index++;
                if (index >= sequence.length) {
                    index = 0; // Boucler
                }
                playNext();
            }, step.duration);
        };

        playNext();
    },

    // 🛑 Arrêter la séquence
    stopSequence() {
        this.isPlayingSequence = false;
        if (this.sequenceTimer) {
            clearTimeout(this.sequenceTimer);
            this.sequenceTimer = null;
        }
    },

    // 🎨 Changement d'animation direct (sans fade, pour les séquences)

    changeAnimationDirect(animationName) {
        const animationPath = `./animations/${animationName}.json`;
        const container = document.getElementById('lottie-container');
        const headerContainer = document.getElementById('lottie-header');

        // Détruire les anciennes
        if (this.current) {
            this.current.destroy();
            this.current = null;
        }
        if (this.currentHeader) {
            this.currentHeader.destroy();
            this.currentHeader = null;
        }

        try {
            if (container) {
                this.current = window.lottie.loadAnimation({
                    container: container,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: animationPath
                });
            }

            if (headerContainer) {
                this.currentHeader = window.lottie.loadAnimation({
                    container: headerContainer,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: animationPath
                });
            }

            console.log(`✅ Animation initialisée: ${animationName}`);
        } catch (error) {
            console.error('❌ Erreur chargement animation:', error);
        }
    },

    // Changement avec fade (pour les changements d'état majeurs)
    changeAnimationWithFade(state, duration = null) {
        const animationFile = this.states[state.toUpperCase()] || state;
        const animationPath = `./animations/${animationFile}.json`;

        console.log(`🎭 Animation avec fade: ${state}`);

        const container = document.getElementById('lottie-container');
        const headerContainer = document.getElementById('lottie-header');

        // Fade out
        if (container) container.classList.add('fading-out');
        if (headerContainer) headerContainer.classList.add('fading-out');

        setTimeout(() => {
            this.stopSequence();
            this.changeAnimationDirect(animationFile);

            // Fade in
            if (container) {
                container.classList.remove('fading-out');
                container.classList.add('fading-in');
            }
            if (headerContainer) {
                headerContainer.classList.remove('fading-out');
                headerContainer.classList.add('fading-in');
            }

            setTimeout(() => {
                if (container) container.classList.remove('fading-in');
                if (headerContainer) headerContainer.classList.remove('fading-in');
            }, 200);

            if (duration) {
                setTimeout(() => {
                    this.toIdle();
                }, duration);
            }

            this.resetIdleTimer();
        }, 200);
    },

    // 😴 Passer en mode idle
    toIdle() {
        if (this.currentState !== 'idle') {
            this.stopSequence();
            this.playSequence('idle');
        }
    },

    // ⏰ Reset le timer idle
    resetIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }

        this.idleTimer = setTimeout(() => {
            if (this.currentState !== 'idle') {
                this.toIdle();
            }
        }, 30000); // 30 secondes
    },

    // 👋 Animation de salutation
    greet() {
        this.stopSequence();
        this.playSequence('greeting');

        // Retour à idle après la séquence
        setTimeout(() => {
            this.toIdle();
        }, 7000); // Durée totale de la séquence greeting
    },

    // 🤔 Animation de réflexion
    think() {
        this.stopSequence();
        this.playSequence('thinking');
    },

    // ⚙️ Animation de traitement
    process() {
        this.stopSequence();
        this.playSequence('processing');
    },

    // 💬 Animation de réponse basée sur le sentiment
    respondWith(text) {
        const sentiment = this.detectSentiment(text);
        this.stopSequence();
        this.playSequence(sentiment);

        // Retour progressif à idle
        setTimeout(() => {
            this.toIdle();
        }, 10000);
    },

    // 🎲 Système de micro-mouvements naturels
    startNaturalBehavior() {
        console.log('🎲 Comportement naturel activé');

        this.microMovementTimer = setInterval(() => {
            // Seulement en mode idle
            if (this.currentState === 'idle' && !this.isPlayingSequence) {
                // 20% de chance de faire un micro-mouvement
                if (Math.random() > 0.8) {
                    const microMoves = [
                        'cat-beaming',
                        'cat-sun',
                        'cat-ok'
                    ];

                    const randomMove = microMoves[Math.floor(Math.random() * microMoves.length)];

                    this.changeAnimationDirect(randomMove);

                    // Retour après 1-2 secondes
                    setTimeout(() => {
                        if (this.currentState === 'idle') {
                            this.changeAnimationDirect('cat-ok');
                        }
                    }, 1000 + Math.random() * 1000);
                }
            }
        }, 8000); // Vérifie toutes les 8 secondes
    },

    // 🛑 Arrêter le comportement naturel
    stopNaturalBehavior() {
        if (this.microMovementTimer) {
            clearInterval(this.microMovementTimer);
            this.microMovementTimer = null;
        }
    },

    // 🎯 Initialisation
    init() {
        console.log('🐱 CharlyAnimationManager initialisé');

        // Démarrer avec greeting
        setTimeout(() => {
            this.greet();
        }, 500);

        // Activer les micro-mouvements après 5 secondes
        setTimeout(() => {
            this.startNaturalBehavior();
        }, 5000);
    },

    // 🧹 Nettoyage
    destroy() {
        this.stopSequence();
        this.stopNaturalBehavior();
        if (this.idleTimer) clearTimeout(this.idleTimer);
        if (this.current) this.current.destroy();
        if (this.currentHeader) this.currentHeader.destroy();
    }
};

// 🎬 Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.lottie) {
            CharlyAnimationManager.init();
        } else {
            console.error('❌ Lottie non chargé');
        }
    }, 1000);
});

// 📤 Exposer globalement
window.CharlyAnimationManager = CharlyAnimationManager;
window.AnimationManager = CharlyAnimationManager; // Alias pour compatibilité

console.log('🐱 Charly Animation Manager chargé');

// ============================================
// AUTHENTIFICATION SIMPLIFIÉE
// ============================================

let authToken = localStorage.getItem('auth_token');
let currentUser = null;
// ============================================
// Connection en local
// const API_BASE_URL = 'http://127.0.0.1:8000/api';
// ============================================
const API_BASE_URL = 'https://friend.ateliernormandduweb.fr/api';

// Générer ou récupérer un ID unique pour cet appareil
function getDeviceId() {
    let deviceId = localStorage.getItem('device_id');

    if (!deviceId) {
        deviceId = 'business-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('device_id', deviceId);
        console.log('Nouvel ID appareil généré:', deviceId);
    }

    return deviceId;
}

// Connexion utilisateur
async function login(email, password) {
    const loginBtn = document.getElementById('loginBtn');
    const authStatus = document.getElementById('authStatus');

    if (!loginBtn || !authStatus) return;

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: password,
                device_name: 'Assistant Pro'
            })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('current_user', JSON.stringify(currentUser));

            showAuthStatus('success', `✅ Bienvenue ${data.user.name} !`);

            // Animation de bienvenue
            AnimationManager.greet();

            setTimeout(() => {
                loadServerHistory();
            }, 1000);

            setTimeout(() => {
                showAccountSection();
            }, 1500);

        } else {
            showAuthStatus('error', '❌ Email ou mot de passe incorrect');
            AnimationManager.changeAnimation('confused', 3000);
        }

    } catch (error) {
        console.error('Erreur login:', error);
        showAuthStatus('error', '❌ Erreur de connexion au serveur');
        AnimationManager.changeAnimation('error', 3000);
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
    }
}

// Déconnexion
async function logout() {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.log('Erreur logout:', error);
    }

    authToken = null;
    currentUser = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');

    showAuthSection();
    showAuthStatus('success', 'À bientôt !');

    // 🆕 Animation d'au revoir
    AnimationManager.greet();
}

// Afficher le statut d'authentification
function showAuthStatus(type, message) {
    const status = document.getElementById('authStatus');
    if (status) {
        status.className = `connection-status visible ${type}`;
        status.textContent = message;
    }
}

// Afficher la section de connexion
function showAuthSection() {
    const authSection = document.getElementById('authSection');
    const accountSection = document.getElementById('accountSection');
    if (authSection) authSection.style.display = 'block';
    if (accountSection) accountSection.style.display = 'none';
}

// Afficher la section compte
function showAccountSection() {
    const authSection = document.getElementById('authSection');
    const accountSection = document.getElementById('accountSection');
    if (authSection) authSection.style.display = 'none';
    if (accountSection) accountSection.style.display = 'block';

    if (currentUser) {
        const userName = document.getElementById('userName');
        const userEmail2 = document.getElementById('userEmail2');
        if (userName) userName.textContent = currentUser.name;
        if (userEmail2) userEmail2.textContent = currentUser.email;
    }
}

// Vérifier si déjà connecté au démarrage
function checkAuth() {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('current_user');

    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showAccountSection();
    } else {
        showAuthSection();
    }
}

// ============================================
// HISTORIQUE DE CONVERSATION
// ============================================
let conversationHistory = [];

// ============================================
// GESTION ANIMATION LOTTIE (INITIALISÉE)
// ============================================

let assistantAnimation = null;

function initLottieAnimation() {
    const container = document.getElementById('lottie-container');

    if (!container) {
        console.error('❌ Container lottie non trouvé dans le DOM');
        return;
    }

    try {
        if (typeof window.lottie === 'undefined') {
            console.error('❌ lottie-web n\'est pas chargé');
            return;
        }

        CharlyAnimationManager.greet();

        console.log('✅ Animation assistant chargée via AnimationManager');

    } catch (error) {
        console.error('Erreur:', error);
    }
}

window.assistantLottie = {
    animation: () => AnimationManager.current,
    play: () => AnimationManager.current?.play(),
    pause: () => AnimationManager.current?.pause(),
    stop: () => AnimationManager.current?.stop(),
    getStatus: () => !AnimationManager.current ? 'not loaded' : (AnimationManager.current.isPaused ? 'paused' : 'playing')
};

// ============================================
// GESTION ANIMATION LOTTIE HEADER
// ============================================

// 🆕 Le header est maintenant géré par AnimationManager
// Cette fonction vérifie juste que le container existe

let assistantHeaderAnimation = null;

function initLottieHeader() {
    const container = document.getElementById('lottie-header');

    if (!container) {
        console.error('❌ Container lottie-header non trouvé');
        return;
    }

    if (typeof window.lottie === 'undefined') {
        console.error('❌ lottie-web n\'est pas chargé');
        return;
    }

    console.log('✅ Container header prêt - animation gérée par AnimationManager');
}

window.assistantLottieHeader = {
    animation: () => AnimationManager.currentHeader,
    play: () => AnimationManager.currentHeader?.play(),
    pause: () => AnimationManager.currentHeader?.pause(),
    getStatus: () => AnimationManager.currentHeader ? 'loaded' : 'not loaded'
};

// Éléments DOM
const elements = {
    floatingButton: document.getElementById('floatingButton'),
    settingsBtn: document.getElementById('settingsBtn'),
    chatContainer: document.getElementById('chatContainer'),
    settingsPanel: document.getElementById('settingsPanel'),
    closeSettings: document.getElementById('closeSettings'),
    apiUrlInput: document.getElementById('apiUrl'),
    saveSettingsBtn: document.getElementById('saveSettings'),
    testConnectionBtn: document.getElementById('testConnection'),
    connectionStatus: document.getElementById('connectionStatus'),
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendButton'),
    typingIndicator: document.getElementById('typingIndicator'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    minimizeBtn: document.getElementById('minimizeBtn'),
    closeBtn: document.getElementById('closeBtn'),
    toggleFullscreenBtn: document.getElementById('toggleFullscreenBtn'),
    themeToggle: document.getElementById('themeToggle')
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    console.log('Démarrage de l\'application...');

    // 🆕 Si Android, forcer affichage du chat
    if (isAndroid()) {
        console.log('📱 Configuration mobile Android');
        setTimeout(() => {
            if (elements.floatingButton) {
                elements.floatingButton.style.display = 'none';
            }
            if (elements.chatContainer) {
                elements.chatContainer.classList.remove('hidden');
            }
        }, 100);
    }

    loadSettings();
    loadHistory();
    setupEventListeners();
    checkAuth();
    setupFullscreenToggle();
    setupCloseButton();
    setupKeyboardShortcuts();
    restoreFloatingButtonPosition();

    setTimeout(() => {
        initLottieAnimation();
        initLottieHeader();
    }, 100);

    console.log('Application initialisée avec AnimationManager');

    // Initialiser le mode vocal
    setTimeout(() => {
        if (window.VoiceManager) {
            VoiceManager.init();
            console.log('🎤 Mode vocal initialisé');
        }
    }, 500);

    // Initialiser TTS
    setTimeout(() => {
        if (window.TTSManager) {
            TTSManager.init();
            console.log('🔊 TTS initialisé');
        }
    }, 600);
});

// ============================================
// GESTION FULLSCREEN
// ============================================

function setupFullscreenToggle() {
    const btn = document.getElementById('fullscreenButton')
        || document.getElementById('toggleFullscreenBtn');

    if (!btn) {
        console.warn('⚠️ Bouton fullscreen non trouvé');
        return;
    }

    btn.addEventListener('click', toggleFullscreen);

    // Raccourci F11
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F11') {
            e.preventDefault();
            toggleFullscreen();
        }
    });

    console.log('✅ Fullscreen configuré');
}

async function toggleFullscreen() {
    console.log('🔄 Toggle fullscreen demandé');
    isFullscreen = !isFullscreen;

    try {
        const { getCurrentWindow } = window.__TAURI__.window;
        const mainWindow = getCurrentWindow();

        console.log('📺 Avant setFullscreen:', isFullscreen);
        await mainWindow.setFullscreen(isFullscreen);
        console.log('✅ setFullscreen appliqué');

        // Vérifier l'état réel
        const actualFullscreen = await mainWindow.isFullscreen();
        console.log('🔍 État fullscreen réel:', actualFullscreen);

        updateFullscreenButton();
        animateFullscreenTransition();

    } catch (error) {
        console.error('❌ Erreur fullscreen:', error);
    }
}
function updateFullscreenButton() {
    if (!elements.toggleFullscreenBtn) return;

    const icon = elements.toggleFullscreenBtn.querySelector('i');

    if (isFullscreen) {
        icon.className = 'fas fa-compress';
        elements.toggleFullscreenBtn.title = 'Mode fenêtre (F11)';
    } else {
        icon.className = 'fas fa-expand';
        elements.toggleFullscreenBtn.title = 'Plein écran (F11)';
    }
}

function animateFullscreenTransition() {
    const container = document.getElementById('chatContainer');
    if (!container) return;

    container.classList.add('transitioning');

    if (isFullscreen) {
        container.classList.add('fullscreen-mode');
    } else {
        container.classList.remove('fullscreen-mode');
    }

    setTimeout(() => {
        container.classList.remove('transitioning');
    }, 300);
}

function loadSettings() {
    if (elements.apiUrlInput) {
        elements.apiUrlInput.value = config.apiUrl;
    }
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    if (elements.themeToggle) {
        elements.themeToggle.checked = (savedTheme === 'light');
    }
}

// ============================================
// GESTION BOUTON FERMER
// ============================================

function setupCloseButton() {
    const closeBtn = document.getElementById('closeBtn');

    if (!closeBtn) {
        console.warn('⚠️ Bouton de fermeture non trouvé');
        return;
    }

    closeBtn.addEventListener('click', async () => {
        try {
            console.log('🔴 Fermeture demandée');

            // Option 1 : Minimiser au lieu de fermer (recommandé pour un widget)
            // minimizeChat();

            // Option 2 : Fermer complètement (décommenter si tu préfères)
            const { getCurrentWindow } = window.__TAURI__.window;
            await getCurrentWindow().close();

        } catch (error) {
            console.error('❌ Erreur fermeture:', error);
        }
    });

    console.log('✅ Bouton de fermeture configuré');
}

function setupEventListeners() {
    if (elements.floatingButton) {
        let isDragging = false;
        let canDrag = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragTimer = null;

        // MouseDown : Début du timer
        elements.floatingButton.addEventListener('mousedown', (e) => {
            isDragging = true;
            canDrag = false;
            dragStartX = e.clientX;
            dragStartY = e.clientY;

            // Après 150ms, autoriser le drag
            dragTimer = setTimeout(() => {
                canDrag = true;
                elements.floatingButton.classList.add('dragging');
                console.log('🎯 Drag autorisé');
            }, 150);

            e.preventDefault();
            e.stopPropagation();
        });

        // MouseMove : Déplacement seulement si autorisé
        const handleMouseMove = (e) => {
            if (isDragging && canDrag) {
                const floatingBtn = elements.floatingButton;
                const btnWidth = floatingBtn.offsetWidth;
                const btnHeight = floatingBtn.offsetHeight;

                let newX = e.clientX - (btnWidth / 2);
                let newY = e.clientY - (btnHeight / 2);

                // Limiter aux bords
                newX = Math.max(0, Math.min(newX, window.innerWidth - btnWidth));
                newY = Math.max(0, Math.min(newY, window.innerHeight - btnHeight));

                floatingBtn.style.left = newX + 'px';
                floatingBtn.style.top = newY + 'px';
                floatingBtn.style.right = 'auto';
                floatingBtn.style.bottom = 'auto';
            }
        };

        // MouseUp : Clic ou fin de drag
        const handleMouseUp = (e) => {
            if (isDragging) {
                clearTimeout(dragTimer);
                elements.floatingButton.classList.remove('dragging');

                // Si le timer n'a pas eu le temps de s'activer = clic rapide
                if (!canDrag) {
                    console.log('✅ Clic rapide → Ouverture chat');
                    AnimationManager.greet();
                    toggleChat(false);
                } else {
                    // C'était un drag, sauvegarder
                    const floatingBtn = elements.floatingButton;
                    localStorage.setItem('floatingButton_x', floatingBtn.style.left);
                    localStorage.setItem('floatingButton_y', floatingBtn.style.top);
                    console.log('📍 Position sauvegardée');
                }

                isDragging = false;
                canDrag = false;
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', () => {
            elements.settingsPanel.classList.toggle('active');
        });
    }

    if (elements.minimizeBtn) {
        elements.minimizeBtn.addEventListener('click', () => {
            toggleChat(true);
        });
    }

    if (elements.closeBtn) {
        elements.closeBtn.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.closeWindow) {
                window.electronAPI.closeWindow();
            } else {
                window.close();
            }
        });
    }

    if (elements.closeSettings) {
        elements.closeSettings.addEventListener('click', () => {
            elements.settingsPanel.classList.remove('active');
        });
    }

    if (elements.saveSettingsBtn) {
        elements.saveSettingsBtn.addEventListener('click', saveSettings);
    }

    if (elements.testConnectionBtn) {
        elements.testConnectionBtn.addEventListener('click', testConnection);
    }

    if (elements.sendButton) {
        elements.sendButton.addEventListener('click', sendMessage);
    }

    if (elements.messageInput) {
        elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // 🆕 Animation quand l'utilisateur tape
        elements.messageInput.addEventListener('input', () => {
            elements.messageInput.style.height = 'auto';
            elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 120) + 'px';

            // Passer en mode "thinking" si l'utilisateur tape
            if (elements.messageInput.value.length > 3 && AnimationManager.currentState === 'idle') {
                AnimationManager.think();
            }
        });

        // 🆕 Retour idle si le champ est vidé
        elements.messageInput.addEventListener('blur', () => {
            if (!elements.messageInput.value.trim()) {
                AnimationManager.toIdle();
            }
        });
    }

    if (elements.floatingButton) {
        elements.floatingButton.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            elements.settingsPanel.classList.add('active');
        });
    }

    if (elements.clearHistoryBtn) {
        elements.clearHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (confirm('Voulez-vous vraiment démarrer une nouvelle conversation ?')) {
                try {
                    clearSavedHistory();
                    showTypingIndicator(false);
                    elements.messagesContainer.innerHTML = '';

                    setTimeout(() => {
                        elements.sendButton.disabled = false;
                        elements.messageInput.disabled = false;
                        elements.messageInput.value = '';
                        console.log('✅ Contrôles réactivés');
                    }, 50);

                    setTimeout(() => {
                        const welcomeDiv = document.createElement('div');
                        welcomeDiv.className = 'message bot-message welcome-message';
                        welcomeDiv.innerHTML = `
                            <div class="message-avatar">
                                <i class="fas fa-robot"></i>
                            </div>
                            <div class="message-content">
                                <div class="message-header">Assistant Pro</div>
                                <p>Nouvelle conversation démarrée. Comment puis-je vous aider ?</p>
                            </div>
                        `;
                        elements.messagesContainer.appendChild(welcomeDiv);

                        // 🆕 Animation de nouvelle conversation
                        AnimationManager.greet();
                    }, 200);

                    setTimeout(() => {
                        elements.messageInput.focus();
                        console.log('✅ Nouvelle conversation prête !');
                    }, 200);

                } catch (error) {
                    console.error('❌ Erreur lors du reset:', error);
                    location.reload();
                }
            }
        });
    }

    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'light' : 'dark';
            applyTheme(theme);
            localStorage.setItem('theme', theme);
            console.log('🎨 Thème changé:', theme);
        });
    }

    // 🆕 Event listeners pour l'authentification
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const email = document.getElementById('userEmail')?.value;
            const password = document.getElementById('userPassword')?.value;
            if (email && password) {
                login(email, password);
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    const passwordInput = document.getElementById('userPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const email = document.getElementById('userEmail')?.value;
                const password = document.getElementById('userPassword')?.value;
                if (email && password) {
                    login(email, password);
                }
            }
        });
    }

    const closeHelpBtn = document.getElementById('closeHelp');
    if (closeHelpBtn) {
        closeHelpBtn.addEventListener('click', () => {
            toggleHelpPanel();
        });
    }

    const helpOverlay = document.querySelector('.help-overlay');
    if (helpOverlay) {
        helpOverlay.addEventListener('click', () => {
            toggleHelpPanel();
        });
    }

    console.log('✅ Event listeners configurés');
}

// ============================================
// RESTAURER LA POSITION DU BOUTON FLOTTANT
// ============================================

function restoreFloatingButtonPosition() {
    if (!elements.floatingButton) return;

    const savedX = localStorage.getItem('floatingButton_x');
    const savedY = localStorage.getItem('floatingButton_y');

    if (savedX && savedY) {
        elements.floatingButton.style.left = savedX;
        elements.floatingButton.style.top = savedY;
        elements.floatingButton.style.right = 'auto';
        elements.floatingButton.style.bottom = 'auto';
        console.log('📍 Position restaurée:', savedX, savedY);
    }
}

function toggleChat(minimize = false) {
    isMinimized = minimize;

    if (minimize) {
        elements.chatContainer.classList.add('hidden');
        elements.floatingButton.style.display = 'flex';
        elements.floatingButton.style.left = 'auto';
        elements.floatingButton.style.top = 'auto';
        elements.floatingButton.style.right = '20px';
        elements.floatingButton.style.bottom = '20px';

        // 🆕 Retour en mode idle quand minimisé
        AnimationManager.toIdle();
    } else {
        elements.floatingButton.style.display = 'none';
        elements.chatContainer.classList.remove('hidden');
        elements.messageInput.focus();
    }
}

function saveSettings() {
    config.apiUrl = elements.apiUrlInput.value.trim();

    if (config.apiUrl.endsWith('/')) {
        config.apiUrl = config.apiUrl.slice(0, -1);
    }

    localStorage.setItem('apiUrl', config.apiUrl);
    showConnectionStatus('✅ Paramètres sauvegardés !', 'success');

    setTimeout(() => {
        elements.settingsPanel.classList.remove('active');
    }, 1500);
}

async function testConnection() {
    if (!config.apiUrl) {
        showConnectionStatus('❌ Veuillez renseigner l\'URL', 'error');
        return;
    }

    elements.testConnectionBtn.disabled = true;
    elements.testConnectionBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test...';

    try {
        const response = await fetch(`${API_BASE_URL}/chatbot/test`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showConnectionStatus('✅ Connexion réussie !', 'success');
            // 🆕 Animation de succès
            AnimationManager.changeAnimation('happy', 2000);
        } else {
            throw new Error('Erreur de connexion');
        }
    } catch (error) {
        console.error('Erreur de connexion:', error);
        showConnectionStatus('❌ Échec de la connexion. Vérifiez l\'URL.', 'error');
        // 🆕 Animation d'erreur
        AnimationManager.changeAnimation('error', 3000);
    } finally {
        elements.testConnectionBtn.disabled = false;
        elements.testConnectionBtn.innerHTML = '<i class="fas fa-plug"></i> Tester';
    }
}

async function checkInitialConnection() {
    if (config.apiUrl) {
        try {
            const response = await fetch(`${API_BASE_URL}/chatbot/test`);
            if (!response.ok) {
                elements.settingsPanel.classList.add('active');
            }
        } catch (error) {
            elements.settingsPanel.classList.add('active');
        }
    } else {
        elements.settingsPanel.classList.add('active');
    }
}

function showConnectionStatus(message, type) {
    elements.connectionStatus.textContent = message;
    elements.connectionStatus.className = `connection-status ${type}`;
}

// ============================================
// 🆕 ENVOI DE MESSAGE AVEC AUTHENTIFICATION ET ANIMATIONS
// ============================================

async function sendMessage() {
    const message = elements.messageInput.value.trim();

    // Vérifications de base
    if (!message) return;

    if (message.length < 2) {
        addMessage("Pourriez-vous préciser votre demande, Votre Majesté ?", 'bot');
        // 🆕 Animation de confusion
        AnimationManager.changeAnimation('confused', 3000);
        return;
    }

    // Afficher le message utilisateur
    addMessage(message, 'user');
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';

    // Ajouter à l'historique
    conversationHistory.push({
        role: 'user',
        content: message
    });

    // Désactiver les contrôles pendant l'envoi
    elements.sendButton.disabled = true;
    elements.messageInput.disabled = true;
    showTypingIndicator(true);

    // 🆕 Animation de traitement
    AnimationManager.process();

    try {
        // Préparer les headers
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Ajouter le token si connecté
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        console.log('📤 Headers envoyés:', headers);
        console.log('📤 Token:', authToken);

        // Récupérer la préférence de mémoire contextuelle
        const useContext = document.getElementById('useContextToggle')?.checked ?? true;

        // Appel API
        const response = await fetch(`${API_BASE_URL}/chatbot/message`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                question: message,
                conversation_history: conversationHistory,
                device_identifier: getDeviceId(),
                use_context: useContext,
                enable_web_search: true
            })
        });

        // Gestion des erreurs HTTP
        if (!response.ok) {
            let errorData = {};
            try {
                errorData = await response.json();
            } catch (e) {
                // Impossible de parser la réponse
            }

            let friendlyMessage = '';

            if (response.status === 422) {
                friendlyMessage = "Pourriez-vous reformuler votre demande de manière plus détaillée ?";
                // 🆕 Animation de confusion
                AnimationManager.changeAnimation('confused', 4000);
            } else if (response.status === 500) {
                friendlyMessage = "Une erreur technique est survenue. Veuillez réessayer dans quelques instants.";
                // 🆕 Animation d'erreur
                AnimationManager.changeAnimation('error', 4000);
            } else if (response.status === 404) {
                friendlyMessage = "Service temporairement indisponible. Veuillez contacter le support.";
                AnimationManager.changeAnimation('error', 4000);
            } else if (response.status === 401 || response.status === 403) {
                friendlyMessage = "Votre session a expiré. Veuillez vous reconnecter.";
                AnimationManager.changeAnimation('confused', 4000);
            } else {
                friendlyMessage = "Une erreur est survenue. Veuillez réessayer.";
                AnimationManager.changeAnimation('error', 4000);
            }

            showTypingIndicator(false);
            addMessage(friendlyMessage, 'bot');

            console.error('❌ Erreur serveur:', {
                status: response.status,
                data: errorData
            });

            elements.sendButton.disabled = false;
            elements.messageInput.disabled = false;
            elements.messageInput.focus();
            return;
        }

        // Récupérer la réponse
        const data = await response.json();
        const botResponse = data.response;


        console.log('📥 Réponse complète de l\'API:', data);

        // Afficher la réponse
        addMessage(botResponse, 'bot');

        // 🆕 AFFICHER LES RÉSULTATS DE RECHERCHE
        if (data.search_results && data.search_results.results && data.search_results.results.length > 0) {
            setTimeout(() => {
                const lastBotMessage = document.querySelector('.bot-message:last-child .message-content');
                if (lastBotMessage && window.SearchResultsRenderer) {
                    SearchResultsRenderer.render(
                        data.search_results.results,
                        data.search_results.query,
                        lastBotMessage
                    );
                }
            }, 100);
        }

        // 🆕 Animation basée sur le sentiment de la réponse
        AnimationManager.respondWith(botResponse);

        // Logs de debug
        if (data.context_used) {
            console.log(`✅ Mémoire active (${data.context_messages_count} messages en contexte)`);
        } else {
            console.log('ℹ️ Mémoire désactivée ou mode anonyme');
        }

        if (data.authenticated) {
            console.log('✅ Conversation synchronisée avec le compte utilisateur');
            if (window.showToast) {
                showToast('💾 Synchronisé', 'success');
            }
        } else {
            console.log('ℹ️ Mode anonyme - conversation non sauvegardée');
        }

        // Ajouter la réponse à l'historique
        conversationHistory.push({
            role: 'assistant',
            content: botResponse
        });

        // Limiter la taille de l'historique
        if (conversationHistory.length > 300) {
            conversationHistory = conversationHistory.slice(-300);
        }

        // Sauvegarder l'historique
        saveHistory();

    } catch (error) {
        console.error('Erreur:', error);
        let friendlyMessage = "Impossible de se connecter au serveur. Vérifiez votre connexion internet.";
        addMessage(friendlyMessage, 'bot');

        // 🆕 Animation d'erreur réseau
        AnimationManager.changeAnimation('error', 4000);

    } finally {
        // Réactiver les contrôles
        showTypingIndicator(false);
        elements.sendButton.disabled = false;
        elements.messageInput.disabled = false;
        elements.messageInput.focus();
    }
}

// ============================================
// 🆕 HELPER : Créer un avatar Lottie pour les messages
// ============================================

function createMessageAvatarLottie(animationState = null) {
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';

    const lottieContainer = document.createElement('div');
    lottieContainer.className = 'message-avatar-lottie';

    const messageId = 'msg-avatar-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    lottieContainer.id = messageId;

    avatarDiv.appendChild(lottieContainer);

    // Utiliser l'état actuel ou celui spécifié
    const stateToUse = animationState || AnimationManager.currentState || 'idle';
    const animationFile = AnimationManager.states[stateToUse.toUpperCase()] || 'assistant-waiting';

    setTimeout(() => {
        const container = document.getElementById(messageId);
        if (!container) return;

        try {
            window.lottie.loadAnimation({
                container: container,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: `./animations/${animationFile}.json`
            });
        } catch (error) {
            console.error('❌ Erreur chargement mini avatar:', error);
            // Fallback : afficher l'icône Font Awesome
            container.innerHTML = '<i class="fas fa-robot" style="display: block !important;"></i>';
        }
    }, 50);

    return avatarDiv;
}

function addMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    if (type === 'bot') {
        const avatarDiv = createMessageAvatarLottie();
        messageDiv.appendChild(avatarDiv);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (type === 'bot') {
        const header = document.createElement('div');
        header.className = 'message-header';
        header.textContent = 'Charly';
        contentDiv.appendChild(header);
    }

    const p = document.createElement('p');
    p.textContent = text;

    contentDiv.appendChild(p);
    messageDiv.appendChild(contentDiv);
    elements.messagesContainer.appendChild(messageDiv);

    // AJOUTER LE TIMESTAMP
    if (window.UIPolish && window.UIPolish.TimestampManager) {
        window.UIPolish.TimestampManager.addToMessage(messageDiv, new Date());
    }

    // GÉRER LE SCROLL INTELLIGENT
    if (window.UIPolish && window.UIPolish.ScrollManager) {
        window.UIPolish.ScrollManager.onNewMessage();
    } else {
        // Fallback si ScrollManager n'est pas chargé
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }

    // COUPER le micro AVANT de lire (si c'est le bot)
    if (type === 'bot' && window.VoiceManager && VoiceManager.isListening) {
        VoiceManager.stop();
        console.log('🔇 Micro coupé avant lecture TTS');
    }

    // Lire le message à voix haute si c'est le bot et TTS activé
    if (type === 'bot' && window.TTSManager && TTSManager.isEnabled) {
        setTimeout(() => {
            TTSManager.speak(text);
        }, 300);
    }
}

function showTypingIndicator(show) {
    if (show) {
        elements.typingIndicator.classList.add('active');
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    } else {
        elements.typingIndicator.classList.remove('active');
    }
}

function clearHistory() {
    conversationHistory = [];
    console.log('🗑️ Historique mémoire effacé');
}

// ============================================
// GESTION DE LA MÉMOIRE PERSISTANTE
// ============================================

function saveHistory() {
    try {
        localStorage.setItem('business_conversation_history', JSON.stringify(conversationHistory));
        localStorage.setItem('business_last_save', new Date().toISOString());
        console.log('💾 Historique sauvegardé:', conversationHistory.length, 'messages');
    } catch (error) {
        console.error('❌ Erreur sauvegarde historique:', error);
    }
}

function loadHistory() {
    try {
        const saved = localStorage.getItem('business_conversation_history');
        const lastSave = localStorage.getItem('business_last_save');

        if (saved) {
            conversationHistory = JSON.parse(saved);
            console.log('✅ Historique chargé:', conversationHistory.length, 'messages');

            if (lastSave) {
                const saveDate = new Date(lastSave);
                console.log('Dernière sauvegarde:', saveDate.toLocaleString());
            }

            restoreMessagesUI();
        } else {
            console.log('Nouvelle conversation - pas d\'historique');
        }
    } catch (error) {
        console.error('❌ Erreur chargement historique:', error);
        conversationHistory = [];
    }
}

async function loadServerHistory() {
    if (!authToken) {
        console.log('ℹPas de token, pas de chargement historique serveur');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/chatbot/history`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            console.log(`📥 Historique serveur chargé: ${data.conversations.length} conversations`);
            // Tu peux afficher dans l'UI si tu veux
        }
    } catch (error) {
        console.error('❌ Erreur chargement historique serveur:', error);
    }
}

function restoreMessagesUI() {
    elements.messagesContainer.innerHTML = '';

    // Message de bienvenue avec avatar Lottie
    const welcomeBack = document.createElement('div');
    welcomeBack.className = 'message bot-message welcome-message';
    const avatarDiv = createMessageAvatarLottie('greeting');
    welcomeBack.appendChild(avatarDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `
    <div class="message-header">Charly</div>
    <p>Bon retour, Impératrice Persephone ! 👑 Je me souviens de notre conversation précédente. Souhaitez-vous continuer ?</p>
`;
    welcomeBack.appendChild(contentDiv);
    elements.messagesContainer.appendChild(welcomeBack);

    // 🆕 Ajouter timestamp au message de bienvenue
    if (window.UIPolish && window.UIPolish.TimestampManager) {
        window.UIPolish.TimestampManager.addToMessage(welcomeBack, new Date());
    }

    const recentMessages = conversationHistory.slice(-20);
    recentMessages.forEach((msg, index) => {
        if (msg.role === 'user') {
            addMessage(msg.content, 'user');
        } else if (msg.role === 'assistant') {
            addMessage(msg.content, 'bot');
        }

        // 🆕 Ajouter des timestamps échelonnés
        if (window.UIPolish && window.UIPolish.TimestampManager) {
            const messages = document.querySelectorAll('.message');
            const lastMessage = messages[messages.length - 1];
            // Simuler des timestamps échelonnés (5 minutes d'écart)
            const timestamp = new Date(Date.now() - (recentMessages.length - index) * 5 * 60000);
            window.UIPolish.TimestampManager.addToMessage(lastMessage, timestamp);
        }
    });

    // 🆕 Observer les changements de hauteur
    let lastHeight = 0;
    let stableCount = 0;

    const checkAndScroll = setInterval(() => {
        const currentHeight = elements.messagesContainer.scrollHeight;

        if (currentHeight === lastHeight) {
            stableCount++;
            if (stableCount >= 2) {
                // Hauteur stable depuis 2 vérifications → on scroll
                if (window.UIPolish && window.UIPolish.ScrollManager) {
                    window.UIPolish.ScrollManager.scrollToBottom(true);
                } else {
                    scrollToBottom();
                }
                clearInterval(checkAndScroll);
                console.log('📜 Scroll final après stabilisation');
            }
        } else {
            stableCount = 0;
            if (window.UIPolish && window.UIPolish.ScrollManager) {
                window.UIPolish.ScrollManager.scrollToBottom(false);
            } else {
                scrollToBottom();
            }
        }

        lastHeight = currentHeight;
    }, 200);

    // Timeout de sécurité
    setTimeout(() => {
        clearInterval(checkAndScroll);
        if (window.UIPolish && window.UIPolish.ScrollManager) {
            window.UIPolish.ScrollManager.scrollToBottom(true);
        } else {
            scrollToBottom();
        }
        console.log('📜 Scroll forcé après timeout');
    }, 3000);

    console.log(`✅ ${recentMessages.length} messages restaurés avec timestamps`);
}

function clearSavedHistory() {
    conversationHistory = [];
    localStorage.removeItem('business_conversation_history');
    localStorage.removeItem('business_last_save');
    console.log('🗑️ Historique effacé complètement (mémoire + stockage)');
}

function showHistory() {
    console.log('📜 Historique de conversation:', conversationHistory);
    console.log(`📊 Nombre total de messages: ${conversationHistory.length}`);
    console.log(`🔢 Nombre d'échanges: ${conversationHistory.length / 2}`);
    return conversationHistory;
}

window.assistantDebug = {
    clearHistory: clearHistory,
    clearAll: clearSavedHistory,
    showHistory: showHistory,
    getHistoryLength: () => conversationHistory.length,
    getExchangeCount: () => Math.floor(conversationHistory.length / 2),
    saveHistory: saveHistory,
    loadHistory: loadHistory
};

window.assistantFullscreen = {
    toggle: toggleFullscreen,
    isFullscreen: () => isFullscreen,
    getSize: () => isFullscreen ? 'fullscreen' : 'normal'
};

window.addEventListener('error', (event) => {
    console.error('Erreur globale:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise non gérée:', event.reason);
});

// ============================================
// GESTION DU THÈME
// ============================================

function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === 'light') {
        root.classList.add('light-theme');
        console.log('☀️ Thème clair activé');
    } else {
        root.classList.remove('light-theme');
        console.log('🌙 Thème sombre activé');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains('light-theme') ? 'light' : 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    if (elements.themeToggle) {
        elements.themeToggle.checked = (newTheme === 'light');
    }

    return newTheme;
}

window.assistantTheme = {
    toggle: toggleTheme,
    apply: applyTheme,
    getCurrent: () => document.documentElement.classList.contains('light-theme') ? 'light' : 'dark'
};

// ============================================
// GESTION DES RACCOURCIS CLAVIER
// ============================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const isTyping = (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');

        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            if (confirm('Démarrer une nouvelle conversation ?')) {
                clearSavedHistory();
                showTypingIndicator(false);

                if (elements.messagesContainer) {
                    elements.messagesContainer.innerHTML = '';
                }

                setTimeout(() => {
                    elements.sendButton.disabled = false;
                    elements.messageInput.disabled = false;
                    elements.messageInput.value = '';
                }, 100);

                setTimeout(() => {
                    addMessage('Nouvelle conversation démarrée, Votre Majesté. Comment puis-je vous servir ?', 'bot');
                    showToast('Nouvelle conversation', 'success');
                    // 🆕 Animation de nouvelle conversation
                    AnimationManager.greet();
                }, 100);

                setTimeout(() => {
                    if (elements.messageInput) {
                        elements.messageInput.focus();
                    }
                }, 300);

                console.log('⌨️ Raccourci: Nouvelle conversation');
            }
            return;
        }

        if (e.ctrlKey && e.key === 'm') {
            e.preventDefault();
            toggleChat(!isMinimized);
            showToast(isMinimized ? '📦 Assistant minimisé' : '💬 Assistant ouvert', 'info');
            console.log('⌨️ Raccourci: Toggle minimize');
            return;
        }

        if (e.key === 'Escape') {
            const helpPanel = document.getElementById('helpPanel');
            if (helpPanel && helpPanel.classList.contains('active')) {
                e.preventDefault();
                toggleHelpPanel();
                return;
            }

            if (!isMinimized && !isTyping) {
                e.preventDefault();
                toggleChat(true);
                showToast('📦 Assistant minimisé', 'info');
                console.log('⌨️ Raccourci: Escape');
                return;
            }

            if (elements.settingsPanel && elements.settingsPanel.classList.contains('active')) {
                e.preventDefault();
                elements.settingsPanel.classList.remove('active');
                console.log('⌨️ Raccourci: Fermer settings');
                return;
            }
        }

        if (e.ctrlKey && e.key === ',') {
            e.preventDefault();
            if (elements.settingsPanel) {
                elements.settingsPanel.classList.toggle('active');
                showToast('⚙️ Paramètres', 'info');
                console.log('⌨️ Raccourci: Paramètres');
            }
            return;
        }

        if (e.ctrlKey && e.key === '/') {
            e.preventDefault();
            toggleHelpPanel();
            console.log('⌨️ Raccourci: Aide');
            return;
        }

        if (e.ctrlKey && e.key === 'Enter' && isTyping) {
            e.preventDefault();
            sendMessage();
            console.log('⌨️ Raccourci: Envoyer message');
            return;
        }
    });

    console.log('✅ Raccourcis clavier configurés');
}

function showToast(message, type = 'info') {
    let toast = document.getElementById('toast-notification');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast-notification toast-${type}`;

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

function toggleHelpPanel() {
    const helpPanel = document.getElementById('helpPanel');

    if (!helpPanel) {
        console.error('❌ Panneau d\'aide non trouvé');
        return;
    }

    const isActive = helpPanel.classList.contains('active');

    if (isActive) {
        helpPanel.classList.remove('active');
        console.log('📚 Aide fermée');
    } else {
        helpPanel.classList.add('active');
        console.log('📚 Aide ouverte');
    }
}

// ============================================
// GESTION DU TOGGLE MÉMOIRE
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    const memoryToggle = document.getElementById('useContextToggle');
    const memoryStatusText = document.getElementById('memoryStatusText');

    if (memoryToggle) {
        // Charger l'état sauvegardé (ou activer par défaut)
        const savedState = localStorage.getItem('memory_enabled');
        if (savedState !== null) {
            memoryToggle.checked = savedState === 'true';
        } else {
            memoryToggle.checked = true; // Activer par défaut
        }

        // Mettre à jour le texte au chargement
        updateMemoryStatus();

        // Écouter les changements
        memoryToggle.addEventListener('change', function () {
            updateMemoryStatus();

            // Sauvegarder la préférence
            localStorage.setItem('memory_enabled', this.checked);

            // Log pour debug
            if (this.checked) {
                console.log('🧠 Mémoire contextuelle activée');
            } else {
                console.log('⚠️ Mémoire contextuelle désactivée');
            }
        });
    }
});

function updateMemoryStatus() {
    const memoryToggle = document.getElementById('useContextToggle');
    const memoryStatusText = document.getElementById('memoryStatusText');

    if (!memoryToggle || !memoryStatusText) return;

    if (memoryToggle.checked) {
        memoryStatusText.textContent = 'Mémoire activée';
        memoryStatusText.style.color = '#4caf50';
    } else {
        memoryStatusText.textContent = 'Mémoire désactivée';
        memoryStatusText.style.color = '#ff9800';
    }
}

function isMemoryEnabled() {
    const memoryToggle = document.getElementById('useContextToggle');
    return memoryToggle ? memoryToggle.checked : true;
}

window.assistantShortcuts = {
    showToast: showToast,
    toggleHelp: toggleHelpPanel
};

// 🆕 Exposer pour debug et VoiceManager
window.assistantAuth = {
    getToken: () => authToken,
    getUser: () => currentUser,
    isAuthenticated: () => !!authToken,
    login: login,
    logout: logout
};

// 🆕 Exposer sendMessage pour VoiceManager
window.sendMessage = sendMessage;

console.log('🐱 Charly chargé et prêt à servir l\'Impératrice ! 👑');
console.log('🎭 Animations contextuelles activées');
console.log('🤖 Animations synchronisées (bouton + header)');
console.log('📐 Robot header agrandi: 100x100px');
console.log('💾 Capacité: 150 échanges (300 messages)');
console.log('💡 Debug: window.assistantDebug.showHistory()');
console.log('💡 Auth: window.assistantAuth.isAuthenticated()');
console.log('💡 Fullscreen: window.assistantFullscreen.toggle()');
console.log('💡 Animations: window.AnimationManager');