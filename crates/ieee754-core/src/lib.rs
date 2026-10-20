pub mod decimal_math;
pub mod engine;
pub mod parser;
pub mod types;

pub use engine::{convert_decimal, get_hex_reference_table, get_presets, validate_input};
pub use types::*;

use std::cell::RefCell;
use serde::Serialize;

#[derive(Serialize)]
struct WasmResponse<T: Serialize> {
    ok: bool,
    data: Option<T>,
    error: Option<InputValidation>,
}

thread_local! {
    static WASM_OUTPUT_BUFFER: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

fn store_wasm_output(json: String) -> usize {
    let bytes = json.into_bytes();
    let len = bytes.len();
    WASM_OUTPUT_BUFFER.with(|buf| {
        *buf.borrow_mut() = bytes;
    });
    len
}

/// Allocates a byte buffer of `size` bytes in WASM linear memory for passing UTF-8 strings from JS.
#[no_mangle]
pub extern "C" fn wasm_alloc(size: usize) -> *mut u8 {
    if size == 0 {
        return std::ptr::null_mut();
    }
    let mut buf = Vec::<u8>::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

/// Frees a byte buffer previously allocated with `wasm_alloc`.
///
/// # Safety
/// `ptr` and `size` must match a previous allocation from `wasm_alloc`.
#[no_mangle]
pub unsafe extern "C" fn wasm_dealloc(ptr: *mut u8, size: usize) {
    if !ptr.is_null() && size > 0 {
        let _ = Vec::from_raw_parts(ptr, 0, size);
    }
}

/// Returns the pointer to the latest JSON output buffer stored in WASM linear memory.
#[no_mangle]
pub extern "C" fn wasm_result_ptr() -> *const u8 {
    WASM_OUTPUT_BUFFER.with(|buf| buf.borrow().as_ptr())
}

/// Returns the byte length of the latest JSON output buffer stored in WASM linear memory.
#[no_mangle]
pub extern "C" fn wasm_result_len() -> usize {
    WASM_OUTPUT_BUFFER.with(|buf| buf.borrow().len())
}

/// Executes `convert_decimal` from WASM and stores the serialized JSON result in `WASM_OUTPUT_BUFFER`.
/// `precision_code`: `0` = Single (`binary32`), `1` = Double (`binary64`).
/// Returns the byte length of the JSON output buffer.
///
/// # Safety
/// `ptr` must point to `len` valid UTF-8 bytes allocated in WASM memory.
#[no_mangle]
pub unsafe extern "C" fn wasm_convert_json(
    ptr: *const u8,
    len: usize,
    precision_code: u32,
) -> usize {
    let input_slice = if ptr.is_null() || len == 0 {
        &[][..]
    } else {
        std::slice::from_raw_parts(ptr, len)
    };
    let input_str = std::str::from_utf8(input_slice).unwrap_or("");
    let precision = if precision_code == 1 {
        Precision::Double
    } else {
        Precision::Single
    };

    let response = match convert_decimal(input_str, precision) {
        Ok(report) => WasmResponse {
            ok: true,
            data: Some(report),
            error: None,
        },
        Err(validation_err) => WasmResponse {
            ok: false,
            data: None,
            error: Some(validation_err),
        },
    };

    let json = serde_json::to_string(&response).unwrap_or_else(|_| {
        r#"{"ok":false,"data":null,"error":{"is_valid":false,"raw_input":"","trimmed_input":"","canonical_decimal":"","error_message":"Serialization error","warning_message":null,"preserves_negative_zero":false,"is_scientific_notation":false,"is_special_literal":false}}"#.to_string()
    });
    store_wasm_output(json)
}

/// Executes `validate_input` from WASM and stores the serialized JSON result in `WASM_OUTPUT_BUFFER`.
///
/// # Safety
/// `ptr` must point to `len` valid UTF-8 bytes allocated in WASM memory.
#[no_mangle]
pub unsafe extern "C" fn wasm_validate_json(ptr: *const u8, len: usize) -> usize {
    let input_slice = if ptr.is_null() || len == 0 {
        &[][..]
    } else {
        std::slice::from_raw_parts(ptr, len)
    };
    let input_str = std::str::from_utf8(input_slice).unwrap_or("");
    let validation = validate_input(input_str);
    let json = serde_json::to_string(&validation).unwrap_or_default();
    store_wasm_output(json)
}

/// Stores the JSON-serialized presets and hex reference table in `WASM_OUTPUT_BUFFER`.
#[no_mangle]
pub extern "C" fn wasm_metadata_json() -> usize {
    #[derive(Serialize)]
    struct MetadataPayload {
        presets: Vec<ExamplePreset>,
        hex_reference_table: Vec<HexReferenceEntry>,
    }
    let payload = MetadataPayload {
        presets: get_presets(),
        hex_reference_table: get_hex_reference_table(),
    };
    let json = serde_json::to_string(&payload).unwrap_or_default();
    store_wasm_output(json)
}

#[cfg(test)]
mod unit_tests {
    use super::*;

    #[test]
    fn unit_test_126_25_single_precision() {
        let report = convert_decimal("126.25", Precision::Single).expect("should convert 126.25");
        assert_eq!(report.sign_bit, 0);
        assert_eq!(report.step4_normalization.unbiased_exponent, 6);
        assert_eq!(report.format.bias, 127);
        assert_eq!(report.step5_biased_exponent.biased_exponent_decimal, 133);
        assert_eq!(report.exponent_bits, "10000101");
        assert_eq!(report.fraction_bits, "11111001000000000000000");
        assert_eq!(
            report.complete_bit_pattern,
            "01000010111111001000000000000000"
        );
        assert_eq!(report.hexadecimal, "0x42FC8000");
        assert!(report.step9_interpretation.is_exact_representation);
        assert!(report.step9_interpretation.verified_against_rust_primitive);
        assert_eq!(report.steps.len(), 9);
    }

    #[test]
    fn unit_test_126_25_double_precision() {
        let report = convert_decimal("126.25", Precision::Double).expect("should convert 126.25");
        assert_eq!(report.sign_bit, 0);
        assert_eq!(report.step4_normalization.unbiased_exponent, 6);
        assert_eq!(report.format.bias, 1023);
        assert_eq!(report.step5_biased_exponent.biased_exponent_decimal, 1029);
        assert_eq!(report.exponent_bits, "10000000101");
        assert_eq!(report.fraction_bits.len(), 52);
        assert_eq!(
            report.fraction_bits,
            "1111100100000000000000000000000000000000000000000000"
        );
        assert_eq!(report.hexadecimal, "0x405F900000000000");
        assert!(report.step9_interpretation.is_exact_representation);
        assert!(report.step9_interpretation.verified_against_rust_primitive);
    }
}
