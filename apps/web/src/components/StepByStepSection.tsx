import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  RotateCcw,
} from 'lucide-react';
import type { ConversionReport, ConversionStep } from '../types/ieee754';
import { CopyButton } from './CopyButton';

interface StepByStepSectionProps {
  report: ConversionReport;
}

export const StepByStepSection: React.FC<StepByStepSectionProps> = ({ report }) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({
    1: true,
    3: true,
    4: true,
    5: true,
  });
  const [expandAll, setExpandAll] = useState<boolean>(false);
  const [normAnimProgress, setNormAnimProgress] = useState<number>(100);

  // Reset normalization animation when input or precision changes
  useEffect(() => {
    setNormAnimProgress(100);
  }, [report.original_input, report.precision]);

  const toggleStep = (stepNumber: number) => {
    setActiveStep(stepNumber);
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  const handleToggleExpandAll = () => {
    const nextExpandAll = !expandAll;
    setExpandAll(nextExpandAll);
    if (nextExpandAll) {
      const allOpen: Record<number, boolean> = {};
      for (let i = 1; i <= 9; i++) {
        allOpen[i] = true;
      }
      setExpandedSteps(allOpen);
    } else {
      setExpandedSteps({ [activeStep]: true });
    }
  };

  const goToStep = (target: number) => {
    const clamped = Math.max(1, Math.min(9, target));
    setActiveStep(clamped);
    setExpandedSteps((prev) => ({
      ...prev,
      [clamped]: true,
    }));
  };

  const replayNormalizationShift = () => {
    setNormAnimProgress(0);
    window.setTimeout(() => {
      setNormAnimProgress(100);
    }, 60);
  };

  const renderStepSpecificContent = (step: ConversionStep) => {
    const {
      format,
      step3_integer,
      step3_fraction,
      step4_normalization,
      step5_biased_exponent,
      step6_fraction_field,
      step7_assembly,
      step8_hex_rows,
      step9_interpretation,
    } = report;

    switch (step.step_number) {
      case 1:
        return (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
              <div className="p-3 rounded-md bg-[#181C14] text-[#ECDFCC]">
                <span className="text-[#ECDFCC]/65 block">Input Decimal</span>
                <span className="font-mono font-bold text-sm mt-0.5 block break-all">
                  {report.original_input}
                </span>
              </div>
              <div className="p-3 rounded-md bg-[#181C14] text-[#ECDFCC]">
                <span className="text-[#ECDFCC]/65 block">Precision</span>
                <span className="font-mono font-bold text-sm mt-0.5 block">
                  {format.standard_name}
                </span>
              </div>
              <div className="p-3 rounded-md bg-[#181C14] text-[#ECDFCC]">
                <span className="text-[#ECDFCC]/65 block">Sign / Exp / Frac</span>
                <span className="font-mono font-bold text-sm mt-0.5 block">
                  {format.sign_bits} / {format.exponent_bits} / {format.fraction_bits} bits
                </span>
              </div>
              <div className="p-3 rounded-md bg-[#181C14] text-[#ECDFCC]">
                <span className="text-[#ECDFCC]/65 block">Total Bits</span>
                <span className="font-mono font-bold text-sm mt-0.5 block">
                  {format.total_bits} bits
                </span>
              </div>
              <div className="p-3 rounded-md bg-[#181C14] text-[#ECDFCC] col-span-2 sm:col-span-1">
                <span className="text-[#ECDFCC]/65 block">Format Bias</span>
                <span className="font-mono font-bold text-sm mt-0.5 block">{format.bias}</span>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div
              className={`p-3.5 rounded-lg border ${
                report.sign_bit === 0
                  ? 'bg-[#181C14] text-[#ECDFCC] border-[#181C14]'
                  : 'bg-[#ECDFCC]/60 text-[#3C3D37] border-[#181C14]/15'
              }`}
            >
              <div className="flex items-center justify-between font-mono font-bold">
                <span>Positive Value / +0</span>
                <span className="px-2 py-0.5 rounded bg-[#697565] text-[#ECDFCC]">Sign = 0</span>
              </div>
              <p className="mt-1 opacity-85">
                Numbers ≥ +0 set the most significant bit (Bit {format.total_bits - 1}) to 0.
              </p>
            </div>
            <div
              className={`p-3.5 rounded-lg border ${
                report.sign_bit === 1
                  ? 'bg-[#181C14] text-[#ECDFCC] border-[#181C14]'
                  : 'bg-[#ECDFCC]/60 text-[#3C3D37] border-[#181C14]/15'
              }`}
            >
              <div className="flex items-center justify-between font-mono font-bold">
                <span>Negative Value / -0</span>
                <span className="px-2 py-0.5 rounded bg-[#697565] text-[#ECDFCC]">Sign = 1</span>
              </div>
              <p className="mt-1 opacity-85">
                Numbers &lt; 0 or explicitly signed negative zero (-0) set Bit{' '}
                {format.total_bits - 1} to 1.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3A: Integer Part Repeated Division by 2 Table */}
            <div className="rounded-lg border border-[#181C14]/20 bg-[#ECDFCC] overflow-hidden">
              <div className="bg-[#181C14] text-[#ECDFCC] px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#697565] block">
                    Step 3A — Integer Part
                  </span>
                  <h4 className="text-sm font-bold">
                    Repeated Division by 2 ({step3_integer.decimal_integer}₁₀ →{' '}
                    {step3_integer.binary_string}₂)
                  </h4>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-[#3C3D37] px-2.5 py-1 rounded text-[#ECDFCC]">
                  <ArrowUp className="w-3.5 h-3.5 text-[#697565]" />
                  Read Bottom-to-Top
                </span>
              </div>

              <div className="p-3 text-xs text-[#3C3D37] border-b border-[#181C14]/10">
                {step3_integer.reading_order_note}
              </div>

              {step3_integer.rows.length > 0 ? (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-[#3C3D37]/10 text-[#181C14] border-b border-[#181C14]/15">
                        <th className="py-2 px-3 font-semibold">Division</th>
                        <th className="py-2 px-3 font-semibold text-right">Quotient</th>
                        <th className="py-2 px-3 font-semibold text-right">Remainder (↑)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#181C14]/10">
                      {step3_integer.rows.map((row, idx) => {
                        const isLast = idx === step3_integer.rows.length - 1;
                        return (
                          <tr
                            key={`int-div-${row.step}`}
                            className={isLast ? 'bg-[#697565]/15 font-semibold' : ''}
                          >
                            <td className="py-2 px-3 text-[#181C14]">{row.expression}</td>
                            <td className="py-2 px-3 text-right text-[#3C3D37]">{row.quotient}</td>
                            <td className="py-2 px-3 text-right">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#181C14] text-[#ECDFCC] font-bold">
                                {row.remainder}
                              </span>
                              {isLast && (
                                <span className="ml-1.5 text-[10px] text-[#697565] font-bold">
                                  MSB
                                </span>
                              )}
                              {idx === 0 && step3_integer.rows.length > 1 && (
                                <span className="ml-1.5 text-[10px] text-[#3C3D37]">LSB</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-xs text-[#3C3D37]">{step3_integer.explanation}</div>
              )}

              {step3_integer.truncated_table && (
                <div className="px-3 py-2 bg-[#3C3D37]/10 text-[11px] text-[#3C3D37] border-t border-[#181C14]/10">
                  Showing representative rows out of {step3_integer.total_divisions} total divisions
                  by 2. Complete integer binary: <code className="font-bold">{step3_integer.binary_string}₂</code>
                </div>
              )}
            </div>

            {/* 3B: Fractional Part Repeated Multiplication by 2 Table */}
            <div className="rounded-lg border border-[#181C14]/20 bg-[#ECDFCC] overflow-hidden">
              <div className="bg-[#181C14] text-[#ECDFCC] px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#697565] block">
                    Step 3B — Fractional Part
                  </span>
                  <h4 className="text-sm font-bold">
                    Repeated Multiplication by 2 ({step3_fraction.decimal_fraction}₁₀ → .
                    {step3_fraction.binary_string}₂)
                  </h4>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-[#3C3D37] px-2.5 py-1 rounded text-[#ECDFCC]">
                  <ArrowDown className="w-3.5 h-3.5 text-[#697565]" />
                  Read Top-to-Bottom
                </span>
              </div>

              <div className="p-3 text-xs text-[#3C3D37] border-b border-[#181C14]/10 flex flex-wrap items-center justify-between gap-2">
                <span>
                  {step3_fraction.terminates
                    ? 'Exact terminating binary fraction (remaining fraction reaches 0).'
                    : 'Non-terminating binary fraction — rounded in Step 6 via IEEE 754 rules.'}
                </span>
                {step3_fraction.is_repeating && (
                  <span className="px-2 py-0.5 rounded bg-[#697565] text-[#ECDFCC] font-mono text-[10px] font-bold">
                    Repeating Cycle Detected
                  </span>
                )}
              </div>

              {step3_fraction.rows.length > 0 ? (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-[#3C3D37]/10 text-[#181C14] border-b border-[#181C14]/15">
                        <th className="py-2 px-2.5 font-semibold">Step</th>
                        <th className="py-2 px-2.5 font-semibold">Fraction × 2</th>
                        <th className="py-2 px-2.5 font-semibold text-center">Integer Bit (↓)</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Remaining Fraction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#181C14]/10">
                      {step3_fraction.rows.map((row) => (
                        <tr
                          key={`frac-mul-${row.step}`}
                          className={row.note ? 'bg-[#697565]/15' : ''}
                        >
                          <td className="py-2 px-2.5 text-[#3C3D37]">{row.step}</td>
                          <td className="py-2 px-2.5 text-[#181C14]">{row.expression}</td>
                          <td className="py-2 px-2.5 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#697565] text-[#ECDFCC] font-bold">
                              {row.integer_bit}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-right text-[#181C14]">
                            <div>{row.remaining_fraction}</div>
                            {row.note && (
                              <div className="text-[10px] font-sans text-[#697565] font-semibold">
                                {row.note}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-xs text-[#3C3D37]">{step3_fraction.explanation}</div>
              )}

              {!step3_fraction.terminates && (
                <div className="px-3 py-2 bg-[#3C3D37]/10 text-[11px] text-[#3C3D37] border-t border-[#181C14]/10">
                  Displaying first {step3_fraction.rows.length} steps ({step3_fraction.total_steps_computed}{' '}
                  bits computed internally for exact IEEE 754 Guard/Round/Sticky rounding).
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="mt-4 rounded-lg bg-[#181C14] text-[#ECDFCC] p-4 sm:p-5 border border-[#3C3D37]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="text-xs font-mono uppercase tracking-wider text-[#697565]">
                Binary Point Shift Visualization
              </div>
              {!step4_normalization.is_zero && !step4_normalization.is_special && (
                <button
                  type="button"
                  onClick={replayNormalizationShift}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#3C3D37] hover:bg-[#697565] text-xs text-[#ECDFCC] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replay Point Movement</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center font-mono">
              <div className="p-3 rounded bg-[#3C3D37]/60 border border-[#ECDFCC]/15">
                <span className="text-[10px] uppercase text-[#ECDFCC]/65 block">
                  1. Before Normalization
                </span>
                <span className="text-sm sm:text-base font-bold text-[#ECDFCC] break-all mt-1 block">
                  {step4_normalization.unnormalized_binary}₂
                </span>
              </div>

              <div className="flex flex-col items-center justify-center py-2 px-3 rounded bg-[#697565]/25 border border-[#697565]/50 text-center">
                <span className="text-[11px] font-bold text-[#ECDFCC]">
                  {step4_normalization.shift_direction === 'left'
                    ? `← Shift Binary Point Left by ${step4_normalization.shift_amount}`
                    : step4_normalization.shift_direction === 'right'
                      ? `Shift Binary Point Right by ${step4_normalization.shift_amount} →`
                      : 'Binary Point Shift = 0'}
                </span>
                <div className="w-full h-1.5 bg-[#181C14] rounded-full overflow-hidden mt-2">
                  <div
                    style={{ width: `${normAnimProgress}%` }}
                    className="h-full bg-[#ECDFCC] transition-all duration-500 ease-out"
                  />
                </div>
                <span className="text-[10px] text-[#ECDFCC]/80 mt-1">
                  Unbiased Exponent e = {step4_normalization.unbiased_exponent}
                </span>
              </div>

              <div className="p-3 rounded bg-[#697565] text-[#ECDFCC] border border-[#ECDFCC]/30">
                <span className="text-[10px] uppercase text-[#ECDFCC]/80 block">
                  2. Normalized Form
                </span>
                <span className="text-sm sm:text-base font-bold break-all mt-1 block">
                  {step4_normalization.normalized_expression}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#ECDFCC]/15 flex flex-wrap items-center justify-between gap-2 text-xs text-[#ECDFCC]/85">
              <span>
                Implicit Leading Bit:{' '}
                <strong className="font-mono text-[#ECDFCC]">
                  {step4_normalization.implicit_leading_bit}
                </strong>{' '}
                (
                {step4_normalization.is_hidden_bit_stored
                  ? 'Hidden — omitted from stored fraction field'
                  : 'Special / Subnormal rule'}
                )
              </span>
              <span className="font-mono font-bold text-[#ECDFCC]">
                Unbiased Exponent = {step4_normalization.unbiased_exponent}
              </span>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#181C14] text-[#ECDFCC]">
                <span className="text-[#ECDFCC]/65 block text-[10px] uppercase">
                  Unbiased Exponent (e)
                </span>
                <span className="text-lg font-bold mt-1 block">
                  {step5_biased_exponent.unbiased_exponent}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#181C14] text-[#ECDFCC]">
                <span className="text-[#ECDFCC]/65 block text-[10px] uppercase">
                  {format.name} Bias
                </span>
                <span className="text-lg font-bold mt-1 block">
                  + {step5_biased_exponent.bias}{' '}
                  <span className="text-xs font-normal text-[#ECDFCC]/70">
                    (2^({format.exponent_bits}-1)-1)
                  </span>
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#697565] text-[#ECDFCC]">
                <span className="text-[#ECDFCC]/85 block text-[10px] uppercase">
                  Biased Exponent Result
                </span>
                <span className="text-lg font-bold mt-1 block">
                  {step5_biased_exponent.biased_exponent_decimal}₁₀ ={' '}
                  {step5_biased_exponent.biased_exponent_binary}₂
                </span>
              </div>
            </div>

            {/* Biased Exponent Division Table */}
            <div className="rounded-lg border border-[#181C14]/20 bg-[#ECDFCC] overflow-hidden">
              <div className="bg-[#3C3D37] text-[#ECDFCC] px-4 py-2.5 flex items-center justify-between text-xs">
                <span className="font-bold">
                  Convert Biased Exponent ({step5_biased_exponent.biased_exponent_decimal}₁₀) to{' '}
                  {format.exponent_bits}-Bit Binary
                </span>
                <span className="font-mono">
                  Result: {step5_biased_exponent.biased_exponent_binary}₂
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-[#3C3D37]/10 text-[#181C14] border-b border-[#181C14]/15">
                      <th className="py-2 px-3 font-semibold">Step</th>
                      <th className="py-2 px-3 font-semibold">Division</th>
                      <th className="py-2 px-3 font-semibold text-right">Quotient</th>
                      <th className="py-2 px-3 font-semibold text-right">Remainder (↑)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181C14]/10">
                    {step5_biased_exponent.division_rows.map((row) => (
                      <tr key={`exp-div-${row.step}`}>
                        <td className="py-1.5 px-3 text-[#3C3D37]">{row.step}</td>
                        <td className="py-1.5 px-3 text-[#181C14]">{row.expression}</td>
                        <td className="py-1.5 px-3 text-right text-[#3C3D37]">{row.quotient}</td>
                        <td className="py-1.5 px-3 text-right font-bold text-[#181C14]">
                          {row.remainder}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-[#181C14] text-[#ECDFCC] p-4 border border-[#3C3D37] font-mono text-xs space-y-3">
              <div>
                <span className="text-[10px] uppercase text-[#ECDFCC]/65 block">
                  Significand Before Encoding
                </span>
                <div className="mt-1 text-sm font-bold break-all">
                  <span className="px-1.5 py-0.5 rounded bg-[#697565] text-[#ECDFCC] mr-1">
                    {step6_fraction_field.hidden_leading_bit}.
                  </span>
                  <span>{step6_fraction_field.raw_fraction_bits}</span>
                  {step6_fraction_field.extra_bits_preview && (
                    <span className="text-[#ECDFCC]/50 ml-1">
                      [{step6_fraction_field.extra_bits_preview}...]
                    </span>
                  )}
                </div>
              </div>

              {step6_fraction_field.guard_bit !== null && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#ECDFCC]/15">
                  <div className="p-2 rounded bg-[#3C3D37]/70">
                    <span className="text-[10px] text-[#ECDFCC]/70 block">Guard Bit (G)</span>
                    <span className="text-sm font-bold">{step6_fraction_field.guard_bit}</span>
                  </div>
                  <div className="p-2 rounded bg-[#3C3D37]/70">
                    <span className="text-[10px] text-[#ECDFCC]/70 block">Round Bit (R)</span>
                    <span className="text-sm font-bold">{step6_fraction_field.round_bit}</span>
                  </div>
                  <div className="p-2 rounded bg-[#3C3D37]/70">
                    <span className="text-[10px] text-[#ECDFCC]/70 block">Sticky Bit (S)</span>
                    <span className="text-sm font-bold">{step6_fraction_field.sticky_bit}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[#ECDFCC]/15">
                <div className="flex items-center justify-between text-[10px] uppercase text-[#ECDFCC]/75">
                  <span>Final {step6_fraction_field.target_bit_length}-Bit Fraction Field</span>
                  <span>
                    {step6_fraction_field.rounding_occurred
                      ? `Rounded ${step6_fraction_field.rounding_direction.toUpperCase()} (${step6_fraction_field.rounding_mode})`
                      : `Exact (${step6_fraction_field.padded_zeros_count} trailing zeros padded)`}
                  </span>
                </div>
                <div className="mt-1 p-2.5 rounded bg-[#3C3D37] text-[#ECDFCC] font-bold text-xs sm:text-sm break-all">
                  {step6_fraction_field.final_fraction_bits}
                </div>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="mt-4 rounded-lg bg-[#181C14] text-[#ECDFCC] p-4 border border-[#3C3D37]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs font-mono text-[#ECDFCC]/80">
                {step7_assembly.addition_formula}
              </span>
              <CopyButton
                value={report.complete_bit_pattern}
                label="Copy Complete Bit Pattern"
                variant="light"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 font-mono text-xs">
              <div className="md:col-span-2 p-2.5 rounded bg-[#ECDFCC] text-[#181C14]">
                <span className="text-[10px] font-bold uppercase block">SIGN (1b)</span>
                <span className="text-base font-bold mt-0.5 block">{report.sign_bit_str}</span>
              </div>
              <div className="md:col-span-3 p-2.5 rounded bg-[#697565] text-[#ECDFCC]">
                <span className="text-[10px] font-bold uppercase block">
                  EXPONENT ({format.exponent_bits}b)
                </span>
                <span className="text-sm sm:text-base font-bold mt-0.5 block break-all">
                  {report.exponent_bits}
                </span>
              </div>
              <div className="md:col-span-7 p-2.5 rounded bg-[#3C3D37] text-[#ECDFCC] border border-[#ECDFCC]/20">
                <span className="text-[10px] font-bold uppercase block">
                  FRACTION ({format.fraction_bits}b)
                </span>
                <span className="text-xs sm:text-sm font-bold mt-0.5 block break-all">
                  {report.fraction_bits}
                </span>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-lg bg-[#181C14] text-[#ECDFCC]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#ECDFCC]/70 block">
                  Hexadecimal Encoding ({format.hex_digits} Hex Digits)
                </span>
                <span className="font-mono text-lg sm:text-xl font-bold">{report.hexadecimal}</span>
              </div>
              <CopyButton value={report.hexadecimal} label="Copy Hexadecimal" variant="light" />
            </div>

            <div className="rounded-lg border border-[#181C14]/20 bg-[#ECDFCC] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-[#3C3D37] text-[#ECDFCC]">
                      <th className="py-2 px-3 font-semibold">Group #</th>
                      <th className="py-2 px-3 font-semibold">Bit Positions</th>
                      <th className="py-2 px-3 font-semibold">Binary Group (4 Bits)</th>
                      <th className="py-2 px-3 font-semibold text-center">Decimal</th>
                      <th className="py-2 px-3 font-semibold text-center">Hex Digit</th>
                      <th className="py-2 px-3 font-semibold text-right">IEEE 754 Field Span</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181C14]/10">
                    {step8_hex_rows.map((row) => (
                      <tr key={`hex-nibble-${row.group_index}`}>
                        <td className="py-2 px-3 text-[#3C3D37]">#{row.group_index}</td>
                        <td className="py-2 px-3 text-[#3C3D37]">{row.bit_range}</td>
                        <td className="py-2 px-3 font-bold text-[#181C14]">{row.binary_group}</td>
                        <td className="py-2 px-3 text-center text-[#3C3D37]">{row.decimal_value}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#181C14] text-[#ECDFCC] font-bold">
                            {row.hex_digit}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-sans text-[#3C3D37]">
                          {row.spanning_fields}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-[#181C14] text-[#ECDFCC]">
              <span className="text-[10px] uppercase text-[#ECDFCC]/65 block">
                Original Input Decimal
              </span>
              <span className="text-sm font-bold mt-1 block break-all">
                {step9_interpretation.original_input}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-[#181C14] text-[#ECDFCC]">
              <span className="text-[10px] uppercase text-[#ECDFCC]/65 block">
                Actual Stored Value in {format.standard_name}
              </span>
              <span className="text-sm font-bold mt-1 block break-all">
                {step9_interpretation.represented_decimal_exact}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-[#697565] text-[#ECDFCC]">
              <span className="text-[10px] uppercase text-[#ECDFCC]/85 block">
                Representation Difference
              </span>
              <span className="text-sm font-bold mt-1 block break-all">
                {step9_interpretation.approximation_error}
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section
      id="step-by-step"
      aria-labelledby="step-by-step-heading"
      className="py-10 border-t border-[#181C14]/15"
    >
      {/* Header & Sequential Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#697565] mb-1">
            Handwritten-Style Mathematical Derivation
          </p>
          <h2
            id="step-by-step-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#181C14]"
          >
            Step-by-Step Conversion Engine (Steps 1–9)
          </h2>
          <p className="text-sm text-[#3C3D37] mt-1">
            Follow each mathematical derivation sequentially using Previous / Next or expand any
            step directly.
          </p>
        </div>

        {/* Sequential Navigation Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => goToStep(activeStep - 1)}
            disabled={activeStep <= 1}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-[#181C14]/25 bg-[#ECDFCC] text-[#181C14] hover:bg-[#181C14] hover:text-[#ECDFCC] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous Step</span>
          </button>

          <span className="text-xs font-mono font-bold px-3 py-2 rounded-md bg-[#3C3D37] text-[#ECDFCC]">
            Step {activeStep} of 9
          </span>

          <button
            type="button"
            onClick={() => goToStep(activeStep + 1)}
            disabled={activeStep >= 9}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-[#181C14] bg-[#181C14] text-[#ECDFCC] hover:bg-[#3C3D37] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <span>Next Step</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-[#697565] bg-[#697565]/15 text-[#181C14] hover:bg-[#697565] hover:text-[#ECDFCC] transition-colors cursor-pointer"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            <span>{expandAll ? 'Collapse Inactive' : 'Expand All 9 Steps'}</span>
          </button>
        </div>
      </div>

      {/* Step Progress Pill Selector */}
      <div
        className="flex flex-wrap gap-1.5 mb-6"
        role="navigation"
        aria-label="Conversion Step Selector"
      >
        {report.steps.map((s) => {
          const isCurrent = activeStep === s.step_number;
          const isOpen = !!expandedSteps[s.step_number];
          return (
            <button
              key={`pill-${s.step_number}`}
              type="button"
              onClick={() => goToStep(s.step_number)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer border ${
                isCurrent
                  ? 'bg-[#181C14] text-[#ECDFCC] border-[#181C14]'
                  : isOpen
                    ? 'bg-[#697565]/25 text-[#181C14] border-[#697565]'
                    : 'bg-[#ECDFCC] text-[#3C3D37] border-[#181C14]/20 hover:border-[#181C14]'
              }`}
            >
              {s.step_number}. {s.title.split(' ')[0]}
            </button>
          );
        })}
      </div>

      {/* 9 Structured Step Sections */}
      <div className="space-y-4">
        {report.steps.map((step) => {
          const isExpanded = !!expandedSteps[step.step_number];
          const isFocused = activeStep === step.step_number;

          return (
            <article
              key={`step-card-${step.step_number}`}
              id={`conversion-step-${step.step_number}`}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isFocused
                  ? 'border-[#181C14] bg-[#ECDFCC] ring-1 ring-[#181C14]/30'
                  : 'border-[#181C14]/20 bg-[#ECDFCC]/70'
              }`}
            >
              {/* Step Header (always visible, shows concise summary & calculated result) */}
              <button
                type="button"
                onClick={() => toggleStep(step.step_number)}
                aria-expanded={isExpanded}
                className="w-full text-left px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#181C14]/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <span
                    className={`w-8 h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                      isFocused
                        ? 'bg-[#181C14] text-[#ECDFCC]'
                        : 'bg-[#3C3D37] text-[#ECDFCC]'
                    }`}
                  >
                    {step.step_number}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-[#181C14]">
                        STEP {step.step_number} — {step.title}
                      </h3>
                      <span className="text-xs text-[#697565] font-medium hidden md:inline">
                        • {step.subtitle}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#3C3D37] mt-0.5 line-clamp-2">
                      {step.concise_explanation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-[#181C14]/10 text-[#181C14] max-w-[240px] truncate">
                    {step.calculated_result}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[#181C14]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#3C3D37]" />
                  )}
                </div>
              </button>

              {/* Expanded Step Details */}
              {isExpanded && (
                <div className="px-4 sm:px-6 pb-5 pt-2 border-t border-[#181C14]/10 space-y-4">
                  {/* Mathematical Formula & Populated Formula Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-[#181C14]/[0.05] border border-[#181C14]/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#697565] block">
                        Mathematical Formula
                      </span>
                      <code className="font-mono text-[#181C14] font-semibold mt-1 block break-words">
                        {step.formula}
                      </code>
                    </div>

                    <div className="p-3 rounded-lg bg-[#181C14]/[0.05] border border-[#181C14]/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#697565] block">
                        Populated with Input Values
                      </span>
                      <code className="font-mono text-[#181C14] font-semibold mt-1 block break-words">
                        {step.populated_formula}
                      </code>
                    </div>

                    <div className="p-3 rounded-lg bg-[#181C14] text-[#ECDFCC]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#697565] block">
                        Calculated Step Result
                      </span>
                      <code className="font-mono text-[#ECDFCC] font-bold mt-1 block break-all">
                        {step.calculated_result}
                      </code>
                    </div>
                  </div>

                  {/* Step-Specific Tables & Interactive Visualizations */}
                  {renderStepSpecificContent(step)}

                  {/* Connection to Next Step */}
                  <div className="pt-3 border-t border-[#181C14]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#3C3D37]">
                    <p>
                      <strong className="text-[#181C14]">Next Step Connection:</strong>{' '}
                      {step.next_step_connection}
                    </p>
                    {step.step_number < 9 && (
                      <button
                        type="button"
                        onClick={() => goToStep(step.step_number + 1)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#181C14] hover:text-[#697565] shrink-0 cursor-pointer"
                      >
                        <span>Continue to Step {step.step_number + 1}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};
