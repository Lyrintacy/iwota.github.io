/** Reserve a two-cell description beneath the selected portal. Subsequent portals
 * fill the remaining cells in a snake, without changing their stable IDs. */
export function portalLayout(count, columns, active = -1, direction = "right") {
  const positions = [];
  const row = active >= 0 ? Math.floor(active / columns) + 1 : -1;
  const col = active >= 0 ? active % columns : 0;
  const start =
    col === 0
      ? 0
      : col === columns - 1
        ? columns - 2
        : direction === "right"
          ? col
          : col - 1;
  const occupied = new Set();
  if (active >= 0)
    for (let c = start; c < start + 2; c++) occupied.add(`${row}:${c}`);
  let cursor = 0;
  for (let index = 0; index < count; index++) {
    let r, c;
    do {
      r = Math.floor(cursor / columns);
      const raw = cursor % columns;
      c =
        active >= 0 &&
        r >= row &&
        (r - row) % 2 === (direction === "right" ? 0 : 1)
          ? columns - 1 - raw
          : raw;
      cursor++;
    } while (occupied.has(`${r}:${c}`));
    positions.push({ row: r + 1, col: c + 1 });
  }
  return {
    positions,
    description: active >= 0 ? { row: row + 1, col: start + 1 } : null,
  };
}
