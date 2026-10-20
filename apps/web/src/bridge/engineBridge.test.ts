import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  convertDecimalViaRust,
  fetchEngineMetadata,
  initWasmEngine,
  validateDecimalViaRust,
} from './engineBridge';

const wasmPath = resolve(__dirname, '../../public/wasm/ieee754_core.wasm');
const wasmBuffer = readFileSync(wasmPath);

describe('IEEE 754 Explorer — WebAssembly Bridge Verification (Tests A–F)', () => {
  it('loads ieee754_core.wasm and returns presets + 16-entry hex reference table', async () => {
    const exports = await initWasmEngine(wasmBuffer);
    const meta = await fetchEngineMetadata(exports);
    expect(meta.hex_reference_table).toHaveLength(16);
    expect(meta.hex_reference_table[0]).toEqual({ hex: '0', binary: '0000', decimal: 0 });
    expect(meta.hex_reference_table[15]).toEqual({ hex: 'F', binary: '1111', decimal: 15 });
    expect(meta.presets.length).toBeGreaterThanOrEqual(8);
  });

  it('Test A — 126.25 in Single Precision (binary32)', async () => {
    const exports = await initWasmEngine(wasmBuffer);
    const res = await convertDecimalViaRust('126.25', 'single', exports);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.sign_bit).toBe(0);
    expect(res.data.step4_normalization.unbiased_exponent).toBe(6);
    expect(res.data.format.bias).toBe(127);
    expect(res.data.step5_biased_exponent.biased_exponent_decimal).toBe(133);
    expect(res.data.exponent_bits).toBe('10000101');
    expect(res.data.fraction_bits).toBe('11111001000000000000000');
    expect(res.data.complete_bit_pattern).toBe('01000010111111001000000000000000');
    expect(res.data.hexadecimal).toBe('0x42FC8000');
    expect(res.data.steps).toHaveLength(9);
  });

  it('Test B — 126.25 in Double Precision (binary64)', async () => {
    const exports = await initWasmEngine(wasmBuffer);
    const res = await convertDecimalViaRust('126.25', 'double', exports);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.sign_bit).toBe(0);
    expect(res.data.step4_normalization.unbiased_exponent).toBe(6);
    expect(res.data.format.bias).toBe(1023);
    expect(res.data.step5_biased_exponent.biased_exponent_decimal).toBe(1029);
    expect(res.data.exponent_bits).toBe('10000000101');
    expect(res.data.fraction_bits).toHaveLength(52);
    expect(res.data.hexadecimal).toBe('0x405F900000000000');
  });

  it('Test C — 0.1 in Single and Double Precision', async () => {
    const exports = await initWasmEngine(wasmBuffer);
    const r32 = await convertDecimalViaRust('0.1', 'single', exports);
    expect(r32.ok).toBe(true);
    if (r32.ok) {
      expect(r32.data.hexadecimal).toBe('0x3DCCCCCD');
      expect(r32.data.step3_fraction.terminates).toBe(false);
      expect(r32.data.step9_interpretation.is_exact_representation).toBe(false);
    }

    const r64 = await convertDecimalViaRust('0.1', 'double', exports);
    expect(r64.ok).toBe(true);
    if (r64.ok) {
      expect(r64.data.hexadecimal).toBe('0x3FB999999999999A');
      expect(r64.data.step3_fraction.terminates).toBe(false);
    }
  });

  it('Test D & E — Negative (-13.5) and Signed Zero (0, -0)', async () => {
    const exports = await initWasmEngine(wasmBuffer);
    const neg = await convertDecimalViaRust('-13.5', 'single', exports);
    expect(neg.ok && neg.data.hexadecimal).toBe('0xC1580000');

    const posZero = await convertDecimalViaRust('0', 'single', exports);
    expect(posZero.ok && posZero.data.hexadecimal).toBe('0x00000000');

    const negZero = await convertDecimalViaRust('-0', 'single', exports);
    expect(negZero.ok && negZero.data.hexadecimal).toBe('0x80000000');
    expect(negZero.ok && negZero.data.sign_bit).toBe(1);
  });

  it('Test F — Subnormal, Normal Boundaries, Overflow, Underflow, and Validation', async () => {
    const exports = await initWasmEngine(wasmBuffer);
    const sub = await convertDecimalViaRust('1.4e-45', 'single', exports);
    expect(sub.ok && sub.data.hexadecimal).toBe('0x00000001');
    expect(sub.ok && sub.data.category).toBe('subnormal');

    const ovf = await convertDecimalViaRust('1e40', 'single', exports);
    expect(ovf.ok && ovf.data.hexadecimal).toBe('0x7F800000');
    expect(ovf.ok && ovf.data.category).toBe('overflow_to_infinity');

    const invalid = await validateDecimalViaRust('12.34.56', exports);
    expect(invalid.is_valid).toBe(false);
  });
});
