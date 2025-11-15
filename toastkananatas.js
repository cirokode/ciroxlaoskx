(function(){
  const css = `
    #toastContainerCustom{
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 10800;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
      opacity: 1;
    }
    #toastContainerCustom .toast {
      min-width: 220px;
      max-width: 320px;
      border-radius: 10px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
      font-size: 14px;
    }
    #toastContainerCustom .toast .toast-body {
      padding: .6rem .75rem;
    }
    /* make close button slightly smaller */
    #toastContainerCustom .btn-close {
      transform: scale(0.95);
    }
  `;
  const s = document.createElement('style');
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);

  // create toast container
  let container = document.getElementById('toastContainerCustom');
  if (!container){
    container = document.createElement('div');
    container.id = 'toastContainerCustom';
    document.body.appendChild(container);
  }

  // create toast element (reused)
  let toastEl = document.getElementById('lowAmountToastCustom');
  if (!toastEl){
    toastEl = document.createElement('div');
    toastEl.id = 'lowAmountToastCustom';
    toastEl.className = 'toast align-items-center';
    toastEl.setAttribute('role','alert');
    toastEl.setAttribute('aria-live','assertive');
    toastEl.setAttribute('aria-atomic','true');

    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          Jumlah transfer minimal <strong>Rp 1.000</strong>. Silakan masukkan jumlah yang lebih besar.
        </div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Tutup"></button>
      </div>
    `;
    container.appendChild(toastEl);
  }

  // bootstrap toast instance (create lazily)
  let bsToast = null;
  function getToastInstance(){
    if (!bsToast){
      bsToast = bootstrap.Toast.getOrCreateInstance(toastEl, { autohide: true, delay: 4000 });
    }
    return bsToast;
  }

  // utility already present: parseAmountValueRaw -> reuse
  // show toast (reusable)
  let lastShownFor = null; // remember last value shown to avoid spamming identical toast
  function showLowAmountToast(forValue){
    // avoid re-showing for same value repeatedly
    if (lastShownFor === forValue) return;
    lastShownFor = forValue;

    const t = getToastInstance();
    // reset (in case it's visible)
    t.hide();
    // slight delay to ensure hide finishes
    setTimeout(()=> t.show(), 50);

    // when toast hides, clear lastShownFor after small delay so user can see again later if needed
    toastEl.addEventListener('hidden.bs.toast', function _clearev(){
      // allow showing again for same amount after 800ms
      setTimeout(()=> { if (lastShownFor === forValue) lastShownFor = null; }, 800);
      toastEl.removeEventListener('hidden.bs.toast', _clearev);
    }, { once: true });
  }

  // hook to amount input
  const amountInput = document.getElementById('amount');
  if (!amountInput) {
    console.warn('Low-amount toast: #amount element not found.');
    return;
  }

  // only show on user interaction: input or blur (keeps it friendly)
  function checkAndMaybeShow(){
    const num = (function(str){ const digits = String(str).replace(/\D/g,''); return digits === '' ? 0 : parseInt(digits,10); })(amountInput.value);
    if (num > 0 && num < 1000){
      showLowAmountToast(num);
    }
  }

  // debounce to avoid too many triggers while typing
  let debTimer = null;
  amountInput.addEventListener('input', function(){
    clearTimeout(debTimer);
    debTimer = setTimeout(checkAndMaybeShow, 400);
    // Also validate form on every input
    try { if (typeof validateForm === 'function') validateForm(); } catch(e){}
  });

  // also check on blur (in case user pasted quickly)
  amountInput.addEventListener('blur', function(){
    checkAndMaybeShow();
    try { if (typeof validateForm === 'function') validateForm(); } catch(e){}
  });

  // expose function in case you want to call programmatically:
  window.showLowAmountToastIfNeeded = checkAndMaybeShow;
})();
