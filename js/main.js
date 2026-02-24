/* ============================================================
   DONO DO TRONO — JS Principal
   Sticky Header | FAQ | Scroll Reveal | Contato (Web3Forms)
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     UTILITÁRIOS
  ---------------------------------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ----------------------------------------------------------
     STICKY HEADER — esconde/mostra ao rolar + sombra ao scrollar
  ---------------------------------------------------------- */
  function initStickyHeader() {
    const header = $('#header');
    if (!header) return;

    let lastScroll = 0;
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const cur = window.scrollY;

          if (cur > 10) {
            header.classList.add('scrolled');
          } else {
            header.classList.remove('scrolled');
          }

          if (cur > 120 && cur > lastScroll) {
            header.style.transform = 'translateY(-100%)';
          } else {
            header.style.transform = 'translateY(0)';
          }

          lastScroll = cur;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     FAQ ACCORDION
  ---------------------------------------------------------- */
  function initFAQ() {
    $$('.faq-pergunta').forEach((pergunta) => {
      pergunta.addEventListener('click', () => {
        const item = pergunta.closest('.faq-item');
        const estaAberto = item.classList.contains('aberto');
        $$('.faq-item').forEach(i => i.classList.remove('aberto'));
        if (!estaAberto) item.classList.add('aberto');
      });
    });
  }

  /* ----------------------------------------------------------
     SCROLL REVEAL (IntersectionObserver)
  ---------------------------------------------------------- */
  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(el => el.classList.add('visivel'));
      return;
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visivel');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    $$('.reveal').forEach(el => obs.observe(el));
  }

  /* ----------------------------------------------------------
     SMOOTH SCROLL para âncoras internas
  ---------------------------------------------------------- */
  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const alvo = $(link.getAttribute('href'));
      if (!alvo) return;
      e.preventDefault();
      const offset = 64;
      const top = alvo.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  /* ----------------------------------------------------------
     FORMULÁRIO DE CONTATO — Web3Forms (sem backend)
  ---------------------------------------------------------- */
  function initFormContato() {
    const form = $('#form-contato');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('[type="submit"]', form);
      const feedback = $('#contato-feedback');
      const textoOriginal = btn.textContent;

      btn.disabled = true;
      btn.textContent = 'Enviando...';
      if (feedback) { feedback.textContent = ''; feedback.className = 'contato-feedback'; }

      const formData = new FormData(form);
      formData.append('access_key', ''); // ← Preencher com a chave Web3Forms
      formData.append('subject', 'Nova mensagem — Dono do Trono');
      formData.append('from_name', 'Site Dono do Trono');

      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          if (feedback) { feedback.textContent = '✅ Mensagem enviada com sucesso!'; feedback.classList.add('sucesso'); }
          form.reset();
        } else {
          throw new Error(data.message || 'Erro ao enviar');
        }
      } catch (err) {
        console.error('Erro no contato:', err);
        if (feedback) { feedback.textContent = '❌ Erro ao enviar. Tente novamente.'; feedback.classList.add('erro'); }
      } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
      }
    });
  }

  /* ----------------------------------------------------------
     INIT
  ---------------------------------------------------------- */
  function init() {
    initStickyHeader();
    initFAQ();
    initScrollReveal();
    initSmoothScroll();
    initFormContato();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
