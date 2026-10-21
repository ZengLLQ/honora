# Tutor Payment Records Application

A production-ready application for private tutors to record, organize, audit, and review student bank transfer receipts.

Designed with a distinctive visual identity inspired by [`Heron AI`](https://heronaiapp.com/): BT Grotesk typography, warm parchment background with subtle texture, hairline structural borders, deep charcoal typography, Heron brand indigo accents (`#3B3BE6`), and restrained purposeful motion.

---

## Desktop Installers & Releases

Download the official desktop application with offline SQLite database, receipt archive management, and automatic image compression:

[![Latest Release](https://img.shields.io/github/v/release/ZengLLQ/tutor-payment-records?color=3B3BE6&label=Latest%20Release)](https://github.com/ZengLLQ/tutor-payment-records/releases/latest)

| Platform | Format | Download Link | Architecture |
|---|---|---|---|
| **macOS** | `.dmg` | [Tutor.Payment.Records_0.1.0_universal.dmg](https://github.com/ZengLLQ/tutor-payment-records/releases/download/v0.1.0/Tutor.Payment.Records_0.1.0_universal.dmg) | Apple Silicon (M1/M2/M3/M4) & Intel x86_64 |
| **macOS** | `.app.tar.gz` | [Tutor.Payment.Records_universal.app.tar.gz](https://github.com/ZengLLQ/tutor-payment-records/releases/download/v0.1.0/Tutor.Payment.Records_universal.app.tar.gz) | Apple Silicon & Intel Universal Bundle |
| **Windows** | `.exe` (Setup) | [Tutor.Payment.Records_0.1.0_x64-setup.exe](https://github.com/ZengLLQ/tutor-payment-records/releases/download/v0.1.0/Tutor.Payment.Records_0.1.0_x64-setup.exe) | Windows 10 / 11 (64-bit) |
| **Windows** | `.msi` | [Tutor.Payment.Records_0.1.0_x64_en-US.msi](https://github.com/ZengLLQ/tutor-payment-records/releases/download/v0.1.0/Tutor.Payment.Records_0.1.0_x64_en-US.msi) | Windows MSI Package |

All installers include the full brand logo suite (`.ico`, `.icns`, PNG), system tray integration, and native high-DPI scaling.

---

## Documentation

- **[Technical Architecture & Specification](docs/ARCHITECTURE.md)**: Deep dive into the dual-target system topology, IPC bridge, SQLite/IndexedDB persistence, automatic image optimization pipeline, and security model.
- **[Deployment Guide](docs/DEPLOYMENT.md)**: Comprehensive guide for deploying to **Vercel** and compiling standalone Tauri 2 native desktop binaries.

---

## 1. Key Features

- **Primary Tutor Workflow**:
  1. Enter student name.
  2. Select transfer date (defaulting to today).
  3. Enter transfer amount in integer Indonesian Rupiah (`IDR`).
  4. Select payment status (`PAID` or `UNPAID`).
  5. Upload bank transfer receipt (automatically compressed).
  6. Save payment record.
  7. Search, review, inspect, edit, or delete records.
- **Interactive PAID / UNPAID Status Toggle**:
  - One-click status badge on every record row (`RecordItem`) with immediate optimistic UI updates and concurrent click throttling.
  - Safe, idempotent SQLite schema migration in Rust backend (`ALTER TABLE payment_records ADD COLUMN status TEXT NOT NULL DEFAULT 'PAID'`).
  - Modal status selector in `PaymentModal` and live toggle badge in `ReceiptViewerModal`.
  - Comprehensive status filtering (`ALL STATUS`, `PAID ONLY`, `UNPAID ONLY`) in the Filter Bar with dynamic financial summary synchronization.
- **Unified Brand Logo**:
  - Signature Heron AI geometric brand mark deployed across the top navigation bar, the main page hero head title (`PAYMENT RECORDS.`), and the browser tab `favicon.svg`.
- **Automatic Receipt Image Optimization**:
  - Validates file content using magic byte signatures (JPEG, PNG, WebP) up to 20 MB.
  - Automatically downsamples oversized receipts preserving aspect ratio (max 2000 × 3000 px).
  - Intelligently preserves lossless PNG sharpness for transaction text screenshots.
  - Prevents size ballooning: if compressed output exceeds the original, the original is preserved.
  - Live preview with real-time compression ratio display (e.g., `4.2 MB → 820 KB · 80.5% smaller`).
- **Financial Ledger & Filtering**:
  - Direct 3-metric overview: **Total Payments**, **Total Received** (all-time), and **Active Date Range** amount.
  - Live search by student name (case-insensitive).
  - Quick month selector (`October 2026`, `September 2026`, etc.).
  - Status filter (`ALL`, `PAID`, `UNPAID`).
  - Custom date range filter (`From Date` – `To Date`) with one-click reset.
- **High-Resolution Receipt Inspector**:
  - Image preview with interactive zoom controls (50% to 250%, Reset).
  - Preserves entire receipt without top/left margin clipping when zoomed.
  - Direct download and quick edit/delete actions.
- **Dual Platform Architecture**:
  - **Desktop (Tauri 2 + Rust)**: SQLite local database with `rusqlite` bundled, local receipt filesystem storage in OS app data directory, native Rust image processing with `image` crate.
  - **Web (React + Vite)**: Standalone persistent web app using client IndexedDB for records and blob storage, client-side Canvas optimization engine, zero third-party leakage of private financial receipts.

---

## 2. Design System & Tokens (Heron AI Direction)

| Token | Hex / Value | Purpose |
|---|---|---|
| Primary Background (`heron-bg`) | `#F5F5ED` | Heron warm parchment page background with subtle texture |
| Surface Background (`heron-surface`) | `#FFFFFF` | Form inputs, contrast cards, and modal containers |
| Inset Surface (`heron-subtle`) | `#EFEFE8` | Subhead bars, secondary badges, and row hover states |
| Primary Text (`heron-primary`) | `#0F0F12` | Heron deep charcoal headings, primary copy, and solid CTA buttons |
| Secondary Text (`heron-secondary`) | `#52525B` | Graphite secondary text, notes, and labels |
| Tertiary / Muted (`heron-tertiary`) | `#71717A` | Granite muted metadata, dates, and column headers |
| Hairline Border (`heron-border`) | `#E4E4DC` | Fine 1px architectural grid lines and dividers |
| Brand Accent (`heron-brand`) | `#3B3BE6` | Heron signature indigo accent, active states, focus rings |
| Typography | `BT Grotesk` | Primary typeface across all headings, body, numerals, labels |

---

## 3. Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, BT Grotesk font family.
- **Desktop Core**: Rust 1.98, Tauri 2.12, Rusqlite 0.31 (bundled SQLite), Image 0.25 (JPEG, PNG, WebP encoders/decoders), UUID v4, Chrono.
- **Web Persistence**: Browser IndexedDB (`TutorPaymentRecordsDB`) with dedicated stores for structured records and binary receipt blobs.
- **Deployment**: Zero-config Vercel deployment with client-side SPA routing (`vercel.json`).
- **Test Suites**:
  - **Rust**: 16 unit tests verifying image magic byte detection, resizing dimensions, JPEG/PNG/WebP encoding, EXIF orientation correction, fallback preservation, SQLite CRUD, and status filtering/migrations.
  - **Vitest**: 52 unit & component integration tests verifying currency formatting (`Rp 1.250.000`), byte units, compression math, zero-student initial state, IndexedDB lifecycle, status toggle concurrency locks, and React component interactions.

---

## 4. Development & Running

### Prerequisites
- Node.js >= 18 (`v26.7.0` verified)
- Rust toolchain (`rustc 1.98.0` verified)
- Windows / macOS / Linux

### Installation
```bash
# Install frontend dependencies
npm install
```

### Running the Web Version
```bash
npm run dev
# Open http://localhost:5173
```

### Building the Web Version (for Vercel / Static Hosting)
```bash
npm run build
# Generates optimized output in ./dist
```

### Running Desktop Version (Tauri 2)
```bash
npm run tauri dev
```

### Desktop Installers (Windows & macOS)

#### Windows Setup Installer (`.exe` & `.msi`)
Build local Windows installer setup:
```bash
npm run tauri build
```
- **NSIS Setup Installer**: `src-tauri/target/release/bundle/nsis/Tutor Payment Records_0.1.0_x64-setup.exe`
- **Installation**: Run setup wizard to install with desktop shortcut and start menu entry.
- **Storage**: Data and compressed receipts are stored offline in `%APPDATA%\com.tutor.paymentrecords\`.

#### macOS Version (`.dmg` & `.app`)
Build Universal macOS installer (Apple Silicon + Intel):
```bash
npm run tauri build -- --target universal-apple-darwin
```
- **DMG Package**: `src-tauri/target/universal-apple-darwin/release/bundle/dmg/Tutor Payment Records_0.1.0_universal.dmg`
- **Installation**: Open `.dmg` and drag `Tutor Payment Records.app` into `/Applications`.
- **Storage**: Data and receipts stored in `~/Library/Application Support/com.tutor.paymentrecords/`.

#### Automated GitHub Actions CI/CD
A complete release workflow (`.github/workflows/release.yml`) compiles Windows and macOS installers on GitHub hosted runners upon pushing version tags (`v*`) or master releases.

---

## 5. Deploying to Vercel

The application is pre-configured for instant deployment on Vercel:

1. **Via Vercel Dashboard**:
   - Push to GitHub: `git push -u origin master`
   - Import the repository at [vercel.com/new](https://vercel.com/new).
   - Framework preset: `Vite`, Build command: `npm run build`, Output directory: `dist`.
   - Click **Deploy**.

2. **Via Vercel CLI**:
   ```bash
   npm i -g vercel
   vercel --prod
   ```

---

## 6. Verification & Tests

### Run Rust Backend Unit Tests
```bash
cargo test --manifest-path src-tauri/Cargo.toml
# All 16 unit tests pass
```

### Run Frontend & UI Tests
```bash
npm test # or npx vitest run
# All 52 Vitest unit and integration tests pass
```
