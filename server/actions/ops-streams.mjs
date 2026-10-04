// server/actions/ops-streams.mjs - write operations on streams (the areas
// every task belongs to), so an assistant or MCP client can do what
// Settings > Streams does. Added to OPS in ops.mjs.
//
//   stream.create   [create_stream]    label, optional id, colour, symbol and shape
//   stream.update   [update_stream]    rename, recolour, symbol, marker shape, archive / unarchive
//   stream.reorder  [reorder_streams]  the order in the sidebar and pickers
//
// Streams are never deleted (tasks keep pointing at them); archiving hides
// one from the sidebar and pickers. Undo uses the 'streams' entity
// (entities.mjs), which snapshots the whole list. Tasks point at the stream
// id, so a rename shows everywhere at once. Symbols and shapes follow the
// page's right-click customise popover (lib/customise.mjs = 28-customise-logic.js).

import { ActionError, cleanLine, slug, streamList, resolveStream, clone } from './model.mjs';
import { CZ_SHAPES, czCleanSymbol, spriteIconNames } from '../../lib/customise.mjs';

const COLOR = /^#[0-9a-fA-F]{6}$/;
const PALETTE = ['#4f46e5', '#2563eb', '#0891b2', '#059669', '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#7c3aed', '#64748b'];
const obj = (properties, required = [], extra = {}) => ({ type: 'object', properties, required, additionalProperties: false, ...extra });
const S = {
  stream: { type: 'string', minLength: 1, maxLength: 60, description: 'stream id from get_context (its label also works)' },
  label: { type: 'string', minLength: 1, maxLength: 40, description: 'the name shown in the app' },
  color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$', formatHint: '#RRGGBB', description: "colour, e.g. '#2563eb'" },
  icon: { type: 'string', maxLength: 40, description: "symbol shown in the stream's marker: an icon name from the app such as 'rocket', 'book-open' or 'graduation-cap', or one emoji; '' removes it" },
  shape: { type: 'string', enum: [...CZ_SHAPES], description: 'shape of the marker: dot (the default), rounded, square, diamond, ring or pill' },
};
/** A checked symbol ('' = none) or a BAD_VALUE error naming the closest icons. */
function cleanIcon(v, field = 'icon') {
  const r = czCleanSymbol(v, spriteIconNames());
  if (r.error) throw new ActionError('BAD_VALUE', r.error, { field, ...(r.near.length ? { valid: r.near, hint: `did you mean ${r.near.map(n => `'${n}'`).join(' or ')}?` } : {}) });
  return r.value;
}
/** Set (or clear, for '' / 'dot') a marker field; returns the change or null. */
function setMarker(st, field, v, id) {
  const cur = st[field] || '';
  const nv = field === 'shape' && v === 'dot' ? '' : v;
  if (nv === cur) return null;
  if (nv) st[field] = nv; else delete st[field];
  return change(id, st.label, field, cur || (field === 'shape' ? 'dot' : null), nv || (field === 'shape' ? 'dot' : null));
}

/** The stored list (materialised from the defaults the first time). */
function streams(ctx) {
  ctx.touch('streams');
  const s = ctx.s;
  if (!Array.isArray(s.streams) || !s.streams.length) {
    s.streams = streamList(s).map(({ id, label, archived, order }) => ({ id, label, color: PALETTE[order % PALETTE.length] || '#64748b', order, archived }));
  }
  return s.streams;
}
const change = (id, label, field, from, to) => ({ entity: 'stream', id, label, field, from: from ?? null, to: to ?? null });

export const STREAM_OPS = [
  {
    name: 'stream.create', tool: 'create_stream',
    description: 'Add a stream (an area of work such as "Work" or "Health"). Check get_context first: reuse an existing stream rather than adding a near-duplicate.',
    schema: obj({ label: S.label, id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]{0,39}$', formatHint: 'lower-case letters, digits, -', description: 'optional id (default: from the label)' }, color: S.color, icon: S.icon, shape: S.shape }, ['label']),
    run(ctx, p) {
      const label = cleanLine(p.label, 40);
      if (!label) throw new ActionError('BAD_VALUE', 'label must not be empty', { field: 'label' });
      const list = streams(ctx);
      const dup = list.find(x => x.label.toLowerCase() === label.toLowerCase() || x.id === (p.id || slug(label)));
      if (dup) throw new ActionError('DUPLICATE_STREAM', `a stream '${dup.label}' (${dup.id}) already exists`, { field: 'label', hint: dup.archived ? 'unarchive it with update_stream' : 'use it, or pick another name' });
      let id = p.id || slug(label) || 'stream';
      for (let n = 2; list.some(x => x.id === id); n++) id = `${slug(label) || 'stream'}-${n}`;
      const color = p.color && COLOR.test(p.color) ? p.color.toLowerCase() : PALETTE[list.length % PALETTE.length];
      const icon = p.icon !== undefined ? cleanIcon(p.icon) : '';
      list.push({ id, label, color, order: list.reduce((m, x) => Math.max(m, Number(x.order) || 0), -1) + 1, archived: false,
        ...(icon ? { icon } : {}), ...(p.shape && p.shape !== 'dot' ? { shape: p.shape } : {}) });
      return { summary: `Create stream "${label}" (${id})`, changes: [change(id, label, 'created', null, label)], created: { id } };
    },
  },
  {
    name: 'stream.update', tool: 'update_stream',
    description: "Rename, recolour, archive or unarchive a stream, or change its marker: a symbol (icon name such as 'rocket', or an emoji) and a shape (dot, rounded, square, diamond, ring, pill). Tasks keep their stream, so a rename shows everywhere. Archiving hides it from the sidebar and pickers; its tasks are kept.",
    schema: obj({ stream: S.stream, label: S.label, color: S.color, icon: S.icon, shape: S.shape, archived: { type: 'boolean', description: 'true hides the stream (tasks are kept)' } }, ['stream'],
      { minProperties: 2, minPropertiesMessage: 'update_stream needs label, color, icon, shape or archived' }),
    run(ctx, p) {
      const id = resolveStream(ctx.s, p.stream);
      const list = streams(ctx);
      let st = list.find(x => x.id === id);
      if (!st) { st = { id, label: id, color: '#64748b', order: list.length, archived: false }; list.push(st); }
      const ch = [];
      if (p.label !== undefined) {
        const label = cleanLine(p.label, 40);
        if (!label) throw new ActionError('BAD_VALUE', 'label must not be empty', { field: 'label' });
        const clash = list.find(x => x !== st && x.label.toLowerCase() === label.toLowerCase());
        if (clash) throw new ActionError('DUPLICATE_STREAM', `another stream is already called '${clash.label}'`, { field: 'label' });
        if (label !== st.label) { ch.push(change(id, label, 'label', st.label, label)); st.label = label; }
      }
      if (p.color !== undefined) {
        if (!COLOR.test(p.color)) throw new ActionError('BAD_VALUE', 'color must look like #2563eb', { field: 'color' });
        if (p.color.toLowerCase() !== String(st.color || '').toLowerCase()) { ch.push(change(id, st.label, 'color', st.color, p.color.toLowerCase())); st.color = p.color.toLowerCase(); }
      }
      if (p.icon !== undefined) { const c = setMarker(st, 'icon', cleanIcon(p.icon), id); if (c) ch.push(c); }
      if (p.shape !== undefined) { const c = setMarker(st, 'shape', p.shape, id); if (c) ch.push(c); }
      if (p.archived !== undefined && !!p.archived !== !!st.archived) {
        if (p.archived && list.filter(x => !x.archived).length <= 1) throw new ActionError('BAD_VALUE', 'keep at least one stream that is not archived', { field: 'archived' });
        ch.push(change(id, st.label, 'archived', !!st.archived, !!p.archived)); st.archived = !!p.archived;
      }
      if (!ch.length) ctx.warn(`stream '${st.label}': nothing to change`);
      return { summary: ch.length ? `Update stream "${st.label}": ${ch.map(c => c.field).join(', ')}` : `No change to stream "${st.label}"`, changes: ch };
    },
  },
  {
    name: 'stream.reorder', tool: 'reorder_streams',
    description: 'Set the order of streams (sidebar and pickers). Give stream ids; any not listed keep their relative order after them.',
    schema: obj({ ids: { type: 'array', items: S.stream, minItems: 1, maxItems: 100 } }, ['ids']),
    run(ctx, p) {
      const list = streams(ctx);
      const want = [...new Set(p.ids.map((v, i) => resolveStream(ctx.s, v, `ids[${i}]`)))];
      const before = clone(list.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(x => x.id));
      const rest = before.filter(id => !want.includes(id));
      const order = [...want, ...rest];
      for (const x of list) x.order = order.indexOf(x.id);
      list.sort((a, b) => a.order - b.order);
      const same = before.join(',') === order.join(',');
      if (same) ctx.warn('the streams were already in that order');
      return { summary: same ? 'No change to the stream order' : `Reorder streams: ${order.join(', ')}`, changes: same ? [] : [change('streams', 'streams', 'order', before, order)] };
    },
  },
];
