import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import type { ConversionReport } from '../types/ieee754';
import { CopyButton } from './CopyButton';

interface FinalResultSectionProps {
  report: ConversionReport;
}

export const FinalResultSection: React.FC<FinalResultSectionProps> = ({ report }) => {
  const { format, step9_interpretation, parsing_policy_note } = report;

  return (
    <section
      id="final-result"
      aria-labelledby="final-result-heading"
      className="py-10 border-t border-[#181C14]/15"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#697565] mb-1">
            Step 9 — Final Verification & Mathematical Interpretation
          </p>
          <h2
            id="final-result-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#181C14]"
          >
            Final Result & Representation Analysis
          </h2>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#181C14] text-[#ECDFCC] text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 text-[#697565] shrink-0" />
          <span>
            Verified vs Rust{' '}
            {report.precision === 'single' ? 'f32::to_bits()' : 'f64::to_bits()'}
          </span>
        </div>
      </div>

      {/* Main Summary Card */}
      <div className="rounded-xl bg-[#181C14] text-[#ECDFCC] p-5 sm:p-7 border border-[#3C3D37] space-y-6">
        {/* Top Row: Hexadecimal + Complete Bit Pattern */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-6 border-b border-[#ECDFCC]/15">
          <div className="lg:col-span-4 p-4 rounded-lg bg-[#3C3D37]/70 border border-[#ECDFCC]/15 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-[#ECDFCC]/70 font-semibold">
                Hexadecimal Representation
              </span>
              <CopyButton value={report.hexadecimal} label="Copy Hex" variant="light" />
            </div>
            <div className="mt-3 font-mono text-2xl sm:text-3xl font-bold text-[#ECDFCC] tracking-tight break-all">
              {report.hexadecimal}
            </div>
            <div className="mt-2 text-xs text-[#ECDFCC]/70 font-mono">
              {step9_interpretation.precision_name} • {step9_interpretation.category_label}
            </div>
          </div>

          <div className="lg:col-span-8 p-4 rounded-lg bg-[#3C3D37]/70 border border-[#ECDFCC]/15 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-[#ECDFCC]/70 font-semibold">
                Complete {format.total_bits}-Bit IEEE 754 Pattern
              </span>
              <CopyButton
                value={report.complete_bit_pattern}
                label="Copy Bit Pattern"
                variant="light"
              />
            </div>
            <div className="mt-3 font-mono text-xs sm:text-sm md:text-base font-bold text-[#ECDFCC] break-all leading-relaxed select-all">
              {report.complete_bit_pattern}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-[#ECDFCC]/80">
              <span>Sign: {report.sign_bit_str}</span>
              <span>
                Exponent: {report.exponent_bits} ({step9_interpretation.biased_exponent_decimal}₁₀,
                e = {step9_interpretation.unbiased_exponent_decimal})
              </span>
              <span>Fraction: {format.fraction_bits} bits</span>
            </div>
          </div>
        </div>

        {/* Middle Grid: All Required Step 9 Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#3C3D37]/45 border border-[#ECDFCC]/10">
            <span className="text-[10px] uppercase tracking-wider text-[#ECDFCC]/65 block">
              Original Decimal Input
            </span>
            <span className="font-mono text-base font-bold text-[#ECDFCC] mt-1 block break-all">
              {step9_interpretation.original_input}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#3C3D37]/45 border border-[#ECDFCC]/10">
            <span className="text-[10px] uppercase tracking-wider text-[#ECDFCC]/65 block">
              Selected Precision
            </span>
            <span className="font-mono text-base font-bold text-[#ECDFCC] mt-1 block">
              {step9_interpretation.precision_name}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#3C3D37]/45 border border-[#ECDFCC]/10">
            <span className="text-[10px] uppercase tracking-wider text-[#ECDFCC]/65 block">
              Sign Bit & Polarity
            </span>
            <span className="font-mono text-base font-bold text-[#ECDFCC] mt-1 block">
              {step9_interpretation.sign_bit} ({step9_interpretation.sign_symbol})
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#3C3D37]/45 border border-[#ECDFCC]/10">
            <span className="text-[10px] uppercase tracking-wider text-[#ECDFCC]/65 block">
              Exponent Field ({format.exponent_bits} bits)
            </span>
            <span className="font-mono text-sm font-bold text-[#ECDFCC] mt-1 block break-all">
              {step9_interpretation.exponent_field_binary}₂ (Biased:{' '}
              {step9_interpretation.biased_exponent_decimal}, Unbiased:{' '}
              {step9_interpretation.unbiased_exponent_decimal})
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#3C3D37]/45 border border-[#ECDFCC]/10 sm:col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-[#ECDFCC]/65 block">
              Fraction Field ({format.fraction_bits} bits)
            </span>
            <span className="font-mono text-sm font-bold text-[#ECDFCC] mt-1 block break-all">
              {step9_interpretation.fraction_field_binary}₂
            </span>
          </div>
        </div>

        {/* Exact Represented Decimal Value & Rounding Analysis */}
        <div className="rounded-lg bg-[#697565]/25 border border-[#697565] p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ECDFCC]">
              Representation Accuracy & Rounding Status
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                step9_interpretation.is_exact_representation
                  ? 'bg-[#ECDFCC] text-[#181C14]'
                  : 'bg-[#3C3D37] text-[#ECDFCC] border border-[#ECDFCC]/30'
              }`}
            >
              {step9_interpretation.is_exact_representation
                ? 'Exact Binary Representation (Zero Error)'
                : 'Rounded to Nearest IEEE 754 Value'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded bg-[#181C14]/85 border border-[#ECDFCC]/15">
              <span className="text-[10px] uppercase text-[#ECDFCC]/65 block">
                Exact Decimal Value Stored by Encoding
              </span>
              <span className="text-sm font-bold text-[#ECDFCC] mt-1 block break-all">
                {step9_interpretation.represented_decimal_exact}
              </span>
            </div>
            <div className="p-3 rounded bg-[#181C14]/85 border border-[#ECDFCC]/15">
              <span className="text-[10px] uppercase text-[#ECDFCC]/65 block">
                Difference (Stored Value − Input)
              </span>
              <span className="text-sm font-bold text-[#ECDFCC] mt-1 block break-all">
                {step9_interpretation.approximation_error}
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#ECDFCC]/95 leading-relaxed">
            {step9_interpretation.accuracy_explanation}
          </p>

          <div className="text-xs font-mono text-[#ECDFCC]/80 pt-2 border-t border-[#ECDFCC]/15 break-all">
            Reconstruction Formula: {step9_interpretation.reconstruction_formula}
          </div>
        </div>

        {/* Documented Parsing Policy Disclosure */}
        <div className="flex items-start gap-2.5 text-xs text-[#ECDFCC]/75 pt-2">
          <Info className="w-4 h-4 text-[#697565] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#ECDFCC]">Technical Parsing & Precision Policy:</strong>{' '}
            {parsing_policy_note}
          </p>
        </div>
      </div>
    </section>
  );
};
