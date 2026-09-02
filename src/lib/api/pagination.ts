export function encodeCursor(key: string, slug: string): string {
  return Buffer.from(JSON.stringify({ k: key, s: slug })).toString("base64url");
}

export function decodeCursor(cursor: string): { k: string; s: string } | null {
  try {
    const o = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof o.k === "string" && typeof o.s === "string") return o;
  } catch {
    /* ignore */
  }
  return null;
}

export function paginate<T>(
  rows: T[],
  limit: number,
  cursor: string | null,
  keyOf: (row: T) => { k: string; s: string },
): { items: T[]; nextCursor: string | null; total: number } {
  const total = rows.length;
  let start = 0;
  if (cursor) {
    const c = decodeCursor(cursor);
    if (c) {
      const idx = rows.findIndex((r) => {
        const rk = keyOf(r);
        return rk.k > c.k || (rk.k === c.k && rk.s > c.s);
      });
      start = idx < 0 ? rows.length : idx;
    }
  }
  const page = rows.slice(start, start + limit);
  const last = page[page.length - 1];
  const more = start + limit < rows.length;
  return {
    items: page,
    nextCursor: more && last ? encodeCursor(keyOf(last).k, keyOf(last).s) : null,
    total,
  };
}
