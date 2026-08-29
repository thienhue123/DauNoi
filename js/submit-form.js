// ===== BẮT SỰ KIỆN SUBMIT CỦA FORM =====
const form = document.getElementById("form-khai-bao");
const nutGui = form.querySelector("button[type='submit']");
const thongBaoKetQua = document.getElementById("thong-bao-ket-qua");

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const hoTen = document.getElementById("ho-ten").value.trim();
  const queQuanId = document.getElementById("que-quan-id").value.trim();
  const queQuanText = document.getElementById("que-quan-text").value.trim();
  const donVi = document.getElementById("don-vi").value.trim();
  const namHySinh = document.getElementById("thoi-gian").value.trim();
  const namSinh = document.getElementById("nam-sinh").value.trim();
  const diaDiemHySinh = document.getElementById("dia-diem-hy-sinh").value.trim();
  const ghiChu = document.getElementById("ghi-chu").value.trim();
  const lienHe = document.getElementById("lien-he").value.trim();
  

  if (hoTen === "") {
    thongBaoKetQua.style.color = "red";
    thongBaoKetQua.textContent = "Vui lòng nhập họ và tên liệt sĩ.";
    return;
  }

  if (lienHe === "") {
    thongBaoKetQua.style.color = "red";
    thongBaoKetQua.textContent = "Vui lòng nhập số điện thoại hoặc email liên hệ.";
    return;
  }

  const laEmail = lienHe.includes("@");
  const sdt = laEmail ? null : lienHe;
  const email = laEmail ? lienHe : null;

  const hoSo = {
    ho_ten: hoTen,
    que_quan_id: queQuanId || "AG-TINH",
    que_quan: queQuanText || "An Giang",
    don_vi: donVi || null,
    nam_hy_sinh: namHySinh || null,
    nam_sinh: namSinh || null,
    dia_diem_hy_sinh: diaDiemHySinh || null,
    ghi_chu: ghiChu || null,
    sdt: sdt,
    email: email,
    anh_urls: window.anhDaTaiLen && window.anhDaTaiLen.length > 0 ? window.anhDaTaiLen : null,
  };

  nutGui.disabled = true;
  nutGui.textContent = "Đang gửi...";
  thongBaoKetQua.style.color = "";
  thongBaoKetQua.textContent = "";

  const { data, error } = await supabaseClient.rpc("gui_khai_bao", {
    p_ho_ten: hoSo.ho_ten,
    p_que_quan_id: hoSo.que_quan_id,
    p_que_quan: hoSo.que_quan,
    p_don_vi: hoSo.don_vi,
    p_nam_hy_sinh: hoSo.nam_hy_sinh,
    p_nam_sinh: hoSo.nam_sinh,
    p_dia_diem_hy_sinh: hoSo.dia_diem_hy_sinh,
    p_ghi_chu: hoSo.ghi_chu,
    p_sdt: hoSo.sdt,
    p_email: hoSo.email,
    p_anh_urls: hoSo.anh_urls,
  });

  if (error) {
    nutGui.disabled = false;
    nutGui.textContent = "Gửi khai báo";
    console.error("Lỗi khi gửi lên Supabase:", error);
    thongBaoKetQua.style.color = "red";
    thongBaoKetQua.textContent =
      "Có lỗi xảy ra, chưa lưu được thông tin. Chi tiết: " + error.message;
    return;
  }

  const khaiBaoId = data || null;
  window.anhDaTaiLen = [];
  document.getElementById("khung-xem-truoc-anh").innerHTML = "";
  thongBaoKetQua.style.color = "#2e7d32";
  thongBaoKetQua.textContent = "✓ Đã gửi khai báo thành công. Đang chuyển đến trang kết quả...";
  form.reset();

  await chayMatchingRoiChuyenTrang(hoSo, khaiBaoId);
});

async function chayMatchingRoiChuyenTrang(hoSo, khaiBaoId) {
  const [ketQuaMo, ketQuaDiaDanh] = await Promise.all([
    supabaseClient.from("mo_chua_danh_tinh").select("*"),
    supabaseClient.from("dia_danh_lich_su").select("*"),
  ]);

  if (ketQuaMo.error) {
    sessionStorage.setItem(
      "ket_qua_vua_khai_bao",
      JSON.stringify({ loi: "Không thể tải dữ liệu mộ để so khớp: " + ketQuaMo.error.message })
    );
    window.location.href = "ket-qua.html";
    return;
  }

  const danhSachMo = ketQuaMo.data || [];
  const bangDiaDanh = ketQuaDiaDanh.error ? [] : ketQuaDiaDanh.data || [];

  // Chạy chế độ chuẩn trước; nếu 0 kết quả, matching.js tự chuyển sang chế độ
  // mở rộng (bí danh) — xem timTop10MoKemMoRong() trong matching.js.
  const ketQuaMatching = timTop10MoKemMoRong(hoSo, danhSachMo, bangDiaDanh);
  const ketQuaKhopTen = ketQuaMatching.che_do === "chuan" ? ketQuaMatching.ket_qua : [];
  const ketQuaMoRong = ketQuaMatching.che_do === "mo_rong" ? ketQuaMatching.ket_qua : [];

  // Không có kết quả ở CẢ HAI chế độ mới coi là cần rà soát thủ công.
  if (ketQuaKhopTen.length === 0 && ketQuaMoRong.length === 0) {
  const lyDo = danhSachMo.length === 0
    ? "Chưa có dữ liệu mộ nào trong hệ thống để đối chiếu."
    : "Không có mộ nào khớp, kể cả ở chế độ mở rộng. Hồ sơ đã được lưu để tiếp tục đối chiếu khi có dữ liệu mộ mới hoặc được rà soát thủ công.";

    await ghiRaSoatNeuCan(hoSo, null, lyDo, null, khaiBaoId);
  } else {
    // Có ít nhất 1 kết quả khớp — ghi từng ứng viên vào bảng
    // ho_so_cho_xet_nghiem để qtv đối chiếu/phân loại tiếp.
    await ghiHoSoChoXetNghiemNeuKhop(khaiBaoId, ketQuaMatching);
  }

  sessionStorage.setItem(
    "ket_qua_vua_khai_bao",
    JSON.stringify({
      hoSo,
      khaiBaoId,
      nhomChinh: ketQuaKhopTen,
      nhomTenKhacCanXacMinh: ketQuaMoRong,
      nhomCanRaSoat: [],
    })
  );

  window.location.href = "ket-qua.html";
}

// ===== BƯỚC ĐỐI CHIẾU & PHÂN LOẠI XÉT NGHIỆM =====
function xepNhomDiem(tongDiem, cheDo) {
  if (cheDo === "mo_rong") return "mo_rong";
  if (tongDiem >= 80) return "cao";
  if (tongDiem >= 60) return "kha";
  return "can_xac_minh";
}

async function ghiHoSoChoXetNghiemNeuKhop(khaiBaoId, ketQuaMatching) {
  const cheDo = ketQuaMatching.che_do; // 'chuan' | 'mo_rong'
  const danhSachUngVien = ketQuaMatching.ket_qua || [];

  if (danhSachUngVien.length === 0) return;

  const cacDongCanGhi = danhSachUngVien.map((ketQua) => ({
    khai_bao_id: khaiBaoId,
    mo_id: ketQua.mo.id,
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
    console.error("Lỗi khi ghi hồ sơ chờ đối chiếu:", error);
  }
}

// ----- Ghi vào bảng can_ra_soat_thu_cong khi không đủ tin cậy để kết luận -----
async function ghiRaSoatNeuCan(hoSo, moLienQuan, lyDo, ketQua, khaiBaoId) {
  const dong = {
    ho_ten_gia_dinh_khai: hoSo.ho_ten,
    ten_tren_bia_mo: moLienQuan ? moLienQuan.ten_tren_bia : null,
    so_truong_so_sanh: ketQua ? ketQua.so_truong_so_sanh : 0,
    tong_diem: ketQua ? ketQua.tong_diem : 0,
    ly_do: lyDo,
    da_rot_soat: false,
    // Liên kết với khai_bao_gia_dinh để gia đình tra cứu trạng thái sau này
    khai_bao_id: khaiBaoId,
  };

  const { error } = await supabaseClient.from("can_ra_soat_thu_cong").insert([dong]);

  if (error) {
    console.error("Lỗi khi ghi vào rà soát thủ công:", error);
  }
}
