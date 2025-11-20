const maxChar = 500;
  const textarea = document.getElementById('kritik');
  const counter = document.getElementById('charCounter');
  const editBtn = document.getElementById('editBtn');
  const sendBtn = document.getElementById('sendBtn');

 
  
  let token = '';
  let chatId = '';

  // load konfigurasi per-app dari neurokode.json
  async function loadConfig() {
    try {
      const res = await fetch('https://cirokode.my.id/api/kritiksaran.json', { cache: 'no-store' }); 
      if (!res.ok) throw new Error('Gagal memuat neurokode.json');
      const all = await res.json();
      if (all && all[appName]) {
        token = all[appName].tokenbot || '';
        chatId = all[appName].chatid || '';
      } else {
        token = '';
        chatId = '';
      }
    } catch (err) {
      console.error(err);
    }
  }



  window.addEventListener('load', () => {
    loadConfig();
   const allText = document.body.innerText.toLowerCase();

  if (allText.includes('admin')) {
    document.getElementById('editBtn').style.display = 'block';
  }
  });

  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    counter.textContent = `${len}/${maxChar}`;
    counter.classList.toggle('over', len > maxChar);
  });

  // event: edit token/chat id (hanya muncul kalau ada "admin" di body)
  editBtn.addEventListener('click', async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Konfigurasi Bot (' + appName + ')',
      html:
        `<input id="swal-token" class="swal2-input" placeholder="Token Bot" value="${token}">
         <input id="swal-chatid" class="swal2-input" placeholder="Chat ID" value="${chatId}">`,
      focusConfirm: false,
      preConfirm: () => {
        return {
          token: document.getElementById('swal-token').value.trim(),
          chatid: document.getElementById('swal-chatid').value.trim()
        };
      }
    });

    if (!formValues) return;
    const newToken = formValues.token;
    const newChat = formValues.chatid;

    try {
      const resp = await fetch('https://cirokode.my.id/api/kritiksaran.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app: appName, tokenbot: newToken, chatid: newChat })
      });
      const j = await resp.json();
      if (j.status === 'ok') {
        token = newToken;
        chatId = newChat;
        Swal.fire('Berhasil!', 'Konfigurasi tersimpan.', 'success');
      } else {
        throw new Error(j.msg || 'Gagal menyimpan');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', 'Tidak dapat menyimpan konfigurasi.', 'error');
    }
  });

  // kirim pesan via Telegram (menggunakan Proxy AllOrigins seperti sebelumnya)
  sendBtn.addEventListener('click', kirimPesan);

  async function kirimPesan() {
    const pesan = textarea.value.trim();
    if (!pesan) return Swal.fire({ icon:'warning', title:'Oops...', text:'Tolong isi kritik & saran terlebih dahulu!', showConfirmButton:false, timer:2000 });
    if (pesan.length > maxChar) return Swal.fire({ icon:'error', title:'Terlalu Panjang!', text:'Pesan tidak boleh lebih dari 500 huruf.', showConfirmButton:false, timer:2000 });

    if (!token || !chatId) return Swal.fire({ icon:'error', title:'Konfigurasi Kosong', text:'Token atau Chat ID belum diatur untuk aplikasi ini.', showConfirmButton:false, timer:2200 });

    const textToSend = `📩 Kritik & Saran:\n\n${pesan}`;
    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(textToSend)}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(telegramUrl)}`;

    try {
      const res = await fetch(proxyUrl);
      const data = await res.json();
      if (data && data.contents) {
        Swal.fire({ icon:'success', title:'Berhasil!', text:'Pesan berhasil dikirim ke admin.', showConfirmButton:false, timer:2000 });
        textarea.value = '';
        counter.textContent = '0/500';
        counter.classList.remove('over');
      } else {
        throw new Error('Respon kosong dari proxy');
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ icon:'error', title:'Error!', text:'Terjadi kesalahan: ' + err.message, showConfirmButton:false, timer:2600 });
    }
  }
