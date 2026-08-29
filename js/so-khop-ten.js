// ================= SO SÁNH HỌ TÊN CÓ DUNG SAI (FUZZY) =================
// Xử lý: viết tắt tên đệm ("M." ~ "Minh"), gõ nhầm nhẹ 1-2 ký tự.
// File này PHẢI được nhúng TRƯỚC matching.js trong HTML.

// Khoảng cách chỉnh sửa (Levenshtein) — phát hiện gõ nhầm.
function khoangCachLevenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// So khớp 1 từ đơn, trả về 0..1
function soKhopTuDon(tuA, tuB) {
  if (!tuA || !tuB) return 0;
  if (tuA === tuB) return 1;

  // Viết tắt: "m" hoặc "m." khớp với từ bắt đầu bằng "m"
  const aSach = tuA.replace(/\.$/, "");
  const bSach = tuB.replace(/\.$/, "");
  if (aSach.length === 1 || bSach.length === 1) {
    const nganHon = aSach.length === 1 ? aSach : bSach;
    const daiHon = aSach.length === 1 ? bSach : aSach;
    return daiHon.startsWith(nganHon) ? 0.9 : 0;
  }

  const khoangCach = khoangCachLevenshtein(aSach, bSach);
  const doDaiToiDa = Math.max(aSach.length, bSach.length);
  const tiLe = 1 - khoangCach / doDaiToiDa;

  // Chỉ chấp nhận nếu sai lệch nhỏ, tránh nhận nhầm 2 từ khác hẳn nhau
  return tiLe >= 0.7 ? tiLe : 0;
}

// So sánh toàn bộ họ tên theo từng từ, có xét thứ tự.
// Trả về tỉ lệ khớp trung bình 0..1
function soKhopHoTenFuzzy(tenA, tenB) {
  const tachTu = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .split(" ")
      .filter(Boolean);

  const tuA = tachTu(tenA);
  const tuB = tachTu(tenB);

  if (tuA.length === 0 || tuB.length === 0) return 0;

  // Chênh lệch số từ quá nhiều (thiếu cả họ/tên) -> không khớp
  if (Math.abs(tuA.length - tuB.length) > 1) return 0;

  // Họ (từ đầu tiên) phải khớp gần tuyệt đối
  if (soKhopTuDon(tuA[0], tuB[0]) < 0.7) return 0;

  const soTuSanh = Math.min(tuA.length, tuB.length);
  let tongDiem = 0;
  for (let i = 0; i < soTuSanh; i++) {
    tongDiem += soKhopTuDon(tuA[i], tuB[i]);
  }

  return tongDiem / soTuSanh;
}