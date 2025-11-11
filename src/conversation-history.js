const ConversationHistoryManager = {
    // Configuration
    API_BASE_URL: 'https://friend.ateliernormandduweb.fr/api',
    STORAGE_KEY: 'all_conversations',
    CURRENT_CONV_KEY: 'current_conversation_id',
    
    // État
    conversations: [],
    currentConversationId: null,
    isServerSynced: false,
    
    /**
     * Initialise le gestionnaire d'historique
     */
    init() {
        console.log('📚 Initialisation Conversation History Manager...');
        
        // Charger l'ID de la conversation actuelle
        this.currentConversationId = localStorage.getItem(this.CURRENT_CONV_KEY);
        
        // Charger les conversations locales
        this.loadLocalConversations();
        
        // Charger les conversations du serveur si connecté
        if (window.assistantAuth && window.assistantAuth.isAuthenticated()) {
            this.loadServerConversations();
        }
        
        // Créer l'interface
        this.createUI();
        
        // Attacher les événements
        this.attachEvents();
        
        // Modifier Ctrl+N pour sauvegarder avant d'effacer
        this.interceptNewConversation();
        
        console.log('✅ Conversation History Manager initialisé');
    },
    
    /**
     * Charge les conversations depuis le localStorage
     */
    loadLocalConversations() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            this.conversations = stored ? JSON.parse(stored) : [];
            console.log(`📥 ${this.conversations.length} conversations locales chargées`);
        } catch (error) {
            console.error('❌ Erreur chargement conversations locales:', error);
            this.conversations = [];
        }
    },
    
    /**
     * Charge les conversations depuis le serveur
     */
    async loadServerConversations() {
        try {
            const token = window.assistantAuth.getToken();
            if (!token) return;
            
            console.log('🔄 Chargement conversations serveur...');
            
            const response = await fetch(`${this.API_BASE_URL}/chatbot/history`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.conversations) {
                console.log(`✅ ${data.conversations.length} conversations serveur récupérées`);
                
                // Fusionner avec les conversations locales
                this.mergeServerConversations(data.conversations);
                this.isServerSynced = true;
                
                // Rafraîchir l'UI
                this.renderConversations();
            }
        } catch (error) {
            console.error('❌ Erreur chargement conversations serveur:', error);
        }
    },
    
    /**
     * Fusionne les conversations serveur avec les locales
     */
    mergeServerConversations(serverConvs) {
        // Convertir les conversations serveur au format local
        const converted = serverConvs.map(conv => ({
            id: `server-${conv.id}`,
            serverId: conv.id,
            title: this.generateTitle(conv.messages || []),
            date: conv.updated_at,
            messages: conv.messages || [],
            messageCount: (conv.messages || []).length,
            source: 'server',
            isFavorite: false
        }));
        
        // Fusionner (éviter les doublons)
        const localIds = this.conversations.map(c => c.id);
        const newConvs = converted.filter(c => !localIds.includes(c.id));
        
        this.conversations = [...this.conversations, ...newConvs];
        this.conversations.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Sauvegarder
        this.saveConversations();
    },
    
    /**
     * Génère un titre automatique basé sur le premier message
     */
    generateTitle(messages) {
        if (!messages || messages.length === 0) {
            return 'Nouvelle conversation';
        }
        
        const firstUserMsg = messages.find(m => m.role === 'user');
        if (firstUserMsg && firstUserMsg.content) {
            // Prendre les 50 premiers caractères
            let title = firstUserMsg.content.substring(0, 50);
            if (firstUserMsg.content.length > 50) {
                title += '...';
            }
            return title;
        }
        
        return 'Conversation sans titre';
    },
    
    /**
     * Sauvegarde la conversation actuelle
     */
    saveCurrentConversation() {
        // Récupérer l'historique actuel depuis le système existant
        const currentHistory = window.conversationHistory || [];
        
        if (currentHistory.length === 0) {
            console.log('ℹ️ Pas de messages à sauvegarder');
            return null;
        }
        
        // Créer ou mettre à jour la conversation
        const convId = this.currentConversationId || `local-${Date.now()}`;
        
        let conversation = this.conversations.find(c => c.id === convId);
        
        if (conversation) {
            // Mettre à jour
            conversation.messages = currentHistory;
            conversation.messageCount = currentHistory.length;
            conversation.date = new Date().toISOString();
            conversation.title = this.generateTitle(currentHistory);
        } else {
            // Créer nouvelle
            conversation = {
                id: convId,
                title: this.generateTitle(currentHistory),
                date: new Date().toISOString(),
                messages: currentHistory,
                messageCount: currentHistory.length,
                source: 'local',
                isFavorite: false
            };
            
            this.conversations.unshift(conversation);
        }
        
        // Sauvegarder
        this.currentConversationId = convId;
        localStorage.setItem(this.CURRENT_CONV_KEY, convId);
        this.saveConversations();
        
        console.log(`💾 Conversation sauvegardée: ${conversation.title}`);
        
        return conversation;
    },
    
    /**
     * Charge une conversation
     */
    loadConversation(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        
        if (!conversation) {
            console.error('❌ Conversation introuvable:', conversationId);
            return;
        }
        
        console.log(`📂 Chargement conversation: ${conversation.title}`);
        
        // Effacer la conversation actuelle
        if (typeof window.clearSavedHistory === 'function') {
            window.clearSavedHistory();
        }
        
        // Charger les messages
        window.conversationHistory = conversation.messages || [];
        
        // Sauvegarder dans localStorage (pour restoreMessagesUI)
        localStorage.setItem('business_conversation_history', JSON.stringify(conversation.messages));
        
        // Restaurer l'UI
        if (typeof window.restoreMessagesUI === 'function') {
            window.restoreMessagesUI();
        } else {
            // Fallback: recharger la page
            location.reload();
        }
        
        // Définir comme conversation actuelle
        this.currentConversationId = conversationId;
        localStorage.setItem(this.CURRENT_CONV_KEY, conversationId);
        
        // Fermer le panneau
        this.closePanel();
        
        // Mettre à jour l'UI
        this.renderConversations();
    },
    
    /**
     * Crée une nouvelle conversation
     */
    createNewConversation() {
        // Sauvegarder la conversation actuelle
        this.saveCurrentConversation();
        
        // Réinitialiser
        if (typeof window.clearSavedHistory === 'function') {
            window.clearSavedHistory();
        }
        
        // Nouveau ID
        this.currentConversationId = null;
        localStorage.removeItem(this.CURRENT_CONV_KEY);
        
        // Rafraîchir l'UI
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
            
            // Message de bienvenue
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
            messagesContainer.appendChild(welcomeDiv);
        }
        
        // Animation
        if (window.AnimationManager) {
            window.AnimationManager.greet();
        }
        
        console.log('✨ Nouvelle conversation créée');
    },
    
    /**
     * Supprime une conversation
     */
    deleteConversation(conversationId, event) {
        if (event) {
            event.stopPropagation();
        }
        
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        if (!confirm(`Supprimer "${conversation.title}" ?`)) {
            return;
        }
        
        // Supprimer
        this.conversations = this.conversations.filter(c => c.id !== conversationId);
        this.saveConversations();
        
        // Si c'est la conversation actuelle, créer une nouvelle
        if (this.currentConversationId === conversationId) {
            this.createNewConversation();
        }
        
        // Rafraîchir l'UI
        this.renderConversations();
        
        console.log(`🗑️ Conversation supprimée: ${conversation.title}`);
    },
    
    /**
     * Toggle favoris
     */
    toggleFavorite(conversationId, event) {
        if (event) {
            event.stopPropagation();
        }
        
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        conversation.isFavorite = !conversation.isFavorite;
        this.saveConversations();
        this.renderConversations();
    },
    
    /**
     * Exporte une conversation
     */
    exportConversation(conversationId, format = 'json', event) {
        if (event) {
            event.stopPropagation();
        }
        
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        let content, filename, mimeType;
        
        if (format === 'json') {
            content = JSON.stringify(conversation, null, 2);
            filename = `conversation-${conversationId}.json`;
            mimeType = 'application/json';
        } else if (format === 'txt') {
            content = this.conversationToText(conversation);
            filename = `conversation-${conversationId}.txt`;
            mimeType = 'text/plain';
        }
        
        // Télécharger
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log(`📤 Conversation exportée: ${filename}`);
    },
    
    /**
     * Convertit une conversation en texte
     */
    conversationToText(conversation) {
        let text = `Conversation: ${conversation.title}\n`;
        text += `Date: ${new Date(conversation.date).toLocaleString()}\n`;
        text += `Messages: ${conversation.messageCount}\n`;
        text += `\n${'='.repeat(60)}\n\n`;
        
        conversation.messages.forEach((msg, index) => {
            const role = msg.role === 'user' ? 'VOUS' : 'ASSISTANT';
            text += `[${role}]\n${msg.content}\n\n`;
        });
        
        return text;
    },
    
    /**
     * Sauvegarde les conversations
     */
    saveConversations() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.conversations));
            console.log('💾 Conversations sauvegardées');
        } catch (error) {
            console.error('❌ Erreur sauvegarde conversations:', error);
        }
    },
    
    /**
     * Crée l'interface utilisateur
     */
    createUI() {
        // Vérifier si déjà créé
        if (document.getElementById('historyPanel')) {
            console.log('ℹ️ UI historique déjà créée');
            return;
        }
        
        // Créer le panneau
        const panel = document.createElement('div');
        panel.id = 'historyPanel';
        panel.className = 'history-panel';
        panel.innerHTML = `
            <div class="history-header">
                <h3><i class="fas fa-history"></i> Historique</h3>
                <div class="history-header-actions">
                    <button class="history-btn" id="refreshHistoryBtn" title="Actualiser">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="close-history" id="closeHistoryBtn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="history-search">
                <div class="history-search-wrapper">
                    <i class="fas fa-search history-search-icon"></i>
                    <input type="text" class="history-search-input" id="historySearchInput" 
                           placeholder="Rechercher dans l'historique...">
                </div>
            </div>
            
            <div class="history-filters">
                <div class="filter-chip active" data-filter="all">
                    <i class="fas fa-list"></i> Toutes
                </div>
                <div class="filter-chip" data-filter="favorites">
                    <i class="fas fa-star"></i> Favoris
                </div>
                <div class="filter-chip" data-filter="today">
                    <i class="fas fa-clock"></i> Aujourd'hui
                </div>
                <div class="filter-chip" data-filter="week">
                    <i class="fas fa-calendar-week"></i> Cette semaine
                </div>
            </div>
            
            <div class="history-content" id="historyContent">
                <!-- Conversations chargées ici -->
            </div>
            
            <div class="history-stats">
                <div class="history-stats-item">
                    <i class="fas fa-comments"></i>
                    <span><span class="history-stats-value" id="totalConversations">0</span> conversations</span>
                </div>
                <div class="history-stats-item">
                    <i class="fas fa-message"></i>
                    <span><span class="history-stats-value" id="totalMessages">0</span> messages</span>
                </div>
            </div>
        `;
        
        // Créer l'overlay
        const overlay = document.createElement('div');
        overlay.id = 'historyOverlay';
        overlay.className = 'history-overlay';
        
        // Ajouter au DOM
        document.body.appendChild(overlay);
        document.body.appendChild(panel);
        
        // Créer le bouton dans le header
        this.createHeaderButton();
        
        // Rendre les conversations
        this.renderConversations();
    },
    
    /**
     * Crée le bouton d'historique dans le header
     */
    createHeaderButton() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;
        
        // Vérifier si le bouton existe déjà
        if (document.getElementById('historyBtn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'historyBtn';
        btn.className = 'icon-btn';
        btn.title = 'Historique des conversations';
        btn.innerHTML = '<i class="fas fa-history"></i>';
        
        // Insérer avant le bouton de paramètres
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            headerActions.insertBefore(btn, settingsBtn);
        } else {
            headerActions.prepend(btn);
        }
    },
    
    /**
     * Rend les conversations
     */
    renderConversations(filter = 'all', searchQuery = '') {
        const content = document.getElementById('historyContent');
        if (!content) return;
        
        // Filtrer les conversations
        let filtered = this.conversations;
        
        // Filtre par catégorie
        if (filter === 'favorites') {
            filtered = filtered.filter(c => c.isFavorite);
        } else if (filter === 'today') {
            const today = new Date().setHours(0, 0, 0, 0);
            filtered = filtered.filter(c => new Date(c.date).setHours(0, 0, 0, 0) === today);
        } else if (filter === 'week') {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(c => new Date(c.date) >= weekAgo);
        }
        
        // Filtre par recherche
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(c =>
                c.title.toLowerCase().includes(query) ||
                c.messages.some(m => m.content.toLowerCase().includes(query))
            );
        }
        
        // Grouper par date
        const grouped = this.groupByDate(filtered);
        
        // Vider le contenu
        content.innerHTML = '';
        
        // Afficher les conversations
        if (filtered.length === 0) {
            content.innerHTML = `
                <div class="history-empty">
                    <div class="history-empty-icon"><i class="fas fa-inbox"></i></div>
                    <div class="history-empty-title">Aucune conversation</div>
                    <div class="history-empty-text">
                        ${searchQuery ? 'Aucun résultat pour cette recherche' : 'Commencez une nouvelle conversation !'}
                    </div>
                </div>
            `;
            return;
        }
        
        // Afficher par groupe
        Object.keys(grouped).forEach(dateLabel => {
            const group = document.createElement('div');
            group.className = 'history-date-group';
            
            const label = document.createElement('div');
            label.className = 'history-date-label';
            label.textContent = dateLabel;
            group.appendChild(label);
            
            grouped[dateLabel].forEach(conv => {
                const item = this.createConversationItem(conv);
                group.appendChild(item);
            });
            
            content.appendChild(group);
        });
        
        // Mettre à jour les stats
        this.updateStats();
    },
    
    /**
     * Groupe les conversations par date
     */
    groupByDate(conversations) {
        const groups = {};
        const now = new Date();
        const today = new Date(now.setHours(0, 0, 0, 0));
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        conversations.forEach(conv => {
            const date = new Date(conv.date);
            const dateOnly = new Date(date.setHours(0, 0, 0, 0));
            
            let label;
            if (dateOnly.getTime() === today.getTime()) {
                label = "Aujourd'hui";
            } else if (dateOnly.getTime() === yesterday.getTime()) {
                label = "Hier";
            } else if (dateOnly >= weekAgo) {
                label = "Cette semaine";
            } else {
                label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            }
            
            if (!groups[label]) {
                groups[label] = [];
            }
            groups[label].push(conv);
        });
        
        return groups;
    },
    
    /**
     * Crée un élément de conversation
     */
    createConversationItem(conversation) {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.dataset.id = conversation.id;
        
        if (conversation.id === this.currentConversationId) {
            item.classList.add('active');
        }
        
        const date = new Date(conversation.date);
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        const preview = conversation.messages.slice(-1)[0]?.content || 'Conversation vide';
        
        item.innerHTML = `
            <div class="history-item-header">
                <div class="history-item-title">${this.escapeHtml(conversation.title)}</div>
                <div class="history-item-actions">
                    ${conversation.isFavorite ?
                        '<i class="fas fa-star history-item-favorite"></i>' :
                        '<button class="history-item-action" data-action="favorite" title="Favori"><i class="far fa-star"></i></button>'
                    }
                    <button class="history-item-action" data-action="export" title="Exporter"><i class="fas fa-download"></i></button>
                    <button class="history-item-action danger" data-action="delete" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="history-item-meta">
                <span><i class="far fa-clock"></i> ${timeStr}</span>
                <span><i class="far fa-comment"></i> ${conversation.messageCount}</span>
                ${conversation.source === 'server' ? '<span><i class="fas fa-cloud"></i> Serveur</span>' : ''}
            </div>
            <div class="history-item-preview">${this.escapeHtml(preview.substring(0, 80))}...</div>
        `;
        
        return item;
    },
    
    /**
     * Échappe le HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Met à jour les statistiques
     */
    updateStats() {
        const totalConvs = document.getElementById('totalConversations');
        const totalMsgs = document.getElementById('totalMessages');
        
        if (totalConvs) {
            totalConvs.textContent = this.conversations.length;
        }
        
        if (totalMsgs) {
            const total = this.conversations.reduce((sum, c) => sum + c.messageCount, 0);
            totalMsgs.textContent = total;
        }
    },
    
    /**
     * Attache les événements
     */
    attachEvents() {
        // Bouton d'ouverture
        const historyBtn = document.getElementById('historyBtn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.openPanel());
        }
        
        // Bouton de fermeture
        const closeBtn = document.getElementById('closeHistoryBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePanel());
        }
        
        // Overlay
        const overlay = document.getElementById('historyOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closePanel());
        }
        
        // Actualiser
        const refreshBtn = document.getElementById('refreshHistoryBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        // Recherche
        const searchInput = document.getElementById('historySearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
                this.renderConversations(activeFilter, e.target.value);
            });
        }
        
        // Filtres
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const searchQuery = document.getElementById('historySearchInput')?.value || '';
                this.renderConversations(chip.dataset.filter, searchQuery);
            });
        });
        
        // Délégation d'événements pour les items
        const content = document.getElementById('historyContent');
        if (content) {
            content.addEventListener('click', (e) => {
                const item = e.target.closest('.history-item');
                if (!item) return;
                
                const action = e.target.closest('[data-action]');
                if (action) {
                    const actionType = action.dataset.action;
                    const convId = item.dataset.id;
                    
                    if (actionType === 'delete') {
                        this.deleteConversation(convId, e);
                    } else if (actionType === 'favorite') {
                        this.toggleFavorite(convId, e);
                    } else if (actionType === 'export') {
                        this.exportConversation(convId, 'txt', e);
                    }
                } else {
                    // Clic sur l'item = charger la conversation
                    this.loadConversation(item.dataset.id);
                }
            });
        }
    },
    
    /**
     * Intercepte Ctrl+N pour sauvegarder
     */
    interceptNewConversation() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'n' && !e.defaultPrevented) {
                e.preventDefault();
                
                if (confirm('Démarrer une nouvelle conversation ?')) {
                    this.createNewConversation();
                }
            }
        });
        
        console.log('✅ Ctrl+N intercepté');
    },
    
    /**
     * Ouvre le panneau
     */
    openPanel() {
        const panel = document.getElementById('historyPanel');
        const overlay = document.getElementById('historyOverlay');
        
        if (panel) panel.classList.add('active');
        if (overlay) overlay.classList.add('active');
        
        // Actualiser
        this.renderConversations();
    },
    
    /**
     * Ferme le panneau
     */
    closePanel() {
        const panel = document.getElementById('historyPanel');
        const overlay = document.getElementById('historyOverlay');
        
        if (panel) panel.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    },
    
    /**
     * Actualise depuis le serveur
     */
    async refresh() {
        const btn = document.getElementById('refreshHistoryBtn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
            btn.disabled = true;
        }
        
        await this.loadServerConversations();
        
        if (btn) {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            btn.disabled = false;
        }
    }
};

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        ConversationHistoryManager.init();
    }, 800);
});

// Sauvegarder automatiquement avant de quitter
window.addEventListener('beforeunload', () => {
    if (ConversationHistoryManager && window.conversationHistory && window.conversationHistory.length > 0) {
        ConversationHistoryManager.saveCurrentConversation();
    }
});

// Exposer globalement
window.ConversationHistoryManager = ConversationHistoryManager;

console.log('📚 Conversation History Manager chargé');