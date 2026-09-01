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
     * Créer un élément DOM en une ligne (texte confié à textContent,
     * jamais à innerHTML, pour éviter toute injection via des données
     * de résultats de recherche qui viennent du web ouvert).
     */
    createEl(tag, { className, text, attrs, on } = {}) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        if (attrs) {
            for (const [key, value] of Object.entries(attrs)) {
                el.setAttribute(key, value);
            }
        }
        if (on) {
            for (const [event, handler] of Object.entries(on)) {
                el.addEventListener(event, handler);
            }
        }
        return el;
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
        const header = this.createEl('div', { className: 'search-results-header' });

        const title = this.createEl('div', { className: 'search-results-title' });
        title.appendChild(this.createEl('i', { className: 'fas fa-search' }));
        title.appendChild(this.createEl('span', { text: 'Résultats de recherche' }));

        const count_ = this.createEl('div', {
            className: 'search-results-count',
            text: `${count} résultat${count > 1 ? 's' : ''}`
        });

        header.appendChild(title);
        header.appendChild(count_);
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
            card.appendChild(this.createLocationCard(result));
        } else {
            card.appendChild(this.createWebCard(result));
        }

        return card;
    },

    /**
     * Créer un bloc titre + badge, commun aux deux types de carte
     */
    createCardHeader(icon, title, badgeText, badgeClass, ratingEl) {
        const header = this.createEl('div', { className: 'result-card-header' });

        const titleWrap = this.createEl('div', { className: 'result-card-title' });
        const h4 = this.createEl('h4', { className: 'result-title' });
        h4.appendChild(this.createEl('span', { className: 'result-title-icon', text: icon }));
        h4.appendChild(document.createTextNode(title));
        titleWrap.appendChild(h4);
        if (ratingEl) titleWrap.appendChild(ratingEl);

        header.appendChild(titleWrap);
        header.appendChild(this.createEl('span', {
            className: `result-type-badge ${badgeClass}`,
            text: badgeText
        }));

        return header;
    },

    createInfoItem(iconClass, contentEl) {
        const item = this.createEl('div', { className: 'result-info-item' });
        item.appendChild(this.createEl('i', { className: `${iconClass} result-info-icon` }));
        const text = this.createEl('span', { className: 'result-info-text' });
        text.appendChild(contentEl);
        item.appendChild(text);
        return item;
    },

    createLinkEl(label, url) {
        const link = this.createEl('a', {
            attrs: { href: '#' },
            text: label,
            on: {
                click: (e) => {
                    e.preventDefault();
                    this.openExternalLink(url);
                }
            }
        });
        return link;
    },

    /**
     * Créer une carte pour un résultat local (restaurant, commerce...)
     */
    createLocationCard(result) {
        const fragment = document.createDocumentFragment();
        const rating = this.createRatingElement(result.rating, result.reviews_count);

        fragment.appendChild(this.createCardHeader('📍', result.title || '', 'Local', 'location', rating));

        if (result.description) {
            fragment.appendChild(this.createEl('div', {
                className: 'result-description',
                text: result.description
            }));
        }

        const info = this.createEl('div', { className: 'result-info' });

        if (result.address) {
            info.appendChild(this.createInfoItem('fas fa-map-marker-alt',
                document.createTextNode(result.address)));
        }

        if (result.phone) {
            const cleanPhone = result.phone.replace(/\s/g, '');
            info.appendChild(this.createInfoItem('fas fa-phone',
                this.createLinkEl(result.phone, `tel:${cleanPhone}`)));
        }

        if (result.url) {
            info.appendChild(this.createInfoItem('fas fa-globe',
                this.createLinkEl(this.getDomain(result.url), result.url)));
        }

        fragment.appendChild(info);
        fragment.appendChild(this.createLocationActions(result));

        const map = this.createMapElement(result);
        if (map) fragment.appendChild(map);

        return fragment;
    },

    /**
     * Créer une carte pour un résultat web standard
     */
    createWebCard(result) {
        const fragment = document.createDocumentFragment();

        fragment.appendChild(this.createCardHeader('🌐', result.title || '', 'Web', 'web', null));

        if (result.description) {
            fragment.appendChild(this.createEl('div', {
                className: 'result-description',
                text: result.description
            }));
        }

        const info = this.createEl('div', { className: 'result-info' });
        info.appendChild(this.createInfoItem('fas fa-link',
            this.createLinkEl(this.getDomain(result.url), result.url)));
        fragment.appendChild(info);

        const actions = this.createEl('div', { className: 'result-actions' });
        actions.appendChild(this.createActionButton('fas fa-external-link-alt', 'Visiter le site',
            'result-action-btn primary', () => this.openExternalLink(result.url)));
        fragment.appendChild(actions);

        return fragment;
    },

    /**
     * Créer l'élément des étoiles de notation
     */
    createRatingElement(rating, reviewsCount) {
        if (!rating) return null;

        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        const stars = this.createEl('div', { className: 'rating-stars' });
        for (let i = 0; i < fullStars; i++) {
            stars.appendChild(this.createEl('i', { className: 'fas fa-star star-filled' }));
        }
        if (hasHalfStar) {
            stars.appendChild(this.createEl('i', { className: 'fas fa-star-half-alt star-filled' }));
        }
        for (let i = 0; i < emptyStars; i++) {
            stars.appendChild(this.createEl('i', { className: 'far fa-star star-empty' }));
        }

        const wrapper = this.createEl('div', { className: 'result-rating' });
        wrapper.appendChild(stars);
        wrapper.appendChild(this.createEl('span', { className: 'rating-value', text: rating.toFixed(1) }));
        if (reviewsCount) {
            wrapper.appendChild(this.createEl('span', {
                className: 'rating-count',
                text: `(${reviewsCount} avis)`
            }));
        }

        return wrapper;
    },

    createActionButton(iconClass, label, className, onClick) {
        const button = this.createEl('button', { className, on: { click: onClick } });
        button.appendChild(this.createEl('i', { className: iconClass }));
        button.appendChild(this.createEl('span', { text: label }));
        return button;
    },

    /**
     * Créer les boutons d'action pour un lieu
     */
    createLocationActions(result) {
        const actions = this.createEl('div', { className: 'result-actions' });

        if (result.phone) {
            const cleanPhone = result.phone.replace(/\s/g, '');
            actions.appendChild(this.createActionButton('fas fa-phone', 'Appeler',
                'result-action-btn primary', () => this.openExternalLink(`tel:${cleanPhone}`)));
        }

        if (result.address) {
            const addressEncoded = encodeURIComponent(result.address);
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${addressEncoded}`;
            actions.appendChild(this.createActionButton('fas fa-directions', 'Itinéraire',
                'result-action-btn', () => this.openExternalLink(mapsUrl)));
        }

        if (result.url) {
            actions.appendChild(this.createActionButton('fas fa-globe', 'Site web',
                'result-action-btn', () => this.openExternalLink(result.url)));
        }

        if (navigator.share && result.title) {
            actions.appendChild(this.createActionButton('fas fa-share-alt', 'Partager',
                'result-action-btn', () => this.shareResult(result.title, result.url || '')));
        }

        return actions;
    },

    /**
     * Créer la mini-carte Google Maps
     */
    createMapElement(result) {
        if (!result.coordinates || !result.coordinates.lat || !result.coordinates.lng) {
            return null;
        }

        // TODO: brancher une vraie clé API Google Maps puis remplacer ce
        // placeholder par un <iframe> pointant vers l'embed Maps.
        const container = this.createEl('div', { className: 'result-map-container' });
        const placeholder = this.createEl('div', { className: 'result-map-placeholder' });
        placeholder.appendChild(this.createEl('i', { className: 'fas fa-map-marked-alt' }));
        placeholder.appendChild(this.createEl('span', { text: 'Carte disponible avec clé API Google Maps' }));
        container.appendChild(placeholder);

        return container;
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
    }
};

// Exposer globalement
window.SearchResultsRenderer = SearchResultsRenderer;

console.log('🔍 SearchResultsRenderer chargé');
