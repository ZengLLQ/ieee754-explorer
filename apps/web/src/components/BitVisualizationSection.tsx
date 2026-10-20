import React, { useState } from 'react';
import type { ConversionReport } from '../types/ieee754';
import { CopyButton } from './CopyButton';

interface BitVisualizationSectionProps {
  report: ConversionReport;
}

type SelectedFieldType = 'SIGN' | 'EXPONENT' | 'FRACTION';

export const BitVisualizationSection: React.FC<BitVisualizationSectionProps> = ({ report }) => {
  const [selectedField, setSelectedField] = useState<SelectedFieldType>('EXPONENT');
  const [selectedBitIndex, setSelectedBitIndex] = useState<number | null>(null);

  const { format, step7_assembly } = report;
  const totalBits = format.total_bits;

  const fieldDetails: Record<
    SelectedFieldType,
    {
      badge: string;
      title: string;
      bitsCount: number;
      bitRange: string;
      binaryValue: string;
      decodedSummary: string;
      purpose: string;
      formulaNote: string;
    }
  > = {
    SIGN: {
      badge: 'S — Field 1 of 3',
      title: 'SIGN FIELD (1 Bit)',
      bitsCount: format.sign_bits,
      bitRange: `Bit ${totalBits - 1} (MSB)`,
      binaryValue: report.sign_bit_str,
      decodedSummary:
        report.sign_bit === 0
          ? '0 → Positive (+1 multiplier)'
          : '1 → Negative (-1 multiplier)',
      purpose:
        'Encodes the sign of the number independently of its magnitude (sign-magnitude representation). Even zero has two signed representations: +0 (sign = 0) and -0 (sign = 1).',
      formulaNote: `(-1)^Sign = (-1)^${report.sign_bit} = ${report.sign_bit === 0 ? '+1' : '-1'}`,
    },
    EXPONENT: {
      badge: 'E — Field 2 of 3',
      title: `EXPONENT FIELD (${format.exponent_bits} Bits)`,
      bitsCount: format.exponent_bits,
      bitRange: `Bits ${totalBits - 2} down to ${format.fraction_bits}`,
      binaryValue: report.exponent_bits,
      decodedSummary: `${report.step5_biased_exponent.biased_exponent_decimal}₁₀ (Biased) → Unbiased e = ${report.step4_normalization.unbiased_exponent}`,
      purpose: `Stores the binary power-of-two scale factor using a biased unsigned integer (Bias = ${format.bias}). This allows negative and positive exponents to be compared lexicographically without a separate exponent sign bit.`,
      formulaNote: report.step5_biased_exponent.populated_formula,
    },
    FRACTION: {
      badge: 'F — Field 3 of 3',
      title: `FRACTION FIELD (${format.fraction_bits} Bits)`,
      bitsCount: format.fraction_bits,
      bitRange: `Bits ${format.fraction_bits - 1} down to 0 (LSB)`,
      binaryValue: report.fraction_bits,
      decodedSummary: `Implicit leading '${report.step4_normalization.implicit_leading_bit}.' + ${format.fraction_bits} stored fraction bits`,
      purpose: `Stores the fractional precision bits after the normalized binary point. For normal numbers, the leading '1' before the binary point is omitted (the hidden bit) to gain one extra bit of precision for free.`,
      formulaNote: `Significand = ${report.step4_normalization.implicit_leading_bit}.${report.fraction_bits.slice(0, 16)}${report.fraction_bits.length > 16 ? '...' : ''}₂`,
    },
  };

  const activeInfo = fieldDetails[selectedField];

  const handleBitClick = (msbOffset: number, field: SelectedFieldType) => {
    const bitIdx = totalBits - 1 - msbOffset;
    setSelectedField(field);
    setSelectedBitIndex(bitIdx);
  };

  // Describe an individual selected bit if clicked
  const renderBitInspector = () => {
    if (selectedBitIndex === null) return null;
    const msbOffset = totalBits - 1 - selectedBitIndex;
    const bitChar = report.complete_bit_pattern[msbOffset] ?? '0';

    let bitRole = '';
    if (selectedBitIndex === totalBits - 1) {
      bitRole = `Sign bit (MSB): value ${bitChar} (${bitChar === '1' ? 'Negative' : 'Positive'})`;
    } else if (selectedBitIndex >= format.fraction_bits) {
      const expBitPos = selectedBitIndex - format.fraction_bits;
      const weight = 1 << expBitPos;
      bitRole = `Exponent bit 2^${expBitPos} (weight ${weight}): contributes ${bitChar === '1' ? weight : 0} toward Biased Exponent ${report.step5_biased_exponent.biased_exponent_decimal}`;
    } else {
      const fracPos = format.fraction_bits - selectedBitIndex;
      bitRole = `Fraction bit 2^-${fracPos} (${fracPos} place(s) after the binary point): bit value = ${bitChar}`;
    }

    return (
      <div className="mt-3 pt-3 border-t border-[#ECDFCC]/15 flex flex-wrap items-center justify-between gap-2 text-xs text-[#ECDFCC]/90 font-mono">
        <span>
          Selected Bit <strong className="text-[#ECDFCC]">#{selectedBitIndex}</strong>: {bitRole}
        </span>
        <button
          type="button"
          onClick={() => setSelectedBitIndex(null)}
          className="text-[#ECDFCC]/70 hover:text-[#ECDFCC] underline cursor-pointer"
        >
          Clear bit selection
        </button>
      </div>
    );
  };

  return (
    <section
      id="bit-visualization"
      aria-labelledby="bit-visualization-heading"
      className="py-10 border-t border-[#181C14]/15"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#697565] mb-1">
            Interactive Bit-Level Register Map
          </p>
          <h2
            id="bit-visualization-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#181C14]"
          >
            IEEE 754 Bit-Pattern Visualization
          </h2>
          <p className="text-sm text-[#3C3D37] mt-1">
            Select <span className="font-semibold text-[#181C14]">SIGN</span>,{' '}
            <span className="font-semibold text-[#181C14]">EXPONENT</span>, or{' '}
            <span className="font-semibold text-[#181C14]">FRACTION</span> — or click any individual
            bit — to inspect how it contributes to the final encoding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CopyButton
            value={report.complete_bit_pattern}
            label={`Copy ${totalBits}-Bit Binary`}
            variant="dark"
          />
          <CopyButton value={report.hexadecimal} label={`Copy ${report.hexadecimal}`} variant="light" />
        </div>
      </div>

      {/* Main Dark Architectural Register Surface */}
      <div className="rounded-xl bg-[#181C14] text-[#ECDFCC] p-4 sm:p-6 border border-[#3C3D37] shadow-sm">
        {/* Interactive Field Selector Tabs: SIGN | EXPONENT | FRACTION */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6"
          role="tablist"
          aria-label="IEEE 754 Bit Fields"
        >
          {/* SIGN button */}
          <button
            type="button"
            role="tab"
            aria-selected={selectedField === 'SIGN'}
            onClick={() => setSelectedField('SIGN')}
            className={`text-left p-3.5 rounded-lg border transition-all duration-150 cursor-pointer ${
              selectedField === 'SIGN'
                ? 'bg-[#ECDFCC] text-[#181C14] border-[#ECDFCC] ring-2 ring-[#697565]'
                : 'bg-[#3C3D37]/60 text-[#ECDFCC] border-[#ECDFCC]/20 hover:bg-[#3C3D37]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span>[S] SIGN</span>
              <span className="font-mono">{format.sign_bits} bit</span>
            </div>
            <div className="mt-1.5 font-mono text-lg font-bold">{report.sign_bit_str}</div>
            <div
              className={`text-[11px] mt-0.5 ${
                selectedField === 'SIGN' ? 'text-[#3C3D37]' : 'text-[#ECDFCC]/70'
              }`}
            >
              Bit {totalBits - 1} • {report.sign_bit === 0 ? 'Positive (+)' : 'Negative (-)'}
            </div>
          </button>

          {/* EXPONENT button */}
          <button
            type="button"
            role="tab"
            aria-selected={selectedField === 'EXPONENT'}
            onClick={() => setSelectedField('EXPONENT')}
            className={`text-left p-3.5 rounded-lg border transition-all duration-150 cursor-pointer ${
              selectedField === 'EXPONENT'
                ? 'bg-[#697565] text-[#ECDFCC] border-[#ECDFCC] ring-2 ring-[#ECDFCC]/60'
                : 'bg-[#697565]/35 text-[#ECDFCC] border-[#697565]/60 hover:bg-[#697565]/55'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span>[E] EXPONENT</span>
              <span className="font-mono">{format.exponent_bits} bits</span>
            </div>
            <div className="mt-1.5 font-mono text-base sm:text-lg font-bold tracking-wider break-all">
              {report.exponent_bits}
            </div>
            <div className="text-[11px] mt-0.5 text-[#ECDFCC]/85">
              Bits {totalBits - 2}..{format.fraction_bits} • Biased ={' '}
              {report.step5_biased_exponent.biased_exponent_decimal}
            </div>
          </button>

          {/* FRACTION button */}
          <button
            type="button"
            role="tab"
            aria-selected={selectedField === 'FRACTION'}
            onClick={() => setSelectedField('FRACTION')}
            className={`text-left p-3.5 rounded-lg border transition-all duration-150 cursor-pointer ${
              selectedField === 'FRACTION'
                ? 'bg-[#3C3D37] text-[#ECDFCC] border-[#ECDFCC] ring-2 ring-[#697565]'
                : 'bg-[#3C3D37]/45 text-[#ECDFCC] border-[#ECDFCC]/20 hover:bg-[#3C3D37]/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span>[F] FRACTION</span>
              <span className="font-mono">{format.fraction_bits} bits</span>
            </div>
            <div className="mt-1.5 font-mono text-xs sm:text-sm font-bold tracking-wider truncate">
              {report.fraction_bits}
            </div>
            <div className="text-[11px] mt-0.5 text-[#ECDFCC]/75">
              Bits {format.fraction_bits - 1}..0 • Significand after &apos;
              {report.step4_normalization.implicit_leading_bit}.&apos;
            </div>
          </button>
        </div>

        {/* Individual Interactive Bit Cells (wraps cleanly with zero horizontal overflow) */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-[11px] text-[#ECDFCC]/70 mb-2 font-mono">
            <span>Bit Index {totalBits - 1} (MSB)</span>
            <span>Click any bit cell to inspect its weight</span>
            <span>Bit Index 0 (LSB)</span>
          </div>

          <div
            className="flex flex-wrap gap-1 items-center p-3 rounded-lg bg-[#3C3D37]/40 border border-[#ECDFCC]/15"
            role="group"
            aria-label={`Interactive ${totalBits}-bit register cells`}
          >
            {/* Sign Bit Cell */}
            <button
              type="button"
              onClick={() => handleBitClick(0, 'SIGN')}
              title={`Bit ${totalBits - 1} (Sign): ${report.sign_bit_str}`}
              className={`w-7 h-9 sm:w-8 sm:h-10 rounded flex flex-col items-center justify-center font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                selectedField === 'SIGN'
                  ? 'bg-[#ECDFCC] text-[#181C14] border-[#ECDFCC] scale-105'
                  : 'bg-[#ECDFCC]/85 text-[#181C14] border-[#ECDFCC]/50 hover:bg-[#ECDFCC]'
              }`}
            >
              <span className="text-[8px] leading-none opacity-65">S</span>
              <span>{report.sign_bit_str}</span>
            </button>

            <span className="text-[#ECDFCC]/40 font-mono px-0.5 select-none" aria-hidden="true">
              |
            </span>

            {/* Exponent Bit Cells */}
            {report.exponent_bits.split('').map((bit, i) => {
              const msbOffset = 1 + i;
              const bitIndex = totalBits - 1 - msbOffset;
              const isBitSelected = selectedBitIndex === bitIndex;
              return (
                <button
                  key={`exp-${bitIndex}`}
                  type="button"
                  onClick={() => handleBitClick(msbOffset, 'EXPONENT')}
                  title={`Bit ${bitIndex} (Exponent): ${bit}`}
                  className={`w-6 h-9 sm:w-7 sm:h-10 rounded flex flex-col items-center justify-center font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                    isBitSelected
                      ? 'bg-[#ECDFCC] text-[#181C14] border-[#ECDFCC] scale-105'
                      : selectedField === 'EXPONENT'
                        ? 'bg-[#697565] text-[#ECDFCC] border-[#ECDFCC]/60'
                        : 'bg-[#697565]/65 text-[#ECDFCC] border-[#697565] hover:bg-[#697565]'
                  }`}
                >
                  <span className="text-[8px] leading-none opacity-70">{bitIndex}</span>
                  <span>{bit}</span>
                </button>
              );
            })}

            <span className="text-[#ECDFCC]/40 font-mono px-0.5 select-none" aria-hidden="true">
              |
            </span>

            {/* Fraction Bit Cells */}
            {report.fraction_bits.split('').map((bit, i) => {
              const msbOffset = 1 + format.exponent_bits + i;
              const bitIndex = totalBits - 1 - msbOffset;
              const isBitSelected = selectedBitIndex === bitIndex;
              return (
                <button
                  key={`frac-${bitIndex}`}
                  type="button"
                  onClick={() => handleBitClick(msbOffset, 'FRACTION')}
                  title={`Bit ${bitIndex} (Fraction 2^-${i + 1}): ${bit}`}
                  className={`w-6 h-9 sm:w-6 sm:h-10 rounded flex flex-col items-center justify-center font-mono text-xs font-semibold transition-all cursor-pointer border ${
                    isBitSelected
                      ? 'bg-[#ECDFCC] text-[#181C14] border-[#ECDFCC] scale-105'
                      : selectedField === 'FRACTION'
                        ? 'bg-[#3C3D37] text-[#ECDFCC] border-[#ECDFCC]/50'
                        : 'bg-[#181C14] text-[#ECDFCC]/90 border-[#ECDFCC]/20 hover:bg-[#3C3D37]'
                  }`}
                >
                  <span className="text-[8px] leading-none opacity-60">{bitIndex}</span>
                  <span>{bit}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Complete Single-Line / Grouped Bit Pattern & Field Counts */}
        <div className="p-3.5 rounded-lg bg-[#181C14] border border-[#ECDFCC]/15 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#ECDFCC]/75 mb-1.5">
            <span>
              Complete {totalBits}-Bit Pattern ({step7_assembly.addition_formula})
            </span>
            <span className="font-mono text-[#ECDFCC]">Hex: {report.hexadecimal}</span>
          </div>
          <div className="font-mono text-xs sm:text-sm md:text-base tracking-wider break-all leading-relaxed select-all">
            <span
              className="px-1.5 py-0.5 rounded bg-[#ECDFCC] text-[#181C14] font-bold mr-1"
              title="Sign Bit"
            >
              {report.sign_bit_str}
            </span>
            <span
              className="px-1.5 py-0.5 rounded bg-[#697565] text-[#ECDFCC] font-bold mr-1"
              title="Exponent Bits"
            >
              {report.exponent_bits}
            </span>
            <span
              className="px-1.5 py-0.5 rounded bg-[#3C3D37] text-[#ECDFCC] font-semibold border border-[#ECDFCC]/20"
              title="Fraction Bits"
            >
              {report.fraction_bits}
            </span>
          </div>
        </div>

        {/* Selected Field Educational Explanation Panel */}
        <div
          className="rounded-lg bg-[#3C3D37]/75 border border-[#ECDFCC]/20 p-4 transition-all duration-200"
          role="tabpanel"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-[#697565] text-[#ECDFCC]">
                {activeInfo.badge}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#ECDFCC]">{activeInfo.title}</h3>
            </div>
            <span className="text-xs font-mono text-[#ECDFCC]/80">{activeInfo.bitRange}</span>
          </div>

          <p className="text-xs sm:text-sm text-[#ECDFCC]/90 leading-relaxed mb-3">
            {activeInfo.purpose}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded bg-[#181C14]/80 border border-[#ECDFCC]/10">
              <span className="text-[#ECDFCC]/60 block text-[10px] uppercase">
                Decoded Field Meaning
              </span>
              <span className="text-[#ECDFCC] font-semibold mt-0.5 block break-all">
                {activeInfo.decodedSummary}
              </span>
            </div>
            <div className="p-2.5 rounded bg-[#181C14]/80 border border-[#ECDFCC]/10">
              <span className="text-[#ECDFCC]/60 block text-[10px] uppercase">
                Mathematical Formula Contribution
              </span>
              <span className="text-[#ECDFCC] font-semibold mt-0.5 block break-all">
                {activeInfo.formulaNote}
              </span>
            </div>
          </div>

          {renderBitInspector()}
        </div>
      </div>
    </section>
  );
};
