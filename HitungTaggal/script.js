const KEY = "hitunghari:v1";
const $ = id => document.getElementById(id);
const DAY = 864e5;
let events = [];

function parse(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function startOfToday() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function daysBetween(a, b) { return Math.round((b - a) / DAY); }
function fmt(d) { return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }

function ymd(a, b) {
    let y = b.getFullYear() - a.getFullYear();
    let m = b.getMonth() - a.getMonth();
    let d = b.getDate() - a.getDate();
    if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    return { y, m, d };
}

function load() { try { events = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { events = []; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(events)); } catch (e) { } }

function label(n) {
    if (n === 0) return { big: "Hari ini", small: "" };
    if (n > 0) return { big: n.toLocaleString("id-ID"), small: "hari lagi" };
    return { big: Math.abs(n).toLocaleString("id-ID"), small: "hari lalu" };
}

function render() {
    const today = startOfToday();
    $("today").textContent = "Hari ini " + fmt(today);

    const items = events.map(e => ({ ...e, n: daysBetween(today, parse(e.date)) }));
    const upcoming = items.filter(e => e.n >= 0).sort((a, b) => a.n - b.n);
    const past = items.filter(e => e.n < 0).sort((a, b) => b.n - a.n);

    const next = upcoming[0];
    if (next) {
        $("hl").textContent = "Acara terdekat: " + next.name;
        $("hn").textContent = next.n === 0 ? "Hari ini" : next.n.toLocaleString("id-ID");
        $("hd").textContent = next.n === 0 ? "Selamat, harinya tiba." : "hari lagi, tepatnya " + fmt(parse(next.date));
    } else {
        $("hl").textContent = "Belum ada acara mendatang";
        $("hn").textContent = "–";
        $("hd").textContent = "Tambahkan acara baru di bawah.";
    }

    const list = $("list");
    list.innerHTML = "";
    if (!items.length) {
        list.innerHTML = '<li class="empty" style="display:block;border:0;background:none">Belum ada acara. Isi nama dan tanggal di atas.</li>';
    }
    [...upcoming, ...past].forEach(e => {
        const l = label(e.n);
        const li = document.createElement("li");
        li.className = e.n < 0 ? "past" : (e.n <= 7 ? "soon" : "");

        const box = document.createElement("div");
        box.className = "n";
        const s = document.createElement("strong"); s.textContent = e.name;
        const sm = document.createElement("small"); sm.textContent = fmt(parse(e.date));
        box.append(s, sm);

        const d = document.createElement("div");
        d.className = "d";
        d.textContent = l.big;
        if (l.small) { const k = document.createElement("small"); k.textContent = l.small; d.append(k); }

        const x = document.createElement("button");
        x.className = "x"; x.textContent = "×";
        x.setAttribute("aria-label", "Hapus acara " + e.name);
        x.onclick = () => { events = events.filter(v => v.id !== e.id); save(); render(); };

        li.append(box, d, x);
        list.append(li);
    });
}

function calc() {
    const av = $("a").value, bv = $("b").value;
    const out = $("out");
    if (!av || !bv) { out.textContent = "Pilih dua tanggal untuk melihat selisihnya."; return; }
    let a = parse(av), b = parse(bv);
    if (a > b) [a, b] = [b, a];
    const total = daysBetween(a, b);
    const r = ymd(a, b);
    out.innerHTML = "";
    const s = document.createElement("strong");
    s.textContent = r.y + " tahun, " + r.m + " bulan, " + r.d + " hari";
    const p = document.createElement("div");
    p.textContent = "Total " + total.toLocaleString("id-ID") + " hari (sekitar " + Math.floor(total / 7).toLocaleString("id-ID") + " minggu).";
    out.append(s, p);
}

$("f").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("name").value.trim(), date = $("date").value;
    if (!name || !date) return;
    events.push({ id: Date.now(), name, date });
    $("name").value = ""; $("date").value = "";
    save(); render();
});
$("a").addEventListener("input", calc);
$("b").addEventListener("input", calc);

load(); render();