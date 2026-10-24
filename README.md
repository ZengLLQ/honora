# Honora — Tutor Payment Records

A production-ready application for private tutors to record, organize, audit, and review student bank transfer receipts.

Designed with a distinctive visual identity inspired by [`Heron AI`](https://heronaiapp.com/): BT Grotesk typography, warm parchment background with subtle texture, hairline structural borders, deep charcoal typography, signature Heron AI vibrant brand orange accents (`#FA3600`), and restrained purposeful motion.

---

## Desktop Installers & Releases

Download the official desktop application with offline SQLite database, receipt archive management, and automatic image compression:

[![Latest Release](https://img.shields.io/github/v/release/ZengLLQ/honora?color=FA3600&label=Latest%20Release)](https://github.com/ZengLLQ/honora/releases/latest)

| Platform | Format | Download Link | Architecture |
|---|---|---|---|
| **macOS** | `.dmg` | [Honora_1.2.1_universal.dmg](https://github.com/ZengLLQ/honora/releases/download/v1.2.1/Honora_1.2.1_universal.dmg) | Apple Silicon (M1/M2/M3/M4) & Intel x86_64 |
| **macOS** | `.app.tar.gz` | [Honora_universal.app.tar.gz](https://github.com/ZengLLQ/honora/releases/download/v1.2.1/Honora_universal.app.tar.gz) | Apple Silicon & Intel Universal Bundle |
| **Windows** | `.exe` (Setup) | [Honora_1.2.1_x64-setup.exe](https://github.com/ZengLLQ/honora/releases/download/v1.2.1/Honora_1.2.1_x64-setup.exe) | Windows 10 / 11 (64-bit) |
| **Windows** | `.msi` | [Honora_1.2.1_x64_en-US.msi](https://github.com/ZengLLQ/honora/releases/download/v1.2.1/Honora_1.2.1_x64_en-US.msi) | Windows MSI Package |
| **Android** | `.apk` (Installer) | [honora-v1.2.1-android.apk](https://github.com/ZengLLQ/honora/releases/download/v1.2.1/honora-v1.2.1-android.apk) | ARM64 / Universal Android (API 24+) |

All installers include the full brand logo suite (`.ico`, `.icns`, PNG), system tray integration, and native high-DPI scaling.

---

## Documentation

- **[Technical Architecture & Specification](docs/ARCHITECTURE.md)**: Deep dive into the dual-target system topology, IPC bridge, SQLite/IndexedDB persistence, automatic image optimization pipeline, and security model.
- **[Deployment Guide](docs/DEPLOYMENT.md)**: Comprehensive guide for deploying to **Vercel** and compiling standalone Tauri 2 native desktop binaries.

---

## 1. Key Features

- **Minimalist Window & Document Title (v1.2.1)**:
  - Streamlined browser and native window head title directly to **Honora** for clean, distraction-free browser tabs and taskbar representation.
- **Custom Save Location on Export (v1.2.0)**:
  - When clicking **EXPORT**, users can choose their exact save destination and custom filename rather than dumping the backup into the default Downloads directory.
  - **Desktop Target (Tauri)**: Native OS "Save As" file dialog (via Tauri IPC and `rfd`) allowing selection of any folder (Desktop, Documents, external drive) and custom filename, written safely to disk by the Rust backend.
  - **Web Target (Browser)**: Uses File System Access API (`window.showSaveFilePicker`) to let users pick destination folders, with seamless fallback to `<a download>` blob mechanism.
  - Graceful cancellation handling without intrusive error toasts.
- **Consistent Brand Orange Across Light & Dark Themes (v1.1.3)**:
  - Standardized the app's signature vibrant brand orange (`#FA3600` / `#E03000` hover) across both light and dark themes.
  - Eliminated purple/indigo drift in dark mode, ensuring `ADD PAYMENT` buttons, `BrandLogo.tsx`, section indicator marks, focus rings, and selection highlights preserve consistent visual identity.
- **Streamlined Hero Interface (v1.1.2)**:
  - Focused, uncluttered hero typography with bold uppercase `PAYMENT RECORDS` display heading.
  - Removed decorative icon clutter and trailing punctuation, highlighting the distinct `HONORA · FINANCIAL LEDGER` eyebrow badge.
  - Eliminated descriptive subtitle filler to present an immediate, high-fashion editorial spatial hierarchy aligning directly with `ADD PAYMENT`.
- **Dark Mode & Celestial Micro-Interaction Toggle (v1.1.1)**:
  - Full adherence to the **Heron AI Dark Palette & Aesthetic**: Deep near-black background (`#0F0F12`), deep charcoal cards (`#18181E`), subtle inset rows (`#22222A`), dark hairline dividers (`#2A2A34`), and signature brand orange accents (`#FA3600` / `#E03000`).
  - Tactile celestial toggle button in the header right next to `ADD PAYMENT` featuring rotating 360-degree celestial icon transform and smooth transitions on surfaces, text, and hairline borders.
  - Automatic OS `prefers-color-scheme` synchronization with persistent user preference storage in `localStorage` (`honora_theme`).
  - Comprehensive high-contrast dark adaptation across every component: Header, FinancialSummary, FilterBar, RecordItem, RecordList, PaymentModal, ReceiptViewerModal, DeleteConfirmModal, ImportConfirmModal, StudentCombobox, and Status Badges.
- **Primary Tutor Workflow**:
  1. Enter student name.
  2. Select transfer date (defaulting to today).
  3. Enter transfer amount in integer Indonesian Rupiah (`IDR`).
  4. Select payment status (`PAID` or `UNPAID`).
  5. Upload bank transfer receipt (automatically compressed).
  6. Save payment record.
  7. Search, review, inspect, edit, or delete records.
- **Database Backup Export & Restore Import (v1.1.0)**:
  - Discreet `EXPORT` and `IMPORT` actions directly accessible from the navigation header.
  - Complete portable archive generation (`honora-backup-YYYY-MM-DD.json`) bundling structured payment records, student directories, and binary receipt images.
  - Full bidirectional cross-compatibility: backups exported from Web (IndexedDB) restore cleanly on Desktop (SQLite), and vice versa.
  - Strict schema and data validation preventing corrupted data injection or malformed records.
  - Safe interactive modal offering both **Safe Merge** (retaining existing data while adding new records) and **Clean Replace** (complete restoration with safety warning).
  - Minimal Information Policy status feedback toast notifying exact restoration counts.
- **Student Name Autocomplete & Reusable Directory (v1.0.0)**:
  - Clean combobox dropdown interface in `PaymentModal` matching Heron AI aesthetic.
  - Automatically captures and deduplicates student names whenever payments are recorded or edited.
  - 1-click selection from the dropdown list or keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`).
  - Seamless auto-discovery of newly entered student names for all future payment entries.
  - Supported natively across both Tauri SQLite backend (`students` table) and Web IndexedDB (`students` store).
- **Interactive PAID / UNPAID Status Toggle**:
  - One-click status badge on every record row (`RecordItem`) with immediate optimistic UI updates and concurrent click throttling.
  - Safe, idempotent SQLite schema migration in Rust backend (`ALTER TABLE payment_records ADD COLUMN status TEXT NOT NULL DEFAULT 'PAID'`).
  - Modal status selector in `PaymentModal` and live toggle badge in `ReceiptViewerModal`.
  - Comprehensive status filtering (`ALL STATUS`, `PAID ONLY`, `UNPAID ONLY`) in the Filter Bar with dynamic financial summary synchronization.
- **Unified Brand Logo**:
  - Signature Heron AI geometric brand mark deployed across the top navigation bar and browser tab `favicon.svg`.
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

| Token | Light Value | Dark Value | Purpose |
|---|---|---|---|
| Primary Background (`heron-bg`) | `#F5F5ED` | `#0F0F12` | Deep near-black in dark mode / warm parchment with subtle texture |
| Surface Background (`heron-surface`) | `#FFFFFF` | `#18181E` | Deep charcoal cards, inputs, and modal containers |
| Inset Surface (`heron-subtle`) | `#ECECE4` | `#22222A` | Subhead bars, secondary badges, and row hover states |
| Primary Text (`heron-primary`) | `#282828` | `#F5F5ED` | Warm ivory in dark mode / deep graphite headings, copy, and CTAs |
| Secondary Text (`heron-secondary`) | `#414140` | `#A1A1AA` | Soft graphite secondary text, notes, and labels |
| Tertiary / Muted (`heron-tertiary`) | `#71717A` | `#71717A` | Soft muted metadata, dates, and column headers |
| Hairline Border (`heron-border`) | `#B3B3AF` | `#2A2A34` | Fine 1px architectural grid lines and dividers |
| Brand Accent (`heron-brand`) | `#FA3600` | `#FA3600` | Signature Heron AI vibrant brand orange across all modes |
| Typography | `BT Grotesk` | `BT Grotesk` | Primary typeface across all headings, body, numerals, labels |

---

## 3. Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, BT Grotesk font family.
- **Desktop Core**: Rust 1.98, Tauri 2.12, Rusqlite 0.31 (bundled SQLite), Image 0.25 (JPEG, PNG, WebP encoders/decoders), UUID v4, Chrono.
- **Web Persistence**: Browser IndexedDB (`HonoraDB`) with dedicated stores for structured records and binary receipt blobs.
- **Deployment**: Zero-config Vercel deployment with client-side SPA routing (`vercel.json`).
- **Test Suites**:
  - **Rust**: 27 unit tests verifying image magic byte detection, resizing dimensions, JPEG/PNG/WebP encoding, EXIF orientation correction, fallback preservation, SQLite CRUD, status filtering/migrations, database export, replace/merge imports, and receipt filesystem synchronization.
  - **Vitest**: 107 unit & component integration tests verifying currency formatting (`Rp 1.250.000`), byte units, compression math, zero-student initial state, IndexedDB lifecycle, backup schema validation, replace/merge restoration, status toggle concurrency locks, Header actions, Dark Mode detection, theme persistence, and celestial ThemeToggle micro-interactions.

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
- **NSIS Setup Installer**: `src-tauri/target/release/bundle/nsis/Honora_1.2.1_x64-setup.exe`
- **Installation**: Run setup wizard to install with desktop shortcut and start menu entry.
- **Storage**: Data and compressed receipts are stored offline in `%APPDATA%\com.honora.desktop\`.

#### macOS Version (`.dmg` & `.app`)
Build Universal macOS installer (Apple Silicon + Intel):
```bash
npm run tauri build -- --target universal-apple-darwin
```
- **DMG Package**: `src-tauri/target/universal-apple-darwin/release/bundle/dmg/Honora_1.2.1_universal.dmg`
- **Installation**: Open `.dmg` and drag `Honora.app` into `/Applications`.
- **Storage**: Data and receipts stored in `~/Library/Application Support/com.honora.desktop/`.

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
