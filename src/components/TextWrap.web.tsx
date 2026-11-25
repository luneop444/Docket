import { useEffect } from 'react';
import { color } from '../theme/tokens';

/**
 * Browser line-breaking on top of T's non-breaking space:
 * - headings (T h1/h2 render with role="heading") balance their lines, so a
 *   two-line title splits evenly (Chrome 114+, Firefox 121+, Safari 17.5+);
 * - other text uses text-wrap: pretty where supported, which also avoids a
 *   lone last word and evens out the rag. Unsupported browsers ignore it.
 */
const CSS = `
[dir="auto"] { text-wrap: pretty; }
[role="heading"][dir="auto"] { text-wrap: balance; }
/* Autofill (a saved first name) keeps the field's own colours, not Chrome's blue fill. */
input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
  -webkit-text-fill-color: ${color.ink};
  caret-color: ${color.ink};
  transition: background-color 0s 600000s, color 0s 600000s;
}
`;

export function TextWrap() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.dataset.docket = 'text-wrap';
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  return null;
}
