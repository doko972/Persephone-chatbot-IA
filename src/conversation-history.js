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
            } else {
                console.warn('⚠️ Date invalide pour conversation:', conv.id, conv.created_at);
            }
        } catch (e) {
            console.error('❌ Erreur parsing date:', e);
        }

        return `
            <div class="history-card" data-conversation-id="${conv.id}">
                <div class="history-card-header">
                    <div class="history-card-title">${this.truncate(conv.question, 50)}</div>
                    <button class="history-card-delete" data-id="${conv.id}" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
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
            // Afficher toutes les conversations
            this.render();
            return;
        }
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        let startDate = new Date(now);
        
        if (filter === 'today') {
            // Aujourd'hui uniquement
            startDate = now;
        } else if (filter === 'week') {
            // Cette semaine (7 derniers jours)
            startDate.setDate(now.getDate() - 7);
        }
        
        // Filtrer les conversations
        const filtered = this.conversations.filter(conv => {
            const convDate = new Date(conv.created_at);
            convDate.setHours(0, 0, 0, 0);
            return convDate >= startDate;
        });
        
        console.log(`✅ ${filtered.length} conversations trouvées pour "${filter}"`);
        
        // Afficher temporairement les conversations filtrées
        const tempConversations = this.conversations;
        this.conversations = filtered;
        this.render();
        this.conversations = tempConversations;
    }
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