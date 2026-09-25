/* game/hud.js — the page's own lettering beside the kit's mountHUD: the cash, the distance strip, the gauge row, the three cards, the
 * pay panel and the finish card, the pause menu, the first-run hint, sound effects sized by the book's five steps · design pass 4 §3.8
 * The DOM lives in index.html; this binds it. Sizes follow the style book (Bangers display, Comic Neue captions, Plex Mono numbers). */
import { LEVEL, HOUSE } from '../level/house.js';

const $ = id => document.getElementById(id);
const fmt$ = n => '$' + Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
export function mountGameHUD(kitHud, o) {
  const els = { cash: $('cash'), track: $('track'), now: $('now'), bestTick: $('bestTick'), labels: $('labels'), bestRead: $('bestRead'), cards: $('cards'), fill: $('fill'), lock: $('lock'), gaugeText: $('gaugeText'), capMark: $('capMark'), readout: $('readout'), panel: $('panel'), hint: $('hint'), pause: $('pause'), pauseBtn: $('pauseBtn'), fps: $('fps'), stepL: $('stepL'), stepR: $('stepR'), bottom: $('bottom'), roomName: $('roomName') };
  const counterEl = kitHud.root.querySelector('.c3d-n'), capEl = kitHud.root.querySelector('.c3d-cap'), nameB = kitHud.root.querySelector('.c3d-name b'), nameS = kitHud.root.querySelector('.c3d-name small');
  /* the strip: five segments in the rooms' hues sized to their lengths, the pool as a cyan notch */
  { const cps = LEVEL.checkpoints, L = LEVEL.length; const hue = k => HOUSE[LEVEL.hues[k]] || HOUSE.lawn; let prev = 0; const segs = [], labs = [];
    const rooms = cps.map((c, i) => ({ key: c.key === 'pond' ? 'backyard' : c.key, label: ['HALL', 'KITCHEN', 'PILATES', 'YARD'][i], to: c.at })).concat([{ key: 'yard2', label: '2ND YARD', to: L }]);
    for (const r of rooms) { const w = (r.to - prev) / L * 100; segs.push(`<div class="seg" style="width:${w.toFixed(2)}%;background:${hue(r.key)}"></div>`); labs.push(`<span style="width:${w.toFixed(2)}%">${r.label}</span>`); prev = r.to; }
    const pool = LEVEL.yard.pool.map(z => (LEVEL.launch.z - (LEVEL.place.backyard + z)) / L * 100);
    els.track.insertAdjacentHTML('afterbegin', segs.join('') + `<div class="pool" style="left:${Math.min(...pool).toFixed(2)}%;width:${Math.abs(pool[1] - pool[0]).toFixed(2)}%"></div>`); els.labels.innerHTML = labs.join(''); }
  const coarse = matchMedia('(pointer: coarse)').matches, small = () => innerWidth < 600;
  const api = {
    els,
    cash(n) { els.cash.textContent = fmt$(n); },
    counter(text) { counterEl.textContent = text; },
    caption(text) { capEl.textContent = text; },
    room(title, sub) { nameB.textContent = title; nameS.textContent = sub || ''; if (els.roomName) els.roomName.textContent = title; },
    strip(d, best) { els.now.style.left = (100 * Math.min(1, Math.max(0, d) / LEVEL.length)).toFixed(2) + '%';
      if (best && best.d > 0) { els.bestTick.hidden = false; els.bestTick.style.left = (100 * Math.min(1, best.d / LEVEL.length)).toFixed(2) + '%'; els.bestRead.textContent = `BEST ${best.d.toFixed(1)} m`; } else { els.bestTick.hidden = true; els.bestRead.textContent = `${LEVEL.length.toFixed(1)} m TO THE FENCE`; } },
    /** the gauge: the fill on the absolute 4–12 m/s scale, the locked tail hatched above the cap, the cap lettered */
    gauge(g) { const G = LEVEL.gauge, span = G.max - G.min; els.fill.style.width = (100 * (g.speed - G.min) / span).toFixed(1) + '%'; const capPct = 100 * (g.cap - G.min) / span;
      els.lock.style.left = capPct.toFixed(1) + '%'; els.lock.style.width = (100 - capPct).toFixed(1) + '%'; els.capMark.style.left = capPct.toFixed(1) + '%'; els.capMark.textContent = g.cap.toFixed(1); els.gaugeText.textContent = g.text; els.fill.classList.toggle('locked', !!g.locked); },
    readout(text) { els.readout.textContent = text; },
    /** the three cards; onBuy(key) */
    cards(list, onBuy) { els.cards.innerHTML = list.map(c => `<button type="button" class="card ${c.affordable ? 'can' : 'cant'} ${c.maxed ? 'maxed' : ''}" data-key="${c.key}" ${c.maxed || !c.affordable ? 'aria-disabled="true"' : ''}>
        <b>${c.title} <i>${c.level}</i></b><span class="num">${c.next}</span><span class="unlock">${c.maxed ? 'the arm as strong as it goes' : c.unlock}</span>
        <span class="price"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${STAR}"/></svg><span>${c.maxed ? 'MAX' : fmt$(c.price)}</span></span></button>`).join('');
      for (const b of els.cards.querySelectorAll('.card')) b.addEventListener('click', e => { e.preventDefault(); if (b.classList.contains('can')) onBuy(b.dataset.key); }); },
    showCards(on) { els.cards.classList.toggle('off', !on); },
    /** the centred yellow caption box: lines of html, or null to close */
    panel(html) { if (!html) { els.panel.hidden = true; els.panel.innerHTML = ''; return; } els.panel.innerHTML = html; els.panel.hidden = false; },
    hint(on) { els.hint.hidden = !on; },
    pause(open) { els.pause.hidden = !open; els.pauseBtn.setAttribute('aria-expanded', String(open)); },
    fps(text) { if (els.fps) els.fps.textContent = text; },
    /** a sound effect at a screen point, sized by the book's steps (1–5) */
    sfx(text, x, y, step = 3) { const e = document.createElement('div'); e.className = 'c3d-sfx'; e.textContent = text; const px = [36, 46, 58, 70, 84][Math.max(0, Math.min(4, step - 1))] * (small() ? 0.72 : 1);
      e.style.fontSize = px + 'px'; e.style.left = Math.max(40, Math.min(innerWidth - 40, x)) + 'px'; e.style.top = Math.max(60, Math.min(innerHeight - 60, y)) + 'px'; e.style.webkitTextStroke = (step >= 4 ? 3 : 2) + 'px var(--c3d-ink)'; kitHud.root.appendChild(e); setTimeout(() => e.remove(), 750); },
    hide(h) { document.body.classList.toggle('hide', h); kitHud.hide(h); },
    coarse, small,
  };
  return api;
}
const STAR = (() => { const pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 40 : 50; pts.push((50 + Math.cos(a) * r).toFixed(1) + ',' + (50 + Math.sin(a) * r).toFixed(1)); } return pts.join(' '); })();
