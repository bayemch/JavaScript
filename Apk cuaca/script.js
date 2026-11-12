// 1. Ambil elemen HTML
const form = document.getElementById('form');
const cari = document.getElementById('cari');
const hasil = document.getElementById('hasil');

// 2. Kode cuaca dari API diubah jadi teks yang mudah dibaca
function artiKode(kode) {
    if (kode === 0) return 'Cerah';
    if (kode <= 3) return 'Berawan';
    if (kode === 45 || kode === 48) return 'Berkabut';
    if (kode >= 51 && kode <= 57) return 'Gerimis';
    if (kode >= 61 && kode <= 67) return 'Hujan';
    if (kode >= 71 && kode <= 77) return 'Salju';
    if (kode >= 80 && kode <= 82) return 'Hujan lebat sesaat';
    if (kode >= 95) return 'Badai petir';
    return 'Tidak diketahui';
}

// 3. Fungsi utama: async karena harus menunggu data dari internet
async function cariCuaca(namaKota) {
    tampilkanPesan('Memuat...');
    try {
        // Langkah A: ubah nama kota menjadi koordinat
        const urlKota = 'https://geocoding-api.open-meteo.com/v1/search?count=1&language=id&name=' + encodeURIComponent(namaKota);
        const resKota = await fetch(urlKota);
        const dataKota = await resKota.json();

        if (!dataKota.results) {
            tampilkanPesan('Kota tidak ditemukan. Coba nama lain.', true);
            return;
        }
        const kota = dataKota.results[0];

        // Langkah B: ambil cuaca berdasarkan koordinat
        const urlCuaca = 'https://api.open-meteo.com/v1/forecast?latitude=' + kota.latitude +
            '&longitude=' + kota.longitude +
            '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto';
        const resCuaca = await fetch(urlCuaca);
        const dataCuaca = await resCuaca.json();

        tampilkanCuaca(kota, dataCuaca.current);
    } catch (error) {
        tampilkanPesan('Gagal mengambil data. Periksa koneksi internet.', true);
    }
}

// 4. Tampilkan pesan (memuat / error)
function tampilkanPesan(teks, error) {
    hasil.innerHTML = '';
    const p = document.createElement('p');
    p.id = 'pesan';
    if (error) p.className = 'error';
    p.textContent = teks;
    hasil.append(p);
}

// 5. Tampilkan data cuaca ke halaman
function tampilkanCuaca(kota, c) {
    hasil.innerHTML = '';
    const nama = document.createElement('p');
    nama.id = 'kota';
    nama.textContent = kota.name + ', ' + kota.country;

    const suhu = document.createElement('div');
    suhu.id = 'suhu';
    suhu.textContent = Math.round(c.temperature_2m) + '°C';

    const kondisi = document.createElement('p');
    kondisi.id = 'kondisi';
    kondisi.textContent = artiKode(c.weather_code);

    hasil.append(nama, suhu, kondisi, buatBaris('Kelembapan', c.relative_humidity_2m + '%'), buatBaris('Angin', c.wind_speed_10m + ' km/j'));
}

function buatBaris(label, nilai) {
    const div = document.createElement('div');
    div.className = 'baris';
    const a = document.createElement('span');
    a.textContent = label;
    const b = document.createElement('span');
    b.textContent = nilai;
    div.append(a, b);
    return div;
}

// 6. Saat form dikirim, cari cuaca
form.addEventListener('submit', function (e) {
    e.preventDefault();
    const nama = cari.value.trim();
    if (nama) cariCuaca(nama);
});