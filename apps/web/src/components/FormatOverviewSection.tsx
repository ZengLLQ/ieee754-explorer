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
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-[#697565] mb-1.5">
            Spesifikasi Arsitektur Format
          </p>
          <h2
            id="format-overview-heading"
            className="text-2xl sm:text-4xl font-bold tracking-tight text-[#181C14]"
          >
            {format.standard_name} — {format.name} (Tata Letak {format.total_bits}-Bit)
          </h2>
        </div>
        <div className="text-xs sm:text-sm font-mono bg-[#181C14] text-[#ECDFCC] px-4 py-2.5 rounded-lg self-start md:self-auto shadow-xs">
          1 Sign + {format.exponent_bits} Exponent + {format.fraction_bits} Fraction ={' '}
          {format.total_bits} Bit
        </div>
      </div>

      {/* Proportional visual format bar: Sign | Exponent | Fraction */}
      <div className="rounded-xl border border-[#181C14]/20 bg-[#181C14] p-5 sm:p-6 text-[#ECDFCC] mb-6 shadow-sm">
        <div className="flex items-center justify-between text-xs sm:text-sm text-[#ECDFCC]/75 mb-2.5 font-mono">
          <span>MSB (Bit {format.total_bits - 1})</span>
          <span className="font-sans font-semibold">Alokasi Proporsional Panjang Bit</span>
          <span>LSB (Bit 0)</span>
        </div>

        <div
          className="flex w-full rounded-lg overflow-hidden border border-[#ECDFCC]/20 min-h-[68px]"
          role="group"
          aria-label="IEEE 754 bit layout proportions"
        >
          {/* Sign Segment */}
          <div
            style={{ width: `${signPct}%` }}
            className="bg-[#ECDFCC] text-[#181C14] px-3 py-2.5 flex flex-col justify-between border-r border-[#181C14]/30 transition-all duration-300"
          >
            <span className="text-xs font-bold uppercase tracking-wider">Sign</span>
            <span className="font-mono text-sm sm:text-base font-bold">{format.sign_bits}b</span>
          </div>

          {/* Exponent Segment */}
          <div
            style={{ width: `${expPct}%` }}
            className="bg-[#697565] text-[#ECDFCC] px-3.5 py-2.5 flex flex-col justify-between border-r border-[#181C14]/40 transition-all duration-300"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold uppercase tracking-wider">
                Exponent
              </span>
              <span className="text-xs font-mono opacity-85 hidden sm:inline">
                Bias = {format.bias}
              </span>
            </div>
            <span className="font-mono text-sm sm:text-base font-bold">
              {format.exponent_bits} bit (Bit {format.total_bits - 2}..{format.fraction_bits})
            </span>
          </div>

          {/* Fraction Segment */}
          <div
            style={{ width: `${fracPct}%` }}
            className="bg-[#3C3D37] text-[#ECDFCC] px-3.5 py-2.5 flex flex-col justify-between transition-all duration-300"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Fraction (Significand)
              </span>
              <span className="text-xs font-mono opacity-85 hidden md:inline">
                Implicit Leading {report.step4_normalization.implicit_leading_bit}.
              </span>
            </div>
            <span className="font-mono text-sm sm:text-base font-bold">
              {format.fraction_bits} bit (Bit {format.fraction_bits - 1}..0)
            </span>
          </div>
        </div>
      </div>

      {/* Parameter metric grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 text-sm">
        <div className="p-4 rounded-xl border border-[#181C14]/15 bg-[#ECDFCC] shadow-xs">
          <div className="text-xs uppercase tracking-wider text-[#3C3D37] font-semibold">
            Input Desimal
          </div>
          <div className="mt-1 font-mono text-base sm:text-lg font-bold text-[#181C14] break-all">
            {report.original_input}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#181C14]/15 bg-[#ECDFCC] shadow-xs">
          <div className="text-xs uppercase tracking-wider text-[#3C3D37] font-semibold">
            Lebar Total
          </div>
          <div className="mt-1 font-mono text-base sm:text-lg font-bold text-[#181C14]">
            {format.total_bits} bit ({format.total_bits / 8} byte)
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#181C14]/15 bg-[#ECDFCC] shadow-xs">
          <div className="text-xs uppercase tracking-wider text-[#3C3D37] font-semibold">
            Field Sign
          </div>
          <div className="mt-1 font-mono text-base sm:text-lg font-bold text-[#181C14]">
            {format.sign_bits} bit (Bit {format.total_bits - 1})
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#181C14]/15 bg-[#ECDFCC] shadow-xs">
          <div className="text-xs uppercase tracking-wider text-[#3C3D37] font-semibold">
            Field Exponent
          </div>
          <div className="mt-1 font-mono text-base sm:text-lg font-bold text-[#181C14]">
            {format.exponent_bits} bit
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#181C14]/15 bg-[#ECDFCC] shadow-xs">
          <div className="text-xs uppercase tracking-wider text-[#3C3D37] font-semibold">
            Field Fraction
          </div>
          <div className="mt-1 font-mono text-base sm:text-lg font-bold text-[#181C14]">
            {format.fraction_bits} bit
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#181C14]/15 bg-[#ECDFCC] shadow-xs">
          <div className="text-xs uppercase tracking-wider text-[#3C3D37] font-semibold">
            Bias Eksponen
          </div>
          <div className="mt-1 font-mono text-base sm:text-lg font-bold text-[#181C14]">
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
