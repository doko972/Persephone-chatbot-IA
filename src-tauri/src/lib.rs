// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Positionnement responsive du widget
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(monitor) = window.current_monitor() {
                    if let Some(monitor) = monitor {
                        let screen_size = monitor.size();
                        let screen_width = screen_size.width as f64;
                        let screen_height = screen_size.height as f64;

                        let widget_width = 450.0; // Largeur du chatbot
                        let widget_height = 700.0; // Hauteur du chatbot

                        // 🎯 NOUVELLE POSITION : Coin bas-droit VISIBLE
                        // 20px de marge à droite et en bas
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
