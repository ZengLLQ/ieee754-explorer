use serde::{Deserialize, Serialize};

/// Floating-point precision target supported by IEEE 754 Explorer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Precision {
    Single,
    Double,
}

impl Precision {
    pub fn format_spec(self) -> FormatSpec {
        match self {
            Precision::Single => FormatSpec {
                precision: Precision::Single,
                name: "Single Precision".to_string(),
                standard_name: "IEEE 754 binary32".to_string(),
                total_bits: 32,
                sign_bits: 1,
                exponent_bits: 8,
                fraction_bits: 23,
                bias: 127,
                min_normal_exponent: -126,
                max_normal_exponent: 127,
                hex_digits: 8,
            },
            Precision::Double => FormatSpec {
                precision: Precision::Double,
                name: "Double Precision".to_string(),
                standard_name: "IEEE 754 binary64".to_string(),
                total_bits: 64,
                sign_bits: 1,
                exponent_bits: 11,
                fraction_bits: 52,
                bias: 1023,
                min_normal_exponent: -1022,
                max_normal_exponent: 1023,
                hex_digits: 16,
            },
        }
    }
}

/// Metadata describing the bit layout and parameters of the selected IEEE 754 format.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FormatSpec {
    pub precision: Precision,
    pub name: String,
    pub standard_name: String,
    pub total_bits: usize,
    pub sign_bits: usize,
    pub exponent_bits: usize,
    pub fraction_bits: usize,
    pub bias: i32,
    pub min_normal_exponent: i32,
    pub max_normal_exponent: i32,
    pub hex_digits: usize,
}

/// Classification of the encoded IEEE 754 value.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ValueCategory {
    Normal,
    Subnormal,
    PositiveZero,
    NegativeZero,
    PositiveInfinity,
    NegativeInfinity,
    OverflowToInfinity,
    UnderflowToZero,
    NaN,
}

impl ValueCategory {
    pub fn label(self) -> &'static str {
        match self {
            ValueCategory::Normal => "Normal Normalized Number",
            ValueCategory::Subnormal => "Subnormal (Denormalized) Number",
            ValueCategory::PositiveZero => "Positive Zero (+0)",
            ValueCategory::NegativeZero => "Negative Zero (-0)",
            ValueCategory::PositiveInfinity => "Positive Infinity (+∞)",
            ValueCategory::NegativeInfinity => "Negative Infinity (-∞)",
            ValueCategory::OverflowToInfinity => "Overflow to Infinity (±∞)",
            ValueCategory::UnderflowToZero => "Underflow to Zero (±0)",
            ValueCategory::NaN => "Not a Number (Quiet NaN)",
        }
    }

    pub fn is_zero(self) -> bool {
        matches!(
            self,
            ValueCategory::PositiveZero
                | ValueCategory::NegativeZero
                | ValueCategory::UnderflowToZero
        )
    }

    pub fn is_special(self) -> bool {
        matches!(
            self,
            ValueCategory::PositiveInfinity
                | ValueCategory::NegativeInfinity
                | ValueCategory::OverflowToInfinity
                | ValueCategory::NaN
        )
    }
}

/// Result of validating the user's raw decimal string input.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InputValidation {
    pub is_valid: bool,
    pub raw_input: String,
    pub trimmed_input: String,
    pub canonical_decimal: String,
    pub error_message: Option<String>,
    pub warning_message: Option<String>,
    pub preserves_negative_zero: bool,
    pub is_scientific_notation: bool,
    pub is_special_literal: bool,
}

/// One row in the repeated division-by-2 table for integer-to-binary conversion.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DivisionRow {
    pub step: usize,
    pub dividend: String,
    pub divisor: u32,
    pub expression: String,
    pub quotient: String,
    pub remainder: u8,
}

/// Detailed integer-part conversion record (Step 3A).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct IntegerConversionDetail {
    pub decimal_integer: String,
    pub binary_string: String,
    pub rows: Vec<DivisionRow>,
    pub total_divisions: usize,
    pub truncated_table: bool,
    pub reading_order_note: String,
    pub explanation: String,
}

/// One row in the repeated multiplication-by-2 table for fraction-to-binary conversion.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FractionMultRow {
    pub step: usize,
    pub fraction_before: String,
    pub multiplied_result: String,
    pub expression: String,
    pub integer_bit: u8,
    pub remaining_fraction: String,
    pub note: Option<String>,
}

/// Detailed fractional-part conversion record (Step 3B).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FractionConversionDetail {
    pub decimal_fraction: String,
    pub binary_string: String,
    pub rows: Vec<FractionMultRow>,
    pub total_steps_computed: usize,
    pub terminates: bool,
    pub is_repeating: bool,
    pub repeat_cycle_start_step: Option<usize>,
    pub truncated_table: bool,
    pub explanation: String,
}

/// Detailed binary normalization record (Step 4).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NormalizationDetail {
    pub unnormalized_binary: String,
    pub normalized_significand: String,
    pub normalized_expression: String,
    pub unbiased_exponent: i32,
    pub shift_direction: String,
    pub shift_amount: usize,
    pub implicit_leading_bit: String,
    pub is_hidden_bit_stored: bool,
    pub is_subnormal: bool,
    pub is_zero: bool,
    pub is_special: bool,
    pub explanation: String,
}

/// Detailed biased exponent calculation record (Step 5).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BiasedExponentDetail {
    pub unbiased_exponent: i32,
    pub bias: i32,
    pub exponent_bits_count: usize,
    pub bias_derivation_formula: String,
    pub biased_exponent_formula: String,
    pub populated_formula: String,
    pub biased_exponent_decimal: u32,
    pub biased_exponent_binary: String,
    pub division_rows: Vec<DivisionRow>,
    pub is_special_exponent: bool,
    pub special_exponent_meaning: Option<String>,
    pub explanation: String,
}

/// Detailed fraction-field and IEEE 754 rounding record (Step 6).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FractionFieldDetail {
    pub significand_before_encoding: String,
    pub hidden_leading_bit: String,
    pub raw_fraction_bits: String,
    pub final_fraction_bits: String,
    pub target_bit_length: usize,
    pub stored_from_input_count: usize,
    pub padded_zeros_count: usize,
    pub guard_bit: Option<u8>,
    pub round_bit: Option<u8>,
    pub sticky_bit: Option<u8>,
    pub extra_bits_preview: String,
    pub rounding_mode: String,
    pub rounding_occurred: bool,
    pub rounding_direction: String,
    pub carry_into_exponent: bool,
    pub explanation: String,
}

/// Group of bits in the assembled IEEE 754 bit pattern (Step 7).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BitFieldSegment {
    pub field_name: String,
    pub short_label: String,
    pub bit_count: usize,
    pub start_bit_index: usize,
    pub end_bit_index: usize,
    pub bits: String,
    pub decimal_value: String,
    pub role_description: String,
}

/// Assembled IEEE 754 bit pattern record (Step 7).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BitAssemblyDetail {
    pub total_bits: usize,
    pub addition_formula: String,
    pub complete_bit_pattern: String,
    pub nibbles_grouped: Vec<String>,
    pub sign_segment: BitFieldSegment,
    pub exponent_segment: BitFieldSegment,
    pub fraction_segment: BitFieldSegment,
    pub explanation: String,
}

/// One 4-bit nibble group in the binary-to-hexadecimal conversion table (Step 8).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NibbleHexRow {
    pub group_index: usize,
    pub bit_range: String,
    pub binary_group: String,
    pub decimal_value: u8,
    pub hex_digit: String,
    pub spanning_fields: String,
}

/// Entry in the 4-bit-to-hexadecimal reference lookup table.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HexReferenceEntry {
    pub hex: String,
    pub binary: String,
    pub decimal: u8,
}

/// Final result summary and mathematical interpretation (Step 9).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FinalInterpretation {
    pub original_input: String,
    pub precision_name: String,
    pub category_label: String,
    pub sign_bit: String,
    pub sign_symbol: String,
    pub exponent_field_binary: String,
    pub biased_exponent_decimal: u32,
    pub unbiased_exponent_decimal: i32,
    pub fraction_field_binary: String,
    pub complete_bit_pattern: String,
    pub hexadecimal: String,
    pub represented_decimal_short: String,
    pub represented_decimal_exact: String,
    pub approximation_error: String,
    pub is_exact_representation: bool,
    pub rounding_occurred: bool,
    pub binary_scientific_value: String,
    pub reconstruction_formula: String,
    pub accuracy_explanation: String,
    pub verified_against_rust_primitive: bool,
}

/// Unified educational step card structure used to render Steps 1 through 9 sequentially.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ConversionStep {
    pub step_number: usize,
    pub title: String,
    pub subtitle: String,
    pub concise_explanation: String,
    pub formula: String,
    pub populated_formula: String,
    pub calculated_result: String,
    pub binary_visualization: Option<String>,
    pub next_step_connection: String,
}

/// Example preset input item for quick exploration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExamplePreset {
    pub label: String,
    pub input: String,
    pub description: String,
    pub recommended_precision: Option<Precision>,
}

/// Complete IEEE 754 conversion report returned by the Rust core engine.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ConversionReport {
    pub original_input: String,
    pub validation: InputValidation,
    pub precision: Precision,
    pub format: FormatSpec,
    pub category: ValueCategory,
    pub sign_bit: u8,
    pub sign_bit_str: String,
    pub exponent_bits: String,
    pub fraction_bits: String,
    pub complete_bit_pattern: String,
    pub hexadecimal: String,
    pub raw_bits_u64: u64,
    pub step3_integer: IntegerConversionDetail,
    pub step3_fraction: FractionConversionDetail,
    pub step4_normalization: NormalizationDetail,
    pub step5_biased_exponent: BiasedExponentDetail,
    pub step6_fraction_field: FractionFieldDetail,
    pub step7_assembly: BitAssemblyDetail,
    pub step8_hex_rows: Vec<NibbleHexRow>,
    pub hex_reference_table: Vec<HexReferenceEntry>,
    pub step9_interpretation: FinalInterpretation,
    pub steps: Vec<ConversionStep>,
    pub parsing_policy_note: String,
}
