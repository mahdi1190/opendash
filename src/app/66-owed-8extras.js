/* ============================================================
   OWED TO ME, the small delights: quiet notes worked out from your own splits (lib/owed.mjs insightsOf), each dismissed for good
   with one tap, and a settle-up card for the end of a trip that you can send as a picture. Nothing here sends anything by itself.
   ============================================================ */
function _owHints(d) {
  const list = (d.insights && d.insights.hints) || [];
  return list.slice(0, 2).map((h) => {
    const c = _xe('div', 'owd-offer owd-hintline');
    const first = (k) => esc(owdFirstName(owdPersonName(k)));
    const names = h.keys ? h.keys.map(first) : [];
    const who = names.length > 2 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names.join(' and ');
    let text = '', ic = 'lightbulb', action = null;
    if (h.kind === 'group') {
      const all = names.length > 1 ? `You, ${who}` : `You and ${who}`;
      text = h.day ? `${all} split something most ${esc(h.day)}s. Make a group?` : `${all} often split things. Make a group?`;
      ic = 'users';
      action = { label: 'Make a group', run: async () => {
        const name = await promptDialog({ title: 'Name this group', label: 'Name', value: '', placeholder: h.day ? `e.g. ${h.day} lot` : 'e.g. Pub lot', confirmLabel: 'Make it' });
        if (!name) return;
        await owdDo('/group', { name, keys: h.keys }, { done: `“${name}” is ready when you split something`, icon: 'users', what: 'make that group' });
        owdDismissHint(h);
      } };
    } else if (h.kind === 'fair') {
      text = `You’ve paid the last ${h.count} times you and ${who} shared something. Their turn next?`;
      ic = 'handshake';
    } else if (h.kind === 'faster') {
      text = `${who} paid you back in ${h.days === 1 ? 'a day' : `${h.days} days`}, faster than usual.`;
      ic = 'party-popper';
    }
    c.innerHTML = `${icon(ic, 'i-sm')}<span class="owd-offer-t">${text}</span>`;
    if (action) c.appendChild(uiButton({ label: action.label, size: 'sm', run: action.run }));
    c.appendChild(uiButton({ icon: 'x', size: 'sm', kind: 'ghost', tip: 'Don’t show this again', run: () => owdDismissHint(h) }));
    return c;
  });
}
function owdDismissHint(h) {
  if (OWD.data && OWD.data.insights) OWD.data.insights.hints = OWD.data.insights.hints.filter(x => x.id !== h.id);
  owdRepaint();
  return owdApi('/offer', { offer: { k: h.id } }).then(owdSet).catch(() => {});
}

/* ---------- the settle-up card, as a picture ---------- */
/** Draws the card. Only what the trip says: who pays whom. -> a canvas. */
function owdTripCanvas(tr) {
  const moves = tr.moves.slice(0, 12), W = 1080, H = Math.max(620, 380 + moves.length * 92);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const font = (px, w) => `${w || 500} ${px}px Inter, "Segoe UI", system-ui, sans-serif`;
  const fit = (s, px, w, max) => { x.font = font(px, w); let t = String(s); if (x.measureText(t).width <= max) return t; while (t.length > 1 && x.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#5b5bd6'); g.addColorStop(1, '#2f9e8f');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // A few soft circles: confetti for having sorted it out.
  for (const [cx, cy, r, a] of [[W - 90, 90, 130, 0.14], [120, H - 60, 170, 0.10], [W - 220, H - 110, 70, 0.12], [80, 60, 44, 0.16]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = `rgba(255,255,255,${a})`; x.fill(); }
  const pad = 60, cardY = 200;
  x.fillStyle = '#fff'; x.font = font(30, 500); x.globalAlpha = 0.85; x.fillText('Settling up', pad + 8, 92); x.globalAlpha = 1;
  x.font = font(58, 700); x.fillText(fit(tr.name, 58, 700, W - pad * 2 - 16), pad + 8, 158);
  x.fillStyle = '#ffffff';
  const r = 28, ch = H - cardY - 80;
  x.beginPath(); x.moveTo(pad + r, cardY); x.arcTo(W - pad, cardY, W - pad, cardY + ch, r); x.arcTo(W - pad, cardY + ch, pad, cardY + ch, r); x.arcTo(pad, cardY + ch, pad, cardY, r); x.arcTo(pad, cardY, W - pad, cardY, r); x.closePath(); x.fill();
  let y = cardY + 74;
  x.fillStyle = '#6b6f76'; x.font = font(30, 500); x.fillText(`${tr.count} payment${tr.count === 1 ? '' : 's'}, ${owdMoney(tr.total)} in all`, pad + 40, y);
  y += 30;
  if (!moves.length) { x.fillStyle = '#1b1c1f'; x.font = font(44, 650); x.fillText('All square. Nobody owes anybody.', pad + 40, y + 70); }
  for (const m of moves) {
    y += 32;
    x.strokeStyle = '#eceef1'; x.lineWidth = 2; x.beginPath(); x.moveTo(pad + 40, y - 14); x.lineTo(W - pad - 40, y - 14); x.stroke();
    y += 34;
    const amount = owdMoney(m.amount);
    x.font = font(42, 700); const aw = x.measureText(amount).width;
    x.fillStyle = '#1b1c1f'; x.fillText(amount, W - pad - 40 - aw, y + 6);
    x.font = font(38, 550);
    const who = fit(`${m.fromName}  →  ${m.toName}`, 38, 550, W - pad * 2 - 110 - aw);
    x.fillText(who, pad + 40, y + 6);
    y += 26;
  }
  x.fillStyle = '#fff'; x.globalAlpha = 0.9; x.font = font(26, 500); x.fillText('Made with Freeflo', pad + 8, H - 26); x.globalAlpha = 1;
  return c;
}
/** See it first, then copy, save or send it yourself. Hide amounts: nothing is drawn until you say so. */
function owdTripCardDialog(tr) {
  const name = `${String(tr.name).replace(/[^\w -]+/g, '').trim().replace(/\s+/g, '-') || 'settle-up'}.png`;
  let canvas = null, blob = null, hold;
  const draw = () => new Promise((res) => {
    canvas = owdTripCanvas(tr);
    canvas.toBlob((b) => { blob = b; res(b); }, 'image/png');
  });
  const paint = async () => {
    hold.innerHTML = '';
    if (typeof homeAmountsHidden === 'function' && homeAmountsHidden() && !canvas) {
      hold.appendChild(_xe('p', 'xp-fh', 'You’ve hidden amounts, and this picture shows them.'));
      hold.appendChild(uiButton({ label: 'Show it anyway', kind: 'primary', run: async () => { await draw(); paint(); } }));
      return;
    }
    if (!canvas) await draw();
    const im = document.createElement('img'); im.className = 'owd-tripcard'; im.alt = `Settling up for ${tr.name}`; im.src = canvas.toDataURL('image/png');
    hold.appendChild(im);
    const acts = _xe('div', 'owd-rc-acts');
    if (navigator.clipboard && window.ClipboardItem) acts.appendChild(uiButton({ label: 'Copy the picture', icon: 'copy', run: async () => { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast('Copied. Paste it into a message.', { icon: 'copy' }); } catch (e) { toast('That couldn’t be copied here. Save it instead.', { icon: 'info' }); } } }));
    acts.appendChild(uiButton({ label: 'Save the picture', icon: 'download', run: () => { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 20000); } }));
    try { const f = new File([blob], name, { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) acts.appendChild(uiButton({ label: 'Share…', icon: 'send', run: () => navigator.share({ files: [f] }).catch(() => {}) })); } catch (e) { /* no sharing here */ }
    hold.appendChild(acts);
    hold.appendChild(_xe('p', 'xp-fh', 'You choose who gets it. Freeflo doesn’t send it anywhere.'));
  };
  openDialog({ title: `Settle up: ${tr.name}`, size: 'md', className: 'owd-dlg', body(el) { hold = el; paint(); }, actions: [{ label: 'Done', primary: true }] });
}
