/* Compile drawing styles once. Texture preparation reads a small immutable
 * selector index instead of repeatedly serializing the browser's CSS rules. */
window.GardenTextureStyles = (function () {
  'use strict';
  function requirements(selector) {
    if (selector.includes('\\')) return [[]];
    const branches = [[]]; let round = 0, square = 0, quote = '';
    for (let i = 0; i < selector.length; i++) {
      const c = selector[i];
      if (quote) { if (c === quote && selector[i - 1] !== '\\') quote = ''; continue; }
      if (c === '"' || c === "'") { quote = c; continue; }
      if (c === '[') { square++; continue; } if (c === ']') { square--; continue; }
      if (square) continue;
      if (c === '(') { round++; continue; } if (c === ')') { round--; continue; }
      if (round) continue;
      if (c === ',') { branches.push([]); continue; }
      if (c === '.') { const found = /^[-_a-zA-Z][-_a-zA-Z0-9]*/.exec(selector.slice(i + 1)); if (found) { branches[branches.length - 1].push(found[0]); i += found[0].length; } }
    }
    return branches;
  }
  function compile(css) {
    const sheet = new CSSStyleSheet(); sheet.replaceSync(css);
    function index(rules) {
      const nodes = [];
      for (const rule of rules) {
        const text = rule.cssText;
        if (rule.selectorText) nodes.push({ text, branches: requirements(rule.selectorText) });
        else if (rule.cssRules && !rule.name) nodes.push({ prefix: text.slice(0, text.indexOf('{') + 1), children: index(rule.cssRules) });
        else nodes.push({ text });
      }
      return nodes;
    }
    const nodes = index(sheet.cssRules), cache = new Map();
    const stats = { sourceBytes: css.length, hits: 0, misses: 0, selectedBytes: 0, maxSelectedBytes: 0 };
    function select(list, present) {
      let out = '';
      for (const node of list) {
        if (node.children) { const inner = select(node.children, present); if (inner) out += node.prefix + inner + '}\n'; }
        else if (!node.branches || node.branches.some(branch => branch.every(name => present.has(name)))) out += node.text + '\n';
      }
      return out;
    }
    function forDrawing(clone, ancestors) {
      const present = new Set(String(ancestors || '').split(/\s+/).filter(Boolean));
      for (const node of [clone, ...clone.querySelectorAll('[class]')]) for (const name of node.classList) present.add(name);
      const signature = [...present].sort().join('|');
      if (cache.has(signature)) { stats.hits++; const value = cache.get(signature); cache.delete(signature); cache.set(signature, value); return value; }
      const value = select(nodes, present); stats.misses++; stats.selectedBytes += value.length; stats.maxSelectedBytes = Math.max(stats.maxSelectedBytes, value.length);
      cache.set(signature, value); if (cache.size > 128) cache.delete(cache.keys().next().value);
      return value;
    }
    return Object.freeze({ forDrawing, stats });
  }
  return Object.freeze({ compile });
})();
