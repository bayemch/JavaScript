// ===== Pengaturan & state =====
const DURASI = 5 * 60;          // waktu ujian: 5 menit (dalam detik)
let soal = [];                  // daftar soal dari server
let jawaban = {};               // { idSoal: nomorOpsiYangDipilih }
let index = 0;                  // soal ke berapa yang sedang tampil
let sisa = 0;                   // sisa waktu (detik)
let timer = null;               // penampung setInterval

const ujian = document.getElementById('ujian');
const admin = document.getElementById('admin');

// ===== Fungsi bantu =====
// Membuat elemen HTML dengan teks dan class, supaya kode lebih singkat
function buat(tag, teks, kelas) {
  const e = document.createElement(tag);
  if (teks !== undefined) e.textContent = teks;
  if (kelas) e.className = kelas;
  return e;
}
// 125 detik -> "02:05"
function format(d) {
  return String(Math.floor(d / 60)).padStart(2, '0') + ':' + String(d % 60).padStart(2, '0');
}
// Kirim data ke server sebagai JSON
function kirim(url, method, data) {
  return fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

// ===== Pindah tab =====
function pilihTab(nama) {
  ujian.hidden = nama !== 'ujian';
  admin.hidden = nama !== 'admin';
  document.getElementById('tabUjian').classList.toggle('aktif', nama === 'ujian');
  document.getElementById('tabAdmin').classList.toggle('aktif', nama === 'admin');
  if (nama === 'admin') muatDaftar();
  else tampilMulai();
}
document.getElementById('tabUjian').onclick = function () { pilihTab('ujian'); };
document.getElementById('tabAdmin').onclick = function () { pilihTab('admin'); };

// ===== Layar 1: mulai ujian =====
async function tampilMulai() {
  clearInterval(timer);
  ujian.innerHTML = '';
  try {
    const res = await fetch('/api/soal');
    soal = await res.json();
  } catch (e) {
    ujian.append(buat('p', 'Gagal mengambil soal. Pastikan server berjalan.'));
    return;
  }
  ujian.append(buat('p', 'Jumlah soal: ' + soal.length));
  ujian.append(buat('p', 'Waktu: ' + format(DURASI)));
  const mulai = buat('button', 'Mulai ujian');
  mulai.disabled = soal.length === 0;
  mulai.onclick = function () {
    jawaban = {};
    index = 0;
    sisa = DURASI;
    timer = setInterval(detik, 1000);   // jalankan fungsi detik() tiap 1 detik
    tampilSoal();
  };
  ujian.append(mulai);
  if (soal.length === 0) ujian.append(buat('p', 'Belum ada soal. Buat dulu di tab "Buat Soal".', 'kecil'));
}

// ===== Timer =====
function detik() {
  sisa--;
  document.getElementById('waktu').textContent = format(Math.max(sisa, 0));
  if (sisa <= 0) selesai();             // waktu habis, kumpulkan otomatis
}

// ===== Layar 2: mengerjakan soal =====
function tampilSoal() {
  ujian.innerHTML = '';
  const s = soal[index];

  const atas = buat('div', undefined, 'atas');
  atas.append(buat('span', 'Soal ' + (index + 1) + ' / ' + soal.length));
  const waktu = buat('span', format(sisa), 'waktu');
  waktu.id = 'waktu';
  atas.append(waktu);
  ujian.append(atas, buat('h2', s.pertanyaan));

  s.opsi.forEach(function (teks, i) {
    const dipilih = jawaban[s.id] === i;
    const b = buat('button', String.fromCharCode(65 + i) + '. ' + teks, dipilih ? 'opsi dipilih' : 'opsi');
    b.onclick = function () { jawaban[s.id] = i; tampilSoal(); };
    ujian.append(b);
  });

  const nav = buat('div', undefined, 'nav');
  const sebelumnya = buat('button', 'Sebelumnya', 'sekunder');
  sebelumnya.disabled = index === 0;
  sebelumnya.onclick = function () { index--; tampilSoal(); };

  const terakhir = index === soal.length - 1;
  const berikutnya = buat('button', terakhir ? 'Selesai' : 'Berikutnya');
  berikutnya.onclick = function () {
    if (!terakhir) { index++; tampilSoal(); return; }
    const kosong = soal.length - Object.keys(jawaban).length;
    if (confirm(kosong ? kosong + ' soal belum dijawab. Kumpulkan sekarang?' : 'Kumpulkan jawaban?')) selesai();
  };
  nav.append(sebelumnya, berikutnya);
  ujian.append(nav);
}

// ===== Kirim jawaban, server yang menilai =====
async function selesai() {
  clearInterval(timer);
  try {
    const res = await kirim('/api/nilai', 'POST', { jawaban: jawaban });
    tampilHasil(await res.json());
  } catch (e) {
    ujian.innerHTML = '';
    ujian.append(buat('p', 'Gagal mengirim jawaban. Periksa server.'));
  }
}

// ===== Layar 3: hasil =====
function tampilHasil(h) {
  ujian.innerHTML = '';
  ujian.append(buat('p', h.skor, 'skor'));
  ujian.append(buat('p', h.benar + ' benar dari ' + h.total + ' soal'));
  ujian.append(buat('h2', 'Pembahasan'));

  soal.forEach(function (s, nomor) {
    const d = h.detail.find(function (x) { return x.id === s.id; });
    if (!d) return;
    const kartu = buat('div', undefined, d.betul ? 'kartu benar' : 'kartu salah');
    kartu.append(buat('strong', (nomor + 1) + '. ' + s.pertanyaan));
    const dipilih = d.dipilih === undefined ? 'tidak dijawab' : s.opsi[d.dipilih];
    kartu.append(buat('p', 'Jawabanmu: ' + dipilih, 'kecil'));
    if (!d.betul) kartu.append(buat('p', 'Jawaban benar: ' + s.opsi[d.kunci], 'kecil'));
    ujian.append(kartu);
  });

  const ulang = buat('button', 'Ulangi ujian');
  ulang.onclick = tampilMulai;
  ujian.append(ulang);
}

// ===== Bagian pembuat soal =====
const form = document.getElementById('formSoal');
const pesan = document.getElementById('pesan');

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  const opsi = Array.from(form.querySelectorAll('.opsi-input')).map(function (i) { return i.value; });
  const data = { pertanyaan: form.pertanyaan.value, opsi: opsi, kunci: Number(form.kunci.value) };
  try {
    const res = await kirim('/api/soal', 'POST', data);
    if (res.ok) {
      form.reset();
      pesan.className = '';
      pesan.textContent = 'Soal tersimpan.';
      muatDaftar();
    } else {
      const err = await res.json();
      pesan.className = 'error';
      pesan.textContent = err.pesan;
    }
  } catch (e) {
    pesan.className = 'error';
    pesan.textContent = 'Gagal terhubung ke server.';
  }
});

// ===== Impor soal dari Word =====
const formImpor = document.getElementById('formImpor');
const pesanImpor = document.getElementById('pesanImpor');

formImpor.addEventListener('submit', async function (e) {
  e.preventDefault();
  pesanImpor.className = '';
  pesanImpor.textContent = 'Mengunggah...';
  try {
    // FormData membungkus file. Jangan atur header Content-Type sendiri, browser yang mengaturnya.
    const res = await fetch('/api/impor', { method: 'POST', body: new FormData(formImpor) });
    const data = await res.json();
    if (!res.ok) {
      pesanImpor.className = 'error';
      pesanImpor.textContent = data.pesan;
      return;
    }
    let teks = data.ditambah + ' soal berhasil diimpor.';
    if (data.galat.length) teks += ' Dilewati: ' + data.galat.join('; ');
    pesanImpor.textContent = teks;
    formImpor.reset();
    muatDaftar();
  } catch (err) {
    pesanImpor.className = 'error';
    pesanImpor.textContent = 'Gagal terhubung ke server.';
  }
});

async function muatDaftar() {
  const daftar = document.getElementById('daftar');
  daftar.innerHTML = '';
  try {
    const res = await fetch('/api/soal');
    const semua = await res.json();
    semua.forEach(function (s) {
      const li = document.createElement('li');
      const hapus = buat('button', 'Hapus', 'hapus');
      hapus.onclick = async function () {
        await fetch('/api/soal/' + s.id, { method: 'DELETE' });
        muatDaftar();
      };
      li.append(buat('span', s.pertanyaan), hapus);
      daftar.append(li);
    });
  } catch (e) {
    daftar.append(buat('li', 'Gagal memuat daftar soal.'));
  }
}

tampilMulai();
