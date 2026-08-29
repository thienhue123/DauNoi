// ===== TRANG ĐỐI CHIẾU & PHÂN LOẠI XÉT NGHIỆM (NỘI BỘ) =====
// Bảo mật thật: mọi thao tác đọc/ghi bảng ho_so_cho_xet_nghiem đều đi qua
// Supabase Edge Function "admin-actions" (bảng chỉ cho anon INSERT, không
// cho SELECT/UPDATE trực tiếp).

const boLocTrangThai = document.getElementById("bo-loc-trang-thai");
const danhSachDoiChieu = document.getElementById("danh-sach-doi-chieu");

// Danh sách trạng thái lấy từ bảng trang_thai_xet_nghiem (tải 1 lần)
let danhSachTrangThai = [];
// Toàn bộ dữ liệu tải về, giữ lại để lọc lại khi đổi bộ lọc mà không gọi lại API
let tatCaHoSo = [];
let bocLocHienTai = "chua_phan_loai"; // 'tat_ca' | 'chua_phan_loai' | 'da_phan_loai'

// Thứ tự + nhãn hiển thị của từng nhóm điểm, để rà soát từ đáng tin cậy nhất trở xuống
const THU_TU_NHOM_DIEM = [
  { ma: "cao", nhan: "Điểm cao (≥ 80)", ghiChu: "Rất đáng tin cậy — nên ưu tiên xem trước." },
  { ma: "kha", nhan: "Điểm khá (60 – 79)", ghiChu: "Khá tin cậy, nên xác minh thêm trước khi kết luận." },
  { ma: "can_xac_minh", nhan: "Cần xác minh thêm (< 60)", ghiChu: "Tên khớp nhưng các trường phụ khớp ít — cần rà soát kỹ." },
  { ma: "mo_rong", nhan: "Mở rộng — nghi bí danh", ghiChu: "Tên trên bia không khớp chính xác, chỉ khớp theo quê quán/đơn vị/năm." },
];

// ----- Kiểm tra đăng nhập (dùng cùng cơ chế sessionStorage.adminPassword) -----
document.addEventListener("DOMContentLoaded", () => {
  const adminPassword = sessionStorage.getItem("adminPassword");

  if (!adminPassword) {
    window.location.href = "auth.html";
    return;
  }

  taiDuLieuVaHienThi();
});

// ----- Hàm gọi Edge Function dùng chung -----
const EDGE_FUNCTION_URL =
  "https://zidorfsicyswxgjvvmax.supabase.co/functions/v1/admin-actions";

async function goiAdminAction(action, payload = {}) {
  const password = sessionStorage.getItem("adminPassword");

  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": password,
    },
    body: JSON.stringify({ action, payload }),
  });

  return res.json();
}

// ----- Tải song song: danh sách chờ đối chiếu + danh sách trạng thái -----
async function taiDuLieuVaHienThi() {
  danhSachDoiChieu.innerHTML = "<p>Đang tải...</p>";

  const ketQuaDanhSach = await goiAdminAction("lay_danh_sach_cho_xet_nghiem");

  if (ketQuaDanhSach.error) {
    danhSachDoiChieu.innerHTML =
      `<p style="color:red;">Lỗi tải danh sách: ${escapeHTML(ketQuaDanhSach.error)}</p>`;
    return;
  }

  const ketQuaTrangThai = await goiAdminAction("lay_trang_thai_xet_nghiem");

  if (ketQuaTrangThai.error) {
    danhSachDoiChieu.innerHTML =
      `<p style="color:red;">Lỗi tải trạng thái: ${escapeHTML(ketQuaTrangThai.error)}</p>`;
    return;
  }

  danhSachTrangThai = ketQuaTrangThai.data;
  tatCaHoSo = ketQuaDanhSach.data;

  hienThiBoLoc();
  hienThiTheoNhom();
}

// ----- Bộ lọc: Tất cả / Chưa phân loại / Đã phân loại -----
function hienThiBoLoc() {
  const soChuaPhanLoai = tatCaHoSo.filter((d) => !d.trang_thai_id).length;
  const soDaPhanLoai = tatCaHoSo.length - soChuaPhanLoai;

  const tuyChon = [
    { ma: "chua_phan_loai", nhan: `Chưa phân loại (${soChuaPhanLoai})` },
    { ma: "da_phan_loai", nhan: `Đã phân loại (${soDaPhanLoai})` },
    { ma: "tat_ca", nhan: `Tất cả (${tatCaHoSo.length})` },
  ];

  boLocTrangThai.innerHTML = tuyChon
    .map(
      (tc) => `
        <button
          type="button"
          class="nut-loc-xet-nghiem${tc.ma === bocLocHienTai ? " dang-chon" : ""}"
          data-loc="${tc.ma}"
        >${escapeHTML(tc.nhan)}</button>
      `
    )
    .join("");

  boLocTrangThai.querySelectorAll(".nut-loc-xet-nghiem").forEach((nut) => {
    nut.addEventListener("click", () => {
      bocLocHienTai = nut.dataset.loc;
      hienThiBoLoc();
      hienThiTheoNhom();
    });
  });
}

// ----- Lọc dữ liệu theo bộ lọc trạng thái đang chọn -----
function locDuLieuTheoTrangThai() {
  if (bocLocHienTai === "chua_phan_loai") return tatCaHoSo.filter((d) => !d.trang_thai_id);
  if (bocLocHienTai === "da_phan_loai") return tatCaHoSo.filter((d) => !!d.trang_thai_id);
  return tatCaHoSo;
}

// ----- Render toàn bộ danh sách, chia theo nhóm điểm -----
function hienThiTheoNhom() {
  const duLieuDaLoc = locDuLieuTheoTrangThai();

  if (duLieuDaLoc.length === 0) {
    danhSachDoiChieu.innerHTML = "<p>Không có hồ sơ nào phù hợp với bộ lọc hiện tại.</p>";
    return;
  }

  let html = "";

  THU_TU_NHOM_DIEM.forEach((nhom) => {
    const dsTrongNhom = duLieuDaLoc.filter((d) => d.nhom_diem === nhom.ma);
    if (dsTrongNhom.length === 0) return;

    html += `
      <div class="menu-section nhom-diem-xet-nghiem nhom-diem-xet-nghiem-${escapeHTML(nhom.ma)}">
        <h2>${escapeHTML(nhom.nhan)} — ${dsTrongNhom.length} hồ sơ</h2>
        <p class="ghi-chu-nhom-xet-nghiem">${escapeHTML(nhom.ghiChu)}</p>
        ${dsTrongNhom.map((dong) => taoHtmlThe(dong)).join("")}
      </div>
    `;
  });

  danhSachDoiChieu.innerHTML = html || "<p>Không có hồ sơ nào phù hợp với bộ lọc hiện tại.</p>";
  ganSuKienChoCacThe();
}

// ----- Tìm thông tin trạng thái (tên, mô tả, màu) theo id -----
function timTrangThaiTheoId(id) {
  return danhSachTrangThai.find((tt) => String(tt.id) === String(id));
}

// ----- Tạo HTML cho 1 thẻ hồ sơ (1 cặp hồ sơ gia đình - mộ) -----
function taoHtmlThe(dong) {
  const giaDinh = dong.khai_bao_gia_dinh || {};
  const mo = dong.mo_chua_danh_tinh || {};
  const chiTiet = dong.chi_tiet_diem || {};
  const laMoRong = dong.che_do === "mo_rong";

  return `
    <div class="the-ket-qua${laMoRong ? " mo-rong" : ""}" data-id="${dong.id}">
      <h3>${escapeHTML(giaDinh.ho_ten) || "(chưa rõ tên)"} ↔ ${escapeHTML(mo.ten_tren_bia) || "(chưa rõ tên trên bia)"} — ${dong.tong_diem}/100 điểm</h3>

      <p>
        <strong>Gia đình khai:</strong>
        Quê quán: ${escapeHTML(giaDinh.que_quan) || "(chưa rõ)"} |
        Đơn vị: ${escapeHTML(giaDinh.don_vi) || "(chưa rõ)"} |
        Năm sinh: ${escapeHTML(giaDinh.nam_sinh) || "(chưa rõ)"} |
        Năm hy sinh: ${escapeHTML(giaDinh.nam_hy_sinh) || "(chưa rõ)"} |
        Địa điểm hy sinh: ${escapeHTML(giaDinh.dia_diem_hy_sinh) || "(chưa rõ)"}
      </p>
      <p>
        <strong>Mộ liên quan:</strong>
        Quê quán: ${escapeHTML(mo.que_quan) || "(chưa rõ)"} |
        Đơn vị: ${escapeHTML(mo.don_vi) || "(chưa rõ)"} |
        Năm sinh: ${escapeHTML(mo.nam_sinh) || "(chưa rõ)"} |
        Năm hy sinh: ${escapeHTML(mo.nam_hy_sinh) || "(chưa rõ)"} |
        Địa điểm hy sinh: ${escapeHTML(mo.dia_diem_hy_sinh ||mo.dia_diem) || "(chưa rõ)"}
      </p>

      <p class="chi-tiet-diem">
        Chi tiết điểm — Tên: ${escapeHTML(chiTiet.ten)} | Quê quán: ${escapeHTML(chiTiet.que_quan)} | Đơn vị: ${escapeHTML(chiTiet.don_vi)} | Năm sinh: ${escapeHTML(chiTiet.nam_sinh)} | Năm hy sinh: ${escapeHTML(chiTiet.nam_hy_sinh)} | Địa điểm hy sinh: ${escapeHTML(chiTiet.dia_diem_hy_sinh)}
      </p>
      <p class="do-tin-cay">
        Độ tin cậy: <strong>${escapeHTML(dong.do_tin_cay)}</strong>
        ${dong.so_truong_so_sanh ? ` (so sánh được trên ${dong.so_truong_so_sanh}/6 trường)` : ""}
      </p>

      <div class="vung-trang-thai-xet-nghiem" data-id="${dong.id}">
        ${dong.trang_thai_id ? htmlTrangThaiDaLuu(dong) : htmlFormPhanLoai(dong)}
      </div>
    </div>
  `;
}

// ----- Đã có trạng thái: hiện badge màu + ghi chú + nút Sửa lại -----
function htmlTrangThaiDaLuu(dong) {
  const trangThai = timTrangThaiTheoId(dong.trang_thai_id);
  const mauSac = trangThai ? escapeHTML(trangThai.mau_sac) : "#999";
  const moTa = trangThai ? escapeHTML(trangThai.mo_ta) : "(trạng thái không xác định)";

  return `
    <p>
      <strong>Phân loại:</strong>
      <span class="nhan-trang-thai" style="background-color:${mauSac};">${moTa}</span>
    </p>
    ${dong.ghi_chu_admin ? `<p class="ghi-chu-ra-soat"><strong>Ghi chú:</strong> ${escapeHTML(dong.ghi_chu_admin)}</p>` : ""}
    <button class="nut-sua-lai-xet-nghiem" data-id="${dong.id}">Sửa lại</button>
  `;
}

// ----- Chưa có trạng thái: hiện form chọn trạng thái + ghi chú -----
function htmlFormPhanLoai(dong) {
  const tuyChon = danhSachTrangThai
    .map((tt) => `<option value="${tt.id}">${escapeHTML(tt.mo_ta)}</option>`)
    .join("");

  return `
    <label>Phân loại</label>
    <select class="chon-trang-thai-xet-nghiem" data-id="${dong.id}">
      <option value="">-- Chọn phân loại --</option>
      ${tuyChon}
    </select>
    <label>Ghi chú (tùy chọn)</label>
    <textarea class="ghi-chu-input-xet-nghiem" data-id="${dong.id}" placeholder="VD: Đã liên hệ gia đình, chờ lịch lấy mẫu..."></textarea>
    <button class="nut-luu-phan-loai-xet-nghiem" data-id="${dong.id}">Lưu phân loại</button>
  `;
}

// ----- Gắn sự kiện cho các nút/form vừa render -----
function ganSuKienChoCacThe() {
  document.querySelectorAll(".nut-luu-phan-loai-xet-nghiem").forEach((nut) => {
    nut.addEventListener("click", () => {
      const id = nut.dataset.id;
      const the = nut.closest(".vung-trang-thai-xet-nghiem");
      const trangThaiId = the.querySelector(".chon-trang-thai-xet-nghiem").value;
      const ghiChu = the.querySelector(".ghi-chu-input-xet-nghiem").value.trim();

      if (!trangThaiId) {
        alert("Vui lòng chọn phân loại.");
        return;
      }

      luuPhanLoaiXetNghiem(id, trangThaiId, ghiChu);
    });
  });

  document.querySelectorAll(".nut-sua-lai-xet-nghiem").forEach((nut) => {
    nut.addEventListener("click", () => {
      const id = nut.dataset.id;
      const dong = tatCaHoSo.find((d) => String(d.id) === String(id));
      const vung = nut.closest(".vung-trang-thai-xet-nghiem");
      vung.innerHTML = htmlFormPhanLoai(dong);
      ganSuKienChoCacThe();
    });
  });
}

// ----- Lưu phân loại (qua Edge Function) -----
async function luuPhanLoaiXetNghiem(id, trangThaiId, ghiChu) {
  const { error } = await goiAdminAction("luu_trang_thai_xet_nghiem", {
    id,
    trangThaiId,
    ghiChu,
  });

  if (error) {
    alert("Lỗi khi lưu phân loại: " + error);
    console.error("Lỗi lưu phân loại:", error);
    return;
  }

  taiDuLieuVaHienThi();
}

// ----- Đăng xuất -----
const nutLogout = document.getElementById("logout-btn");

if (nutLogout) {
  nutLogout.addEventListener("click", () => {
    sessionStorage.removeItem("adminPassword");
    window.location.href = "auth.html";
  });
}
