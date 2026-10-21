# Tutor Payment Records — Deployment Guide

This guide provides end-to-end instructions for deploying the **Tutor Payment Records** application to **Vercel** as a high-performance web application, as well as compiling the native desktop binaries using **Tauri 2** and **Rust**.

---

## 1. Deploying to Vercel (Web Version)

The web version of **Tutor Payment Records** is built with React 19, TypeScript, and Vite. It persists payment records and receipts securely using client-side **IndexedDB**, meaning it requires zero external database servers to be instantly functional, fast, and globally accessible via Vercel's Edge Network.

### Method A: Deploy via GitHub & Vercel Dashboard (Recommended)

1. **Push your repository to GitHub**:
   Ensure your code is pushed to your GitHub repository (e.g., `ZengLLQ/tutor-payment-records`).
   ```bash
   git add .
   git commit -m "feat: complete tutor payment records application"
   git push -u origin master
   ```

2. **Import Project into Vercel**:
   - Navigate to [vercel.com/new](https://vercel.com/new).
   - Sign in with your GitHub account (`ZengLLQ`).
   - Select the `tutor-payment-records` repository and click **Import**.

3. **Configure Project Settings**:
   Vercel automatically detects Vite with the included `vercel.json` configuration:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Deploy**:
   - Click **Deploy**.
   - Vercel will run `tsc -b && vite build` and deploy your application to a global edge domain (e.g. `https://tutor-payment-records.vercel.app`).

---

### Method B: Deploy via Vercel CLI

If you prefer deploying directly from your terminal:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy Preview**:
   From the root project directory (`f:\Tutor Payment Records`):
   ```bash
   vercel
   ```
   Follow the interactive prompts:
   - *Set up and deploy?* **Y**
   - *Which scope?* Select your personal account (`zengllq`)
   - *Link to existing project?* **N**
   - *Project name?* `tutor-payment-records`
   - *Directory located?* `./`
   - *Want to modify settings?* **N** (the included `vercel.json` configures everything automatically)

4. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

---

## 2. Vercel Configuration (`vercel.json`)

The repository includes a production-tuned `vercel.json` file:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Highlights:
- **SPA Rewrites**: Directs all incoming route requests to `/index.html`, ensuring clean client-side navigation without 404 errors.
- **Immutable Asset Caching**: Static Vite JavaScript, CSS, and SVG chunks under `/assets/` are served with 1-year immutable cache headers for instantaneous page loads.

---

## 3. Desktop Binary Compilation (Tauri 2 + Rust)

For private tutors who require completely offline local desktop recordkeeping with native SQLite and local file archiving:

### Prerequisites
- **Node.js**: `>= 18.0`
- **Rust Toolchain**: `rustc >= 1.77.0`, `cargo`
- **Windows Build Tools**: C++ build tools (Visual Studio Build Tools) and WebView2 Runtime (installed by default on Windows 10/11).

### Development Mode
To launch the desktop application locally with hot-reloading:
```bash
npm run tauri dev
```

### Building the Release Executable
To produce an optimized, standalone Windows binary:
```bash
npm run tauri build
# Alternatively:
cd src-tauri
cargo build --release
```

The resulting standalone executable will be located at:
```
src-tauri/target/release/app.exe
```
(Or in `src-tauri/target/release/bundle/msi/` for the Windows MSI installer).

---

## 4. Verification & Health Check Checklist

Before deploying updates or releasing binaries, run the full verification pipeline:

```bash
# 1. Run all frontend Vitest unit and integration tests (52 tests)
npm test

# 2. Run all Rust backend unit tests (16 tests)
cargo test --manifest-path src-tauri/Cargo.toml

# 3. Run zero-warning static analysis
npm run lint

# 4. Verify TypeScript compilation & Vite bundle creation
npm run build
```
