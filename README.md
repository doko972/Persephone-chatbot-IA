# HRTélécoms Assistant

> Assistant conversationnel intelligent avec interface moderne et animations fluides

Application desktop native construite avec **Tauri**, **Lottie** et connectée à une API **Laravel**.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## Fonctionnalités

- **11 animations Lottie contextuelles** (idle, thinking, happy, error, etc.)
- **Chat intelligent** connecté à une API Laravel
- **Authentification utilisateur** (login/logout)
- **Historique de conversation** persistant
- **Thèmes clair/sombre**
- **Toujours au premier plan**
- **Ultra-léger** (~3-5 MB vs 50+ MB Electron)
- **Interface transparente**
- **Raccourcis clavier**
- **Prêt pour Android/iOS**

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
git clone https://github.com/votre-username/assistant-hrt.git
cd assistant-hrt



# Installer les dépendances
npm install

# si pas installé : 
winget install Microsoft.VisualStudio.2022.BuildTools

vérifier cargo et rustc => cargo --version, rustc --version

# Configurer l'API (éditer src/renderer.js ligne ~240)
const API_BASE_URL = 'http://127.0.0.1:8000/api';
```

---

## Commandes

```bash
# Développement
npm run tauri dev

# Build production
npm run tauri build

# Générer les icônes
npx tauri icon chemin/vers/icon.png

# Build Android
npm run tauri android init
npm run tauri android build
```

---

## Structure

```
assistant-hrt/
├── src/                    # Frontend
│   ├── index.html
│   ├── styles.css
│   ├── renderer.js
│   └── animations/         # 11 animations Lottie
├── src-tauri/              # Backend Rust
│   ├── src/lib.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
└── package.json
```

---

## Configuration

**Fichier `src-tauri/tauri.conf.json` :**

```json
{
  "app": {
    "windows": [{
      "width": 480,
      "height": 750,
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
| CORS error | Configurer `config/cors.php` dans Laravel |
| Icônes manquantes | Ajouter `font-src` au CSP |

---

## ⌨Raccourcis

| Raccourci | Action |
|-----------|--------|
| `Ctrl + N` | Nouvelle conversation |
| `Ctrl + M` | Minimiser/Restaurer |
| `F11` | Plein écran |
| `Escape` | Fermer/Minimiser |

---

## Performance

- **Taille** : 3-5 MB (95% plus léger qu'Electron)
- **RAM** : 30-50 MB (70% moins qu'Electron)
- **Démarrage** : <1s (3x plus rapide)

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

### v1.0.0 (2025-11-08)
- 11 animations Lottie
- Chat avec API Laravel
- Authentification
- Historique persistant
- Thèmes clair/sombre
- Support multi-plateforme

---

## 📄 License

MIT License - voir [LICENSE](LICENSE)

---

## Auteur

**Doko972**
- GitHub: [@doko972](https://github.com/doko972)
- Email: contact@hrttelecoms.fr

---

## 🙏 Remerciements

- [Tauri](https://tauri.app/) - Framework natif
- [Lottie](https://lottiefiles.com/) - Animations
- [Laravel](https://laravel.com/) - API backend
- [Font Awesome](https://fontawesome.com/) - Icônes

---

## Roadmap

- [ ] 🎤 Mode vocal
- [ ] 🔔 Notifications natives
- [ ] 📱 Apps mobiles
- [ ] 🌍 Multi-langues

---

<div align="center">

**⭐ N'oubliez pas de donner une étoile si ce projet vous plaît ! ⭐**

Made with ❤️ by Atelier Normand du Web

</div>