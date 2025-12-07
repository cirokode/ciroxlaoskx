// RATE KONVERSI (ubah sesuka kamu)
const RATE = 3500; // 1 MYR = 3500 IDR

// Ambil angka mentah dari HTML
let rawIDR = document.getElementById("saldo_user").innerText;

// Pastikan jadi angka
let idr = parseFloat(rawIDR);

// Hitung Ringgit
let myr = idr / RATE;

// Tampilkan hasil ke HTML
document.getElementById("saldo_user").innerText = "RM " + myr.toFixed(2);
