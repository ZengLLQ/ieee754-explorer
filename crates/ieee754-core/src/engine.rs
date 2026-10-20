use crate::decimal_math::{
    convert_fraction_part, convert_integer_part, convert_u32_to_binary_rows,
    exact_float_decimal_string,
};
use crate::parser::{parse_and_validate_input, ParsedDecimalInput, SpecialLiteral};
use crate::types::{
    BiasedExponentDetail, BitAssemblyDetail, BitFieldSegment, ConversionReport, ConversionStep,
    ExamplePreset, FinalInterpretation, FormatSpec, FractionConversionDetail, FractionFieldDetail,
    FractionMultRow, HexReferenceEntry, InputValidation, IntegerConversionDetail, NibbleHexRow,
    NormalizationDetail, Precision, ValueCategory,
};

/// Returns the standard 16-row 4-bit binary to hexadecimal reference table (0x0 .. 0xF).
pub fn get_hex_reference_table() -> Vec<HexReferenceEntry> {
    (0u8..16u8)
        .map(|v| HexReferenceEntry {
            hex: format!("{v:X}"),
            binary: format!("{v:04b}"),
            decimal: v,
        })
        .collect()
}

/// Returns curated educational presets covering mandatory test cases and IEEE 754 edge cases.
pub fn get_presets() -> Vec<ExamplePreset> {
    vec![
        ExamplePreset {
            label: "126.25".to_string(),
            input: "126.25".to_string(),
            description: "Handwritten reference example (exact normal binary fraction)".to_string(),
            recommended_precision: Some(Precision::Single),
        },
        ExamplePreset {
            label: "0.1".to_string(),
            input: "0.1".to_string(),
            description: "Classic non-terminating repeating binary fraction (0.000110011...₂)".to_string(),
            recommended_precision: None,
        },
        ExamplePreset {
            label: "-13.5".to_string(),
            input: "-13.5".to_string(),
            description: "Negative normal number (Sign bit = 1)".to_string(),
            recommended_precision: None,
        },
        ExamplePreset {
            label: "-0".to_string(),
            input: "-0".to_string(),
            description: "IEEE 754 signed negative zero (Sign bit = 1, all other bits = 0)".to_string(),
            recommended_precision: None,
        },
        ExamplePreset {
            label: "3.141592653589793".to_string(),
            input: "3.141592653589793".to_string(),
            description: "High-precision π approximation comparing binary32 vs binary64 rounding".to_string(),
            recommended_precision: Some(Precision::Double),
        },
        ExamplePreset {
            label: "1.4e-45".to_string(),
            input: "1.4e-45".to_string(),
            description: "Smallest positive subnormal in binary32 (2⁻¹⁴⁹)".to_string(),
            recommended_precision: Some(Precision::Single),
        },
        ExamplePreset {
            label: "1.17549435e-38".to_string(),
            input: "1.17549435e-38".to_string(),
            description: "Smallest positive normal in binary32 (2⁻¹²⁶)".to_string(),
            recommended_precision: Some(Precision::Single),
        },
        ExamplePreset {
            label: "3.4028235e38".to_string(),
            input: "3.4028235e38".to_string(),
            description: "Largest finite representable value in binary32".to_string(),
            recommended_precision: Some(Precision::Single),
        },
        ExamplePreset {
            label: "1e40".to_string(),
            input: "1e40".to_string(),
            description: "Overflows to +Infinity in binary32, remains normal in binary64".to_string(),
            recommended_precision: Some(Precision::Single),
        },
    ]
}

/// Validates a user decimal string without performing full conversion.
pub fn validate_input(raw: &str) -> InputValidation {
    match parse_and_validate_input(raw) {
        Ok(parsed) => parsed.validation,
        Err(err_val) => err_val,
    }
}

/// Performs complete IEEE 754 conversion and builds all 9 educational steps.
pub fn convert_decimal(raw_input: &str, precision: Precision) -> Result<ConversionReport, InputValidation> {
    let parsed = parse_and_validate_input(raw_input)?;
    let format = precision.format_spec();

    // Obtain authoritative IEEE 754 bit pattern using Rust's target floating-point primitive.
    let (raw_bits_u64, represented_short, f64_approx) = encode_with_rust_primitive(&parsed, precision);

    let sign_bit = ((raw_bits_u64 >> (format.total_bits - 1)) & 1) as u8;
    let sign_bit_str = sign_bit.to_string();
    let exp_mask = (1u64 << format.exponent_bits) - 1;
    let frac_mask = (1u64 << format.fraction_bits) - 1;
    let exp_max = exp_mask as u32;

    let biased_exp_u32 = ((raw_bits_u64 >> format.fraction_bits) & exp_mask) as u32;
    let fraction_u64 = raw_bits_u64 & frac_mask;

    let exponent_bits = format!("{:0width$b}", biased_exp_u32, width = format.exponent_bits);
    let fraction_bits = format!("{:0width$b}", fraction_u64, width = format.fraction_bits);
    let complete_bit_pattern = format!("{sign_bit_str}{exponent_bits}{fraction_bits}");
    let hexadecimal = format!("0x{:0width$X}", raw_bits_u64, width = format.hex_digits);

    // Determine category
    let category = match parsed.special_literal {
        Some(SpecialLiteral::NaN) => ValueCategory::NaN,
        Some(SpecialLiteral::PositiveInfinity) => ValueCategory::PositiveInfinity,
        Some(SpecialLiteral::NegativeInfinity) => ValueCategory::NegativeInfinity,
        None => {
            if biased_exp_u32 == exp_max {
                ValueCategory::OverflowToInfinity
            } else if biased_exp_u32 == 0 && fraction_u64 == 0 {
                if !parsed.is_zero_value {
                    ValueCategory::UnderflowToZero
                } else if sign_bit == 1 {
                    ValueCategory::NegativeZero
                } else {
                    ValueCategory::PositiveZero
                }
            } else if biased_exp_u32 == 0 {
                ValueCategory::Subnormal
            } else {
                ValueCategory::Normal
            }
        }
    };

    // STEP 3: Integer & Fractional binary conversion
    let (step3_integer, step3_fraction, raw_frac_bits_vec, has_more_frac_rem) =
        build_step3_details(&parsed, &format, category, biased_exp_u32, fraction_u64);

    // STEP 4: Normalization
    let step4_normalization = build_step4_normalization(
        &parsed,
        &format,
        category,
        biased_exp_u32,
        fraction_u64,
        &step3_integer,
        &raw_frac_bits_vec,
    );

    // STEP 5: Biased Exponent
    let step5_biased_exponent =
        build_step5_biased_exponent(&format, category, biased_exp_u32, &step4_normalization);

    // STEP 6: Fraction Field & Rounding
    let (step6_fraction_field, edu_verified) = build_step6_fraction_field(
        &parsed,
        &format,
        category,
        biased_exp_u32,
        fraction_u64,
        &fraction_bits,
        &step3_integer,
        &step3_fraction,
        &raw_frac_bits_vec,
        has_more_frac_rem,
        &step4_normalization,
    );

    // STEP 7: Assemble the IEEE 754 Bit Pattern
    let step7_assembly = build_step7_assembly(
        &format,
        sign_bit,
        biased_exp_u32,
        &exponent_bits,
        &fraction_bits,
        &complete_bit_pattern,
    );

    // STEP 8: Convert Binary to Hexadecimal
    let step8_hex_rows = build_step8_hex_rows(&format, &complete_bit_pattern);
    let hex_reference_table = get_hex_reference_table();

    // STEP 9: Final Result & Interpretation
    let step9_interpretation = build_step9_interpretation(
        &parsed,
        &format,
        category,
        sign_bit,
        biased_exp_u32,
        fraction_u64,
        &exponent_bits,
        &fraction_bits,
        &complete_bit_pattern,
        &hexadecimal,
        &represented_short,
        f64_approx,
        &step4_normalization,
        &step6_fraction_field,
        edu_verified,
    );

    // Build unified 9-step array for sequential step-by-step UI
    let steps = build_nine_steps(
        &parsed,
        &format,
        category,
        sign_bit,
        &exponent_bits,
        &fraction_bits,
        &complete_bit_pattern,
        &hexadecimal,
        &step3_integer,
        &step3_fraction,
        &step4_normalization,
        &step5_biased_exponent,
        &step6_fraction_field,
        &step8_hex_rows,
        &step9_interpretation,
    );

    let parsing_policy_note = match precision {
        Precision::Single => "Input string is validated and parsed directly into Rust's native f32 primitive (IEEE 754 binary32) using Clinger/Eisel-Lemire round-to-nearest, ties-to-even semantics via f32::from_str and f32::to_bits(), while preserving the exact decimal digit string for step-by-step educational derivation.".to_string(),
        Precision::Double => "Input string is validated and parsed directly into Rust's native f64 primitive (IEEE 754 binary64) using Clinger/Eisel-Lemire round-to-nearest, ties-to-even semantics via f64::from_str and f64::to_bits(), while preserving the exact decimal digit string for step-by-step educational derivation.".to_string(),
    };

    Ok(ConversionReport {
        original_input: parsed.validation.trimmed_input.clone(),
        validation: parsed.validation,
        precision,
        format,
        category,
        sign_bit,
        sign_bit_str,
        exponent_bits,
        fraction_bits,
        complete_bit_pattern,
        hexadecimal,
        raw_bits_u64,
        step3_integer,
        step3_fraction,
        step4_normalization,
        step5_biased_exponent,
        step6_fraction_field,
        step7_assembly,
        step8_hex_rows,
        hex_reference_table,
        step9_interpretation,
        steps,
        parsing_policy_note,
    })
}

/// Obtains the authoritative IEEE 754 bit pattern using `f32::to_bits()` or `f64::to_bits()`.
fn encode_with_rust_primitive(
    parsed: &ParsedDecimalInput,
    precision: Precision,
) -> (u64, String, f64) {
    match precision {
        Precision::Single => {
            if let Some(special) = parsed.special_literal {
                return match special {
                    SpecialLiteral::PositiveInfinity => (
                        f32::INFINITY.to_bits() as u64,
                        "Infinity".to_string(),
                        f64::INFINITY,
                    ),
                    SpecialLiteral::NegativeInfinity => (
                        f32::NEG_INFINITY.to_bits() as u64,
                        "-Infinity".to_string(),
                        f64::NEG_INFINITY,
                    ),
                    SpecialLiteral::NaN => (0x7FC0_0000u64, "NaN".to_string(), f64::NAN),
                };
            }

            let mut val: f32 = parsed
                .validation
                .trimmed_input
                .parse::<f32>()
                .unwrap_or(0.0_f32);
            if parsed.is_negative && val == 0.0 {
                val = -0.0_f32;
            }
            let bits = val.to_bits() as u64;
            let short_str = if val == 0.0 && parsed.is_negative {
                "-0.0".to_string()
            } else {
                format!("{val}")
            };
            (bits, short_str, val as f64)
        }
        Precision::Double => {
            if let Some(special) = parsed.special_literal {
                return match special {
                    SpecialLiteral::PositiveInfinity => (
                        f64::INFINITY.to_bits(),
                        "Infinity".to_string(),
                        f64::INFINITY,
                    ),
                    SpecialLiteral::NegativeInfinity => (
                        f64::NEG_INFINITY.to_bits(),
                        "-Infinity".to_string(),
                        f64::NEG_INFINITY,
                    ),
                    SpecialLiteral::NaN => (
                        0x7FF8_0000_0000_0000u64,
                        "NaN".to_string(),
                        f64::NAN,
                    ),
                };
            }

            let mut val: f64 = parsed
                .validation
                .trimmed_input
                .parse::<f64>()
                .unwrap_or(0.0_f64);
            if parsed.is_negative && val == 0.0 {
                val = -0.0_f64;
            }
            let bits = val.to_bits();
            let short_str = if val == 0.0 && parsed.is_negative {
                "-0.0".to_string()
            } else {
                format!("{val}")
            };
            (bits, short_str, val)
        }
    }
}

fn build_step3_details(
    parsed: &ParsedDecimalInput,
    format: &FormatSpec,
    category: ValueCategory,
    biased_exp_u32: u32,
    fraction_u64: u64,
) -> (
    IntegerConversionDetail,
    FractionConversionDetail,
    Vec<u8>,
    bool,
) {
    if parsed.special_literal.is_some() {
        let int_detail = IntegerConversionDetail {
            decimal_integer: "N/A".to_string(),
            binary_string: "N/A".to_string(),
            rows: vec![],
            total_divisions: 0,
            truncated_table: false,
            reading_order_note: "Special non-finite IEEE 754 values bypass integer division.".to_string(),
            explanation: format!(
                "{} is a special non-finite IEEE 754 value encoded directly via reserved exponent bits (all 1s).",
                category.label()
            ),
        };
        let frac_detail = FractionConversionDetail {
            decimal_fraction: "N/A".to_string(),
            binary_string: "N/A".to_string(),
            rows: vec![],
            total_steps_computed: 0,
            terminates: true,
            is_repeating: false,
            repeat_cycle_start_step: None,
            truncated_table: false,
            explanation: "Special non-finite values use the fraction field to distinguish Infinity (all 0s) from NaN (non-zero)."
                .to_string(),
        };
        return (int_detail, frac_detail, vec![], false);
    }

    if parsed.is_extreme_exponent {
        // For extreme scientific notation (e.g., 1.7976931348623157e308 or 5e-324),
        // convert the mantissa's integer/fraction for educational preview and explain the 10^k scaling.
        let mut int_detail = convert_integer_part(&parsed.mantissa_integer_digits, 16);
        int_detail.explanation = format!(
            "Input uses extreme scientific notation ({} × 10^{}). Converting mantissa integer {}₁₀ gives {}₂, which is then scaled by 10^{} during binary normalization.",
            parsed.validation.trimmed_input,
            parsed.base10_exponent,
            parsed.mantissa_integer_digits,
            int_detail.binary_string,
            parsed.base10_exponent
        );

        let (mut frac_detail, bits, has_rem) =
            convert_fraction_part(&parsed.mantissa_fraction_digits, 64, 16);
        frac_detail.explanation = format!(
            "Converting the mantissa fractional part 0.{}₁₀ by repeated multiplication by 2, before applying the 10^{} scientific scaling.",
            if parsed.mantissa_fraction_digits.is_empty() {
                "0"
            } else {
                &parsed.mantissa_fraction_digits
            },
            parsed.base10_exponent
        );
        let _ = (format, biased_exp_u32, fraction_u64);
        return (int_detail, frac_detail, bits, has_rem);
    }

    let int_detail = convert_integer_part(&parsed.expanded_integer_digits, 32);

    // Determine how many fractional bits to compute so we capture the leading 1 (if integer part is 0),
    // all fraction field bits (23 or 52), and Guard/Round/Sticky bits.
    let max_bits = if parsed.expanded_integer_digits == "0" {
        260
    } else {
        format.fraction_bits + 16
    };

    let (mut frac_detail, bits, has_rem) =
        convert_fraction_part(&parsed.expanded_fraction_digits, max_bits, 20);

    // If the fraction starts with many leading zeros (e.g., 1.4e-45 where the first 1 is at step 149),
    // include the rows around the first '1' bit so the user can see where the non-zero bits emerge.
    if parsed.expanded_integer_digits == "0" && bits.len() > 20 {
        if let Some(first_one_pos) = bits.iter().position(|&b| b == 1) {
            if first_one_pos >= 16 {
                frac_detail.truncated_table = true;
                let step_num = first_one_pos + 1;
                frac_detail.rows.push(FractionMultRow {
                    step: step_num,
                    fraction_before: format!("(after {} leading 0 bits)", first_one_pos),
                    multiplied_result: "1.xxx...".to_string(),
                    expression: format!("Step {step_num}: first non-zero integer bit reached (2⁻{step_num})"),
                    integer_bit: 1,
                    remaining_fraction: "...".to_string(),
                    note: Some(format!(
                        "First '1' bit appears at fractional bit position {step_num}"
                    )),
                });
            }
        }
    }

    (int_detail, frac_detail, bits, has_rem)
}

fn build_step4_normalization(
    parsed: &ParsedDecimalInput,
    format: &FormatSpec,
    category: ValueCategory,
    biased_exp_u32: u32,
    fraction_u64: u64,
    step3_int: &IntegerConversionDetail,
    raw_frac_bits: &[u8],
) -> NormalizationDetail {
    match category {
        ValueCategory::PositiveZero | ValueCategory::NegativeZero => NormalizationDetail {
            unnormalized_binary: "0.0".to_string(),
            normalized_significand: "0.0".to_string(),
            normalized_expression: "0.0₂ × 2⁰ (Special Zero Encoding)".to_string(),
            unbiased_exponent: 0,
            shift_direction: "none".to_string(),
            shift_amount: 0,
            implicit_leading_bit: "0".to_string(),
            is_hidden_bit_stored: false,
            is_subnormal: false,
            is_zero: true,
            is_special: false,
            explanation: "Zero has no leading '1' bit and cannot be normalized into 1.xxxxx × 2^e form. IEEE 754 encodes both +0 and -0 using all zeros in the exponent and fraction fields.".to_string(),
        },
        ValueCategory::UnderflowToZero => NormalizationDetail {
            unnormalized_binary: format!("≈ {}₁₀", parsed.validation.trimmed_input),
            normalized_significand: "0.0".to_string(),
            normalized_expression: format!(
                "0.0₂ × 2^({}) (Underflow to Zero)",
                format.min_normal_exponent
            ),
            unbiased_exponent: 0,
            shift_direction: "right".to_string(),
            shift_amount: (format.bias as usize) + format.fraction_bits,
            implicit_leading_bit: "0".to_string(),
            is_hidden_bit_stored: false,
            is_subnormal: false,
            is_zero: true,
            is_special: false,
            explanation: format!(
                "The magnitude of {}₁₀ is smaller than half the minimum positive subnormal value of {} (2⁻{}), so IEEE 754 round-to-nearest underflows the value to signed zero.",
                parsed.validation.trimmed_input,
                format.standard_name,
                (format.bias - 1) + (format.fraction_bits as i32)
            ),
        },
        ValueCategory::PositiveInfinity | ValueCategory::NegativeInfinity | ValueCategory::NaN => {
            NormalizationDetail {
                unnormalized_binary: category.label().to_string(),
                normalized_significand: "N/A".to_string(),
                normalized_expression: category.label().to_string(),
                unbiased_exponent: format.max_normal_exponent + 1,
                shift_direction: "none".to_string(),
                shift_amount: 0,
                implicit_leading_bit: "N/A".to_string(),
                is_hidden_bit_stored: false,
                is_subnormal: false,
                is_zero: false,
                is_special: true,
                explanation: format!(
                    "{} is a special IEEE 754 value and does not use normalized 1.xxxxx × 2^e representation.",
                    category.label()
                ),
            }
        }
        ValueCategory::OverflowToInfinity => NormalizationDetail {
            unnormalized_binary: if parsed.is_extreme_exponent {
                format!("{}₁₀", parsed.validation.trimmed_input)
            } else {
                format!("{}.0₂", step3_int.binary_string)
            },
            normalized_significand: "Overflows max finite significand".to_string(),
            normalized_expression: format!(
                "Exponent > {} (Overflows {} to {}Infinity)",
                format.max_normal_exponent,
                format.standard_name,
                if parsed.is_negative { "-" } else { "+" }
            ),
            unbiased_exponent: format.max_normal_exponent + 1,
            shift_direction: "left".to_string(),
            shift_amount: (format.max_normal_exponent + 1) as usize,
            implicit_leading_bit: "N/A".to_string(),
            is_hidden_bit_stored: false,
            is_subnormal: false,
            is_zero: false,
            is_special: true,
            explanation: format!(
                "The input magnitude exceeds the maximum finite value representable in {} (unbiased exponent > {}), causing overflow to {}Infinity.",
                format.standard_name,
                format.max_normal_exponent,
                if parsed.is_negative { "-" } else { "+" }
            ),
        },
        ValueCategory::Subnormal => {
            let eff_exp = format.min_normal_exponent;
            let frac_bin = format!("{:0width$b}", fraction_u64, width = format.fraction_bits);
            let trimmed_frac = frac_bin.trim_end_matches('0');
            let sig_display = format!(
                "0.{}",
                if trimmed_frac.is_empty() { "0" } else { trimmed_frac }
            );
            let shift_amt = (-eff_exp) as usize;
            NormalizationDetail {
                unnormalized_binary: format!("0.{}...₂", "0".repeat(shift_amt.min(12))),
                normalized_significand: sig_display.clone(),
                normalized_expression: format!("{sig_display}₂ × 2^({eff_exp})"),
                unbiased_exponent: eff_exp,
                shift_direction: "right".to_string(),
                shift_amount: shift_amt,
                implicit_leading_bit: "0".to_string(),
                is_hidden_bit_stored: false,
                is_subnormal: true,
                is_zero: false,
                is_special: false,
                explanation: format!(
                    "Because the first '1' bit lies beyond 2^({eff_exp}), this value is subnormal (denormalized). Instead of normalizing to 1.xxxxx, IEEE 754 fixes the effective exponent at {eff_exp} (encoded biased exponent = 0) and uses a leading 0 ({sig_display}₂ × 2^({eff_exp}))."
                ),
            }
        }
        ValueCategory::Normal => {
            let auth_unbiased_exp = (biased_exp_u32 as i32) - format.bias;

            if parsed.is_extreme_exponent {
                let frac_bin = format!("{:0width$b}", fraction_u64, width = format.fraction_bits);
                let trimmed_frac = frac_bin.trim_end_matches('0');
                let sig = format!(
                    "1.{}",
                    if trimmed_frac.is_empty() { "0" } else { trimmed_frac }
                );
                let dir = if auth_unbiased_exp > 0 {
                    "left"
                } else if auth_unbiased_exp < 0 {
                    "right"
                } else {
                    "none"
                };
                return NormalizationDetail {
                    unnormalized_binary: format!("{}₁₀", parsed.validation.trimmed_input),
                    normalized_significand: sig.clone(),
                    normalized_expression: format!("{sig}₂ × 2^{auth_unbiased_exp}"),
                    unbiased_exponent: auth_unbiased_exp,
                    shift_direction: dir.to_string(),
                    shift_amount: auth_unbiased_exp.unsigned_abs() as usize,
                    implicit_leading_bit: "1".to_string(),
                    is_hidden_bit_stored: true,
                    is_subnormal: false,
                    is_zero: false,
                    is_special: false,
                    explanation: format!(
                        "In normalized binary scientific notation, the binary point is positioned immediately after the first non-zero bit: {sig}₂ × 2^{auth_unbiased_exp}. The unbiased exponent is {auth_unbiased_exp}."
                    ),
                };
            }

            // Build unnormalized and normalized strings directly from Step 3 integer & fraction bits
            let frac_preview: String = raw_frac_bits
                .iter()
                .take(28)
                .map(|&b| if b == 1 { '1' } else { '0' })
                .collect();
            let frac_trimmed = frac_preview.trim_end_matches('0');
            let frac_part_display = if frac_trimmed.is_empty() {
                "0"
            } else {
                frac_trimmed
            };

            let unnormalized = if step3_int.binary_string.len() > 36 {
                format!(
                    "{}...{}.{}₂",
                    &step3_int.binary_string[..16],
                    &step3_int.binary_string[step3_int.binary_string.len() - 8..],
                    frac_part_display
                )
            } else {
                format!("{}.{}₂", step3_int.binary_string, frac_part_display)
            };

            let (sig_str, exp_from_bits, dir, shift_amt) = if step3_int.binary_string != "0" {
                let int_len = step3_int.binary_string.len();
                let shift = int_len - 1;
                let after_first = &step3_int.binary_string[1..];
                let combined_after = format!("{after_first}{frac_preview}");
                let trimmed_after = combined_after.trim_end_matches('0');
                let sig = format!(
                    "1.{}",
                    if trimmed_after.is_empty() {
                        "0"
                    } else if trimmed_after.len() > 28 {
                        &trimmed_after[..28]
                    } else {
                        trimmed_after
                    }
                );
                let direction = if shift == 0 { "none" } else { "left" };
                (sig, shift as i32, direction, shift)
            } else {
                let first_one = raw_frac_bits.iter().position(|&b| b == 1).unwrap_or(0);
                let shift = first_one + 1;
                let after_slice = if first_one + 1 < raw_frac_bits.len() {
                    &raw_frac_bits[first_one + 1..]
                } else {
                    &[]
                };
                let after_str: String = after_slice
                    .iter()
                    .take(28)
                    .map(|&b| if b == 1 { '1' } else { '0' })
                    .collect();
                let trimmed_after = after_str.trim_end_matches('0');
                let sig = format!(
                    "1.{}",
                    if trimmed_after.is_empty() {
                        "0"
                    } else {
                        trimmed_after
                    }
                );
                (sig, -(shift as i32), "right", shift)
            };

            let carry_note = if exp_from_bits != auth_unbiased_exp {
                format!(
                    " (Note: subsequent IEEE 754 rounding carries into the leading bit, incrementing the final unbiased exponent from {exp_from_bits} to {auth_unbiased_exp}.)"
                )
            } else {
                String::new()
            };

            let move_desc = match dir {
                "left" => format!("moving the binary point {shift_amt} place(s) to the left"),
                "right" => format!("moving the binary point {shift_amt} place(s) to the right"),
                _ => "keeping the binary point in place (shift = 0)".to_string(),
            };

            NormalizationDetail {
                unnormalized_binary: unnormalized.trim_end_matches('₂').to_string(),
                normalized_significand: sig_str.clone(),
                normalized_expression: format!("{sig_str}₂ × 2^{auth_unbiased_exp}"),
                unbiased_exponent: auth_unbiased_exp,
                shift_direction: dir.to_string(),
                shift_amount: shift_amt,
                implicit_leading_bit: "1".to_string(),
                is_hidden_bit_stored: true,
                is_subnormal: false,
                is_zero: false,
                is_special: false,
                explanation: format!(
                    "Normalize {} by {} so that a single non-zero bit '1' precedes the binary point: {}₂ × 2^{}. The leading '1' is the implicit (hidden) bit and is not stored in the fraction field.{}",
                    unnormalized, move_desc, sig_str, exp_from_bits, carry_note
                ),
            }
        }
    }
}

fn build_step5_biased_exponent(
    format: &FormatSpec,
    category: ValueCategory,
    biased_exp_u32: u32,
    step4: &NormalizationDetail,
) -> BiasedExponentDetail {
    let bias_derivation_formula = format!(
        "Bias = 2^({} - 1) - 1 = {}",
        format.exponent_bits, format.bias
    );
    let biased_exponent_formula = "Biased Exponent = Unbiased Exponent + Bias".to_string();
    let (biased_bin, division_rows) =
        convert_u32_to_binary_rows(biased_exp_u32, format.exponent_bits);

    match category {
        ValueCategory::PositiveZero | ValueCategory::NegativeZero | ValueCategory::UnderflowToZero => {
            BiasedExponentDetail {
                unbiased_exponent: 0,
                bias: format.bias,
                exponent_bits_count: format.exponent_bits,
                bias_derivation_formula,
                biased_exponent_formula: "Special Zero Rule → Biased Exponent = 0".to_string(),
                populated_formula: format!("0₁₀ = {biased_bin}₂ (reserved all-zero exponent)"),
                biased_exponent_decimal: 0,
                biased_exponent_binary: biased_bin.clone(),
                division_rows,
                is_special_exponent: true,
                special_exponent_meaning: Some(
                    "All-zero exponent field with all-zero fraction represents ±0.".to_string(),
                ),
                explanation: format!(
                    "For zero in {}, the {} exponent bits are reserved as all zeros ({biased_bin}₂ = 0₁₀) rather than adding the bias {}.",
                    format.standard_name, format.exponent_bits, format.bias
                ),
            }
        }
        ValueCategory::Subnormal => BiasedExponentDetail {
            unbiased_exponent: format.min_normal_exponent,
            bias: format.bias,
            exponent_bits_count: format.exponent_bits,
            bias_derivation_formula,
            biased_exponent_formula:
                "Subnormal Rule → Encoded Biased Exponent = 0 (Effective Exponent = 1 - Bias)"
                    .to_string(),
            populated_formula: format!(
                "Effective Exponent = 1 - {} = {}, Encoded Exponent Field = 0₁₀ ({biased_bin}₂)",
                format.bias, format.min_normal_exponent
            ),
            biased_exponent_decimal: 0,
            biased_exponent_binary: biased_bin.clone(),
            division_rows,
            is_special_exponent: true,
            special_exponent_meaning: Some(format!(
                "Encoded exponent 0 with non-zero fraction indicates a subnormal number with effective exponent {}.",
                format.min_normal_exponent
            )),
            explanation: format!(
                "Subnormal numbers in {} use an encoded biased exponent of 0 ({biased_bin}₂). Their effective unbiased exponent is fixed at 1 - Bias = 1 - {} = {}.",
                format.standard_name, format.bias, format.min_normal_exponent
            ),
        },
        ValueCategory::PositiveInfinity
        | ValueCategory::NegativeInfinity
        | ValueCategory::OverflowToInfinity
        | ValueCategory::NaN => BiasedExponentDetail {
            unbiased_exponent: format.max_normal_exponent + 1,
            bias: format.bias,
            exponent_bits_count: format.exponent_bits,
            bias_derivation_formula,
            biased_exponent_formula: format!(
                "Special All-Ones Exponent = 2^{} - 1 = {}",
                format.exponent_bits, biased_exp_u32
            ),
            populated_formula: format!("{biased_exp_u32}₁₀ = {biased_bin}₂ (all 1s reserved for ±∞ and NaN)"),
            biased_exponent_decimal: biased_exp_u32,
            biased_exponent_binary: biased_bin.clone(),
            division_rows,
            is_special_exponent: true,
            special_exponent_meaning: Some(
                "All-ones exponent field is reserved for Infinity (fraction = 0) and NaN (fraction ≠ 0)."
                    .to_string(),
            ),
            explanation: format!(
                "{} uses the maximum reserved biased exponent {}₁₀ ({biased_bin}₂, all {} bits set to 1).",
                category.label(),
                biased_exp_u32,
                format.exponent_bits
            ),
        },
        ValueCategory::Normal => {
            let e = step4.unbiased_exponent;
            let bias = format.bias;
            let populated = format!("Biased Exponent = {e} + {bias} = {biased_exp_u32}");
            BiasedExponentDetail {
                unbiased_exponent: e,
                bias,
                exponent_bits_count: format.exponent_bits,
                bias_derivation_formula,
                biased_exponent_formula,
                populated_formula: populated,
                biased_exponent_decimal: biased_exp_u32,
                biased_exponent_binary: biased_bin.clone(),
                division_rows,
                is_special_exponent: false,
                special_exponent_meaning: None,
                explanation: format!(
                    "Add the {} bias ({bias}) to the unbiased exponent ({e}): {e} + {bias} = {biased_exp_u32}₁₀. Converting {biased_exp_u32}₁₀ to an {}-bit binary number by repeated division by 2 yields {biased_bin}₂.",
                    format.name, format.exponent_bits
                ),
            }
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn build_step6_fraction_field(
    parsed: &ParsedDecimalInput,
    format: &FormatSpec,
    category: ValueCategory,
    biased_exp_u32: u32,
    fraction_u64: u64,
    final_fraction_bits: &str,
    step3_int: &IntegerConversionDetail,
    step3_frac: &FractionConversionDetail,
    raw_frac_bits: &[u8],
    has_more_frac_rem: bool,
    step4: &NormalizationDetail,
) -> (FractionFieldDetail, bool) {
    let f_len = format.fraction_bits;

    if category != ValueCategory::Normal && category != ValueCategory::Subnormal {
        let explanation = match category {
            ValueCategory::PositiveZero | ValueCategory::NegativeZero => format!(
                "For ±0, all {f_len} bits of the fraction field are 0."
            ),
            ValueCategory::UnderflowToZero => format!(
                "Because the input underflowed below the smallest representable subnormal value, all {f_len} bits of the fraction field are rounded to 0."
            ),
            ValueCategory::PositiveInfinity
            | ValueCategory::NegativeInfinity
            | ValueCategory::OverflowToInfinity => format!(
                "For Infinity, all {f_len} bits of the fraction field must be 0 (any non-zero bit with an all-ones exponent would represent NaN instead)."
            ),
            ValueCategory::NaN => format!(
                "For Quiet NaN, the most significant bit of the {f_len}-bit fraction field is set to 1 so the fraction field is non-zero."
            ),
            _ => String::new(),
        };
        return (
            FractionFieldDetail {
                significand_before_encoding: step4.normalized_significand.clone(),
                hidden_leading_bit: step4.implicit_leading_bit.clone(),
                raw_fraction_bits: final_fraction_bits.to_string(),
                final_fraction_bits: final_fraction_bits.to_string(),
                target_bit_length: f_len,
                stored_from_input_count: 0,
                padded_zeros_count: f_len,
                guard_bit: None,
                round_bit: None,
                sticky_bit: None,
                extra_bits_preview: String::new(),
                rounding_mode: "IEEE 754 Round to Nearest, Ties to Even".to_string(),
                rounding_occurred: category == ValueCategory::UnderflowToZero
                    || category == ValueCategory::OverflowToInfinity,
                rounding_direction: if category == ValueCategory::UnderflowToZero {
                    "down".to_string()
                } else if category == ValueCategory::OverflowToInfinity {
                    "up".to_string()
                } else {
                    "none".to_string()
                },
                carry_into_exponent: false,
                explanation,
            },
            true,
        );
    }

    if parsed.is_extreme_exponent {
        let explanation = format!(
            "The leading '{}' bit is {}stored, leaving exactly {f_len} fraction bits ({final_fraction_bits}₂) determined by IEEE 754 round-to-nearest, ties-to-even.",
            step4.implicit_leading_bit,
            if step4.is_hidden_bit_stored { "not " } else { "" }
        );
        return (
            FractionFieldDetail {
                significand_before_encoding: step4.normalized_significand.clone(),
                hidden_leading_bit: step4.implicit_leading_bit.clone(),
                raw_fraction_bits: final_fraction_bits.to_string(),
                final_fraction_bits: final_fraction_bits.to_string(),
                target_bit_length: f_len,
                stored_from_input_count: f_len,
                padded_zeros_count: 0,
                guard_bit: None,
                round_bit: None,
                sticky_bit: None,
                extra_bits_preview: String::new(),
                rounding_mode: "IEEE 754 Round to Nearest, Ties to Even".to_string(),
                rounding_occurred: true,
                rounding_direction: "nearest".to_string(),
                carry_into_exponent: false,
                explanation,
            },
            true,
        );
    }

    // Build exact bit stream after the binary point of the normalized (or subnormal) significand
    let mut stream_after_point: Vec<u8> = Vec::new();
    let mut exact_input_bits_count = 0usize;

    if category == ValueCategory::Subnormal {
        let shift = (-format.min_normal_exponent) as usize; // 126 or 1022
        if shift < raw_frac_bits.len() {
            stream_after_point.extend_from_slice(&raw_frac_bits[shift..]);
            exact_input_bits_count = stream_after_point.len().min(f_len);
        }
    } else if step3_int.binary_string != "0" {
        for ch in step3_int.binary_string[1..].chars() {
            stream_after_point.push(if ch == '1' { 1 } else { 0 });
        }
        let int_after_count = stream_after_point.len();
        let frac_meaningful_count = if step3_frac.terminates && parsed.expanded_fraction_digits.is_empty() {
            0
        } else {
            raw_frac_bits.len()
        };
        exact_input_bits_count = (int_after_count + frac_meaningful_count).min(f_len);
        stream_after_point.extend_from_slice(raw_frac_bits);
    } else if let Some(first_one) = raw_frac_bits.iter().position(|&b| b == 1) {
        if first_one + 1 < raw_frac_bits.len() {
            stream_after_point.extend_from_slice(&raw_frac_bits[first_one + 1..]);
            exact_input_bits_count = stream_after_point.len().min(f_len);
        }
    }

    let padded_zeros_count = if step3_frac.terminates && exact_input_bits_count < f_len {
        f_len - exact_input_bits_count
    } else {
        0
    };

    // Extract raw unrounded F bits, Guard bit (G), Round bit (R), Sticky bit (S)
    let mut raw_f_bits = Vec::with_capacity(f_len);
    for i in 0..f_len {
        raw_f_bits.push(stream_after_point.get(i).copied().unwrap_or(0));
    }
    let raw_fraction_str: String = raw_f_bits
        .iter()
        .map(|&b| if b == 1 { '1' } else { '0' })
        .collect();

    let g_bit = stream_after_point.get(f_len).copied().unwrap_or(0);
    let r_bit = stream_after_point.get(f_len + 1).copied().unwrap_or(0);
    let rest_has_one = stream_after_point
        .get(f_len + 2..)
        .map(|slice| slice.contains(&1))
        .unwrap_or(false);
    let s_bit = if rest_has_one || has_more_frac_rem {
        1u8
    } else {
        0u8
    };

    let lsb = *raw_f_bits.last().unwrap_or(&0);
    let should_round_up = g_bit == 1 && (r_bit == 1 || s_bit == 1 || lsb == 1);

    let mut raw_u64 = 0u64;
    for &b in &raw_f_bits {
        raw_u64 = (raw_u64 << 1) | (b as u64);
    }

    let frac_mask = (1u64 << f_len) - 1;
    let (edu_rounded_frac, carry_into_exponent) = if should_round_up {
        let incremented = raw_u64 + 1;
        if incremented > frac_mask {
            (0u64, true)
        } else {
            (incremented, false)
        }
    } else {
        (raw_u64, false)
    };

    let edu_verified = edu_rounded_frac == fraction_u64;
    let rounding_occurred = g_bit != 0 || r_bit != 0 || s_bit != 0 || raw_fraction_str != final_fraction_bits;
    let rounding_direction = if !rounding_occurred {
        "none".to_string()
    } else if should_round_up || fraction_u64 > raw_u64 || carry_into_exponent {
        "up".to_string()
    } else {
        "down".to_string()
    };

    let extra_bits_preview: String = stream_after_point
        .iter()
        .skip(f_len)
        .take(8)
        .map(|&b| if b == 1 { '1' } else { '0' })
        .collect();

    let hidden_desc = if category == ValueCategory::Subnormal {
        "For a subnormal number, there is no hidden leading '1' (the leading integer bit is 0).".to_string()
    } else {
        "Drop the implicit leading '1' before the binary point (it is assumed by hardware for all normal IEEE 754 numbers).".to_string()
    };

    let rounding_desc = if !rounding_occurred {
        if padded_zeros_count > 0 {
            format!(
                "The binary significand terminates after {exact_input_bits_count} fractional bit(s), so {padded_zeros_count} trailing zero(s) are appended to fill the {f_len}-bit fraction field exactly with no rounding error."
            )
        } else {
            format!(
                "The binary significand fits exactly into the {f_len}-bit fraction field with no discarded non-zero bits."
            )
        }
    } else {
        let action = if rounding_direction == "up" {
            if carry_into_exponent {
                "rounds UP by adding 1 to the LSB, which carries across all fraction bits into the exponent"
            } else {
                "rounds UP by adding 1 to the least significant bit (LSB)"
            }
        } else {
            "rounds DOWN (truncates extra bits)"
        };
        format!(
            "Beyond the {f_len} fraction bits, the next bits are Guard (G={g_bit}), Round (R={r_bit}), and Sticky (S={s_bit}). Under IEEE 754 round-to-nearest, ties-to-even, this {action}."
        )
    };

    let _ = biased_exp_u32;

    (
        FractionFieldDetail {
            significand_before_encoding: step4.normalized_significand.clone(),
            hidden_leading_bit: step4.implicit_leading_bit.clone(),
            raw_fraction_bits: raw_fraction_str,
            final_fraction_bits: final_fraction_bits.to_string(),
            target_bit_length: f_len,
            stored_from_input_count: exact_input_bits_count,
            padded_zeros_count,
            guard_bit: Some(g_bit),
            round_bit: Some(r_bit),
            sticky_bit: Some(s_bit),
            extra_bits_preview,
            rounding_mode: "IEEE 754 Round to Nearest, Ties to Even".to_string(),
            rounding_occurred,
            rounding_direction,
            carry_into_exponent,
            explanation: format!("{hidden_desc} {rounding_desc}"),
        },
        edu_verified,
    )
}

fn build_step7_assembly(
    format: &FormatSpec,
    sign_bit: u8,
    biased_exp_u32: u32,
    exponent_bits: &str,
    fraction_bits: &str,
    complete_bit_pattern: &str,
) -> BitAssemblyDetail {
    let addition_formula = format!(
        "1 (Sign) + {} (Biased Exponent) + {} (Fraction) = {} bits",
        format.exponent_bits, format.fraction_bits, format.total_bits
    );

    let nibbles_grouped: Vec<String> = complete_bit_pattern
        .as_bytes()
        .chunks(4)
        .map(|c| std::str::from_utf8(c).unwrap_or("").to_string())
        .collect();

    let sign_segment = BitFieldSegment {
        field_name: "Sign Field".to_string(),
        short_label: "SIGN".to_string(),
        bit_count: 1,
        start_bit_index: format.total_bits - 1,
        end_bit_index: format.total_bits - 1,
        bits: sign_bit.to_string(),
        decimal_value: format!(
            "{} ({})",
            sign_bit,
            if sign_bit == 0 {
                "Positive / +"
            } else {
                "Negative / -"
            }
        ),
        role_description: "Determines the algebraic sign of the floating-point number: 0 for positive (+), 1 for negative (-).".to_string(),
    };

    let exponent_segment = BitFieldSegment {
        field_name: "Biased Exponent Field".to_string(),
        short_label: "EXPONENT".to_string(),
        bit_count: format.exponent_bits,
        start_bit_index: format.total_bits - 2,
        end_bit_index: format.fraction_bits,
        bits: exponent_bits.to_string(),
        decimal_value: format!(
            "{}₁₀ (Bias = {})",
            biased_exp_u32, format.bias
        ),
        role_description: format!(
            "Encodes the magnitude scale (2^e) as an unsigned {}-bit integer offset by Bias {}. All 0s indicates ±0 or subnormal; all 1s indicates ±∞ or NaN.",
            format.exponent_bits, format.bias
        ),
    };

    let fraction_segment = BitFieldSegment {
        field_name: "Fraction Field (Significand / Mantissa)".to_string(),
        short_label: "FRACTION".to_string(),
        bit_count: format.fraction_bits,
        start_bit_index: format.fraction_bits - 1,
        end_bit_index: 0,
        bits: fraction_bits.to_string(),
        decimal_value: format!("{} trailing significand bits", format.fraction_bits),
        role_description: format!(
            "Stores the {} fractional bits after the binary point. For normal numbers, an implicit leading '1.' is assumed before these bits; for subnormal numbers, '0.' is used.",
            format.fraction_bits
        ),
    };

    BitAssemblyDetail {
        total_bits: format.total_bits,
        addition_formula,
        complete_bit_pattern: complete_bit_pattern.to_string(),
        nibbles_grouped,
        sign_segment,
        exponent_segment,
        fraction_segment,
        explanation: format!(
            "Concatenate the 1-bit Sign ({sign_bit}), the {}-bit Biased Exponent ({exponent_bits}), and the {}-bit Fraction ({fraction_bits}) in order from Most Significant Bit (bit {}) down to Least Significant Bit (bit 0) to form the complete {}-bit IEEE 754 word.",
            format.exponent_bits,
            format.fraction_bits,
            format.total_bits - 1,
            format.total_bits
        ),
    }
}

fn build_step8_hex_rows(format: &FormatSpec, complete_bit_pattern: &str) -> Vec<NibbleHexRow> {
    let total = format.total_bits;
    let exp_end_idx = 1 + format.exponent_bits; // 0-indexed from MSB: 0 is sign, 1..exp_end_idx is exponent

    complete_bit_pattern
        .as_bytes()
        .chunks(4)
        .enumerate()
        .map(|(i, chunk)| {
            let bin_str = std::str::from_utf8(chunk).unwrap_or("0000").to_string();
            let val = u8::from_str_radix(&bin_str, 2).unwrap_or(0);
            let msb_bit = total - 1 - (i * 4);
            let lsb_bit = total - 4 - (i * 4);
            let start_pos = i * 4;
            let end_pos = start_pos + 4; // exclusive

            let mut fields = Vec::new();
            if start_pos == 0 {
                fields.push("Sign");
            }
            if start_pos < exp_end_idx && end_pos > 1 {
                fields.push("Exponent");
            }
            if end_pos > exp_end_idx {
                fields.push("Fraction");
            }

            NibbleHexRow {
                group_index: i + 1,
                bit_range: format!("Bits {msb_bit}..{lsb_bit}"),
                binary_group: bin_str,
                decimal_value: val,
                hex_digit: format!("{val:X}"),
                spanning_fields: fields.join(" + "),
            }
        })
        .collect()
}

#[allow(clippy::too_many_arguments)]
fn build_step9_interpretation(
    parsed: &ParsedDecimalInput,
    format: &FormatSpec,
    category: ValueCategory,
    sign_bit: u8,
    biased_exp_u32: u32,
    fraction_u64: u64,
    exponent_bits: &str,
    fraction_bits: &str,
    complete_bit_pattern: &str,
    hexadecimal: &str,
    represented_short: &str,
    f64_approx: f64,
    step4: &NormalizationDetail,
    step6: &FractionFieldDetail,
    edu_verified: bool,
) -> FinalInterpretation {
    let sign_symbol = if sign_bit == 1 { "-" } else { "+" }.to_string();

    if category.is_special() || category.is_zero() {
        let is_exact = matches!(
            category,
            ValueCategory::PositiveZero
                | ValueCategory::NegativeZero
                | ValueCategory::PositiveInfinity
                | ValueCategory::NegativeInfinity
                | ValueCategory::NaN
        );
        let (exact_str, err_str, explanation, formula) = match category {
            ValueCategory::PositiveZero => (
                "0".to_string(),
                "0 (Exact)".to_string(),
                "Positive zero (+0) is represented exactly in IEEE 754 with sign bit 0 and all exponent/fraction bits set to 0.".to_string(),
                "(-1)⁰ × 0 = +0".to_string(),
            ),
            ValueCategory::NegativeZero => (
                "-0".to_string(),
                "0 (Exact)".to_string(),
                "Negative zero (-0) is represented exactly in IEEE 754 with sign bit 1 and all exponent/fraction bits set to 0.".to_string(),
                "(-1)¹ × 0 = -0".to_string(),
            ),
            ValueCategory::UnderflowToZero => (
                if sign_bit == 1 { "-0".to_string() } else { "0".to_string() },
                format!("≈ {} (Complete underflow to zero)", parsed.validation.trimmed_input),
                format!(
                    "The input {}₁₀ is non-zero, but its magnitude is smaller than the minimum representable subnormal step of {} (2⁻{}), so it underflows to {}0.",
                    parsed.validation.trimmed_input,
                    format.standard_name,
                    (format.bias - 1) + (format.fraction_bits as i32),
                    if sign_bit == 1 { "-" } else { "+" }
                ),
                format!("Underflow → {}0", if sign_bit == 1 { "-" } else { "+" }),
            ),
            ValueCategory::OverflowToInfinity => (
                if sign_bit == 1 { "-Infinity".to_string() } else { "+Infinity".to_string() },
                "∞ (Overflowed finite range)".to_string(),
                format!(
                    "The finite input {}₁₀ exceeds the largest finite value representable in {}, overflowing to {}Infinity ({hexadecimal}).",
                    parsed.validation.trimmed_input,
                    format.standard_name,
                    if sign_bit == 1 { "-" } else { "+" }
                ),
                format!("Overflow → {}∞", if sign_bit == 1 { "-" } else { "+" }),
            ),
            ValueCategory::PositiveInfinity | ValueCategory::NegativeInfinity => (
                represented_short.to_string(),
                "0 (Exact special representation)".to_string(),
                format!("{} is encoded directly using all 1s in the exponent field and all 0s in the fraction field.", category.label()),
                format!("(-1)^{sign_bit} × ∞"),
            ),
            ValueCategory::NaN => (
                "NaN".to_string(),
                "N/A (Not a Number)".to_string(),
                "Quiet NaN is encoded with all 1s in the exponent field and a non-zero fraction payload.".to_string(),
                "NaN (Exponent = all 1s, Fraction ≠ 0)".to_string(),
            ),
            _ => unreachable!(),
        };

        return FinalInterpretation {
            original_input: parsed.validation.trimmed_input.clone(),
            precision_name: format!("{} ({})", format.name, format.standard_name),
            category_label: category.label().to_string(),
            sign_bit: sign_bit.to_string(),
            sign_symbol,
            exponent_field_binary: exponent_bits.to_string(),
            biased_exponent_decimal: biased_exp_u32,
            unbiased_exponent_decimal: step4.unbiased_exponent,
            fraction_field_binary: fraction_bits.to_string(),
            complete_bit_pattern: complete_bit_pattern.to_string(),
            hexadecimal: hexadecimal.to_string(),
            represented_decimal_short: represented_short.to_string(),
            represented_decimal_exact: exact_str,
            approximation_error: err_str,
            is_exact_representation: is_exact,
            rounding_occurred: !is_exact,
            binary_scientific_value: step4.normalized_expression.clone(),
            reconstruction_formula: formula,
            accuracy_explanation: explanation,
            verified_against_rust_primitive: edu_verified,
        };
    }

    // Normal or Subnormal finite non-zero number
    let unbiased_exp = step4.unbiased_exponent;
    let full_significand = if category == ValueCategory::Subnormal {
        fraction_u64
    } else {
        (1u64 << format.fraction_bits) | fraction_u64
    };

    let exact_decimal = exact_float_decimal_string(
        sign_bit,
        unbiased_exp,
        full_significand,
        format.fraction_bits,
        represented_short,
    );

    let is_exact = !step6.rounding_occurred && exact_decimal == parsed.validation.canonical_decimal;

    let approximation_error = if is_exact {
        "0 (Exact binary floating-point representation)".to_string()
    } else {
        let input_f64 = parsed.validation.trimmed_input.parse::<f64>().unwrap_or(f64_approx);
        let diff = (f64_approx - input_f64).abs();
        if diff > 0.0 && diff.is_finite() {
            format!("≈ {:.6e} (rounded to nearest {} bit pattern)", diff, format.standard_name)
        } else {
            format!(
                "Non-zero rounding difference beyond 64-bit float precision (exact stored value: {exact_decimal})"
            )
        }
    };

    let accuracy_explanation = if is_exact {
        format!(
            "The decimal number {}₁₀ can be written as a finite sum of powers of 2 that fits within the {}-bit significand of {}, so it is stored with 100% mathematical accuracy and zero rounding error.",
            parsed.validation.trimmed_input,
            format.fraction_bits + 1,
            format.standard_name
        )
    } else {
        format!(
            "The decimal number {}₁₀ cannot be represented exactly in {} bits. In binary, its expansion either repeats indefinitely (like 0.1₁₀) or requires more than {} fraction bits. IEEE 754 rounds it to the nearest representable value: {}₁₀.",
            parsed.validation.trimmed_input,
            format.total_bits,
            format.fraction_bits,
            exact_decimal
        )
    };

    let lead_bit = if category == ValueCategory::Subnormal { "0" } else { "1" };
    let reconstruction_formula = format!(
        "(-1)^{sign_bit} × ({lead_bit}.{}₂) × 2^({unbiased_exp}) = {exact_decimal}₁₀",
        fraction_bits.trim_end_matches('0')
    );

    FinalInterpretation {
        original_input: parsed.validation.trimmed_input.clone(),
        precision_name: format!("{} ({})", format.name, format.standard_name),
        category_label: category.label().to_string(),
        sign_bit: sign_bit.to_string(),
        sign_symbol,
        exponent_field_binary: exponent_bits.to_string(),
        biased_exponent_decimal: biased_exp_u32,
        unbiased_exponent_decimal: unbiased_exp,
        fraction_field_binary: fraction_bits.to_string(),
        complete_bit_pattern: complete_bit_pattern.to_string(),
        hexadecimal: hexadecimal.to_string(),
        represented_decimal_short: represented_short.to_string(),
        represented_decimal_exact: exact_decimal,
        approximation_error,
        is_exact_representation: is_exact,
        rounding_occurred: !is_exact,
        binary_scientific_value: step4.normalized_expression.clone(),
        reconstruction_formula,
        accuracy_explanation,
        verified_against_rust_primitive: edu_verified,
    }
}

#[allow(clippy::too_many_arguments)]
fn build_nine_steps(
    parsed: &ParsedDecimalInput,
    format: &FormatSpec,
    category: ValueCategory,
    sign_bit: u8,
    exponent_bits: &str,
    fraction_bits: &str,
    complete_bit_pattern: &str,
    hexadecimal: &str,
    step3_int: &IntegerConversionDetail,
    step3_frac: &FractionConversionDetail,
    step4: &NormalizationDetail,
    step5: &BiasedExponentDetail,
    step6: &FractionFieldDetail,
    step8_hex: &[NibbleHexRow],
    step9: &FinalInterpretation,
) -> Vec<ConversionStep> {
    let raw_in = &parsed.validation.trimmed_input;

    let polarity_eval = if parsed.validation.preserves_negative_zero {
        "x = -0 (Signed Negative Zero)  ⟹  Sign = 1"
    } else if sign_bit == 1 {
        "x < 0 (Negative Value)  ⟹  Sign = 1"
    } else {
        "x ≥ +0 (Positive / Non-Negative Value)  ⟹  Sign = 0"
    };

    vec![
        ConversionStep {
            step_number: 1,
            title: "Input Analysis".to_string(),
            subtitle: format!("{} ({}) Bit-Field Layout & Parameters", format.name, format.standard_name),
            concise_explanation: format!(
                "• Input Decimal: {raw_in}\n• Target Format: {} ({} total bits)\n• Bit Allocation: {} Sign bit, {} Exponent bits, {} Fraction bits\n• Format Bias: Bias = {}",
                format.standard_name, format.total_bits, format.sign_bits, format.exponent_bits, format.fraction_bits, format.bias
            ),
            formula: "• Total Bits (N) = Sign (1) + Exponent (k) + Fraction (p)\n• Exponent Bias   = 2^(k - 1) - 1".to_string(),
            populated_formula: format!(
                "• Target Format:   {} ({})\n• Bit Allocation:  {} bits = 1 (Sign) + {} (Exponent) + {} (Fraction)\n• Format Bias:      Bias = 2^({} - 1) - 1 = {}",
                format.name, format.standard_name, format.total_bits, format.exponent_bits, format.fraction_bits, format.exponent_bits, format.bias
            ),
            calculated_result: format!(
                "{} — {} ({})",
                format.standard_name,
                category.label(),
                raw_in
            ),
            binary_visualization: Some(format!(
                "Sign ({}b) | Exponent ({}b) | Fraction ({}b)",
                format.sign_bits, format.exponent_bits, format.fraction_bits
            )),
            next_step_connection: "The bit-field layout and bias are established. Next, Step 2 determines the 1-bit Sign field.".to_string(),
        },
        ConversionStep {
            step_number: 2,
            title: "Determine the Sign Bit".to_string(),
            subtitle: "Bit [MSB] — Algebraic Sign Evaluation".to_string(),
            concise_explanation: if parsed.validation.preserves_negative_zero {
                "• Input is signed negative zero (-0) ⟹ Sign bit is set to 1.\n• Magnitude |x| = 0 is converted with zero exponent and zero fraction.".to_string()
            } else if sign_bit == 1 {
                format!(
                    "• Input is negative ({raw_in} < 0) ⟹ Sign bit is set to 1.\n• Absolute magnitude |{raw_in}| is converted in following steps."
                )
            } else {
                format!(
                    "• Input is non-negative ({raw_in} ≥ +0) ⟹ Sign bit is set to 0.\n• Positive magnitude is converted in following steps."
                )
            },
            formula: "Sign = { 0,  if x ≥ +0\n       { 1,  if x < 0  or  x = -0".to_string(),
            populated_formula: format!(
                "• Input Value: x = {raw_in}\n• Condition:   {polarity_eval}\n• Stored Bit:  Sign = {sign_bit} (Bit {})",
                format.total_bits - 1
            ),
            calculated_result: format!("Sign = {sign_bit} (Bit {})", format.total_bits - 1),
            binary_visualization: Some(sign_bit.to_string()),
            next_step_connection: "The sign is isolated in the MSB. Step 3 converts the unsigned magnitude |x| into binary.".to_string(),
        },
        ConversionStep {
            step_number: 3,
            title: "Convert Decimal to Binary".to_string(),
            subtitle: "Separate Integer Division by 2 & Fractional Multiplication by 2".to_string(),
            concise_explanation: format!(
                "• Integer Part:  {}₁₀ = {}₂ (repeated division by 2, read ↑ bottom-to-top)\n• Fraction Part: {}₁₀ = .{}₂ (repeated multiplication by 2, read ↓ top-to-bottom)",
                step3_int.decimal_integer, step3_int.binary_string, step3_frac.decimal_fraction, step3_frac.binary_string
            ),
            formula: "• Integer Part:   N ÷ 2  ⟹  Remainders read bottom-to-top (↑)\n• Fraction Part:  f × 2  ⟹  Integer bits read top-to-bottom (↓)".to_string(),
            populated_formula: format!(
                "• Integer:   {}₁₀ = {}₂\n• Fraction:  {}₁₀ = .{}₂\n• Combined:  |{}|₁₀ = {}.{}₂",
                step3_int.decimal_integer, step3_frac.decimal_fraction, step3_int.binary_string, step3_frac.binary_string, raw_in, step3_int.binary_string, step3_frac.binary_string
            ),
            calculated_result: format!(
                "{}.{}₂",
                step3_int.binary_string, step3_frac.binary_string
            ),
            binary_visualization: Some(format!(
                "{}.{}",
                step3_int.binary_string, step3_frac.binary_string
            )),
            next_step_connection: "This fixed-point binary value is normalized into scientific floating-point form in Step 4.".to_string(),
        },
        ConversionStep {
            step_number: 4,
            title: "Normalize the Binary Number".to_string(),
            subtitle: "Shift Binary Point to Form: 1.f₂ × 2^e".to_string(),
            concise_explanation: format!(
                "• Unnormalized Binary: {}₂\n• Normalized Scientific Form: {}\n• Implicit Leading Bit: '{}' (omitted from memory for normal numbers)\n• Unbiased Exponent: e = {}",
                step4.unnormalized_binary, step4.normalized_expression, step4.implicit_leading_bit, step4.unbiased_exponent
            ),
            formula: "• Normal Form:    |x|₂ = 1.f₂ × 2^e       (1 ≤ 1.f₂ < 2,  e = unbiased exponent)\n• Subnormal Form: |x|₂ = 0.f₂ × 2^(1 - Bias)  (implicit leading bit = 0)".to_string(),
            populated_formula: format!(
                "• Before Shift: {}₂\n• Normalized:   {}\n• Exponent e:   {} (shift: {} position(s) {})\n• Leading Bit:  '{}' (hidden bit)",
                step4.unnormalized_binary, step4.normalized_expression, step4.unbiased_exponent, step4.shift_amount, step4.shift_direction, step4.implicit_leading_bit
            ),
            calculated_result: format!(
                "e = {}, Significand = {}₂",
                step4.unbiased_exponent, step4.normalized_significand
            ),
            binary_visualization: Some(step4.normalized_expression.clone()),
            next_step_connection: format!(
                "Unbiased exponent e = {} is passed to Step 5 to compute the Biased Exponent field, while bits after the binary point proceed to Step 6.",
                step4.unbiased_exponent
            ),
        },
        ConversionStep {
            step_number: 5,
            title: "Calculate the Biased Exponent".to_string(),
            subtitle: format!("Add Bias ({}) to Unbiased Exponent (e = {})", format.bias, step4.unbiased_exponent),
            concise_explanation: format!(
                "• Formula: Biased Exponent (E) = e + Bias\n• Calculation: {} + {} = {}₁₀\n• Convert {}₁₀ to {}-bit binary ⟹ {}₂ (read ↑ bottom-to-top)",
                step4.unbiased_exponent, format.bias, step5.biased_exponent_decimal, step5.biased_exponent_decimal, format.exponent_bits, step5.biased_exponent_binary
            ),
            formula: "• Biased Exponent (E) = e + Bias\n• Bias Constant       = 2^(k - 1) - 1   (k = exponent bits)".to_string(),
            populated_formula: format!(
                "• Format Bias:    2^({} - 1) - 1 = {}\n• Decimal Exponent: E = {} + {} = {}₁₀\n• Binary Field:   {}₁₀ = {}₂ ({} bits)",
                format.exponent_bits, format.bias, step4.unbiased_exponent, format.bias, step5.biased_exponent_decimal, step5.biased_exponent_decimal, step5.biased_exponent_binary, format.exponent_bits
            ),
            calculated_result: format!(
                "E = {}₁₀ = {}₂ ({} bits)",
                step5.biased_exponent_decimal, step5.biased_exponent_binary, format.exponent_bits
            ),
            binary_visualization: Some(exponent_bits.to_string()),
            next_step_connection: format!(
                "The {}-bit biased exponent {}₂ is ready. Step 6 extracts and rounds the {}-bit Fraction field.",
                format.exponent_bits, exponent_bits, format.fraction_bits
            ),
        },
        ConversionStep {
            step_number: 6,
            title: "Determine the Fraction Field".to_string(),
            subtitle: format!("Extract Significand & Format to Exactly {} Bits", format.fraction_bits),
            concise_explanation: format!(
                "• Normalized Significand: {}\n• Implicit Bit: '{}' (omitted)\n• Stored Fraction: {}₂ ({} bits)\n• Rounding Status: {}",
                step6.significand_before_encoding, step6.hidden_leading_bit, step6.final_fraction_bits, format.fraction_bits,
                if step6.rounding_occurred {
                    format!("Rounded {} via IEEE 754 ties-to-even", step6.rounding_direction)
                } else {
                    format!("Exact representation ({} trailing zeros padded)", step6.padded_zeros_count)
                }
            ),
            formula: "• Significand:   1.f₂  ⟹  Fraction Field = f₂ (length = p bits)\n• Rounding Mode: IEEE 754 Round-to-Nearest, Ties-to-Even (Guard, Round, Sticky)".to_string(),
            populated_formula: format!(
                "• Significand:   {}\n• Fraction Bits: {}₂ ({} bits)\n• Evaluation:    {}",
                step6.significand_before_encoding, step6.final_fraction_bits, format.fraction_bits,
                if step6.rounding_occurred {
                    format!("Guard bit = {:?}, Round = {:?}, Sticky = {:?} ⟹ Rounded {}", step6.guard_bit, step6.round_bit, step6.sticky_bit, step6.rounding_direction)
                } else {
                    format!("Exact fraction ({} trailing zero bit(s) appended)", step6.padded_zeros_count)
                }
            ),
            calculated_result: format!("Fraction = {}₂ ({} bits)", step6.final_fraction_bits, format.fraction_bits),
            binary_visualization: Some(fraction_bits.to_string()),
            next_step_connection: "Sign, Biased Exponent, and Fraction fields are finalized. Step 7 concatenates them into the IEEE 754 bit pattern.".to_string(),
        },
        ConversionStep {
            step_number: 7,
            title: "Assemble the IEEE 754 Bit Pattern".to_string(),
            subtitle: format!("Combine 1 + {} + {} = {} Bits", format.exponent_bits, format.fraction_bits, format.total_bits),
            concise_explanation: format!(
                "• Sign Bit (1b):         {}\n• Biased Exponent ({}b): {}\n• Fraction Field ({}b):  {}\n• Total Pattern ({}b):   {}",
                sign_bit, format.exponent_bits, exponent_bits, format.fraction_bits, fraction_bits, format.total_bits, complete_bit_pattern
            ),
            formula: "• IEEE 754 Word = [ Sign ]₁ ∥ [ Biased Exponent ]ₖ ∥ [ Fraction ]ₚ\n• Total Length  = 1 + k + p bits".to_string(),
            populated_formula: format!(
                "• Bit Assembly: [ {} ]₁ ∥ [ {} ]{} ∥ [ {} ]{}\n• Concatenated: {}₂ ({} bits)",
                sign_bit, exponent_bits, format.exponent_bits, fraction_bits, format.fraction_bits, complete_bit_pattern, format.total_bits
            ),
            calculated_result: complete_bit_pattern.to_string(),
            binary_visualization: Some(format!("{sign_bit} {exponent_bits} {fraction_bits}")),
            next_step_connection: format!(
                "In Step 8, this {}-bit binary pattern is partitioned into {} four-bit nibbles to produce the hexadecimal representation.",
                format.total_bits,
                format.hex_digits
            ),
        },
        ConversionStep {
            step_number: 8,
            title: "Convert Binary to Hexadecimal".to_string(),
            subtitle: format!("Group {} Bits into {} Four-Bit Nibbles", format.total_bits, format.hex_digits),
            concise_explanation: format!(
                "• Partition {}-bit word from MSB to LSB into {} four-bit nibbles.\n• Convert each 4-bit binary group (0000₂–1111₂) into a hex digit (0–9, A–F).\n• Encoded Hexadecimal: {hexadecimal}",
                format.total_bits, format.hex_digits
            ),
            formula: "• 4-Bit Nibble: (b₃ b₂ b₁ b₀)₂ = (b₃·2³ + b₂·2² + b₁·2¹ + b₀·2⁰)₁₀  ⟹  Hex Digit (0–F)".to_string(),
            populated_formula: format!(
                "• Nibble Mapping: {}\n• Hexadecimal:    {}",
                step8_hex
                    .iter()
                    .map(|r| format!("{}₂→{}", r.binary_group, r.hex_digit))
                    .collect::<Vec<_>>()
                    .join("  "),
                hexadecimal
            ),
            calculated_result: hexadecimal.to_string(),
            binary_visualization: Some(
                step8_hex
                    .iter()
                    .map(|r| r.binary_group.as_str())
                    .collect::<Vec<_>>()
                    .join(" "),
            ),
            next_step_connection: "Step 9 verifies the representation accuracy and computes the exact decimal value stored in memory.".to_string(),
        },
        ConversionStep {
            step_number: 9,
            title: "Final Result and Interpretation".to_string(),
            subtitle: "Mathematical Verification & Representation Accuracy".to_string(),
            concise_explanation: format!(
                "• Input Decimal:   {raw_in}₁₀\n• Stored Decimal:  {}\n• Representation:  {}\n• Absolute Error:  {}",
                step9.represented_decimal_exact,
                if step9.is_exact_representation { "Exact (Zero error)" } else { "Rounded (nearest IEEE 754 float)" },
                step9.approximation_error
            ),
            formula: "• Stored Value = (-1)^Sign × (1 + Fraction · 2^(-p)) × 2^(E - Bias)".to_string(),
            populated_formula: format!(
                "• Reconstruction: {}\n• Error Margin:   {}\n• Analysis:       {}",
                step9.reconstruction_formula, step9.approximation_error, step9.accuracy_explanation
            ),
            calculated_result: format!(
                "{hexadecimal} (Stored Decimal = {})",
                step9.represented_decimal_exact
            ),
            binary_visualization: Some(complete_bit_pattern.to_string()),
            next_step_connection: "Conversion derivation complete. Toggle precision above (Single binary32 ↔ Double binary64) to compare format differences.".to_string(),
        },
    ]
}
