// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Base SQLite locale pour le mode "sans compte" : les conversations
    // restent sur l'appareil, aucun serveur externe requis.
    let migrations = vec![Migration {
        version: 1,
        description: "create_conversations_table",
        sql: "CREATE TABLE conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            response TEXT NOT NULL,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );",
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:charly.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Centrage du widget sur l'écran courant
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(monitor) = window.current_monitor() {
                    if let Some(monitor) = monitor {
                        let screen_size = monitor.size();
                        let screen_width = screen_size.width as f64;
                        let screen_height = screen_size.height as f64;

                        // Lire la taille réelle de la fenêtre (tauri.conf.json)
                        // plutôt que de la recopier en dur ici : les deux
                        // avaient fini par diverger (450x700 vs 420x650),
                        // ce qui décalait le centrage et, côté CSS, faisait
                        // déborder l'ombre de la carte hors de la fenêtre.
                        let window_size = window.outer_size()?;
                        let widget_width = window_size.width as f64;
                        let widget_height = window_size.height as f64;

                        let x = (screen_width - widget_width) / 2.0;
                        let y = (screen_height - widget_height) / 2.0;

                        // Positionner la fenêtre (desktop uniquement)
                        #[cfg(not(target_os = "android"))]
                        {
                            let _ = window.set_position(tauri::Position::Physical(
                                tauri::PhysicalPosition {
                                    x: x as i32,
                                    y: y as i32,
                                },
                            ));
                        }

                        println!("🖥️ Écran: {}x{}", screen_width, screen_height);
                        println!("📍 Widget positionné à: x={}, y={}", x as i32, y as i32);
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
