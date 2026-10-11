# ZeminLab

ZeminLab is a Windows-first geotechnical engineering desktop application built with Electron, React, and TypeScript.

## Engineering scope

- Site investigation data, boreholes, soil layers, and laboratory results
- SPT corrections and liquefaction assessment
- Shallow foundation bearing resistance and settlement
- Subgrade reaction and stress distribution
- Jet Grout improvement screening and engineering checks
- Engineering reports and data export

Calculations must be reviewed against TBDY 2018 and the applicable engineering literature. Literature-based methods are identified separately from code-prescribed checks. Results are decision-support outputs and require review by the responsible geotechnical engineer; site-specific parameters and field verification remain essential, particularly for ground improvement.

## Development

Requirements: Node.js and npm.

```powershell
npm install
npm run dev
```

## Validation

```powershell
npm run typecheck
npm run test:engineering
npm run build
```

## Windows build

```powershell
npm run build:win
```
