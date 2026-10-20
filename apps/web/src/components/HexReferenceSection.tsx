import React from 'react';
import type { ConversionReport } from '../types/ieee754';
import { CopyButton } from './CopyButton';

interface HexReferenceSectionProps {
  report: ConversionReport;
}

export const HexReferenceSection: React.FC<HexReferenceSectionProps> = ({ report }) => {
  const { format, step8_hex_rows, hex_reference_table, hexadecimal } = report;

  // Split 16 reference entries into left column (0..7) and right column (8..F) per Section 5
  const leftHalf = hex_reference_table.slice(0, 8);
  const rightHalf = hex_reference_table.slice(8, 16);

  const activeHexDigits = new Set(step8_hex_rows.map((r) => r.hex_digit.toUpperCase()));

  return (
    <section
      id="hex-reference"
      aria-labelledby="hex-reference-heading"
      className="py-10 border-t border-[#181C14]/15"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#697565] mb-1">
            Nibble Grouping & Lookup Reference
          </p>
          <h2
            id="hex-reference-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-[#181C14]"
          >
            Hexadecimal Conversion & 4-Bit Reference Table
          </h2>
          <p className="text-sm text-[#3C3D37] mt-1">
            Each 4-bit binary group maps directly to one hexadecimal digit. Active digits used in{' '}
            <code className="font-mono font-bold text-[#181C14]">{hexadecimal}</code> are
            highlighted.
          </p>
        </div>

        <CopyButton value={hexadecimal} label={`Copy ${hexadecimal}`} variant="dark" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Dynamic Nibble Breakdown for the Current Input */}
        <div className="lg:col-span-7 rounded-xl bg-[#181C14] text-[#ECDFCC] p-4 sm:p-5 border border-[#3C3D37]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#697565] block">
                Current Conversion ({format.total_bits} Bits → {format.hex_digits} Nibbles)
              </span>
              <h3 className="text-base font-bold">Dynamic 4-Bit Nibble Mapping</h3>
            </div>
            <span className="font-mono text-lg font-bold text-[#ECDFCC] bg-[#697565] px-3 py-1 rounded">
              {hexadecimal}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            {step8_hex_rows.map((nibble) => (
              <div
                key={`nibble-card-${nibble.group_index}`}
                className="p-2.5 rounded-lg bg-[#3C3D37]/75 border border-[#ECDFCC]/15 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-[#ECDFCC]/65">
                  <span>Nibble #{nibble.group_index}</span>
                  <span>{nibble.bit_range.replace('Bits ', 'b')}</span>
                </div>
                <div className="my-1.5 flex items-center justify-between font-mono">
                  <span className="text-sm font-semibold text-[#ECDFCC]">{nibble.binary_group}₂</span>
                  <span className="text-xs text-[#ECDFCC]/50">→</span>
                  <span className="w-7 h-7 rounded bg-[#ECDFCC] text-[#181C14] font-bold text-sm flex items-center justify-center">
                    {nibble.hex_digit}
                  </span>
                </div>
                <div className="text-[10px] text-[#ECDFCC]/70 truncate">{nibble.spanning_fields}</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-[#ECDFCC]/80 font-mono pt-3 border-t border-[#ECDFCC]/15 flex flex-wrap items-center justify-between gap-2">
            <span>
              Concatenated Hex Digits: 0x
              {step8_hex_rows.map((r) => r.hex_digit).join('')}
            </span>
            <span>{format.total_bits / 4} × 4-bit groups</span>
          </div>
        </div>

        {/* Right 5 cols: Standard 4-Bit-to-Hexadecimal Reference Table (0..7 | 8..F) */}
        <div className="lg:col-span-5 rounded-xl border border-[#181C14]/20 bg-[#ECDFCC] overflow-hidden">
          <div className="bg-[#3C3D37] text-[#ECDFCC] px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#ECDFCC]/75 block">
                IEEE 754 Reference Table
              </span>
              <h3 className="text-sm font-bold">4-Bit Binary to Hexadecimal Lookup</h3>
            </div>
            <span className="text-[11px] font-mono text-[#ECDFCC]/80">0000₂ – 1111₂</span>
          </div>

          <div className="overflow-x-auto">
            <table
              className="w-full text-left border-collapse text-xs font-mono"
              aria-label="4-bit binary to hexadecimal reference table"
            >
              <thead>
                <tr className="bg-[#181C14] text-[#ECDFCC]">
                  <th className="py-2.5 px-3 font-semibold text-center border-r border-[#ECDFCC]/15">
                    Hex
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center border-r border-[#ECDFCC]/25">
                    Binary
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center border-r border-[#ECDFCC]/15">
                    Hex
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center">Binary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181C14]/15">
                {leftHalf.map((leftItem, idx) => {
                  const rightItem = rightHalf[idx];
                  const leftActive = activeHexDigits.has(leftItem.hex);
                  const rightActive = rightItem ? activeHexDigits.has(rightItem.hex) : false;

                  return (
                    <tr key={`ref-row-${leftItem.hex}`}>
                      <td
                        className={`py-2 px-3 text-center font-bold border-r border-[#181C14]/10 ${
                          leftActive
                            ? 'bg-[#697565] text-[#ECDFCC]'
                            : 'text-[#181C14]'
                        }`}
                      >
                        {leftItem.hex}
                      </td>
                      <td
                        className={`py-2 px-3 text-center border-r border-[#181C14]/25 ${
                          leftActive
                            ? 'bg-[#697565]/25 text-[#181C14] font-bold'
                            : 'text-[#3C3D37]'
                        }`}
                      >
                        {leftItem.binary}
                      </td>
                      <td
                        className={`py-2 px-3 text-center font-bold border-r border-[#181C14]/10 ${
                          rightActive
                            ? 'bg-[#697565] text-[#ECDFCC]'
                            : 'text-[#181C14]'
                        }`}
                      >
                        {rightItem?.hex}
                      </td>
                      <td
                        className={`py-2 px-3 text-center ${
                          rightActive
                            ? 'bg-[#697565]/25 text-[#181C14] font-bold'
                            : 'text-[#3C3D37]'
                        }`}
                      >
                        {rightItem?.binary}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
