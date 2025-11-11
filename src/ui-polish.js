// ============================================
// UI POLISH - ASSISTANT HRT
// Gestion des Timestamps + Input Animé
// ============================================

/**
 * Système de gestion des timestamps pour les messages
 */
const TimestampManager = {
    /**
     * Formate un timestamp de manière relative intelligente
     * @param {Date|string|number} date - La date à formater
     * @returns {string} - Le timestamp formaté
     */
    format(date) {
        const now = new Date();
        const messageDate = new Date(date);
        const diffMs = now - messageDate;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        // À l'instant (moins de 10 secondes)
        if (diffSec < 10) {
            return 'À l\'instant';
        }

        // Il y a X secondes (10-59 secondes)
        if (diffSec < 60) {
            return `Il y a ${diffSec}s`;
        }

        // Il y a X minutes (1-59 minutes)
        if (diffMin < 60) {
            return `Il y a ${diffMin} min`;
        }

        // Il y a X heures (1-23 heures)
        if (diffHour < 24) {
            return `Il y a ${diffHour}h`;
        }

        // Hier + heure (1 jour)
        if (diffDay === 1) {
            const hours = messageDate.getHours().toString().padStart(2, '0');
            const minutes = messageDate.getMinutes().toString().padStart(2, '0');
            return `Hier ${hours}:${minutes}`;
        }

        // Il y a X jours (2-6 jours)
        if (diffDay < 7) {
            return `Il y a ${diffDay} jours`;
        }

        // Date complète (plus de 7 jours)
        const day = messageDate.getDate().toString().padStart(2, '0');
        const month = (messageDate.getMonth() + 1).toString().padStart(2, '0');
        const year = messageDate.getFullYear();
        const hours = messageDate.getHours().toString().padStart(2, '0');
        const minutes = messageDate.getMinutes().toString().padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    },

    /**
     * Ajoute un timestamp à un élément message
     * @param {HTMLElement} messageElement - L'élément message
     * @param {Date|string|number} timestamp - Le timestamp à ajouter
     */
    addToMessage(messageElement, timestamp = new Date()) {
        if (!messageElement) return;

        // Vérifier si un timestamp existe déjà
        let timestampElement = messageElement.querySelector('.message-timestamp');

        if (!timestampElement) {
            timestampElement = document.createElement('div');
            timestampElement.className = 'message-timestamp';

            // Ajouter après le contenu du message
            const messageContent = messageElement.querySelector('.message-content');
            if (messageContent) {
                messageContent.appendChild(timestampElement);
            } else {
                messageElement.appendChild(timestampElement);
            }
        }

        // Formater et afficher le timestamp
        timestampElement.textContent = this.format(timestamp);

        // Sauvegarder la date brute pour les mises à jour
        timestampElement.dataset.timestamp = new Date(timestamp).toISOString();
    },

    /**
     * Met à jour tous les timestamps de la page
     */
    updateAll() {
        const timestamps = document.querySelectorAll('.message-timestamp');
        timestamps.forEach(element => {
            const timestamp = element.dataset.timestamp;
            if (timestamp) {
                element.textContent = this.format(timestamp);
            }
        });
    },

    /**
     * Démarre la mise à jour automatique des timestamps
     */
    startAutoUpdate() {
        // Mettre à jour toutes les minutes
        setInterval(() => {
            this.updateAll();
        }, 60000); // 60 secondes

        console.log('✅ Timestamps: Auto-update activé');
    }
};

/**
 * Système de gestion de l'input avec label flottant
 */
const InputEnhancer = {
    input: null,
    wrapper: null,
    label: null,
    sendButton: null,
    charCounter: null,
    maxChars: 1000,

    /**
     * Initialise l'amélioration de l'input
     */
    init() {
        this.input = document.getElementById('messageInput');
        this.wrapper = document.querySelector('.input-wrapper');
        this.sendButton = document.getElementById('sendButton');

        if (!this.input || !this.wrapper) {
            console.warn('⚠️ InputEnhancer: Éléments non trouvés');
            return;
        }

        // Ajouter la classe enhanced au wrapper
        this.wrapper.classList.add('input-wrapper-enhanced');

        // Créer le label flottant
        this.createFloatingLabel();

        // Créer le compteur de caractères (optionnel)
        // this.createCharCounter();

        // Attacher les événements
        this.attachEvents();

        console.log('✅ Input amélioré initialisé');
    },

    /**
     * Crée le label flottant
     */
    createFloatingLabel() {
        // Vérifier si le label existe déjà
        if (this.wrapper.querySelector('.floating-label')) {
            this.label = this.wrapper.querySelector('.floating-label');
            return;
        }

        this.label = document.createElement('label');
        this.label.className = 'floating-label';
        this.label.textContent = 'Posez votre question, votre altesse...';
        this.label.htmlFor = 'messageInput';

        // Insérer avant l'input
        this.wrapper.insertBefore(this.label, this.input);
    },

    /**
     * Crée le compteur de caractères
     */
    createCharCounter() {
        this.charCounter = document.createElement('div');
        this.charCounter.className = 'char-counter';
        this.charCounter.textContent = `0 / ${this.maxChars}`;
        this.wrapper.appendChild(this.charCounter);
    },

    /**
     * Attache les événements à l'input
     */
    attachEvents() {
        // Focus
        this.input.addEventListener('focus', () => {
            this.onFocus();
        });

        // Blur
        this.input.addEventListener('blur', () => {
            this.onBlur();
        });

        // Input (saisie)
        this.input.addEventListener('input', () => {
            this.onInput();
        });

        // Keydown pour animations
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                this.onSend();
            }
        });

        // Clic sur le bouton d'envoi
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => {
                this.onSend();
            });
        }
    },

    /**
     * Gère le focus de l'input
     */
    onFocus() {
        this.wrapper.classList.add('focused');

        // Animation du label
        if (this.label) {
            this.label.classList.add('active');
        }
    },

    /**
     * Gère la perte de focus
     */
    onBlur() {
        this.wrapper.classList.remove('focused');

        // Ne retirer active que si l'input est vide
        if (this.label && !this.input.value.trim()) {
            this.label.classList.remove('active');
        }
    },

    /**
     * Gère la saisie dans l'input
     */
    onInput() {
        const hasContent = this.input.value.trim().length > 0;

        // Gérer le label flottant
        if (hasContent) {
            this.wrapper.classList.add('has-content');
            if (this.label) {
                this.label.classList.add('active');
            }
        } else {
            this.wrapper.classList.remove('has-content');
            if (this.label && !this.wrapper.classList.contains('focused')) {
                this.label.classList.remove('active');
            }
        }

        // Mettre à jour le compteur de caractères
        if (this.charCounter) {
            const length = this.input.value.length;
            this.charCounter.textContent = `${length} / ${this.maxChars}`;

            // Changer la couleur selon la longueur
            this.charCounter.classList.remove('warning', 'error');
            if (length > this.maxChars * 0.9) {
                this.charCounter.classList.add('error');
            } else if (length > this.maxChars * 0.7) {
                this.charCounter.classList.add('warning');
            }
        }

        // Animation du bouton d'envoi
        if (this.sendButton) {
            if (hasContent) {
                this.sendButton.classList.add('ready');
            } else {
                this.sendButton.classList.remove('ready');
            }
        }

        // Animation de typing sur l'input
        this.input.classList.add('typing');
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.input.classList.remove('typing');
        }, 1000);
    },

    /**
     * Gère l'envoi du message
     */
    onSend() {
        // Animation du bouton
        if (this.sendButton) {
            this.sendButton.classList.add('shimmer');
            setTimeout(() => {
                this.sendButton.classList.remove('shimmer', 'ready');
            }, 600);
        }

        // Réinitialiser l'input
        setTimeout(() => {
            this.wrapper.classList.remove('has-content');
            if (this.label) {
                this.label.classList.remove('active');
            }
            if (this.charCounter) {
                this.charCounter.textContent = `0 / ${this.maxChars}`;
                this.charCounter.classList.remove('warning', 'error');
            }
        }, 100);
    },

    /**
     * Réinitialise l'input
     */
    reset() {
        this.input.value = '';
        this.wrapper.classList.remove('has-content', 'focused');
        if (this.label) {
            this.label.classList.remove('active');
        }
        if (this.sendButton) {
            this.sendButton.classList.remove('ready', 'shimmer');
        }
    }
};

/**
 * Système de gestion du scroll avec indicateur
 */
const ScrollManager = {
    container: null,
    indicator: null,
    threshold: 100, // Distance en pixels avant d'afficher l'indicateur

    /**
     * Initialise le gestionnaire de scroll
     */
    init() {
        this.container = document.getElementById('messagesContainer');

        if (!this.container) {
            console.warn('⚠️ ScrollManager: Container non trouvé');
            return;
        }

        // Créer l'indicateur de scroll
        this.createIndicator();

        // Attacher les événements
        this.attachEvents();

        console.log('✅ Scroll Manager initialisé');
    },

    /**
     * Crée l'indicateur de scroll vers le bas
     */
    createIndicator() {
        this.indicator = document.createElement('div');
        this.indicator.className = 'scroll-indicator';
        this.indicator.innerHTML = '<i class="fas fa-chevron-down"></i>';
        this.indicator.title = 'Voir les nouveaux messages';

        // Ajouter après le container de messages
        this.container.parentElement.appendChild(this.indicator);

        // Événement clic
        this.indicator.addEventListener('click', () => {
            this.scrollToBottom(true);
        });
    },

    /**
     * Attache les événements de scroll
     */
    attachEvents() {
        this.container.addEventListener('scroll', () => {
            this.checkScrollPosition();
        });
    },

    /**
     * Vérifie la position du scroll et affiche/cache l'indicateur
     */
    checkScrollPosition() {
        if (!this.container || !this.indicator) return;

        const { scrollTop, scrollHeight, clientHeight } = this.container;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        // Afficher l'indicateur si on n'est pas en bas
        if (distanceFromBottom > this.threshold) {
            this.indicator.classList.add('visible');
        } else {
            this.indicator.classList.remove('visible');
        }
    },

    /**
     * Scroll vers le bas
     * @param {boolean} smooth - Utiliser un scroll smooth
     */
    scrollToBottom(smooth = true) {
        if (!this.container) return;

        this.container.scrollTo({
            top: this.container.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    },

    /**
     * Scroll lors de l'ajout d'un nouveau message
     */
    onNewMessage() {
        if (!this.container) {
            console.warn('⚠️ ScrollManager: Container non disponible');
            return;
        }
        // Vérifier si on était déjà en bas
        const { scrollTop, scrollHeight, clientHeight } = this.container;
        const wasAtBottom = scrollHeight - scrollTop - clientHeight < 50;

        // Si on était en bas, scroller automatiquement
        if (wasAtBottom) {
            setTimeout(() => {
                this.scrollToBottom(true);
            }, 100);
        } else {
            // Sinon, afficher l'indicateur
            this.checkScrollPosition();
        }
    }
};

/**
 * Fonction helper pour ajouter un message avec timestamp
 * @param {string} text - Le texte du message
 * @param {string} type - 'user' ou 'bot'
 * @param {Date} timestamp - Le timestamp du message
 */
function addMessageWithTimestamp(text, type, timestamp = new Date()) {
    // Utiliser la fonction addMessage existante
    if (typeof window.addMessage === 'function') {
        window.addMessage(text, type);
    }

    // Attendre que le message soit ajouté au DOM
    setTimeout(() => {
        const messages = document.querySelectorAll('.message');
        const lastMessage = messages[messages.length - 1];

        if (lastMessage) {
            TimestampManager.addToMessage(lastMessage, timestamp);
        }

        // Gérer le scroll
        if (ScrollManager.container) {
            ScrollManager.onNewMessage();
        }
    }, 50);
}

/**
 * Initialisation au chargement de la page
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 UI Polish: Initialisation...');

    // Initialiser le gestionnaire de timestamps
    TimestampManager.startAutoUpdate();

    // Initialiser l'input amélioré
    setTimeout(() => {
        InputEnhancer.init();
    }, 500);

    // Initialiser le scroll manager
    setTimeout(() => {
        ScrollManager.init();
    }, 600);

    // Ajouter des timestamps aux messages existants
    setTimeout(() => {
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach((message, index) => {
            // Simuler des timestamps échelonnés pour les messages existants
            const timestamp = new Date(Date.now() - (existingMessages.length - index) * 60000);
            TimestampManager.addToMessage(message, timestamp);
        });
    }, 700);

    console.log('✅ UI Polish: Tous les modules initialisés');
});

/**
 * Exposer les modules pour utilisation externe
 */
window.UIPolish = {
    TimestampManager,
    InputEnhancer,
    ScrollManager,
    addMessageWithTimestamp
};

console.log('💎 UI Polish chargé avec succès');