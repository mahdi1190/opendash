/* Low iron cattle rails framing the Stockyards street. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  sceneObjDefine({
    id: 'street.stockyards-rail', category: 'street', size: [320, 140], variants: 1,
    seasonal: false, flippable: true, parts: ['body'],
    palette: { base: { iron: ['#24313a', '#3b4548', '#172731'] } },
    shadow: { rx: 120, ry: 5, h: 95 },
    tags: ['texas', 'fort-worth', 'stockyards', 'rail', 'kit:urban', 'role:street'],
    credit: 'native: open cattle rails in one-point perspective',
    build() {
      return { body: [
        ['@iron.0', 'M-160 -18L140 -92v8L-160 -7zM-160 18L140 -60v8L-160 30z'],
        ['@iron.1', 'M-160 -18L140 -92v3L-160 -15z'],
        ['@iron.0', 'M-118 25v-116l6-8 6 8V22zM38 -17v-112l5-6 5 6v109zM132 -49v-95l4-6 5 6v92z'],
        ['@iron.2', 'M-125 27l26-6v7l-26 6zM32 -15l22-6v6l-22 6zM126 -47l20-5v5l-20 5z'],
      ] };
    },
  });
})();
