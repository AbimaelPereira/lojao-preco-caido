(() => {
  'use strict';
  const PAGE = 40;
  const $ = (s) => document.querySelector(s);
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  const LOJAS = { ml: 'Mercado Livre', shopee: 'Shopee' };
  const ARROW = '<svg aria-hidden="true" width="10" height="12" viewBox="0 0 10 12"><path d="M5 1v9M1.5 6.5L5 10l3.5-3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const el = { grid: $('#grid'), rail: $('#rail'), hot: $('#hot'), chips: $('#chips'), q: $('#q'), seg: $('#seg'), sort: $('#sort'), more: $('#more'), empty: $('#empty'), count: $('#count'), updated: $('#updated'), toast: $('#toast'), bar: $('#bar') };

  const p = new URLSearchParams(location.search);
  const state = { cat: p.get('cat') || '', q: p.get('q') || '', loja: p.get('loja') || '', sort: p.get('sort') || 'desconto', shown: PAGE };
  if (!['desconto', 'preco', 'recentes'].includes(state.sort)) state.sort = 'desconto';
  if (!LOJAS[state.loja]) state.loja = '';
  let all = [], cats = [];

  const getJSON = (url) => fetch(url, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((d) => (Array.isArray(d) ? d : [])).catch(() => []);

  // skeleton
  el.grid.innerHTML = '<div class="sk"><i></i><i></i><i></i><i></i></div>'.repeat(10);

  const clean = (x) => {
    if (!x || !x.link || !x.titulo || num(x.preco) == null) return null;
    return { ...x, preco_pix: num(x.preco_pix), preco_antigo: num(x.preco_antigo), desconto: num(x.desconto), atualizado: num(x.atualizado) || 0, _n: norm(x.titulo) };
  };
  const heroPrice = (x) => x.preco_pix ?? x.preco;

  function card(x, eager) {
    const pix = x.preco_pix != null;
    const badge = x.desconto ? `<span class="badge" aria-label="${x.desconto}% de desconto${pix ? ' no Pix' : ''}">${ARROW}-${x.desconto}%${pix ? '<em>no Pix</em>' : ''}</span>` : '';
    const old = x.preco_antigo ? `<s class="old"><span class="sr">De </span>${brl.format(x.preco_antigo)}</s>` : '<span class="old"></span>';
    const coupon = x.cupom ? `<button type="button" class="coupon" data-cupom="${esc(x.cupom)}">Cupom: <b>${esc(x.cupom)}</b> <span aria-hidden="true">⧉</span></button>` : '';
    return `<a class="card" href="${esc(x.link)}" target="_blank" rel="noopener sponsored">
      <div class="card-img">${badge}<img src="${esc(x.img)}" alt="" width="300" height="300" loading="${eager ? 'eager' : 'lazy'}" decoding="async" referrerpolicy="no-referrer"></div>
      <div class="card-body">
        ${old}
        <div class="price">${brl.format(heroPrice(x))}${pix ? '<small>no Pix</small>' : ''}</div>
        ${pix ? `<div class="alt">ou ${brl.format(x.preco)} no cartão</div>` : ''}
        <p class="title">${esc(x.titulo)}</p>
        <div class="meta"><span class="store">${LOJAS[x.loja] || esc(x.loja)}</span>${coupon}</div>
      </div></a>`;
  }

  function filtered() {
    const terms = norm(state.q).trim().split(/\s+/).filter(Boolean);
    const list = all.filter((x) =>
      (!state.cat || String(x.categoria_id) === state.cat) &&
      (!state.loja || x.loja === state.loja) &&
      terms.every((t) => x._n.includes(t)));
    const s = {
      desconto: (a, b) => (b.desconto || 0) - (a.desconto || 0),
      preco: (a, b) => heroPrice(a) - heroPrice(b),
      recentes: (a, b) => b.atualizado - a.atualizado,
    }[state.sort];
    return list.sort(s);
  }

  function syncURL() {
    const u = new URLSearchParams();
    if (state.cat) u.set('cat', state.cat);
    if (state.q.trim()) u.set('q', state.q.trim());
    if (state.loja) u.set('loja', state.loja);
    if (state.sort !== 'desconto') u.set('sort', state.sort);
    const qs = u.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  function renderChips() {
    const n = {};
    all.forEach((x) => { if (x.categoria_id != null) n[x.categoria_id] = (n[x.categoria_id] || 0) + 1; });
    const used = cats.filter((c) => n[c.id]).sort((a, b) => n[b.id] - n[a.id]);
    if (state.cat && !used.some((c) => String(c.id) === state.cat)) state.cat = '';
    el.chips.innerHTML = [`<button type="button" class="chip" data-cat="">Todas <small>${all.length}</small></button>`]
      .concat(used.map((c) => `<button type="button" class="chip" data-cat="${c.id}">${esc(c.name)} <small>${n[c.id]}</small></button>`)).join('');
    markChips();
  }
  function markChips() {
    el.chips.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.cat === state.cat));
    const on = el.chips.querySelector('[aria-pressed="true"]');
    if (on) el.chips.scrollTo({ left: on.offsetLeft - 14, behavior: 'smooth' });
  }

  function renderHot() {
    const top = all.filter((x) => x.desconto).sort((a, b) => b.desconto - a.desconto).slice(0, 10);
    el.hot.hidden = top.length === 0;
    el.rail.innerHTML = top.map((x, i) => card(x, i < 3)).join('');
  }

  function render() {
    const list = filtered();
    el.count.textContent = list.length ? `· ${list.length}` : '';
    el.grid.innerHTML = list.slice(0, state.shown).map((x) => card(x)).join('');
    el.empty.hidden = list.length > 0;
    el.more.hidden = list.length <= state.shown;
    el.seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', b.dataset.loja === state.loja));
    syncURL();
  }
  const update = () => { state.shown = PAGE; render(); };

  function ago(ts) {
    if (!ts) return '';
    const m = Math.max(0, Math.round((Date.now() / 1000 - ts) / 60));
    if (m < 60) return m <= 1 ? 'Atualizado agora' : `Atualizado há ${m} min`;
    const h = Math.round(m / 60);
    if (h < 48) return `Atualizado há ${h} ${h === 1 ? 'hora' : 'horas'}`;
    return `Atualizado há ${Math.round(h / 24)} dias`;
  }

  // eventos
  el.q.value = state.q;
  el.sort.value = state.sort;
  let t;
  el.q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = el.q.value; update(); }, 150); });
  el.q.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.q.blur(); });
  el.chips.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; state.cat = b.dataset.cat; markChips(); update(); });
  el.seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.loja = b.dataset.loja; update(); });
  el.sort.addEventListener('change', () => { state.sort = el.sort.value; update(); });
  el.more.addEventListener('click', () => { state.shown += PAGE; render(); });
  $('#reset').addEventListener('click', () => { Object.assign(state, { cat: '', q: '', loja: '' }); el.q.value = ''; markChips(); update(); });

  let toastT;
  const toast = (msg) => { el.toast.textContent = msg; el.toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.toast.classList.remove('on'), 1600); };
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('.coupon');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    try { await navigator.clipboard.writeText(b.dataset.cupom); b.classList.add('ok'); b.lastElementChild.textContent = '✓'; toast('Copiado!'); }
    catch { toast('Cupom: ' + b.dataset.cupom); }
  });

  new IntersectionObserver(([en]) => el.bar.classList.toggle('stuck', !en.isIntersecting)).observe($('.top'));

  Promise.all([getJSON('./data/produtos-ml.json'), getJSON('./data/produtos-shopee.json'), getJSON('./data/categories.json')])
    .then(([ml, sh, c]) => {
      const seen = new Set();
      all = ml.concat(sh).map(clean).filter((x) => x && !seen.has(x.id) && seen.add(x.id));
      cats = c.filter((x) => x && x.id != null && x.name);
      const maxD = Math.max(0, ...all.map((x) => x.desconto || 0));
      $('#stats').innerHTML = all.length ? `<b>${all.length}</b> ofertas no ar${maxD ? ` · quedas de até <b class="o">${maxD}%</b>` : ''}` : '';
      el.updated.textContent = ago(Math.max(0, ...all.map((x) => x.atualizado)));
      renderChips(); renderHot(); render();
    });
})();
