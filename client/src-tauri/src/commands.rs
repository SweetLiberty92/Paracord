#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Paracord.", name)
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
