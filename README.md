# ZeminLab

ZeminLab is a Windows-first geotechnical engineering desktop application built with Electron, React and TypeScript.

## Stage 3

Stage 3 adds the professional output/integration layer:

- A4 PDF report export infrastructure
- Erol 2014 and Erol 2018 local source-pack indexing
- PaddleOCR document-parser installation and offline runner
- OCR provider settings with encrypted API-key storage
- Electron internet/connectivity health check
- Excel export utility
- DXF soil-profile export utility
- neutral SAP2000 interchange and OpenSees Tcl export adapters

### OCR

PaddleOCR itself can run locally, so the application does **not** require an API key for offline OCR. A remote OCR endpoint/API-key field is nevertheless provided for deployments that use a hosted OCR service. The key is stored encrypted through Electron's `safeStorage` when the operating system supports it.

### Stage 3 setup

From PowerShell:

```powershell
.\tools\setup_stage3.ps1
```

This creates a project-local Python runtime, installs PaddleOCR document parsing dependencies, downloads the two publisher source PDFs into the local source-pack, and indexes figure-bearing pages. The source PDFs themselves are not committed to GitHub.

### Development

```bash
npm install
npm run dev
```

### Build Windows setup

```bash
npm run build:win
```
