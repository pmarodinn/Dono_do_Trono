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
     CARRINHO DE COMPRAS
  ---------------------------------------------------------- */
  function initCart() {
    // State
    let cart = JSON.parse(localStorage.getItem('ddt_cart') || '[]');

    // DOM refs
    const badge       = $('#cart-badge');
    const iconBtn     = $('#cart-icon-btn');
    const drawer      = $('#cart-drawer');
    const overlay     = $('#cart-overlay');
    const closeBtn    = $('#cart-drawer-close');
    const itemsWrap   = $('#cart-items');
    const emptyMsg    = $('#cart-empty');
    const footer      = $('#cart-footer');
    const totalEl     = $('#cart-total');
    const checkoutBtn = $('#cart-checkout-btn');

    if (!drawer || !overlay) return;

    // ---- Helpers ----
    function saveCart() {
      localStorage.setItem('ddt_cart', JSON.stringify(cart));
    }

    function formatBRL(v) {
      return 'R$\u00a0' + v.toFixed(2).replace('.', ',');
    }

    function getTotal() {
      return cart.reduce((sum, item) => sum + item.preco * item.qty, 0);
    }

    function getTotalQty() {
      return cart.reduce((sum, item) => sum + item.qty, 0);
    }

    // ---- Render ----
    function render() {
      const totalQty = getTotalQty();

      // Badge
      if (totalQty > 0) {
        badge.textContent = totalQty;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }

      // Empty state
      if (cart.length === 0) {
        emptyMsg.style.display = 'flex';
        footer.style.display = 'none';
        itemsWrap.innerHTML = '';
        return;
      }

      emptyMsg.style.display = 'none';
      footer.style.display = 'block';
      totalEl.textContent = formatBRL(getTotal());

      itemsWrap.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.img}" alt="${item.nome}" class="cart-item-img" />
          <div class="cart-item-info">
            <div class="cart-item-nome">${item.nome}</div>
            <div class="cart-item-preco">${formatBRL(item.preco * item.qty)}</div>
            <div class="cart-item-controls">
              <button type="button" class="cart-qty-btn cart-qty-minus" data-id="${item.id}" aria-label="Diminuir">−</button>
              <span class="cart-qty-num">${item.qty}</span>
              <button type="button" class="cart-qty-btn cart-qty-plus" data-id="${item.id}" aria-label="Aumentar">+</button>
            </div>
            <button type="button" class="cart-item-remove" data-id="${item.id}">Remover</button>
          </div>
        </div>
      `).join('');
    }

    // ---- Cart actions ----
    function addItem(id, nome, preco, img, yampi) {
      const existing = cart.find(item => item.id === id);
      if (existing) {
        existing.qty++;
      } else {
        cart.push({ id, nome, preco: parseFloat(preco), img, yampi, qty: 1 });
      }
      saveCart();
      render();
    }

    function removeItem(id) {
      cart = cart.filter(item => item.id !== id);
      saveCart();
      render();
    }

    function changeQty(id, delta) {
      const item = cart.find(i => i.id === id);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) {
        removeItem(id);
        return;
      }
      saveCart();
      render();
    }

    // ---- Drawer open/close ----
    function openDrawer() {
      drawer.classList.add('aberto');
      overlay.classList.add('aberto');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawer.classList.remove('aberto');
      overlay.classList.remove('aberto');
      document.body.style.overflow = '';
    }

    iconBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('aberto')) closeDrawer();
    });

    // ---- Event delegation for cart items ----
    itemsWrap.addEventListener('click', (e) => {
      const minusBtn = e.target.closest('.cart-qty-minus');
      if (minusBtn) { changeQty(minusBtn.dataset.id, -1); return; }

      const plusBtn = e.target.closest('.cart-qty-plus');
      if (plusBtn) { changeQty(plusBtn.dataset.id, 1); return; }

      const removeBtn = e.target.closest('.cart-item-remove');
      if (removeBtn) { removeItem(removeBtn.dataset.id); return; }
    });

    // ---- Add-to-cart buttons ----
    $$('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id, nome, preco, img, yampi } = btn.dataset;
        addItem(id, nome, preco, img, yampi);

        // Visual feedback
        const originalText = btn.textContent;
        btn.textContent = '✅ Adicionado!';
        btn.classList.add('adicionado');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('adicionado');
        }, 1500);

        // Open drawer briefly
        openDrawer();

        // Meta Pixel
        if (typeof fbq === 'function') {
          fbq('track', 'AddToCart', {
            content_name: nome,
            value: parseFloat(preco),
            currency: 'BRL'
          });
        }
      });
    });

    // ---- Checkout — Yampi multi-product URL ----
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return;

        // Fire Meta Pixel custom event para redirecionamento
        if (typeof fbq === 'function') {
          fbq('trackCustom', 'RedirecionamentoCheckout', {
            content_name: cart.map(i => i.nome).join(', '),
          value: getTotal(),
          currency: 'BRL',
          num_items: getTotalQty()
        });
      }

      // Domínio do checkout Yampi
      const dominioCheckout = 'https://dono-do-trono.pay.yampi.com.br';

      // Extrair token de cada link Yampi (última parte após /r/)
      // e montar formato TOKEN:QTD,TOKEN:QTD
      const itensFormatados = cart.map(item => {
        const token = item.yampi.split('/r/').pop();
        return token + ':' + item.qty;
      });

      const urlFinal = dominioCheckout + '/r/' + itensFormatados.join(',');

      window.open(urlFinal, '_blank');
      closeDrawer();
    });

    // Initial render from localStorage
    render();
  }

  /* ----------------------------------------------------------
     POPUP ASSINATURA — aviso carrinho + clube separados
  ---------------------------------------------------------- */
  function initAssinaturaPopup() {
    const assinaturaLink = $('#assinatura-link');
    if (!assinaturaLink) return;

    const popupOverlay = $('#popup-assinatura-overlay');
    const popup        = $('#popup-assinatura');
    const btnContinuar = $('#popup-btn-continuar');
    const btnCancelar  = $('#popup-btn-cancelar');
    const btnClose     = $('#popup-assinatura-close');

    if (!popup || !popupOverlay) return;

    function hasCartItems() {
      const cart = JSON.parse(localStorage.getItem('ddt_cart') || '[]');
      return cart.length > 0;
    }

    function showPopup() {
      popupOverlay.style.display = 'block';
      popup.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }

    function hidePopup() {
      popupOverlay.style.display = 'none';
      popup.style.display = 'none';
      document.body.style.overflow = '';
    }

    function proceedToAsaas(e) {
      hidePopup();

      // Fire original Asaas tracking (reuse the existing logic)
      const planName = assinaturaLink.dataset.plan || 'Clube do Trono';
      const valor = parseFloat(assinaturaLink.dataset.valor) || 25.90;

      const params = new URLSearchParams();
      params.set('utm_source', 'meta');
      params.set('utm_medium', 'paid');
      params.set('utm_campaign', 'assinatura');

      const urlParams = new URLSearchParams(window.location.search);
      const fbclid = urlParams.get('fbclid');
      if (fbclid) params.set('fbclid', fbclid);

      const fbCookieMatch = document.cookie.match(/(?:^|; )_fbp=([^;]+)/);
      if (fbCookieMatch && fbCookieMatch[1]) params.set('_fbp', decodeURIComponent(fbCookieMatch[1]));

      params.set('content_name', planName);
      params.set('value', valor.toString());
      params.set('currency', 'BRL');

        const base = assinaturaLink.getAttribute('href');
        const sep = base.includes('?') ? '&' : '?';
        const newUrl = base + sep + params.toString();

        if (typeof fbq === 'function') {
          fbq('trackCustom', 'RedirecionamentoCheckout', {
            content_name: planName,
          value: valor,
          currency: 'BRL'
        });
      }

      try {
        window.open(newUrl, '_blank');
      } catch (err) {
        window.location.href = newUrl;
      }
    }

    // Intercept click on Asaas link
    assinaturaLink.addEventListener('click', (e) => {
      e.preventDefault();

      if (hasCartItems()) {
        // Show warning popup
        showPopup();
      } else {
        // No cart items, go directly
        proceedToAsaas(e);
      }
    });

    // Popup button handlers
    btnContinuar.addEventListener('click', proceedToAsaas);
    btnCancelar.addEventListener('click', hidePopup);
    btnClose.addEventListener('click', hidePopup);
    popupOverlay.addEventListener('click', hidePopup);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popup.style.display === 'block') hidePopup();
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

    // Note: InitiateCheckout for Yampi avulsos and Asaas assinatura
    // are now handled by initCart() and initAssinaturaPopup() respectively
  }

  /* ----------------------------------------------------------
     URGENT COUNTDOWN BADGE
  ---------------------------------------------------------- */
  function initUrgentTimer() {
    const timerContainer = document.getElementById('urgent-timer');
    const timerMin = document.getElementById('timer-min');
    const timerSec = document.getElementById('timer-sec');

    if (!timerContainer || !timerMin || !timerSec) return;

    // Mostra o timer
    timerContainer.style.display = 'flex';

    let totalTime = 15 * 60; // 15 minutos em segundos

    // Se quiser salvar estado no localStorage pra parecer real:
    // let storedTime = localStorage.getItem('urgentTimer');
    // if (storedTime) totalTime = parseInt(storedTime);

    const updateTimer = () => {
      const minutes = Math.floor(totalTime / 60);
      const seconds = totalTime % 60;

      timerMin.textContent = minutes < 10 ? '0' + minutes : minutes;
      timerSec.textContent = seconds < 10 ? '0' + seconds : seconds;

      if (totalTime <= 0) {
        // Quando acabar, pode reiniciar ou esconder
        totalTime = 15 * 60; 
      } else {
        totalTime--;
        // localStorage.setItem('urgentTimer', totalTime);
      }
    };

    setInterval(updateTimer, 1000);
    updateTimer(); // Executa primeira vez sem delay
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
    initUrgentTimer();
    initCart();
    // initAssinaturaPopup(); // Desativado — Clube do Trono em breve
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
