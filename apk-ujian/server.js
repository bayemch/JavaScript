const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mammoth = require('mammoth');
const { urai } = require('./parser');

const app = express();
const FILE = path.join(__dirname, 'soal.json');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });  // file disimpan di memori, maks 2 MB

app.use(express.json());                                    // baca body JSON dari request
app.use(express.static(path.join(__dirname, 'public')));    // sajikan index.html, style.css, script.js

// Helper: baca dan tulis file soal.json (ini "database" sederhana kita)
function baca() { return JSON.parse(fs.readFileSync(FILE, 'utf-8')); }
function tulis(data) { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }

// GET: ambil semua soal TANPA kunci jawaban (supaya peserta tidak bisa mengintip)
app.get('/api/soal', (req, res) => {
  const soal = baca().map(({ id, pertanyaan, opsi }) => ({ id, pertanyaan, opsi }));
  res.json(soal);
});

// POST: buat soal baru
app.post('/api/soal', (req, res) => {
  const { pertanyaan, opsi, kunci } = req.body;
  const valid =
    typeof pertanyaan === 'string' && pertanyaan.trim() !== '' &&
    Array.isArray(opsi) && opsi.length === 4 &&
    opsi.every(o => typeof o === 'string' && o.trim() !== '') &&
    Number.isInteger(kunci) && kunci >= 0 && kunci <= 3;
  if (!valid) return res.status(400).json({ pesan: 'Data soal tidak lengkap atau tidak valid' });

  const data = baca();
  const soalBaru = { id: Date.now(), pertanyaan: pertanyaan.trim(), opsi: opsi.map(o => o.trim()), kunci };
  data.push(soalBaru);
  tulis(data);
  res.status(201).json({ id: soalBaru.id });
});

// DELETE: hapus soal berdasarkan id
app.delete('/api/soal/:id', (req, res) => {
  const id = Number(req.params.id);
  tulis(baca().filter(s => s.id !== id));
  res.json({ pesan: 'Soal dihapus' });
});

// POST: impor soal dari file Word (.docx)
app.post('/api/impor', upload.single('berkas'), async (req, res) => {
  if (!req.file) return res.status(400).json({ pesan: 'Pilih file .docx dulu' });
  if (!req.file.originalname.toLowerCase().endsWith('.docx')) {
    return res.status(400).json({ pesan: 'File harus berformat .docx' });
  }
  try {
    const { value: teks } = await mammoth.extractRawText({ buffer: req.file.buffer });  // ambil teks dari Word
    const { soal, galat } = urai(teks);                                                // ubah teks jadi soal
    const data = baca();
    const dasar = Date.now();
    soal.forEach(function (s, i) {
      data.push({ id: dasar + i, pertanyaan: s.pertanyaan, opsi: s.opsi, kunci: s.kunci });
    });
    tulis(data);
    res.json({ ditambah: soal.length, galat: galat });
  } catch (e) {
    res.status(500).json({ pesan: 'Gagal membaca file Word' });
  }
});

// POST: koreksi jawaban DI SERVER, lalu kirim skor
app.post('/api/nilai', (req, res) => {
  const jawaban = req.body.jawaban || {};   // contoh: { "1": 2, "2": 0 }
  const data = baca();
  let benar = 0;
  const detail = data.map(s => {
    const dipilih = jawaban[s.id];
    const betul = dipilih === s.kunci;
    if (betul) benar++;
    return { id: s.id, kunci: s.kunci, dipilih, betul };
  });
  const skor = data.length ? Math.round((benar / data.length) * 100) : 0;
  res.json({ benar, total: data.length, skor, detail });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server jalan di http://localhost:' + PORT));
