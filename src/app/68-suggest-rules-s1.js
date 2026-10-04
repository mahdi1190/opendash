/* ============================================================
   SUGGESTION S1: block a free stretch (owner: Suggestions engine)
   ------------------------------------------------------------
   The user's own example (3 Oct): "free from 14:45 to the evening, block some
   time?" now books a real calendar event, never a task.
     primary  "Block 14:45–16:45": the event card in CREATE mode, prefilled
              (title "Focus: <top Focus task>", the gap start to min(gap, 2 h),
              the primary calendar, the task linked). Save = CalWrite.create,
              then the event is marked as the dashboard's own block, linked to
              the task and the task is planned for that day.
     quick    "✓": the same event at once, with Undo (receipt in the card).
   Shown in place by the schedule widget (every free gap, the banner, the L
   track's footer) and, as a proactive card, in the hero / Suggestions / the
   morning story on work days within working hours.
   PURE: this file is also the TEMPLATE for new rule files
   (68-suggest-rules-<area>.js): helpers + one sgRegisterRule per card; no DOM,
   no page globals (lib/suggest-logic.mjs loads it for the tests).
   ============================================================ */

/**
 * The top task for a focus block: the first Focus task that is open, not waiting, not
 * snoozed or not started yet, and has no own block still to come. null = just focus time.
 */
function sgTopTask(ctx, o) {
  o = o || {};
  const skip = new Set(o.skip || []);
  for (const id of ctx.focus || []) {
    if (skip.has(id)) continue;
    const t = sgTask(ctx, id);
    if (!t || t.status === 'done' || t.waiting || t.snoozed || t.notStarted) continue;
    if (sgFutureBlocksFor(ctx, id).length) continue;
    return t;
  }
  return null;
}
/** The event's description: plain text, no notes, no links. Empty without a task. */
function sgBlockDescription(t) {
  if (!t) return '';
  const lines = ['Focus block from your dashboard.', 'Task: ' + sgClip(t.title, 200)];
  const next = ((t.subtasks && t.subtasks.open) || []).slice(0, 3).map(s => sgClip(s, 80)).filter(Boolean);
  if (next.length) lines.push('Next: ' + next.join('; '));
  return lines.join('\n');
}
/** The block's event title: "Focus: <short task title>" (80 characters at most), else "Focus time". */
function sgBlockTitle(t) { return t ? 'Focus: ' + sgShort(t.title, 80) : 'Focus time'; }

/**
 * S1's card for one free gap {start, end} today (minutes). o.surface: 'schedule' (in place)
 * or anything else (proactive). The start moves to now (rounded up to 5 minutes) when the
 * gap has begun; under 15 minutes left -> null. Length = min(gap, 2 h), or min(gap, o.minutes)
 * (15 min to 4 h: the Fill the gap widget books a task's own length); o.taskId = that task.
 */
function sgFreeSlotCard(ctx, gap, o) {
  o = o || {};
  if (!gap || !Number.isFinite(gap.start) || !Number.isFinite(gap.end)) return null;
  const date = o.date || ctx.now.date;
  const start = date === ctx.now.date ? Math.max(gap.start, Math.ceil(ctx.now.min / 5) * 5) : gap.start;
  if (gap.end - start < SG_BLOCK_MIN) return null;
  const len = Math.min(gap.end - start, Number(o.minutes) > 0 ? Math.max(SG_BLOCK_MIN, Math.min(240, Number(o.minutes))) : SG_BLOCK_MAX);
  const end = start + len;
  const work = sgWork(ctx.work);
  const t = o.taskId ? sgTask(ctx, o.taskId) : sgTopTask(ctx);
  const short = t ? sgShort(t.title, 48) : '';
  const range = `${sgHM(start)}–${sgHM(end)}`;
  const caps = ctx.capabilities || {};
  const args = { taskId: t ? t.id : null, date, start, end, gapEnd: gap.end, rule: 'free-slot', title: sgBlockTitle(t), description: sgBlockDescription(t) };
  const why = [`You have ${sgDur(gap.end - start)} free until ${sgHM(gap.end)}${gap.end === work.end ? ', the end of your working hours' : ''}.`];
  if (t) {
    const rank = (ctx.focus || []).indexOf(t.id);
    const reasons = (t.focusWhy || []).slice(0, 2).map(r => String(r).charAt(0).toLowerCase() + String(r).slice(1)).join(', ');
    why.push(`${short} is ${rank <= 0 ? 'first' : 'next'} in Focus${reasons ? ' (' + reasons + ')' : ''}.`);
    why.push('Nothing is booked for it yet.');
  } else why.push('Nothing in Focus needs a block right now, so this is open focus time.');
  const card = {
    key: `free:${date}:${gap.end}`,
    icon: 'calendar-plus', scene: t && t.scene ? t.scene : 'writing',
    urgency: gap.lead ? 1.3 : 1,
    title: `Free ${sgHM(start)}–${sgHM(gap.end)}`,
    text: t ? `Block ${sgDur(len)} for ${short}?` : `Block ${sgDur(len)} for focus?`,
    why,
    preview: `Opens a new event "${args.title}" in your primary Google calendar, ${range}, with no guests, for you to adjust. `
      + `Save adds it${t ? ', links it to the task and plans the task for today' : ''}. The ✓ adds it straight away; Undo removes ${t ? 'both' : 'it'}.`,
    primary: { label: 'Block ' + range + (t ? '' : ' for focus'), icon: 'calendar-plus',
      aria: `Block ${sgHM(start)} to ${sgHM(end)} for ${short || 'focus'} in Google Calendar`,
      action: { type: 'cal.blockOpen', args } },
    quick: { label: 'Add it now', icon: 'check', aria: `Add the block ${sgHM(start)} to ${sgHM(end)} now, with Undo`, action: { type: 'cal.block', args } },
    menu: [{ label: 'Make it a task instead', icon: 'list-todo', action: { type: 'task.createOpen', args: { title: '', date, time: sgHM(start), minutes: len } } }],
    claims: [`slot:${date}:${start}-${gap.end}`].concat(t ? ['task:' + t.id] : []),
    entity: t ? 'task:' + t.id : '',
    expiresMin: gap.end - SG_BLOCK_MIN,
    stream: t ? t.stream || '' : '',
  };
  // G1 / G2: no write path -> say how to get one (never a task).
  if (!caps.calWrite) {
    card.primary = { label: 'Connect calendar', icon: 'plug', aria: 'Connect Google Calendar to block time', action: { type: 'nav', args: { to: 'connections', name: 'calendar' } } };
    card.quick = null;
    card.preview = 'Opens Connections: once Google Calendar is connected, this button books the block.';
  } else if (ctx.cal && ctx.cal.stale) {
    card.primary = { label: 'Update calendar', icon: 'refresh-cw', aria: 'Read the calendar again before blocking time', action: { type: 'store.refresh', args: { store: 'calendar' } } };
    card.quick = null;
    card.preview = 'Reads your calendar again (nothing is changed), so the free time shown is right.';
  }
  return card;
}

sgRegisterRule({
  id: 'free-slot', area: 'time', title: 'Block a free stretch', value: 5, defaultOn: true,
  description: 'A clear stretch of 45 minutes or more in your working hours: block it for your top Focus task.',
  safetyHint: 'The button opens the new event filled in, for you to adjust and save; ✓ adds it at once, with Undo. Never invites anyone.',
  needs: ['calendar'], hours: 'work', surfaces: ['hero', 'home', 'story-morning'], inPlace: ['schedule'],
  cooldown: { notFor: 30 },
  run(ctx) {
    if (!sgIsWorkDay(ctx.work, ctx.now.date)) return [];
    const gaps = sgFreeStretches(ctx, ctx.now.date);
    const g = gaps.find(x => x.lead) || gaps.find(x => x.best);
    if (!g || g.minutes < SG_GAP_MIN || sgOwnBlockSoon(ctx, 30)) return [];
    const c = sgFreeSlotCard(ctx, g);
    return c ? [c] : [];
  },
});
