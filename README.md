# IEEE 754 Explorer

**Interactive Floating-Point Architecture Laboratory — Rust Core + Tauri 2 Desktop App + WebAssembly React Web App**

IEEE 754 Explorer is an educational application designed for university students studying **Digital Systems**, **Computer Organization**, and **Computer Architecture**. It converts decimal numbers into **IEEE 754 Single Precision (`binary32`)** and **Double Precision (`binary64`)** representations while explaining every mathematical step from the original decimal string down to the final bit pattern and hexadecimal word.

---

## 1. Core Features

- **Centralized Rust Numerical Engine (`crates/ieee754-core`)**:
  - Single source of mathematical truth powering both the Windows desktop application (via Tauri 2 native commands) and the browser web application (via WebAssembly).
  - Authoritative bit patterns obtained from Rust's `f32::to_bits()` and `f64::to_bits()`, paired with an exact decimal-digit educational derivation engine that cross-verifies its rounded output against the hardware primitive.
- **Complete 9-Step Sequential Conversion Engine**:
  1. **Step 1 — Input Analysis**: Bit layout (`Sign | Exponent | Fraction`), bit counts, and format bias (`127` for `binary32`, `1023` for `binary64`).
  2. **Step 2 — Determine the Sign Bit**: Sign bit extraction (`0` for positive / `+0`, `1` for negative / `-0`) with explicit negative-zero preservation.
  3. **Step 3 — Convert Decimal to Binary**:
     - **3A. Integer Part**: Dynamic repeated division-by-2 table (`Division | Quotient | Remainder`) read from bottom to top.
     - **3B. Fractional Part**: Dynamic repeated multiplication-by-2 table (`Step | Fraction × 2 | Integer Bit | Remaining Fraction`) read from top to bottom, with automatic cycle detection for non-terminating repeating fractions (such as `0.1`).
  4. **Step 4 — Normalize the Binary Number**: Interactive binary point movement visualization (`1.xxxxx₂ × 2^e`), handling normal numbers, subnormal numbers (`0.xxxxx₂ × 2^(1 - Bias)`), signed zeros, and overflow/underflow.
  5. **Step 5 — Calculate the Biased Exponent**: Formula `Biased Exponent = Unbiased Exponent + Bias` (`Bias = 2^(k-1) - 1`) and dynamic repeated division-by-2 table encoding the biased exponent into 8 or 11 bits.
  6. **Step 6 — Determine the Fraction Field**: Hidden leading bit omission, exact `23`-bit or `52`-bit fraction extraction, and **IEEE 754 Round-to-Nearest, Ties-to-Even** inspection showing Guard (`G`), Round (`R`), and Sticky (`S`) bits.
  7. **Step 7 — Assemble the IEEE 754 Bit Pattern**: Complete 32-bit or 64-bit word assembly with accessible field labels (`SIGN`, `EXPONENT`, `FRACTION`) and one-click copy.
  8. **Step 8 — Convert Binary to Hexadecimal**: Dynamic 4-bit nibble grouping table (`8` hex digits for single precision, `16` hex digits for double precision) alongside the standard `0000₂–1111₂` (`0–F`) lookup table.
  9. **Step 9 — Final Result and Interpretation**: Exact decimal value stored in memory (e.g., `0.100000001490116119384765625` for `0.1` in `binary32`), representation error analysis, and verification status.

---

## 2. Project Architecture

```text
.
├── Cargo.toml                  # Rust workspace manifest (ieee754-core, apps/desktop, tests)
├── vercel.json                 # Root Vercel deployment configuration & WASM MIME headers
├── crates/
│   └── ieee754-core/           # Centralized Rust IEEE 754 conversion & educational engine
│       ├── Cargo.toml          # Builds both rlib (native) and cdylib (wasm32-unknown-unknown)
│       └── src/
│           ├── lib.rs          # Public Rust API + WebAssembly C-ABI memory & JSON exports
│           ├── types.rs        # Serializable data structures for all 9 steps & tables
│           ├── parser.rs       # Decimal input validation, -0 preservation, digit decomposition
│           ├── decimal_math.rs # Exact decimal division-by-2, multiplication-by-2, exact float expansion
│           └── engine.rs       # 9-step IEEE 754 derivation and f32/f64::to_bits() verification
├── apps/
│   ├── web/                    # React 18 + TypeScript + Vite + Tailwind CSS v4 frontend
│   │   ├── public/wasm/        # Compiled ieee754_core.wasm binary served to the browser
│   │   ├── src/
│   │   │   ├── bridge/         # Unified Tauri native & WebAssembly bridge + Vitest suite
│   │   │   ├── components/     # FormatOverview, BitVisualization, StepByStep, HexReference, FinalResult
│   │   │   ├── types/          # TypeScript interfaces matching ieee754-core
│   │   │   └── App.tsx         # Single-page editorial interface
│   │   └── vercel.json         # App-level Vercel configuration
│   └── desktop/                # Tauri 2 Windows desktop application
│       ├── Cargo.toml          # Links ieee754-core natively
│       ├── tauri.conf.json     # Window & Windows installer (NSIS / MSI) configuration
│       └── src/                # Tauri native command handlers (convert_decimal_cmd, etc.)
├── tests/                      # Workspace integration & mandatory test cases (Tests A–F)
└── scripts/
    └── build-wasm.ps1          # Rebuilds ieee754_core.wasm and copies to apps/web/public/wasm/
```

---

## 3. Installation Requirements

- **Rust**: `rustc` / `cargo` 1.75+ (with `x86_64-pc-windows-msvc` for Windows desktop and `wasm32-unknown-unknown` for WebAssembly builds).
- **Node.js**: Node.js 20+ and `npm` 10+.
- **Windows Desktop Build Prerequisites** (for Tauri 2):
  - Microsoft Visual Studio C++ Build Tools
  - WebView2 Runtime (pre-installed on Windows 10/11)

---

## 4. Running Tests

### Run Rust Core & Mandatory Integration Tests (Tests A–F)

```powershell
cargo test -p ieee754-core -p ieee754-tests
```

### Run Frontend WebAssembly Integration Tests (Vitest)

```powershell
cd apps/web
npm test
```

---

## 5. Running & Building the Web Application

### Development Server

```powershell
cd apps/web
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Rebuilding the WebAssembly Module from Rust

Whenever you modify `crates/ieee754-core`, rebuild the `.wasm` module with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-wasm.ps1
```

### Production Web Build

```powershell
cd apps/web
npm run build
```

The production-ready static bundle (including `/wasm/ieee754_core.wasm`) is emitted to `apps/web/dist`.

---

## 6. Running & Building the Windows Desktop Application (Tauri 2)

### Desktop Development Mode

```powershell
cd apps/desktop
npm install
npm run dev
```

### Build Windows Desktop Executable & Installer (`.exe`)

```powershell
cd apps/desktop
npm install
npx tauri build --bundles nsis
```

Build artifacts are generated at:
- **Standalone Windows Executable**: `target/release/ieee754-desktop.exe`
- **Windows NSIS Installer (`.exe`)**: `target/release/bundle/nsis/IEEE 754 Explorer_0.1.0_x64-setup.exe`

---

## 7. Deploying the Web App to Vercel

The repository includes both a root `vercel.json` and `apps/web/vercel.json` with `application/wasm` MIME headers preconfigured:

1. Push this repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com/new).
3. Either leave the **Root Directory** as `./` (uses root `vercel.json`) or set **Root Directory** to `apps/web`:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build` (or `cd apps/web && npm run build` from root)
   - **Output Directory**: `dist` (or `apps/web/dist` from root)
4. Click **Deploy**. No environment variables, external databases, or backend servers are required — all IEEE 754 conversions run directly in the browser via `ieee754_core.wasm`.

---

## 8. Floating-Point Representation Limitations & Parsing Policy

1. **Non-Terminating Binary Fractions**: Many terminating decimal fractions (such as `0.1₁₀`) do not have a finite representation in base 2 because `10 = 2 × 5` and `1/5` repeats infinitely in binary (`0.0001100110011...₂`). IEEE 754 rounds such numbers to the nearest representable `23`-bit (`binary32`) or `52`-bit (`binary64`) fraction using **Round-to-Nearest, Ties-to-Even**.
2. **Documented Parsing Policy**:
   - The user's raw decimal string is validated and decomposed into exact decimal integer and fractional digits **before** any floating-point conversion so the input string is never prematurely truncated or rounded.
   - For the authoritative IEEE 754 bit pattern, Single Precision parses the input string directly into Rust's `f32` primitive (`str::parse::<f32>()` + `f32::to_bits()`) and Double Precision parses directly into `f64` (`str::parse::<f64>()` + `f64::to_bits()`). Both use Rust's exact Clinger / Eisel-Lemire decimal-to-binary rounding algorithm, avoiding double-rounding artifacts.
   - For inputs with extreme base-10 exponents (`|exponent| > 60`, such as `1.7976931348623157e308`), Step 3 limits the length of the educational division/multiplication tables while preserving 100% accuracy in the final encoding.

---

## 9. Example Inputs and Expected Outputs

| Test Case | Input | Precision | Sign | Biased Exp | Unbiased Exp | Hexadecimal | Category / Notes |
|---|---|---|---|---|---|---|---|
| **Test A** | `126.25` | Single (`binary32`) | `0` | `133` (`10000101₂`) | `6` | `0x42FC8000` | Exact (`1111110.01₂ = 1.11111001₂ × 2⁶`) |
| **Test B** | `126.25` | Double (`binary64`) | `0` | `1029` (`10000000101₂`) | `6` | `0x405F900000000000` | Exact (52-bit fraction) |
| **Test C (32)** | `0.1` | Single (`binary32`) | `0` | `123` (`01111011₂`) | `-4` | `0x3DCCCCCD` | Repeating binary fraction, rounded up |
| **Test C (64)** | `0.1` | Double (`binary64`) | `0` | `1019` (`01111111011₂`) | `-4` | `0x3FB999999999999A` | Repeating binary fraction, rounded up |
| **Test D (32)** | `-13.5` | Single (`binary32`) | `1` | `130` (`10000010₂`) | `3` | `0xC1580000` | Negative normal number, exact |
| **Test D (64)** | `-13.5` | Double (`binary64`) | `1` | `1026` (`10000000010₂`) | `3` | `0xC02B000000000000` | Negative normal number, exact |
| **Test E (+0)** | `0` | Single (`binary32`) | `0` | `0` (`00000000₂`) | `0` | `0x00000000` | Positive zero (`+0`) |
| **Test E (-0)** | `-0` | Single (`binary32`) | `1` | `0` (`00000000₂`) | `0` | `0x80000000` | Signed negative zero (`-0`) |
| **Test F (Sub)** | `1.4e-45` | Single (`binary32`) | `0` | `0` (`00000000₂`) | `-126` | `0x00000001` | Smallest positive subnormal (`2⁻¹⁴⁹`) |
| **Test F (Min)** | `1.17549435e-38` | Single (`binary32`) | `0` | `1` (`00000001₂`) | `-126` | `0x00800000` | Smallest positive normal (`2⁻¹²⁶`) |
| **Test F (Max)** | `3.4028235e38` | Single (`binary32`) | `0` | `254` (`11111110₂`) | `127` | `0x7F7FFFFF` | Largest finite `binary32` value |
| **Test F (Ovf)** | `1e40` | Single (`binary32`) | `0` | `255` (`11111111₂`) | `128` | `0x7F800000` | Overflows `binary32` to `+Infinity` |
