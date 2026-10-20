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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <div className="p-3.5 rounded-lg bg-[#181C14] text-[#ECDFCC]">
                <span className="text-xs uppercase text-[#ECDFCC]/70 block font-semibold">
                  Nilai Desimal Input
                </span>
                <span className="font-mono font-bold text-base mt-1 block break-all">
                  {report.original_input}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#181C14] text-[#ECDFCC]">
                <span className="text-xs uppercase text-[#ECDFCC]/70 block font-semibold">
                  Standar Presisi
                </span>
                <span className="font-mono font-bold text-base mt-1 block">
                  {format.standard_name}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#181C14] text-[#ECDFCC]">
                <span className="text-xs uppercase text-[#ECDFCC]/70 block font-semibold">
                  Sign / Exp / Frac
                </span>
                <span className="font-mono font-bold text-sm sm:text-base mt-1 block">
                  {format.sign_bits} / {format.exponent_bits} / {format.fraction_bits} bit
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#181C14] text-[#ECDFCC]">
                <span className="text-xs uppercase text-[#ECDFCC]/70 block font-semibold">
                  Total Bit Kata
                </span>
                <span className="font-mono font-bold text-base mt-1 block">
                  {format.total_bits} bit
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#181C14] text-[#ECDFCC] col-span-2 sm:col-span-1">
                <span className="text-xs uppercase text-[#ECDFCC]/70 block font-semibold">
                  Bias Format
                </span>
                <span className="font-mono font-bold text-base mt-1 block">{format.bias}</span>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="mt-4 p-4 sm:p-5 rounded-xl bg-[#181C14] text-[#ECDFCC] border border-[#3C3D37]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-[#ECDFCC]/15">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-[#697565] font-mono font-bold block">
                  Kaidah Evaluasi Bit Tanda (Sign Bit)
                </span>
                <div className="font-mono text-sm sm:text-base font-bold text-[#ECDFCC] whitespace-pre-line leading-relaxed">
                  {`Sign = { 0,  jika x ≥ +0\n       { 1,  jika x < 0  atau  x = -0`}
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-xs text-[#ECDFCC]/75 font-sans">Bit Terpilih:</span>
                <span className="px-3.5 py-1.5 rounded-lg bg-[#697565] text-[#ECDFCC] font-mono text-base font-bold shadow-xs">
                  Bit {format.total_bits - 1} (MSB) = {report.sign_bit}
                </span>
              </div>
            </div>

            <ul className="space-y-2 text-sm sm:text-base text-[#ECDFCC]/90">
              <li className="flex items-start gap-2.5">
                <span className="text-[#697565] font-bold text-base">•</span>
                <span>
                  <strong>Nilai Input:</strong> <code className="px-2 py-0.5 rounded bg-[#3C3D37] font-mono font-bold text-[#ECDFCC]">{report.original_input}</code> ({report.sign_bit === 0 ? 'positif / nol positif' : 'negatif / signed negative zero'}).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#697565] font-bold text-base">•</span>
                <span>
                  <strong>Penetapan Bit Tanda:</strong> Karena {report.sign_bit === 0 ? 'x ≥ +0' : 'x < 0 (atau x bertanda -0)'}, maka Most Significant Bit (Bit {format.total_bits - 1}) bernilai <code className="px-2 py-0.5 rounded bg-[#697565] font-mono font-bold text-[#ECDFCC]">{report.sign_bit}</code>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#697565] font-bold text-base">•</span>
                <span>
                  <strong>Langkah Lanjutan:</strong> Tanda aljabar telah diisolasi. Langkah 3 akan mengonversi nilai magnitudo mutlak <code className="font-mono font-bold text-[#ECDFCC]">|{report.original_input}|</code> ke representasi biner.
                </span>
              </li>
            </ul>
          </div>
        );

      case 3:
        return (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3A: Integer Part Repeated Division by 2 Table */}
            <div className="rounded-xl border border-[#181C14]/20 bg-[#ECDFCC] overflow-hidden shadow-xs">
              <div className="bg-[#181C14] text-[#ECDFCC] px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#697565] block font-semibold">
                    Langkah 3A — Bagian Bulat (Integer)
                  </span>
                  <h4 className="text-sm sm:text-base font-bold">
                    Pembagian Berulang dengan 2 ({step3_integer.decimal_integer}₁₀ →{' '}
                    {step3_integer.binary_string}₂)
                  </h4>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-[#3C3D37] px-3 py-1 rounded text-[#ECDFCC] font-semibold">
                  <ArrowUp className="w-3.5 h-3.5 text-[#697565]" />
                  Baca Bawah ke Atas (↑)
                </span>
              </div>

              <div className="p-3 text-xs sm:text-sm text-[#3C3D37] border-b border-[#181C14]/10">
                {step3_integer.reading_order_note}
              </div>

              {step3_integer.rows.length > 0 ? (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-sm font-mono">
                    <thead>
                      <tr className="bg-[#3C3D37]/10 text-[#181C14] border-b border-[#181C14]/15">
                        <th className="py-2.5 px-3.5 font-bold">Operasi Pembagian</th>
                        <th className="py-2.5 px-3.5 font-bold text-right">Hasil Bagi (Quotient)</th>
                        <th className="py-2.5 px-3.5 font-bold text-right">Sisa Bagi (Remainder ↑)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#181C14]/10">
                      {step3_integer.rows.map((row, idx) => {
                        const isLast = idx === step3_integer.rows.length - 1;
                        return (
                          <tr
                            key={`int-div-${row.step}`}
                            className={isLast ? 'bg-[#697565]/20 font-bold' : ''}
                          >
                            <td className="py-2 px-3.5 text-[#181C14]">{row.expression}</td>
                            <td className="py-2 px-3.5 text-right text-[#3C3D37] font-semibold">{row.quotient}</td>
                            <td className="py-2 px-3.5 text-right">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#181C14] text-[#ECDFCC] font-bold text-xs">
                                {row.remainder}
                              </span>
                              {isLast && (
                                <span className="ml-2 text-xs text-[#697565] font-bold">
                                  MSB
                                </span>
                              )}
                              {idx === 0 && step3_integer.rows.length > 1 && (
                                <span className="ml-2 text-xs text-[#3C3D37]">LSB</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-sm text-[#3C3D37]">{step3_integer.explanation}</div>
              )}

              {step3_integer.truncated_table && (
                <div className="px-3.5 py-2.5 bg-[#3C3D37]/10 text-xs text-[#3C3D37] border-t border-[#181C14]/10">
                  Menampilkan baris representatif dari {step3_integer.total_divisions} total pembagian
                  dengan 2. Biner integer lengkap: <code className="font-bold">{step3_integer.binary_string}₂</code>
                </div>
              )}
            </div>

            {/* 3B: Fractional Part Repeated Multiplication by 2 Table */}
            <div className="rounded-xl border border-[#181C14]/20 bg-[#ECDFCC] overflow-hidden shadow-xs">
              <div className="bg-[#181C14] text-[#ECDFCC] px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#697565] block font-semibold">
                    Langkah 3B — Bagian Pecahan (Fraction)
                  </span>
                  <h4 className="text-sm sm:text-base font-bold">
                    Perkalian Berulang dengan 2 ({step3_fraction.decimal_fraction}₁₀ → .
                    {step3_fraction.binary_string}₂)
                  </h4>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-mono bg-[#3C3D37] px-3 py-1 rounded text-[#ECDFCC] font-semibold">
                  <ArrowDown className="w-3.5 h-3.5 text-[#697565]" />
                  Baca Atas ke Bawah (↓)
                </span>
              </div>

              <div className="p-3 text-xs sm:text-sm text-[#3C3D37] border-b border-[#181C14]/10 flex flex-wrap items-center justify-between gap-2">
                <span>
                  {step3_fraction.terminates
                    ? 'Pecahan biner terminasi tepat (sisa pecahan mencapai 0).'
                    : 'Pecahan biner berulang / tak hingga — dibulatkan pada Langkah 6 via kaidah IEEE 754.'}
                </span>
                {step3_fraction.is_repeating && (
                  <span className="px-2.5 py-0.5 rounded bg-[#697565] text-[#ECDFCC] font-mono text-xs font-bold">
                    Siklus Berulang Terdeteksi
                  </span>
                )}
              </div>

              {step3_fraction.rows.length > 0 ? (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-sm font-mono">
                    <thead>
                      <tr className="bg-[#3C3D37]/10 text-[#181C14] border-b border-[#181C14]/15">
                        <th className="py-2.5 px-3 font-bold">Langkah</th>
                        <th className="py-2.5 px-3 font-bold">Pecahan × 2</th>
                        <th className="py-2.5 px-3 font-bold text-center">Bit Bulat (↓)</th>
                        <th className="py-2.5 px-3 font-bold text-right">Sisa Pecahan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#181C14]/10">
                      {step3_fraction.rows.map((row) => (
                        <tr
                          key={`frac-mul-${row.step}`}
                          className={row.note ? 'bg-[#697565]/20 font-semibold' : ''}
                        >
                          <td className="py-2 px-3 text-[#3C3D37]">{row.step}</td>
                          <td className="py-2 px-3 text-[#181C14]">{row.expression}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#697565] text-[#ECDFCC] font-bold text-xs">
                              {row.integer_bit}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-[#181C14]">
                            <div>{row.remaining_fraction}</div>
                            {row.note && (
                              <div className="text-xs font-sans text-[#697565] font-semibold">
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
                <div className="p-4 text-sm text-[#3C3D37]">{step3_fraction.explanation}</div>
              )}

              {!step3_fraction.terminates && (
                <div className="px-3.5 py-2.5 bg-[#3C3D37]/10 text-xs text-[#3C3D37] border-t border-[#181C14]/10">
                  Menampilkan {step3_fraction.rows.length} langkah awal ({step3_fraction.total_steps_computed}{' '}
                  bit dihitung secara internal untuk pembulatan presisi Guard/Round/Sticky).
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="mt-4 rounded-xl bg-[#181C14] text-[#ECDFCC] p-5 sm:p-6 border border-[#3C3D37] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="text-xs font-mono uppercase tracking-wider text-[#697565] font-bold">
                Visualisasi Pergeseran Koma Biner (Binary Point Shift)
              </div>
              {!step4_normalization.is_zero && !step4_normalization.is_special && (
                <button
                  type="button"
                  onClick={replayNormalizationShift}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#3C3D37] hover:bg-[#697565] text-xs font-semibold text-[#ECDFCC] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Putar Ulang Pergeseran Koma</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-center font-mono">
              <div className="p-4 rounded-lg bg-[#3C3D37]/60 border border-[#ECDFCC]/15">
                <span className="text-xs uppercase text-[#ECDFCC]/70 block font-semibold">
                  1. Sebelum Normalisasi
                </span>
                <span className="text-base sm:text-lg font-bold text-[#ECDFCC] break-all mt-1 block">
                  {step4_normalization.unnormalized_binary}₂
                </span>
              </div>

              <div className="flex flex-col items-center justify-center py-3 px-4 rounded-lg bg-[#697565]/25 border border-[#697565]/50 text-center">
                <span className="text-xs sm:text-sm font-bold text-[#ECDFCC]">
                  {step4_normalization.shift_direction === 'left'
                    ? `← Geser Koma ke Kiri sebanyak ${step4_normalization.shift_amount} posisi`
                    : step4_normalization.shift_direction === 'right'
                      ? `Geser Koma ke Kanan sebanyak ${step4_normalization.shift_amount} posisi →`
                      : 'Pergeseran Koma = 0'}
                </span>
                <div className="w-full h-2 bg-[#181C14] rounded-full overflow-hidden mt-2.5">
                  <div
                    style={{ width: `${normAnimProgress}%` }}
                    className="h-full bg-[#ECDFCC] transition-all duration-500 ease-out"
                  />
                </div>
                <span className="text-xs text-[#ECDFCC]/90 mt-1.5 font-bold">
                  Eksponen Murni (Unbiased) e = {step4_normalization.unbiased_exponent}
                </span>
              </div>

              <div className="p-4 rounded-lg bg-[#697565] text-[#ECDFCC] border border-[#ECDFCC]/30 shadow-xs">
                <span className="text-xs uppercase text-[#ECDFCC]/85 block font-semibold">
                  2. Bentuk Ternormalisasi
                </span>
                <span className="text-base sm:text-lg font-bold break-all mt-1 block">
                  {step4_normalization.normalized_expression}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#ECDFCC]/15 flex flex-wrap items-center justify-between gap-3 text-sm text-[#ECDFCC]/90">
              <span>
                Implicit Leading Bit:{' '}
                <strong className="font-mono text-[#ECDFCC] text-base">
                  {step4_normalization.implicit_leading_bit}.
                </strong>{' '}
                (
                {step4_normalization.is_hidden_bit_stored
                  ? 'Tersembunyi — tidak disimpan dalam field fraksi memori'
                  : 'Kaidah Khusus / Subnormal'}
                )
              </span>
              <span className="font-mono font-bold text-[#ECDFCC] text-base">
                Unbiased Exponent e = {step4_normalization.unbiased_exponent}
              </span>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-sm font-mono">
              <div className="p-4 rounded-xl bg-[#181C14] text-[#ECDFCC]">
                <span className="text-[#ECDFCC]/70 block text-xs uppercase font-semibold">
                  Eksponen Murni (Unbiased e)
                </span>
                <span className="text-xl sm:text-2xl font-bold mt-1.5 block">
                  {step5_biased_exponent.unbiased_exponent}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[#181C14] text-[#ECDFCC]">
                <span className="text-[#ECDFCC]/70 block text-xs uppercase font-semibold">
                  Bias Format {format.name}
                </span>
                <span className="text-xl sm:text-2xl font-bold mt-1.5 block">
                  + {step5_biased_exponent.bias}{' '}
                  <span className="text-xs font-normal text-[#ECDFCC]/70">
                    (2^({format.exponent_bits}-1)-1)
                  </span>
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[#697565] text-[#ECDFCC] shadow-xs">
                <span className="text-[#ECDFCC]/90 block text-xs uppercase font-semibold">
                  Hasil Eksponen Berbias (E)
                </span>
                <span className="text-xl sm:text-2xl font-bold mt-1.5 block">
                  {step5_biased_exponent.biased_exponent_decimal}₁₀ ={' '}
                  {step5_biased_exponent.biased_exponent_binary}₂
                </span>
              </div>
            </div>

            {/* Biased Exponent Division Table */}
            <div className="rounded-xl border border-[#181C14]/20 bg-[#ECDFCC] overflow-hidden shadow-xs">
              <div className="bg-[#3C3D37] text-[#ECDFCC] px-4 py-3 flex items-center justify-between text-sm">
                <span className="font-bold">
                  Konversi Eksponen Berbias ({step5_biased_exponent.biased_exponent_decimal}₁₀) ke Biner{' '}
                  {format.exponent_bits}-Bit
                </span>
                <span className="font-mono font-bold">
                  Hasil: {step5_biased_exponent.biased_exponent_binary}₂
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm font-mono">
                  <thead>
                    <tr className="bg-[#3C3D37]/10 text-[#181C14] border-b border-[#181C14]/15">
                      <th className="py-2 px-3.5 font-bold">Langkah</th>
                      <th className="py-2 px-3.5 font-bold">Pembagian</th>
                      <th className="py-2 px-3.5 font-bold text-right">Hasil Bagi</th>
                      <th className="py-2 px-3.5 font-bold text-right">Sisa Bagi (↑)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181C14]/10">
                    {step5_biased_exponent.division_rows.map((row) => (
                      <tr key={`exp-div-${row.step}`}>
                        <td className="py-2 px-3.5 text-[#3C3D37]">{row.step}</td>
                        <td className="py-2 px-3.5 text-[#181C14]">{row.expression}</td>
                        <td className="py-2 px-3.5 text-right text-[#3C3D37]">{row.quotient}</td>
                        <td className="py-2 px-3.5 text-right font-bold text-[#181C14]">
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
          <div className="mt-4 space-y-3.5">
            <div className="rounded-xl bg-[#181C14] text-[#ECDFCC] p-5 border border-[#3C3D37] font-mono text-sm space-y-4 shadow-xs">
              <div>
                <span className="text-xs uppercase text-[#ECDFCC]/70 block font-semibold">
                  Signifikand Sebelum Pengkodean (Normalized Significand)
                </span>
                <div className="mt-1.5 text-base sm:text-lg font-bold break-all">
                  <span className="px-2 py-0.5 rounded bg-[#697565] text-[#ECDFCC] mr-1.5">
                    {step6_fraction_field.hidden_leading_bit}.
                  </span>
                  <span>{step6_fraction_field.raw_fraction_bits}</span>
                  {step6_fraction_field.extra_bits_preview && (
                    <span className="text-[#ECDFCC]/50 ml-1.5">
                      [{step6_fraction_field.extra_bits_preview}...]
                    </span>
                  )}
                </div>
              </div>

              {step6_fraction_field.guard_bit !== null && (
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#ECDFCC]/15">
                  <div className="p-3 rounded-lg bg-[#3C3D37]/70">
                    <span className="text-xs text-[#ECDFCC]/75 block font-semibold">Guard Bit (G)</span>
                    <span className="text-lg font-bold">{step6_fraction_field.guard_bit}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#3C3D37]/70">
                    <span className="text-xs text-[#ECDFCC]/75 block font-semibold">Round Bit (R)</span>
                    <span className="text-lg font-bold">{step6_fraction_field.round_bit}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#3C3D37]/70">
                    <span className="text-xs text-[#ECDFCC]/75 block font-semibold">Sticky Bit (S)</span>
                    <span className="text-lg font-bold">{step6_fraction_field.sticky_bit}</span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-[#ECDFCC]/15">
                <div className="flex items-center justify-between text-xs uppercase text-[#ECDFCC]/80 font-semibold">
                  <span>Field Fraksi Akhir ({step6_fraction_field.target_bit_length} Bit)</span>
                  <span>
                    {step6_fraction_field.rounding_occurred
                      ? `Dibulatkan ke ${step6_fraction_field.rounding_direction.toUpperCase()} (${step6_fraction_field.rounding_mode})`
                      : `Eksak (${step6_fraction_field.padded_zeros_count} bit 0 trailing ditambahkan)`}
                  </span>
                </div>
                <div className="mt-1.5 p-3 rounded-lg bg-[#3C3D37] text-[#ECDFCC] font-bold text-sm sm:text-base break-all">
                  {step6_fraction_field.final_fraction_bits}
                </div>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="mt-4 rounded-xl bg-[#181C14] text-[#ECDFCC] p-5 border border-[#3C3D37] shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <span className="text-sm font-mono text-[#ECDFCC]/85 font-semibold">
                {step7_assembly.addition_formula}
              </span>
              <CopyButton
                value={report.complete_bit_pattern}
                label="Salin Pola Bit Lengkap"
                variant="light"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 font-mono text-sm">
              <div className="md:col-span-2 p-3 rounded-lg bg-[#ECDFCC] text-[#181C14] shadow-xs">
                <span className="text-xs font-bold uppercase block text-[#181C14]/75">SIGN (1b)</span>
                <span className="text-lg font-bold mt-1 block">{report.sign_bit_str}</span>
              </div>
              <div className="md:col-span-3 p-3 rounded-lg bg-[#697565] text-[#ECDFCC] shadow-xs">
                <span className="text-xs font-bold uppercase block text-[#ECDFCC]/85">
                  EXPONENT ({format.exponent_bits}b)
                </span>
                <span className="text-sm sm:text-base font-bold mt-1 block break-all">
                  {report.exponent_bits}
                </span>
              </div>
              <div className="md:col-span-7 p-3 rounded-lg bg-[#3C3D37] text-[#ECDFCC] border border-[#ECDFCC]/20 shadow-xs">
                <span className="text-xs font-bold uppercase block text-[#ECDFCC]/85">
                  FRACTION ({format.fraction_bits}b)
                </span>
                <span className="text-xs sm:text-sm font-bold mt-1 block break-all">
                  {report.fraction_bits}
                </span>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#181C14] text-[#ECDFCC] shadow-xs">
              <div>
                <span className="text-xs font-mono uppercase text-[#ECDFCC]/75 block font-semibold">
                  Representasi Heksadesimal ({format.hex_digits} Digit Hex)
                </span>
                <span className="font-mono text-xl sm:text-2xl font-bold">{report.hexadecimal}</span>
              </div>
              <CopyButton value={report.hexadecimal} label="Salin Hexadecimal" variant="light" />
            </div>

            <div className="rounded-xl border border-[#181C14]/20 bg-[#ECDFCC] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm font-mono">
                  <thead>
                    <tr className="bg-[#3C3D37] text-[#ECDFCC]">
                      <th className="py-2.5 px-3.5 font-bold">Grup #</th>
                      <th className="py-2.5 px-3.5 font-bold">Posisi Bit</th>
                      <th className="py-2.5 px-3.5 font-bold">Grup Biner (4 Bit)</th>
                      <th className="py-2.5 px-3.5 font-bold text-center">Desimal</th>
                      <th className="py-2.5 px-3.5 font-bold text-center">Digit Hex</th>
                      <th className="py-2.5 px-3.5 font-bold text-right">Rentang Field IEEE 754</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181C14]/10">
                    {step8_hex_rows.map((row) => (
                      <tr key={`hex-nibble-${row.group_index}`}>
                        <td className="py-2 px-3.5 text-[#3C3D37]">#{row.group_index}</td>
                        <td className="py-2 px-3.5 text-[#3C3D37]">{row.bit_range}</td>
                        <td className="py-2 px-3.5 font-bold text-[#181C14]">{row.binary_group}</td>
                        <td className="py-2 px-3.5 text-center text-[#3C3D37]">{row.decimal_value}</td>
                        <td className="py-2 px-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-[#181C14] text-[#ECDFCC] font-bold text-sm">
                            {row.hex_digit}
                          </span>
                        </td>
                        <td className="py-2 px-3.5 text-right font-sans text-[#3C3D37]">
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-sm font-mono">
            <div className="p-4 rounded-xl bg-[#181C14] text-[#ECDFCC] shadow-xs">
              <span className="text-xs uppercase text-[#ECDFCC]/70 block font-semibold">
                Nilai Input Desimal Asli
              </span>
              <span className="text-base font-bold mt-1.5 block break-all">
                {step9_interpretation.original_input}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#181C14] text-[#ECDFCC] shadow-xs">
              <span className="text-xs uppercase text-[#ECDFCC]/70 block font-semibold">
                Nilai Desimal Tersimpan ({format.standard_name})
              </span>
              <span className="text-base font-bold mt-1.5 block break-all">
                {step9_interpretation.represented_decimal_exact}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#697565] text-[#ECDFCC] shadow-xs">
              <span className="text-xs uppercase text-[#ECDFCC]/90 block font-semibold">
                Selisih Pembulatan (Error)
              </span>
              <span className="text-base font-bold mt-1.5 block break-all">
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
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-[#697565] mb-1.5">
            Derivasi Matematika Langkah demi Langkah
          </p>
          <h2
            id="step-by-step-heading"
            className="text-2xl sm:text-4xl font-bold tracking-tight text-[#181C14]"
          >
            Langkah-Langkah Konversi IEEE 754 (Langkah 1–9)
          </h2>
          <p className="text-sm sm:text-base text-[#3C3D37] mt-1.5 leading-relaxed">
            Ikuti setiap penurunan rumus dan langkah matematis secara berurutan menggunakan Previous / Next
            atau buka langkah yang ingin dipelajari secara langsung.
          </p>
        </div>

        {/* Sequential Navigation Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => goToStep(activeStep - 1)}
            disabled={activeStep <= 1}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold border border-[#181C14]/25 bg-[#ECDFCC] text-[#181C14] hover:bg-[#181C14] hover:text-[#ECDFCC] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Langkah Sebelumnya</span>
          </button>

          <span className="text-sm font-mono font-bold px-3.5 py-2.5 rounded-lg bg-[#3C3D37] text-[#ECDFCC]">
            Langkah {activeStep} dari 9
          </span>

          <button
            type="button"
            onClick={() => goToStep(activeStep + 1)}
            disabled={activeStep >= 9}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold border border-[#181C14] bg-[#181C14] text-[#ECDFCC] hover:bg-[#3C3D37] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <span>Langkah Berikutnya</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold border border-[#697565] bg-[#697565]/15 text-[#181C14] hover:bg-[#697565] hover:text-[#ECDFCC] transition-colors cursor-pointer"
          >
            <ChevronsUpDown className="w-4 h-4" />
            <span>{expandAll ? 'Tutup Langkah Lain' : 'Buka Semua 9 Langkah'}</span>
          </button>
        </div>
      </div>

      {/* Step Progress Pill Selector */}
      <div
        className="flex flex-wrap gap-2 mb-6"
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
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-mono font-semibold transition-all cursor-pointer border ${
                isCurrent
                  ? 'bg-[#181C14] text-[#ECDFCC] border-[#181C14] shadow-xs'
                  : isOpen
                    ? 'bg-[#697565]/25 text-[#181C14] border-[#697565]'
                    : 'bg-[#ECDFCC] text-[#3C3D37] border-[#181C14]/20 hover:border-[#181C14]'
              }`}
            >
              {s.step_number}. {s.title}
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
                  ? 'border-[#181C14] bg-[#ECDFCC] ring-1 ring-[#181C14]/30 shadow-sm'
                  : 'border-[#181C14]/20 bg-[#ECDFCC]/75'
              }`}
            >
              {/* Step Header (always visible, shows concise summary & calculated result) */}
              <button
                type="button"
                onClick={() => toggleStep(step.step_number)}
                aria-expanded={isExpanded}
                className="w-full text-left px-5 sm:px-7 py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-[#181C14]/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <span
                    className={`w-9 h-9 rounded-lg font-mono text-sm font-bold flex items-center justify-center shrink-0 ${
                      isFocused
                        ? 'bg-[#181C14] text-[#ECDFCC]'
                        : 'bg-[#3C3D37] text-[#ECDFCC]'
                    }`}
                  >
                    {step.step_number}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-bold text-[#181C14]">
                        LANGKAH {step.step_number} — {step.title}
                      </h3>
                      <span className="text-xs sm:text-sm text-[#697565] font-semibold hidden md:inline">
                        • {step.subtitle}
                      </span>
                    </div>
                    <div className="text-sm text-[#3C3D37] mt-1 line-clamp-1">
                      {step.concise_explanation.split('\n')[0]}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0">
                  <span className="font-mono text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg bg-[#181C14]/10 text-[#181C14] max-w-[280px] truncate">
                    {step.calculated_result}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-[#181C14]" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[#3C3D37]" />
                  )}
                </div>
              </button>

              {/* Expanded Step Details */}
              {isExpanded && (
                <div className="px-5 sm:px-7 pb-6 pt-3 border-t border-[#181C14]/10 space-y-4">
                  {/* Step Explanation with Clean Bullet Points & Lines */}
                  <div className="p-4 sm:p-5 rounded-xl bg-[#3C3D37]/10 border border-[#181C14]/10 text-sm sm:text-base text-[#181C14] leading-relaxed">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#697565] block mb-2 font-sans">
                      Penjelasan & Kaidah Standar IEEE 754:
                    </span>
                    <div className="space-y-1.5">
                      {step.concise_explanation.split('\n').map((line, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          {line.startsWith('•') ? (
                            <>
                              <span className="text-[#697565] font-bold text-base shrink-0 leading-tight">•</span>
                              <span className="font-medium">{line.replace(/^•\s*/, '')}</span>
                            </>
                          ) : (
                            <span className="font-medium">{line}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mathematical Formula & Populated Formula Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 text-sm">
                    <div className="p-4 rounded-xl bg-[#181C14]/[0.04] border border-[#181C14]/15 flex flex-col justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#697565] block mb-1.5">
                        Notasi & Formula Matematika
                      </span>
                      <div className="font-mono text-sm sm:text-base text-[#181C14] font-semibold whitespace-pre-line leading-relaxed">
                        {step.formula}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#181C14]/[0.04] border border-[#181C14]/15 flex flex-col justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#697565] block mb-1.5">
                        Substitusi Nilai Input
                      </span>
                      <div className="font-mono text-sm sm:text-base text-[#181C14] font-semibold whitespace-pre-line leading-relaxed">
                        {step.populated_formula}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#181C14] text-[#ECDFCC] border border-[#3C3D37] flex flex-col justify-between shadow-xs">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#697565] block mb-1.5">
                        Hasil Perhitungan Langkah Ini
                      </span>
                      <div className="font-mono text-base sm:text-lg text-[#ECDFCC] font-bold whitespace-pre-line leading-relaxed break-all">
                        {step.calculated_result}
                      </div>
                    </div>
                  </div>

                  {/* Step-Specific Tables & Interactive Visualizations */}
                  {renderStepSpecificContent(step)}

                  {/* Connection to Next Step */}
                  <div className="pt-3.5 border-t border-[#181C14]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-[#3C3D37]">
                    <p className="leading-relaxed">
                      <strong className="text-[#181C14]">Koneksi ke Langkah Berikutnya:</strong>{' '}
                      {step.next_step_connection}
                    </p>
                    {step.step_number < 9 && (
                      <button
                        type="button"
                        onClick={() => goToStep(step.step_number + 1)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#181C14] hover:text-[#697565] shrink-0 cursor-pointer"
                      >
                        <span>Lanjut ke Langkah {step.step_number + 1}</span>
                        <ArrowRight className="w-4 h-4" />
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
