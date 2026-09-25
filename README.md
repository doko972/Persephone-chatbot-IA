# Charly — Assistant IA de bureau

> Assistant conversationnel avec interface flottante, animations Lottie, reconnaissance vocale et synthèse vocale.

Application desktop native construite avec **Tauri 2**, connectée par défaut à un backend **Laravel**, avec un **mode local autonome** (clé OpenAI personnelle + base SQLite embarquée) pour fonctionner sans compte ni serveur.

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)

---

## Fonctionnalités

- **Animations Lottie contextuelles** (accueil, réflexion, réponse, erreur, etc.)
- **Deux modes de fonctionnement** (voir plus bas) :
  - **Cloud** : compte utilisateur + backend Laravel (recherche web incluse)
  - **Local** : clé API OpenAI personnelle + historique stocké en local (SQLite), sans compte ni serveur
- **Reconnaissance vocale** (dictée du message) et **synthèse vocale** (lecture des réponses via l'API OpenAI)
- **Résultats de recherche web** enrichis dans le chat (mode cloud)
- **Historique de conversation** persistant, avec favoris
- **Thèmes clair/sombre**
- **Toujours au premier plan**, fenêtre transparente sans décorations
- **Ultra-léger** (quelques Mo vs 50+ Mo pour un équivalent Electron)
- **Raccourcis clavier**
- **Base prête pour Android** (`src-tauri/gen/android`)

---

## Prérequis

### Outils requis

1. **Node.js 18+** - [Télécharger](https://nodejs.org/)
2. **Rust** - [Installer](https://rustup.rs/)
3. **Visual Studio Build Tools** (Windows) - [Télécharger](https://visualstudio.microsoft.com/downloads/)
4. **WebView2** (Windows, généralement pré-installé)

---

## Installation

```bash
# Cloner le repository
git clone https://github.com/doko972/Persephone-chatbot-IA.git
cd Persephone-chatbot-IA

# Installer les dépendances (JS + plugins Tauri)
npm install

# si pas installé :
winget install Microsoft.VisualStudio.2022.BuildTools

# vérifier cargo et rustc => cargo --version, rustc --version
```

Aucune configuration de fichier n'est nécessaire pour démarrer :
- Le **mode cloud** pointe par défaut vers le backend de production
  (`API_BASE_URL` dans [src/renderer.js](src/renderer.js), ligne ~489) — à
  changer uniquement si vous utilisez votre propre backend Laravel.
- Le **mode local** se configure entièrement depuis l'app (Paramètres →
  Mode de fonctionnement → coller une clé API OpenAI).

---

## Commandes

```bash
# Développement
npm run tauri dev

# Build production
npm run tauri build

# Générer les icônes ! L'image doit etre carré !
# npx tauri icon chemin/vers/icon.png
projet/
├── src-tauri/
│   └── icons/
│       └── icon.png  ← ICI
# La commande
npx @tauri-apps/cli icon src-tauri/icons/icon.png

# Build Android
npm run tauri android init
npm run tauri android build
```

---

## Structure

```
Persephone-chatbot-IA/
├── src/                          # Frontend
│   ├── index.html
│   ├── styles.css, *.css         # Styles (chat, historique, voix, TTS, recherche...)
│   ├── renderer.js                # Logique principale du chat
│   ├── local-mode.js              # Mode local : clé OpenAI perso + SQLite
│   ├── conversation-history.js    # Panneau historique (cloud + local)
│   ├── voice-manager.js           # Reconnaissance vocale
│   ├── text-to-speech.js          # Synthèse vocale (OpenAI TTS)
│   ├── search-results-renderer.js # Rendu des résultats de recherche web
│   ├── ui-polish.js               # Timestamps, scroll, détails UI
│   ├── animations/                # Animations Lottie
│   └── fonts/                     # Font Awesome (icônes)
├── src-tauri/                     # Backend Rust / config Tauri
│   ├── src/lib.rs                 # Plugins (http, shell, sql), positionnement fenêtre
│   ├── Cargo.toml
│   ├── tauri.conf.json            # Taille de fenêtre, CSP, capacités
│   ├── capabilities/default.json  # Permissions réseau/SQL
│   └── icons/
└── package.json
```

---

## Deux modes de fonctionnement

| | Mode cloud (par défaut) | Mode local |
|---|---|---|
| Compte requis | Oui (login) | Non |
| Génération des réponses | Backend Laravel | Appel direct à OpenAI (`gpt-4o-mini`) avec votre propre clé |
| Recherche web dans le chat | Oui | Non (hors scope pour l'instant) |
| Stockage de l'historique | Serveur Laravel | Base SQLite locale (`charly.db`), sur l'appareil uniquement |
| Clé OpenAI (voix) | Fournie par le backend | Votre clé personnelle |

Le choix se fait dans **Paramètres → Mode de fonctionnement**, à tout moment.

---

## Configuration

**Fichier `src-tauri/tauri.conf.json` :**

```json
{
  "app": {
    "windows": [{
      "width": 460,
      "height": 680,
      "decorations": false,
      "transparent": true,
      "alwaysOnTop": true,
      "shadow": false
    }]
  }
}
```

---

## Dépannage

| Problème | Solution |
|----------|----------|
| `rustc` not found | Redémarrer le terminal après installation Rust |
| `link.exe` not found | Installer Visual Studio Build Tools |
| CORS error (mode cloud) | Configurer `config/cors.php` dans Laravel |
| Icônes manquantes | Ajouter `font-src` au CSP |
| TTS/chat silencieux en mode local | Vérifier que la clé API OpenAI est bien enregistrée dans Paramètres |

---

## ⌨ Raccourcis

| Raccourci | Action |
|-----------|--------|
| `Ctrl + N` | Nouvelle conversation |
| `Ctrl + M` | Minimiser/Restaurer |
| `Ctrl + ,` | Ouvrir/fermer les paramètres |
| `Ctrl + /` | Afficher l'aide |
| `Ctrl + Entrée` | Envoyer le message (en cours de saisie) |
| `F11` | Plein écran |
| `Escape` | Fermer le panneau actif / minimiser |

---

## Performance

- **Taille** : quelques Mo (bien plus léger qu'un équivalent Electron)
- **RAM** : usage réduit grâce au WebView natif
- **Démarrage** : quasi instantané

---

## Contribution

Les contributions sont bienvenues !

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## Changelog

### v1.1.0
- Mode local : clé API OpenAI personnelle + historique en base SQLite embarquée, sans compte ni serveur
- Reconnaissance vocale et synthèse vocale (OpenAI TTS)
- Résultats de recherche web enrichis dans le chat (mode cloud)
- Système de favoris dans l'historique de conversation
- Durcissement sécurité : correctifs XSS sur le rendu de l'historique et des résultats de recherche, CSP resserrée (retrait d'`unsafe-inline` sur les scripts, restriction des sources d'images)
- Correction d'un défaut d'affichage (ombre du widget tronquée en bas à droite)

### v1.0.0 (2025-11-08)
- Animations Lottie
- Chat avec API Laravel
- Authentification
- Historique persistant
- Thèmes clair/sombre
- Support multi-plateforme

---

## Auteur

**Doko972**
- GitHub: [@doko972](https://github.com/doko972)
- Email: contact@hrttelecoms.fr

---

## 🙏 Remerciements

- [Tauri](https://tauri.app/) - Framework natif
- [Lottie](https://lottiefiles.com/) - Animations
- [Laravel](https://laravel.com/) - API backend (mode cloud)
- [OpenAI](https://openai.com/) - Génération de texte et synthèse vocale
- [Font Awesome](https://fontawesome.com/) - Icônes

---

## Roadmap

- [ ] 🔍 Recherche web dans le mode local
- [ ] 🔔 Notifications natives
- [ ] 📱 Apps mobiles (build Android à finaliser)
- [ ] 🌍 Multi-langues

---

<div align="center">

**⭐ N'oubliez pas de donner une étoile si ce projet vous plaît ! ⭐**

Made with ❤️ by Atelier Normand du Web

</div>
