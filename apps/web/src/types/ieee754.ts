export type Precision = 'single' | 'double';

export type ValueCategory =
  | 'normal'
  | 'subnormal'
  | 'positive_zero'
  | 'negative_zero'
  | 'positive_infinity'
  | 'negative_infinity'
  | 'overflow_to_infinity'
  | 'underflow_to_zero'
  | 'na_n';

export interface FormatSpec {
  precision: Precision;
  name: string;
  standard_name: string;
  total_bits: number;
  sign_bits: number;
  exponent_bits: number;
  fraction_bits: number;
  bias: number;
  min_normal_exponent: number;
  max_normal_exponent: number;
  hex_digits: number;
}

export interface InputValidation {
  is_valid: boolean;
  raw_input: string;
  trimmed_input: string;
  canonical_decimal: string;
  error_message: string | null;
  warning_message: string | null;
  preserves_negative_zero: boolean;
  is_scientific_notation: boolean;
  is_special_literal: boolean;
}

export interface DivisionRow {
  step: number;
  dividend: string;
  divisor: number;
  expression: string;
  quotient: string;
  remainder: number;
}

export interface IntegerConversionDetail {
  decimal_integer: string;
  binary_string: string;
  rows: DivisionRow[];
  total_divisions: number;
  truncated_table: boolean;
  reading_order_note: string;
  explanation: string;
}

export interface FractionMultRow {
  step: number;
  fraction_before: string;
  multiplied_result: string;
  expression: string;
  integer_bit: number;
  remaining_fraction: string;
  note: string | null;
}

export interface FractionConversionDetail {
  decimal_fraction: string;
  binary_string: string;
  rows: FractionMultRow[];
  total_steps_computed: number;
  terminates: boolean;
  is_repeating: boolean;
  repeat_cycle_start_step: number | null;
  truncated_table: boolean;
  explanation: string;
}

export interface NormalizationDetail {
  unnormalized_binary: string;
  normalized_significand: string;
  normalized_expression: string;
  unbiased_exponent: number;
  shift_direction: 'left' | 'right' | 'none' | string;
  shift_amount: number;
  implicit_leading_bit: string;
  is_hidden_bit_stored: boolean;
  is_subnormal: boolean;
  is_zero: boolean;
  is_special: boolean;
  explanation: string;
}

export interface BiasedExponentDetail {
  unbiased_exponent: number;
  bias: number;
  exponent_bits_count: number;
  bias_derivation_formula: string;
  biased_exponent_formula: string;
  populated_formula: string;
  biased_exponent_decimal: number;
  biased_exponent_binary: string;
  division_rows: DivisionRow[];
  is_special_exponent: boolean;
  special_exponent_meaning: string | null;
  explanation: string;
}

export interface FractionFieldDetail {
  significand_before_encoding: string;
  hidden_leading_bit: string;
  raw_fraction_bits: string;
  final_fraction_bits: string;
  target_bit_length: number;
  stored_from_input_count: number;
  padded_zeros_count: number;
  guard_bit: number | null;
  round_bit: number | null;
  sticky_bit: number | null;
  extra_bits_preview: string;
  rounding_mode: string;
  rounding_occurred: boolean;
  rounding_direction: string;
  carry_into_exponent: boolean;
  explanation: string;
}

export interface BitFieldSegment {
  field_name: string;
  short_label: string;
  bit_count: number;
  start_bit_index: number;
  end_bit_index: number;
  bits: string;
  decimal_value: string;
  role_description: string;
}

export interface BitAssemblyDetail {
  total_bits: number;
  addition_formula: string;
  complete_bit_pattern: string;
  nibbles_grouped: string[];
  sign_segment: BitFieldSegment;
  exponent_segment: BitFieldSegment;
  fraction_segment: BitFieldSegment;
  explanation: string;
}

export interface NibbleHexRow {
  group_index: number;
  bit_range: string;
  binary_group: string;
  decimal_value: number;
  hex_digit: string;
  spanning_fields: string;
}

export interface HexReferenceEntry {
  hex: string;
  binary: string;
  decimal: number;
}

export interface FinalInterpretation {
  original_input: string;
  precision_name: string;
  category_label: string;
  sign_bit: string;
  sign_symbol: string;
  exponent_field_binary: string;
  biased_exponent_decimal: number;
  unbiased_exponent_decimal: number;
  fraction_field_binary: string;
  complete_bit_pattern: string;
  hexadecimal: string;
  represented_decimal_short: string;
  represented_decimal_exact: string;
  approximation_error: string;
  is_exact_representation: boolean;
  rounding_occurred: boolean;
  binary_scientific_value: string;
  reconstruction_formula: string;
  accuracy_explanation: string;
  verified_against_rust_primitive: boolean;
}

export interface ConversionStep {
  step_number: number;
  title: string;
  subtitle: string;
  concise_explanation: string;
  formula: string;
  populated_formula: string;
  calculated_result: string;
  binary_visualization: string | null;
  next_step_connection: string;
}

export interface ExamplePreset {
  label: string;
  input: string;
  description: string;
  recommended_precision: Precision | null;
}

export interface ConversionReport {
  original_input: string;
  validation: InputValidation;
  precision: Precision;
  format: FormatSpec;
  category: ValueCategory;
  sign_bit: number;
  sign_bit_str: string;
  exponent_bits: string;
  fraction_bits: string;
  complete_bit_pattern: string;
  hexadecimal: string;
  raw_bits_u64: number;
  step3_integer: IntegerConversionDetail;
  step3_fraction: FractionConversionDetail;
  step4_normalization: NormalizationDetail;
  step5_biased_exponent: BiasedExponentDetail;
  step6_fraction_field: FractionFieldDetail;
  step7_assembly: BitAssemblyDetail;
  step8_hex_rows: NibbleHexRow[];
  hex_reference_table: HexReferenceEntry[];
  step9_interpretation: FinalInterpretation;
  steps: ConversionStep[];
  parsing_policy_note: string;
}

export interface EngineMetadata {
  presets: ExamplePreset[];
  hex_reference_table: HexReferenceEntry[];
}
