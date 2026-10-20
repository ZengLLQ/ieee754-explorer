use ieee754_core::{
    convert_decimal, get_hex_reference_table, get_presets, validate_input, ConversionReport,
    ExamplePreset, HexReferenceEntry, InputValidation, Precision,
};
use serde::Serialize;

#[derive(Serialize)]
pub struct DesktopConvertEnvelope {
    pub ok: bool,
    pub data: Option<ConversionReport>,
    pub error: Option<InputValidation>,
}

#[derive(Serialize)]
pub struct DesktopMetadata {
    pub presets: Vec<ExamplePreset>,
    pub hex_reference_table: Vec<HexReferenceEntry>,
}

#[tauri::command]
fn convert_decimal_cmd(input: String, precision: Precision) -> DesktopConvertEnvelope {
    match convert_decimal(&input, precision) {
        Ok(report) => DesktopConvertEnvelope {
            ok: true,
            data: Some(report),
            error: None,
        },
        Err(err) => DesktopConvertEnvelope {
            ok: false,
            data: None,
            error: Some(err),
        },
    }
}

#[tauri::command]
fn validate_input_cmd(input: String) -> InputValidation {
    validate_input(&input)
}

#[tauri::command]
fn get_metadata_cmd() -> DesktopMetadata {
    DesktopMetadata {
        presets: get_presets(),
        hex_reference_table: get_hex_reference_table(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            convert_decimal_cmd,
            validate_input_cmd,
            get_metadata_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running IEEE 754 Explorer desktop application");
}
