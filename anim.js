// Animações de scroll. Sem dependências. Desliga tudo em prefers-reduced-motion.
(() => {
  const root = document.documentElement;
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // botão voltar ao topo (útil mesmo sem animação)
  const topo = document.createElement('button');
  topo.type = 'button'; topo.className = 'topo'; topo.textContent = '↑';
  topo.setAttribute('aria-label', 'Voltar ao topo');
  document.body.appendChild(topo);
  topo.addEventListener('click', () => {
    if (!calmo) { topo.classList.add('voa'); setTimeout(() => topo.classList.remove('voa'), 750); }
    scrollTo({ top: 0, behavior: calmo ? 'auto' : 'smooth' });
  });

  if (calmo || !('IntersectionObserver' in window)) {
    addEventListener('scroll', () => topo.classList.toggle('on', scrollY > 1200), { passive: true });
    return;
  }
  root.classList.add('fx');

  // revelar ao entrar na tela
  const io = new IntersectionObserver((ens) => {
    for (const en of ens) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  const prep = (box) => {
    if (!box) return;
    const cards = box.querySelectorAll('.card:not([data-fx])');
    let i = 0;
    cards.forEach((c) => {
      c.dataset.fx = 1;
      c.style.setProperty('--i', i++ % 4);
      c.style.setProperty('--tilt', (Math.random() * 14 - 7).toFixed(1) + 'deg');
      io.observe(c);
    });
  };
  for (const id of ['grid', 'rail']) {
    const box = document.getElementById(id);
    if (box) new MutationObserver(() => prep(box)).observe(box, { childList: true });
  }

  document.querySelectorAll('.sec').forEach((s) => {
    s.innerHTML = s.innerHTML.replace('🔥', '<span class="emo" aria-hidden="true">🔥</span>');
    io.observe(s);
  });
  document.querySelectorAll('.social li').forEach((li, i) => { li.style.setProperty('--i', i); io.observe(li); });
  const more = document.getElementById('more');
  if (more) io.observe(more);

  // contador do número de ofertas
  const stats = document.getElementById('stats');
  if (stats) {
    const mo = new MutationObserver(() => {
      const b = stats.querySelector('b'); if (!b) return;
      mo.disconnect();
      const fim = parseInt(b.textContent, 10); if (!fim) return;
      const t0 = performance.now(), dur = 1100;
      const passo = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        b.textContent = Math.round(fim * e).toLocaleString('pt-BR');
        if (k < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    });
    mo.observe(stats, { childList: true });
  }

  // título: separa as palavras para animar uma a uma
  const cl = document.querySelector('.claim');
  if (cl) {
    let n = 0;
    [...cl.childNodes].forEach((nd) => {
      if (nd.nodeType !== 3 || !nd.textContent.trim()) return;
      const fr = document.createDocumentFragment();
      nd.textContent.split(/(\s+)/).forEach((w) => {
        if (!w) return;
        if (/^\s+$/.test(w)) return fr.append(w);
        const sp = document.createElement('span'); sp.className = 'w'; sp.style.setProperty('--n', n++); sp.textContent = w; fr.append(sp);
      });
      nd.replaceWith(fr);
    });
  }

  // "despencou": tremidinha desregulada + loop de digitação trocando a palavra
  const fall = document.querySelector('.fall');
  if (fall) {
    const PALAVRAS = ['despencou', 'caiu', 'desabou', 'tombou', 'afundou', 'derreteu', 'desmoronou'];
    const mexe = (i) => {
      i.style.setProperty('--dur', (1.4 + Math.random() * 1.8).toFixed(2) + 's');
      i.style.setProperty('--del', (2.2 + Math.random() * 0.6).toFixed(2) + 's');
    };
    fall.querySelectorAll('i').forEach(mexe);
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    let w = 0;
    (async () => {
      await espera(5000);
      for (;;) {
        fall.classList.add('dig');
        while (fall.lastElementChild) { fall.lastElementChild.remove(); await espera(55); }
        w = (w + 1) % PALAVRAS.length;
        const nova = PALAVRAS[w];
        fall.setAttribute('aria-label', nova);
        await espera(220);
        for (const ch of nova) {
          const i = document.createElement('i'); i.className = 't'; i.textContent = ch; mexe(i);
          fall.append(i); await espera(85 + Math.random() * 60);
        }
        await espera(600);
        fall.classList.remove('dig');
        await espera(2600);
      }
    })();
  }

  // variáveis contínuas de scroll: progresso, queda do título, velocidade
  const claim = document.querySelector('.claim');
  let lastY = scrollY, vel = 0, sk = 0, pend = false;
  const tick = () => {
    pend = false;
    const y = scrollY, max = root.scrollHeight - innerHeight;
    vel = vel * 0.1 + (y - lastY) * 0.9; lastY = y;
    sk += (Math.max(-2, Math.min(2, vel * 0.06)) - sk) * 0.95;
    root.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    root.style.setProperty('--v', Math.max(-40, Math.min(40, vel * 1.5)).toFixed(1));
    root.style.setProperty('--sk', sk.toFixed(3));
    if (claim) claim.style.setProperty('--s', Math.min(1, y / 320).toFixed(3));
    topo.classList.toggle('on', y > 1200);
    if (Math.abs(sk) > 0.01 || Math.abs(vel) > 0.5) req();
  };
  const req = () => { if (!pend) { pend = true; requestAnimationFrame(tick); } };
  addEventListener('scroll', req, { passive: true });
  tick();
})();
