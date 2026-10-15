# Phase 3 Initial Audit

Date: 2026-09-03
Scope: rate-confirmation extraction and load creation workflow

## Evidence Inventory

The workspace contains one file named as a rate-confirmation fixture:

- `frontend/e2e/fixtures/E2E-TEST-DATA-rate-confirmation.pdf`

The other root PDFs are POD/invoice artifacts, not rate confirmations. The ABC Logistics document supplied in the request states that it is fictional. The SolvLogix and Logistic Dynamics documents were supplied as parsed text, but their original PDF binaries are not present in the workspace.

## Current Architecture

1. `frontend/src/pages/admin/CreateLoadPage.tsx` uploads a PDF to `POST /api/loads/extract-pdf` and uses the response as the editable extraction preview.
2. `backend/src/controllers/ai.controller.ts` accepts PDF uploads, extracts text with `pdf-parse`, and falls back to `pdfjs-dist` page-by-page.
3. `backend/src/services/ai.service.ts` uses Gemini when configured, otherwise its deterministic regex parser.
4. The frontend maps the extracted object to core load fields and the first pickup and delivery stops.
5. `backend/src/validators/load.validator.ts` validates the create payload.
6. `backend/src/services/load.service.ts` creates a broker when no `broker_id` is supplied and preserves a supplied string `load_number`.
7. `backend/src/repositories/load.repository.ts` inserts the load and stops in one transaction and normalizes appointment times before insertion.
8. `loads` and `load_stops` are then read by Load Detail, Load Board, dispatch, billing, and settlement features.

## Schema and Mapping Findings

- `loads.load_number` is a string with a company-scoped unique constraint. The create validator also accepts a string, and the service does not parse supplied load numbers.
- `loads.rate` is decimal and the deterministic parser chooses labeled `Rate`, then labeled `TOTAL`, then a `Line Haul` fallback. This is not yet proven against the supplied multi-value ABC text through the live API.
- `load_stops.appointment_start` and `appointment_end` are PostgreSQL `TIME` columns. The repository rejects unparseable values by converting them to `undefined`, avoiding the previous raw time-window database error.
- There are no load carrier or carrier-MC columns, no structured reference-number collection, and no structured accessorial collection.
- The extraction contract has no carrier fields. Carrier identity therefore cannot survive the current create-load payload.
- The create page maps `facility_name` from address/city rather than the extracted facility name, so a facility name is lost during create.
- The deterministic parser does not reliably parse `0900 - 1600`, `0700-1500`, `2pm APPT`, `09:00 AM CT`, or separate date/time text from the supplied documents.
- The deterministic parser maps `Dry Van` but has no explicit safe mapping for `Hot Shot / 26'`; this is an equipment normalization gap, not evidence that it should be mapped to tractor-trailer.
- Generic `NOTES TO CARRIER`, `Pickup Notes`, and `Delivery Notes` are not all captured by the deterministic special-instructions logic.
- The update mapping in `LoadDetailPage.tsx` hardcodes delivery ZIP `00000`, which can overwrite a real ZIP during an edit.

## Initial Document-Level Results

| Document | Classification | Observed evidence | Result |
|---|---|---|---|
| SolvLogix / AGGREY LLC, load `130987096` | Supplied parsed text; original PDF unavailable | Correct visible values include rate `1230.00`, Van / Partial, weight `7500`, pickup and delivery addresses, and `9:00 AM - 4:00 PM` windows. Broker is SolvLogix; carrier is AGGREY LLC. | Parser/API/DB/UI not executed from the supplied text; carrier identity is a schema/contract gap. |
| Logistic Dynamics / AGGREY EXPRESS, load `2111033` | Supplied parsed text; original PDF unavailable | Correct visible values include rate `1700.00`, commodity `ASSORTED LUMBER 26' BOX TRUCK`, weight `5000`, Hot Shot / 26', pickup `2pm APPT`, delivery `0700-1500`, and two complete locations. | Parser/API/DB/UI not executed from the supplied text; time and equipment normalization are unverified gaps. |
| ABC Logistics, load `45892` | Fictional sample explicitly marked not real | The document contains line haul `2450.00`, fuel surcharge `350.00`, total `2800.00`, Dry Van, two appointments, accessorials, and special instructions. | Must not count as real-document production evidence. |
| E2E fixture | Repository PDF; intended test data | Existing parser unit test covers its text shape, but direct PDF extraction failed with malformed PDF errors (`Bad FCHECK` / `Invalid PDF structure`). | Document limitation; no complete PDF pipeline pass. |

## Executed Checks

- `backend`: focused `src/services/ai.service.test.ts` passed, 5 tests.
- `frontend`: `npm run build` passed.
- `backend`: `npm run build` passed.
- Direct extraction of `frontend/e2e/fixtures/E2E-TEST-DATA-rate-confirmation.pdf` failed before parsing because the PDF is malformed.

## Not Yet Evidenced

No authenticated browser upload, extraction preview capture, create-load network payload, PostgreSQL query, reloaded Load Detail, Load Board search, or downstream Driver/Dispatch/POD/Billing/Settlement run has been performed in this phase. No scanned PDF or OCR-capable input is available.

## Initial Classification

- A: extraction bug or limitation: deterministic layout coverage is incomplete for the supplied LDI/SolvLogix shapes.
- B: normalization bug or limitation: appointment formats and `Hot Shot / 26'` are not covered safely.
- G: schema limitation: carrier identity, structured references, and structured accessorials are not represented.
- I: test-data/document limitation: only parsed text for the two non-fictional documents; the checked-in fixture PDF is malformed.
- No complete pipeline result is eligible for a production-readiness claim.

## Fixes Applied After Initial Audit

- Added generic `Rate(s)` recognition for labeled rate values.
- Added safe normalization for colon clocks, hour-only AM/PM values, and compact ranges such as `0700-1500`; unrecognized values remain empty rather than being sent to PostgreSQL `TIME` columns.
- Added generic box-truck recognition when the document wording contains `Box Truck`, including the supplied LDI wording, without mapping it to tractor-trailer.
- Preserved extracted pickup and delivery facility names in the create-load form and payload.
- Added regression tests for the supplied SolvLogix and Logistic Dynamics parsed layouts.

## Post-Fix Checks

- Focused parser suite: 7/7 passed.
- Full backend test suite: 13/13 passed across 6 files.
- Backend TypeScript build: passed.
- Frontend TypeScript/Vite build: passed, with existing Vite deprecation and chunk-size warnings only.
- Workspace diagnostics for modified files: no errors.

## Final Phase 3 Classification

The parser fixes are validated against the supplied parsed-text layouts and existing regression fixtures. The complete acceptance pipeline is still not evidenced because the two non-fictional source PDFs were not provided, the checked-in E2E PDF is malformed, and no authenticated browser/database environment was executed in this phase.

**PRODUCTION READINESS: PARTIALLY READY — LIMITATIONS REMAIN**

## Final Real-World E2E Validation Attempt

### Document Test Matrix

| PDF | Broker | Real PDF Accessible | Upload | Extraction | Preview | API | PostgreSQL | Reload | Load Board | Result |
|---|---|---|---|---|---|---|---|---|---|---|
| SolvLogix / AGGREY LLC, `130987096` | SolvLogix Inc | No | Not tested | Not tested | Not tested | Not tested | Not tested | Not tested | Not tested | NOT TESTED — SOURCE PDF NOT ACCESSIBLE |
| Logistic Dynamics / AGGREY EXPRESS, `2111033` | Logistic Dynamics LLC | No | Not tested | Not tested | Not tested | Not tested | Not tested | Not tested | Not tested | NOT TESTED — SOURCE PDF NOT ACCESSIBLE |
| ABC Logistics / Mapepele Transport, `45892` | ABC Logistics LLC | No; supplied document is explicitly fictional | Not tested | Not tested | Not tested | Not tested | Not tested | Not tested | Not tested | NOT TESTED — fictional sample, excluded |
| `frontend/e2e/fixtures/E2E-TEST-DATA-rate-confirmation.pdf` | E2E TEST BROKER LLC | File accessible, but generated E2E fixture, not a supplied real document | 200 | Passed | Passed | 201 | Verified through database-backed GET | Passed | Passed | NOT A REAL-DOCUMENT RESULT |

### Accessible Fixture Field Accuracy

The following values were observed during the browser run for the generated E2E fixture. They are evidence of application behavior only, not evidence for the supplied real PDFs.

| Field | PDF/fixture | Extracted | Saved/API | PostgreSQL-backed reload | Result |
|---|---|---|---|---|---|
| Load Number | `E2E-PLAYWRIGHT-20260828` | Same | Same string in POST | Same string in GET and Load Detail | PASS for fixture |
| Broker | `E2E TEST BROKER LLC` | Same | Same | Same | PASS for fixture |
| Rate | `$2,500.00` | `2500` | `2500` | `2500.00` | PASS for fixture |
| Equipment | `DRY VAN` | `DRY_VAN` | `DRY_VAN` | `DRY_VAN`; Load Board displayed Dry Van | PASS for fixture |
| Weight / Miles | `42,000` / `780` | `42000` / `780` | Same | `42000.00` / `780.00` | PASS for fixture |
| Pickup | `100 TEST WAY`, Dallas TX 75201, 2026-08-28 08:00 | Same | Same | Same, DB time `08:00:00` | PASS for fixture |
| Delivery | `200 TEST ROAD`, Atlanta GA 30301, 2026-09-01 14:00 | Same | Same | Same, DB time `14:00:00` | PASS for fixture |
| Carrier / Carrier MC | Not represented in fixture payload | Not returned | Not sent | Not stored | SCHEMA GAP — CARRIER IDENTITY |
| Reference/accessorials | Not represented in create contract | Not returned | Not sent | Not stored | SCHEMA GAP |

### Browser Evidence

- Authenticated login: performed successfully; login response was HTTP 200 and navigated to `/dashboard`.
- Real file upload: performed against the accessible generated fixture; extraction response was HTTP 200.
- Extraction preview: performed; the form showed the extracted load, rate, broker, equipment, miles, and stops.
- Load creation: performed through the UI; response was HTTP 201.
- Live API payload: captured. It contained the exact string load number, rate `2500`, equipment `DRY_VAN`, miles `780`, both stops, dates, and start times.
- PostgreSQL verification: direct `psql`/Docker verification was unavailable because `docker` is not installed in the environment. The authenticated `GET /api/loads/:id` returned the persisted database-backed record, including `08:00:00` and `14:00:00`.
- Browser reload and Load Detail: performed; values remained present. The UI displays PostgreSQL times with seconds (`08:00:00`, `14:00:00`) in the text inputs.
- Load Board search: performed; the row showed the load number, broker, Dry Van, `$2,500.00`, `780.00`, Dallas, Atlanta, and dates.
- Downstream workflow: not completed for the imported fixture. The generic Load Detail save changed status to Dispatched, but did not create a driver assignment; the board then correctly hid the Dispatch action for that status. No direct API assignment was used as a substitute.

### Test Results

- Parser tests: 7/7 focused tests passed.
- Backend tests: 13/13 passed across 6 files.
- Frontend build: passed.
- Backend build: passed.
- E2E: failed before the rate-confirmation steps at an outdated dashboard assertion expecting `E2E TEST - DO NOT USE IN PRODUCTION`; login itself returned 200 and reached the dashboard.

### Failure Matrix

| Finding | Classification | Evidence |
|---|---|---|
| Supplied SolvLogix and LDI source PDFs unavailable | I. Document limitation | Only parsed text and images were supplied in chat; no local binaries found. |
| ABC source explicitly fictional | I. Document limitation | Document footer states it is fictional. |
| E2E fixture is generated test data | I. Document limitation | Fixture is created by `e2e/create-rate-confirmation.mjs`. |
| Full Playwright regression stops at dashboard text assertion | J. Outdated test expectation | Login passed; expected dashboard text was absent. |
| Carrier and carrier MC cannot survive import | G. Schema limitation | No carrier fields in extraction/create/load schema. |
| Generic Load Detail assignment did not create dispatch assignment | E. API/UI mapping or workflow issue | Driver remained unassigned after Load Detail save; separate Dispatch path was unavailable after status changed. |
| Reloaded time inputs include seconds | D. UI mapping observation | DB values are valid PostgreSQL times; detail input displayed `HH:mm:ss`. |

### Final Classification

**PRODUCTION READINESS: PARTIALLY READY — LIMITATIONS REMAIN**

This phase does not authorize a real-document production claim. The supplied SolvLogix and Logistic Dynamics PDFs remain **NOT TESTED — SOURCE PDF NOT ACCESSIBLE**, and the ABC document is fictional. The only complete browser import was the generated E2E fixture.