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
      className="py-12 border-t border-[#181C14]/15"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-[#697565] mb-1.5">
            Langkah 9 — Verifikasi Akhir & Interpretasi Matematis
          </p>
          <h2
            id="final-result-heading"
            className="text-2xl sm:text-4xl font-bold tracking-tight text-[#181C14]"
          >
            Hasil Akhir & Analisis Representasi
          </h2>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#181C14] text-[#ECDFCC] text-xs sm:text-sm font-mono border border-[#ECDFCC]/15 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Verifikasi Standar IEEE Std 754-2019</span>
        </div>
      </div>

      {/* Main Summary Card */}
      <div className="rounded-xl bg-[#181C14] text-[#ECDFCC] p-6 sm:p-8 border border-[#3C3D37] space-y-6 shadow-sm">
        {/* Top Row: Hexadecimal + Complete Bit Pattern */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-6 border-b border-[#ECDFCC]/15">
          <div className="lg:col-span-4 p-5 rounded-xl bg-[#3C3D37]/70 border border-[#ECDFCC]/15 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-[#ECDFCC]/75 font-bold">
                Representasi Heksadesimal
              </span>
              <CopyButton value={report.hexadecimal} label="Salin Hex" variant="light" />
            </div>
            <div className="mt-3 font-mono text-3xl sm:text-4xl font-bold text-[#ECDFCC] tracking-tight break-all">
              {report.hexadecimal}
            </div>
            <div className="mt-2.5 text-xs sm:text-sm text-[#ECDFCC]/75 font-mono">
              {step9_interpretation.precision_name} • {step9_interpretation.category_label}
            </div>
          </div>

          <div className="lg:col-span-8 p-5 rounded-xl bg-[#3C3D37]/70 border border-[#ECDFCC]/15 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-[#ECDFCC]/75 font-bold">
                Pola Biner Lengkap {format.total_bits}-Bit IEEE 754
              </span>
              <CopyButton
                value={report.complete_bit_pattern}
                label="Salin Pola Bit"
                variant="light"
              />
            </div>
            <div className="mt-3 font-mono text-sm sm:text-base md:text-lg font-bold text-[#ECDFCC] break-all leading-relaxed select-all">
              {report.complete_bit_pattern}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs sm:text-sm font-mono text-[#ECDFCC]/85">
              <span>Sign: {report.sign_bit_str}</span>
              <span>
                Exponent: {report.exponent_bits} ({step9_interpretation.biased_exponent_decimal}₁₀,
                e = {step9_interpretation.unbiased_exponent_decimal})
              </span>
              <span>Fraction: {format.fraction_bits} bit</span>
            </div>
          </div>
        </div>

        {/* Middle Grid: All Required Step 9 Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-[#3C3D37]/45 border border-[#ECDFCC]/10">
            <span className="text-xs uppercase tracking-wider text-[#ECDFCC]/70 block font-semibold">
              Nilai Input Desimal Asli
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-[#ECDFCC] mt-1.5 block break-all">
              {step9_interpretation.original_input}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#3C3D37]/45 border border-[#ECDFCC]/10">
            <span className="text-xs uppercase tracking-wider text-[#ECDFCC]/70 block font-semibold">
              Presisi Terpilih
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-[#ECDFCC] mt-1.5 block">
              {step9_interpretation.precision_name}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#3C3D37]/45 border border-[#ECDFCC]/10">
            <span className="text-xs uppercase tracking-wider text-[#ECDFCC]/70 block font-semibold">
              Bit Tanda & Polaritas
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-[#ECDFCC] mt-1.5 block">
              {step9_interpretation.sign_bit} ({step9_interpretation.sign_symbol === '-' ? 'Negatif' : 'Positif'})
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#3C3D37]/45 border border-[#ECDFCC]/10">
            <span className="text-xs uppercase tracking-wider text-[#ECDFCC]/70 block font-semibold">
              Field Eksponen ({format.exponent_bits} bit)
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-[#ECDFCC] mt-1.5 block break-all">
              {step9_interpretation.exponent_field_binary}₂ (Biased:{' '}
              {step9_interpretation.biased_exponent_decimal}, e ={' '}
              {step9_interpretation.unbiased_exponent_decimal})
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#3C3D37]/45 border border-[#ECDFCC]/10 sm:col-span-2">
            <span className="text-xs uppercase tracking-wider text-[#ECDFCC]/70 block font-semibold">
              Field Fraksi ({format.fraction_bits} bit)
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-[#ECDFCC] mt-1.5 block break-all">
              {step9_interpretation.fraction_field_binary}₂
            </span>
          </div>
        </div>

        {/* Exact Represented Decimal Value & Rounding Analysis */}
        <div className="rounded-xl bg-[#697565]/25 border border-[#697565] p-5 sm:p-6 space-y-3.5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#ECDFCC]">
              Akurasi Representasi & Status Pembulatan
            </span>
            <span
              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-mono font-bold ${
                step9_interpretation.is_exact_representation
                  ? 'bg-[#ECDFCC] text-[#181C14]'
                  : 'bg-[#3C3D37] text-[#ECDFCC] border border-[#ECDFCC]/30'
              }`}
            >
              {step9_interpretation.is_exact_representation
                ? 'Representasi Biner Eksak (Zero Error)'
                : 'Dibulatkan ke Nilai Terdekat (Round-to-Nearest)'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-sm font-mono">
            <div className="p-3.5 rounded-lg bg-[#181C14]/85 border border-[#ECDFCC]/15">
              <span className="text-xs uppercase text-[#ECDFCC]/70 block font-semibold">
                Nilai Desimal Tersimpan Sebenarnya
              </span>
              <span className="text-sm sm:text-base font-bold text-[#ECDFCC] mt-1 block break-all">
                {step9_interpretation.represented_decimal_exact}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-[#181C14]/85 border border-[#ECDFCC]/15">
              <span className="text-xs uppercase text-[#ECDFCC]/70 block font-semibold">
                Selisih (Nilai Tersimpan − Input Asli)
              </span>
              <span className="text-sm sm:text-base font-bold text-[#ECDFCC] mt-1 block break-all">
                {step9_interpretation.approximation_error}
              </span>
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#ECDFCC]/95 leading-relaxed">
            {step9_interpretation.accuracy_explanation}
          </p>

          <div className="text-xs sm:text-sm font-mono text-[#ECDFCC]/85 pt-2.5 border-t border-[#ECDFCC]/15 break-all">
            Rumus Rekonstruksi Desimal: {step9_interpretation.reconstruction_formula}
          </div>
        </div>

        {/* Documented Numerical Policy Disclosure */}
        <div className="flex items-start gap-3 text-xs sm:text-sm text-[#ECDFCC]/80 pt-2">
          <Info className="w-5 h-5 text-[#697565] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#ECDFCC]">Kaidah Representasi Numerik:</strong>{' '}
            {parsing_policy_note}
          </p>
        </div>
      </div>
    </section>
  );
};
