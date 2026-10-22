# Honora — Technical Architecture & System Specification

A comprehensive technical architecture document for the **Honora** application, covering system boundaries, component topologies, data models, IPC protocols, persistent storage abstraction, automated image optimization, and Vercel cloud deployment.

---

## 1. Executive Summary

Private tutoring operations require a reliable, personal accounting ledger for recording student bank transfers, archiving proof-of-payment receipts, and tracking revenue across customizable timeframes. Standard enterprise accounting suites or generic SaaS templates often introduce excessive cognitive overhead, subscription lock-in, and unnecessary complexities.

**Honora** addresses this through a dual-target architecture:
1. **Desktop Native Application**: Powered by **Tauri 2** and **Rust**, leveraging an embedded SQLite database (`rusqlite`) and operating-system-level persistent filesystem storage with native Rust image processing (`image` crate).
2. **Web Persistent Application**: Powered by **React 19**, **TypeScript**, and **Vite**, utilizing client-side persistent **IndexedDB** (`HonoraDB`) with dual object stores (`payment_records` and `receipt_blobs`) and in-browser Canvas image optimization. Fully optimized for zero-config global deployment on **Vercel**.

Visual styling follows the **Heron AI** design direction ([`heronaiapp.com`](https://heronaiapp.com/)), emphasizing typographic clarity with **BT Grotesk**, a warm parchment aesthetic (`#F5F5ED`), hairline architectural dividers (`#E4E4DC`), indigo brand accents (`#3B3BE6`), and strict adherence to a **Minimal Information Policy**.

---

## 2. System Architecture Topology

The application is structured into decoupled UI, domain service, and platform-specific storage tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│                 React 19 + TypeScript + Tailwind CSS                   │
│                                                                        │
│   ┌───────────────┐  ┌───────────────────┐  ┌───────────────────────┐  │
│   │ App Container │  │ Financial Summary │  │ Search & Filter Bar   │  │
│   └───────┬───────┘  └─────────┬─────────┘  └───────────┬───────────┘  │
│           │                    │                        │              │
│   ┌───────┴────────────────────┴────────────────────────┴───────────┐  │
│   │                   Payment Record List & Rows                   │  │
│   └────────────────────────────┬────────────────────────────────────┘  │
│                                │                                       │
│          ┌─────────────────────┴──────────────────────┐                │
│          │ Modals: Payment (Add/Edit) & Receipt Viewer │                │
│          └─────────────────────┬──────────────────────┘                │
└────────────────────────────────┼───────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SERVICE ABSTRACTION                             │
│                  IPaymentService Interface Contract                    │
│                                                                        │
│   • getRecords(filter)         • updateRecord(payload)                 │
│   • getSummary(filter)         • deleteRecord(id)                      │
│   • getRecord(id)              • optimizeReceipt(file)                 │
│   • createRecord(payload)      • getReceiptDataUrl(record)             │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
               ┌─────────────────┴─────────────────┐
               │                                   │
               ▼                                   ▼
┌───────────────────────────────┐ ┌──────────────────────────────────────┐
│     TAURI 2 (DESKTOP TIER)    │ │        WEB CLIENT TIER               │
│                               │ │                                      │
│ • IPC Invoke Bridge           │ │ • HTML5 Canvas Compressor            │
│ • Rust Backend Engine         │ │ • IndexedDB (HonoraDB)               │
│ • rusqlite Embedded SQLite    │ │   ├── STORE: payment_records         │
│ • image-rs Image Optimization │ │   └── STORE: receipt_blobs           │
│ • OS Local Filesystem Archive │ │ • Zero-leakage client sandbox        │
│                               │ │ • Vercel Static Hosting (Edge CDN)   │
└───────────────────────────────┘ └──────────────────────────────────────┘
```

---

## 3. Storage Abstraction Layer

### 3.1 IPaymentService Contract

Both the desktop and web targets implement the unified `IPaymentService` interface:

```typescript
export interface IPaymentService {
  isTauri: boolean;
  getRecords(filter?: RecordFilter): Promise<PaymentRecord[]>;
  getSummary(filter?: RecordFilter): Promise<PaymentSummary>;
  getRecord(id: string): Promise<PaymentRecord | null>;
  getStudentNames(): Promise<string[]>;
  createRecord(payload: CreateRecordPayload): Promise<PaymentRecord>;
  updateRecord(payload: UpdateRecordPayload): Promise<PaymentRecord>;
  deleteRecord(id: string): Promise<void>;
  togglePaymentStatus(id: string): Promise<PaymentRecord>;
  optimizeReceipt(file: File): Promise<OptimizationResult>;
  getReceiptDataUrl(record: PaymentRecord): Promise<string>;
  exportDatabase(): Promise<DatabaseBackup>;
  importDatabase(backup: DatabaseBackup, mode: ImportMode): Promise<ImportResult>;
}
```


The runtime environment is detected via `isTauriEnvironment()`, which inspects the window context for `__TAURI_INTERNALS__`.

### 3.2 Desktop Storage Implementation (SQLite + OS Disk)

- **Database**: Embedded SQLite database initialized inside the OS user application data directory (`%APPDATA%\com.honora.desktop\records.sqlite` on Windows).
- **Receipt Filesystem**: Uploaded receipts are saved as binary files directly to disk under a dedicated `receipts/` directory within the application data path.
- **Students Table**: Maintains a persistent student directory (`students` table) with case-insensitive unique names captured on payment creation/update.
- **Transactional Integrity**: Creating or deleting records executes within SQLite atomic transactions, ensuring associated receipt files on disk are removed safely without orphaned references.

### 3.3 Web Storage Implementation (IndexedDB Binary Blobs)

- **Database**: Browser-native IndexedDB database named `HonoraDB` (Version 2).
- **Separation of Concerns**:
  - `STORE_RECORDS`: Stores structured JSON payment records indexed by `student_name` and `payment_date`.
  - `STORE_RECEIPTS`: Stores raw binary image bytes as `Uint8Array` indexed by `receipt_storage_path`.
  - `STORE_STUDENTS`: Stores deduplicated student name directory entries for 1-click autocomplete.
- **Zero Base64 in Database**: Unlike legacy web implementations that store bloated base64 strings in data tables, receipt images are stored purely as typed array buffers, reducing memory overhead by ~33%.
- **Zero-Student Fresh State**: The application initializes with zero demo records, presenting a clean slate ready for production data entry.

### 3.4 Portable Backup & Cross-Platform Synchronization (v1.1.0)

To guarantee complete user data ownership, portability, and disaster recovery without vendor lock-in, Honora v1.1.0 introduces full database backup and restore capabilities:

- **Portable Archive Format (`DatabaseBackup`)**:
  - `version`: Version string of the exporting client (e.g. `1.1.0`).
  - `schema_version`: Strict integer format version (`1`).
  - `app`: Target application identifier (`Honora`).
  - `exported_at`: ISO 8601 UTC timestamp.
  - `records`: Array of full `PaymentRecord` entities.
  - `students`: Array of student directory entries (`name`, `created_at`).
  - `receipts`: Array of receipt objects containing file identifier (`id`), MIME type, and base64-encoded image bytes (`data_base64`).
- **Cross-Platform Interoperability**:
  - Backups exported from the Web client (IndexedDB) can be directly restored into the native Desktop application (SQLite + OS disk), and vice-versa.
  - Receipt paths with bare IDs (Web) and relative folder prefixes (`receipts/rec-*.jpg` on Desktop) are seamlessly normalized and resolved during read, write, and deletion.
- **Restore Modes & Transactional Safety**:
  - **Safe Merge Mode**: Inserts new records, updates existing matching record IDs, and expands the student directory without deleting any current data.
  - **Clean Replace Mode**: Atomic rollback-safe full restore. Completely clears existing records, students, and receipts before applying the archive.
  - **Pre-Validation**: Validates JSON structure, required record fields, dates, non-negative amounts, and base64 image integrity before executing any database or disk mutations.

---

## 4. Automatic Receipt Optimization Pipeline


Receipts captured with smartphone cameras frequently range from 4 MB to 15 MB at 4000×3000 resolutions. Uncompressed storage quickly exhausts client browser storage quotas and creates slow, laggy list scrolling.

Both platforms employ an automated, non-destructive optimization pipeline:

```
[User Selects File] (Up to 20 MB)
         │
         ▼
[Magic Byte Verification] ──► Reject Non-Images (JPEG, PNG, WebP only)
         │
         ▼
[EXIF Orientation Check] ───► Correct Rotation Matrix (0°, 90°, 180°, 270°)
         │
         ▼
[Dimension Inspection] ─────► Downscale if > 2000×3000 (Preserve Aspect Ratio)
         │
         ▼
[Format-Specific Encoding] ─► WebP/JPEG (85% Quality) or Lossless PNG
         │
         ▼
[Size Comparison] ──────────► If compressed >= original, PRESERVE ORIGINAL
         │
         ▼
[Persistent Storage] ───────► Store binary bytes & return metadata
```

### Key Safety Guarantees
1. **Aspect Ratio Preservation**: Small images are never upscaled (`scale = min(2000/w, 3000/h, 1.0)`).
2. **Text Legibility**: Target quality is calibrated at 85% with high-order bicubic filtering (`Lanczos3` in Rust, `imageSmoothingQuality = 'high'` in browser Canvas) to ensure financial transaction numbers, timestamps, and bank account details remain sharp.
3. **Lossless Fallback**: If the optimized image results in a larger byte size than the input (e.g., already compressed files), the original binary is preserved.
4. **EXIF APP1 Parsing**: Automatically rotates portrait receipts taken on mobile devices before dimension calculation and encoding.

---

## 5. Data Model Specification

### Payment Record Schema

| Field | Type | Storage | Description |
|---|---|---|---|
| `id` | `TEXT PRIMARY KEY` | UUID string | Globally unique identifier |
| `student_name` | `TEXT NOT NULL` | Indexed | Case-insensitive student search target |
| `payment_date` | `TEXT NOT NULL` | ISO 8601 (`YYYY-MM-DD`) | Transfer date |
| `amount_idr` | `INTEGER NOT NULL` | 64-bit integer | Transfer amount in Indonesian Rupiah |
| `status` | `TEXT NOT NULL` | Indexed | Payment fulfillment status (`PAID` or `UNPAID`) |
| `receipt_storage_path` | `TEXT NULL` | Foreign key / path | Storage key or local filename |
| `receipt_mime_type` | `TEXT NULL` | String | MIME type (`image/jpeg`, `image/png`, `image/webp`) |
| `receipt_original_size_bytes` | `INTEGER NULL` | Bytes | Input file size before compression |
| `receipt_compressed_size_bytes`| `INTEGER NULL` | Bytes | Final persisted file size |
| `receipt_width` | `INTEGER NULL` | Pixels | Rendered image width |
| `receipt_height` | `INTEGER NULL` | Pixels | Rendered image height |
| `note` | `TEXT NULL` | String | Optional course or package description |
| `created_at` | `TEXT NOT NULL` | ISO 8601 UTC | Timestamp of record creation |
| `updated_at` | `TEXT NOT NULL` | ISO 8601 UTC | Timestamp of last modification |

> **Financial Integrity Rule**: Currency amounts are strictly represented and calculated using 64-bit integers (`amount_idr`). Floating-point arithmetic is prohibited to prevent currency rounding errors.

---

## 6. Visual Design Architecture (Heron AI Direction)

The design system directly reflects the visual language of [`heronaiapp.com`](https://heronaiapp.com/):

- **Color Tokens**:
  - `heron-bg`: `#F5F5ED` (warm parchment canvas)
  - `heron-surface`: `#FFFFFF` (clean elevated cards and form containers)
  - `heron-subtle`: `#EFEFE8` (subhead bars, input wells, row hover)
  - `heron-primary`: `#0F0F12` (deep charcoal display headings and solid CTA buttons)
  - `heron-secondary`: `#52525B` (graphite secondary copy and notes)
  - `heron-tertiary`: `#71717A` (granite metadata and uppercase labels)
  - `heron-border`: `#E4E4DC` (1px architectural grid lines and dividers)
  - `heron-brand`: `#3B3BE6` (vibrant Heron AI indigo accent)
- **Typography**:
  - Typeface: **BT Grotesk** across all UI elements, headings, forms, and buttons.
  - Tabular numerals: Financial currency amounts use `tabular-nums` (`font-feature-settings: 'tnum' on, 'lnum' on;`) for aligned accounting columns.
- **Motion & Interactions**:
  - Timing: `.btn-heron` hover elevates button by `-1px` using Heron cubic-bezier `cubic-bezier(0.23, 1, 0.32, 1)`.
  - Full respect for `prefers-reduced-motion`.
- **Signature Attribution**:
  - `Made by JAYCEE 曾令强` formatted in BT Grotesk with CJK system fallbacks (`Noto Sans SC`, `Microsoft YaHei`, `PingFang SC`) placed subtly in the application footer.

---

## 7. Security, Privacy & Minimal Information Policy

1. **Zero External Data Leakage**: Receipts are processed locally within the user's desktop or browser sandbox. No images or student financial details are transmitted to external third-party compression APIs.
2. **Strict Minimal Information Policy**:
   - Technical runtime badges (`DESKTOP (TAURI 2)`, `WEB PERSISTENT (INDEXEDDB)`) are suppressed from user-facing screens.
   - Internal image codecs, database connection strings, and backend paths are concealed.
   - Compression statistics are kept secondary and unobtrusive (`4.2 MB → 820 KB`).
3. **Defensive Deletion Confirmation**: Record deletion requires deliberate confirmation and guarantees immediate cascading deletion of the associated receipt image from disk or IndexedDB.

---

## 8. Verification & Quality Assurance Matrix

The test suite validates both native Rust engine primitives and React client components:

| Test Suite | File | Test Count | Scope |
|---|---|---|---|
| **Rust Image Tests** | `src-tauri/src/image_optimizer.rs` | 10 | Magic bytes, downscale math, JPEG/PNG/WebP encoders, EXIF rotation, large image handling |
| **Rust DB Tests** | `src-tauri/src/db.rs` | 6 | SQLite migrations, status filtering, CRUD, case-insensitive search, date range filtering, export/import transactions |
| **Rust Storage Tests** | `src-tauri/src/storage.rs` | 3 | Filesystem receipts lifecycle, path traversal prevention, cross-prefix resolution, clear all |
| **Rust Command Tests** | `src-tauri/src/commands.rs` | 5 | Backup serialization, corrupt data rejection, web bare-id resolution, roundtrip verification |
| **Formatters Unit Tests** | `src/test/formatters.test.ts` | 10 | Indonesian Rupiah formatting (`formatIDR`), integer parsing, byte formatting |
| **Compression Tests** | `src/test/imageCompression.test.ts` | 8 | Magic byte identification, dimension calculation, aspect ratio bounds |
| **Backup Validation Tests**| `src/test/backupValidation.test.ts` | 7 | Backup schema validation, app tag check, date/amount typing, corrupt rejection, status normalization |
| **Storage Service Tests** | `src/test/storageService.test.ts` | 11 | IndexedDB lifecycle, CRUD persistence, binary receipt blob handling, status toggle, export, merge/replace import, desktop cross-compatibility |
| **Component UI Tests** | `src/test/components.test.tsx` | 47 | Header with Export/Import, ImportConfirmModal, Summary 3-metrics, FilterBar, RecordItem, Modals, Status toggle, Zero-student state |
| **Total Automated Tests** | — | **107** | **100% Passing** |

