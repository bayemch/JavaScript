// Format soal di Word:
//   1. Pertanyaan
//   A. opsi
//   B. opsi
//   C. opsi
//   D. opsi
//   Jawaban: C
function urai(teks) {
  const baris = teks.split(/\r?\n/).map(function (b) { return b.trim(); }).filter(Boolean);
  const hasil = [];
  const galat = [];
  let sekarang = null;

  // Cek soal yang baru selesai dibaca: lengkap atau tidak?
  function selesaikan() {
    if (!sekarang) return;
    const lengkap = sekarang.pertanyaan && sekarang.opsi.length === 4 && sekarang.kunci !== null;
    if (lengkap) hasil.push(sekarang);
    else galat.push('Soal nomor ' + sekarang.nomor + ' tidak lengkap (perlu 4 opsi A-D dan baris "Jawaban: X")');
    sekarang = null;
  }

  baris.forEach(function (b) {
    const cocokNomor = b.match(/^(\d+)[.)]\s*(.+)$/);
    const cocokOpsi = b.match(/^([A-Da-d])[.)]\s*(.+)$/);
    const cocokKunci = b.match(/^(?:jawaban|kunci)\s*[:=]\s*([A-Da-d])\b/i);

    if (cocokNomor) {                       // awal soal baru
      selesaikan();
      sekarang = { nomor: cocokNomor[1], pertanyaan: cocokNomor[2], opsi: [], kunci: null };
    } else if (!sekarang) {
      return;                               // teks sebelum soal pertama diabaikan
    } else if (cocokKunci) {
      sekarang.kunci = cocokKunci[1].toUpperCase().charCodeAt(0) - 65;   // A=0, B=1, ...
    } else if (cocokOpsi) {
      sekarang.opsi.push(cocokOpsi[2]);
    } else if (sekarang.opsi.length === 0) {
      sekarang.pertanyaan += ' ' + b;       // pertanyaan yang ditulis lebih dari satu baris
    }
  });
  selesaikan();

  return { soal: hasil, galat: galat };
}

module.exports = { urai };
