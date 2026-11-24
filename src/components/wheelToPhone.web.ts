import { useEffect, type RefObject } from 'react';

/**
 * In the laptop phone frame the phone is the only thing to scroll, but Chrome scrolls whatever is
 * under the pointer: over the grey desk, the notes or the floating tab bar (which sits on the
 * content without being part of it) a two-finger scroll did nothing, and nothing bounced
 * (23 Nov). A wheel that no scroll area under the pointer takes is handed to the screen the
 * phone shows: its rubber band sees it first (as it would see the browser's own), then the
 * screen scrolls by it.
 */
const forwarded = new WeakSet<Event>();

const scrolls = (el: HTMLElement) => {
  const o = getComputedStyle(el).overflowY;
  return (o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1;
};

export function useWheelToPhone(phone: RefObject<unknown>, on: boolean) {
  useEffect(() => {
    const host = phone.current as HTMLElement | null;
    if (!on || !host || typeof window === 'undefined') return;
    const onWheel = (e: WheelEvent) => {
      if (forwarded.has(e) || e.ctrlKey) return;
      // Something under the pointer scrolls (a screen, a sheet, a list): the browser has it.
      for (let el = e.target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
        if (scrolls(el)) return;
      }
      // The screen the phone shows: the tall scroll area at the middle of its screen.
      const box = host.getBoundingClientRect();
      let node = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2) as HTMLElement | null;
      while (node && node !== host) {
        const o = getComputedStyle(node).overflowY;
        if ((o === 'auto' || o === 'scroll' || o === 'hidden') && node.clientHeight > box.height * 0.5 && node.firstElementChild) break;
        node = node.parentElement;
      }
      if (!node || node === host) return;
      const copy = new WheelEvent('wheel', {
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaMode: e.deltaMode,
        clientX: e.clientX,
        clientY: e.clientY,
      });
      // The band tells a mouse wheel from a touchpad by this (not settable through the constructor).
      Object.defineProperty(copy, 'wheelDeltaY', { value: (e as unknown as { wheelDeltaY?: number }).wheelDeltaY });
      forwarded.add(copy);
      node.dispatchEvent(copy);
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * node.clientHeight : e.deltaY;
      if (getComputedStyle(node).overflowY !== 'hidden') node.scrollBy({ top: dy, behavior: 'instant' });
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [phone, on]);
}
