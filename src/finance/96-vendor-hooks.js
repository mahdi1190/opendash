  // @part 96-vendor-hooks.js · NEW (3 Oct 2026) · OWNER: C2 (test hook for the vendor logic in 25-vendor-kit.js; not an API for other modules)
  window.FinanceView._vendors = {
    VL, VK, merchantAgg,
    // Tests run without the page: hand in FinSymbols (src/app/67-fin-symbols.js) loaded on its own.
    useSymbols(fs) { window.FinSymbols = fs; if (R.model) R.model._vkGroups = null; },
  };
