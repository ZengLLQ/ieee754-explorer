#[cfg(test)]
mod mandatory_and_edge_case_tests {
    use ieee754_core::{
        convert_decimal, get_hex_reference_table, get_presets, validate_input, wasm_alloc,
        wasm_convert_json, wasm_dealloc, wasm_result_len, wasm_result_ptr, Precision,
        ValueCategory,
    };

    /// Mandatory Test A — 126.25, Single Precision (IEEE 754 binary32)
    #[test]
    fn test_a_126_25_single_precision() {
        let r = convert_decimal("126.25", Precision::Single).expect("126.25 single precision");
        assert_eq!(r.sign_bit, 0);
        assert_eq!(r.step4_normalization.unbiased_exponent, 6);
        assert_eq!(r.format.bias, 127);
        assert_eq!(r.step5_biased_exponent.biased_exponent_decimal, 133);
        assert_eq!(r.exponent_bits, "10000101");
        assert_eq!(r.fraction_bits, "11111001000000000000000");
        assert_eq!(r.complete_bit_pattern, "01000010111111001000000000000000");
        assert_eq!(r.hexadecimal, "0x42FC8000");
        assert_eq!(r.raw_bits_u64, 126.25_f32.to_bits() as u64);

        // Verify Step 3A integer division rows (126 -> 1111110)
        assert_eq!(r.step3_integer.binary_string, "1111110");
        assert_eq!(r.step3_integer.rows.len(), 7);
        assert_eq!(r.step3_integer.rows[0].dividend, "126");
        assert_eq!(r.step3_integer.rows[0].quotient, "63");
        assert_eq!(r.step3_integer.rows[0].remainder, 0);

        // Verify Step 3B fractional multiplication rows (0.25 -> .01)
        assert_eq!(r.step3_fraction.binary_string, "01");
        assert!(r.step3_fraction.terminates);
        assert!(!r.step3_fraction.is_repeating);
        assert_eq!(r.step3_fraction.rows.len(), 2);
        assert_eq!(r.step3_fraction.rows[0].integer_bit, 0);
        assert_eq!(r.step3_fraction.rows[1].integer_bit, 1);

        // Verify Step 8 Hex rows (8 nibbles -> 42FC8000)
        assert_eq!(r.step8_hex_rows.len(), 8);
        let hex_joined: String = r.step8_hex_rows.iter().map(|n| n.hex_digit.as_str()).collect();
        assert_eq!(hex_joined, "42FC8000");

        // Verify Step 9 exactness
        assert!(r.step9_interpretation.is_exact_representation);
        assert_eq!(r.step9_interpretation.represented_decimal_exact, "126.25");
        assert!(r.step9_interpretation.verified_against_rust_primitive);
    }

    /// Mandatory Test B — 126.25, Double Precision (IEEE 754 binary64)
    #[test]
    fn test_b_126_25_double_precision() {
        let r = convert_decimal("126.25", Precision::Double).expect("126.25 double precision");
        assert_eq!(r.sign_bit, 0);
        assert_eq!(r.step4_normalization.unbiased_exponent, 6);
        assert_eq!(r.format.bias, 1023);
        assert_eq!(r.step5_biased_exponent.biased_exponent_decimal, 1029);
        assert_eq!(r.exponent_bits, "10000000101");
        assert_eq!(r.fraction_bits.len(), 52);
        assert_eq!(
            r.fraction_bits,
            "1111100100000000000000000000000000000000000000000000"
        );
        assert_eq!(r.complete_bit_pattern.len(), 64);
        assert_eq!(r.hexadecimal, "0x405F900000000000");
        assert_eq!(r.raw_bits_u64, 126.25_f64.to_bits());
        assert_eq!(r.step8_hex_rows.len(), 16);
        assert!(r.step9_interpretation.is_exact_representation);
        assert_eq!(r.step9_interpretation.represented_decimal_exact, "126.25");
        assert!(r.step9_interpretation.verified_against_rust_primitive);
    }

    /// Mandatory Test C — 0.1 in Single and Double Precision (non-terminating repeating binary fraction)
    #[test]
    fn test_c_0_1_both_precisions() {
        // Single Precision
        let r32 = convert_decimal("0.1", Precision::Single).expect("0.1 single precision");
        assert_eq!(r32.sign_bit, 0);
        assert_eq!(r32.step4_normalization.unbiased_exponent, -4);
        assert_eq!(r32.step5_biased_exponent.biased_exponent_decimal, 123);
        assert_eq!(r32.exponent_bits, "01111011");
        assert_eq!(r32.fraction_bits, "10011001100110011001101");
        assert_eq!(r32.hexadecimal, "0x3DCCCCCD");
        assert_eq!(r32.raw_bits_u64, 0.1_f32.to_bits() as u64);
        assert!(!r32.step3_fraction.terminates);
        assert!(r32.step3_fraction.is_repeating);
        assert!(r32.step6_fraction_field.rounding_occurred);
        assert_eq!(r32.step6_fraction_field.rounding_direction, "up");
        assert!(!r32.step9_interpretation.is_exact_representation);
        assert_eq!(
            r32.step9_interpretation.represented_decimal_exact,
            "0.100000001490116119384765625"
        );
        assert!(r32.step9_interpretation.verified_against_rust_primitive);

        // Double Precision
        let r64 = convert_decimal("0.1", Precision::Double).expect("0.1 double precision");
        assert_eq!(r64.sign_bit, 0);
        assert_eq!(r64.step4_normalization.unbiased_exponent, -4);
        assert_eq!(r64.step5_biased_exponent.biased_exponent_decimal, 1019);
        assert_eq!(r64.exponent_bits, "01111111011");
        assert_eq!(
            r64.fraction_bits,
            "1001100110011001100110011001100110011001100110011010"
        );
        assert_eq!(r64.hexadecimal, "0x3FB999999999999A");
        assert_eq!(r64.raw_bits_u64, 0.1_f64.to_bits());
        assert!(!r64.step3_fraction.terminates);
        assert!(r64.step3_fraction.is_repeating);
        assert!(r64.step6_fraction_field.rounding_occurred);
        assert_eq!(r64.step6_fraction_field.rounding_direction, "up");
        assert!(!r64.step9_interpretation.is_exact_representation);
        assert_eq!(
            r64.step9_interpretation.represented_decimal_exact,
            "0.1000000000000000055511151231257827021181583404541015625"
        );
        assert!(r64.step9_interpretation.verified_against_rust_primitive);
    }

    /// Mandatory Test D — Negative Value (-13.5)
    #[test]
    fn test_d_negative_13_5() {
        let r32 = convert_decimal("-13.5", Precision::Single).expect("-13.5 single precision");
        assert_eq!(r32.sign_bit, 1);
        assert_eq!(r32.step3_integer.binary_string, "1101");
        assert_eq!(r32.step3_fraction.binary_string, "1");
        assert_eq!(r32.step4_normalization.unbiased_exponent, 3);
        assert_eq!(r32.step5_biased_exponent.biased_exponent_decimal, 130);
        assert_eq!(r32.exponent_bits, "10000010");
        assert_eq!(r32.fraction_bits, "10110000000000000000000");
        assert_eq!(r32.hexadecimal, "0xC1580000");
        assert_eq!(r32.raw_bits_u64, (-13.5_f32).to_bits() as u64);
        assert!(r32.step9_interpretation.is_exact_representation);
        assert_eq!(r32.step9_interpretation.represented_decimal_exact, "-13.5");
        assert!(r32.step9_interpretation.verified_against_rust_primitive);

        let r64 = convert_decimal("-13.5", Precision::Double).expect("-13.5 double precision");
        assert_eq!(r64.sign_bit, 1);
        assert_eq!(r64.step4_normalization.unbiased_exponent, 3);
        assert_eq!(r64.step5_biased_exponent.biased_exponent_decimal, 1026);
        assert_eq!(r64.exponent_bits, "10000000010");
        assert_eq!(r64.hexadecimal, "0xC02B000000000000");
        assert_eq!(r64.raw_bits_u64, (-13.5_f64).to_bits());
        assert!(r64.step9_interpretation.is_exact_representation);
        assert_eq!(r64.step9_interpretation.represented_decimal_exact, "-13.5");
    }

    /// Mandatory Test E — Zero and Negative Zero (0, -0, -0.0, -0.0e0)
    #[test]
    fn test_e_zero_and_negative_zero() {
        let pos32 = convert_decimal("0", Precision::Single).expect("0 single");
        assert_eq!(pos32.category, ValueCategory::PositiveZero);
        assert_eq!(pos32.sign_bit, 0);
        assert_eq!(pos32.exponent_bits, "00000000");
        assert_eq!(pos32.fraction_bits, "00000000000000000000000");
        assert_eq!(pos32.hexadecimal, "0x00000000");

        let neg32 = convert_decimal("-0", Precision::Single).expect("-0 single");
        assert_eq!(neg32.category, ValueCategory::NegativeZero);
        assert_eq!(neg32.sign_bit, 1);
        assert_eq!(neg32.exponent_bits, "00000000");
        assert_eq!(neg32.fraction_bits, "00000000000000000000000");
        assert_eq!(neg32.hexadecimal, "0x80000000");
        assert!(neg32.validation.preserves_negative_zero);

        let neg_dec = convert_decimal("-0.000", Precision::Single).expect("-0.000 single");
        assert_eq!(neg_dec.category, ValueCategory::NegativeZero);
        assert_eq!(neg_dec.sign_bit, 1);
        assert_eq!(neg_dec.hexadecimal, "0x80000000");

        let pos64 = convert_decimal("0", Precision::Double).expect("0 double");
        assert_eq!(pos64.category, ValueCategory::PositiveZero);
        assert_eq!(pos64.sign_bit, 0);
        assert_eq!(pos64.hexadecimal, "0x0000000000000000");

        let neg64 = convert_decimal("-0", Precision::Double).expect("-0 double");
        assert_eq!(neg64.category, ValueCategory::NegativeZero);
        assert_eq!(neg64.sign_bit, 1);
        assert_eq!(neg64.hexadecimal, "0x8000000000000000");
    }

    /// Mandatory Test F — Subnormal, Normal Boundaries, Overflow, Underflow, and Special Values
    #[test]
    fn test_f_subnormal_and_special_values() {
        // 1. Smallest positive subnormal in binary32: 1.4e-45 -> 0x00000001
        let min_sub32 = convert_decimal("1.4e-45", Precision::Single).expect("1.4e-45");
        assert_eq!(min_sub32.category, ValueCategory::Subnormal);
        assert_eq!(min_sub32.sign_bit, 0);
        assert_eq!(min_sub32.exponent_bits, "00000000");
        assert_eq!(min_sub32.fraction_bits, "00000000000000000000001");
        assert_eq!(min_sub32.hexadecimal, "0x00000001");
        assert_eq!(min_sub32.step4_normalization.unbiased_exponent, -126);
        assert_eq!(min_sub32.step4_normalization.implicit_leading_bit, "0");

        // 2. Smallest positive normal in binary32: 1.17549435e-38 -> 0x00800000
        let min_norm32 =
            convert_decimal("1.17549435e-38", Precision::Single).expect("1.17549435e-38");
        assert_eq!(min_norm32.category, ValueCategory::Normal);
        assert_eq!(min_norm32.exponent_bits, "00000001");
        assert_eq!(min_norm32.fraction_bits, "00000000000000000000000");
        assert_eq!(min_norm32.hexadecimal, "0x00800000");
        assert_eq!(min_norm32.step4_normalization.unbiased_exponent, -126);

        // 3. Largest finite value in binary32: 3.4028235e38 -> 0x7F7FFFFF
        let max_fin32 = convert_decimal("3.4028235e38", Precision::Single).expect("3.4028235e38");
        assert_eq!(max_fin32.category, ValueCategory::Normal);
        assert_eq!(max_fin32.exponent_bits, "11111110");
        assert_eq!(max_fin32.fraction_bits, "11111111111111111111111");
        assert_eq!(max_fin32.hexadecimal, "0x7F7FFFFF");
        assert_eq!(max_fin32.step4_normalization.unbiased_exponent, 127);

        // 4. Smallest positive subnormal in binary64: 5e-324 -> 0x0000000000000001
        let min_sub64 = convert_decimal("5e-324", Precision::Double).expect("5e-324");
        assert_eq!(min_sub64.category, ValueCategory::Subnormal);
        assert_eq!(min_sub64.hexadecimal, "0x0000000000000001");
        assert_eq!(min_sub64.step4_normalization.unbiased_exponent, -1022);

        // 5. Smallest positive normal in binary64: 2.2250738585072014e-308 -> 0x0010000000000000
        let min_norm64 =
            convert_decimal("2.2250738585072014e-308", Precision::Double).expect("min normal f64");
        assert_eq!(min_norm64.category, ValueCategory::Normal);
        assert_eq!(min_norm64.hexadecimal, "0x0010000000000000");
        assert_eq!(min_norm64.step4_normalization.unbiased_exponent, -1022);

        // 6. Largest finite value in binary64: 1.7976931348623157e308 -> 0x7FEFFFFFFFFFFFFF
        let max_fin64 =
            convert_decimal("1.7976931348623157e308", Precision::Double).expect("max finite f64");
        assert_eq!(max_fin64.category, ValueCategory::Normal);
        assert_eq!(max_fin64.hexadecimal, "0x7FEFFFFFFFFFFFFF");
        assert_eq!(max_fin64.step4_normalization.unbiased_exponent, 1023);

        // 7. Overflow to Infinity in binary32 (while remaining normal in binary64)
        let ovf32 = convert_decimal("1e40", Precision::Single).expect("1e40 single");
        assert_eq!(ovf32.category, ValueCategory::OverflowToInfinity);
        assert_eq!(ovf32.hexadecimal, "0x7F800000");
        let norm64 = convert_decimal("1e40", Precision::Double).expect("1e40 double");
        assert_eq!(norm64.category, ValueCategory::Normal);

        // 8. Negative Overflow to -Infinity
        let neg_ovf32 = convert_decimal("-1e40", Precision::Single).expect("-1e40 single");
        assert_eq!(neg_ovf32.category, ValueCategory::OverflowToInfinity);
        assert_eq!(neg_ovf32.sign_bit, 1);
        assert_eq!(neg_ovf32.hexadecimal, "0xFF800000");

        // 9. Underflow to Zero in binary32 (pos and neg)
        let udf32 = convert_decimal("1e-50", Precision::Single).expect("1e-50 single");
        assert_eq!(udf32.category, ValueCategory::UnderflowToZero);
        assert_eq!(udf32.sign_bit, 0);
        assert_eq!(udf32.hexadecimal, "0x00000000");

        let neg_udf32 = convert_decimal("-1e-50", Precision::Single).expect("-1e-50 single");
        assert_eq!(neg_udf32.category, ValueCategory::UnderflowToZero);
        assert_eq!(neg_udf32.sign_bit, 1);
        assert_eq!(neg_udf32.hexadecimal, "0x80000000");

        // 10. Explicit Infinity & NaN literals
        let inf32 = convert_decimal("Infinity", Precision::Single).expect("Infinity");
        assert_eq!(inf32.category, ValueCategory::PositiveInfinity);
        assert_eq!(inf32.hexadecimal, "0x7F800000");

        let neg_inf64 = convert_decimal("-inf", Precision::Double).expect("-inf");
        assert_eq!(neg_inf64.category, ValueCategory::NegativeInfinity);
        assert_eq!(neg_inf64.hexadecimal, "0xFFF0000000000000");

        let nan32 = convert_decimal("NaN", Precision::Single).expect("NaN");
        assert_eq!(nan32.category, ValueCategory::NaN);
        assert_eq!(nan32.hexadecimal, "0x7FC00000");
    }

    /// Test rounding near 2.0 boundary: 1.99999994 (< 2 - 2^-24 -> 0x3FFFFFFF) and 1.99999995 (> 2 - 2^-24 -> 0x40000000 carry into exponent)
    #[test]
    fn test_rounding_carry_into_exponent() {
        let below_tie = convert_decimal("1.99999994", Precision::Single).expect("1.99999994");
        assert_eq!(below_tie.hexadecimal, "0x3FFFFFFF");
        assert_eq!(below_tie.step4_normalization.unbiased_exponent, 0);
        assert!(!below_tie.step6_fraction_field.carry_into_exponent);
        assert!(below_tie.step9_interpretation.verified_against_rust_primitive);

        let r = convert_decimal("1.99999995", Precision::Single).expect("1.99999995");
        assert_eq!(r.hexadecimal, "0x40000000");
        assert_eq!(r.step4_normalization.unbiased_exponent, 1);
        assert!(r.step6_fraction_field.carry_into_exponent);
        assert!(r.step9_interpretation.verified_against_rust_primitive);
    }

    /// Test input validation on empty, malformed, and valid inputs
    #[test]
    fn test_input_validation_edge_cases() {
        assert!(!validate_input("").is_valid);
        assert!(!validate_input("   ").is_valid);
        assert!(!validate_input("abc").is_valid);
        assert!(!validate_input("12.34.56").is_valid);
        assert!(!validate_input("1.25e").is_valid);
        assert!(!validate_input("e10").is_valid);
        assert!(!validate_input("-").is_valid);
        assert!(!validate_input(".").is_valid);

        assert!(validate_input(".5").is_valid);
        assert!(validate_input("5.").is_valid);
        assert!(validate_input("+126.25").is_valid);
        assert!(validate_input("1.25e-10").is_valid);
        assert!(validate_input("-0").preserves_negative_zero);
    }

    /// Test WASM C-ABI memory and JSON serialization round-trip
    #[test]
    fn test_wasm_abi_exports() {
        let input = "126.25";
        let bytes = input.as_bytes();
        let ptr = wasm_alloc(bytes.len());
        unsafe {
            std::ptr::copy_nonoverlapping(bytes.as_ptr(), ptr, bytes.len());
            let out_len = wasm_convert_json(ptr, bytes.len(), 0);
            wasm_dealloc(ptr, bytes.len());
            assert!(out_len > 0);
            assert_eq!(out_len, wasm_result_len());
            let out_slice = std::slice::from_raw_parts(wasm_result_ptr(), out_len);
            let json_str = std::str::from_utf8(out_slice).expect("valid utf8 json");
            let parsed: serde_json::Value = serde_json::from_str(json_str).expect("valid json");
            assert_eq!(parsed["ok"], true);
            assert_eq!(parsed["data"]["hexadecimal"], "0x42FC8000");
        }

        assert_eq!(get_hex_reference_table().len(), 16);
        assert!(!get_presets().is_empty());
    }
}
