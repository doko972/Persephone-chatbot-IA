const VoiceManager = {
    recognition: null,
    isListening: false,
    transcript: '',
    silenceTimer: null,
    activationMode: 'click', // 'click', 'auto', 'push'
    isPushKeyDown: false,
    pushKey: null, // 🆕 Mémoriser quelle touche est utilisée
    autoModeActive: false,
    isMutedForTTS: false, // 🆕 Flag pour bloquer le micro pendant TTS
    
    // Initialisation
    init() {
        console.log('🎤 Initialisation du mode vocal...');
        
        // Charger les préférences
        this.loadSettings();
        
        // Vérifier le support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('❌ Web Speech API non supportée');
            return false;
        }
        
        // Créer l'instance
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configuration
        this.recognition.lang = 'fr-FR';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        
        // Events
        this.setupEvents();
        
        // Interface
        this.createVoiceButton();
        this.createVoiceIndicator();
        this.createModeSelector();
        
        // Raccourcis clavier
        this.setupKeyboardShortcuts();
        
        // Si mode auto, démarrer
        if (this.activationMode === 'auto') {
            setTimeout(() => this.startAutoMode(), 1000);
        }
        
        console.log('✅ Mode vocal initialisé -', this.activationMode);
        return true;
    },
    
    // Charger les paramètres
    loadSettings() {
        const savedMode = localStorage.getItem('voice_activation_mode');
        if (savedMode) {
            this.activationMode = savedMode;
        }
    },
    
    // Sauvegarder les paramètres
    saveSettings() {
        localStorage.setItem('voice_activation_mode', this.activationMode);
    },
    
    // Configuration des événements
    setupEvents() {
        this.recognition.onstart = () => {
            // 🛡️ PROTECTION ULTIME : Si le TTS est actif, arrêter immédiatement
            if (this.isMutedForTTS || (window.TTSManager && TTSManager.isSpeaking)) {
                console.log('🚨 Écoute démarrée pendant TTS - ARRÊT IMMÉDIAT');
                try {
                    this.recognition.stop();
                } catch (error) {
                    console.error('Erreur arrêt forcé:', error);
                }
                return;
            }

            console.log('🎤 Écoute démarrée');
            this.isListening = true;
            this.updateUI();
        };
        
        this.recognition.onresult = (event) => {
            // 🛡️ PROTECTION : Ignorer si le TTS est en cours
            if (this.isMutedForTTS || (window.TTSManager && TTSManager.isSpeaking)) {
                console.log('🔇 Parole ignorée (TTS actif)');
                // 🗑️ Vider la transcription
                this.transcript = '';
                return;
            }

            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            this.transcript = finalTranscript || interimTranscript;
            
            // 🛡️ Ignorer les transcriptions trop courtes (écho)
            if (this.transcript.trim().length < 5) {
                console.log('🔇 Transcription ignorée (trop courte):', this.transcript);
                this.transcript = ''; // 🗑️ Vider aussi
                return;
            }

            // 🛡️ Ignorer les phrases communes du chatbot (patterns)
            const botPhrases = [
                'comment puis-je',
                'si vous avez',
                'nhésitez pas',
                'je suis là',
                'bonjour'
            ];
            
            const lowerTranscript = this.transcript.toLowerCase();
            const isBotPhrase = botPhrases.some(phrase => lowerTranscript.includes(phrase));
            
            if (isBotPhrase && finalTranscript) {
                console.log('🔇 Phrase du bot détectée et ignorée:', this.transcript);
                this.transcript = '';
                return;
            }

            this.updateTranscript();
            
            if (finalTranscript) {
                this.resetSilenceTimer();
            }
        };
        
        this.recognition.onend = () => {
            console.log('🎤 Écoute terminée');
            this.isListening = false;
            this.updateUI();
            
            // 🔄 En mode auto, redémarrer SAUF si en pause TTS
            if (this.activationMode === 'auto' && this.autoModeActive && !this.isMutedForTTS) {
                setTimeout(() => this.start(), 100);
            } else if (this.transcript && this.transcript.length > 3 && !this.isMutedForTTS) {
                this.sendTranscript();
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('❌ Erreur:', event.error);
            
            // En mode auto, redémarrer sauf si permission refusée OU en pause TTS
            if (event.error !== 'not-allowed' && 
                this.activationMode === 'auto' && 
                this.autoModeActive &&
                !this.isMutedForTTS) {
                setTimeout(() => this.start(), 500);
            }
            
            this.isListening = false;
            this.updateUI();
        };
    },

    // 🆕 MÉTHODE POUR COUPER LE MICRO (appelée par TTS)
    muteForTTS() {
        console.log('🔇 Micro mis en pause pour TTS');
        this.isMutedForTTS = true;
        
        // 🗑️ VIDER la transcription en cours (éviter qu'elle soit renvoyée)
        this.transcript = '';
        
        // Vider aussi l'input
        const input = document.getElementById('messageInput');
        if (input && input.value.trim().length > 0) {
            // Ne vider que si c'est une transcription vocale (pas du texte tapé manuellement)
            // On peut détecter ça si le micro était actif
            if (this.isListening) {
                input.value = '';
            }
        }
        
        // Arrêter le timer de silence
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        
        // Arrêter l'écoute en cours
        if (this.isListening) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Erreur lors de l\'arrêt du micro:', error);
            }
        }
    },

    // 🆕 MÉTHODE POUR RÉACTIVER LE MICRO (appelée par TTS)
    unmuteForTTS() {
        console.log('🎤 Micro déverrouillé après TTS');
        this.isMutedForTTS = false;
        
        // 🗑️ S'assurer que la transcription est vide
        this.transcript = '';
        
        // Redémarrer si mode auto actif (avec délai plus long)
        if (this.activationMode === 'auto' && this.autoModeActive) {
            setTimeout(() => {
                // Triple vérification avant de redémarrer
                if (!this.isMutedForTTS && !TTSManager.isSpeaking && this.autoModeActive) {
                    console.log('🎤 Redémarrage du micro après vérifications');
                    this.start();
                }
            }, 500); // 🆕 Augmenté à 500ms
        }
    },
    
    // Créer le bouton
    createVoiceButton() {
        const voiceBtn = document.getElementById('voiceButton');
        
        if (!voiceBtn) {
            console.error('❌ Bouton #voiceButton non trouvé');
            return;
        }
        
        console.log('✅ Bouton vocal trouvé');
        
        // Event selon le mode
        voiceBtn.addEventListener('click', () => {
            if (this.activationMode === 'click') {
                this.toggle();
            } else if (this.activationMode === 'auto') {
                this.toggleAutoMode();
            }
        });
        
        console.log('✅ Bouton vocal attaché');
    },
    
    // Créer l'indicateur
    createVoiceIndicator() {
        const inputContainer = document.querySelector('.message-input-container');
        if (!inputContainer) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'voice-indicator';
        indicator.id = 'voiceIndicator';
        indicator.innerHTML = '<i class="fas fa-microphone"></i><span>Écoute...</span>';
        
        inputContainer.style.position = 'relative';
        inputContainer.appendChild(indicator);
    },
    
    // Créer le sélecteur de mode
    createModeSelector() {
        const settingsPanel = document.getElementById('settingsPanel');
        if (!settingsPanel) return;
        
        const settingsContent = settingsPanel.querySelector('.settings-content');
        if (!settingsContent) return;
        
        // Vérifier si déjà présent
        if (document.getElementById('voiceModeSection')) return;
        
        const modeSection = document.createElement('div');
        modeSection.id = 'voiceModeSection';
        modeSection.className = 'tts-settings-section';
        modeSection.innerHTML = `
            <h3><i class="fas fa-microphone"></i> Mode de reconnaissance vocale</h3>
            
            <div class="voice-mode-selector">
                <label>
                    <input type="radio" name="voiceMode" value="click" ${this.activationMode === 'click' ? 'checked' : ''}>
                    <span>Click manuel</span>
                    <small>Cliquer sur le micro pour démarrer/arrêter</small>
                </label>
                
                <label>
                    <input type="radio" name="voiceMode" value="auto" ${this.activationMode === 'auto' ? 'checked' : ''}>
                    <span>Détection automatique</span>
                    <small>Le micro est toujours actif</small>
                </label>
                
                <label>
                    <input type="radio" name="voiceMode" value="push" ${this.activationMode === 'push' ? 'checked' : ''}>
                    <span>Push-to-talk</span>
                    <small>Maintenir Ctrl ou Alt pour parler</small>
                </label>
            </div>
        `;
        
        // Insérer avant la section TTS si elle existe
        const ttsSection = settingsContent.querySelector('.tts-settings-section');
        if (ttsSection) {
            settingsContent.insertBefore(modeSection, ttsSection);
        } else {
            settingsContent.appendChild(modeSection);
        }
        
        // Events
        const radios = modeSection.querySelectorAll('input[name="voiceMode"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.changeMode(e.target.value);
            });
        });
        
        console.log('✅ Sélecteur de mode créé');
    },
    
    // Changer de mode
    changeMode(mode) {
        console.log('🔄 Changement mode:', this.activationMode, '→', mode);
        
        // Arrêter l'ancien mode
        if (this.activationMode === 'auto') {
            this.stopAutoMode();
        }
        this.stop();
        
        // Changer le mode
        this.activationMode = mode;
        this.saveSettings();
        
        // Démarrer le nouveau mode
        if (mode === 'auto') {
            this.startAutoMode();
        }
        
        this.updateUI();
        
        const messages = {
            'click': '👆 Mode click activé',
            'auto': '🎤 Détection automatique activée',
            'push': '⌨️ Push-to-talk activé (Ctrl/Alt)'
        };
        
        if (window.showToast) {
            window.showToast(messages[mode], 'success');
        }
    },
    
    // Mode automatique
    startAutoMode() {
        console.log('🔄 Démarrage mode auto');
        this.autoModeActive = true;
        this.start();
    },
    
    stopAutoMode() {
        console.log('🛑 Arrêt mode auto');
        this.autoModeActive = false;
        this.stop();
    },
    
    toggleAutoMode() {
        if (this.autoModeActive) {
            this.stopAutoMode();
        } else {
            this.startAutoMode();
        }
    },
    
    // Raccourcis clavier
    setupKeyboardShortcuts() {
        let pushToTalkKeys = ['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight'];
        
        document.addEventListener('keydown', (e) => {
            // Push-to-talk : Ctrl ou Alt uniquement (pas d'Espace)
            if (pushToTalkKeys.includes(e.code) && this.activationMode === 'push') {
                e.preventDefault();
                
                if (!this.isPushKeyDown) {
                    console.log('🎤 Push-to-talk activé avec:', e.code);
                    this.isPushKeyDown = true;
                    this.pushKey = e.code; // Mémoriser quelle touche
                    this.start();
                    
                    // Feedback visuel
                    if (window.showToast) {
                        window.showToast('🎤 Parlez maintenant...', 'info', 1000);
                    }
                }
            }
            
            // 🆕 Raccourci global : Ctrl+Shift+M pour toggle le micro (tous modes)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyM') {
                e.preventDefault();
                console.log('🎤 Toggle micro via Ctrl+Shift+M');
                
                if (this.activationMode === 'click') {
                    this.toggle();
                } else if (this.activationMode === 'auto') {
                    this.toggleAutoMode();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            // Relâcher la touche push-to-talk = envoyer
            if (pushToTalkKeys.includes(e.code) && 
                this.activationMode === 'push' && 
                this.isPushKeyDown &&
                e.code === this.pushKey) {
                
                e.preventDefault();
                console.log('🛑 Push-to-talk relâché:', e.code);
                this.isPushKeyDown = false;
                this.pushKey = null;
                this.stop();
                
                // Envoyer après un petit délai
                setTimeout(() => {
                    if (this.transcript && this.transcript.length > 3) {
                        this.sendTranscript();
                    }
                }, 100);
            }
        });
        
        console.log('✅ Raccourcis clavier configurés');
        console.log('   - Push-to-talk: Ctrl ou Alt (gauche/droite)');
        console.log('   - Toggle micro: Ctrl+Shift+M');
    },
    
    // Toggle
    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    },
    
    // Démarrer
    start() {
        // 🛡️ NE PAS démarrer si TTS actif ou en mode mute
        if (this.isMutedForTTS || (window.TTSManager && TTSManager.isSpeaking)) {
            console.log('⚠️ Démarrage bloqué (TTS en cours)');
            return;
        }

        if (!this.recognition) {
            console.log('⚠️ Pas de recognition disponible');
            return;
        }
        
        this.transcript = '';
        
        if (window.AnimationManager) {
            window.AnimationManager.changeAnimation('thinking');
        }
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('❌ Erreur démarrage:', error);
        }
    },
    
    // Arrêter
    stop() {
        if (!this.recognition) return;
        
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('❌ Erreur arrêt:', error);
        }
        
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    },
    
    // Timer silence
    resetSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }
        
        this.silenceTimer = setTimeout(() => {
            console.log('⏱️ Silence détecté');
            
            // En mode auto, envoyer si du texte
            if (this.activationMode === 'auto' && this.transcript && this.transcript.length > 3) {
                this.sendTranscript();
                this.transcript = '';
            } else if (this.activationMode !== 'auto') {
                this.stop();
            }
        }, 2000);
    },
    
    // Mettre à jour transcription
    updateTranscript() {
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = this.transcript;
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        }
    },
    
    // Envoyer
    sendTranscript() {
        if (!this.transcript || this.transcript.length < 3) return;
        
        console.log('📤 Envoi:', this.transcript);
        
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = this.transcript;
        }
        
        if (window.AnimationManager) {
            window.AnimationManager.changeAnimation('processing');
        }
        
        setTimeout(() => {
            if (window.sendMessage) {
                window.sendMessage();
            }
        }, 100);
        
        this.transcript = '';
    },
    
    // Mettre à jour UI
    updateUI() {
        const button = document.getElementById('voiceButton');
        const indicator = document.getElementById('voiceIndicator');
        
        if (button) {
            // Mode auto actif
            if (this.activationMode === 'auto' && this.autoModeActive) {
                button.classList.add('listening');
                button.innerHTML = '<i class="fas fa-microphone"></i>';
                button.title = 'Détection auto active (clic pour désactiver)';
            }
            // Écoute en cours (autres modes)
            else if (this.isListening) {
                button.classList.add('listening');
                button.innerHTML = '<i class="fas fa-stop"></i>';
                button.title = 'Arrêter';
            }
            // Inactif
            else {
                button.classList.remove('listening');
                button.innerHTML = '<i class="fas fa-microphone"></i>';
                
                if (this.activationMode === 'push') {
                    button.title = 'Push-to-talk (maintenir Ctrl ou Alt)';
                } else {
                    button.title = 'Mode vocal';
                }
            }
        }
        
        if (indicator) {
            indicator.classList.toggle('active', this.isListening);
        }
    }
};

window.VoiceManager = VoiceManager;
console.log('🎤 VoiceManager chargé (avec modes)');