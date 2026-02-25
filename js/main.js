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
     STICKY HEADER — sombra ao scrollar (sempre visível)
  ---------------------------------------------------------- */
  function initStickyHeader() {
    const header = $('#header');
    if (!header) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (window.scrollY > 10) {
            header.classList.add('scrolled');
          } else {
            header.classList.remove('scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     NAV DRAWER — Menu hambúrguer
  ---------------------------------------------------------- */
  function initNavDrawer() {
    const btnOpen   = $('#menu-hamburger');
    const btnClose  = $('#nav-drawer-close');
    const drawer    = $('#nav-drawer');
    const overlay   = $('#nav-overlay');
    if (!btnOpen || !drawer || !overlay) return;

    function abrirMenu() {
      drawer.classList.add('aberto');
      overlay.classList.add('aberto');
      btnOpen.classList.add('aberto');
      btnOpen.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function fecharMenu() {
      drawer.classList.remove('aberto');
      overlay.classList.remove('aberto');
      btnOpen.classList.remove('aberto');
      btnOpen.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    btnOpen.addEventListener('click', () => {
      const aberto = drawer.classList.contains('aberto');
      aberto ? fecharMenu() : abrirMenu();
    });

    if (btnClose) btnClose.addEventListener('click', fecharMenu);
    overlay.addEventListener('click', fecharMenu);

    // Fechar ao clicar num link do menu
    $$('.nav-drawer-links a').forEach(link => {
      link.addEventListener('click', fecharMenu);
    });

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('aberto')) {
        fecharMenu();
      }
    });
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
     META PIXEL — Eventos de conversão
  ---------------------------------------------------------- */
  function initMetaPixelEvents() {
    // ViewContent — quando a seção de oferta fica visível
    const oferta = $('#oferta');
    if (oferta && 'IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (typeof fbq === 'function') {
              fbq('track', 'ViewContent', {
                content_name: 'Dono do Trono — Planos',
                content_category: 'Lenços Umedecidos'
              });
            }
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      obs.observe(oferta);
    }

    // InitiateCheckout — clique em qualquer botão de compra (Yampi)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href*="yampi.com.br"]');
      if (!link) return;

      let plano = 'Dono do Trono';
      let valor = 0;

      if (link.href.includes('CZC43AMUF6')) { plano = 'Kit Test Drive'; valor = 39.90; }
      else if (link.href.includes('CGHK71GNMZ')) { plano = 'O Arsenal'; valor = 89.90; }
      else if (link.href.includes('MAXBYJGACO')) { plano = 'Clube do Trono'; valor = 71.90; }

      if (typeof fbq === 'function') {
        fbq('track', 'InitiateCheckout', {
          content_name: plano,
          value: valor,
          currency: 'BRL'
        });
      }
    });
  }

  /* ----------------------------------------------------------
     INIT
  ---------------------------------------------------------- */
  function init() {
    initStickyHeader();
    initNavDrawer();
    initFAQ();
    initScrollReveal();
    initSmoothScroll();
    initFormContato();
    initMetaPixelEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
