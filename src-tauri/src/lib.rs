// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .setup(|app| {
            // 🆕 Positionnement responsive du widget
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(monitor) = window.current_monitor() {
                    if let Some(monitor) = monitor {
                        let screen_size = monitor.size();
                        let screen_width = screen_size.width as f64;
                        let screen_height = screen_size.height as f64;
                        
                        let widget_width = 400.0;
                        let widget_height = 400.0;
                        
                        // 📍 Position : 95% droite (coin bas-droit), 90% bas
                        let x = (screen_width * 0.95) - widget_width;
                        let y = (screen_height * 0.80) - widget_height;
                        
                        // Positionner la fenêtre (desktop uniquement)
                        #[cfg(not(target_os = "android"))]
                        {
                            let _ = window.set_position(tauri::Position::Physical(
                                tauri::PhysicalPosition { 
                                    x: x as i32, 
                                    y: y as i32 
                                }
                            ));
                        }
                        
                        println!("📐 Écran: {}x{}", screen_width, screen_height);
                        println!("📍 Widget positionné à: x={}, y={}", x as i32, y as i32);
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}