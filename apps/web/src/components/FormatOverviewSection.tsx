import React from 'react';
import type { ConversionReport } from '../types/ieee754';

interface FormatOverviewSectionProps {
  report: ConversionReport;
}

export const FormatOverviewSection: React.FC<FormatOverviewSectionProps> = ({ report }) => {
  const { format } = report;
  const signPct = Math.max((format.sign_bits / format.total_bits) * 100, 6);
  const expPct = Math.max((format.exponent_bits / format.total_bits) * 100, 22);
  const fracPct = 100 - signPct - expPct;

  return (
    <section
      id="format-overview"
      aria-labelledby="format-overview-heading"
      className="py-10 border-t border-[#181C14]/15"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#697565] mb-1">
            Architecture Specification
          </p>
          <h2
            id="format-overview-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#181C14]"
          >
            {format.standard_name} — {format.name} ({format.total_bits}-Bit Layout)
          </h2>
        </div>
        <div className="text-xs font-mono bg-[#181C14] text-[#ECDFCC] px-3.5 py-2 rounded-md self-start md:self-auto">
          1 Sign + {format.exponent_bits} Exponent + {format.fraction_bits} Fraction ={' '}
          {format.total_bits} Bits
        </div>
      </div>

      {/* Proportional visual format bar: Sign | Exponent | Fraction */}
      <div className="rounded-lg border border-[#181C14]/20 bg-[#181C14] p-4 sm:p-5 text-[#ECDFCC] mb-6">
        <div className="flex items-center justify-between text-xs text-[#ECDFCC]/70 mb-2 font-mono">
          <span>MSB (Bit {format.total_bits - 1})</span>
          <span>Proportional Field Allocation</span>
          <span>LSB (Bit 0)</span>
        </div>

        <div
          className="flex w-full rounded-md overflow-hidden border border-[#ECDFCC]/20 min-h-[60px]"
          role="group"
          aria-label="IEEE 754 bit layout proportions"
        >
          {/* Sign Segment */}
          <div
            style={{ width: `${signPct}%` }}
            className="bg-[#ECDFCC] text-[#181C14] px-2 py-2.5 flex flex-col justify-between border-r border-[#181C14]/30 transition-all duration-300"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider">Sign</span>
            <span className="font-mono text-xs sm:text-sm font-bold">{format.sign_bits}b</span>
          </div>

          {/* Exponent Segment */}
          <div
            style={{ width: `${expPct}%` }}
            className="bg-[#697565] text-[#ECDFCC] px-3 py-2.5 flex flex-col justify-between border-r border-[#181C14]/40 transition-all duration-300"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                Exponent
              </span>
              <span className="text-[10px] font-mono opacity-85 hidden sm:inline">
                Bias = {format.bias}
              </span>
            </div>
            <span className="font-mono text-xs sm:text-sm font-bold">
              {format.exponent_bits} bits (Bits {format.total_bits - 2}..{format.fraction_bits})
            </span>
          </div>

          {/* Fraction Segment */}
          <div
            style={{ width: `${fracPct}%` }}
            className="bg-[#3C3D37] text-[#ECDFCC] px-3 py-2.5 flex flex-col justify-between transition-all duration-300"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                Fraction (Significand)
              </span>
              <span className="text-[10px] font-mono opacity-80 hidden md:inline">
                Implicit Leading {report.step4_normalization.implicit_leading_bit}
              </span>
            </div>
            <span className="font-mono text-xs sm:text-sm font-bold">
              {format.fraction_bits} bits (Bits {format.fraction_bits - 1}..0)
            </span>
          </div>
        </div>
      </div>

      {/* Parameter metric grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-lg border border-[#181C14]/15 bg-[#ECDFCC]">
          <div className="text-[11px] uppercase tracking-wider text-[#3C3D37] font-semibold">
            Decimal Input
          </div>
          <div className="mt-1 font-mono text-base font-bold text-[#181C14] break-all">
            {report.original_input}
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-[#181C14]/15 bg-[#ECDFCC]">
          <div className="text-[11px] uppercase tracking-wider text-[#3C3D37] font-semibold">
            Total Width
          </div>
          <div className="mt-1 font-mono text-base font-bold text-[#181C14]">
            {format.total_bits} bits ({format.total_bits / 8} bytes)
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-[#181C14]/15 bg-[#ECDFCC]">
          <div className="text-[11px] uppercase tracking-wider text-[#3C3D37] font-semibold">
            Sign Field
          </div>
          <div className="mt-1 font-mono text-base font-bold text-[#181C14]">
            {format.sign_bits} bit (Bit {format.total_bits - 1})
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-[#181C14]/15 bg-[#ECDFCC]">
          <div className="text-[11px] uppercase tracking-wider text-[#3C3D37] font-semibold">
            Exponent Field
          </div>
          <div className="mt-1 font-mono text-base font-bold text-[#181C14]">
            {format.exponent_bits} bits
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-[#181C14]/15 bg-[#ECDFCC]">
          <div className="text-[11px] uppercase tracking-wider text-[#3C3D37] font-semibold">
            Fraction Field
          </div>
          <div className="mt-1 font-mono text-base font-bold text-[#181C14]">
            {format.fraction_bits} bits
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-[#181C14]/15 bg-[#ECDFCC]">
          <div className="text-[11px] uppercase tracking-wider text-[#3C3D37] font-semibold">
            Exponent Bias
          </div>
          <div className="mt-1 font-mono text-base font-bold text-[#181C14]">
            {format.bias}{' '}
            <span className="text-xs font-normal text-[#3C3D37]">
              (2^{format.exponent_bits - 1}-1)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
