/* game/hud.js — the page's lettering beside the kit's mountHUD, cut to what design pass 6 keeps: the top-left slot (the personal best at rest,
 * the metres in flight), the cards with their cash tag, the pause button, the pay panel and the finish card, the pause menu, the first-run
 * hint, sound effects sized by the book's five steps. The kit's caption, name card and counter are hidden by the page's CSS. */
import { LEVEL } from '../level/house.js';

const $ = id => document.getElementById(id);
const fmt$ = n => '$' + Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
export function mountGameHUD(kitHud) {
  const els = { slot: $('slot'), cash: $('cashTag'), cards: $('cards'), panel: $('panel'), hint: $('hint'), pause: $('pause'), pauseBtn: $('pauseBtn'), fps: $('fps') };
  const small = () => innerWidth < 600;
  const api = {
    els,
    cash(n) { els.cash.textContent = fmt$(n); },
    /** the one top-left slot: 'rest' = the personal best in a stock tag; 'flight' = the metres in Bangers, magenta */
    slot(text, mode = 'rest') { els.slot.textContent = text; els.slot.className = 'slot ' + mode; },
    best(best) { api.slot(best && best.d > 0 ? `BEST ${best.d.toFixed(1)} m` : `${LEVEL.length.toFixed(1)} m TO THE FENCE`, 'rest'); },
    metres(d) { api.slot(`${Math.max(0, d).toFixed(1)} m`, 'flight'); },
    /** the three cards; onBuy(key) */
    cards(list, onBuy) { els.cards.innerHTML = list.map(c => `<button type="button" class="card ${c.affordable ? 'can' : 'cant'} ${c.maxed ? 'maxed' : ''}" data-key="${c.key}" ${c.maxed || !c.affordable ? 'aria-disabled="true"' : ''}>
        <b>${c.title} <i>${c.level}</i></b><span class="num">${c.next}</span><span class="unlock">${c.maxed ? 'the arm as strong as it goes' : c.unlock}</span>
        <span class="price"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${STAR}"/></svg><span>${c.maxed ? 'MAX' : fmt$(c.price)}</span></span></button>`).join('');
      for (const b of els.cards.querySelectorAll('.card')) b.addEventListener('click', e => { e.preventDefault(); if (b.classList.contains('can')) onBuy(b.dataset.key); }); },
    showCards(on) { els.cards.classList.toggle('off', !on); els.cash.classList.toggle('off', !on); },
    panel(html) { if (!html) { els.panel.hidden = true; els.panel.innerHTML = ''; return; } els.panel.innerHTML = html; els.panel.hidden = false; },
    hint(on) { els.hint.hidden = !on; },
    pause(open) { els.pause.hidden = !open; els.pauseBtn.setAttribute('aria-expanded', String(open)); },
    fps(text) { if (els.fps) els.fps.textContent = text; },
    sfx(text, x, y, step = 3) { const e = document.createElement('div'); e.className = 'c3d-sfx'; e.textContent = text; const px = [36, 46, 58, 70, 84][Math.max(0, Math.min(4, step - 1))] * (small() ? 0.72 : 1);
      e.style.fontSize = px + 'px'; e.style.left = Math.max(40, Math.min(innerWidth - 40, x)) + 'px'; e.style.top = Math.max(60, Math.min(innerHeight - 60, y)) + 'px'; e.style.webkitTextStroke = (step >= 4 ? 3 : 2) + 'px var(--c3d-ink)'; kitHud.root.appendChild(e); setTimeout(() => e.remove(), 750); },
    hide(h) { document.body.classList.toggle('hide', h); kitHud.hide(h); },
    small,
  };
  return api;
}
const STAR = (() => { const pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 40 : 50; pts.push((50 + Math.cos(a) * r).toFixed(1) + ',' + (50 + Math.sin(a) * r).toFixed(1)); } return pts.join(' '); })();
