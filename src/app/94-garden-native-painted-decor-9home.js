/* The pictures of the things for indoors (your own house: 94-garden-house-1furn.js paints them) for the shop, the bag and your
 * things. iconOnly: they are never drawn in the garden (an indoor thing is never set out there). This file only names them for the
 * painted decorations' registry (94-garden-native-painted-decor-0kit.js) at load; each is painted the first time its icon is asked for. */
GardenPaintedDecor.add('home', (() => {
  const rows = {};
  for (const d of GARDEN_DECOR) {
    if (!d.indoor) continue;
    const id = d.id;
    rows[id] = { iconOnly: true, box: houseArtBox(id).slice(), draw(B) {
      const cx = B.cx, b = houseArtBox(id);
      cx.save(); cx.globalCompositeOperation = 'destination-out'; cx.fillRect(b[0] - 80, b[1] - 80, b[2] - b[0] + 160, b[3] - b[1] + 160); cx.restore();   // (no patch of lawn under a thing for indoors)
      housePaintPiece(cx, id, { v: 0, lit: !!(d.lit), icon: true });
    } };
  }
  return rows;
})());
