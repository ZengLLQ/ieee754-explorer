use std::collections::HashMap;

use crate::types::{
    DivisionRow, FractionConversionDetail, FractionMultRow, IntegerConversionDetail,
};

/// Divides an arbitrary-length decimal integer string by 2, returning `(quotient_str, remainder_bit)`.
pub fn divide_decimal_by_2(num_str: &str) -> (String, u8) {
    let mut quotient = String::with_capacity(num_str.len());
    let mut carry: u8 = 0;

    for ch in num_str.chars() {
        let digit = ch.to_digit(10).unwrap_or(0) as u8;
        let current = carry * 10 + digit;
        let q = current / 2;
        carry = current % 2;
        if !quotient.is_empty() || q > 0 {
            quotient.push((b'0' + q) as char);
        }
    }

    if quotient.is_empty() {
        quotient.push('0');
    }

    (quotient, carry)
}

/// Converts a non-negative decimal integer string into binary using repeated division by 2 (Step 3A).
pub fn convert_integer_part(int_digits: &str, max_table_rows: usize) -> IntegerConversionDetail {
    let clean = {
        let s = int_digits.trim_start_matches('0');
        if s.is_empty() {
            "0"
        } else {
            s
        }
    };

    if clean == "0" {
        let row = DivisionRow {
            step: 1,
            dividend: "0".to_string(),
            divisor: 2,
            expression: "0 ÷ 2".to_string(),
            quotient: "0".to_string(),
            remainder: 0,
        };
        return IntegerConversionDetail {
            decimal_integer: "0".to_string(),
            binary_string: "0".to_string(),
            rows: vec![row],
            total_divisions: 1,
            truncated_table: false,
            reading_order_note: "The integer part is 0, so a single division yields 0₂.".to_string(),
            explanation: "Divide 0 by 2: quotient is 0 and remainder is 0, giving binary integer part 0₂."
                .to_string(),
        };
    }

    let mut all_rows = Vec::new();
    let mut remainders = Vec::new();
    let mut current = clean.to_string();
    let mut step = 1usize;

    // Cap at 1152 divisions (covers the full IEEE 754 binary64 finite integer range up to 2^1024).
    while current != "0" && step <= 1152 {
        let (quotient, rem) = divide_decimal_by_2(&current);
        let div_disp = compact_digits_display(&current, 28);
        let quot_disp = compact_digits_display(&quotient, 28);
        all_rows.push(DivisionRow {
            step,
            dividend: div_disp.clone(),
            divisor: 2,
            expression: format!("{div_disp} ÷ 2"),
            quotient: quot_disp,
            remainder: rem,
        });
        remainders.push(rem);
        current = quotient;
        step += 1;
    }

    let binary_string: String = remainders
        .iter()
        .rev()
        .map(|&b| if b == 1 { '1' } else { '0' })
        .collect();

    let total_divisions = all_rows.len();
    let truncated_table = total_divisions > max_table_rows;
    let display_rows = if truncated_table {
        let head_count = max_table_rows * 2 / 3;
        let tail_count = max_table_rows - head_count;
        let mut r = Vec::with_capacity(max_table_rows);
        r.extend_from_slice(&all_rows[..head_count]);
        r.extend_from_slice(&all_rows[total_divisions - tail_count..]);
        r
    } else {
        all_rows
    };

    let clean_disp = compact_digits_display(clean, 28);
    let bin_disp = compact_digits_display(&binary_string, 40);

    IntegerConversionDetail {
        decimal_integer: clean_disp.clone(),
        binary_string: binary_string.clone(),
        rows: display_rows,
        total_divisions,
        truncated_table,
        reading_order_note:
            "Read the remainders from bottom (Most Significant Bit) to top (Least Significant Bit)."
                .to_string(),
        explanation: format!(
            "Repeatedly divide {clean_disp}₁₀ by 2 until the quotient reaches 0. Reading the {total_divisions} remainders from bottom to top yields {bin_disp}₂."
        ),
    }
}

fn compact_digits_display(digits: &str, max_len: usize) -> String {
    if digits.len() <= max_len {
        return digits.to_string();
    }
    let head = &digits[..12];
    let tail = &digits[digits.len() - 6..];
    format!("{head}…({} digits)…{tail}", digits.len())
}

fn compact_fraction_display(frac_digits: &str) -> String {
    if frac_digits.is_empty() {
        return "0".to_string();
    }
    if frac_digits.len() <= 24 {
        return format!("0.{frac_digits}");
    }
    let leading_zeros = frac_digits.chars().take_while(|&c| c == '0').count();
    if leading_zeros >= 10 {
        let rest = &frac_digits[leading_zeros..];
        let rest_preview = if rest.len() > 10 { &rest[..10] } else { rest };
        let suffix = if rest.len() > 10 { "…" } else { "" };
        format!("0.[0×{leading_zeros}]{rest_preview}{suffix}")
    } else {
        format!("0.{}…", &frac_digits[..20])
    }
}

/// Multiplies a decimal fractional digit string (representing `0.<frac_digits>`) by 2.
/// Returns `(integer_bit, remaining_frac_digits_trimmed, formatted_multiplied_value)`.
pub fn multiply_decimal_fraction_by_2(frac_digits: &str) -> (u8, String, String) {
    if frac_digits.is_empty() {
        return (0, String::new(), "0.0".to_string());
    }

    let mut result_digits = vec![0u8; frac_digits.len()];
    let mut carry = 0u8;

    for (idx, ch) in frac_digits.chars().rev().enumerate() {
        let d = ch.to_digit(10).unwrap_or(0) as u8;
        let prod = d * 2 + carry;
        result_digits[frac_digits.len() - 1 - idx] = prod % 10;
        carry = prod / 10;
    }

    let raw_frac_str: String = result_digits.iter().map(|&d| (b'0' + d) as char).collect();
    let trimmed_frac = raw_frac_str.trim_end_matches('0').to_string();
    let compact_rem = compact_fraction_display(&trimmed_frac);
    let after_dot = compact_rem.strip_prefix("0.").unwrap_or(&compact_rem);
    let multiplied_display = format!("{carry}.{after_dot}");

    (carry, trimmed_frac, multiplied_display)
}

/// Converts a decimal fractional digit string (`frac_digits`, representing `0.<frac_digits>`) into binary
/// using repeated multiplication by 2 (Step 3B).
///
/// Returns `(FractionConversionDetail, generated_bits, has_nonzero_remainder_after_generated_bits)`.
pub fn convert_fraction_part(
    frac_digits: &str,
    max_bits_to_generate: usize,
    max_table_rows: usize,
) -> (FractionConversionDetail, Vec<u8>, bool) {
    let clean = frac_digits.trim_end_matches('0');
    if clean.is_empty() {
        let row = FractionMultRow {
            step: 1,
            fraction_before: "0.0".to_string(),
            multiplied_result: "0.0".to_string(),
            expression: "0.0 × 2 = 0.0".to_string(),
            integer_bit: 0,
            remaining_fraction: "0".to_string(),
            note: Some("Exact zero fractional part".to_string()),
        };
        let detail = FractionConversionDetail {
            decimal_fraction: "0".to_string(),
            binary_string: "0".to_string(),
            rows: vec![row],
            total_steps_computed: 1,
            terminates: true,
            is_repeating: false,
            repeat_cycle_start_step: None,
            truncated_table: false,
            explanation: "The fractional part is 0, so 0.0 × 2 = 0.0 and the fractional binary expansion is .0₂."
                .to_string(),
        };
        return (detail, vec![0], false);
    }

    let mut head_rows = Vec::new();
    let mut significant_rows = Vec::new();
    let mut bits = Vec::with_capacity(max_bits_to_generate);
    let mut seen_states: HashMap<String, usize> = HashMap::new();
    let mut current_frac = clean.to_string();
    let mut terminates = false;
    let mut is_repeating = false;
    let mut repeat_cycle_start_step: Option<usize> = None;
    let mut first_one_step: Option<usize> = None;

    for step in 1..=max_bits_to_generate {
        if current_frac.is_empty() {
            terminates = true;
            break;
        }

        // Track repeating states for fractions of moderate length or once non-zero bits start
        let track_cycles = current_frac.len() <= 64 || first_one_step.is_some();
        if repeat_cycle_start_step.is_none() && track_cycles && seen_states.len() < 128 {
            if let Some(&prev_step) = seen_states.get(&current_frac) {
                is_repeating = true;
                repeat_cycle_start_step = Some(prev_step);
            } else {
                seen_states.insert(current_frac.clone(), step);
            }
        }

        let frac_before_display = compact_fraction_display(&current_frac);
        let (int_bit, next_frac, mult_display) = multiply_decimal_fraction_by_2(&current_frac);
        if int_bit == 1 && first_one_step.is_none() {
            first_one_step = Some(step);
        }
        bits.push(int_bit);

        let rem_display = if next_frac.is_empty() {
            "0".to_string()
        } else {
            compact_fraction_display(&next_frac)
        };

        let mut row_note = None;
        if next_frac.is_empty() {
            row_note = Some("Terminates (remaining fraction is 0)".to_string());
        } else if let Some(&cycle_start) = seen_states.get(&next_frac) {
            if repeat_cycle_start_step.is_none() {
                is_repeating = true;
                repeat_cycle_start_step = Some(cycle_start);
                row_note = Some(format!(
                    "Remaining fraction {rem_display} repeats Step {cycle_start} (infinite cycle)"
                ));
            }
        }

        if first_one_step == Some(step) && step > 12 && row_note.is_none() {
            row_note = Some(format!(
                "First '1' bit reached at Step {step} (2⁻{step}) after {} leading 0 bits",
                step - 1
            ));
        }

        let row_obj = FractionMultRow {
            step,
            fraction_before: frac_before_display.clone(),
            multiplied_result: mult_display.clone(),
            expression: format!("{frac_before_display} × 2 = {mult_display}"),
            integer_bit: int_bit,
            remaining_fraction: rem_display,
            note: row_note,
        };

        if head_rows.len() < max_table_rows {
            head_rows.push(row_obj);
        } else if let Some(f_step) = first_one_step {
            if f_step > max_table_rows && step >= f_step && significant_rows.len() < 8 {
                significant_rows.push(row_obj);
            }
        }

        current_frac = next_frac;
        if current_frac.is_empty() {
            terminates = true;
            break;
        }
    }

    let rows = if !significant_rows.is_empty() {
        let keep_head = 12.min(head_rows.len());
        let mut combined = Vec::with_capacity(keep_head + significant_rows.len());
        combined.extend_from_slice(&head_rows[..keep_head]);
        combined.extend(significant_rows);
        combined
    } else {
        head_rows
    };

    let has_remainder = !current_frac.is_empty();
    let first_one_idx = bits.iter().position(|&b| b == 1);

    let binary_string = if terminates && bits.len() <= 32 {
        bits.iter()
            .map(|&b| if b == 1 { '1' } else { '0' })
            .collect()
    } else if let Some(fo) = first_one_idx {
        if fo >= 16 {
            let after_end = (fo + 16).min(bits.len());
            let sig_slice: String = bits[fo..after_end]
                .iter()
                .map(|&b| if b == 1 { '1' } else { '0' })
                .collect();
            let suffix = if !terminates || after_end < bits.len() {
                "..."
            } else {
                ""
            };
            format!("0000…({fo} zeros)…{sig_slice}{suffix}")
        } else {
            let preview_len = bits.len().min(max_table_rows.max(fo + 12));
            let binary_preview: String = bits[..preview_len]
                .iter()
                .map(|&b| if b == 1 { '1' } else { '0' })
                .collect();
            if terminates && preview_len == bits.len() {
                binary_preview
            } else {
                format!("{binary_preview}...")
            }
        }
    } else {
        let preview_len = bits.len().min(max_table_rows);
        let binary_preview: String = bits[..preview_len]
            .iter()
            .map(|&b| if b == 1 { '1' } else { '0' })
            .collect();
        if terminates && preview_len == bits.len() {
            binary_preview
        } else {
            format!("{binary_preview}...")
        }
    };

    let clean_disp = compact_fraction_display(clean);
    let truncated_table = !terminates || bits.len() > rows.len();
    let explanation = if terminates {
        format!(
            "Multiply {clean_disp}₁₀ repeatedly by 2 until the remaining fraction reaches 0 after {} step(s). Reading the integer bits from top to bottom gives .{binary_string}₂.",
            bits.len()
        )
    } else if let Some(cycle_start) = repeat_cycle_start_step {
        format!(
            "Multiply {clean_disp}₁₀ repeatedly by 2. The remaining fraction repeats starting at Step {cycle_start}, meaning {clean_disp}₁₀ has a non-terminating repeating binary expansion (.{binary_string}₂). The final IEEE 754 fraction field is determined by rounding to the nearest representable bit pattern."
        )
    } else {
        format!(
            "Multiply {clean_disp}₁₀ repeatedly by 2. This fractional value does not terminate within {} steps (.{binary_string}₂); the final IEEE 754 encoding rounds the infinite binary expansion according to round-to-nearest, ties-to-even.",
            bits.len()
        )
    };

    let detail = FractionConversionDetail {
        decimal_fraction: clean_disp,
        binary_string,
        rows,
        total_steps_computed: bits.len(),
        terminates,
        is_repeating,
        repeat_cycle_start_step,
        truncated_table,
        explanation,
    };

    (detail, bits, has_remainder)
}

/// Converts a `u32` (such as the biased exponent) into binary with repeated division by 2 (Step 5).
pub fn convert_u32_to_binary_rows(val: u32, min_bit_width: usize) -> (String, Vec<DivisionRow>) {
    if val == 0 {
        let row = DivisionRow {
            step: 1,
            dividend: "0".to_string(),
            divisor: 2,
            expression: "0 ÷ 2".to_string(),
            quotient: "0".to_string(),
            remainder: 0,
        };
        return ("0".repeat(min_bit_width), vec![row]);
    }

    let mut rows = Vec::new();
    let mut remainders = Vec::new();
    let mut cur = val;
    let mut step = 1usize;

    while cur > 0 {
        let q = cur / 2;
        let r = (cur % 2) as u8;
        rows.push(DivisionRow {
            step,
            dividend: cur.to_string(),
            divisor: 2,
            expression: format!("{cur} ÷ 2"),
            quotient: q.to_string(),
            remainder: r,
        });
        remainders.push(r);
        cur = q;
        step += 1;
    }

    let raw_bin: String = remainders
        .iter()
        .rev()
        .map(|&b| if b == 1 { '1' } else { '0' })
        .collect();
    let padded = if raw_bin.len() < min_bit_width {
        format!("{}{}", "0".repeat(min_bit_width - raw_bin.len()), raw_bin)
    } else {
        raw_bin
    };

    (padded, rows)
}

/// Computes the exact decimal expansion of a finite non-zero binary floating-point value:
/// `(-1)^sign_bit * full_significand * 2^(unbiased_exp - fraction_bits)`.
///
/// Covers the entire finite IEEE 754 `binary32` and `binary64` exponent range (`|effective_pow2| <= 1100`).
pub fn exact_float_decimal_string(
    sign_bit: u8,
    unbiased_exp: i32,
    full_significand: u64,
    fraction_bits: usize,
    fallback_short: &str,
) -> String {
    if full_significand == 0 {
        return if sign_bit == 1 {
            "-0".to_string()
        } else {
            "0".to_string()
        };
    }

    let tz = full_significand.trailing_zeros() as i32;
    let reduced_sig = full_significand >> tz;
    let effective_pow2 = unbiased_exp - (fraction_bits as i32) + tz;

    if effective_pow2.abs() > 1100 {
        return fallback_short.to_string();
    }

    // Represent decimal big integer in little-endian base-10 digits.
    let mut digits = u64_to_le_digits(reduced_sig);

    let sign_prefix = if sign_bit == 1 { "-" } else { "" };

    if effective_pow2 >= 0 {
        for _ in 0..effective_pow2 {
            mul_le_digits_small(&mut digits, 2);
        }
        let s: String = digits.iter().rev().map(|&d| (b'0' + d) as char).collect();
        format!("{sign_prefix}{s}")
    } else {
        let k = (-effective_pow2) as usize;
        for _ in 0..k {
            mul_le_digits_small(&mut digits, 5);
        }
        // Now the value is `digits * 10^(-k)`.
        let raw_digits: String = digits.iter().rev().map(|&d| (b'0' + d) as char).collect();
        let formatted = if raw_digits.len() <= k {
            let leading_zeros = "0".repeat(k - raw_digits.len());
            format!("0.{leading_zeros}{raw_digits}")
        } else {
            let split = raw_digits.len() - k;
            format!("{}.{}", &raw_digits[..split], &raw_digits[split..])
        };
        let trimmed = formatted.trim_end_matches('0').trim_end_matches('.');
        format!("{sign_prefix}{trimmed}")
    }
}

/// Computes the exact magnitude difference `|stored_exact - input_canonical|` between two decimal strings
/// and formats it in scientific notation (e.g. `"≈ 5.551115e-18 (rounded to nearest IEEE 754 binary64 bit pattern)"`).
pub fn compute_decimal_approximation_error(
    stored_exact: &str,
    input_canonical: &str,
    standard_name: &str,
) -> Option<String> {
    let a = stored_exact.strip_prefix('-').or_else(|| stored_exact.strip_prefix('+')).unwrap_or(stored_exact);
    let b = input_canonical.strip_prefix('-').or_else(|| input_canonical.strip_prefix('+')).unwrap_or(input_canonical);

    if a.contains(['e', 'E']) || b.contains(['e', 'E']) {
        return None;
    }

    let (int_a, frac_a) = a.split_once('.').unwrap_or((a, ""));
    let (int_b, frac_b) = b.split_once('.').unwrap_or((b, ""));

    if !int_a.chars().all(|c| c.is_ascii_digit())
        || !frac_a.chars().all(|c| c.is_ascii_digit())
        || !int_b.chars().all(|c| c.is_ascii_digit())
        || !frac_b.chars().all(|c| c.is_ascii_digit())
    {
        return None;
    }

    let int_len = int_a.len().max(int_b.len()).max(1);
    let frac_len = frac_a.len().max(frac_b.len());

    let mut vec_a = Vec::with_capacity(int_len + frac_len);
    for _ in 0..(int_len - int_a.len()) {
        vec_a.push(0u8);
    }
    for ch in int_a.chars().chain(frac_a.chars()) {
        vec_a.push(ch as u8 - b'0');
    }
    for _ in 0..(frac_len - frac_a.len()) {
        vec_a.push(0u8);
    }

    let mut vec_b = Vec::with_capacity(int_len + frac_len);
    for _ in 0..(int_len - int_b.len()) {
        vec_b.push(0u8);
    }
    for ch in int_b.chars().chain(frac_b.chars()) {
        vec_b.push(ch as u8 - b'0');
    }
    for _ in 0..(frac_len - frac_b.len()) {
        vec_b.push(0u8);
    }

    if vec_a == vec_b {
        return Some("0 (Exact binary floating-point representation)".to_string());
    }

    let (larger, smaller) = if vec_a >= vec_b {
        (&vec_a, &vec_b)
    } else {
        (&vec_b, &vec_a)
    };

    let mut diff = vec![0u8; larger.len()];
    let mut borrow = 0i16;
    for i in (0..larger.len()).rev() {
        let mut d = (larger[i] as i16) - (smaller[i] as i16) - borrow;
        if d < 0 {
            d += 10;
            borrow = 1;
        } else {
            borrow = 0;
        }
        diff[i] = d as u8;
    }

    let first_nz = diff.iter().position(|&d| d != 0)?;
    let exp10: i32 = (int_len as i32) - 1 - (first_nz as i32);

    // Extract up to 7 significant digits (1 before decimal point + 6 fractional digits) with rounding
    let mut sig = [0u8; 7];
    for (j, slot) in sig.iter_mut().enumerate() {
        *slot = diff.get(first_nz + j).copied().unwrap_or(0);
    }
    let next_digit = diff.get(first_nz + 7).copied().unwrap_or(0);
    if next_digit >= 5 {
        let mut carry = 1u8;
        for d in sig.iter_mut().rev() {
            let sum = *d + carry;
            *d = sum % 10;
            carry = sum / 10;
        }
    }

    let d0 = (b'0' + sig[0]) as char;
    let d_rest: String = sig[1..].iter().map(|&d| (b'0' + d) as char).collect();
    Some(format!(
        "≈ {d0}.{d_rest}e{exp10} (rounded to nearest {standard_name} bit pattern)"
    ))
}

fn u64_to_le_digits(mut n: u64) -> Vec<u8> {
    if n == 0 {
        return vec![0];
    }
    let mut d = Vec::with_capacity(20);
    while n > 0 {
        d.push((n % 10) as u8);
        n /= 10;
    }
    d
}

fn mul_le_digits_small(digits: &mut Vec<u8>, factor: u8) {
    let mut carry = 0u8;
    for d in digits.iter_mut() {
        let prod = (*d) * factor + carry;
        *d = prod % 10;
        carry = prod / 10;
    }
    while carry > 0 {
        digits.push(carry % 10);
        carry /= 10;
    }
}
