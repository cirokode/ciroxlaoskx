<script>
/**
 * checkNickname()
 * - Mengambil value dari input #userId
 * - Request ke https://cirokode.my.id/cek-id/cek-game.php?l
 *   dengan type_name=free_fire & userId=<value>
 * - Menampilkan seluruh respon ke console (aman dari [object Object])
 * - Jika respon berisi field "nickname":
 *     - bila nickname adalah array => gabungkan/ekstrak dan set ke <h1 id="nick">
 *     - bila nickname adalah string => set langsung
 *
 * Ex: <input id="userId"> <button onclick="checkNickname()">Cek</button>
 *      <h1 id="nick"></h1>
 */
async function checkNickname() {
  const inp = document.getElementById('userId');
  const outH1 = document.getElementById('nick');

  if (!inp) return console.error('Element dengan id="userId" tidak ditemukan.');
  // outH1 optional — hanya jika ada akan di-update
  const userId = String((inp.value || '')).trim();
  if (!userId) return console.error('userId kosong. Isi input #userId terlebih dahulu.');

  const base = 'https://cirokode.my.id/cek-id/cek-game.php';
  const url = new URL(base);
  url.searchParams.set('type_name', 'free_fire');
  url.searchParams.set('userId', userId);
  url.searchParams.set('apikey', "ckaoqoqoqq");

  console.log('Mengirim request ke:', url.toString());
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store'
    });

    console.log('HTTP status:', res.status, res.statusText);
    // log headers (try-catch karena beberapa env tidak mendukung)
    try { res.headers.forEach((v,k) => console.log('Header:', k, v)); } catch(e){}

    const text = await res.text();

    // Tampilkan raw response text untuk pemeriksaan awal
    console.log('RAW RESPONSE (text):', text);

    // Coba parsing JSON. Jika gagal, coba ekstrak blok JSON sederhana.
    let parsed = null;
    try {
      parsed = JSON.parse(text);
      console.log('Full response (parsed JSON):', JSON.stringify(parsed, null, 2));
    } catch (e) {
      // Coba cari substring JSON sederhana (object/array) - best effort
      const firstBrace = text.indexOf('{');
      const firstBracket = text.indexOf('[');
      const lastBrace = text.lastIndexOf('}');
      const lastBracket = text.lastIndexOf(']');
      let maybeJson = null;

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        maybeJson = text.slice(firstBrace, lastBrace + 1);
      } else if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        maybeJson = text.slice(firstBracket, lastBracket + 1);
      }

      if (maybeJson) {
        try {
          parsed = JSON.parse(maybeJson);
          console.log('Extracted & parsed JSON from text:', JSON.stringify(parsed, null, 2));
        } catch (e2) {
          parsed = null;
          console.warn('Gagal parse extracted JSON. Menampilkan raw text saja.');
        }
      } else {
        console.warn('Response bukan JSON. Menampilkan raw text.');
      }
    }

    // Jika parsed tersedia dan mengandung field nickname -> proses dan set ke <h1 id="nick">
    if (parsed && Object.prototype.hasOwnProperty.call(parsed, 'nickname')) {
      const nickField = parsed.nickname;
      let finalNick = '';

      if (Array.isArray(nickField)) {
        // Convert semua elemen ke string yang bermakna
        const mapped = nickField.map(item => {
          if (item === null || item === undefined) return '';
          if (typeof item === 'string' || typeof item === 'number') return String(item);
          // jika item adalah object, coba ambil properti umum
          if (typeof item === 'object') {
            // common props to try
            const tryProps = ['nickname','nick','name','nama','value'];
            for (const p of tryProps) {
              if (p in item && (typeof item[p] === 'string' || typeof item[p] === 'number')) {
                return String(item[p]);
              }
            }
            // fallback: stringify object
            try {
              return JSON.stringify(item);
            } catch(e){ return String(item); }
          }
          return String(item);
        }).filter(s => s.length > 0);

        if (mapped.length === 0) {
          finalNick = '';
        } else if (mapped.length === 1) {
          finalNick = mapped[0];
        } else {
          // gabungkan beberapa nickname dengan separator yang rapi
          finalNick = mapped.join(' | ');
        }
      } else if (typeof nickField === 'string' || typeof nickField === 'number') {
        finalNick = String(nickField);
      } else if (typeof nickField === 'object' && nickField !== null) {
        // jika nickname adalah object, coba ambil property umum
        const tryProps = ['nickname','nick','name','nama','value'];
        let found = false;
        for (const p of tryProps) {
          if (p in nickField && (typeof nickField[p] === 'string' || typeof nickField[p] === 'number')) {
            finalNick = String(nickField[p]);
            found = true;
            break;
          }
        }
        if (!found) {
          // fallback ke stringify
          try { finalNick = JSON.stringify(nickField); } catch(e){ finalNick = String(nickField); }
        }
      } else {
        finalNick = String(nickField);
      }

      if (finalNick) {
        if (outH1) {
          outH1.innerText = finalNick;
          console.log('H1 #nick di-update jadi:', finalNick);
        } else {
          console.log('H1 #nick tidak ditemukan pada halaman. Extracted nickname:', finalNick);
        }
      } else {
        console.log('Field "nickname" ada tapi kosong / tidak dapat diekstrak.');
      }
    } else {
      console.log('Tidak menemukan field "nickname" di response JSON.');
    }

  } catch (err) {
    // Log error secara aman agar tidak jadi [object Object]
    try {
      console.error('FETCH ERROR:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    } catch (e) {
      console.error('FETCH ERROR (fallback):', String(err));
    }
  }
}

window.checkNickname = checkNickname;
</script>
