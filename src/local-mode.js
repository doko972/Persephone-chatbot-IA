// ============================================
// MODE LOCAL — clé OpenAI personnelle + stockage SQLite
// Alternative sans compte/serveur au mode cloud (Laravel).
// ============================================

const LocalMode = {
    DB_URL: 'sqlite:charly.db',
    MODEL: 'gpt-4o-mini',
    SYSTEM_PROMPT:
        "Tu es Charly, l'assistant IA dévoué de l'Impératrice Persephone. " +
        "Réponds toujours en français, avec un ton chaleureux, respectueux " +
        "et légèrement cérémonieux. Sois concis et utile.",

    _db: null,

    isEnabled() {
        return localStorage.getItem('app_mode') === 'local';
    },

    getApiKey() {
        return localStorage.getItem('local_openai_api_key') || '';
    },

    setMode(mode) {
        localStorage.setItem('app_mode', mode === 'local' ? 'local' : 'cloud');
    },

    setApiKey(key) {
        localStorage.setItem('local_openai_api_key', (key || '').trim());
    },

    async _getDb() {
        if (!this._db) {
            this._db = await window.__TAURI__.sql.Database.load(this.DB_URL);
        }
        return this._db;
    },

    /**
     * Envoie la conversation à OpenAI et renvoie le texte de la réponse.
     * `conversationHistory` contient déjà le tour utilisateur courant en
     * dernier ({role, content}), au même format que l'API OpenAI attend.
     */
    async sendChatCompletion(conversationHistory, useContext) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error("Aucune clé API OpenAI renseignée. Ouvrez les paramètres pour en ajouter une.");
        }

        const history = useContext ? conversationHistory : conversationHistory.slice(-1);
        const messages = [{ role: 'system', content: this.SYSTEM_PROMPT }, ...history];

        const response = await apiFetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.MODEL,
                messages
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Clé API OpenAI invalide.");
            }
            if (response.status === 429) {
                throw new Error("Quota OpenAI dépassé, réessayez plus tard.");
            }
            throw new Error(`Erreur OpenAI (${response.status})`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content ?? '';
    },

    async listConversations() {
        const db = await this._getDb();
        return await db.select('SELECT * FROM conversations ORDER BY created_at DESC');
    },

    async saveConversation(question, response) {
        const db = await this._getDb();
        await db.execute(
            'INSERT INTO conversations (question, response) VALUES ($1, $2)',
            [question, response]
        );
    },

    async deleteConversation(id) {
        const db = await this._getDb();
        await db.execute('DELETE FROM conversations WHERE id = $1', [id]);
    },

    async toggleFavorite(id) {
        const db = await this._getDb();
        const rows = await db.select('SELECT is_favorite FROM conversations WHERE id = $1', [id]);
        const current = rows?.[0]?.is_favorite ? 1 : 0;
        const next = current ? 0 : 1;
        await db.execute('UPDATE conversations SET is_favorite = $1 WHERE id = $2', [next, id]);
        return !!next;
    }
};

window.LocalMode = LocalMode;

console.log('🗄️ LocalMode chargé');
