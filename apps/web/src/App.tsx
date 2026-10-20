import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Cpu,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  convertDecimalViaRust,
  detectRuntimeMode,
  fetchEngineMetadata,
  validateDecimalViaRust,
} from './bridge/engineBridge';
import type {
  ConversionReport,
  ExamplePreset,
  InputValidation,
  Precision,
} from './types/ieee754';
import { CopyButton } from './components/CopyButton';
import { FormatOverviewSection } from './components/FormatOverviewSection';
import { BitVisualizationSection } from './components/BitVisualizationSection';
import { StepByStepSection } from './components/StepByStepSection';
import { HexReferenceSection } from './components/HexReferenceSection';
import { FinalResultSection } from './components/FinalResultSection';

const DEFAULT_PRESETS: ExamplePreset[] = [
  {
    label: '126.25',
    input: '126.25',
    description: 'Reference handwritten example (exact normal binary fraction)',
    recommended_precision: 'single',
  },
  {
    label: '0.1',
    input: '0.1',
    description: 'Infinite repeating binary fraction (0.000110011...₂)',
    recommended_precision: null,
  },
  {
    label: '-13.5',
    input: '-13.5',
    description: 'Negative normal number (Sign = 1)',
    recommended_precision: null,
  },
  {
    label: '-0',
    input: '-0',
    description: 'Signed negative zero (Sign = 1)',
    recommended_precision: null,
  },
  {
    label: '3.141592653589793',
    input: '3.141592653589793',
    description: 'High-precision π approximation',
    recommended_precision: 'double',
  },
  {
    label: '1.4e-45',
    input: '1.4e-45',
    description: 'Smallest positive subnormal in binary32',
    recommended_precision: 'single',
  },
  {
    label: '1.17549435e-38',
    input: '1.17549435e-38',
    description: 'Smallest positive normal in binary32',
    recommended_precision: 'single',
  },
  {
    label: '3.4028235e38',
    input: '3.4028235e38',
    description: 'Largest finite value in binary32',
    recommended_precision: 'single',
  },
  {
    label: '1e40',
    input: '1e40',
    description: 'Overflows binary32 to +Infinity, normal in binary64',
    recommended_precision: 'single',
  },
];

export const App: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('126.25');
  const [precision, setPrecision] = useState<Precision>('single');
  const [report, setReport] = useState<ConversionReport | null>(null);
  const [validationError, setValidationError] = useState<InputValidation | null>(null);
  const [liveValidation, setLiveValidation] = useState<InputValidation | null>(null);
  const [presets, setPresets] = useState<ExamplePreset[]>(DEFAULT_PRESETS);
  const [engineReady, setEngineReady] = useState<boolean>(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  const runtimeMode = detectRuntimeMode();

  const executeConversion = useCallback(
    async (targetInput: string, targetPrecision: Precision) => {
      try {
        const res = await convertDecimalViaRust(targetInput, targetPrecision);
        setEngineReady(true);
        setEngineError(null);
        if (res.ok) {
          setReport(res.data);
          setValidationError(null);
          setLiveValidation(res.data.validation);
        } else {
          setValidationError(res.error);
          setLiveValidation(res.error);
        }
      } catch (err) {
        setEngineError(
          err instanceof Error
            ? err.message
            : 'Failed to initialize the Rust WebAssembly conversion engine.',
        );
      }
    },
    [],
  );

  // Initialize metadata & run initial conversion on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const meta = await fetchEngineMetadata();
        if (active && meta.presets.length > 0) {
          setPresets(meta.presets);
        }
      } catch {
        // Fallback to DEFAULT_PRESETS
      }
      if (active) {
        await executeConversion('126.25', 'single');
      }
    })();
    return () => {
      active = false;
    };
  }, [executeConversion]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setInputValue(nextVal);
    if (!nextVal.trim()) {
      setLiveValidation({
        is_valid: false,
        raw_input: nextVal,
        trimmed_input: '',
        canonical_decimal: '',
        error_message: 'Enter a decimal value to convert (e.g., 126.25, 0.1, -13.5, or -0).',
        warning_message: null,
        preserves_negative_zero: false,
        is_scientific_notation: false,
        is_special_literal: false,
      });
      return;
    }
    try {
      const valResult = await validateDecimalViaRust(nextVal);
      setLiveValidation(valResult);
      if (valResult.is_valid) {
        setValidationError(null);
      }
    } catch {
      // Ignore validation error before engine init
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeConversion(inputValue, precision);
  };

  const handlePrecisionSwitch = async (nextPrecision: Precision) => {
    setPrecision(nextPrecision);
    const targetInput = inputValue.trim() ? inputValue : report?.original_input ?? '126.25';
    if (!inputValue.trim()) {
      setInputValue(targetInput);
    }
    await executeConversion(targetInput, nextPrecision);
  };

  const handlePresetClick = async (preset: ExamplePreset) => {
    setInputValue(preset.input);
    const nextPrecision = preset.recommended_precision ?? precision;
    if (preset.recommended_precision) {
      setPrecision(preset.recommended_precision);
    }
    await executeConversion(preset.input, nextPrecision);
  };

  const handleClearInput = () => {
    setInputValue('');
    setValidationError(null);
    setLiveValidation({
      is_valid: false,
      raw_input: '',
      trimmed_input: '',
      canonical_decimal: '',
      error_message: 'Input cleared. Enter a decimal number or select an example preset below.',
      warning_message: null,
      preserves_negative_zero: false,
      is_scientific_notation: false,
      is_special_literal: false,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#ECDFCC] text-[#181C14]">
      {/* 1. Minimal Top Navigation */}
      <header className="sticky top-0 z-30 bg-[#ECDFCC]/95 backdrop-blur-sm border-b border-[#181C14]/15">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-[#181C14] text-[#ECDFCC] font-mono text-xs font-bold flex items-center justify-center">
              754
            </div>
            <span className="font-bold tracking-tight text-sm sm:text-base text-[#181C14]">
              IEEE 754 Explorer
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#3C3D37] text-[#ECDFCC]">
              <Cpu className="w-3 h-3 text-[#697565]" />
              {runtimeMode === 'tauri-native'
                ? 'Rust Native Core (Tauri 2)'
                : engineReady
                  ? 'Rust WebAssembly Core'
                  : 'Initializing Rust Core'}
            </span>
          </div>

          <nav aria-label="Section navigation" className="hidden sm:flex items-center gap-5 text-xs font-medium text-[#3C3D37]">
            <a href="#format-overview" className="hover:text-[#181C14] transition-colors">
              Format Overview
            </a>
            <a href="#bit-visualization" className="hover:text-[#181C14] transition-colors">
              Bit Visualization
            </a>
            <a href="#step-by-step" className="hover:text-[#181C14] transition-colors">
              9-Step Derivation
            </a>
            <a href="#hex-reference" className="hover:text-[#181C14] transition-colors">
              Hex Table
            </a>
            <a href="#final-result" className="hover:text-[#181C14] transition-colors">
              Final Result
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* 2 & 3. Hero Section + Decimal Input + Precision Selector */}
        <section className="py-8 sm:py-12" aria-labelledby="hero-heading">
          <div className="max-w-3xl mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#697565] mb-2">
              Digital Systems & Computer Architecture Laboratory
            </p>
            <h1
              id="hero-heading"
              className="text-3xl sm:text-5xl font-bold tracking-tight text-[#181C14] leading-[1.1]"
            >
              IEEE 754 Floating-Point Conversion, Bit by Bit.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#3C3D37] leading-relaxed">
              Enter any decimal number — positive, negative, fractional, signed zero, or scientific
              notation — to inspect the exact mathematical steps, normalization shift, biased
              exponent, IEEE 754 rounding, and hexadecimal encoding.
            </p>
          </div>

          {/* Primary Input & Precision Control Surface */}
          <div className="rounded-xl bg-[#181C14] text-[#ECDFCC] p-4 sm:p-6 border border-[#3C3D37]">
            {/* Precision Segmented Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#ECDFCC]/15">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#697565] block">
                  Select Target Floating-Point Precision
                </span>
                <span className="text-xs text-[#ECDFCC]/80">
                  Switching modes updates all 9 steps, bit fields, bias, and hexadecimal output
                  immediately.
                </span>
              </div>

              <div
                className="inline-grid grid-cols-2 p-1 rounded-lg bg-[#3C3D37] border border-[#ECDFCC]/15 self-start sm:self-auto"
                role="radiogroup"
                aria-label="Floating-point precision selector"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={precision === 'single'}
                  onClick={() => handlePrecisionSwitch('single')}
                  className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    precision === 'single'
                      ? 'bg-[#ECDFCC] text-[#181C14] shadow-xs'
                      : 'text-[#ECDFCC]/80 hover:text-[#ECDFCC]'
                  }`}
                >
                  <span className="block font-bold">Single Precision</span>
                  <span className="font-mono text-[10px] opacity-80">
                    binary32 • 32-bit (Bias 127)
                  </span>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={precision === 'double'}
                  onClick={() => handlePrecisionSwitch('double')}
                  className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    precision === 'double'
                      ? 'bg-[#ECDFCC] text-[#181C14] shadow-xs'
                      : 'text-[#ECDFCC]/80 hover:text-[#ECDFCC]'
                  }`}
                >
                  <span className="block font-bold">Double Precision</span>
                  <span className="font-mono text-[10px] opacity-80">
                    binary64 • 64-bit (Bias 1023)
                  </span>
                </button>
              </div>
            </div>

            {/* Decimal Input Form */}
            <form onSubmit={handleFormSubmit} noValidate>
              <label
                htmlFor="decimal-input"
                className="block text-xs font-semibold uppercase tracking-wider text-[#ECDFCC]/80 mb-2"
              >
                Decimal Number Input (Standard, Fractional, Signed -0, or Scientific Notation e.g.
                1.25e-10)
              </label>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div
                  className={`relative flex-1 flex items-center rounded-lg bg-[#ECDFCC] text-[#181C14] border-2 transition-all ${
                    validationError || (liveValidation && !liveValidation.is_valid)
                      ? 'border-amber-500'
                      : isInputFocused
                        ? 'border-[#697565]'
                        : 'border-transparent'
                  }`}
                >
                  <input
                    id="decimal-input"
                    type="text"
                    inputMode="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder="Enter a decimal value (e.g., 126.25, 0.1, -13.5, -0, 1.25e-10)..."
                    aria-invalid={
                      !!validationError || (liveValidation ? !liveValidation.is_valid : false)
                    }
                    aria-describedby="input-validation-feedback"
                    className="w-full px-4 py-3 pr-10 bg-transparent text-[#181C14] placeholder-[#3C3D37]/60 font-mono text-base sm:text-lg font-semibold focus:outline-none"
                  />
                  {inputValue.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearInput}
                      aria-label="Clear decimal input"
                      title="Clear input"
                      className="absolute right-2.5 p-1.5 rounded-md text-[#3C3D37] hover:text-[#181C14] hover:bg-[#181C14]/10 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#697565] hover:bg-[#7A8775] text-[#ECDFCC] font-semibold text-sm transition-colors cursor-pointer shrink-0"
                >
                  <span>Convert to IEEE 754</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Validation & Precision Feedback */}
              <div id="input-validation-feedback" className="mt-2.5 min-h-[22px] text-xs">
                {engineError ? (
                  <div className="flex items-center gap-2 text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{engineError}</span>
                  </div>
                ) : validationError?.error_message ||
                  (liveValidation && !liveValidation.is_valid && liveValidation.error_message) ? (
                  <div className="flex items-center justify-between gap-2 text-amber-200 bg-[#3C3D37] px-3 py-2 rounded-md border border-amber-400/40">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-300" />
                      <span>
                        {validationError?.error_message ?? liveValidation?.error_message}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePresetClick(DEFAULT_PRESETS[0])}
                      className="inline-flex items-center gap-1 font-mono underline text-[#ECDFCC] shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore 126.25
                    </button>
                  </div>
                ) : liveValidation?.warning_message ? (
                  <div className="text-[#ECDFCC]/85 bg-[#3C3D37]/80 px-3 py-1.5 rounded">
                    Note: {liveValidation.warning_message}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[#ECDFCC]/70">
                    <span>
                      Press <kbd className="px-1.5 py-0.5 rounded bg-[#3C3D37] font-mono text-[11px]">Enter</kbd>{' '}
                      or click <strong className="text-[#ECDFCC]">Convert to IEEE 754</strong>.
                      Original decimal string is preserved without premature rounding.
                    </span>
                    {liveValidation?.preserves_negative_zero && (
                      <span className="font-mono text-[#ECDFCC] bg-[#697565] px-2 py-0.5 rounded text-[11px]">
                        Negative Zero (-0) Sign Preserved
                      </span>
                    )}
                  </div>
                )}
              </div>
            </form>

            {/* Clickable Example Presets */}
            <div className="mt-4 pt-4 border-t border-[#ECDFCC]/15">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#ECDFCC]/70 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#697565]" />
                <span>Curated Educational Test Cases (Click to Populate & Convert)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => {
                  const isActive =
                    report?.original_input === preset.input &&
                    (!preset.recommended_precision || preset.recommended_precision === precision);
                  return (
                    <button
                      key={preset.input}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      title={preset.description}
                      className={`px-2.5 py-1.5 rounded-md font-mono text-xs transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#ECDFCC] text-[#181C14] border-[#ECDFCC] font-bold'
                          : 'bg-[#3C3D37]/70 text-[#ECDFCC] border-[#ECDFCC]/15 hover:bg-[#3C3D37] hover:border-[#ECDFCC]/40'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Immediate Above-the-Fold Result Summary Banner */}
          {report && (
            <div
              className="mt-4 rounded-xl bg-[#3C3D37] text-[#ECDFCC] p-4 sm:p-5 border border-[#181C14]/30 transition-all duration-200"
              aria-live="polite"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#697565] text-[#ECDFCC] font-bold">
                      {report.format.standard_name}
                    </span>
                    <span className="text-xs text-[#ECDFCC]/80 font-medium">
                      {report.step9_interpretation.category_label}
                    </span>
                    <span className="text-xs font-mono text-[#ECDFCC]/70">
                      • Input: {report.original_input}₁₀
                    </span>
                  </div>

                  <div className="font-mono text-xs sm:text-sm break-all pt-1">
                    <span className="text-[#ECDFCC]/70 mr-1.5">Bits:</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#ECDFCC] text-[#181C14] font-bold mr-1">
                      {report.sign_bit_str}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#697565] text-[#ECDFCC] font-bold mr-1">
                      {report.exponent_bits}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#181C14] text-[#ECDFCC]">
                      {report.fraction_bits}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="px-3.5 py-2 rounded-lg bg-[#181C14] border border-[#ECDFCC]/15">
                    <span className="text-[10px] font-mono uppercase text-[#ECDFCC]/65 block">
                      Hexadecimal
                    </span>
                    <span className="font-mono text-lg sm:text-xl font-bold text-[#ECDFCC]">
                      {report.hexadecimal}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <CopyButton value={report.hexadecimal} label="Copy Hex" variant="light" />
                    <CopyButton
                      value={report.complete_bit_pattern}
                      label="Copy Bits"
                      variant="dark"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Render Sections 4 through 8 when a conversion report is active */}
        {report && (
          <>
            {/* 4. IEEE 754 Format Overview */}
            <FormatOverviewSection report={report} />

            {/* 5. Interactive Bit-Pattern Visualization */}
            <BitVisualizationSection report={report} />

            {/* 6. Step-by-Step Conversion Engine (Steps 1–9) */}
            <StepByStepSection report={report} />

            {/* 7. Hexadecimal Conversion & Reference Table */}
            <HexReferenceSection report={report} />

            {/* 8. Final Result & Interpretation */}
            <FinalResultSection report={report} />
          </>
        )}
      </main>

      {/* 9. Minimal Footer */}
      <footer className="mt-12 border-t border-[#181C14]/15 bg-[#181C14] text-[#ECDFCC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#ECDFCC]/75">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded bg-[#697565] text-[#ECDFCC] font-mono text-[10px] font-bold flex items-center justify-center">
              754
            </span>
            <span className="font-semibold text-[#ECDFCC]">IEEE 754 Explorer</span>
            <span>— Centralized Rust Numerical Core (`ieee754-core`) + WebAssembly & Tauri 2</span>
          </div>
          <div className="font-mono text-[11px] text-[#ECDFCC]/65">
            IEEE Std 754-2019 Compliant • Round-to-Nearest, Ties-to-Even
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
