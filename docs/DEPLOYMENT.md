# Honora — Deployment Guide

This guide provides end-to-end instructions for deploying the **Honora** application to **Vercel** as a high-performance web application, as well as compiling the native desktop binaries using **Tauri 2** and **Rust**.

---

## 1. Deploying to Vercel (Web Version)

The web version of **Honora** is built with React 19, TypeScript, and Vite. It persists payment records and receipts securely using client-side **IndexedDB** (`HonoraDB`), meaning it requires zero external database servers to be instantly functional, fast, and globally accessible via Vercel's Edge Network.

### Method A: Deploy via GitHub & Vercel Dashboard (Recommended)

1. **Push your repository to GitHub**:
   Ensure your code is pushed to your GitHub repository (e.g., `ZengLLQ/honora`).
   ```bash
   git add .
   git commit -m "feat: complete Honora application"
   git push -u origin master
   ```

2. **Import Project into Vercel**:
   - Navigate to [vercel.com/new](https://vercel.com/new).
   - Sign in with your GitHub account (`ZengLLQ`).
   - Select the `honora` repository and click **Import**.

3. **Configure Project Settings**:
   Vercel automatically detects Vite with the included `vercel.json` configuration:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Deploy**:
   - Click **Deploy**.
   - Vercel will run `tsc -b && vite build` and deploy your application to a global edge domain (e.g. `https://honora.vercel.app`).

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
   - *Project name?* `honora`
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

## 3. Desktop Binary & Installer Compilation (Tauri 2 + Rust)

For private tutors who require completely offline local desktop recordkeeping with native SQLite and local file archiving:

### Prerequisites
- **Node.js**: `>= 18.0` (Node 20+ recommended)
- **Rust Toolchain**: `rustc >= 1.77.0`, `cargo`
- **Windows**: C++ build tools (Visual Studio Build Tools) and WebView2 Runtime (pre-installed on Windows 10/11).
- **macOS**: Xcode Command Line Tools (`xcode-select --install`).

### Brand Icon Generation
All desktop app icons across Windows (`.ico`), macOS (`.icns`), and Linux (`.png`) are generated directly from the high-resolution Heron geometric brand mark:
```bash
# Generate 1024x1024 source and populate src-tauri/icons/
npx @tauri-apps/cli icon app-icon.png
```
This automatically updates:
- Windows multi-resolution icon (`src-tauri/icons/icon.ico`)
- macOS Apple Icon Image (`src-tauri/icons/icon.icns`)
- Linux PNG resolutions (`32x32.png`, `64x64.png`, `128x128.png`, `128x128@2x.png`, `icon.png`)
- Windows Store / AppX logos (`StoreLogo.png`, `Square*Logo.png`)

### Development Mode
To launch the desktop application locally with hot-reloading:
```bash
npm run tauri dev
```

---

## 4. Windows Setup Installer (`.exe` & `.msi`)

### Building the Windows Release Installer Locally
Run the Tauri build command from the project root:
```bash
npm run tauri build
```

This compiles the optimized Rust binary and packages the Windows setup installer:
- **NSIS Setup Installer**: `src-tauri/target/release/bundle/nsis/Honora_1.1.0_x64-setup.exe`
- **MSI Installer (Optional)**: `src-tauri/target/release/bundle/msi/Honora_1.1.0_x64_en-US.msi`
- **Standalone Binary**: `src-tauri/target/release/honora.exe`

### Windows Installation Steps
1. Double-click `Honora_1.1.0_x64-setup.exe`.
2. Follow the NSIS setup wizard (installs to user application data with start menu shortcut and desktop icon).
3. The app is immediately ready to use offline.
4. Local SQLite database and compressed receipt images are stored safely at:
   ```
   %APPDATA%\com.honora.desktop\records.sqlite
   %APPDATA%\com.honora.desktop\receipts\
   ```

---

## 5. macOS Version (`.dmg` & `.app`)

Tauri 2 supports compiling native macOS `.app` bundles and `.dmg` disk images with custom drag-to-Applications window layouts.

### Native macOS Compilation (on macOS Darwin host)
On a macOS machine:
```bash
# 1. Install Rust targets for Universal binary (Apple Silicon M1/M2/M3 + Intel x86_64)
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin

# 2. Build Universal macOS DMG and .app bundle
npm run tauri build -- --target universal-apple-darwin
```

Generated bundles:
- **macOS Disk Image (DMG)**: `src-tauri/target/universal-apple-darwin/release/bundle/dmg/Honora_1.1.0_universal.dmg`
- **macOS Application Bundle**: `src-tauri/target/universal-apple-darwin/release/bundle/macos/Honora.app`

### macOS Installation Steps
1. Double-click `Honora_1.1.0_universal.dmg`.
2. Drag **Honora** into the `/Applications` shortcut folder.
3. Open the application from Launchpad or `/Applications`.
4. *(If opening an unsigned developer binary on macOS Gatekeeper)*:
   Right-click `Honora.app` and choose **Open**, or run:
   ```bash
   xattr -cr /Applications/"Honora.app"
   ```
5. Local SQLite database and receipts are stored at:
   ```
   ~/Library/Application Support/com.honora.desktop/
   ```

---

## 6. Automated Multi-Platform CI/CD (.github/workflows/release.yml)

Because native macOS binary linking and code signing require Apple Darwin SDK / macOS runners, the project includes an automated GitHub Actions matrix workflow (`.github/workflows/release.yml`):

- **Triggers**:
   - Pushing a version tag: `git tag v1.1.0 && git push origin v1.1.0`
   - Push to `master` branch

  - Manual trigger via **Actions → Release Desktop Apps → Run workflow** (specifying custom tag)
- **Matrix Runners**:
  - `windows-latest`: Builds Windows NSIS setup `.exe` & `.msi`
  - `macos-latest`: Builds macOS Universal `.dmg` & `.app` for both Apple Silicon (`arm64`) and Intel (`x86_64`)
- **Artifacts**:
  - Automatically publishes a GitHub Release with attached installer binaries
  - Uploads build artifacts to workflow run summary for immediate download

---

## 7. Verification & Health Check Checklist

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
