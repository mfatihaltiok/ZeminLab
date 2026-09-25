# FALUZMN

Windows-first geotechnical engineering desktop application built with Electron, React and TypeScript.

## v1.0

- A4 PDF report export
- Erol 2014 / Erol 2018 local source-pack indexing
- Excel and DXF export utilities
- neutral SAP2000 interchange and OpenSees Tcl export adapters
- centralized SPT, bearing-capacity, settlement, liquefaction, foundation-sliding and Jet Grout calculation services

### Hesap ve veri yaklaşımı

FALUZMN project files use the `.falu` extension. Field records retain their own unit system, while calculation engines consume explicit base-SI values. Missing engineering parameters are not silently substituted into final calculations.

OCR, image scanning and document-intelligence based numeric extraction are intentionally not part of FALUZMN. Laboratory, SPT and borehole values are entered and reviewed by the engineer.

### Development

```powershell
npm install
npm run dev
```

### Windows build

```powershell
npm run build:win
```
