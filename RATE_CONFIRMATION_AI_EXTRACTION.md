# Rate Confirmation AI Extraction

## Audit Findings

- The active LLM is Google Gemini `gemini-2.5-flash` through `@google/genai`.
- The previous document-upload path used `pdf-parse` plus five regexes and assigned every match a hard-coded `0.85` confidence. Its errors were silently ignored.
- The create-load path already had a larger deterministic parser and Gemini text extraction, but its JSON contract was limited to broker/load/rate/miles/weight/commodity and pickup/delivery blocks.
- OCR was available through `pdfjs-dist`, `@napi-rs/canvas`, and Tesseract, but only the create-load endpoint called it. Document uploads did not support scanned PDFs or images.
- Document type was supplied by the caller; there was no classifier before extraction.
- The database can store field confidence and verification, but saving was not gated by low confidence.

## Current Pipeline

The document extraction path now supports PDF text, PDF OCR fallback, and image OCR; classifies Rate Confirmation/BOL/Invoice/Other; emits the target field contract with `{ value, confidence }`; stores field-level confidence; evaluates detention and rate discrepancies; and exposes authenticated parallel batch extraction at `POST /api/documents/extract-batch` using `files[]`.

Confidence below `0.85` requires the reviewer to edit the field before the review component enables saving.

## Remaining Gaps

- Gemini is still the only LLM provider; production should add timeout, retry/backoff, redaction, cost limits, and provider fallback.
- BOL and Invoice currently classify correctly but do not yet have dedicated field schemas.
- Rate Confirmation upload to a load still uses the user-selected document type; the classifier result is not yet used to reject mismatched types.
- Batch extraction returns results but does not yet persist a batch job or create invoices automatically.
- Detention and accessorial calculations require explicit source fields; the rules flag missing inputs rather than inventing them.

## Golden Validation

Run:

`npx tsx audit-rate-confirmations.ts <fixture-directory> <ground-truth.json>`

The repository contains a synthetic E2E PDF, not 15-20 redacted real broker samples. No real golden accuracy percentage is reported here. Supply the real samples plus a matching ground-truth JSON to produce per-field accuracy and recurring broker-format errors.