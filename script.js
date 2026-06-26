// Auth helpers
const authKey = 'nylamysert_auth';
const getAuthData = () => {
  try {
    return JSON.parse(localStorage.getItem(authKey)) || null;
  } catch (e) {
    return null;
  }
};
const authData = getAuthData();
window.nyAuthData = authData;

const setAuthData = user => {
  const payload = { loggedIn: true, name: user };
  localStorage.setItem(authKey, JSON.stringify(payload));
  window.nyAuthData = payload;
};

const clearAuthData = () => {
  localStorage.removeItem(authKey);
  window.nyAuthData = null;
};

const renderAuthNav = () => {
  const navInner = document.querySelector('.nav-inner');
  if (!navInner) return;
  const existing = navInner.querySelector('.auth-link-wrapper');
  if (existing) existing.remove();
  const wrapper = document.createElement('div');
  wrapper.className = 'auth-link-wrapper';
  if (authData?.loggedIn) {
    wrapper.innerHTML = `<span class="nav-user">Halo, ${authData.name}</span><button type="button" class="auth-button logout-button">Logout</button>`;
    wrapper.querySelector('.logout-button')?.addEventListener('click', () => {
      clearAuthData();
      window.location.href = 'index.html';
    });
  } else {
    wrapper.innerHTML = `<a class="auth-button login-button" href="login.html">Login</a>`;
  }
  navInner.appendChild(wrapper);
};

renderAuthNav();

// Toggle mobile menu
const btn = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
if (btn && nav) {
  btn.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

// Form submit feedback
const orderForm = document.querySelector('.order-form');
if (orderForm) {
  const statusMessage = document.createElement('p');
  statusMessage.className = 'order-status';
  orderForm.appendChild(statusMessage);

  orderForm.addEventListener('submit', event => {
    event.preventDefault();
    const service = orderForm.querySelector('input[name="service"]:checked').value;
    const name = orderForm.querySelector('input[name="name"]').value.trim();
    statusMessage.textContent = `Terima kasih ${name || 'customer'}! Pesanan ${service === 'dine-in' ? 'dine in' : 'pick up'} sedang diproses.`;
    orderForm.reset();
  });
}

// Cart for menu page
const menuPage = document.querySelector('.menu-layout');
if (menuPage) {
  if (!authData?.loggedIn) {
    menuPage.innerHTML = `<div class="login-required"><h2>Login untuk memesan</h2><p>Silakan masuk terlebih dahulu agar Anda dapat melihat menu dan menambahkan pesanan ke keranjang.</p><a class="auth-button" href="login.html">Masuk</a></div>`;
    const viewCartBtn = document.querySelector('.view-cart-btn');
    if (viewCartBtn) viewCartBtn.style.display = 'none';
  } else {
    const cartItems = menuPage.querySelector('.cart-items');
    const cartTotal = menuPage.querySelector('.cart-total');
    const cartName = menuPage.querySelector('.cart-name');
    const cartNote = menuPage.querySelector('.cart-note');
    const cartSubmit = menuPage.querySelector('.cart-submit');
    const cartMessage = menuPage.querySelector('.cart-message');
    const emptyMessage = menuPage.querySelector('.empty-cart');
    const cartPaymentSelect = menuPage.querySelector('.cart-payment');
    const items = Array.from(menuPage.querySelectorAll('.menu-item'));
    const basket = {};
    const viewCartBtn = document.querySelector('.view-cart-btn');
    const viewCartCount = viewCartBtn ? viewCartBtn.querySelector('.view-cart-count') : null;

    const formatRupiah = amount => `Rp${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

    const updateCart = () => {
      const selected = items.filter(item => basket[item.dataset.name] > 0);
      cartItems.innerHTML = '';
      let total = 0;
      let totalCount = 0;
      if (selected.length === 0) {
        emptyMessage.style.display = 'block';
        cartTotal.textContent = 'Total: Rp0';
        if (viewCartCount) viewCartCount.textContent = '0';
        return;
      }
      emptyMessage.style.display = 'none';
      selected.forEach(item => {
        const name = item.dataset.name;
        const price = Number(item.dataset.price);
        const qty = basket[name] || 0;
        const subtotal = price * qty;
        total += subtotal;
        totalCount += qty;
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `<div><strong>${name}</strong> x${qty}</div><div>${formatRupiah(subtotal)}</div>`;
        cartItems.appendChild(row);
      });
      cartTotal.textContent = `Total: ${formatRupiah(total)}`;
      if (viewCartCount) viewCartCount.textContent = String(totalCount);
    };

    const setQty = (item, count) => {
      const name = item.dataset.name;
      basket[name] = Math.max(0, count);
      item.querySelector('.qty-count').textContent = basket[name];
      updateCart();
    };

    items.forEach(item => {
      const name = item.dataset.name;
      basket[name] = 0;
      const removeBtn = item.querySelector('.qty-remove');
      const addBtn = item.querySelector('.qty-add');
      addBtn.addEventListener('click', () => setQty(item, basket[name] + 1));
      removeBtn.addEventListener('click', () => setQty(item, basket[name] - 1));
    });

    cartSubmit.addEventListener('click', () => {
      const name = cartName.value.trim();
      const ordered = Object.entries(basket).filter(([_, qty]) => qty > 0);
      if (ordered.length === 0) {
        cartMessage.textContent = 'Silakan tambahkan minimal satu menu ke keranjang.';
        cartMessage.style.color = '#cc3300';
        return;
      }
      if (!name) {
        cartMessage.textContent = 'Tolong isi nama pemesan sebelum memesan.';
        cartMessage.style.color = '#cc3300';
        return;
      }
      const service = menuPage.querySelector('input[name="service"]:checked')?.value || 'dine-in';
      const payment = cartPaymentSelect ? cartPaymentSelect.value : 'cash';
      cartMessage.style.color = '#1f5e37';
      cartMessage.textContent = `Terima kasih ${name}! Pesanan (${ordered.map(o=>o[0]+ ' x'+o[1]).join(', ')}) untuk ${service === 'dine-in' ? 'Dine In' : 'Pick Up'} — metode pembayaran: ${payment}. Kami akan siapkan segera.`;
      // save to local history
      try {
        const history = JSON.parse(localStorage.getItem('cyaasert_history') || '[]');
        const entry = {
          name, service, payment,
          items: ordered.map(([n, q]) => ({name: n, qty: q})),
          note: cartNote.value.trim(),
          time: Date.now()
        };
        history.push(entry);
        localStorage.setItem('cyaasert_history', JSON.stringify(history));
      } catch (e) { console.error('History save failed', e); }
      items.forEach(item => setQty(item, 0));
      cartName.value = '';
      cartNote.value = '';
      if (cartPaymentSelect) cartPaymentSelect.selectedIndex = 0;
      // close mobile cart overlay if open
      menuPage.classList.remove('cart-open');
    });
    updateCart();

    if (viewCartBtn) {
      viewCartBtn.addEventListener('click', () => {
        menuPage.classList.toggle('cart-open');
      });
      // also close cart when clicking outside the cart on mobile
      document.addEventListener('click', e => {
        if (!menuPage.classList.contains('cart-open')) return;
        const target = e.target;
        if (target === viewCartBtn || menuPage.contains(target) || target.closest('.view-cart-btn')) return;
        menuPage.classList.remove('cart-open');
      });
    }
  }
}

// History page
const historyList = document.querySelector('.history-list');
if (historyList) {
  const clearBtn = document.querySelector('.clear-history');
  const renderHistory = () => {
    const data = JSON.parse(localStorage.getItem('cyaasert_history') || '[]');
    historyList.innerHTML = '';
    if (!data || data.length === 0) {
      historyList.innerHTML = '<p class="history-empty">Belum ada riwayat pesanan.</p>';
      return;
    }
    data.slice().reverse().forEach(entry => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `<h4>${entry.name} — ${entry.service} — ${entry.payment}</h4><div class="history-meta">${new Date(entry.time).toLocaleString()}</div><div>${entry.items.map(i=>`${i.name} x${i.qty}`).join(', ')}</div><div style="margin-top:0.5rem;color:#444">Catatan: ${entry.note||'-'}</div>`;
      historyList.appendChild(item);
    });
  };

  if (!authData?.loggedIn) {
    historyList.innerHTML = `<div class="login-required"><h2>Login untuk melihat riwayat</h2><p>Silakan masuk agar Anda dapat melihat pesanan sebelumnya.</p><a class="auth-button" href="login.html">Masuk</a></div>`;
    if (clearBtn) clearBtn.style.display = 'none';
  } else {
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Hapus semua riwayat?')) {
          localStorage.removeItem('cyaasert_history');
          renderHistory();
        }
      });
    }
    renderHistory();
  }
}
