// The README shot list (see tools/docs-capture.mjs). Each entry: { name, run }. Names are the files in docs/media/.
export function shots(d) {
  const { still, record, open, go, click, type, key, ev, sleep, drag } = d;
  const S = [];
  const add = (name, run) => S.push({ name, run });
  const settle = (ms = 700) => sleep(ms);
  const MAIN = { x: 248, y: 0, w: 1192, h: 900 };   // the page without the sidebar

  // Money sections: wait until the bank data has loaded (an empty page says "Bring in your transactions")
  const fin = (sec) => async () => {
    for (let i = 0; i < 8; i++) {
      await ev(`FinanceView.setSection(${JSON.stringify(sec)})`); await settle(1500);
      if (!(await ev(`/Bring in your transactions/.test(document.querySelector('main.main').innerText)`))) return;
      await settle(1500);
    }
  };

  // ---------- Home and planning
  add('home-today', () => still('home-today', 'home'));
  add('home-today-dark', () => still('home-today-dark', 'home', { theme: 'dark' }));
  add('home-plan-week', () => still('home-plan-week', 'home', { prep: async () => { await click('text=Plan my week'); await settle(1500); } }));
  add('home-week-review', () => still('home-week-review', 'home:week'));
  add('home-board', async () => {
    await open('home'); await ev('homeResetLayout()'); await sleep(1200);
    const frameRect = (id, part = '') => ev(`(() => { const e = document.querySelector('.hg-w[data-wid=${id}] ${part}'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
    await record('home-board', async (r) => {
      await click('#tb-home-customise', { wait: 900 });
      await ev(`(() => { const m = document.querySelector('main.main'); const w = document.querySelector('.hg-w[data-wid=week]'); m.scrollTop += w.getBoundingClientRect().top - 190; })()`);
      await r.hold(700);
      const h = await frameRect('week', '.hg-rs-e');
      await drag({ x: h.x + h.w / 2, y: h.y + h.h / 2 }, { x: h.x + h.w / 2 - 190, y: h.y + h.h / 2 }, 16);
      await r.hold(900);
      const k = await frameRect('waiting', '.hg-rs-se');
      await drag({ x: k.x + k.w / 2, y: k.y + k.h / 2 }, { x: k.x + k.w / 2, y: k.y + k.h / 2 - 90 }, 14);
      await r.hold(900);
    }, { fps: 8, maxSeconds: 8, crop: MAIN, scale: 0.75 });
    await ev('homeResetLayout()'); await sleep(600);
  });

  // ---------- Tasks and calendar
  add('tasks-all', () => still('tasks-all', 'all'));
  add('task-card', () => still('task-card', 'today', { prep: async () => { await click('.task .t-title'); await settle(1500); } }));
  add('calendar-week', () => still('calendar-week', 'calendar:week'));
  add('calendar-month', () => still('calendar-month', 'calendar:month'));
  add('quick-add', async () => {
    await open('today'); await sleep(800);
    await record('quick-add', async (r) => {
      await key('q'); await r.hold(700);
      await type('Send Priya the pricing page fri 3pm #work !p1 ~1h', 85);
      await r.hold(1400);
      await key('Enter'); await r.hold(1200);
    }, { fps: 8, maxSeconds: 8, crop: MAIN, scale: 0.75 });
  });
  add('palette', async () => {
    await open('home'); await sleep(800);
    await record('palette', async (r) => {
      await key('k', 2); await r.hold(900);
      await type('money', 120); await r.hold(900);
      await key('ArrowDown'); await r.hold(500);
      await key('ArrowDown'); await r.hold(900);
    }, { fps: 8, maxSeconds: 7, crop: { x: 240, y: 0, w: 960, h: 600 }, scale: 0.8 });
  });

  // ---------- Money
  add('money-overview', () => still('money-overview', 'finance', { prep: fin('board') }));
  add('money-overview-dark', () => still('money-overview-dark', 'finance', { theme: 'dark', prep: fin('board') }));
  add('money-spending', () => still('money-spending', 'finance', { prep: fin('categories') }));
  add('money-budgets', () => still('money-budgets', 'finance', { prep: async () => { await fin('budgets')(); await click('text=Suggest from history', { wait: 2000 }); await click('text=Save budgets', { wait: 2000 }); await ev(`document.querySelector('main.main').scrollTop = 0`); await settle(800); } }));
  add('money-brief', () => still('money-brief', 'finance', { prep: fin('overview') }));
  add('money-story', async () => {
    await open('finance'); await sleep(800); await fin('overview')();
    await record('money-story', async (r) => {
      await click('text=Play story', { wait: 600 });
      await r.hold(5800);
    }, { fps: 6, maxSeconds: 7, crop: { x: 0, y: 0, w: 1440, h: 900 }, scale: 0.6 });
    await key('Escape');
  });
  add('expenses', () => still('expenses', 'expenses'));
  add('expense-report', () => still('expense-report', 'expenses', { prep: async () => { await click('text=Make expense report'); await settle(1800); } }));

  // ---------- Assistant (a made-up conversation: nothing is sent to Claude)
  add('assistant', () => still('assistant', 'home', { prep: async () => {
    await ev(`(() => { const t = Date.now(); const L = chatList('assistant'); L.length = 0;
      L.push({ id: 'dm1', role: 'user', text: 'What is due this week, and what could I move?', ts: t - 60000 });
      L.push({ id: 'dm2', role: 'assistant', text: 'You have **13 tasks due** over the next seven days. Friday is the heaviest, with four things and the client workshop.\\n\\n- Prepare client workshop slides (Fri)\\n- Interview candidate notes (Fri)\\n- Draft Q4 roadmap (Tue)\\n\\nIf you move *Interview candidate notes* to Monday, Friday drops to about six hours. Want me to propose that?', ts: t - 50000 });
      L.push({ id: 'dm3', role: 'user', text: 'Yes, and add a reminder to chase Priya about the sign-off.', ts: t - 30000 });
      L.push({ id: 'dm4', role: 'assistant', text: 'Here is what I would change. Nothing happens until you press Apply, and every change can be undone.', ts: t - 20000 });
      openAssistant(); })()`);
    await settle(1800); } }));

  // ---------- Life
  add('friends', () => still('friends', 'friends'));
  // Music (2.26): a friend's card with their music and the songs they sent; the song picker. The sandbox's Spotify is a stand-in
  // that answers with invented music (the seed gives the demo friends invented ids), so no real artist or cover is ever shown.
  add('music-friends', () => still('music-friends', 'friends', { prep: async () => { await click('text=Sam Rivera', { wait: 1500 }); await ev("(() => { const m = document.querySelector('main.main'); if (m) m.scrollTop = 230; })()"); await sleep(500); } }));
  add('music-picker', () => still('music-picker', 'friends', { prep: async () => { await ev('musicSendDialog()'); await sleep(900); await type('paper', 70); await sleep(1600); } }));
  add('together', async () => {   // run once per sandbox: it makes a space
    await open('together'); await sleep(1500);
    await record('together', async (r) => {
      await click('text=Groceries', { wait: 700 });
      await click('text=Priya Nair', { fx: 0.1, wait: 350 });
      await click('text=Sam Rivera', { fx: 0.1, wait: 350 });
      await click('text=Make it', { wait: 1500 });
      await click('input[placeholder^="Add to the list"]', { wait: 300 });
      await type('Oat milk', 60); await key('Enter');
      await type('Tomatoes for Sunday', 60); await key('Enter');
      await r.hold(900);
    }, { fps: 6, maxSeconds: 8, crop: MAIN, scale: 0.75 });
  });
  add('garden', () => still('garden', 'garden', { prep: async () => { try { await click('text=Skip tour', { wait: 700 }); } catch (e) { /* no tour */ } } }));
  add('pets', () => still('pets', 'pet', { prep: async () => { try { await click('.pt-adopt-card', { wait: 2500 }); await go('pet', 2500); } catch (e) { /* already adopted */ } } }));
  add('pet-treat', async () => {
    await open('pet'); await sleep(2500);
    await record('pet-treat', async (r) => {
      await r.hold(700);
      await click('text=Give a pat', { wait: 1100 });
      await click('text=Give a treat', { wait: 1500 });
      await click('text=Do it', { wait: 2200 });
      await r.hold(700);
    }, { fps: 8, maxSeconds: 8, crop: MAIN, scale: 0.75 });
  });
  add('garden-tour', async () => {
    await open('garden'); await sleep(1500);
    try { await click('text=Skip tour', { wait: 600 }); } catch (e) { /* no tour */ }
    await record('garden-tour', async (r) => {
      await r.hold(900);
      for (const v of ['garden:shop', 'garden:almanac', 'garden:basket', 'garden']) { await ev(`setView(${JSON.stringify(v)})`); await r.hold(1300); }
    }, { fps: 6, maxSeconds: 8, crop: MAIN, scale: 0.75 });
  });
  add('wardrobe', () => still('wardrobe', 'profile:avatar'));
  add('achievements', () => still('achievements', 'game'));
  add('memories', () => still('memories', 'memories'));
  add('places', () => still('places', 'locations'));
  add('whats-new', () => still('whats-new', 'home', { prep: async () => { await ev('whatsNewTour()'); await settle(2200); } }));

  // ---------- Settings
  add('settings-sync', () => still('settings-sync', 'settings:sync'));
  add('settings-relay', () => still('settings-relay', 'settings:relay', { prep: async () => { try { await click('text=More', { wait: 700 }); } catch (e) { /* folded already */ } } }));
  add('settings-server', () => still('settings-server', 'settings:server'));
  return S;
}
