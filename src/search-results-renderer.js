// ============================================
// SEARCH RESULTS RENDERER
// Module pour afficher les résultats de recherche web
// ============================================

const SearchResultsRenderer = {
    
    /**
     * 🆕 Ouvrir un lien externe (compatible Tauri/Electron/Web)
     */
    openExternalLink(url) {
        console.log('🔗 Ouverture du lien:', url);

        // Tauri
        if (window.__TAURI__ && window.__TAURI__.shell) {
            window.__TAURI__.shell.open(url)
                .then(() => console.log('✅ Lien ouvert avec Tauri'))
                .catch(err => console.error('❌ Erreur Tauri:', err));
            return;
        }

        // Electron
        if (window.electronAPI && window.electronAPI.openExternal) {
            window.electronAPI.openExternal(url);
            console.log('✅ Lien ouvert avec Electron');
            return;
        }

        // Fallback : navigateur classique
        window.open(url, '_blank', 'noopener,noreferrer');
        console.log('✅ Lien ouvert dans navigateur');
    },

    /**
     * Afficher les résultats de recherche dans un message
     * 
     * @param {Array} results - Tableau des résultats
     * @param {string} query - Requête de recherche
     * @param {HTMLElement} messageElement - Élément du message où insérer
     */
    render(results, query, messageElement) {
        if (!results || results.length === 0) {
            return;
        }

        console.log('🔍 Affichage de', results.length, 'résultats de recherche');

        // Créer le container
        const container = document.createElement('div');
        container.className = 'search-results-container';

        // Header avec le nombre de résultats
        const header = this.createHeader(results.length, query);
        container.appendChild(header);

        // Créer les cartes
        results.forEach((result, index) => {
            const card = this.createResultCard(result, index);
            container.appendChild(card);
        });

        // Insérer dans le message
        messageElement.appendChild(container);
    },

    /**
     * Créer l'en-tête des résultats
     */
    createHeader(count, query) {
        const header = document.createElement('div');
        header.className = 'search-results-header';
        header.innerHTML = `
            <div class="search-results-title">
                <i class="fas fa-search"></i>
                <span>Résultats de recherche</span>
            </div>
            <div class="search-results-count">
                ${count} résultat${count > 1 ? 's' : ''}
            </div>
        `;
        return header;
    },

    /**
     * Créer une carte de résultat
     */
    createResultCard(result, index) {
        const card = document.createElement('div');
        card.className = 'search-result-card';
        card.dataset.resultIndex = index;

        if (result.type === 'location') {
            card.innerHTML = this.createLocationCard(result);
        } else {
            card.innerHTML = this.createWebCard(result);
        }

        return card;
    },

    /**
     * Créer une carte pour un résultat local (restaurant, commerce...)
     */
    createLocationCard(result) {
        const rating = this.createRatingHTML(result.rating, result.reviews_count);
        const actions = this.createLocationActions(result);
        const map = this.createMapHTML(result);

        // Préparer les URLs sécurisées
        const cleanPhone = result.phone ? result.phone.replace(/\s/g, '') : '';
        const safeUrl = result.url ? this.escapeHtml(result.url) : '';

        return `
            <div class="result-card-header">
                <div class="result-card-title">
                    <h4 class="result-title">
                        <span class="result-title-icon">📍</span>
                        ${this.escapeHtml(result.title)}
                    </h4>
                    ${rating}
                </div>
                <span class="result-type-badge location">Local</span>
            </div>

            ${result.description ? `
                <div class="result-description">
                    ${this.escapeHtml(result.description)}
                </div>
            ` : ''}

            <div class="result-info">
                ${result.address ? `
                    <div class="result-info-item">
                        <i class="fas fa-map-marker-alt result-info-icon"></i>
                        <span class="result-info-text">${this.escapeHtml(result.address)}</span>
                    </div>
                ` : ''}
                
                ${result.phone ? `
                    <div class="result-info-item">
                        <i class="fas fa-phone result-info-icon"></i>
                        <span class="result-info-text">
                            <a href="#" onclick="SearchResultsRenderer.openExternalLink('tel:${cleanPhone}'); return false;">
                                ${this.escapeHtml(result.phone)}
                            </a>
                        </span>
                    </div>
                ` : ''}

                ${result.url ? `
                    <div class="result-info-item">
                        <i class="fas fa-globe result-info-icon"></i>
                        <span class="result-info-text">
                            <a href="#" onclick="SearchResultsRenderer.openExternalLink('${safeUrl}'); return false;">
                                ${this.getDomain(result.url)}
                            </a>
                        </span>
                    </div>
                ` : ''}
            </div>

            ${actions}
            ${map}
        `;
    },

    /**
     * Créer une carte pour un résultat web standard
     */
    createWebCard(result) {
        const safeUrl = this.escapeHtml(result.url);
        
        return `
            <div class="result-card-header">
                <div class="result-card-title">
                    <h4 class="result-title">
                        <span class="result-title-icon">🌐</span>
                        ${this.escapeHtml(result.title)}
                    </h4>
                </div>
                <span class="result-type-badge web">Web</span>
            </div>

            ${result.description ? `
                <div class="result-description">
                    ${this.escapeHtml(result.description)}
                </div>
            ` : ''}

            <div class="result-info">
                <div class="result-info-item">
                    <i class="fas fa-link result-info-icon"></i>
                    <span class="result-info-text">
                        <a href="#" onclick="SearchResultsRenderer.openExternalLink('${safeUrl}'); return false;">
                            ${this.getDomain(result.url)}
                        </a>
                    </span>
                </div>
            </div>

            <div class="result-actions">
                <button onclick="SearchResultsRenderer.openExternalLink('${safeUrl}')" 
                   class="result-action-btn primary">
                    <i class="fas fa-external-link-alt"></i>
                    <span>Visiter le site</span>
                </button>
            </div>
        `;
    },

    /**
     * Créer le HTML pour les étoiles de notation
     */
    createRatingHTML(rating, reviewsCount) {
        if (!rating) return '';

        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHTML = '<div class="rating-stars">';
        
        // Étoiles pleines
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star star-filled"></i>';
        }
        
        // Demi-étoile
        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt star-filled"></i>';
        }
        
        // Étoiles vides
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star star-empty"></i>';
        }
        
        starsHTML += '</div>';

        return `
            <div class="result-rating">
                ${starsHTML}
                <span class="rating-value">${rating.toFixed(1)}</span>
                ${reviewsCount ? `<span class="rating-count">(${reviewsCount} avis)</span>` : ''}
            </div>
        `;
    },

    /**
     * Créer les boutons d'action pour un lieu
     */
    createLocationActions(result) {
        let actionsHTML = '<div class="result-actions">';

        // Bouton Appeler
        if (result.phone) {
            const cleanPhone = result.phone.replace(/\s/g, '');
            actionsHTML += `
                <button onclick="SearchResultsRenderer.openExternalLink('tel:${cleanPhone}')" class="result-action-btn primary">
                    <i class="fas fa-phone"></i>
                    <span>Appeler</span>
                </button>
            `;
        }

        // Bouton Itinéraire
        if (result.address) {
            const addressEncoded = encodeURIComponent(result.address);
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${addressEncoded}`;
            actionsHTML += `
                <button onclick="SearchResultsRenderer.openExternalLink('${mapsUrl}')" 
                   class="result-action-btn">
                    <i class="fas fa-directions"></i>
                    <span>Itinéraire</span>
                </button>
            `;
        }

        // Bouton Site web
        if (result.url) {
            const safeUrl = this.escapeHtml(result.url);
            actionsHTML += `
                <button onclick="SearchResultsRenderer.openExternalLink('${safeUrl}')" 
                   class="result-action-btn">
                    <i class="fas fa-globe"></i>
                    <span>Site web</span>
                </button>
            `;
        }

        // Bouton Partager
        if (navigator.share && result.title) {
            const safeTitle = this.escapeHtml(result.title);
            const safeUrlForShare = result.url ? this.escapeHtml(result.url) : '';
            actionsHTML += `
                <button class="result-action-btn" onclick="SearchResultsRenderer.shareResult('${safeTitle}', '${safeUrlForShare}')">
                    <i class="fas fa-share-alt"></i>
                    <span>Partager</span>
                </button>
            `;
        }

        actionsHTML += '</div>';
        return actionsHTML;
    },

    /**
     * Créer la mini-carte Google Maps
     */
    createMapHTML(result) {
        if (!result.coordinates || !result.coordinates.lat || !result.coordinates.lng) {
            return '';
        }

        const { lat, lng } = result.coordinates;
        const mapUrl = `https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${lat},${lng}&zoom=15`;

        return `
            <div class="result-map-container">
                <div class="result-map-placeholder">
                    <i class="fas fa-map-marked-alt"></i>
                    <span>Carte disponible avec clé API Google Maps</span>
                </div>
                <!-- Décommente et ajoute ta clé API Google Maps :
                <iframe class="result-map-iframe"
                        src="${mapUrl}"
                        loading="lazy"
                        referrerpolicy="no-referrer-when-downgrade">
                </iframe>
                -->
            </div>
        `;
    },

    /**
     * Partager un résultat
     */
    async shareResult(title, url) {
        if (!navigator.share) {
            console.log('Share API non supportée');
            return;
        }

        try {
            await navigator.share({
                title: title,
                url: url
            });
            console.log('✅ Partagé avec succès');
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('❌ Erreur partage:', error);
            }
        }
    },

    /**
     * Extraire le domaine d'une URL
     */
    getDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch (e) {
            return url;
        }
    },

    /**
     * Échapper le HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Exposer globalement
window.SearchResultsRenderer = SearchResultsRenderer;

console.log('🔍 SearchResultsRenderer chargé');
