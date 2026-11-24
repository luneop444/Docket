/**
 * Content that moved without a scroll (a rubber-band stretch). Glass over the content redraws
 * on this as on a scroll; screens' own scroll handlers don't run on it.
 */
export const MOVE_EVENT = 'docket:contentmove';

/**
 * Content that changed in place without changing size (a list re-sorted). The glass pictures a
 * screen again only when it changes size, so this tells it to take a new picture.
 */
export const CHANGE_EVENT = 'docket:contentchange';
