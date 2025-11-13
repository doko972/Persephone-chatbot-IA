// ============================================
// 📚 GESTIONNAIRE D'HISTORIQUE DES CONVERSATIONS
// ============================================

const ConversationHistoryManager = {
    conversations: [],
    isLoading: false,



    /**
     * 🎯 Initialisation
     */
    init() {
        console.log('📚 Initialisation du gestionnaire d\'historique');
        this.loadConversations();
        this.setupEventListeners();
    },

    /**
     * 🔄 Charger les conversations depuis l'API
     */
    async loadConversations() {
        const authToken = window.assistantAuth?.getToken();

        if (!authToken) {
            console.log('ℹ️ Pas de token - historique non disponible');
            return;
        }

        this.isLoading = true;
        this.showLoadingState();

        try {
            const API_BASE_URL = 'https://friend.ateliernormandduweb.fr/api';

            const response = await fetch(`${API_BASE_URL}/chatbot/history`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Erreur chargement historique');
            }

            const data = await response.json();
            this.conversations = data.conversations || [];

            console.log('✅ Historique chargé:', this.conversations.length, 'conversations');
            this.render();

        } catch (error) {
            console.error('❌ Erreur chargement historique:', error);
            this.showError();
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * 🗑️ Supprimer UNE conversation
     */
    async deleteConversation(conversationId) {
        console.log('🗑️ Suppression conversation:', conversationId);

        const authToken = window.assistantAuth?.getToken();
        if (!authToken) {
            console.error('❌ Pas de token pour supprimer');
            if (window.showToast) {
                window.showToast('Vous devez être connecté', 'error');
            }
            return;
        }

        try {
            const API_BASE_URL = 'https://friend.ateliernormandduweb.fr/api';

            const response = await fetch(`${API_BASE_URL}/chatbot/conversations/${conversationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            console.log('📥 Statut réponse:', response.status, response.ok);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Erreur HTTP:', errorData);
                throw new Error(errorData.message || 'Erreur suppression');
            }

            const data = await response.json();
            console.log('✅ Réponse serveur:', data);

            // ✅ Supprimer UNIQUEMENT la conversation ciblée
            this.conversations = this.conversations.filter(conv => conv.id !== conversationId);

            console.log('✅ Conversation supprimée localement:', conversationId);
            console.log('📊 Conversations restantes:', this.conversations.length);

            this.render();

            if (window.showToast) {
                window.showToast('✅ Conversation supprimée', 'success');
            }

        } catch (error) {
            console.error('❌ Erreur suppression:', error);

            if (window.showToast) {
                window.showToast('❌ Erreur lors de la suppression', 'error');
            }
        }
    },

    /**
     * 🎨 Afficher les conversations
     */
    render() {
        const container = document.getElementById('historyContent');
        if (!container) return;

        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Aucune conversation enregistrée</p>
                </div>
            `;
            return;
        }

        // Grouper par date
        const grouped = this.groupByDate(this.conversations);

        let html = '';

        for (const [dateLabel, convs] of Object.entries(grouped)) {
            html += `<div class="history-date-group">`;
            html += `<div class="history-date-label">${dateLabel}</div>`;

            convs.forEach(conv => {
                html += this.renderConversationCard(conv);
            });

            html += `</div>`;
        }

        container.innerHTML = html;

        // Attacher les événements de suppression
        this.attachDeleteListeners();
    },

    /**
     * 🎴 Créer une carte de conversation
     */
    renderConversationCard(conv) {
        let timeStr = 'Date inconnue';

        try {
            const date = new Date(conv.created_at);
            if (!isNaN(date.getTime())) {
                timeStr = date.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (e) {
            console.error('❌ Erreur parsing date:', e);
        }

        // ✅ Classes conditionnelles pour favoris
        const cardClass = conv.is_favorite ? 'history-card favorite' : 'history-card';
        const starClass = conv.is_favorite ? 'fas fa-star' : 'far fa-star';
        const starColor = conv.is_favorite ? '#ffd700' : 'rgba(255, 255, 255, 0.5)';

        return `
        <div class="${cardClass}" 
             data-conversation-id="${conv.id}" 
             onclick="ConversationHistoryManager.loadConversation(${conv.id})">
            <div class="history-card-header">
                <div class="history-card-title">${this.truncate(conv.question, 50)}</div>
                <div class="history-card-actions">
                    <!-- 🆕 Bouton favori -->
                    <button class="history-card-favorite" 
                            data-id="${conv.id}" 
                            title="${conv.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}"
                            onclick="event.stopPropagation(); ConversationHistoryManager.toggleFavorite(${conv.id});">
                        <i class="${starClass}" style="color: ${starColor};"></i>
                    </button>
                    
                    <!-- Bouton supprimer -->
                    <button class="history-card-delete" 
                            data-id="${conv.id}" 
                            title="Supprimer"
                            onclick="event.stopPropagation();">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="history-card-preview">
                ${this.truncate(conv.response, 100)}
            </div>
            <div class="history-card-footer">
                <span class="history-card-time">
                    <i class="far fa-clock"></i> ${timeStr}
                </span>
            </div>
        </div>
    `;
    },
    /**
     * ⭐ Toggle le statut favori d'une conversation
     */
    async toggleFavorite(conversationId) {
        console.log('⭐ Toggle favori:', conversationId);

        const authToken = window.assistantAuth?.getToken();
        if (!authToken) {
            console.error('❌ Pas de token');
            return;
        }

        try {
            const API_BASE_URL = 'https://friend.ateliernormandduweb.fr/api';

            const response = await fetch(`${API_BASE_URL}/chatbot/conversations/${conversationId}/favorite`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Erreur toggle favori');
            }

            const data = await response.json();
            console.log('✅ Favori togglé:', data);

            // Mettre à jour localement
            const conv = this.conversations.find(c => c.id === conversationId);
            if (conv) {
                conv.is_favorite = data.is_favorite;
            }

            // Re-render
            this.render();

            // Toast
            if (window.showToast) {
                const message = data.is_favorite ? '⭐ Ajouté aux favoris' : '☆ Retiré des favoris';
                window.showToast(message, 'success');
            }

        } catch (error) {
            console.error('❌ Erreur toggle favori:', error);

            if (window.showToast) {
                window.showToast('❌ Erreur', 'error');
            }
        }
    },
    /**
     * 🔗 Attacher les listeners de suppression
     */
    attachDeleteListeners() {
        const deleteButtons = document.querySelectorAll('.history-card-delete');

        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();

                const conversationId = parseInt(btn.getAttribute('data-id'));

                if (confirm('Voulez-vous vraiment supprimer cette conversation ?')) {
                    this.deleteConversation(conversationId);
                }
            });
        });
    },

    /**
     * 📅 Grouper les conversations par date
     */
    groupByDate(conversations) {
        const grouped = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        conversations.forEach(conv => {
            const date = new Date(conv.created_at);
            date.setHours(0, 0, 0, 0);

            let label;

            if (date.getTime() === today.getTime()) {
                label = "Aujourd'hui";
            } else if (date.getTime() === yesterday.getTime()) {
                label = "Hier";
            } else {
                label = date.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long'
                });
            }

            if (!grouped[label]) {
                grouped[label] = [];
            }

            grouped[label].push(conv);
        });

        return grouped;
    },

    /**
     * ✂️ Tronquer le texte
     */
    truncate(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    /**
     * ⏳ Afficher l'état de chargement
     */
    showLoadingState() {
        const container = document.getElementById('historyContent');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Chargement de l'historique...</p>
                </div>
            `;
        }
    },

    /**
     * ❌ Afficher une erreur
     */
    showError() {
        const container = document.getElementById('historyContent');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erreur lors du chargement</p>
                    <button onclick="ConversationHistoryManager.loadConversations()">
                        Réessayer
                    </button>
                </div>
            `;
        }
    },

    /**
     * 🎧 Configuration des événements
     */
    setupEventListeners() {
        // Bouton refresh
        const refreshBtn = document.getElementById('refreshHistory');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadConversations();
            });
        }

        // Recherche dans l'historique
        const searchInput = document.getElementById('historySearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterConversations(e.target.value);
            });
        }

        // 🆕 FILTRES PAR DATE
        const filterChips = document.querySelectorAll('.filter-chip');
        if (filterChips.length > 0) {
            filterChips.forEach(chip => {
                chip.addEventListener('click', (e) => {
                    // Retirer la classe active de tous les filtres
                    filterChips.forEach(c => c.classList.remove('active'));

                    // Ajouter active au filtre cliqué
                    chip.classList.add('active');

                    // Appliquer le filtre
                    const filter = chip.getAttribute('data-filter');
                    this.applyDateFilter(filter);
                });
            });

            console.log('✅ Filtres de date configurés');
        }
    },

    /**
     * 🔍 Filtrer les conversations par recherche
     */
    filterConversations(query) {
        if (!query) {
            this.render();
            return;
        }

        const filtered = this.conversations.filter(conv =>
            conv.question.toLowerCase().includes(query.toLowerCase()) ||
            conv.response.toLowerCase().includes(query.toLowerCase())
        );

        const tempConversations = this.conversations;
        this.conversations = filtered;
        this.render();
        this.conversations = tempConversations;
    },

    /**
     * 📅 Filtrer par période
     */
    applyDateFilter(filter) {
        console.log('📅 Filtre appliqué:', filter);

        if (filter === 'all') {
            this.render();
            return;
        }

        // 🆕 Filtre favoris
        if (filter === 'favorites') {
            const filtered = this.conversations.filter(conv => conv.is_favorite);
            console.log(`✅ ${filtered.length} conversations favorites`);

            const tempConversations = this.conversations;
            this.conversations = filtered;
            this.render();
            this.conversations = tempConversations;
            return;
        }

        // Reste du code pour today et week...
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let startDate = new Date(now);

        if (filter === 'today') {
            startDate = now;
        } else if (filter === 'week') {
            startDate.setDate(now.getDate() - 7);
        }

        const filtered = this.conversations.filter(conv => {
            const convDate = new Date(conv.created_at);
            convDate.setHours(0, 0, 0, 0);
            return convDate >= startDate;
        });

        console.log(`✅ ${filtered.length} conversations trouvées pour "${filter}"`);

        const tempConversations = this.conversations;
        this.conversations = filtered;
        this.render();
        this.conversations = tempConversations;
    },
    /**
    * 💬 Charger une conversation dans le chat
    */
    loadConversation(conversationId) {
        console.log('💬 Chargement conversation:', conversationId);

        // Trouver la conversation
        const conversation = this.conversations.find(conv => conv.id === conversationId);

        if (!conversation) {
            console.error('❌ Conversation non trouvée:', conversationId);
            return;
        }

        // Vider le chat actuel
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) {
            console.error('❌ Container de messages non trouvé');
            return;
        }

        // Nettoyer les messages existants
        messagesContainer.innerHTML = '';

        // Ajouter le message utilisateur
        const userMessage = document.createElement('div');
        userMessage.className = 'message user-message';
        userMessage.innerHTML = `
        <div class="message-content">
            <p>${this.escapeHtml(conversation.question)}</p>
        </div>
        <div class="message-avatar">
            <i class="fas fa-crown"></i>
        </div>
    `;
        messagesContainer.appendChild(userMessage);

        // Ajouter le message bot
        const botMessage = document.createElement('div');
        botMessage.className = 'message bot-message';
        botMessage.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="message-header">Charly</div>
            <p>${this.escapeHtml(conversation.response)}</p>
        </div>
    `;
        messagesContainer.appendChild(botMessage);

        // Scroll vers le bas
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Fermer le panneau historique
        const historyPanel = document.getElementById('historyPanel');
        if (historyPanel) {
            historyPanel.classList.remove('active');
        }

        // Toast de confirmation
        if (window.showToast) {
            window.showToast('💬 Conversation chargée', 'success');
        }

        console.log('✅ Conversation chargée avec succès');
    },

    /**
     * 🛡️ Échapper les caractères HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
};

// 🚀 Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    // Attendre que l'utilisateur soit connecté
    setTimeout(() => {
        if (window.assistantAuth?.isAuthenticated()) {
            ConversationHistoryManager.init();
        }
    }, 1000);
});

// 📤 Exposer globalement
window.ConversationHistoryManager = ConversationHistoryManager;

console.log('📚 conversation-history.js chargé');