/* Pinned game engine, included offline but evaluated only on first use. */
window.FreefloGameEngine = (function () {
  let loading = null, loadedAt = 0, loadMs = 0;
  const version = '4.2.1';
  function load() {
    if (window.Phaser && window.Phaser.VERSION === version) return Promise.resolve(window.Phaser);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      // Let the loading state paint before parsing the vendor bundle.
      setTimeout(() => {
        const started = performance.now();
        try {
          const source = document.getElementById('freeflo-game-engine');
          if (!source || source.dataset.version !== version) throw new Error('The game engine is missing. Rebuild or update Freeflo and try again.');
          const binary = atob(source.textContent.trim()), bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const script = document.createElement('script');
          script.dataset.freefloEngine = version;
          script.textContent = new TextDecoder().decode(bytes);
          try { document.head.appendChild(script); } finally { script.remove(); }
          if (!window.Phaser || window.Phaser.VERSION !== version) throw new Error('The game engine could not start in this browser.');
          loadedAt = Date.now(); loadMs = performance.now() - started;
          resolve(window.Phaser);
        } catch (e) { reject(e); }
      }, 0);
    }).catch(e => { loading = null; throw e; });
    return loading;
  }
  return Object.freeze({ version, load, status: () => ({ version, loaded: !!(window.Phaser && window.Phaser.VERSION === version), loadedAt, loadMs }) });
})();
