const VoiceManager = {
    recognition: null,
    isListening: false,
    transcript: '',
    silenceTimer: null,
    activationMode: 'click', // 'click', 'auto', 'push'
    isPushKeyDown: false,
    pushKey: null,
    autoModeActive: false,
    isMutedForTTS: false,
    
    // Initialisation
    init() {
        console.log('🎤 Initialisation du mode vocal...');
        
        this.loadSettings();
        
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('❌ Web Speech API non supportée');
            return false;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.lang = 'fr-FR';
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        
        this.setupEvents();
        this.createVoiceButton();
        this.createVoiceIndicator();
        this.createModeSelector();
        this.setupKeyboardShortcuts();
        
        if (this.activationMode === 'auto') {
            setTimeout(() => this.startAutoMode(), 1000);
        }
        
        console.log('✅ Mode vocal initialisé -', this.activationMode);
        return true;
    },
    
    loadSettings() {
        const savedMode = localStorage.getItem('voice_activation_mode');
        if (savedMode) {
            this.activationMode = savedMode;
        }
    },
    
    saveSettings() {
        localStorage.setItem('voice_activation_mode', this.activationMode);
    },
    
    setupEvents() {
        this.recognition.onstart = () => {
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
            if (this.isMutedForTTS || (window.TTSManager && TTSManager.isSpeaking)) {
                console.log('🔇 Parole ignorée (TTS actif)');
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
            
            if (this.transcript.trim().length < 5) {
                console.log('🔇 Transcription ignorée (trop courte):', this.transcript);
                this.transcript = '';
                return;
            }

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
            
            if (this.activationMode === 'auto' && this.autoModeActive && !this.isMutedForTTS) {
                setTimeout(() => this.start(), 100);
            } else if (this.transcript && this.transcript.length > 3 && !this.isMutedForTTS) {
                this.sendTranscript();
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('❌ Erreur:', event.error);
            
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

    muteForTTS() {
        console.log('🔇 Micro mis en pause pour TTS');
        this.isMutedForTTS = true;
        this.transcript = '';
        
        const input = document.getElementById('messageInput');
        if (input && input.value.trim().length > 0) {
            if (this.isListening) {
                input.value = '';
            }
        }
        
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        
        if (this.isListening) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Erreur lors de l\'arrêt du micro:', error);
            }
        }
    },

    unmuteForTTS() {
        console.log('🎤 Micro déverrouillé après TTS');
        this.isMutedForTTS = false;
        this.transcript = '';
        
        if (this.activationMode === 'auto' && this.autoModeActive) {
            setTimeout(() => {
                if (!this.isMutedForTTS && !TTSManager.isSpeaking && this.autoModeActive) {
                    console.log('🎤 Redémarrage du micro après vérifications');
                    this.start();
                }
            }, 500);
        }
    },
    
    createVoiceButton() {
        const voiceBtn = document.getElementById('voiceButton');
        
        if (!voiceBtn) {
            console.error('❌ Bouton #voiceButton non trouvé');
            return;
        }
        
        console.log('✅ Bouton vocal trouvé');
        
        voiceBtn.addEventListener('click', () => {
            if (this.activationMode === 'click') {
                this.toggle();
            } else if (this.activationMode === 'auto') {
                this.toggleAutoMode();
            }
        });
        
        console.log('✅ Bouton vocal attaché');
    },
    
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
    
    createModeSelector() {
        const settingsPanel = document.getElementById('settingsPanel');
        if (!settingsPanel) return;
        
        const settingsContent = settingsPanel.querySelector('.settings-content');
        if (!settingsContent) return;
        
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
        
        const ttsSection = settingsContent.querySelector('.tts-settings-section');
        if (ttsSection) {
            settingsContent.insertBefore(modeSection, ttsSection);
        } else {
            settingsContent.appendChild(modeSection);
        }
        
        const radios = modeSection.querySelectorAll('input[name="voiceMode"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.changeMode(e.target.value);
            });
        });
        
        console.log('✅ Sélecteur de mode créé');
    },
    
    changeMode(mode) {
        console.log('🔄 Changement mode:', this.activationMode, '→', mode);
        
        if (this.activationMode === 'auto') {
            this.stopAutoMode();
        }
        this.stop();
        
        this.activationMode = mode;
        this.saveSettings();
        
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
    
    setupKeyboardShortcuts() {
        let pushToTalkKeys = ['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight'];
        
        document.addEventListener('keydown', (e) => {
            if (pushToTalkKeys.includes(e.code) && this.activationMode === 'push') {
                e.preventDefault();
                
                if (!this.isPushKeyDown) {
                    console.log('🎤 Push-to-talk activé avec:', e.code);
                    this.isPushKeyDown = true;
                    this.pushKey = e.code;
                    this.start();
                    
                    if (window.showToast) {
                        window.showToast('🎤 Parlez maintenant...', 'info', 1000);
                    }
                }
            }
            
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
            if (pushToTalkKeys.includes(e.code) && 
                this.activationMode === 'push' && 
                this.isPushKeyDown &&
                e.code === this.pushKey) {
                
                e.preventDefault();
                console.log('🛑 Push-to-talk relâché:', e.code);
                this.isPushKeyDown = false;
                this.pushKey = null;
                this.stop();
                
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
    
    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    },
    
    // ✅ CORRIGÉ : start()
    start() {
        if (this.isMutedForTTS || (window.TTSManager && TTSManager.isSpeaking)) {
            console.log('⚠️ Démarrage bloqué (TTS en cours)');
            return;
        }

        if (!this.recognition) {
            console.log('⚠️ Pas de recognition disponible');
            return;
        }
        
        this.transcript = '';
        
        // ✅ Utiliser CharlyAnimationManager.think()
        if (window.CharlyAnimationManager) {
            window.CharlyAnimationManager.think();
        }
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('❌ Erreur démarrage:', error);
        }
    },
    
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
    
    resetSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }
        
        this.silenceTimer = setTimeout(() => {
            console.log('⏱️ Silence détecté');
            
            if (this.activationMode === 'auto' && this.transcript && this.transcript.length > 3) {
                this.sendTranscript();
                this.transcript = '';
            } else if (this.activationMode !== 'auto') {
                this.stop();
            }
        }, 2000);
    },
    
    updateTranscript() {
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = this.transcript;
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        }
    },
    
    // ✅ CORRIGÉ : sendTranscript()
    sendTranscript() {
        if (!this.transcript || this.transcript.length < 3) return;
        
        console.log('📤 Envoi:', this.transcript);
        
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = this.transcript;
        }
        
        // ✅ Utiliser CharlyAnimationManager.process()
        if (window.CharlyAnimationManager) {
            window.CharlyAnimationManager.process();
        }
        
        setTimeout(() => {
            if (window.sendMessage) {
                window.sendMessage();
            }
        }, 100);
        
        this.transcript = '';
    },
    
    updateUI() {
        const button = document.getElementById('voiceButton');
        const indicator = document.getElementById('voiceIndicator');
        
        if (button) {
            if (this.activationMode === 'auto' && this.autoModeActive) {
                button.classList.add('listening');
                button.innerHTML = '<i class="fas fa-microphone"></i>';
                button.title = 'Détection auto active (clic pour désactiver)';
            }
            else if (this.isListening) {
                button.classList.add('listening');
                button.innerHTML = '<i class="fas fa-stop"></i>';
                button.title = 'Arrêter';
            }
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