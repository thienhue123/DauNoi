// ===== TRANG QUẢN LÝ RÀ SOÁT THỦ CÔNG (NỘI BỘ) =====
// Bảo mật thật: mọi thao tác đọc/ghi bảng can_ra_soat_thu_cong đều đi qua
// Supabase Edge Function "admin-actions".

const danhSachRaSoat = document.getElementById("danh-sach-ra-soat");

// Danh sách trạng thái lấy từ bảng trang_thai_ho_so (tải 1 lần khi vào trang)
let danhSachTrangThai = [];

// ----- Kiểm tra đăng nhập (dùng cùng cơ chế sessionStorage.adminPassword
// như Dashboard.js) -----
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

// ----- Tải song song: danh sách cần rà soát + danh sách trạng thái -----
async function taiDuLieuVaHienThi() {
  danhSachRaSoat.innerHTML = "<p>Đang tải...</p>";

  // 1. Lấy danh sách rà soát trước
  const ketQuaRaSoat = await goiAdminAction("lay_danh_sach_ra_soat");

  console.log("KẾT QUẢ lay_danh_sach_ra_soat:", ketQuaRaSoat);

  if (ketQuaRaSoat.error) {
    danhSachRaSoat.innerHTML =
      `<p style="color:red;">Lỗi tải danh sách: ${escapeHTML(ketQuaRaSoat.error)}</p>`;
    return;
  }

  // 2. Sau khi request 1 thành công mới lấy trạng thái
  const ketQuaTrangThai = await goiAdminAction("lay_trang_thai_ho_so");

  console.log("KẾT QUẢ lay_trang_thai_ho_so:", ketQuaTrangThai);

  if (ketQuaTrangThai.error) {
    danhSachRaSoat.innerHTML =
      `<p style="color:red;">Lỗi tải trạng thái: ${escapeHTML(ketQuaTrangThai.error)}</p>`;
    return;
  }

  danhSachTrangThai = ketQuaTrangThai.data;
  hienThiDanhSach(ketQuaRaSoat.data);
}

// ----- Render danh sách hồ sơ cần rà soát -----
function hienThiDanhSach(data) {
  if (data.length === 0) {
    danhSachRaSoat.innerHTML = "<p>Chưa có trường hợp nào cần rà soát.</p>";
    return;
  }

  // Các trường ho_ten_gia_dinh_khai, ten_tren_bia_mo, ly_do đến từ dữ liệu
  // người dùng tự khai -> luôn escapeHTML() trước khi chèn vào innerHTML.
  danhSachRaSoat.innerHTML = data.map((dong) => taoHtmlThe(dong)).join("");

  ganSuKienChoCacThe(data);
}

// ----- Tìm thông tin trạng thái (tên, mô tả, màu) theo id -----
function timTrangThaiTheoId(id) {
  return danhSachTrangThai.find((tt) => String(tt.id) === String(id));
}

// ----- Tạo HTML cho 1 thẻ hồ sơ, tùy theo đã gán trạng thái hay chưa -----
function taoHtmlThe(dong) {
  const daCoTrangThai = !!dong.trang_thai_id;

  return `
    <div class="the-ket-qua ${dong.da_rot_soat ? "da-rot-soat" : ""}" data-id="${dong.id}">
      <p><strong>Gia đình khai:</strong> ${escapeHTML(dong.ho_ten_gia_dinh_khai) || "(chưa rõ)"}</p>
      <p><strong>Mộ liên quan:</strong> ${escapeHTML(dong.ten_tren_bia_mo) || "(chưa rõ)"}</p>
      <p>Số trường so sánh được: ${dong.so_truong_so_sanh} | Điểm: ${dong.tong_diem} | Lý do: ${escapeHTML(dong.ly_do)}</p>

      <div class="vung-trang-thai-ra-soat" data-id="${dong.id}">
        ${daCoTrangThai ? htmlTrangThaiDaLuu(dong) : htmlFormRaSoat(dong)}
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
      <strong>Trạng thái:</strong>
      <span class="nhan-trang-thai" style="background-color:${mauSac};">${moTa}</span>
    </p>
    ${dong.ghi_chu_admin ? `<p class="ghi-chu-ra-soat"><strong>Ghi chú:</strong> ${escapeHTML(dong.ghi_chu_admin)}</p>` : ""}
    <button class="nut-sua-lai" data-id="${dong.id}">Sửa lại</button>
  `;
}

// ----- Chưa có trạng thái: hiện form chọn trạng thái (lấy từ trang_thai_ho_so) + ghi chú -----
function htmlFormRaSoat(dong) {
  const tuyChon = danhSachTrangThai
    .map((tt) => `<option value="${tt.id}">${escapeHTML(tt.mo_ta)}</option>`)
    .join("");

  return `
    <label>Trạng thái</label>
    <select class="chon-trang-thai" data-id="${dong.id}">
      <option value="">-- Chọn trạng thái --</option>
      ${tuyChon}
    </select>
    <label>Ghi chú (tùy chọn)</label>
    <textarea class="ghi-chu-input" data-id="${dong.id}" placeholder="VD: Trùng quê quán nhưng năm hy sinh lệch 2 năm..."></textarea>
    <button class="nut-luu-trang-thai" data-id="${dong.id}">Lưu trạng thái</button>
  `;
}

// ----- Gắn sự kiện cho các nút/form vừa render -----
function ganSuKienChoCacThe(data) {
  // Nút Lưu trạng thái
  document.querySelectorAll(".nut-luu-trang-thai").forEach((nut) => {
    nut.addEventListener("click", () => {
      const id = nut.dataset.id;
      const the = nut.closest(".vung-trang-thai-ra-soat");
      const trangThaiId = the.querySelector(".chon-trang-thai").value;
      const ghiChu = the.querySelector(".ghi-chu-input").value.trim();

      if (!trangThaiId) {
        alert("Vui lòng chọn trạng thái.");
        return;
      }

      luuTrangThaiRaSoat(id, trangThaiId, ghiChu);
    });
  });

  // Nút Sửa lại: cho phép chọn lại trạng thái của 1 hồ sơ đã rà soát
  document.querySelectorAll(".nut-sua-lai").forEach((nut) => {
    nut.addEventListener("click", () => {
      const id = nut.dataset.id;
      const dong = data.find((d) => String(d.id) === String(id));
      const vung = nut.closest(".vung-trang-thai-ra-soat");
      vung.innerHTML = htmlFormRaSoat(dong);
      ganSuKienChoCacThe(data);
    });
  });
}

// ----- Lưu trạng thái rà soát (qua Edge Function) -----
async function luuTrangThaiRaSoat(id, trangThaiId, ghiChu) {
  const { error } = await goiAdminAction("luu_trang_thai_ra_soat", {
    id,
    trangThaiId,
    ghiChu,
  });

  if (error) {
    alert("Lỗi khi lưu trạng thái: " + error);
    console.error("Lỗi lưu trạng thái rà soát:", error);
    return;
  }

  // Tải lại danh sách để cập nhật giao diện
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