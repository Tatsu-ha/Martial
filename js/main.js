import { GameUI } from './ui.js';

function boot() {
  try {
    window.__ironLotus = new GameUI();
  } catch (err) {
    console.error(err);
    const pre = document.createElement('pre');
    pre.style.cssText = 'position:fixed;inset:20px;z-index:9999;background:#120e0b;color:#e7c67a;padding:20px;overflow:auto;font:12px monospace;border:1px solid #8a6424';
    pre.textContent = `IRON LOTUS failed to start:\n\n${err?.stack || err}`;
    document.body.appendChild(pre);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
