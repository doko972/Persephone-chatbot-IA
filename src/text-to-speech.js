// ============================================
// GESTIONNAIRE TEXT-TO-SPEECH AVEC OPENAI (OPTIMISÉ - APPEL DIRECT)
// ============================================

const TTSManager = {
    isEnabled: false,
    isSpeaking: false,
    currentAudio: null,
    audioQueue: [],
    micWasActive: false,
    openaiKey: null, // 🔑 Clé récupérée de façon sécurisée

    // Configuration par défaut
    settings: {
        autoRead: true,
        voice: 'nova', // alloy, echo, fable, onyx, nova, shimmer
        speed: 1.0,    // 0.25 à 4.0
        volume: 1.0    // 0 à 1
    },

    // 🔑 Récupérer la clé OpenAI depuis Laravel
    async fetchOpenAIKey() {
        try {
            const API_BASE_URL = 'https://friend.ateliernormandduweb.fr/api';
            
            // Récupérer le token d'authentification
            const authToken = localStorage.getItem('auth_token');
            
            if (!authToken) {
                console.warn('⚠️ Pas de token - TTS désactivé');
                return false;
            }
            
            const response = await fetch(`${API_BASE_URL}/openai-key`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erreur ${response.status}`);
            }
            
            const data = await response.json();
            this.openaiKey = data.key;
            console.log('✅ Clé OpenAI récupérée (TTS optimisé)');
            return true;
            
        } catch (error) {
            console.error('❌ Erreur récupération clé OpenAI:', error);
            if (window.showToast) {
                window.showToast('TTS désactivé (connexion requise)', 'warning');
            }
            return false;
        }
    },

    // Initialisation
    async init() {
        console.log('🔊 Initialisation Text-to-Speech OpenAI (mode rapide)...');

        // Charger les paramètres
        this.loadSettings();

        // 🔑 Récupérer la clé OpenAI
        const keyFetched = await this.fetchOpenAIKey();
        
        if (!keyFetched) {
            console.warn('⚠️ TTS initialisé en mode dégradé (sans clé)');
            // On continue quand même pour créer l'interface
        }

        // Créer l'interface
        this.createTTSButton();
        this.createTTSSettings();
        this.createGlobalIndicator();

        console.log('✅ TTS OpenAI initialisé (appel direct optimisé)');
        return true;
    },

    // Charger les paramètres
    loadSettings() {
        const saved = localStorage.getItem('tts_settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
                this.isEnabled = this.settings.autoRead;
                console.log('✅ Paramètres TTS chargés', this.settings);
            } catch (error) {
                console.error('❌ Erreur chargement paramètres TTS');
            }
        }
    },

    // Sauvegarder les paramètres
    saveSettings() {
        localStorage.setItem('tts_settings', JSON.stringify(this.settings));
        console.log('💾 Paramètres TTS sauvegardés');
    },

    // Créer le bouton TTS dans le header
    createTTSButton() {
        const headerActions = document.querySelector('.header-actions');

        if (!headerActions) {
            console.error('❌ Header actions non trouvé');
            return;
        }

        const ttsBtn = document.createElement('button');
        ttsBtn.className = 'icon-btn' + (this.isEnabled ? ' enabled' : '');
        ttsBtn.id = 'ttsButton';
        ttsBtn.title = 'Lecture vocale automatique (OpenAI - Optimisé)';
        ttsBtn.innerHTML = `<i class="fas fa-volume-${this.isEnabled ? 'up' : 'mute'}"></i>`;

        ttsBtn.addEventListener('click', () => this.toggleAutoRead());

        // Insérer à côté du bouton vocal
        const voiceBtn = document.getElementById('voiceButton');
        if (voiceBtn) {
            voiceBtn.parentNode.insertBefore(ttsBtn, voiceBtn.nextSibling);
        } else {
            headerActions.appendChild(ttsBtn);
        }

        console.log('✅ Bouton TTS créé');
    },

    // Créer les paramètres TTS
    createTTSSettings() {
        const settingsPanel = document.getElementById('settingsPanel');
        if (!settingsPanel) {
            console.error('❌ Panel paramètres non trouvé');
            return;
        }

        const settingsContent = settingsPanel.querySelector('.settings-content');
        if (!settingsContent) return;

        const ttsSection = document.createElement('div');
        ttsSection.className = 'tts-settings-section';
        ttsSection.innerHTML = `
            <h3><i class="fas fa-volume-up"></i> Synthèse vocale OpenAI ⚡</h3>
            
            <!-- Toggle lecture auto -->
            <div class="tts-auto-toggle">
                <label>
                    <input type="checkbox" id="ttsAutoToggle" ${this.settings.autoRead ? 'checked' : ''}>
                    <span>Lecture automatique des réponses</span>
                </label>
            </div>
            
            <!-- Sélection de voix OpenAI -->
            <div class="tts-voice-selector">
                <label for="ttsVoiceSelect">Voix OpenAI :</label>
                <select id="ttsVoiceSelect">
                    <option value="alloy" ${this.settings.voice === 'alloy' ? 'selected' : ''}>Alloy (Neutre)</option>
                    <option value="echo" ${this.settings.voice === 'echo' ? 'selected' : ''}>Echo (Masculine)</option>
                    <option value="fable" ${this.settings.voice === 'fable' ? 'selected' : ''}>Fable (Britannique)</option>
                    <option value="onyx" ${this.settings.voice === 'onyx' ? 'selected' : ''}>Onyx (Grave)</option>
                    <option value="nova" ${this.settings.voice === 'nova' ? 'selected' : ''}>Nova (Douce) ⭐</option>
                    <option value="shimmer" ${this.settings.voice === 'shimmer' ? 'selected' : ''}>Shimmer (Dynamique)</option>
                </select>
            </div>
            
            <!-- Vitesse -->
            <div class="tts-slider-group">
                <div class="tts-slider-label">
                    <span>Vitesse</span>
                    <span class="tts-slider-value" id="ttsSpeedValue">${this.settings.speed}x</span>
                </div>
                <input type="range" 
                       class="tts-slider" 
                       id="ttsSpeedSlider" 
                       min="0.25" 
                       max="4" 
                       step="0.25" 
                       value="${this.settings.speed}">
            </div>
            
            <!-- Volume -->
            <div class="tts-slider-group">
                <div class="tts-slider-label">
                    <span>Volume</span>
                    <span class="tts-slider-value" id="ttsVolumeValue">${Math.round(this.settings.volume * 100)}%</span>
                </div>
                <input type="range" 
                       class="tts-slider" 
                       id="ttsVolumeSlider" 
                       min="0" 
                       max="1" 
                       step="0.1" 
                       value="${this.settings.volume}">
            </div>
            
            <!-- Bouton test -->
            <button class="tts-test-button" id="ttsTestButton">
                <i class="fas fa-play"></i>
                <span>Tester la voix</span>
            </button>
            
            <div style="margin-top: 10px; padding: 8px; background: rgba(76, 175, 80, 0.1); border-radius: 6px; font-size: 12px; color: var(--text-secondary);">
                <i class="fas fa-bolt"></i> Mode optimisé : appel direct OpenAI (~3x plus rapide)
            </div>
        `;

        settingsContent.appendChild(ttsSection);

        // Events
        this.attachSettingsEvents();

        console.log('✅ Paramètres TTS créés');
    },

    // Créer l'indicateur global
    createGlobalIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'tts-global-indicator';
        indicator.id = 'ttsGlobalIndicator';
        indicator.innerHTML = `
            <div class="tts-indicator-icon">
                <i class="fas fa-volume-up"></i>
            </div>
            <div class="tts-indicator-content">
                <div class="tts-indicator-title">Lecture en cours...</div>
                <div class="tts-indicator-text" id="ttsIndicatorText"></div>
            </div>
            <div class="tts-indicator-controls">
                <button class="tts-indicator-btn" id="ttsStopBtn" title="Stop">
                    <i class="fas fa-stop"></i>
                </button>
            </div>
        `;

        document.body.appendChild(indicator);

        // Events
        document.getElementById('ttsStopBtn')?.addEventListener('click', () => this.stop());
    },

    // Attacher les events des paramètres
    attachSettingsEvents() {
        // Toggle auto-read
        const autoToggle = document.getElementById('ttsAutoToggle');
        if (autoToggle) {
            autoToggle.addEventListener('change', (e) => {
                this.settings.autoRead = e.target.checked;
                this.isEnabled = e.target.checked;
                this.updateButton();
                this.saveSettings();
            });
        }

        // Sélection de voix
        const voiceSelect = document.getElementById('ttsVoiceSelect');
        if (voiceSelect) {
            voiceSelect.addEventListener('change', (e) => {
                this.settings.voice = e.target.value;
                this.saveSettings();
            });
        }

        // Slider vitesse
        const speedSlider = document.getElementById('ttsSpeedSlider');
        const speedValue = document.getElementById('ttsSpeedValue');
        if (speedSlider && speedValue) {
            speedSlider.addEventListener('input', (e) => {
                this.settings.speed = parseFloat(e.target.value);
                speedValue.textContent = `${this.settings.speed}x`;
                this.saveSettings();
            });
        }

        // Slider volume
        const volumeSlider = document.getElementById('ttsVolumeSlider');
        const volumeValue = document.getElementById('ttsVolumeValue');
        if (volumeSlider && volumeValue) {
            volumeSlider.addEventListener('input', (e) => {
                this.settings.volume = parseFloat(e.target.value);
                volumeValue.textContent = `${Math.round(this.settings.volume * 100)}%`;
                this.saveSettings();
            });
        }

        // Bouton test
        const testBtn = document.getElementById('ttsTestButton');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.speak('Bonjour ! Je suis Charly, votre assistante vocale propulsée par OpenAI en mode rapide. La latence est maintenant trois fois plus faible !');
            });
        }
    },

    // 🔊 FONCTION PRINCIPALE : Lire un texte avec OpenAI TTS (APPEL DIRECT OPTIMISÉ)
    async speak(text) {
        if (!text || text.trim().length === 0) {
            console.log('🔇 Texte vide, pas de lecture');
            return;
        }

        // Vérifier qu'on a la clé
        if (!this.openaiKey) {
            console.warn('⚠️ Pas de clé OpenAI - tentative de récupération...');
            const fetched = await this.fetchOpenAIKey();
            if (!fetched) {
                console.error('❌ Impossible de lire sans clé OpenAI');
                if (window.showToast) {
                    window.showToast('TTS indisponible (connexion requise)', 'error');
                }
                return;
            }
        }

        // 🔇 Couper le micro pendant la lecture
        this.micWasActive = false;
        if (window.VoiceManager && VoiceManager.isListening) {
            this.micWasActive = true;
            VoiceManager.muteForTTS();
            console.log('🔇 Micro coupé pendant TTS');
        }

        // Arrêter la lecture en cours
        this.stop();

        // 🧹 Nettoyer le texte
        const cleanText = this.cleanTextForSpeech(text);

        if (!cleanText || cleanText.trim().length === 0) {
            console.log('🔇 Texte vide après nettoyage');
            this.reactivateMic();
            return;
        }

        console.log('🔊 Lecture OpenAI TTS (appel direct optimisé):', cleanText.substring(0, 50) + '...');

        try {
            this.isSpeaking = true;
            this.updateUI(cleanText);

            // ✅ Animation de lecture
            if (window.CharlyAnimationManager) {
                window.CharlyAnimationManager.playSequence('chatting');
            }

            // 🚀 APPEL DIRECT à OpenAI (pas de passage par Laravel)
            const startTime = performance.now();
            
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openaiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'tts-1', // Version rapide
                    input: cleanText,
                    voice: this.settings.voice,
                    speed: this.settings.speed,
                    response_format: 'mp3'
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            // 🎵 Créer l'audio depuis le blob
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const endTime = performance.now();
            console.log(`⚡ Audio généré en ${Math.round(endTime - startTime)}ms`);

            this.currentAudio = new Audio(audioUrl);
            this.currentAudio.volume = this.settings.volume;

            // Events audio
            this.currentAudio.onended = () => {
                this.isSpeaking = false;
                this.updateUI();
                URL.revokeObjectURL(audioUrl);
                
                if (window.CharlyAnimationManager) {
                    window.CharlyAnimationManager.toIdle();
                }

                this.reactivateMic();
            };

            this.currentAudio.onerror = (e) => {
                console.error('❌ Erreur lecture audio:', e);
                this.isSpeaking = false;
                this.updateUI();
                this.reactivateMic();
            };

            // 🚀 LECTURE IMMÉDIATE
            await this.currentAudio.play();
            console.log('✅ Lecture audio démarrée');

        } catch (error) {
            console.error('❌ Erreur TTS OpenAI:', error);
            this.isSpeaking = false;
            this.updateUI();
            this.reactivateMic();
            
            if (window.showToast) {
                window.showToast('Erreur lors de la synthèse vocale', 'error');
            }
        }
    },

    // 🧹 Nettoyer le texte pour la lecture vocale
    cleanTextForSpeech(text) {
        if (!text) return '';

        let cleanText = text;

        // Supprimer tous les émojis
        cleanText = cleanText.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
        cleanText = cleanText.replace(/[\u{2600}-\u{26FF}]/gu, '');
        cleanText = cleanText.replace(/[\u{2700}-\u{27BF}]/gu, '');
        cleanText = cleanText.replace(/[\u{FE00}-\u{FE0F}]/gu, '');

        // Supprimer balises HTML/Markdown
        cleanText = cleanText.replace(/<[^>]*>/g, '');
        cleanText = cleanText.replace(/[*#_~`]/g, '');

        // Nettoyer espaces
        cleanText = cleanText.replace(/\s+/g, ' ').trim();

        return cleanText;
    },

    // 🎤 Réactiver le micro après TTS
    reactivateMic() {
        if (this.micWasActive && window.VoiceManager) {
            setTimeout(() => {
                if (!this.isSpeaking) {
                    VoiceManager.unmuteForTTS();
                    console.log('🎤 Appel unmuteForTTS après lecture');
                }
            }, 800);
        }
    },

    // Toggle lecture automatique
    toggleAutoRead() {
        this.isEnabled = !this.isEnabled;
        this.settings.autoRead = this.isEnabled;
        this.updateButton();
        this.saveSettings();

        const msg = this.isEnabled 
            ? '🔊 Lecture automatique activée (OpenAI - Mode rapide)' 
            : '🔇 Lecture automatique désactivée';
        
        if (window.showToast) {
            window.showToast(msg, 'info');
        }
        console.log(msg);
    },

    // Stop
    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        this.isSpeaking = false;
        this.updateUI();
    },

    // Mettre à jour le bouton
    updateButton() {
        const button = document.getElementById('ttsButton');
        if (!button) return;

        if (this.isEnabled) {
            button.classList.remove('disabled');
            button.classList.add('enabled');
            button.innerHTML = '<i class="fas fa-volume-up"></i>';
        } else {
            button.classList.add('disabled');
            button.classList.remove('enabled');
            button.innerHTML = '<i class="fas fa-volume-mute"></i>';
        }

        if (this.isSpeaking) {
            button.classList.add('speaking');
        } else {
            button.classList.remove('speaking');
        }
    },

    // Mettre à jour l'UI
    updateUI(text = null) {
        this.updateButton();

        const indicator = document.getElementById('ttsGlobalIndicator');
        const indicatorText = document.getElementById('ttsIndicatorText');

        if (this.isSpeaking && text) {
            if (indicator) indicator.classList.add('active');
            if (indicatorText) {
                indicatorText.textContent = text.substring(0, 50) + (text.length > 50 ? '...' : '');
            }
        } else {
            if (indicator) indicator.classList.remove('active');
        }
    }
};

// Exposer globalement
window.TTSManager = TTSManager;

console.log('🔊 TTSManager OpenAI chargé (mode optimisé - appel direct)');