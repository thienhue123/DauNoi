// ===== TRANG TRA CỨU TRẠNG THÁI HỒ SƠ (CÔNG KHAI, KHÔNG CẦN ĐĂNG NHẬP) =====
// Chỉ gọi các action công khai của Edge Function (không cần x-admin-password):
// "tra_cuu_trang_thai" và "tim_ho_so_theo_ten".

const EDGE_FUNCTION_URL =
  "https://zidorfsicyswxgjvvmax.supabase.co/functions/v1/admin-actions";

async function goiActionCongKhai(action, payload = {}) {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return res.json();
}

// ----- Hiện badge màu theo trạng thái (dùng chung cho cả 2 khu vực) -----
function htmlBadgeTrangThai(trangThai) {
  if (!trangThai) {
    return `<span class="nhan-trang-thai" style="background-color:#95a5a6;">Đang chờ xử lý</span>`;
  }
  const mauSac = escapeHTML(trangThai.mau_sac || "#95a5a6");
  const moTa = escapeHTML(trangThai.mo_ta || trangThai.ten_trang_thai || "Không xác định");
  return `<span class="nhan-trang-thai" style="background-color:${mauSac};">${moTa}</span>`;
}

// ----- HTML khung xương dùng chung khi đang tải danh sách -----
function htmlKhungXuong(soLuong = 2) {
  return Array.from({ length: soLuong }, () => `<div class="khung-xuong"></div>`).join("");
}

// ================= KHU VỰC 1: HỒ SƠ TRÊN THIẾT BỊ NÀY =================

const danhSachThietBiNay = document.getElementById("danh-sach-thiet-bi-nay");

async function taiHoSoTrenThietBiNay() {
  const ds = JSON.parse(localStorage.getItem("ho_so_da_khai_bao") || "[]");

  if (ds.length === 0) {
    danhSachThietBiNay.innerHTML =
      "<p>Chưa có hồ sơ nào được khai báo trên thiết bị này.</p>";
    return;
  }

  danhSachThietBiNay.innerHTML = htmlKhungXuong(Math.min(ds.length, 3));

  const cacTheHtml = await Promise.all(
    ds.map(async (hoSo) => {
      const { data, error } = await goiActionCongKhai("tra_cuu_trang_thai", {
        khaiBaoId: hoSo.id,
      });

      const trangThai =
        !error && data ? data.trang_thai_ho_so : null;

      return `
        <div class="the-ket-qua hien-dan">
          <p><strong>Họ tên đã khai:</strong> ${escapeHTML(hoSo.ho_ten)}</p>
          <p><strong>Mã hồ sơ:</strong> <span class="ma-ho-so">#${escapeHTML(String(hoSo.id))}</span></p>
          <p><strong>Trạng thái:</strong> ${htmlBadgeTrangThai(trangThai)}</p>
        </div>
      `;
    })
  );

  danhSachThietBiNay.innerHTML = cacTheHtml.join("");
}

document.addEventListener("DOMContentLoaded", taiHoSoTrenThietBiNay);

// ================= KHU VỰC 2: TÌM HỒ SƠ THEO THÔNG TIN =================

const oTimKiem = document.getElementById("ten-tim-kiem");
const oQueQuanTimKiem = document.getElementById("que-quan-tim-kiem");
const oDonViTimKiem = document.getElementById("don-vi-tim-kiem");
const oThoiGianTimKiem = document.getElementById("thoi-gian-tim-kiem");
const nutTimKiem = document.getElementById("nut-tim-kiem");
const thongBaoTimKiem = document.getElementById("thong-bao-tim-kiem");
const danhSachTimKiem = document.getElementById("danh-sach-tim-kiem");

async function timHoSoTheoTen() {
  // Chặn bấm trùng lặp trong lúc đang chờ kết quả trước đó.
  if (nutTimKiem.disabled) return;

  const hoTen = oTimKiem.value.trim();
  const queQuan = oQueQuanTimKiem.value.trim();
  const donVi = oDonViTimKiem.value.trim();
  const thoiGian = oThoiGianTimKiem.value.trim();

  const soTruongDaDien = [queQuan, donVi, thoiGian].filter(Boolean).length;

  if (hoTen === "" || soTruongDaDien < 1) {
    thongBaoTimKiem.classList.add("text-loi");
    thongBaoTimKiem.textContent =
      "Vui lòng nhập họ tên và ít nhất 1 trong 3 thông tin (quê quán, đơn vị, năm hy sinh).";
    danhSachTimKiem.innerHTML = "";
    return;
  }

  thongBaoTimKiem.classList.remove("text-loi");
  thongBaoTimKiem.textContent = "";
  danhSachTimKiem.innerHTML = htmlKhungXuong(2);

  nutTimKiem.disabled = true;
  nutTimKiem.classList.add("dang-xu-ly");

  try {
    const { data, error } = await goiActionCongKhai("tim_ho_so_theo_ten", {
      hoTen,
      queQuan: queQuan || null,
      donVi: donVi || null,
      thoiGian: thoiGian || null,
    });

    if (error) {
      thongBaoTimKiem.classList.add("text-loi");
      thongBaoTimKiem.textContent = "Lỗi khi tìm kiếm: " + error;
      danhSachTimKiem.innerHTML = "";
      return;
    }

    if (!data || data.length === 0) {
      thongBaoTimKiem.textContent = "Không tìm thấy hồ sơ nào khớp với thông tin đã nhập.";
      danhSachTimKiem.innerHTML = "";
      return;
    }

    thongBaoTimKiem.textContent = `Tìm thấy ${data.length} hồ sơ.`;

    danhSachTimKiem.innerHTML = data
      .map((hoSo) => {
        const banGhiRaSoat =
          hoSo.can_ra_soat_thu_cong && hoSo.can_ra_soat_thu_cong.length > 0
            ? hoSo.can_ra_soat_thu_cong[0]
            : null;
        const trangThai = banGhiRaSoat ? banGhiRaSoat.trang_thai_ho_so : null;

        return `
          <div class="the-ket-qua hien-dan">
            <p><strong>Họ tên:</strong> ${escapeHTML(hoSo.ho_ten)}</p>
            <p>Quê quán: ${escapeHTML(hoSo.que_quan) || "(chưa rõ)"} | Đơn vị: ${escapeHTML(hoSo.don_vi) || "(chưa rõ)"} | Năm hy sinh: ${escapeHTML(hoSo.nam_hy_sinh) || "(chưa rõ)"}</p>
            <p><strong>Mã hồ sơ:</strong> <span class="ma-ho-so">#${escapeHTML(String(hoSo.id))}</span></p>
            <p><strong>Trạng thái:</strong> ${htmlBadgeTrangThai(trangThai)}</p>
          </div>
        `;
      })
      .join("");
  } finally {
    // Luôn mở khoá lại nút dù thành công hay lỗi, tránh kẹt trạng thái "đang tìm".
    nutTimKiem.disabled = false;
    nutTimKiem.classList.remove("dang-xu-ly");
  }
}

nutTimKiem.addEventListener("click", timHoSoTheoTen);
[oTimKiem, oQueQuanTimKiem, oDonViTimKiem, oThoiGianTimKiem].forEach((o) => {
  o.addEventListener("keydown", (e) => {
    if (e.key === "Enter") timHoSoTheoTen();
  });
});