// ===== TRANG HIỂN THỊ KẾT QUẢ MATCHING =====
const danhSachKetQua = document.getElementById("danh-sach-ket-qua");
const thongBao = document.getElementById("thong-bao");

// ----- Hiển thị kết quả ra HTML (giữ nguyên logic hiển thị cũ) -----
function hienThiKetQua(nhomChinh, nhomMoRong, nhomCanRaSoat, hoSoDaChon) {
  thongBao.textContent = `Kết quả cho: ${hoSoDaChon.ho_ten} — ${nhomChinh.length} kết quả khớp họ tên`;

  let noiDungHtml = "";

  // ----- Danh sách chính: xếp hạng theo điểm -----
  if (nhomChinh.length === 0) {
    noiDungHtml += `
      <p class="ghi-chu-ra-soat">
        Chưa tìm thấy mộ nào khớp chính xác họ tên.
        Hồ sơ của bạn đã được ghi nhận và có thể tiếp tục được đối chiếu khi có dữ liệu mộ mới
        hoặc được rà soát thủ công.
      </p>
    `;
  } else {
    noiDungHtml += nhomChinh
      .map((ketQua, thuHang) => {
        const mo = ketQua.mo;
        const diem = ketQua.tong_diem;
        const chiTiet = ketQua.chi_tiet;

        return `
          <div class="the-ket-qua">
            <h3>#${thuHang + 1} — ${escapeHTML(mo.ten_tren_bia) || "(chưa rõ tên)"} — ${diem}/100 điểm</h3>
            <p>Quê quán: ${escapeHTML(mo.que_quan) || "(chưa rõ)"} | Đơn vị: ${escapeHTML(mo.don_vi) || "(chưa rõ)"} | Năm sinh: ${escapeHTML(mo.nam_sinh) || "(chưa rõ)"} | Năm hy sinh: ${escapeHTML(mo.nam_hy_sinh||mo.dia_diem) || "(chưa rõ)"} | Địa điểm hy sinh: ${escapeHTML(mo.dia_diem_hy_sinh||mo.dia_diem) || "(chưa rõ)"}</p>
            <p class="chi-tiet-diem">
              Chi tiết điểm — Tên: ${escapeHTML(chiTiet.ten)} | Quê quán: ${escapeHTML(chiTiet.que_quan)} | Đơn vị: ${escapeHTML(chiTiet.don_vi)} | Năm sinh: ${escapeHTML(chiTiet.nam_sinh)} | Năm hy sinh: ${escapeHTML(chiTiet.nam_hy_sinh)} | Địa điểm hy sinh: ${escapeHTML(chiTiet.dia_diem_hy_sinh)}
            </p>
            <p class="do-tin-cay">
              Độ tin cậy: <strong>${escapeHTML(ketQua.do_tin_cay)}</strong> (so sánh được trên ${ketQua.so_truong_so_sanh}/6 trường)
            </p>
          </div>
        `;
      })
      .join("");
  }

  // ----- Danh sách mở rộng: không khớp chính xác tên, nghi ngờ bí danh -----
  // Chỉ xuất hiện khi chế độ chuẩn trả về 0 kết quả (xem timTop10MoKemMoRong
  // trong matching.js) và tối thiểu 2/3 trường phụ (quê quán, đơn vị, năm) khớp.
  if (nhomMoRong.length > 0) {
    noiDungHtml += `
      <hr>
      <p class="ghi-chu-ra-soat">
        Không có mộ nào khớp chính xác họ tên. Hệ thống tìm thêm được
        ${nhomMoRong.length} kết quả mở rộng dựa trên quê quán, đơn vị và năm hy sinh —
        tên trên bia có thể là bí danh, gia đình cần xác minh kỹ trước khi liên hệ.
      </p>
    `;

    noiDungHtml += nhomMoRong
      .map((ketQua, thuHang) => {
        const mo = ketQua.mo;
        const diem = ketQua.tong_diem;
        const chiTiet = ketQua.chi_tiet;

        return `
          <div class="the-ket-qua mo-rong">
            <h3>#${thuHang + 1} — ${escapeHTML(mo.ten_tren_bia) || "(chưa rõ tên)"} — ${diem}/100 điểm</h3>
            <p>Quê quán: ${escapeHTML(mo.que_quan) || "(chưa rõ)"} | Đơn vị: ${escapeHTML(mo.don_vi) || "(chưa rõ)"} | Năm sinh: ${escapeHTML(mo.nam_sinh) || "(chưa rõ)"} | Năm hy sinh: ${escapeHTML(mo.nam_hy_sinh||mo.dia_diem) || "(chưa rõ)"} | Địa điểm hy sinh: ${escapeHTML(mo.dia_diem_hy_sinh||mo.dia_diem) || "(chưa rõ)"}</p>
            <p class="chi-tiet-diem">
              Chi tiết điểm — Tên: ${escapeHTML(chiTiet.ten)} | Quê quán: ${escapeHTML(chiTiet.que_quan)} | Đơn vị: ${escapeHTML(chiTiet.don_vi)} | Năm sinh: ${escapeHTML(chiTiet.nam_sinh)} | Năm hy sinh: ${escapeHTML(chiTiet.nam_hy_sinh)} | Địa điểm hy sinh: ${escapeHTML(chiTiet.dia_diem_hy_sinh)}
            </p>
            <p class="do-tin-cay">
              Độ tin cậy: <strong>${escapeHTML(ketQua.do_tin_cay)}</strong>
            </p>
          </div>
        `;
      })
      .join("");
  }

  // ----- Danh sách phụ: cần rà soát thủ công -----
  if (nhomCanRaSoat.length > 0) {
    noiDungHtml += `
      <hr>
      <p class="ghi-chu-ra-soat">
        Hồ sơ chưa có kết quả khớp tự động. Trường hợp này có thể được rà soát thủ công
        hoặc đối chiếu lại khi có dữ liệu mới.
      </p>
    `;
  }

  danhSachKetQua.innerHTML = noiDungHtml;
}

// ----- Đọc dữ liệu vừa lưu từ submit-form.js và hiển thị luôn khi vào trang -----
document.addEventListener("DOMContentLoaded", () => {
  const duLieuThoRaw = sessionStorage.getItem("ket_qua_vua_khai_bao");

  if (!duLieuThoRaw) {
    // Người dùng vào thẳng trang này (VD từ menu điều hướng) mà chưa khai báo
    // gì trong tab hiện tại — không còn cách nào để tra cứu lại kết quả cũ.
    thongBao.textContent = "Chưa có kết quả để hiển thị.";
    danhSachKetQua.innerHTML = `
      <p>
        Trang này chỉ hiển thị kết quả ngay sau khi bạn gửi khai báo.
        Vui lòng khai báo thông tin tại trang
        <a href="submit.html">"Khai báo tìm kiếm"</a> trước.
      </p>
    `;
    return;
  }

  const duLieu = JSON.parse(duLieuThoRaw);

  if (duLieu.loi) {
    thongBao.textContent = "Có lỗi khi so khớp dữ liệu.";
    danhSachKetQua.innerHTML = `<p style="color:red;">${escapeHTML(duLieu.loi)}</p>`;
    return;
  }

  hienThiKetQua(
    duLieu.nhomChinh,
    duLieu.nhomTenKhacCanXacMinh || [],
    duLieu.nhomCanRaSoat,
    duLieu.hoSo
  );
});