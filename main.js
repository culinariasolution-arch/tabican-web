/* ==========================================================
   TABIAN · efectos de la web
   Base: lo mismo que la web actual (funciona sin GSAP).
   Si GSAP carga, <html> lleva la clase "fx" y se activan:
     1) Portada: el muro se levanta hilada a hilada y el titular entra
     2) Portada: al bajar, el texto sube y se desvanece (scrub)
     3) Obras: las galerías aparecen de abajo arriba, por hiladas
     4) Obra con volumetría: la imagen del proyecto se acerca al pasar
   ========================================================== */
(() => {
  const fx = document.documentElement.classList.contains('fx');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Línea bajo la cabecera al hacer scroll
  const header = document.getElementById('header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Entrada de portada sin GSAP (la de siempre)
  if (!fx) {
    document.querySelectorAll('.hero .reveal').forEach((el, i) => {
      el.style.transitionDelay = (0.15 + i * 0.12) + 's';
    });
    requestAnimationFrame(() => document.body.classList.add('loaded'));
  }

  // Contadores
  const runCount = el => {
    const to = +el.dataset.to, dur = reduce ? 0 : 1400, t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / (dur || 1));
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const counters = document.querySelectorAll('.count');
  if (!fx) setTimeout(() => counters.forEach(runCount), 900);

  // Aparición al hacer scroll
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.on-scroll').forEach((el, i) => {
    el.style.transitionDelay = (el.classList.contains('brick-card') ? (i % 2) * 0.12 : 0) + 's';
    io.observe(el);
  });

  // Franja: avanza sola y se acelera / cambia de sentido con el scroll
  const track = document.getElementById('marquee');
  if (track) {
    let x = 0, lastY = window.scrollY, vel = 0;
    const tick = () => {
      const y = window.scrollY, dy = y - lastY; lastY = y;
      vel += (dy - vel) * 0.15;
      const speed = reduce ? 0 : 0.6 + vel * 0.9;
      const half = track.scrollWidth / 2;
      x -= speed;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x}px,0,0)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Ladrillos: caen al llegar y giran levemente al seguir bajando
  const arts = document.querySelectorAll('.brick-art');
  const dropIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('dropped'); dropIO.unobserve(e.target); }
  }), { threshold: 0.45 });
  arts.forEach(a => dropIO.observe(a));
  if (!reduce) {
    const tilt = () => {
      const vh = window.innerHeight;
      arts.forEach(a => {
        const r = a.getBoundingClientRect();
        const p = (r.top + r.height / 2) / vh;
        if (p > -0.2 && p < 1.2) a.style.setProperty('--tilt', ((0.5 - p) * 10).toFixed(2) + 'deg');
      });
    };
    window.addEventListener('scroll', () => requestAnimationFrame(tilt), { passive: true });
    tilt();
  }

  // Titulares que se construyen palabra a palabra
  document.querySelectorAll('h2.build').forEach(h2 => {
    let i = 0;
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi';
            wi.style.transitionDelay = (i++ * 0.09) + 's';
            wi.textContent = part; w.appendChild(wi); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(h2);
    new IntersectionObserver((es, o) => es.forEach(e => {
      if (e.isIntersecting) { h2.classList.add('built'); o.disconnect(); }
    }), { threshold: 0.4 }).observe(h2);
  });

  // Visor de fotos
  (() => {
    const lb = document.getElementById('lightbox');
    const img = lb.querySelector('img'), cap = lb.querySelector('.lb-cap');
    let list = [], idx = 0;
    const show = i => {
      idx = (i + list.length) % list.length;
      const b = list[idx];
      img.src = b.dataset.full; img.alt = b.querySelector('img').alt; cap.textContent = img.alt;
    };
    document.querySelectorAll('.obra-galeria').forEach(g => {
      const btns = [...g.querySelectorAll('.obra-foto')];
      btns.forEach((b, i) => b.addEventListener('click', () => {
        list = btns; show(i); lb.hidden = false; document.body.style.overflow = 'hidden';
      }));
    });
    const close = () => { lb.hidden = true; document.body.style.overflow = ''; };
    lb.querySelector('.lb-close').onclick = close;
    lb.querySelector('.lb-prev').onclick = e => { e.stopPropagation(); show(idx - 1); };
    lb.querySelector('.lb-next').onclick = e => { e.stopPropagation(); show(idx + 1); };
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  })();

  // Sin GSAP: parallax suave de la foto de portada (como la web actual)
  const bg = document.querySelector('.hero-bg img');
  if (!fx && !reduce) window.addEventListener('scroll', () => {
    bg.style.transform = `translateY(${window.scrollY * 0.25}px) scale(1.08)`;
  }, { passive: true });

  if (!fx) return;

  /* ================= EFECTOS GSAP ================= */
  gsap.registerPlugin(ScrollTrigger);
  bg.style.animation = 'none';

  // 1) Portada: el muro se levanta hilada a hilada, de abajo arriba,
  //    cada hilada se retira hacia un lado alternando, como se colocan.
  const rows = [...document.querySelectorAll('.courses i')].reverse();
  rows.forEach((r, i) => gsap.set(r, { transformOrigin: i % 2 ? 'left center' : 'right center' }));

  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro
    .fromTo(bg, { scale: 1.18 }, { scale: 1.08, duration: 2.6, ease: 'power2.out' }, 0)
    .to(rows, { scaleX: 0, duration: .55, ease: 'power2.inOut', stagger: .09 }, .1)
    .from('.hero-kicker', { y: 20, opacity: 0, duration: .6 }, .35)
    .from('.hero-title .ln > span', { yPercent: 110, duration: .9, stagger: .12 }, .45)
    .from(['.hero-lead', '.hero-actions', '.rea-badge'], { y: 24, opacity: 0, duration: .7, stagger: .1 }, 1.0)
    .from('.hero-stats .stat', { y: 30, opacity: 0, duration: .6, stagger: .08 }, 1.2)
    .add(() => counters.forEach(runCount), 1.3)
    .add(() => document.querySelector('.courses').remove());

  // 2) Portada: al bajar, la foto se queda atrás y el texto sube y se apaga
  gsap.to(bg, {
    yPercent: 14, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('.hero-content', {
    y: -80, opacity: .15, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  // 3) Galerías de obra: aparecen de abajo arriba a saltos, como hiladas
  document.querySelectorAll('.obra-galeria').forEach(g => {
    gsap.fromTo(g,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'steps(7)',
        scrollTrigger: { trigger: g, start: 'top 82%', once: true } });
  });

  // 4) Volumetría del proyecto en curso: se acerca al pasar por ella
  const proj = document.querySelector('.foto-proyecto img');
  if (proj) gsap.fromTo(proj, { scale: .9 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: proj, start: 'top bottom', end: 'center center', scrub: true }
  });

  // Recalcular posiciones cuando terminen de cargar fuentes e imágenes
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
