/* game/hud.js — the page's lettering beside the kit's mountHUD, cut to what design pass 6 keeps: the top-left slot (the personal best at rest,
 * the metres in flight), the cards with their cash tag, the pause button, the pay panel and the finish card, the pause menu, the first-run
 * hint, sound effects sized by the book's five steps. Pass 7 adds the title card of a level and the level select (six stock cards in a strip).
 * The kit's caption, name card and counter are hidden by the page's CSS. */
import { unlocked, prevOf } from '../level/index.js';
import { dist } from './units.js';   // pass 10: feet on the page (?units=m for metres)

const $ = id => document.getElementById(id);
const fmt$ = n => '$' + Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function mountGameHUD(kitHud) {
  const els = { slot: $('slot'), cash: $('cashTag'), cards: $('cards'), panel: $('panel'), hint: $('hint'), pause: $('pause'), pauseBtn: $('pauseBtn'), fps: $('fps'), levels: $('levels'), strip: $('levelStrip'), title: $('title') };
  const small = () => innerWidth < 600;
  const api = {
    els,
    cash(n) { els.cash.textContent = fmt$(n); },
    /** the one top-left slot: 'rest' = the personal best in a stock tag; 'flight' = the metres in Bangers, magenta */
    slot(text, mode = 'rest') { els.slot.textContent = text; els.slot.className = 'slot ' + mode; },
    best(best, level) { api.slot(best && best.d > 0 ? `BEST ${dist(best.d)}` : `${dist(level.length)} ${level.toGo || 'TO THE FINISH'}`, 'rest'); },
    metres(d) { api.slot(dist(d), 'flight'); },
    /** the three cards; onBuy(key) */
    cards(list, onBuy) { els.cards.innerHTML = list.map(c => `<button type="button" class="card ${c.affordable ? 'can' : 'cant'} ${c.maxed ? 'maxed' : ''}" data-key="${c.key}" ${c.maxed || !c.affordable ? 'aria-disabled="true"' : ''}>
        <b>${c.title} <i>${c.level}</i></b><span class="num">${c.next}</span><span class="unlock">${c.maxed ? 'as strong as an arm gets' : esc(c.unlock)}</span>
        <span class="price"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${STAR}"/></svg><span>${c.maxed ? 'MAX' : fmt$(c.price)}</span></span></button>`).join('');
      for (const b of els.cards.querySelectorAll('.card')) b.addEventListener('click', e => { e.preventDefault(); if (b.classList.contains('can')) onBuy(b.dataset.key); }); },
    showCards(on) { els.cards.classList.toggle('off', !on); els.cash.classList.toggle('off', !on); },
    panel(html) { if (!html) { els.panel.hidden = true; els.panel.innerHTML = ''; return; } els.panel.innerHTML = html; els.panel.hidden = false; },
    hint(on) { els.hint.hidden = !on; },
    pause(open) { els.pause.hidden = !open; els.pauseBtn.setAttribute('aria-expanded', String(open)); },
    fps(text) { if (els.fps) els.fps.textContent = text; },
    /** the title card of a level: its number, its name, its tagline, the signature roundel */
    title(info, level, on) { if (!on) { els.title.hidden = true; return; } els.title.innerHTML = `<span class="n">LEVEL ${info.n}</span><b>${esc(info.title)}</b><span class="tag">${esc(level.tagline || '')}</span><span class="folio">${info.n}</span>`; els.title.hidden = false; },
    /** the level select: six stock cards in a strip; onPick(id) for an open level, a locked one shakes and says why */
    levels(list, sv, currentId, focusId, onPick) {
      els.strip.innerHTML = list.map(L => {
        const s = sv.levels && sv.levels[L.id], open = unlocked(L.id, sv), prev = prevOf(L.id);
        const st = !open ? 'locked' : !s || s.runs === 0 ? 'new' : s.finishes > 0 ? 'done' : 'played';
        const line = st === 'locked' ? `FINISH ${prev ? esc(prev.title) : 'THE LEVEL BEFORE'} FIRST` : st === 'new' ? 'NEW' : st === 'done' ? `IN ONE · ${s.runs} THROWS · BEST ${dist(s.best ? s.best.d : 0)}` : `BEST ${dist(s.best ? s.best.d : 0)} · ${s.runs} THROW${s.runs === 1 ? '' : 'S'}`;
        return `<button type="button" class="lvl ${st}${L.id === currentId ? ' current' : ''}" data-id="${L.id}" ${st === 'locked' ? 'aria-disabled="true"' : ''}><span class="n">LEVEL ${L.n}</span><b>${esc(L.title)}</b><span class="tag">${esc(L.tagline)}</span><span class="st">${line}</span></button>`;
      }).join('');
      for (const b of els.strip.querySelectorAll('.lvl')) b.addEventListener('click', e => { e.preventDefault(); if (b.classList.contains('locked')) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; } onPick(b.dataset.id); });
      const f = els.strip.querySelector(`[data-id="${focusId}"]`); if (f && f.scrollIntoView) { try { f.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (_) { } }
    },
    showLevels(on) { els.levels.hidden = !on; },
    sfx(text, x, y, step = 3) { const e = document.createElement('div'); e.className = 'c3d-sfx'; e.textContent = text; const px = [36, 46, 58, 70, 84][Math.max(0, Math.min(4, step - 1))] * (small() ? 0.72 : 1);
      e.style.fontSize = px + 'px'; e.style.left = Math.max(40, Math.min(innerWidth - 40, x)) + 'px'; e.style.top = Math.max(60, Math.min(innerHeight - 60, y)) + 'px'; e.style.webkitTextStroke = (step >= 4 ? 3 : 2) + 'px var(--c3d-ink)'; kitHud.root.appendChild(e); setTimeout(() => e.remove(), 750); },
    hide(h) { document.body.classList.toggle('hide', h); kitHud.hide(h); },
    small,
  };
  return api;
}
const STAR = (() => { const pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 40 : 50; pts.push((50 + Math.cos(a) * r).toFixed(1) + ',' + (50 + Math.sin(a) * r).toFixed(1)); } return pts.join(' '); })();
