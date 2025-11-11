// ============================================
// GESTIONNAIRE TEXT-TO-SPEECH (TTS)
// ============================================

const TTSManager = {
    synthesis: null,
    isEnabled: false,
    isSpeaking: false,
    currentUtterance: null,
    voices: [],
    micWasActive: false, // 🆕 Stocker l'état du micro

    // Configuration par défaut
    settings: {
        autoRead: true,
        voiceIndex: 0,
        rate: 1.0,      // Vitesse (0.5 à 2)
        volume: 1.0,    // Volume (0 à 1)
        pitch: 1.0      // Tonalité
    },

    // Initialisation
    init() {
        console.log('🔊 Initialisation Text-to-Speech...');

        // Vérifier le support
        if (!('speechSynthesis' in window)) {
            console.error('❌ Speech Synthesis non supportée');
            this.showError('La synthèse vocale n\'est pas supportée par votre navigateur.');
            return false;
        }

        this.synthesis = window.speechSynthesis;

        // Charger les paramètres sauvegardés
        this.loadSettings();

        // Charger les voix disponibles
        this.loadVoices();

        // Créer l'interface
        this.createTTSButton();
        this.createTTSSettings();
        this.createGlobalIndicator();

        console.log('✅ TTS initialisé');
        return true;
    },

    // Charger les voix disponibles
    loadVoices() {
        this.voices = this.synthesis.getVoices();

        // Si pas encore chargées, attendre l'événement
        if (this.voices.length === 0) {
            this.synthesis.addEventListener('voiceschanged', () => {
                this.voices = this.synthesis.getVoices();
                this.populateVoiceSelector();
                console.log(`✅ ${this.voices.length} voix chargées`);
            });
        } else {
            this.populateVoiceSelector();
            console.log(`✅ ${this.voices.length} voix disponibles`);
        }
    },

    // Charger les paramètres
    loadSettings() {
        const saved = localStorage.getItem('tts_settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
                this.isEnabled = this.settings.autoRead;
                console.log('✅ Paramètres TTS chargés');
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
        const header = document.querySelector('.chat-header')
            || document.querySelector('header');

        if (!header) {
            console.error('❌ Header non trouvé');
            return;
        }

        const ttsBtn = document.createElement('button');
        ttsBtn.className = 'icon-button' + (this.isEnabled ? ' enabled' : '');
        ttsBtn.id = 'ttsButton';
        ttsBtn.title = 'Lecture vocale automatique';
        ttsBtn.innerHTML = `<i class="fas fa-volume-${this.isEnabled ? 'up' : 'mute'}"></i>`;

        ttsBtn.addEventListener('click', () => this.toggleAutoRead());

        // Insérer à côté du bouton vocal
        const voiceBtn = document.getElementById('voiceButton');
        if (voiceBtn) {
            voiceBtn.parentNode.insertBefore(ttsBtn, voiceBtn.nextSibling);
        } else {
            const controls = header.querySelector('.window-controls');
            if (controls) {
                header.insertBefore(ttsBtn, controls);
            } else {
                header.appendChild(ttsBtn);
            }
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
            <h3><i class="fas fa-volume-up"></i> Synthèse vocale</h3>
            
            <!-- Toggle lecture auto -->
            <div class="tts-auto-toggle">
                <label>
                    <input type="checkbox" id="ttsAutoToggle" ${this.settings.autoRead ? 'checked' : ''}>
                    <span>Lecture automatique des réponses</span>
                </label>
            </div>
            
            <!-- Sélection de voix -->
            <div class="tts-voice-selector">
                <label for="ttsVoiceSelect">Voix :</label>
                <select id="ttsVoiceSelect"></select>
            </div>
            
            <!-- Vitesse -->
            <div class="tts-slider-group">
                <div class="tts-slider-label">
                    <span>Vitesse</span>
                    <span class="tts-slider-value" id="ttsRateValue">${this.settings.rate}x</span>
                </div>
                <input type="range" 
                       class="tts-slider" 
                       id="ttsRateSlider" 
                       min="0.5" 
                       max="2" 
                       step="0.1" 
                       value="${this.settings.rate}">
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
                <button class="tts-indicator-btn" id="ttsPauseBtn" title="Pause">
                    <i class="fas fa-pause"></i>
                </button>
                <button class="tts-indicator-btn" id="ttsStopBtn" title="Stop">
                    <i class="fas fa-stop"></i>
                </button>
            </div>
        `;

        document.body.appendChild(indicator);

        // Events
        document.getElementById('ttsPauseBtn')?.addEventListener('click', () => this.togglePause());
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
                this.settings.voiceIndex = parseInt(e.target.value);
                this.saveSettings();
            });
        }

        // Slider vitesse
        const rateSlider = document.getElementById('ttsRateSlider');
        const rateValue = document.getElementById('ttsRateValue');
        if (rateSlider && rateValue) {
            rateSlider.addEventListener('input', (e) => {
                this.settings.rate = parseFloat(e.target.value);
                rateValue.textContent = `${this.settings.rate}x`;
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
                this.speak('Bonjour, je suis votre assistant vocal. Comment puis-je vous aider aujourd\'hui ?');
            });
        }
    },

    // Peupler le sélecteur de voix
    populateVoiceSelector() {
        const select = document.getElementById('ttsVoiceSelect');
        if (!select) return;

        select.innerHTML = '';

        // Filtrer les voix françaises en priorité
        const frenchVoices = this.voices.filter(v => v.lang.startsWith('fr'));
        const otherVoices = this.voices.filter(v => !v.lang.startsWith('fr'));

        // Ajouter les voix françaises
        if (frenchVoices.length > 0) {
            const frGroup = document.createElement('optgroup');
            frGroup.label = 'Français';
            frenchVoices.forEach((voice, index) => {
                const option = document.createElement('option');
                option.value = this.voices.indexOf(voice);
                option.textContent = `${voice.name} (${voice.lang})`;
                if (this.settings.voiceIndex === this.voices.indexOf(voice)) {
                    option.selected = true;
                }
                frGroup.appendChild(option);
            });
            select.appendChild(frGroup);
        }

        // Ajouter les autres voix
        if (otherVoices.length > 0) {
            const otherGroup = document.createElement('optgroup');
            otherGroup.label = 'Autres langues';
            otherVoices.forEach((voice, index) => {
                const option = document.createElement('option');
                option.value = this.voices.indexOf(voice);
                option.textContent = `${voice.name} (${voice.lang})`;
                otherGroup.appendChild(option);
            });
            select.appendChild(otherGroup);
        }
    },

    // Lire un texte
    speak(text) {
        if (!this.synthesis || !text) return;

        // 🔇 COUPER le micro pendant la lecture (éviter la boucle infinie)
        this.micWasActive = false;
        if (window.VoiceManager && VoiceManager.isListening) {
            this.micWasActive = true;
            VoiceManager.muteForTTS(); // 🆕 Utiliser la méthode dédiée
            console.log('🔇 Micro coupé pendant TTS');
        }

        // Arrêter la lecture en cours
        this.stop();

        // Nettoyer le texte
        text = text.replace(/[*#_~`]/g, ''); // Retirer markdown
        text = text.trim();

        if (text.length === 0) return;

        console.log('🔊 Lecture:', text.substring(0, 50) + '...');

        // Créer l'utterance
        this.currentUtterance = new SpeechSynthesisUtterance(text);

        // Configuration
        if (this.voices.length > 0 && this.voices[this.settings.voiceIndex]) {
            this.currentUtterance.voice = this.voices[this.settings.voiceIndex];
        }
        this.currentUtterance.rate = this.settings.rate;
        this.currentUtterance.volume = this.settings.volume;
        this.currentUtterance.pitch = this.settings.pitch;

        // Events
        this.currentUtterance.onstart = () => {
            this.isSpeaking = true;
            this.updateUI(text);
            if (window.AnimationManager) {
                window.AnimationManager.changeAnimation('chatting');
            }
        };

        this.currentUtterance.onend = () => {
            this.isSpeaking = false;
            this.updateUI();
            if (window.AnimationManager) {
                window.AnimationManager.toIdle();
            }

            // 🎤 RÉACTIVER le micro après la lecture (avec délai de sécurité)
            if (this.micWasActive && window.VoiceManager) {
                setTimeout(() => {
                    // Double vérification : le TTS est bien terminé
                    if (!TTSManager.isSpeaking) {
                        VoiceManager.unmuteForTTS(); // 🆕 Utiliser la méthode dédiée
                        console.log('🎤 Micro réactivé après TTS');
                    }
                }, 800); // Délai de 800ms pour être sûr que le TTS est fini
            }
        };

        this.currentUtterance.onerror = (event) => {
            console.error('❌ Erreur TTS:', event.error);
            this.isSpeaking = false;
            this.updateUI();

            // 🎤 RÉACTIVER le micro même en cas d'erreur
            if (this.micWasActive && window.VoiceManager) {
                setTimeout(() => {
                    VoiceManager.unmuteForTTS(); // 🆕 Utiliser la méthode dédiée
                    console.log('🎤 Micro réactivé après erreur TTS');
                }, 500);
            }
        };

        // Lancer la lecture
        this.synthesis.speak(this.currentUtterance);
    },

    // Toggle lecture automatique
    toggleAutoRead() {
        this.isEnabled = !this.isEnabled;
        this.settings.autoRead = this.isEnabled;
        this.updateButton();
        this.saveSettings();

        const msg = this.isEnabled ? '🔊 Lecture automatique activée' : '🔇 Lecture automatique désactivée';
        if (window.showToast) {
            window.showToast(msg, 'info');
        }
        console.log(msg);
    },

    // Toggle pause
    togglePause() {
        if (this.synthesis.paused) {
            this.synthesis.resume();
        } else {
            this.synthesis.pause();
        }
    },

    // Stop
    stop() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.isSpeaking = false;
            this.currentUtterance = null;
            this.updateUI();
        }
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
    },

    // Afficher une erreur
    showError(message) {
        console.error('❌', message);
        if (window.showToast) {
            window.showToast(message, 'error');
        }
    }
};

// Exposer globalement
window.TTSManager = TTSManager;

console.log('🔊 TTSManager chargé');