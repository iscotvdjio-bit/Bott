// ╔══════════════════════════════════════════════════════╗
// ║                    donate.js                         ║
// ║  Canvas image generator – desain mirip referensi    ║
// ╚══════════════════════════════════════════════════════╝

const { createCanvas, loadImage } = require("canvas");

/**
 * Buat gambar TOP DONATUR mirip desain referensi.
 *
 * @param {Object[]} donors       sorted desc by amount, max 10
 *   { username, avatarURL, amount }
 * @param {string}   guildIconURL URL icon server (png)
 * @param {string}   monthLabel   "April 2026"
 * @returns {Buffer}  PNG buffer
 */
async function buildDonateImage(donors, guildIconURL, monthLabel) {
  // ── dimensi kanvas ──────────────────────────────────────
  const W = 800;
  // tinggi dinamis: header(160) + podium(240) + list row(55*n) + padding(30)
  const listCount = Math.min(donors.length, 10);
  const H = 160 + 240 + listCount * 55 + 40;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // ── 1. BACKGROUND KARTU ─────────────────────────────────
  ctx.fillStyle = "#1e1f2e";
  ctx.fillRect(0, 0, W, H);

  // ── 2. HEADER AREA ──────────────────────────────────────
  // Teks "TOP DONATUR"
  ctx.font = "bold 46px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("TOP DONATUR", 36, 62);

  // Teks "SERVER" (baris kedua)
  ctx.font = "bold 46px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("SERVER", 36, 112);

  // Thumbnail server — bulat, pojok kanan atas
  try {
    const icon  = await loadImage(guildIconURL);
    const iR    = 44;          // radius
    const iCX   = W - 60;     // center x
    const iCY   = 60;         // center y
    ctx.save();
    ctx.beginPath();
    ctx.arc(iCX, iCY, iR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(icon, iCX - iR, iCY - iR, iR * 2, iR * 2);
    ctx.restore();
    // border biru cerah
    ctx.beginPath();
    ctx.arc(iCX, iCY, iR + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "#4fc3f7";
    ctx.lineWidth   = 3;
    ctx.stroke();
  } catch {}

  // "Month : April 2026"
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "#4fc3f7";
  ctx.fillText(`Month : ${monthLabel}`, 36, 142);

  // garis pemisah tipis
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(36, 154);
  ctx.lineTo(W - 36, 154);
  ctx.stroke();

  // ── 3. PODIUM BANNER (background biru bergradien) ────────
  const bannerX = 36;
  const bannerY = 162;
  const bannerW = W - 72;
  const bannerH = 232;
  const bannerR = 16;

  // Gradien biru seperti referensi
  const bgGrad = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY);
  bgGrad.addColorStop(0,    "#1a56cc");
  bgGrad.addColorStop(0.5,  "#2563eb");
  bgGrad.addColorStop(1,    "#1a56cc");
  ctx.fillStyle = bgGrad;
  roundRect(ctx, bannerX, bannerY, bannerW, bannerH, bannerR);
  ctx.fill();

  // Efek highlight putih samar di atas banner (gloss)
  const glossGrad = ctx.createLinearGradient(bannerX, bannerY, bannerX, bannerY + bannerH * 0.5);
  glossGrad.addColorStop(0,   "rgba(255,255,255,0.10)");
  glossGrad.addColorStop(1,   "rgba(255,255,255,0)");
  ctx.fillStyle = glossGrad;
  roundRect(ctx, bannerX, bannerY, bannerW, bannerH, bannerR);
  ctx.fill();

  // "salju" di bawah banner (putih membulat seperti referensi)
  const snowY = bannerY + bannerH - 30;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(bannerX + bannerW / 2, snowY + 24, bannerW / 2, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Megaphone emoji pojok kiri banner
  ctx.font = "44px sans-serif";
  ctx.fillText("📢", bannerX + 10, bannerY + 56);

  // ── 4. TIGA PODIUM ──────────────────────────────────────
  // Urutan tampil: rank2 kiri, rank1 tengah (lebih tinggi), rank3 kanan
  // Warna kotak nama: rank1=merah, rank2=cyan, rank3=oranye/kuning
  const podSlots = [
    { idx: 1, cx: bannerX + bannerW * 0.26, boxColor: "#22d3ee", textColor: "#0c1a3a" },  // #2 kiri
    { idx: 0, cx: bannerX + bannerW * 0.50, boxColor: "#ef4444", textColor: "#ffffff"  },  // #1 tengah
    { idx: 2, cx: bannerX + bannerW * 0.74, boxColor: "#f59e0b", textColor: "#7c2d12"  },  // #3 kanan
  ];

  // Avatar rank1 sedikit lebih besar & lebih tinggi
  const avatarRadius = [46, 40, 38]; // [rank1, rank2, rank3] → map via idx
  // avatarBaseY: jarak dari bawah banner ke tengah avatar
  const avatarUp     = [100, 80, 80];

  for (const slot of podSlots) {
    const d = donors[slot.idx];
    if (!d) continue;

    const isFirst = slot.idx === 0;
    const aR  = avatarRadius[slot.idx];
    const aCY = bannerY + bannerH - avatarUp[slot.idx];
    const cx  = slot.cx;

    // Mahkota hanya rank 1
    if (isFirst) {
      ctx.font = "28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("👑", cx, aCY - aR - 4);
    }

    // Lingkaran shadow/glow di belakang avatar
    const glowColor = isFirst ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.arc(cx, aCY, aR + 6, 0, Math.PI * 2);
    ctx.fillStyle = glowColor;
    ctx.fill();

    // Avatar
    try {
      const av = await loadImage(d.avatarURL + "?size=128");
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, aCY, aR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(av, cx - aR, aCY - aR, aR * 2, aR * 2);
      ctx.restore();
    } catch {
      // Fallback: lingkaran warna + inisial
      ctx.beginPath();
      ctx.arc(cx, aCY, aR, 0, Math.PI * 2);
      ctx.fillStyle = slot.boxColor + "88";
      ctx.fill();
      ctx.font      = `bold ${aR * 0.9}px sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((d.username || "?")[0].toUpperCase(), cx, aCY);
      ctx.textBaseline = "alphabetic";
    }

    // Border avatar — putih untuk rank1, warna slot untuk lainnya
    ctx.beginPath();
    ctx.arc(cx, aCY, aR + 2, 0, Math.PI * 2);
    ctx.strokeStyle = isFirst ? "#ffffff" : slot.boxColor;
    ctx.lineWidth   = isFirst ? 3.5 : 2.5;
    ctx.stroke();

    // Kotak nama + nominal
    const boxW  = isFirst ? 148 : 132;
    const boxH  = 46;
    const boxX  = cx - boxW / 2;
    const boxY  = bannerY + bannerH - 56;

    ctx.fillStyle = slot.boxColor;
    roundRect(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    ctx.textAlign    = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font         = `bold ${isFirst ? 14 : 13}px sans-serif`;
    ctx.fillStyle    = slot.textColor;
    ctx.fillText(`@${d.username}`, cx, boxY + 17);

    ctx.font      = `bold ${isFirst ? 13 : 12}px sans-serif`;
    ctx.fillStyle = slot.textColor;
    ctx.fillText(formatRp(d.amount), cx, boxY + 36);

    ctx.textAlign    = "left";
    ctx.textBaseline = "alphabetic";
  }

  // ── 5. LIST RANK (bawah podium) ─────────────────────────
  const listStartY = bannerY + bannerH + 18;
  const rowH       = 55;

  // Background rank badge warna
  const rankBgColors = [
    "#c97c10", // 1 emas
    "#7a8a9a", // 2 silver
    "#b05a1a", // 3 bronze
    "#2d6bcf", // 4
    "#2d6bcf", // 5
    "#2d6bcf", // 6
    "#2d6bcf", // 7
    "#2d6bcf", // 8
    "#2d6bcf", // 9
    "#2d6bcf", // 10
  ];

  const medals = ["🥇", "🥈", "🥉"];

  for (let i = 0; i < listCount; i++) {
    const d  = donors[i];
    const ry = listStartY + i * rowH;

    // Baris zebra subtle
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      roundRect(ctx, 36, ry + 2, W - 72, rowH - 4, 6);
      ctx.fill();
    }

    // Badge rank (kotak membulat)
    const bW = 40, bH = 30;
    const bX = 44, bY = ry + (rowH - bH) / 2;

    ctx.fillStyle = rankBgColors[i] || "#2d6bcf";
    roundRect(ctx, bX, bY, bW, bH, 6);
    ctx.fill();

    // Medal / nomor rank
    ctx.textAlign = "center";
    if (i < 3) {
      ctx.font = "20px sans-serif";
      ctx.fillText(medals[i], bX + bW / 2, bY + bH * 0.76);
    } else {
      ctx.font      = "bold 15px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${i + 1}`, bX + bW / 2, bY + bH * 0.76);
    }
    ctx.textAlign = "left";

    // Nama user
    ctx.font      = "bold 18px sans-serif";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(d.username, 96, ry + rowH / 2 + 7);

    // Nominal (rata kanan)
    ctx.font      = "bold 17px sans-serif";
    ctx.fillStyle = "#93c5fd";
    ctx.textAlign = "right";
    ctx.fillText(formatRp(d.amount), W - 44, ry + rowH / 2 + 7);
    ctx.textAlign = "left";

    // Garis separator tipis antar row
    if (i < listCount - 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(36, ry + rowH);
      ctx.lineTo(W - 36, ry + rowH);
      ctx.stroke();
    }
  }

  // ── 6. PADDING BAWAH selesai ────────────────────────────
  return canvas.toBuffer("image/png");
}

// ── helpers ───────────────────────────────────────────────
function formatRp(amount) {
  return "Rp " + Number(amount).toLocaleString("id-ID");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

module.exports = { buildDonateImage, formatRp };
