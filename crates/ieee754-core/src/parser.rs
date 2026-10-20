use crate::types::InputValidation;

/// Structured representation of a validated user input string before IEEE 754 encoding.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedDecimalInput {
    pub validation: InputValidation,
    pub is_negative: bool,
    pub special_literal: Option<SpecialLiteral>,
    pub is_zero_value: bool,
    /// Exact integer digits after applying moderate scientific notation shift (no leading zeros, at least "0").
    pub expanded_integer_digits: String,
    /// Exact fractional digits after applying moderate scientific notation shift (no trailing zeros, may be empty).
    pub expanded_fraction_digits: String,
    /// Original unshifted mantissa integer digits (for display when extreme scientific notation is used).
    pub mantissa_integer_digits: String,
    /// Original unshifted mantissa fractional digits.
    pub mantissa_fraction_digits: String,
    /// Original base-10 exponent from scientific notation (0 if none).
    pub base10_exponent: i32,
    /// Effective base-10 exponent of the most significant non-zero digit.
    pub effective_exp10: i32,
    /// True when the effective base-10 exponent is outside the finite IEEE 754 binary64 range.
    pub is_extreme_exponent: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpecialLiteral {
    PositiveInfinity,
    NegativeInfinity,
    NaN,
}

/// Validates and decomposes a decimal input string without premature rounding.
pub fn parse_and_validate_input(raw: &str) -> Result<ParsedDecimalInput, InputValidation> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(InputValidation {
            is_valid: false,
            raw_input: raw.to_string(),
            trimmed_input: String::new(),
            canonical_decimal: String::new(),
            error_message: Some("Please enter a decimal number (e.g., 126.25, 0.1, -13.5, or 1.25e-10).".to_string()),
            warning_message: None,
            preserves_negative_zero: false,
            is_scientific_notation: false,
            is_special_literal: false,
        });
    }

    let lower = trimmed.to_ascii_lowercase();
    if matches!(
        lower.as_str(),
        "inf" | "+inf" | "-inf" | "infinity" | "+infinity" | "-infinity" | "nan" | "+nan" | "-nan"
    ) {
        let is_negative = lower.starts_with('-');
        let special = if lower.contains("nan") {
            SpecialLiteral::NaN
        } else if is_negative {
            SpecialLiteral::NegativeInfinity
        } else {
            SpecialLiteral::PositiveInfinity
        };
        let canonical = match special {
            SpecialLiteral::PositiveInfinity => "+Infinity".to_string(),
            SpecialLiteral::NegativeInfinity => "-Infinity".to_string(),
            SpecialLiteral::NaN => "NaN".to_string(),
        };
        let validation = InputValidation {
            is_valid: true,
            raw_input: raw.to_string(),
            trimmed_input: trimmed.to_string(),
            canonical_decimal: canonical,
            error_message: None,
            warning_message: None,
            preserves_negative_zero: false,
            is_scientific_notation: false,
            is_special_literal: true,
        };
        return Ok(ParsedDecimalInput {
            validation,
            is_negative,
            special_literal: Some(special),
            is_zero_value: false,
            expanded_integer_digits: "0".to_string(),
            expanded_fraction_digits: String::new(),
            mantissa_integer_digits: "0".to_string(),
            mantissa_fraction_digits: String::new(),
            base10_exponent: 0,
            effective_exp10: 0,
            is_extreme_exponent: false,
        });
    }

    // Parse sign
    let (is_negative, rest) = if let Some(s) = trimmed.strip_prefix('-') {
        (true, s)
    } else if let Some(s) = trimmed.strip_prefix('+') {
        (false, s)
    } else {
        (false, trimmed)
    };

    if rest.is_empty() {
        return Err(invalid_input(
            raw,
            trimmed,
            "Sign must be followed by digits (for example, -13.5 or -0).",
        ));
    }

    // Split optional scientific notation exponent
    let (mantissa_part, exp_part_opt) = if let Some(idx) = rest.find(['e', 'E']) {
        let m = &rest[..idx];
        let e = &rest[idx + 1..];
        if e.is_empty() {
            return Err(invalid_input(
                raw,
                trimmed,
                "Scientific notation requires an integer exponent after 'e' (for example, 1.25e-10).",
            ));
        }
        (m, Some(e))
    } else {
        (rest, None)
    };

    if mantissa_part.is_empty() {
        return Err(invalid_input(
            raw,
            trimmed,
            "Missing digits before exponent 'e' (for example, 1.25e-10).",
        ));
    }

    // Split mantissa by decimal point
    let mut dot_iter = mantissa_part.split('.');
    let int_raw = dot_iter.next().unwrap_or("");
    let frac_raw_opt = dot_iter.next();
    if dot_iter.next().is_some() {
        return Err(invalid_input(
            raw,
            trimmed,
            "Invalid number format: multiple decimal points found.",
        ));
    }
    let frac_raw = frac_raw_opt.unwrap_or("");

    if int_raw.is_empty() && frac_raw.is_empty() {
        return Err(invalid_input(
            raw,
            trimmed,
            "A decimal point must have digits before or after it (for example, 0.5).",
        ));
    }

    if !int_raw.chars().all(|c| c.is_ascii_digit()) || !frac_raw.chars().all(|c| c.is_ascii_digit()) {
        return Err(invalid_input(
            raw,
            trimmed,
            "Invalid characters found. Enter digits, an optional decimal point, or scientific notation (e.g., 126.25 or 1.25e-10).",
        ));
    }

    let base10_exponent: i32 = if let Some(exp_str) = exp_part_opt {
        let exp_digits = exp_str
            .strip_prefix('+')
            .or_else(|| exp_str.strip_prefix('-'))
            .unwrap_or(exp_str);
        if exp_digits.is_empty() || !exp_digits.chars().all(|c| c.is_ascii_digit()) {
            return Err(invalid_input(
                raw,
                trimmed,
                "Exponent after 'e' must be a valid integer (for example, 1.25e-10).",
            ));
        }
        match exp_str.parse::<i32>() {
            Ok(v) => v,
            Err(_) => {
                return Err(invalid_input(
                    raw,
                    trimmed,
                    "Exponent is out of range.",
                ));
            }
        }
    } else {
        0
    };

    let clean_mantissa_int = {
        let stripped = int_raw.trim_start_matches('0');
        if stripped.is_empty() {
            "0".to_string()
        } else {
            stripped.to_string()
        }
    };
    let clean_mantissa_frac = frac_raw.trim_end_matches('0').to_string();

    let is_zero_value = clean_mantissa_int == "0" && clean_mantissa_frac.is_empty();
    let preserves_negative_zero = is_negative && is_zero_value;
    let is_scientific = exp_part_opt.is_some();

    let unshifted_exp10: i32 = if is_zero_value {
        0
    } else if clean_mantissa_int != "0" {
        (clean_mantissa_int.len() as i32) - 1
    } else {
        let leading_zeros = clean_mantissa_frac.chars().take_while(|&c| c == '0').count();
        -((leading_zeros as i32) + 1)
    };
    let effective_exp10 = unshifted_exp10.saturating_add(base10_exponent);

    // Every finite non-zero IEEE 754 binary32 and binary64 value lies within 10^-324 .. 10^309.
    // Expanding all inputs with effective_exp10 in [-330, 315] guarantees 100% exact bit-stream
    // and Guard/Round/Sticky derivation across the entire finite f32 and f64 range.
    let sig_digits_trimmed = format!("{clean_mantissa_int}{clean_mantissa_frac}")
        .trim_start_matches('0')
        .trim_end_matches('0')
        .len();
    let is_extreme_exponent = !is_zero_value
        && (!(-330..=315).contains(&effective_exp10) || sig_digits_trimmed > 120);

    let (expanded_int, expanded_frac) = if is_zero_value {
        ("0".to_string(), String::new())
    } else if is_extreme_exponent {
        (clean_mantissa_int.clone(), clean_mantissa_frac.clone())
    } else {
        shift_decimal_digits(&clean_mantissa_int, &clean_mantissa_frac, base10_exponent)
    };

    let sign_prefix = if is_negative { "-" } else { "" };
    let canonical_decimal = if is_zero_value {
        if is_negative {
            "-0".to_string()
        } else {
            "0".to_string()
        }
    } else if is_extreme_exponent {
        if clean_mantissa_frac.is_empty() {
            format!("{sign_prefix}{clean_mantissa_int}e{base10_exponent}")
        } else {
            format!("{sign_prefix}{clean_mantissa_int}.{clean_mantissa_frac}e{base10_exponent}")
        }
    } else if expanded_frac.is_empty() {
        format!("{sign_prefix}{expanded_int}")
    } else {
        format!("{sign_prefix}{expanded_int}.{expanded_frac}")
    };

    let warning_message = if sig_digits_trimmed > 17 && !is_zero_value {
        Some(
            "Input contains more significant decimal digits than IEEE 754 binary32 (≈7 digits) or binary64 (≈15–17 digits) can store without rounding."
                .to_string(),
        )
    } else {
        None
    };

    let validation = InputValidation {
        is_valid: true,
        raw_input: raw.to_string(),
        trimmed_input: trimmed.to_string(),
        canonical_decimal,
        error_message: None,
        warning_message,
        preserves_negative_zero,
        is_scientific_notation: is_scientific,
        is_special_literal: false,
    };

    Ok(ParsedDecimalInput {
        validation,
        is_negative,
        special_literal: None,
        is_zero_value,
        expanded_integer_digits: expanded_int,
        expanded_fraction_digits: expanded_frac,
        mantissa_integer_digits: clean_mantissa_int,
        mantissa_fraction_digits: clean_mantissa_frac,
        base10_exponent,
        effective_exp10,
        is_extreme_exponent,
    })
}

fn shift_decimal_digits(int_part: &str, frac_part: &str, exp10: i32) -> (String, String) {
    if exp10 == 0 {
        return (int_part.to_string(), frac_part.to_string());
    }

    let combined = if int_part == "0" {
        format!("0{frac_part}")
    } else {
        format!("{int_part}{frac_part}")
    };
    let dot_pos: isize = (if int_part == "0" { 1 } else { int_part.len() }) as isize;
    let new_dot_pos: isize = dot_pos + (exp10 as isize);

    let (raw_int, raw_frac) = if new_dot_pos <= 0 {
        let zeros = "0".repeat((-new_dot_pos) as usize);
        ("0".to_string(), format!("{zeros}{combined}"))
    } else if (new_dot_pos as usize) >= combined.len() {
        let zeros = "0".repeat((new_dot_pos as usize) - combined.len());
        (format!("{combined}{zeros}"), String::new())
    } else {
        let split = new_dot_pos as usize;
        (
            combined[..split].to_string(),
            combined[split..].to_string(),
        )
    };

    let clean_int = {
        let s = raw_int.trim_start_matches('0');
        if s.is_empty() {
            "0".to_string()
        } else {
            s.to_string()
        }
    };
    let clean_frac = raw_frac.trim_end_matches('0').to_string();
    (clean_int, clean_frac)
}

fn invalid_input(raw: &str, trimmed: &str, msg: &str) -> InputValidation {
    InputValidation {
        is_valid: false,
        raw_input: raw.to_string(),
        trimmed_input: trimmed.to_string(),
        canonical_decimal: String::new(),
        error_message: Some(msg.to_string()),
        warning_message: None,
        preserves_negative_zero: false,
        is_scientific_notation: false,
        is_special_literal: false,
    }
}
