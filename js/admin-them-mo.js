// Tham chiếu các phần tử trên trang 
const thongBaoXuLy = document.getElementById("thong-bao-xu-ly");
const danhSachKetQuaNguoc = document.getElementById("danh-sach-ket-qua-nguoc");
const nutTimHoSo = document.getElementById("nut-tim-ho-so");

// ----- Hàm gọi Edge Function dùng chung -----
const EDGE_FUNCTION_URL = "https://zidorfsicyswxgjvvmax.supabase.co/functions/v1/admin-actions";

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

// ----- Khi bấm "Tìm kiếm + Lưu mộ mới" -----
async function xuLyNhapMo() {
  thongBaoXuLy.textContent = "Đang xử lý...";
  danhSachKetQuaNguoc.innerHTML = "";

  const moMoi = {
    ten_tren_bia: document.getElementById("ten-tren-bia").value || null,
    que_quan_id: document.getElementById("que-quan-id").value || "AG-TINH",
    que_quan: document.getElementById("que-quan-text").value || "An Giang",
    don_vi: document.getElementById("don-vi").value || null,
    nam_hy_sinh: document.getElementById("thoi-gian").value || null,
    nam_sinh: document.getElementById("nam-sinh").value || null,
    dia_diem: document.getElementById("dia-diem-hy-sinh").value || null,
    mo_ta: document.getElementById("mo-ta").value || null,
  };

  // Bước 1: Lưu mộ mới — qua Edge Function
  const { data: dataMoMoi, error: errorThem } = await goiAdminAction("them_mo_moi", { moMoi });

  if (errorThem) {
    thongBaoXuLy.textContent = "Lỗi khi lưu mộ mới: " + errorThem;
    console.error("Lỗi lưu mộ:", errorThem);
    return;
  }

  const moMoiDaLuu = dataMoMoi[0];

  // Bước 2: Tải toàn bộ hồ sơ gia đình đã khai báo — qua Edge Function
  const { data: danhSachHoSo, error: errorHoSo } = await goiAdminAction("lay_khai_bao_gia_dinh");

  if (errorHoSo) {
    thongBaoXuLy.textContent = "Lỗi khi tải hồ sơ gia đình: " + errorHoSo;
    console.error("Lỗi tải hồ sơ:", errorHoSo);
    return;
  }

    // Bước 3: Tải bảng địa danh (không bị RLS chặn, gọi trực tiếp)
  const { data: bangDiaDanh, error: errorDiaDanh } = await supabaseClient
    .from("dia_danh_lich_su")
    .select("*");

  const danhSachDiaDanh = errorDiaDanh ? [] : bangDiaDanh;

  // Bước 3b: Tải danh mục dia_danh_nhom để hiển thị tên xã/phường thay vì id thô
  const { data: dsDiaDanhNhom, error: errorDiaDanhNhom } = await supabaseClient
    .from("dia_danh_nhom")
    .select("id, ten_nhom");

  const banDoTenDiaDanh = {};
  if (!errorDiaDanhNhom && dsDiaDanhNhom) {
    dsDiaDanhNhom.forEach((dd) => { banDoTenDiaDanh[dd.id] = dd.ten_nhom; });
  }

  // Bước 4: Chạy matching.js
  const ketQuaMatching = timTop10HoSoKemMoRong(moMoiDaLuu, danhSachHoSo, danhSachDiaDanh);

  // Bước 5: Ghi các hồ sơ gia đình khớp với mộ mới vào bảng
  // ho_so_cho_xet_nghiem để qtv đối chiếu/phân loại tiếp.
  await ghiHoSoChoXetNghiemTuMoMoi(moMoiDaLuu.id, ketQuaMatching);

  // Bước 6: Hiển thị kết quả
    hienThiKetQuaNguoc(ketQuaMatching, moMoiDaLuu, banDoTenDiaDanh);
}

function xepNhomDiem(tongDiem, cheDo) {
  if (cheDo === "mo_rong") return "mo_rong";
  if (tongDiem >= 80) return "cao";
  if (tongDiem >= 60) return "kha";
  return "can_xac_minh";
}

async function ghiHoSoChoXetNghiemTuMoMoi(moId, ketQuaMatching) {
  const cheDo = ketQuaMatching.che_do;
  const danhSachUngVien = ketQuaMatching.ket_qua || [];

  if (danhSachUngVien.length === 0) return;

  const cacDongCanGhi = danhSachUngVien.map((ketQua) => ({
    khai_bao_id: ketQua.hoSo.id,
    mo_id: moId,
    tong_diem: ketQua.tong_diem,
    so_truong_so_sanh: ketQua.so_truong_so_sanh || null,
    che_do: cheDo,
    do_tin_cay: ketQua.do_tin_cay,
    chi_tiet_diem: ketQua.chi_tiet,
    nhom_diem: xepNhomDiem(ketQua.tong_diem, cheDo),
  }));

  const { error } = await supabaseClient
    .from("ho_so_cho_xet_nghiem")
    .insert(cacDongCanGhi);

  if (error) {
    console.error("Lỗi khi ghi hồ sơ chờ đối chiếu (từ mộ mới):", error);
  }
}

// ----- Hiển thị kết quả chiều ngược -----
function hienThiKetQuaNguoc(ketQuaMatching, moMoi, banDoTenDiaDanh) {
  const top10HoSo = ketQuaMatching.ket_qua;
  const laCheDoMoRong = ketQuaMatching.che_do === "mo_rong";

  let noiDung = `
    <hr>
    <h2>Kết quả: Hồ sơ gia đình khả năng khớp với mộ "${escapeHTML(moMoi.ten_tren_bia) || "(chưa rõ tên)"}"</h2>
  `;

  if (top10HoSo.length === 0) {
    noiDung += "<p>Không có hồ sơ gia đình nào đủ tin cậy để khớp với mộ này, kể cả ở chế độ mở rộng. Mộ đã được lưu, sẽ tiếp tục đối chiếu khi có hồ sơ mới khai báo.</p>";
  } else if (laCheDoMoRong) {
    noiDung += `
      <p class="ghi-chu-ra-soat">
        Không có hồ sơ nào khớp chính xác họ tên. Danh sách dưới đây là ${top10HoSo.length}
        kết quả mở rộng dựa trên quê quán, đơn vị và năm hy sinh — tên trên bia có thể là
        bí danh, cần xác minh kỹ trước khi liên hệ gia đình.
      </p>
    `;
  } else {
    noiDung += `<p>Mộ đã lưu vào Supabase. Danh sách dưới đây là ${top10HoSo.length} hồ sơ gia đình khớp họ tên và có điểm bổ trợ cao nhất:</p>`;
  }

  if (top10HoSo.length > 0) {
    noiDung += top10HoSo
      .map((ketQua, thuHang) => {
        const hoSo = ketQua.hoSo;
        const diem = ketQua.tong_diem;
        const chiTiet = ketQua.chi_tiet;

        return `
          <div class="the-ket-qua${laCheDoMoRong ? " mo-rong" : ""}">
            <h3>#${thuHang + 1} — ${escapeHTML(hoSo.ho_ten) || "(chưa rõ tên)"} — ${diem}/100 điểm</h3>
            <p>Quê quán: ${escapeHTML(banDoTenDiaDanh[hoSo.que_quan_id]) || "(chưa rõ)"} | Đơn vị: ${escapeHTML(hoSo.don_vi) || "(chưa rõ)"} | Năm: ${escapeHTML(hoSo.nam_hy_sinh) || "(chưa rõ)"}</p>
            <p class="chi-tiet-diem">
              Chi tiết điểm — Tên: ${escapeHTML(chiTiet.ten)} | Quê quán: ${escapeHTML(chiTiet.que_quan)} | Đơn vị: ${escapeHTML(chiTiet.don_vi)} | Năm: ${escapeHTML(chiTiet.nam_hy_sinh)}
            </p>
            <p class="do-tin-cay">
              Độ tin cậy: <strong>${escapeHTML(ketQua.do_tin_cay)}</strong>
            </p>
          </div>
        `;
      })
      .join("");
  }

  thongBaoXuLy.textContent = "✓ Mộ mới đã lưu. Đây là kết quả tìm kiếm ngược:";
  danhSachKetQuaNguoc.innerHTML = noiDung;
}

nutTimHoSo.addEventListener("click", xuLyNhapMo);

// ----- Đăng xuất -----
const nutLogout = document.getElementById("logout-btn");

if (nutLogout) {
  nutLogout.addEventListener("click", () => {
    sessionStorage.removeItem("adminPassword");
    window.location.href = "auth.html";
  });
}
