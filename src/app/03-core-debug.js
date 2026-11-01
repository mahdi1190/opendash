/* ============================================================
   PROBLEM BANNER (a page could not be drawn; text only, never HTML).
   Plain words and Reload up front; the technical text stays folded, to copy for whoever helps.
   ============================================================ */
function showDebug(title, body) {
  document.getElementById('debug-title').textContent = title;
  document.getElementById('debug-body').textContent = body;
  document.getElementById('debug-banner').classList.add('show');
  const reload = document.getElementById('debug-reload');
  if (reload) reload.onclick = () => location.reload();
  const copyBtn = document.getElementById('debug-copy');
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(`${title}\n\n${body}`).then(() => {
      copyBtn.textContent = '✓ copied';
      setTimeout(() => { copyBtn.textContent = 'Copy the details'; }, 1500);
    }, () => { copyBtn.textContent = 'Couldn’t copy: select the text above'; });
  };
}
