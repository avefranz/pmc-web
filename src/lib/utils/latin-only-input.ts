// Global "Latin-only" input guard.
//
// Product rule: text fields must not accept characters from non-Latin
// keyboard layouts — no Cyrillic, CJK (Chinese/Japanese/Korean), Thai, Arabic,
// emoji, etc. Only the English/Latin alphabet (with European diacritics for
// foreign names like Jose/Muller), digits, whitespace and common punctuation
// are allowed.
//
// This is installed ONCE at app start (see main.tsx) as a pair of document-level
// listeners, so it covers every <input>/<textarea> in the app WITHOUT touching
// the shadcn `components/ui/*` primitives (which must stay unmodified). It works
// for three input paths:
//   1. Typing on a non-English layout  blocked in `beforeinput`.
//   2. Pasting / dropping mixed text   stripped in `input` (keeps the Latin part).
//   3. IME composition (e.g. Pinyin)   stripped in `input` after it commits.
//
// PER-FIELD EXCEPTIONS: add `data-allow-intl="true"` to the input/textarea (or
// any ancestor element) to opt that field out, e.g. a Thai address field.

// Allowed code-point ranges (everything else is rejected):
//   U+0020..U+007E  Basic Latin: printable ASCII (a-z A-Z 0-9 punctuation/symbols)
//   U+00A0..U+024F  Latin-1 Supplement + Latin Extended-A/B (accented letters)
//   U+1E00..U+1EFF  Latin Extended Additional (e.g. Vietnamese)
//   U+2010..U+2027  common dashes and quotes pasted from documents
//   U+2030..U+205E  general punctuation (per-mille, bullet, ellipsis, angle quotes)
// plus any whitespace (the \s class covers tab and newline).
const ALLOWED = "\\u0020-\\u007E\\u00A0-\\u024F\\u1E00-\\u1EFF\\u2010-\\u2027\\u2030-\\u205E";
const DISALLOWED = new RegExp(`[^${ALLOWED}\\s]`, "u");
const DISALLOWED_GLOBAL = new RegExp(`[^${ALLOWED}\\s]`, "gu");

// Input types that hold free text we want to police. Non-text controls
// (checkbox, date, file, range, color, number, ...) are left alone.
const TEXTY_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "url",
  "tel",
  "password",
  "", // an <input> with no type attribute defaults to text
]);

function isGuardedField(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) return TEXTY_INPUT_TYPES.has(target.type);
  return false;
}

function isExempt(el: HTMLElement): boolean {
  // Opt-out: the field itself or any ancestor carries data-allow-intl="true".
  return el.closest('[data-allow-intl="true"]') !== null;
}

function hasDisallowed(str: string): boolean {
  // DISALLOWED has no global flag, so .test is stateless across calls.
  return DISALLOWED.test(str);
}

function strip(str: string): string {
  return str.replace(DISALLOWED_GLOBAL, "");
}

// 1. Block typing a disallowed character before it ever lands. Paste/drop are
//    handled by the input sanitizer below so a mixed paste keeps its Latin part
//    instead of being rejected wholesale.
function onBeforeInput(e: InputEvent) {
  const el = e.target;
  if (!isGuardedField(el) || isExempt(el)) return;
  const type = e.inputType;
  if (type === "insertFromPaste" || type === "insertFromDrop") return;
  if (typeof e.data === "string" && e.data.length > 0 && hasDisallowed(e.data)) {
    e.preventDefault();
  }
}

// Re-entrancy guard: sanitising dispatches a synthetic "input" event so React's
// onChange re-runs with the cleaned value, skip our own re-dispatch.
let sanitizing = false;

// 2/3. Catch-all: after any input (paste, drop, IME commit, or an edge case the
//      beforeinput guard missed), strip disallowed characters and push the clean
//      value back through React's controlled-input machinery.
function onInput(e: Event) {
  if (sanitizing) return;
  const el = e.target;
  if (!isGuardedField(el) || isExempt(el)) return;

  const value = el.value;
  if (!hasDisallowed(value)) return;

  const caret = el.selectionStart ?? value.length;
  const removedBeforeCaret = (value.slice(0, caret).match(DISALLOWED_GLOBAL) ?? []).length;
  const clean = strip(value);

  // Update via the native value setter so React notices the change (assigning
  // el.value directly is swallowed by React's value tracking).
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, clean);

  const newCaret = Math.max(0, caret - removedBeforeCaret);
  try {
    el.setSelectionRange(newCaret, newCaret);
  } catch {
    // setSelectionRange throws on input types that don't support it (email/number), ignore.
  }

  sanitizing = true;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  sanitizing = false;
}

let installed = false;

/** Install the global Latin-only input guard. Safe to call once at app start. */
export function installLatinOnlyInputGuard() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  // Capture phase so we run before React's own listeners.
  document.addEventListener("beforeinput", onBeforeInput as EventListener, true);
  document.addEventListener("input", onInput, true);
}
