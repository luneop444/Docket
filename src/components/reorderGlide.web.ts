import { CHANGE_EVENT } from './contentMove';

/**
 * A list re-sorting (Companies' "Shortest waits" / "Most often paid"): each row glides from where
 * it was to where it now is, so you can follow a company to its new place instead of the list
 * jumping. Measured before the change, played after it has drawn (FLIP). The dividers fade out
 * for the move and back in, so rows don't slide across lines that belong to other rows.
 */
export type RowTops = Map<string, number> | null;
const MS = 420;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const rows = (list: HTMLElement) => Array.from(list.querySelectorAll<HTMLElement>('[data-glide]'));

export function measureRows(list: unknown): RowTops {
  if (!(list instanceof HTMLElement)) return null;
  return new Map(rows(list).map((r) => [r.dataset.glide!, r.getBoundingClientRect().top]));
}

export function glideRows(list: unknown, before: RowTops) {
  if (!(list instanceof HTMLElement) || !before) return;
  const moving = rows(list)
    .map((r) => ({ r, dy: (before.get(r.dataset.glide!) ?? r.getBoundingClientRect().top) - r.getBoundingClientRect().top }))
    .filter((m) => Math.abs(m.dy) > 0.5);
  const done = () => document.dispatchEvent(new Event(CHANGE_EVENT));
  if (!moving.length) return done();
  const card = list.firstElementChild as HTMLElement | null;
  const dividers = card ? Array.from(card.children).filter((c): c is HTMLElement => c instanceof HTMLElement && !c.querySelector('[data-glide]') && !c.dataset.glide) : [];
  for (const d of dividers) {
    d.style.transition = 'opacity 120ms linear';
    d.style.opacity = '0';
  }
  for (const { r, dy } of moving) {
    r.style.transition = 'none';
    r.style.transform = `translateY(${dy}px)`;
    // Rows moving up pass over the ones moving down.
    r.style.position = 'relative';
    r.style.zIndex = dy > 0 ? '1' : '0';
  }
  void list.offsetHeight;
  requestAnimationFrame(() => {
    for (const { r } of moving) {
      r.style.transition = `transform ${MS}ms ${EASE}`;
      r.style.transform = '';
    }
  });
  setTimeout(() => {
    for (const { r } of moving) {
      r.style.transition = '';
      r.style.zIndex = '';
    }
    for (const d of dividers) {
      d.style.transition = 'opacity 180ms linear';
      d.style.opacity = '';
    }
    done();
  }, MS + 40);
}
