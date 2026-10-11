# ZeminLab

ZeminLab is a Windows-first geotechnical engineering desktop application built with Electron, React, and TypeScript.

## Engineering scope

- Site investigation data, boreholes, soil layers, and laboratory results
- SPT corrections and liquefaction triggering assessment
- Shallow foundation bearing resistance, eccentric contact, sliding, and settlement
- Subgrade reaction and stress distribution
- Jet Grout improvement screening, field QC checks, and engineering reports

## Engineering controls and limits

- TBDY 2018 checks are kept distinct from literature-based methods.
- Laboratory parameters remain distinct: effective (c′/φ′), undrained (C_u), Young's modulus (E_s), constrained modulus (M), and oedometric modulus are not substituted for one another.
- Groundwater corrections require explicit saturated unit weight where the water table affects the calculation zone; missing data are not replaced with natural unit weight.
- The settlement report uses the saved method, source borehole groundwater level, and saved time inputs. Janbu is marked unavailable until a validated (M_0/M_1) input path is provided.
- If liquefaction triggering (FS<1.10), the report flags the post-liquefaction strength/stiffness, bearing, settlement, and lateral-spreading review required by TBDY 2018. Residual displacement is not fabricated by the triggering calculation; it needs project-specific methods and parameters.
- Jet Grout field QC compares measured UCS, diameter, core count, continuity, construction logs, and test-report review against project-defined acceptance criteria. These criteria are not presented as universal TBDY limits.
- Results are decision-support outputs and require review by the responsible geotechnical engineer. Ground-improvement design requires site-specific testing and field verification.

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
