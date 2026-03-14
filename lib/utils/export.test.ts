/**
 * Unit tests for PDF export sanitization (filterSupportedCharacters).
 * Ensures user-controlled and malicious input cannot reach jsPDF text() unsanitized.
 */
import { describe, it, expect } from 'vitest';
import { filterSupportedCharacters } from './export';

describe('filterSupportedCharacters', () => {
  it('allows ASCII printable characters (32-126)', () => {
    const input = 'Hello World 123!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
    expect(filterSupportedCharacters(input)).toBe(input);
  });

  it('allows tab, newline, and carriage return', () => {
    expect(filterSupportedCharacters('a\tb\nc\rd')).toBe('a\tb\nc\rd');
  });

  it('allows extended ASCII (128-255)', () => {
    const extended = '\u00A0\u00FF\u00E9'; // nbsp, ÿ, é
    expect(filterSupportedCharacters(extended)).toBe(extended);
  });

  it('strips null bytes and other control characters', () => {
    const withNull = 'hello\u0000world';
    expect(filterSupportedCharacters(withNull)).toBe('helloworld');
    expect(filterSupportedCharacters('\x00\x01\x1f')).toBe('');
  });

  it('passes ASCII script-like strings through (no execution context in pdf.text())', () => {
    const xss = '<script>alert(1)</script>';
    expect(filterSupportedCharacters(xss)).toBe(xss); // printable ASCII only; jsPDF text() does not execute JS
  });

  it('strips embedded control characters from otherwise-safe strings', () => {
    const withControl = 'hello\x00<script>\x1b</script>';
    expect(filterSupportedCharacters(withControl)).toBe('hello<script></script>');
  });

  it('strips emoji and high Unicode (above U+00FF)', () => {
    const withEmoji = 'Task \u{1F4CB} done';
    expect(filterSupportedCharacters(withEmoji)).toBe('Task  done');
    const highUnicode = '\u0100\uFFFF';
    expect(filterSupportedCharacters(highUnicode)).toBe('');
  });

  it('returns empty string for empty or only-unsupported input', () => {
    expect(filterSupportedCharacters('')).toBe('');
    expect(filterSupportedCharacters('😀🎉')).toBe('');
    expect(filterSupportedCharacters('\u0000\u0000')).toBe('');
  });

  it('preserves mixed safe content while stripping unsafe', () => {
    const mixed = 'Report title ===== Section\nValid content 123 \u0000 \u{1F4DA} end';
    const result = filterSupportedCharacters(mixed);
    expect(result).toContain('Report title');
    expect(result).toContain('=====');
    expect(result).toContain('Section');
    expect(result).toContain('Valid content 123');
    expect(result).toContain('end');
    expect(result).not.toContain('\u0000');
    expect(result).not.toMatch(/\u{1F4DA}/u);
  });

  it('handles AcroForm/PDF JS-like strings by stripping to safe chars only', () => {
    const acroFormLike = 'app.alert("x")';
    const result = filterSupportedCharacters(acroFormLike);
    expect(result).toBe('app.alert("x")'); // same chars, but no execution context in our flow
    // Our code never passes text to PDF JavaScript; only pdf.text() is used.
    const weirdUnicode = '\\u0000\\x00';
    expect(filterSupportedCharacters(weirdUnicode)).toBe(weirdUnicode);
  });
});
