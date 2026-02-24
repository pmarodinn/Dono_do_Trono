/* ============================================================
   DONO DO TRONO — JS Principal
   Sticky Header | Pop-up Checkout | FAQ | Scroll Reveal
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     ESTADO GLOBAL
  ---------------------------------------------------------- */
  let planoSelecionado = {
    nome: 'O Arsenal',
    preco: 'R$ 89,90'
  };

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

          // Sombra sutil quando sai do topo
          if (cur > 10) {
            header.classList.add('scrolled');
          } else {
            header.classList.remove('scrolled');
          }

          // Esconde ao rolar para baixo (após 120px), mostra ao subir
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
     POP-UP / BOTTOM SHEET DE CHECKOUT
  ---------------------------------------------------------- */
  function initCheckout() {
    const overlay    = $('#checkout-overlay');
    const sheet      = $('.checkout-sheet');
    const nomeEl     = $('#checkout-plano-nome');
    const precoEl    = $('#checkout-plano-preco');

    if (!overlay) return;

    // Abre o checkout com o plano correto
    function abrirCheckout(nomePlano, preco) {
      if (nomeEl) nomeEl.textContent = nomePlano;
      if (precoEl) precoEl.textContent = preco;
      overlay.classList.add('ativo');
      document.body.style.overflow = 'hidden';
      // foca no primeiro input após a animação
      setTimeout(() => {
        const primeiro = $('input', sheet);
        if (primeiro) primeiro.focus();
      }, 360);
    }

    function fecharCheckout() {
      overlay.classList.remove('ativo');
      document.body.style.overflow = '';
    }

    // Delegação de eventos — qualquer botão com data-plano abre o checkout
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-plano]');
      if (btn) {
        e.preventDefault();
        const nomePlano = btn.dataset.plano || planoSelecionado.nome;
        const preco     = btn.dataset.preco || planoSelecionado.preco;
        abrirCheckout(nomePlano, preco);
        return;
      }

      // Fechar ao clicar no overlay
      if (e.target === overlay) fecharCheckout();

      // Botão de fechar explícito
      if (e.target.closest('#btn-fechar-checkout')) fecharCheckout();
    });

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') fecharCheckout();
    });

    // Swipe para baixo fecha o sheet (touch)
    let touchStartY = 0;
    sheet.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    sheet.addEventListener('touchend', (e) => {
      const delta = e.changedTouches[0].clientY - touchStartY;
      if (delta > 60) fecharCheckout(); // swipe down de 60px fecha
    }, { passive: true });

    // Submit do formulário
    const form = $('#form-checkout');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSubmitCheckout(form);
      });
    }
  }

  function handleSubmitCheckout(form) {
    const btn = $('[type="submit"]', form);
    if (!btn) return;

    // Feedback visual
    btn.disabled = true;
    btn.textContent = 'Processando...';

    // Coletar dados do formulário
    const formData = new FormData(form);
    const customerData = {
      name: formData.get('nome'),
      email: formData.get('email'),
      phone: formData.get('tel').replace(/\D/g, '')
    };

    // Determinar o ID do produto com base no nome do plano
    let productId = 'kit-test-drive'; // Default
    const planoNome = $('#checkout-plano-nome').textContent;
    if (planoNome.includes('Kit Test Drive')) productId = 'kit-test-drive';
    else if (planoNome.includes('O Arsenal')) productId = 'o-arsenal';
    else if (planoNome.includes('Clube do Trono')) productId = 'clube-do-trono';

    // URL do backend (Render production)
    const BACKEND_URL = 'https://dono-do-trono-api.onrender.com';

    fetch(`${BACKEND_URL}/api/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId: productId,
        customer: customerData
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        throw new Error(data.error);
      }
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error('URL de pagamento não encontrada');
      }
    })
    .catch(error => {
      console.error('Erro no checkout:', error);
      alert('Ocorreu um erro ao iniciar o pagamento. Por favor, tente novamente.');
      btn.disabled = false;
      btn.textContent = 'Ir para Pagamento Seguro';
    });
  }

  /* ----------------------------------------------------------
     MÁSCARA DE TELEFONE
  ---------------------------------------------------------- */
  function initMascarasFormulario() {
    const telInput = $('#input-tel');

    if (telInput) {
      telInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
        if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
        e.target.value = v;
      });
    }
  }

  /* ----------------------------------------------------------
     FAQ ACCORDION
  ---------------------------------------------------------- */
  function initFAQ() {
    $$('.faq-pergunta').forEach((pergunta) => {
      pergunta.addEventListener('click', () => {
        const item = pergunta.closest('.faq-item');
        const estaAberto = item.classList.contains('aberto');
        // Fecha todos
        $$('.faq-item').forEach(i => i.classList.remove('aberto'));
        // Abre o clicado (toggle)
        if (!estaAberto) item.classList.add('aberto');
      });
    });
  }

  /* ----------------------------------------------------------
     SCROLL REVEAL (IntersectionObserver)
  ---------------------------------------------------------- */
  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: mostra tudo
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
     FORMATAÇÃO CPF
  ---------------------------------------------------------- */
  function initMascaraCPF() {
    const cpf = $('#input-cpf');
    if (!cpf) return;
    cpf.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 9)      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
      else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
      else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, '$1.$2');
      e.target.value = v;
    });
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
      const offset = 64; // altura do header
      const top = alvo.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  /* ----------------------------------------------------------
     FORMULÁRIO DE CONTATO
  ---------------------------------------------------------- */
  function initFormContato() {
    const form = $('#form-contato');
    if (!form) return;

    const BACKEND_URL = 'https://dono-do-trono-api.onrender.com';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('[type="submit"]', form);
      const feedback = $('#contato-feedback');
      const textoOriginal = btn.textContent;

      btn.disabled = true;
      btn.textContent = 'Enviando...';
      if (feedback) { feedback.textContent = ''; feedback.className = 'contato-feedback'; }

      const dados = {
        nome: form.nome.value.trim(),
        email: form.email.value.trim(),
        mensagem: form.mensagem.value.trim(),
      };

      try {
        const res = await fetch(`${BACKEND_URL}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dados),
        });
        const data = await res.json();

        if (res.ok) {
          if (feedback) { feedback.textContent = '✅ Mensagem enviada com sucesso!'; feedback.classList.add('sucesso'); }
          form.reset();
        } else {
          throw new Error(data.error || 'Erro ao enviar');
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
    initCheckout();
    initMascarasFormulario();
    initMascaraCPF();
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
