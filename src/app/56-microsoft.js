/* Microsoft: kept names for older callers. Microsoft is now one kind of
   ACCOUNT (56-accounts.js, docs/dev/ACCOUNTS.md): any number of personal and
   work accounts, added with "+ Add Microsoft account". No client ID to paste:
   only the Advanced fold of that flow mentions one. */
function microsoftConnectionCard() { return accountsCompactCard(); }
function microsoftSignIn() { accAdd('microsoft'); }
function microsoftConnectionSetup() { accAdd('microsoft'); }
window.addEventListener('focus', () => { if (state.view === 'connections' || (typeof _obOpen !== 'undefined' && _obOpen)) connRefresh({ force: true }); });
