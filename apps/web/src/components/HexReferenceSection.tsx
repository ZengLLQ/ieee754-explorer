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
      className="py-12 border-t border-[#181C14]/15"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-[#697565] mb-1.5">
            Pengelompokan 4-Bit (Nibble) & Tabel Rujukan
          </p>
          <h2
            id="hex-reference-heading"
            className="text-2xl sm:text-4xl font-bold tracking-tight text-[#181C14]"
          >
            Konversi Heksadesimal & Tabel Referensi 4-Bit
          </h2>
          <p className="text-sm sm:text-base text-[#3C3D37] mt-1.5 leading-relaxed">
            Setiap grup 4 bit biner dipetakan secara langsung ke satu digit heksadesimal. Digit aktif yang digunakan dalam{' '}
            <code className="font-mono font-bold text-[#181C14] text-base">{hexadecimal}</code> ditandai dengan warna kontras.
          </p>
        </div>

        <CopyButton value={hexadecimal} label={`Salin ${hexadecimal}`} variant="dark" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Dynamic Nibble Breakdown for the Current Input */}
        <div className="lg:col-span-7 rounded-xl bg-[#181C14] text-[#ECDFCC] p-5 sm:p-6 border border-[#3C3D37] shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-5 pb-3.5 border-b border-[#ECDFCC]/15">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#697565] block font-semibold">
                Konversi Berjalan ({format.total_bits} Bit → {format.hex_digits} Nibble)
              </span>
              <h3 className="text-base sm:text-lg font-bold">Pemetaan Grup 4-Bit Dinamis</h3>
            </div>
            <span className="font-mono text-xl sm:text-2xl font-bold text-[#ECDFCC] bg-[#697565] px-3.5 py-1.5 rounded-lg shadow-xs">
              {hexadecimal}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {step8_hex_rows.map((nibble) => (
              <div
                key={`nibble-card-${nibble.group_index}`}
                className="p-3 rounded-lg bg-[#3C3D37]/75 border border-[#ECDFCC]/15 flex flex-col justify-between shadow-xs"
              >
                <div className="flex items-center justify-between text-xs font-mono text-[#ECDFCC]/75">
                  <span className="font-semibold">Nibble #{nibble.group_index}</span>
                  <span>{nibble.bit_range.replace('Bits ', 'b')}</span>
                </div>
                <div className="my-2 flex items-center justify-between font-mono">
                  <span className="text-sm sm:text-base font-bold text-[#ECDFCC]">{nibble.binary_group}₂</span>
                  <span className="text-xs text-[#ECDFCC]/50">→</span>
                  <span className="w-8 h-8 rounded-md bg-[#ECDFCC] text-[#181C14] font-bold text-base flex items-center justify-center shadow-xs">
                    {nibble.hex_digit}
                  </span>
                </div>
                <div className="text-xs text-[#ECDFCC]/75 truncate">{nibble.spanning_fields}</div>
              </div>
            ))}
          </div>

          <div className="text-xs sm:text-sm text-[#ECDFCC]/85 font-mono pt-3 border-t border-[#ECDFCC]/15 flex flex-wrap items-center justify-between gap-2">
            <span>
              Digit Hex Rangkaian: 0x
              {step8_hex_rows.map((r) => r.hex_digit).join('')}
            </span>
            <span>{format.total_bits / 4} × 4-bit grup</span>
          </div>
        </div>

        {/* Right 5 cols: Standard 4-Bit-to-Hexadecimal Reference Table (0..7 | 8..F) */}
        <div className="lg:col-span-5 rounded-xl border border-[#181C14]/20 bg-[#ECDFCC] overflow-hidden shadow-xs">
          <div className="bg-[#3C3D37] text-[#ECDFCC] px-5 py-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#ECDFCC]/75 block font-semibold">
                Tabel Referensi Standar IEEE 754
              </span>
              <h3 className="text-sm sm:text-base font-bold">Rujukan Biner 4-Bit ke Heksadesimal</h3>
            </div>
            <span className="text-xs font-mono text-[#ECDFCC]/85 font-bold">0000₂ – 1111₂</span>
          </div>

          <div className="overflow-x-auto">
            <table
              className="w-full text-left border-collapse text-sm font-mono"
              aria-label="4-bit binary to hexadecimal reference table"
            >
              <thead>
                <tr className="bg-[#181C14] text-[#ECDFCC]">
                  <th className="py-2.5 px-3 font-bold text-center border-r border-[#ECDFCC]/15">
                    Hex
                  </th>
                  <th className="py-2.5 px-3 font-bold text-center border-r border-[#ECDFCC]/25">
                    Biner
                  </th>
                  <th className="py-2.5 px-3 font-bold text-center border-r border-[#ECDFCC]/15">
                    Hex
                  </th>
                  <th className="py-2.5 px-3 font-bold text-center">Biner</th>
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
