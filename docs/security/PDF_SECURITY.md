# PDF Export Security and Limitations

This document describes how PDF generation is secured and what limitations apply to user-supplied content.

## Overview

PDF export is implemented in `lib/utils/export.ts` using the `jspdf` library. Reports are generated from the DOM of the reports page and downloaded as files; there is no embedded PDF viewer or inline rendering of user-controlled PDFs.

## Security Measures

### No AcroForm or PDF JavaScript

- The application **does not** use AcroForm fields, form widgets, or custom JavaScript inside the generated PDF.
- Only the following jsPDF APIs are used: `text()`, `addImage()`, `line()`, `addPage()`, `setFont()`, `setFontSize()`, `splitTextToSize()`, `getTextWidth()`, `getImageProperties()`. There is no path that injects script or form actions into the PDF.

### Sanitization of User-Derived Content

- All text that reaches `pdf.text()` is passed through **`filterSupportedCharacters()`** before being written.
- **Allowed character set:** ASCII printable (32–126), extended ASCII (128–255), and tab/newline/carriage return. All other code points (control characters, null bytes, emoji, and other high Unicode) are stripped.
- **Content sources:**
  - **Report body:** Text is extracted from the report DOM via `extractTextContent()`; every line is then sanitized with `filterSupportedCharacters()` before being passed to jsPDF.
  - **Footer text:** System configuration `reportFooterText` is sanitized with `filterSupportedCharacters()` (with a safe default if empty).
  - **Fixed strings:** Titles (e.g. "iTasks Report"), timestamps, and page numbers are generated in code and do not come from user input.

### Download-Only; No In-App PDF Execution

- The generated PDF is offered as a **download** only (e.g. via `pdf.save(filename)`). It is not rendered in an iframe or object in the app, so the browser does not execute any PDF logic in the application context.

## Limitations for User-Supplied Content

- **Character set:** Only the allowed range (see above) is preserved. Emoji and many Unicode symbols (e.g. mathematical symbols, CJK outside the extended-ASCII range used) are stripped and may appear as missing text or spaces.
- **No rich formatting:** User-controlled content is treated as plain text. No HTML or markup is interpreted in the PDF path.
- **Images:** Only the organization logo and the iTasks logo are embedded from configured or static assets. User-uploaded images in report content are not currently embedded as images in the PDF; only the text extracted from the report DOM is included.
- **Length:** Very long reports may produce large PDFs; consider pagination or filtering in the UI.

## Testing

- Unit tests in `lib/utils/export.test.ts` cover `filterSupportedCharacters()` with malicious or unusual input (control characters, null bytes, emoji, mixed content). Run with `npm test`.

## References

- Implementation: `lib/utils/export.ts`
- Report PDF trigger: `components/reports-client.tsx` (export to PDF action)
- Related: `docs/implementation/implementation.md` (jsPDF upgrade and hardening)
