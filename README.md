# FALUZMN

FALUZMN is a Windows-first geotechnical engineering desktop application built with Electron, React and TypeScript.

## v1.0

v1.0 adds the professional output/integration layer:

- A4 PDF report export infrastructure
- Erol 2014 and Erol 2018 local source-pack indexing
- PaddleOCR PP-OCRv5 + Docling document-intelligence installation and offline runner
- OCR provider settings with encrypted API-key storage
- Electron internet/connectivity health check
- Excel export utility
- DXF soil-profile export utility
- neutral SAP2000 interchange and OpenSees Tcl export adapters

### Belge istihbaratı\n\nFALUZMN uses two deterministic local layers: **PaddleOCR PP-OCRv5** for text recognition and **Docling 2.128.0** for document layout and table structure. Values are not inferred from fixed page coordinates. Ambiguous/conflicting candidates are rejected and the user must review OCR candidates before import. The runtime is CPU-first and prepared for offline operation. Docling's layout and TableFormer artifacts are prefetched into the application package.\n\nPaddleOCR itself can run locally, so the application does **not** require an API key for offline OCR. A remote OCR endpoint/API-key field may still be present for deployments that use a hosted OCR service. The key is stored encrypted through Electron's `safeStorage` when the operating system supports it.

### v1.0 setup

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


<!-- engineering audit verification -->
