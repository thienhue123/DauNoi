// ================= CẤU HÌNH MATCHING =================
const TRONG_SO_MAC_DINH = {
  ten: 35,
  don_vi: 15,
  nam_hy_sinh: 15,      
  dia_diem_hy_sinh: 15,
  que_quan: 10,
  nam_sinh: 10,
};

const NGUONG_DIEM_TOI_THIEU = 40;
const NGUONG_KHOP_TEN_TOI_THIEU = 0.6;

// Chế độ mở rộng: dùng khi nghi ngờ liệt sĩ mang bí danh khác tên khai sinh.
// Không bắt buộc tên khớp, nhưng bắt buộc tối thiểu 3/5 trường phụ phải khớp
// (5 trường phụ: quê quán, đơn vị, năm hy sinh, năm sinh, địa điểm hy sinh).
const NGUONG_SO_TRUONG_PHU_MO_RONG = 3;
const NGUONG_DIEM_TOI_THIEU_MO_RONG = 40;

// ================= CHUẨN HÓA =================
function chuanHoa(chuoi) {
  if (chuoi === null || chuoi === undefined) return "";
  return String(chuoi).trim().toLowerCase().replace(/\s+/g, " ");
}

// ================= QUY ĐỔI ĐỊA DANH =================
// Chỉ dùng cho các trường địa danh/đơn vị/địa điểm hy sinh.
// Không dùng để so khớp họ tên.
function quyDoiDiaDanh(chuoiGoc, bangDiaDanh = []) {
  const goc = chuanHoa(chuoiGoc);
  if (!goc || !Array.isArray(bangDiaDanh)) return chuoiGoc || "";

  const dong = bangDiaDanh.find((item) => {
    return chuanHoa(item.ten_cu) === goc;
  });

  return dong ? dong.ten_hien_tai : chuoiGoc || "";
}

// ================= SO KHỚP HỌ TÊN =================
// Không tách từ, không đếm từ chung, không có TU_PHO_BIEN.
// Chỉ coi là khớp khi toàn bộ họ tên sau khi chuẩn hóa giống nhau.
function soKhopHoTen(a, b) {
  const x = chuanHoa(a);
  const y = chuanHoa(b);

  if (!x || !y) return 0;
  return soKhopHoTenFuzzy(x, y);
}

// ================= ĐỌC ĐỊA ĐIỂM HY SINH (CÓ FALLBACK) =================
function layDiaDiemHySinh(obj) {
  if (!obj) return "";
  if (obj.dia_diem_hy_sinh !== undefined && obj.dia_diem_hy_sinh !== null && obj.dia_diem_hy_sinh !== "") {
    return obj.dia_diem_hy_sinh;
  }
  return obj.dia_diem || "";
}

// ================= SO KHỚP TRƯỜNG HỖ TRỢ =================
// Địa danh/đơn vị/địa điểm hy sinh: khớp toàn bộ chuỗi sau khi chuẩn hóa.
function soKhopTruong(a, b) {
  const x = chuanHoa(a);
  const y = chuanHoa(b);

  if (!x || !y) return 0;
  return x === y ? 1 : 0;
}
function soKhopDiaDanh(idA, idB) {
  if (!idA || !idB) return 0;
  if (idA === idB) return 1;
  return 0.4;
}
// ================= SO KHỚP NĂM =================
// Dùng chung cho cả "năm hy sinh" và "năm sinh" — cùng một kiểu dữ liệu
// (năm đơn lẻ hoặc khoảng năm), cùng một cách xử lý sai số.
function parseKhoangNam(value) {
  if (value === null || value === undefined || value === "") return null;

  const text = String(value).trim();

  if (/^\d{4}$/.test(text)) {
    const nam = Number(text);
    return { min: nam, max: nam };
  }

  const match = text.match(/^(\d{4})\s*[-–—]\s*(\d{4})$/);
  if (!match) return null;

  const a = Number(match[1]);
  const b = Number(match[2]);
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

// Năm chỉ là thông tin bổ trợ.
// - Cùng năm / năm cụ thể nằm trong khoảng: 1
// - Hai khoảng giao nhau: tỉ lệ phần giao nhau
// - Lệch 1-4 năm: điểm giảm dần
// - Lệch >4 năm: 0
function soKhopNam(a, b) {
  const x = parseKhoangNam(a);
  const y = parseKhoangNam(b);

  if (!x || !y) return 0;

  if (x.max < y.min || y.max < x.min) {
    const lech = x.max < y.min ? y.min - x.max : x.min - y.max;
    if (lech === 1) return 0.85;
    if (lech === 2) return 0.6;
    if (lech === 3) return 0.35;
    if (lech === 4) return 0.15;
    return 0;
  }

  const xLaNamDon = x.min === x.max;
  const yLaNamDon = y.min === y.max;

  if (xLaNamDon || yLaNamDon) return 1;

  const giaoMin = Math.max(x.min, y.min);
  const giaoMax = Math.min(x.max, y.max);
  const doDaiX = x.max - x.min + 1;
  const doDaiY = y.max - y.min + 1;
  const doDaiGiao = giaoMax - giaoMin + 1;

  return Math.round((doDaiGiao / Math.max(doDaiX, doDaiY)) * 100) / 100;
}

// ================= ĐẾM TRƯỜNG CÓ THỂ SO SÁNH =================
// Tối đa 6 trường: họ tên, quê quán, đơn vị, năm hy sinh, năm sinh, địa điểm hy sinh.
function demSoTruongCoTheSoSanh(hoSo, mo) {
  let soTruong = 0;

  if (chuanHoa(hoSo.ho_ten) && chuanHoa(mo.ten_tren_bia)) soTruong++;
  if (hoSo.que_quan_id && mo.que_quan_id) soTruong++;
  if (chuanHoa(hoSo.don_vi) && chuanHoa(mo.don_vi)) soTruong++;
  if (hoSo.nam_hy_sinh && mo.nam_hy_sinh) soTruong++;
  if (hoSo.nam_sinh && mo.nam_sinh) soTruong++;
  if (chuanHoa(layDiaDiemHySinh(hoSo)) && chuanHoa(layDiaDiemHySinh(mo))) soTruong++;

  return soTruong;
}

// ================= TÍNH ĐIỂM =================
function tinhDiemKhop(
  hoSo,
  mo,
  bangDiaDanh = [],
  trongSo = TRONG_SO_MAC_DINH
) {
  const tenHoSo = chuanHoa(hoSo?.ho_ten);
  const tenMo = chuanHoa(mo?.ten_tren_bia);

  const soTruongCoTheSoSanh = demSoTruongCoTheSoSanh(hoSo, mo);

  const chiTietRong = {
    ten: 0, que_quan: 0, don_vi: 0, nam_hy_sinh: 0, nam_sinh: 0, dia_diem_hy_sinh: 0,
  };
 
  if (!tenHoSo || !tenMo) {
    return {
      tong_diem: 0,
      chi_tiet: chiTietRong,
      so_truong_so_sanh: soTruongCoTheSoSanh,
      ten_khop: false,
      ten_hoan_toan_khac: false,
      do_tin_cay: "Không đủ dữ liệu họ tên",
    };
  }

  const tiLeKhopTen = soKhopHoTen(tenHoSo, tenMo);

    if (tiLeKhopTen < NGUONG_KHOP_TEN_TOI_THIEU) {
    return {
      tong_diem: 0,
      chi_tiet: chiTietRong,
      so_truong_so_sanh: soTruongCoTheSoSanh,
      ten_khop: false,
      ten_hoan_toan_khac: true,
      do_tin_cay: "Tên không khớp — không đưa vào kết quả tự động",
    };
  }

  // Chỉ khi họ tên khớp mới tính các trường bổ trợ.
  const donViHoSo = quyDoiDiaDanh(hoSo.don_vi, bangDiaDanh);
  const donViMo = quyDoiDiaDanh(mo.don_vi, bangDiaDanh);
  const diaDiemHoSo = quyDoiDiaDanh(layDiaDiemHySinh(hoSo), bangDiaDanh);
  const diaDiemMo = quyDoiDiaDanh(layDiaDiemHySinh(mo), bangDiaDanh);

  const tiLeKhopQue = soKhopDiaDanh(hoSo.que_quan_id, mo.que_quan_id);
  const tiLeKhopDonVi = soKhopTruong(donViHoSo, donViMo);
  const tiLeKhopNam = soKhopNam(hoSo.nam_hy_sinh, mo.nam_hy_sinh);
  const tiLeKhopNamSinh = soKhopNam(hoSo.nam_sinh, mo.nam_sinh);
  const tiLeKhopDiaDiem = soKhopTruong(diaDiemHoSo, diaDiemMo);

  const diemTen = tiLeKhopTen * trongSo.ten;
  const diemQue = tiLeKhopQue * trongSo.que_quan;
  const diemDonVi = tiLeKhopDonVi * trongSo.don_vi;
  const diemNam = tiLeKhopNam * trongSo.nam_hy_sinh;
  const diemNamSinh = tiLeKhopNamSinh * trongSo.nam_sinh;
  const diemDiaDiem = tiLeKhopDiaDiem * trongSo.dia_diem_hy_sinh;
  const tongDiem = diemTen + diemQue + diemDonVi + diemNam + diemNamSinh + diemDiaDiem;

  let doTinCay = "Tên khớp — cần xác minh thêm";
  if (tongDiem >= 80) doTinCay = "Cao";
  else if (tongDiem >= 60) doTinCay = "Khá — nên xác minh thêm";

  return {
    tong_diem: Math.round(tongDiem),
    chi_tiet: {
      ten: Math.round(diemTen),
      que_quan: Math.round(diemQue),
      don_vi: Math.round(diemDonVi),
      nam_hy_sinh: Math.round(diemNam),
      nam_sinh: Math.round(diemNamSinh),
      dia_diem_hy_sinh: Math.round(diemDiaDiem),
    },
    so_truong_so_sanh: soTruongCoTheSoSanh,
    ten_khop: true,
    ten_hoan_toan_khac: false,
    do_tin_cay: doTinCay,
  };
}
// ================= TÍNH ĐIỂM — CHẾ ĐỘ MỞ RỘNG (không bắt buộc tên) =================
// Dùng cho trường hợp nghi ngờ bí danh: tên không còn là điều kiện gate,
// nhưng vẫn cộng điểm nếu tình cờ khớp. Bắt buộc tối thiểu 3/5 trường phụ khớp.
function tinhDiemKhopMoRong(
  hoSo,
  mo,
  bangDiaDanh = [],
  trongSo = TRONG_SO_MAC_DINH
) {
  const tenHoSo = chuanHoa(hoSo?.ho_ten);
  const tenMo = chuanHoa(mo?.ten_tren_bia);
  const tiLeKhopTen = soKhopHoTen(tenHoSo, tenMo);

  const donViHoSo = quyDoiDiaDanh(hoSo.don_vi, bangDiaDanh);
  const donViMo = quyDoiDiaDanh(mo.don_vi, bangDiaDanh);
  const diaDiemHoSo = quyDoiDiaDanh(layDiaDiemHySinh(hoSo), bangDiaDanh);
  const diaDiemMo = quyDoiDiaDanh(layDiaDiemHySinh(mo), bangDiaDanh);

  const tiLeKhopQue = soKhopDiaDanh(hoSo.que_quan_id, mo.que_quan_id);
  const tiLeKhopDonVi = soKhopTruong(donViHoSo, donViMo);
  const tiLeKhopNam = soKhopNam(hoSo.nam_hy_sinh, mo.nam_hy_sinh);
  const tiLeKhopNamSinh = soKhopNam(hoSo.nam_sinh, mo.nam_sinh);
  const tiLeKhopDiaDiem = soKhopTruong(diaDiemHoSo, diaDiemMo);

  // Đếm số trường phụ thực sự khớp (không tính tên).
  let soTruongPhuKhop = 0;
  if (tiLeKhopQue > 0) soTruongPhuKhop++;
  if (tiLeKhopDonVi > 0) soTruongPhuKhop++;
  if (tiLeKhopNam > 0) soTruongPhuKhop++;
  if (tiLeKhopNamSinh > 0) soTruongPhuKhop++;
  if (tiLeKhopDiaDiem > 0) soTruongPhuKhop++;

  if (soTruongPhuKhop < NGUONG_SO_TRUONG_PHU_MO_RONG) {
    return {
      tong_diem: 0,
      chi_tiet: { ten: 0, que_quan: 0, don_vi: 0, nam_hy_sinh: 0, nam_sinh: 0, dia_diem_hy_sinh: 0 },
      du_dieu_kien_mo_rong: false,
      ten_khop: tiLeKhopTen >= NGUONG_KHOP_TEN_TOI_THIEU,
      che_do: "mo_rong",
      do_tin_cay: "Không đủ trường phụ khớp — không đưa vào kết quả mở rộng",
    };
  }

  const diemTen = tiLeKhopTen * trongSo.ten;
  const diemQue = tiLeKhopQue * trongSo.que_quan;
  const diemDonVi = tiLeKhopDonVi * trongSo.don_vi;
  const diemNam = tiLeKhopNam * trongSo.nam_hy_sinh;
  const diemNamSinh = tiLeKhopNamSinh * trongSo.nam_sinh;
  const diemDiaDiem = tiLeKhopDiaDiem * trongSo.dia_diem_hy_sinh;
  const tongDiem = diemTen + diemQue + diemDonVi + diemNam + diemNamSinh + diemDiaDiem;

  return {
    tong_diem: Math.round(tongDiem),
    chi_tiet: {
    ten: Math.round(diemTen),
    que_quan: Math.round(diemQue),
    don_vi: Math.round(diemDonVi),
    nam_hy_sinh: Math.round(diemNam),
    nam_sinh: Math.round(diemNamSinh),
    dia_diem_hy_sinh: Math.round(diemDiaDiem),
    },
    du_dieu_kien_mo_rong: true,
    ten_khop: tiLeKhopTen >= NGUONG_KHOP_TEN_TOI_THIEU,
    che_do: "mo_rong",
    do_tin_cay: "Kết quả mở rộng — tên có thể là bí danh, cần xác minh kỹ",
  };
}

// ================= LỌC + XẾP HẠNG =================
function locVaXepHangKetQuaDuTinCay(tatCaKetQua, soLuong = 10) {
  return tatCaKetQua
    .filter((kq) => kq.ten_khop && kq.tong_diem >= NGUONG_DIEM_TOI_THIEU)
    .sort((a, b) => b.tong_diem - a.tong_diem)
    .slice(0, soLuong);
}

// ================= TÌM MỘ KHỚP VỚI HỒ SƠ =================
function timTop10Mo(
  hoSo,
  danhSachMo,
  bangDiaDanh = [],
  trongSo = TRONG_SO_MAC_DINH,
  soLuong = 10
) {
  return danhSachMo
    .map((mo) => ({
      mo,
      ...tinhDiemKhop(hoSo, mo, bangDiaDanh, trongSo),
    }))
    .filter((kq) => kq.ten_khop)
    .sort((a, b) => b.tong_diem - a.tong_diem)
    .slice(0, soLuong);
}

// ================= TÌM HỒ SƠ KHỚP VỚI MỘ =================
function timTop10HoSo(
  moMoi,
  danhSachHoSo,
  bangDiaDanh = [],
  trongSo = TRONG_SO_MAC_DINH,
  soLuong = 10
) {
  return danhSachHoSo
    .map((hoSo) => ({
      hoSo,
      ...tinhDiemKhop(hoSo, moMoi, bangDiaDanh, trongSo),
    }))
    .filter((kq) => kq.ten_khop)
    .sort((a, b) => b.tong_diem - a.tong_diem)
    .slice(0, soLuong);
}
// ================= TÌM MỘ — TỰ ĐỘNG CHUYỂN CHẾ ĐỘ MỞ RỘNG NẾU CHUẨN RA 0 KẾT QUẢ =================
function timTop10MoKemMoRong(
  hoSo,
  danhSachMo,
  bangDiaDanh = [],
  trongSo = TRONG_SO_MAC_DINH,
  soLuong = 10
) {
  const ketQuaChuan = timTop10Mo(hoSo, danhSachMo, bangDiaDanh, trongSo, soLuong);
  if (ketQuaChuan.length > 0) {
    return { che_do: "chuan", ket_qua: ketQuaChuan };
  }

  const ketQuaMoRong = danhSachMo
    .map((mo) => ({
      mo,
      ...tinhDiemKhopMoRong(hoSo, mo, bangDiaDanh, trongSo),
    }))
    .filter(
      (kq) => kq.du_dieu_kien_mo_rong && kq.tong_diem >= NGUONG_DIEM_TOI_THIEU_MO_RONG
    )
    .sort((a, b) => b.tong_diem - a.tong_diem)
    .slice(0, soLuong);

  return { che_do: "mo_rong", ket_qua: ketQuaMoRong };
}

// ================= TÌM HỒ SƠ — TỰ ĐỘNG CHUYỂN CHẾ ĐỘ MỞ RỘNG NẾU CHUẨN RA 0 KẾT QUẢ =================
function timTop10HoSoKemMoRong(
  moMoi,
  danhSachHoSo,
  bangDiaDanh = [],
  trongSo = TRONG_SO_MAC_DINH,
  soLuong = 10
) {
  const ketQuaChuan = timTop10HoSo(moMoi, danhSachHoSo, bangDiaDanh, trongSo, soLuong);
  if (ketQuaChuan.length > 0) {
    return { che_do: "chuan", ket_qua: ketQuaChuan };
  }

  const ketQuaMoRong = danhSachHoSo
    .map((hoSo) => ({
      hoSo,
      ...tinhDiemKhopMoRong(hoSo, moMoi, bangDiaDanh, trongSo),
    }))
    .filter(
      (kq) => kq.du_dieu_kien_mo_rong && kq.tong_diem >= NGUONG_DIEM_TOI_THIEU_MO_RONG
    )
    .sort((a, b) => b.tong_diem - a.tong_diem)
    .slice(0, soLuong);

  return { che_do: "mo_rong", ket_qua: ketQuaMoRong };
}