    // ============================
    // Toast system
    // ============================
    function createToast(title, message, type){
      const container = document.getElementById('toast-container');
      if(!container) return;
      const id = 'toast-' + Date.now() + Math.floor(Math.random()*1000);
      const wrapper = document.createElement('div');
      wrapper.className = 'bs-toast shadow-sm';
      wrapper.id = id;
      let toastClass = 'toast-info';
      if(type === 'success') toastClass = 'toast-success';
      else if(type === 'danger') toastClass = 'toast-danger';
      else if(type === 'warning') toastClass = 'toast-warning';
      wrapper.innerHTML = ''
        + '<div class="toast-inner">'
        +   '<div class="icon-wrap ' + toastClass + '">'
        +     '<div style="width:34px;height:34px;border-radius:6px;background:rgba(255,255,255,0.06);display:grid;place-items:center;">' + (type==='success'? '✓' : (type==='danger'? '✕' : '!')) + '</div>'
        +   '</div>'
        +   '<div style="flex:1">'
        +     '<div class="body-title">' + escapeHtml(title) + '</div>'
        +     '<div class="body-text">' + escapeHtml(message) + '</div>'
        +   '</div>'
        +   '<button type="button" class="close-btn" aria-label="Close">&times;</button>'
        + '</div>';
      container.appendChild(wrapper);
      requestAnimationFrame(function(){ wrapper.classList.add('show-me'); });
      const closeBtn = wrapper.querySelector('.close-btn');
      closeBtn.addEventListener('click', function(){ removeToast(wrapper); });
      // small sound/tactile
      if(type === 'success') playSuccess();
      else if(type === 'danger') playError();
      else if(type === 'warning') playWarning();
      setTimeout(function(){ removeToast(wrapper); }, 3000);
      function removeToast(node){
        node.classList.remove('show-me');
        node.style.transform = 'translateX(18px)';
        node.style.opacity = '0';
        setTimeout(function(){ if(node && node.parentNode) node.parentNode.removeChild(node); }, 360);
      }
    }

    // ============================
    // Input handling
    // ============================
    document.addEventListener("input", function(e){
      if(e.target && e.target.id && e.target.id.toLowerCase().includes("amount")){
        let value = e.target.value.replace(/[^0-9]/g, "");
        if(value === ""){ e.target.value = ""; return; }
        e.target.value = new Intl.NumberFormat("id-ID").format(value);
      }
      if(e.target && e.target.id === 'username'){
        e.target.classList.remove('is-valid','is-invalid');
        window.foundMember = null;
      }
    });

    const emailInput = document.getElementById('username');
    const btnKirim = document.getElementById('btnKirim');

    btnKirim.addEventListener('click', function(){
      const email = (emailInput.value || '').trim();
      if(!email){
        createToast('Peringatan', 'Email wajib diisi!', 'warning');
        vibro(60);
        return;
      }
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(!validEmail){
        emailInput.classList.remove('is-valid');
        emailInput.classList.add('is-invalid');
        createToast('Peringatan', 'Pastikan mengisi email valid!', 'warning');
        playError();
        return;
      }
      if(String(email).toLowerCase() === String(emailPengirim || '').toLowerCase()){
        createToast('Peringatan', 'Kamu tidak dapat transfer ke dirimu sendiri!', 'danger');
        emailInput.classList.remove('is-valid');
        emailInput.classList.add('is-invalid');
        playError();
        return;
      }
      const amountNum = (function(){
        const v = document.getElementById('amount').value || '';
        const digits = String(v).replace(/[^0-9]/g,'');
        return parseInt(digits || '0',10);
      })();
      if(amountNum < MIN_TRANSFER){
        createToast('Peringatan', 'Minimal transfer adalah Rp' + new Intl.NumberFormat('id-ID').format(MIN_TRANSFER), 'warning');
        playError();
        return;
      }
      if(amountNum > saldoPengirimNumber){
        createToast('Peringatan', 'Saldo kamu tidak mencukupi!', 'danger');
        playError();
        return;
      }
      checkEmailOnSubmit(email);
    });

    // ============================
    // Cek email penerima (server)
    // ============================
    async function checkEmailOnSubmit(email){
      try{
        emailInput.setAttribute('disabled','true');
        emailInput.setAttribute('aria-busy','true');
        const url = API_BASE + '?email_penerima=' + encodeURIComponent(email);
        const resp = await fetch(url, { method: 'GET', mode: 'cors' });
        const data = await resp.json().catch(function(){ return {}; });
        let code = undefined;
        if(data && typeof data === 'object'){
          if('code' in data) code = data.code;
          else if(Array.isArray(data) && data.length && typeof data[0].code !== 'undefined') code = data[0].code;
        }
        if(code === 200){
          window.foundMember = data;
          emailInput.classList.remove('is-invalid');
          emailInput.classList.add('is-valid');
          showPinModal();
          return;
        }
        if(code === 404){
          emailInput.classList.remove('is-valid');
          emailInput.classList.add('is-invalid');
          createToast('Peringatan!', 'Pengguna tidak ditemukan!', 'danger');
          window.foundMember = null;
          playError();
          return;
        }
        if(code === 400){
          emailInput.classList.remove('is-valid');
          emailInput.classList.add('is-invalid');
          createToast('Peringatan!', 'Ada kesalahan di server kami.', 'danger');
          window.foundMember = null;
          playError();
          return;
        }
        emailInput.classList.remove('is-valid');
        emailInput.classList.add('is-invalid');
        createToast('Peringatan', 'Respons tidak dikenal dari server', 'danger');
        window.foundMember = null;
        playError();
      } catch(err){
        console.error(err);
        emailInput.classList.remove('is-valid');
        emailInput.classList.add('is-invalid');
        createToast('Peringatan', 'Gagal terhubung ke server', 'danger');
        window.foundMember = null;
        playError();
      } finally{
        emailInput.removeAttribute('disabled');
        emailInput.removeAttribute('aria-busy');
      }
    }

    // ============================
    // Audio & tactile helpers (WebAudio)
    // ============================
    let audioCtx = null;
    function ensureAudioContext(){
      try{
        if(!audioCtx){
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if(audioCtx && audioCtx.state === 'suspended' && audioCtx.resume){
          audioCtx.resume().catch(()=>{});
        }
      }catch(e){
        audioCtx = null;
      }
    }
    function vibro(ms = 50){
      try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){}
    }
    function playToneSpec(opts = {}) {
      try {
        ensureAudioContext();
        if(!audioCtx) return;
        const now = audioCtx.currentTime;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = opts.type || 'sine';
        o.frequency.value = opts.freq || 880;
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(audioCtx.destination);
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(opts.volume || 0.05, now + 0.008);
        o.start(now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + (opts.duration || 0.08));
        o.stop(now + (opts.duration || 0.08) + 0.02);
      } catch(e){}
    }
    function playClick(){ playToneSpec({freq:950, duration:0.06, type:'sine', volume:0.04}); }
    function playBack(){ playToneSpec({freq:450, duration:0.08, type:'sawtooth', volume:0.06}); }
    function playWarning(){ playToneSpec({freq:420, duration:0.08, type:'triangle', volume:0.04}); vibro(30); }
    function playError(){
      try{
        ensureAudioContext();
        if(!audioCtx) return;
        const now = audioCtx.currentTime;
        const o1 = audioCtx.createOscillator();
        const g1 = audioCtx.createGain();
        o1.type='sawtooth'; o1.frequency.value = 420;
        o1.connect(g1); g1.connect(audioCtx.destination);
        g1.gain.setValueAtTime(0.0001, now);
        g1.gain.linearRampToValueAtTime(0.06, now + 0.01);
        o1.start(now);
        g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        o1.frequency.exponentialRampToValueAtTime(180, now + 0.18);
        o1.stop(now + 0.20);
        vibro(70);
      }catch(e){}
    }
    function playOpenPin(){
      try{
        ensureAudioContext();
        if(!audioCtx) return;
        const now = audioCtx.currentTime;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type='sine'; o.frequency.value = 860;
        o.connect(g); g.connect(audioCtx.destination);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.06, now + 0.008);
        o.start(now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        o.stop(now + 0.18);
        setTimeout(()=> { playWhoosh(); }, 20);
      }catch(e){}
    }
    function playWhoosh(){
      try{
        ensureAudioContext();
        if(!audioCtx) return;
        const bufferSize = 2 * audioCtx.sampleRate;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const noiseGain = audioCtx.createGain();
        whiteNoise.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        noiseGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.01);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.36);
        whiteNoise.start();
        whiteNoise.stop(audioCtx.currentTime + 0.38);
      }catch(e){}
    }
    function playSuccess(){
      try{
        ensureAudioContext();
        if(!audioCtx) return;
        const now = audioCtx.currentTime;
        const o1 = audioCtx.createOscillator();
        const o2 = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o1.type='sine'; o1.frequency.value = 1080;
        o2.type='sine'; o2.frequency.value = 720;
        o1.connect(g); o2.connect(g); g.connect(audioCtx.destination);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.07, now + 0.006);
        o1.start(now); o2.start(now);
        o1.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
        o2.frequency.exponentialRampToValueAtTime(880, now + 0.14);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
        o1.stop(now + 0.38); o2.stop(now + 0.38);
        vibro(100);
      }catch(e){}
    }

    // unlock audio on first gesture
    document.addEventListener('click', function unlock(){ try{ ensureAudioContext(); if(audioCtx){ const b = audioCtx.createBuffer(1,1,audioCtx.sampleRate); const s = audioCtx.createBufferSource(); s.buffer = b; s.connect(audioCtx.destination); s.start(0); } }catch(e){} document.removeEventListener('click', unlock); });

    // ============================
    // PIN sheet handling
    // ============================
    const pinSheet = document.getElementById('pinSheet');
    const pinDots = Array.from(document.querySelectorAll('.pin-dot'));
    const pinButtons = Array.from(document.querySelectorAll('.pin-btn[data-key]'));
    const pinCancel = document.getElementById('pinCancel');
    const pinBack = document.getElementById('pinBack');
    const sheetHandle = document.getElementById('sheetHandle');

    let currentPin = '';
    let isDragging = false;
    let dragStartY = 0;
    let currentTranslateY = 0;
    const DRAG_THRESHOLD = 120;
    const MAX_DRAG = 800;

    function showPinModal(){
      currentPin = '';
      updatePinUI();
      pinSheet.classList.add('show');
      pinSheet.setAttribute('aria-hidden','false');
      pinSheet.style.transition = 'transform 220ms cubic-bezier(.2,.9,.3,1)';
      pinSheet.style.transform = 'translateY(0px)';
      currentTranslateY = 0;
      ensureAudioContext();
      // blur/dim page
      document.body.classList.add('page-blur-applied');
      addDimOverlay();
      playOpenPin();
      setTimeout(()=> { pinButtons[0]?.focus?.(); }, 220);
    }

    function hidePinModal(){
      pinSheet.classList.remove('show');
      pinSheet.setAttribute('aria-hidden','true');
      pinSheet.style.transform = '';
      removeDimOverlay();
      document.body.classList.remove('page-blur-applied');
    }

    function updatePinUI(){
      for(let i=0;i<pinDots.length;i++){
        if(i < currentPin.length) pinDots[i].classList.add('filled');
        else pinDots[i].classList.remove('filled');
      }
    }

    pinButtons.forEach(btn => {
      btn.addEventListener('click', ()=> {
        const k = btn.getAttribute('data-key');
        handlePinDigit(k);
      });
      // accessibility focus styles
      btn.addEventListener('focus', ()=> { btn.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)'; });
      btn.addEventListener('blur', ()=> { btn.style.boxShadow = ''; });
    });

    pinBack.addEventListener('click', ()=> {
      if(currentPin.length > 0){
        currentPin = currentPin.slice(0, -1);
        updatePinUI();
        try{ playBack(); }catch(e){}
      } else {
        try{ playBack(); }catch(e){}
      }
    });

    pinCancel.addEventListener('click', ()=> {
      currentPin = '';
      updatePinUI();
      hidePinModal();
      playError();
    });

    document.addEventListener('keydown', (e) => {
      if(pinSheet.classList.contains('show')){
        if(e.key >= '0' && e.key <= '9'){
          handlePinDigit(e.key);
          e.preventDefault();
        } else if(e.key === 'Backspace'){
          currentPin = currentPin.slice(0,-1);
          updatePinUI();
        } else if(e.key === 'Escape'){
          hidePinModal();
        }
      }
    });

    function handlePinDigit(d){
      if(currentPin.length >= 6) return;
      currentPin += String(d).slice(0,1);
      updatePinUI();
      try{ playClick(); }catch(e){}
      if(currentPin.length === 6){
        setTimeout(()=> { submitTransfer(); }, 220);
      }
    }

    async function submitTransfer(){
      const emailPenerima = (document.getElementById('username').value || '').trim();
      const jumlahRaw = document.getElementById('amount').value || '';
      const jumlah = parseInt(String(jumlahRaw).replace(/[^0-9]/g,'')) || 0;
      const catatan = document.getElementById('note').value || '';

      const payload = {
        email_penerima: emailPenerima,
        email_pengirim: emailPengirim,
        jumlah: jumlah,
        catatan: catatan,
        pin: currentPin
      };

      disablePinUi(true);
      createToast('Proses', 'Mengirim data...', 'info');

      try{
        const formBody = new URLSearchParams();
        formBody.append('email_penerima', payload.email_penerima);
        formBody.append('email_pengirim', payload.email_pengirim);
        formBody.append('jumlah', String(payload.jumlah));
        formBody.append('catatan', payload.catatan);
        formBody.append('pin', payload.pin);

        const resp = await fetch(TRANSFER_API, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: formBody.toString()
        });

        const txt = await resp.text();
        let data;
        try { data = JSON.parse(txt); } catch(e) { data = { message: txt }; }

        // detect success:
        let isSuccess = false;
        try {
          if (resp.ok) {
            if (data && (data.status === true || data.success === true || Number(data.code) === 200)) isSuccess = true;
          }
          if (Array.isArray(data) && data.some(item => item && Number(item.code) === 200)) isSuccess = true;
          if (!isSuccess && resp.ok && typeof data === 'object' && (String(data.message || '').toLowerCase().includes('success') || String(data.message || '').toLowerCase().includes('berhasil'))) isSuccess = true;
        } catch(e) { console.warn('success detection error', e); }

        if (isSuccess) {
          createToast('Sukses', (data && data.message) ? data.message : 'Transfer berhasil.', 'success');
          try{ playSuccess(); }catch(e){}
          triggerSuccessEffects({ type: 'transfer', message: (data && data.message) ? data.message : 'Transfer berhasil.' });
        } else {
          const msg = (data && data.message) ? data.message : ('Gagal melakukan transfer (HTTP ' + resp.status + ')');
          createToast('Gagal', msg, 'danger');
          playError();
        }
      } catch(err){
        console.error('TRANSFER ERROR:', err);
        createToast('Gagal', 'Terjadi kesalahan saat mengirim data', 'danger');
        playError();
      } finally {
        disablePinUi(false);
        hidePinModal();
        currentPin = '';
        updatePinUI();
      }
    }

    function disablePinUi(state){
      const all = document.querySelectorAll('.pin-btn, #pinBack, #pinCancel');
      all.forEach(el => {
        if(state) el.setAttribute('disabled','true');
        else el.removeAttribute('disabled');
      });
      const btn = document.getElementById('btnKirim');
      if(state) btn.classList.add('sending'); else btn.classList.remove('sending');
    }

    // pointer/touch-safe drag
    function onPointerDown(e){
      // normalize event object to have clientY and maybe pointerId
      const ev = e && e.clientY !== undefined ? e : (e && e.touches && e.touches[0]) ? e.touches[0] : e;
      if (ev && ev.button && ev.button !== 0) return;
      isDragging = true;
      dragStartY = ev.clientY ?? 0;
      pinSheet.style.transition = 'none';
      try{
        if (e && e.pointerId !== undefined && sheetHandle.setPointerCapture) sheetHandle.setPointerCapture(e.pointerId);
      }catch(e){}
    }

    function onPointerMove(e){
      if(!isDragging) return;
      const ev = e && e.clientY !== undefined ? e : (e && e.touches && e.touches[0]) ? e.touches[0] : e;
      const currentY = ev.clientY ?? 0;
      let dy = currentY - dragStartY;
      if(dy < 0) dy = 0;
      if(dy > MAX_DRAG) dy = MAX_DRAG;
      currentTranslateY = dy;
      pinSheet.style.transform = `translateY(${dy}px)`;
    }

    function onPointerUp(e){
      if(!isDragging) return;
      isDragging = false;
      pinSheet.style.transition = 'transform 220ms cubic-bezier(.2,.9,.3,1)';
      if(currentTranslateY >= DRAG_THRESHOLD){
        pinSheet.style.transform = `translateY(100%)`;
        setTimeout(()=> {
          hidePinModal();
          pinSheet.style.transform = '';
          currentTranslateY = 0;
        }, 220);
      } else {
        pinSheet.style.transform = 'translateY(0px)';
        currentTranslateY = 0;
      }
      try{
        if (e && e.pointerId !== undefined && sheetHandle.releasePointerCapture) sheetHandle.releasePointerCapture(e.pointerId);
      }catch(err){}
    }

    sheetHandle.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    sheetHandle.addEventListener('touchstart', function(e){ if(e.touches && e.touches[0]) onPointerDown(e.touches[0]); }, { passive: true });
    window.addEventListener('touchmove', function(e){ if(e.touches && e.touches[0]) onPointerMove(e.touches[0]); }, { passive: true });
    window.addEventListener('touchend', function(e){ onPointerUp(e.changedTouches ? e.changedTouches[0] : e); });

    // dim overlay behind sheet
    let dimEl = null;
    function addDimOverlay(){
      if(dimEl) return;
      dimEl = document.createElement('div');
      dimEl.style.position = 'fixed';
      dimEl.style.inset = '0';
      dimEl.style.background = 'linear-gradient(180deg, rgba(15,20,40,0.08), rgba(15,20,40,0.06))';
      dimEl.style.backdropFilter = 'blur(3px) saturate(1.05)';
      dimEl.style.zIndex = 1999;
      dimEl.style.opacity = '0';
      dimEl.style.transition = 'opacity 240ms ease';
      document.body.appendChild(dimEl);
      requestAnimationFrame(()=> dimEl.style.opacity = '1');
      dimEl.addEventListener('click', ()=> { hidePinModal(); });
    }
    function removeDimOverlay(){
      if(!dimEl) return;
      dimEl.style.opacity = '0';
      setTimeout(()=> { try{ if(dimEl && dimEl.parentNode) dimEl.parentNode.removeChild(dimEl); }catch(e){} dimEl = null; }, 260);
    }

    // ============================
    // Visual celebration effects
    // ============================
    const overlay = document.getElementById('effectOverlay');

    function triggerSuccessEffects(opts = {}) {
      const t = opts.type || 'transfer';
      showSuccessBadge(opts.message || 'Berhasil!');
      if (t === 'transfer') {
        runConfetti({count: 80});
        runCoins({count: 24});
        pagePulse();
        runBalloons({count: 6});
      } else if (t === 'birthday') {
        runBalloons({count: 14});
        runConfetti({count: 120});
        runSparkles({count: 26});
      } else {
        runConfetti({count: 120});
        runBalloons({count: 10});
        runCoins({count: 32});
        pagePulse();
      }
      setTimeout(()=> { hideSuccessBadge(); }, 3000);
    }

    function showSuccessBadge(msg){
      if(!overlay) return;
      overlay.setAttribute('aria-hidden','false');
      overlay.classList.add('show');
      const center = document.createElement('div');
      center.className = 'success-center';
      center.innerHTML = '<div class="success-badge"><span style="margin-right:10px">✓</span>' + escapeHtml(msg || 'Berhasil') + '</div>';
      overlay.appendChild(center);
      requestAnimationFrame(()=> center.style.opacity = '1');
    }

    function hideSuccessBadge(){
      if(!overlay) return;
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden','true');
      setTimeout(()=> { overlay.innerHTML = ''; }, 600);
    }

    function pagePulse(){
      document.body.classList.add('page-success');
      setTimeout(()=> { document.body.classList.remove('page-success'); }, 1200);
    }

    // Confetti (canvas)
    function runConfetti({count=80} = {}) {
      if(!overlay) return;
      const cvs = document.createElement('canvas');
      cvs.style.position = 'absolute';
      cvs.style.left = '0';
      cvs.style.top = '0';
      cvs.width = window.innerWidth * (window.devicePixelRatio || 1);
      cvs.height = window.innerHeight * (window.devicePixelRatio || 1);
      cvs.style.width = window.innerWidth + 'px';
      cvs.style.height = window.innerHeight + 'px';
      cvs.style.zIndex = 3001;
      overlay.appendChild(cvs);
      const ctx = cvs.getContext('2d');
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      const pieces = [];
      const colors = ['#FF5A5F','#FFB400','#28A745','#537BFF','#6E3EFF','#FF66CC'];

      for (let i=0;i<count;i++){
        pieces.push({
          x: Math.random()*window.innerWidth,
          y: Math.random()*-window.innerHeight,
          w: 6 + Math.random()*12,
          h: 8 + Math.random()*16,
          rot: Math.random()*360,
          velY: 2 + Math.random()*6,
          velX: Math.random()*4-2,
          color: colors[Math.floor(Math.random()*colors.length)],
          spin: Math.random()*0.2+0.05,
        });
      }

      let raf = null;
      function update(){
        ctx.clearRect(0,0,cvs.width,cvs.height);
        for (let p of pieces){
          p.x += p.velX;
          p.y += p.velY;
          p.rot += p.spin*8;
          ctx.save();
          ctx.translate(p.x,p.y);
          ctx.rotate(p.rot * Math.PI/180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
          ctx.restore();
        }
        for (let i=pieces.length-1;i>=0;i--){
          if (pieces[i].y > window.innerHeight + 60) pieces.splice(i,1);
        }
        if (pieces.length > 0) raf = requestAnimationFrame(update);
        else cleanup();
      }
      function cleanup(){
        cancelAnimationFrame(raf);
        try{ if(cvs && cvs.parentNode) cvs.parentNode.removeChild(cvs); }catch(e){}
      }
      update();
      setTimeout(()=> { pieces.length = 0; }, 2800);
    }

    function runCoins({count=20} = {}) {
      if(!overlay) return;
      for (let i=0;i<count;i++){
        const coin = document.createElement('div');
        coin.className = 'coin';
        coin.style.left = (20 + Math.random()*(window.innerWidth-40)) + 'px';
        coin.style.top = (-30 - Math.random()*40) + 'px';
        coin.style.zIndex = 3002;
        overlay.appendChild(coin);
        const dur = 1200 + Math.random()*1000;
        coin.animate([
          { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
          { transform: 'translateY(' + (window.innerHeight + 80) + 'px) rotate(' + (360 + Math.random()*720) + 'deg)', opacity: 0.95 }
        ], { duration: dur, easing: 'cubic-bezier(.18,.8,.27,1)'});
        setTimeout(()=> { try{ if(coin && coin.parentNode) coin.parentNode.removeChild(coin); }catch(e){} }, dur + 80);
      }
    }

    function runBalloons({count=8} = {}) {
      if(!overlay) return;
      const colors = ['#ff6b6b','#ffb400','#6ec1ff','#9b59ff','#59d37f','#ff66cc'];
      for (let i=0;i<count;i++){
        const b = document.createElement('div');
        b.className = 'balloon';
        const left = Math.random()*80 + (i%2===0?0:10);
        b.style.left = (left + Math.random()*20) + '%';
        b.style.top = (70 + Math.random()*10) + '%';
        b.style.background = colors[i % colors.length];
        b.style.boxShadow = 'inset -6px -6px 14px rgba(0,0,0,0.08)';
        b.style.opacity = '0';
        b.style.transform = 'translateY(0) scale(.8)';
        overlay.appendChild(b);
        const delay = Math.random()*260;
        setTimeout(()=> {
          b.animate([
            { transform: 'translateY(0) scale(.8)', opacity: 0 },
            { transform: 'translateY(-120vh) scale(1)', opacity: 1 }
          ], { duration: 3800 + Math.random()*1600, easing: 'cubic-bezier(.2,.9,.3,1)'});
          setTimeout(()=> { try{ if(b && b.parentNode) b.parentNode.removeChild(b); }catch(e){} }, 3800 + Math.random()*1600 + 200);
        }, delay);
      }
    }

    function runSparkles({count=18} = {}) {
      if(!overlay) return;
      for (let i=0;i<count;i++){
        const sp = document.createElement('div');
        sp.className = 'sparkle';
        sp.style.left = (10 + Math.random()*80) + '%';
        sp.style.top = (10 + Math.random()*60) + '%';
        sp.style.zIndex = 3003;
        overlay.appendChild(sp);
        setTimeout(()=> { try{ if(sp && sp.parentNode) sp.parentNode.removeChild(sp); }catch(e){} }, 900);
      }
    }

    // keep overlay clean on resize
    window.addEventListener('resize', ()=> { /* safe no-op */ });

    // final guard
    if(!overlay) console.warn('effect overlay not found');
