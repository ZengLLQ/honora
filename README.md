# Tutor Payment Records Application

A production-ready application for private tutors to record, organize, audit, and review student bank transfer receipts.

Designed with a distinctive editorial visual identity inspired by [`zengllq.blog`](https://zengllq.blog/): oversized bold typography, warm ivory and near-black surfaces, thin horizontal grid lines, restrained lavender accents, and purposeful motion.

---

## 1. Key Features

- **Primary Tutor Workflow**:
  1. Enter student name.
  2. Select transfer date (defaulting to today).
  3. Enter transfer amount in integer Indonesian Rupiah (`IDR`).
  4. Upload bank transfer receipt (automatically compressed).
  5. Save payment record.
  6. Search, review, inspect, edit, or delete records.
- **Automatic Receipt Image Optimization**:
  - Validates file content using magic byte signatures (JPEG, PNG, WebP) up to 20 MB.
  - Automatically downsamples oversized receipts preserving aspect ratio (max 2000 × 3000 px).
  - Intelligently preserves lossless PNG sharpness for transaction text screenshots.
  - Prevents size ballooning: if compressed output exceeds the original, the original is preserved.
  - Live preview with real-time compression ratio display (e.g., `4.2 MB → 820 KB · 80.5% smaller`).
- **Financial Ledger & Filtering**:
  - Lifetime total collected, transaction count, and filtered period subtotals.
  - Live search by student name (case-insensitive).
  - Quick month selector (`October 2026`, `September 2026`, etc.).
  - Custom date range filter (`From Date` – `To Date`) with one-click reset.
- **High-Resolution Receipt Inspector**:
  - Image preview with interactive zoom controls (50% to 250%, Reset).
  - Displays original size, compressed size, dimensions, MIME format, and verification status.
  - Direct download and quick edit/delete actions.
- **Dual Platform Architecture**:
  - **Desktop (Tauri 2 + Rust)**: SQLite local database with `rusqlite` bundled, local receipt filesystem storage in OS app data directory, native Rust image processing with `image` crate.
  - **Web (React + Vite)**: Standalone persistent web app using client IndexedDB for records and blob storage, client-side Canvas optimization engine, zero third-party leakage of private financial receipts.

---

## 2. Design System & Tokens

| Token | Hex / Value | Purpose |
|---|---|---|
| Warm Ivory | `#F1EDE2` | Primary light background surfaces and ledger rows |
| Near-Black | `#101116` | Top navigation, footer, display typography, and modals |
| Deep Charcoal | `#171821` | Secondary dark surfaces and inspection stage |
| Lavender | `#8982E8` | Primary accent, CTA buttons, active badges, focus rings |
| Muted Gray | `#85848A` | Secondary text and small uppercase metadata labels |
| Light Gray | `#D4D0C7` | Hairline dividers and borders |
| White | `#FFFFFF` | Form inputs, contrast cards, and modal containers |

---

## 3. Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **Desktop Core**: Rust 1.98, Tauri 2.12, Rusqlite 0.31 (bundled SQLite), Image 0.25 (JPEG, PNG, WebP encoders/decoders), UUID v4, Chrono.
- **Web Persistence**: Browser IndexedDB (`TutorPaymentRecordsDB`) with dedicated stores for structured records and receipt blobs.
- **Test Suites**:
  - **Rust**: 12 unit tests verifying image magic byte detection, resizing dimensions, JPEG/PNG encoding, SQLite CRUD, and financial filtering.
  - **Vitest**: 27 unit & component integration tests verifying currency formatting (`Rp 1.250.000`), byte units, compression math, and React component interactions.

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

### Building Desktop Binary
```bash
cd src-tauri
cargo build --release
# Executable located at src-tauri/target/release/app.exe
```

---

## 5. Verification & Tests

### Run Rust Backend Unit Tests
```bash
cd src-tauri
cargo test
# All 12 unit tests pass
```

### Run Frontend & UI Tests
```bash
npm run test:run # or npx vitest run
# All 27 Vitest unit and integration tests pass
```
