/**
 * Keeps the last two words together with a non-breaking space, so a line never
 * ends with one word on its own. Only for text of 3+ words: two-word text
 * (a company name in a narrow tile) still needs to wrap. Works across pieces,
 * e.g. "for load {number}". Used by T for every piece of text; on the web,
 * TextWrap.web.tsx also balances headings and turns on text-wrap: pretty.
 */
export function noWidow<T>(children: T): T {
  const parts: unknown[] = Array.isArray(children) ? [...children] : [children];
  const text = parts.map((p) => (typeof p === 'string' || typeof p === 'number' ? String(p) : ' x ')).join('');
  if (text.trim().split(/\s+/).length < 3) return children;
  let seen = false;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (typeof p !== 'string') {
      if (p !== null && p !== undefined && p !== false && p !== '') seen = true;
      continue;
    }
    for (let j = p.length - 1; j >= 0; j--) {
      if (!/\s/.test(p[j])) {
        seen = true;
      } else if (seen) {
        let k = j;
        while (k > 0 && /\s/.test(p[k - 1])) k--;
        parts[i] = p.slice(0, k) + '\u00A0' + p.slice(j + 1);
        return (Array.isArray(children) ? parts : parts[0]) as T;
      }
    }
  }
  return children;
}
