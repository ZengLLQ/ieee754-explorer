import type {
  ConversionReport,
  EngineMetadata,
  InputValidation,
  Precision,
} from '../types/ieee754';

interface Ieee754WasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  wasm_alloc: (size: number) => number;
  wasm_dealloc: (ptr: number, size: number) => void;
  wasm_result_ptr: () => number;
  wasm_result_len: () => number;
  wasm_convert_json: (ptr: number, len: number, precisionCode: number) => number;
  wasm_validate_json: (ptr: number, len: number) => number;
  wasm_metadata_json: () => number;
}

interface WasmConvertEnvelope {
  ok: boolean;
  data: ConversionReport | null;
  error: InputValidation | null;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
  }
}

let wasmExportsPromise: Promise<Ieee754WasmExports> | null = null;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

export type EngineRuntimeMode = 'tauri-native' | 'rust-wasm';

export function detectRuntimeMode(): EngineRuntimeMode {
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__?.invoke) {
    return 'tauri-native';
  }
  return 'rust-wasm';
}

/**
 * Loads the compiled `ieee754_core.wasm` module from `/wasm/ieee754_core.wasm`
 * (or directly from disk when executed under Vitest/Node).
 */
export async function initWasmEngine(customWasmBytes?: BufferSource): Promise<Ieee754WasmExports> {
  if (customWasmBytes) {
    const { instance } = await WebAssembly.instantiate(customWasmBytes, {});
    return instance.exports as Ieee754WasmExports;
  }

  if (!wasmExportsPromise) {
    wasmExportsPromise = (async () => {
      const wasmUrl = `${import.meta.env.BASE_URL || '/'}wasm/ieee754_core.wasm`;
      const response = await fetch(wasmUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM engine from ${wasmUrl} (${response.status})`);
      }

      try {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
          const cloned = response.clone();
          const { instance } = await WebAssembly.instantiateStreaming(cloned, {});
          return instance.exports as Ieee754WasmExports;
        }
      } catch {
        // Fallback to ArrayBuffer instantiation if server omits application/wasm header
      }

      const bytes = await response.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      return instance.exports as Ieee754WasmExports;
    })();
  }

  return wasmExportsPromise;
}

function readOutputJson<T>(exports: Ieee754WasmExports, outLen: number): T {
  const outPtr = exports.wasm_result_ptr();
  const view = new Uint8Array(exports.memory.buffer, outPtr, outLen);
  const jsonStr = textDecoder.decode(view);
  return JSON.parse(jsonStr) as T;
}

function callWithInputString<T>(
  exports: Ieee754WasmExports,
  input: string,
  fn: (ptr: number, len: number) => number,
): T {
  const encoded = textEncoder.encode(input);
  const len = encoded.byteLength;
  const ptr = len > 0 ? exports.wasm_alloc(len) : 0;

  try {
    if (len > 0) {
      const memView = new Uint8Array(exports.memory.buffer, ptr, len);
      memView.set(encoded);
    }
    const outLen = fn(ptr, len);
    return readOutputJson<T>(exports, outLen);
  } finally {
    if (len > 0 && ptr !== 0) {
      exports.wasm_dealloc(ptr, len);
    }
  }
}

export async function convertDecimalViaRust(
  input: string,
  precision: Precision,
  customExports?: Ieee754WasmExports,
): Promise<{ ok: true; data: ConversionReport } | { ok: false; error: InputValidation }> {
  if (!customExports && detectRuntimeMode() === 'tauri-native' && window.__TAURI_INTERNALS__) {
    try {
      const envelope = await window.__TAURI_INTERNALS__.invoke<WasmConvertEnvelope>(
        'convert_decimal_cmd',
        { input, precision },
      );
      if (envelope.ok && envelope.data) {
        return { ok: true, data: envelope.data };
      }
      if (envelope.error) {
        return { ok: false, error: envelope.error };
      }
    } catch {
      // Fall through to Rust WASM engine if Tauri command fails
    }
  }

  const exports = customExports ?? (await initWasmEngine());
  const precisionCode = precision === 'double' ? 1 : 0;
  const envelope = callWithInputString<WasmConvertEnvelope>(exports, input, (ptr, len) =>
    exports.wasm_convert_json(ptr, len, precisionCode),
  );

  if (envelope.ok && envelope.data) {
    return { ok: true, data: envelope.data };
  }
  return {
    ok: false,
    error: envelope.error ?? {
      is_valid: false,
      raw_input: input,
      trimmed_input: input.trim(),
      canonical_decimal: '',
      error_message: 'Invalid decimal input.',
      warning_message: null,
      preserves_negative_zero: false,
      is_scientific_notation: false,
      is_special_literal: false,
    },
  };
}

export async function validateDecimalViaRust(
  input: string,
  customExports?: Ieee754WasmExports,
): Promise<InputValidation> {
  if (!customExports && detectRuntimeMode() === 'tauri-native' && window.__TAURI_INTERNALS__) {
    try {
      return await window.__TAURI_INTERNALS__.invoke<InputValidation>('validate_input_cmd', {
        input,
      });
    } catch {
      // Fall through to WASM
    }
  }

  const exports = customExports ?? (await initWasmEngine());
  return callWithInputString<InputValidation>(exports, input, (ptr, len) =>
    exports.wasm_validate_json(ptr, len),
  );
}

export async function fetchEngineMetadata(
  customExports?: Ieee754WasmExports,
): Promise<EngineMetadata> {
  const exports = customExports ?? (await initWasmEngine());
  const outLen = exports.wasm_metadata_json();
  return readOutputJson<EngineMetadata>(exports, outLen);
}
