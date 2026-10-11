/** A file's `yyyy-mmdd` as a reader writes a day, `yyyy-mm-dd`. */
export const dayOf = (day: string) => `${day.slice(0, 7)}-${day.slice(7)}`;
