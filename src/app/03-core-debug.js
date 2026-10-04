/* ============================================================
   DEBUG BANNER (render errors and diagnostics; text only, never HTML)
   ============================================================ */
function showDebug(title, body) {
  document.getElementById('debug-title').textContent = title;
  document.getElementById('debug-body').textContent = body;
  document.getElementById('debug-banner').classList.add('show');
  const copyBtn = document.getElementById('debug-copy');
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(`${title}\n\n${body}`).then(() => {
      copyBtn.textContent = '✓ copied';
      setTimeout(() => { copyBtn.textContent = 'Copy to clipboard'; }, 1500);
    });
  };
}
