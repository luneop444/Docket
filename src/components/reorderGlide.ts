/** Native: the list re-sorts in place (LayoutAnimation, glideNext, does the motion there). */
export type RowTops = Map<string, number> | null;
export const measureRows = (_list: unknown): RowTops => null;
export function glideRows(_list: unknown, _before: RowTops) {}
