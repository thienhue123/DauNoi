// ===== DÁN / CHỌN ẢNH CHO PHẦN KHAI BÁO =====
// Cho phép gia đình dán ảnh (Ctrl+V) hoặc chọn file, upload thẳng lên
// Supabase Storage (bucket "anh-khai-bao"), lưu URL công khai vào mảng
// window.anhDaTaiLen để submit-form.js đọc khi gửi khai báo lên RPC.

const GIOI_HAN_SO_ANH = 3;
const GIOI_HAN_DUNG_LUONG_ANH = 5 * 1024 * 1024; // 5MB
const DINH_DANG_ANH_CHO_PHEP = ["image/jpeg", "image/png", "image/webp", "image/heic"];

// Mảng URL công khai của các ảnh đã tải lên thành công.
// submit-form.js sẽ đọc window.anhDaTaiLen khi build hồ sơ để gửi lên Supabase.
window.anhDaTaiLen = [];

document.addEventListener("DOMContentLoaded", () => {
  const vungDan = document.getElementById("vung-dan-anh");
  const inputFile = document.getElementById("input-chon-anh");
  const khungXemTruoc = document.getElementById("khung-xem-truoc-anh");
  const thongBaoAnh = document.getElementById("thong-bao-anh");

  // Trang không có form khai báo (VD: trang admin) thì bỏ qua, không lỗi.
  if (!vungDan || !inputFile || !khungXemTruoc) return;

  vungDan.addEventListener("click", () => inputFile.click());
  vungDan.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") inputFile.click();
  });

  // Dán ảnh (Ctrl+V) — bắt trên toàn trang, chỉ xử lý nếu con trỏ đang
  // ở trong form khai báo, để không ảnh hưởng các thao tác dán khác.
  document.addEventListener("paste", (e) => {
    const dangOTrongForm =
      document.activeElement && document.activeElement.closest("#form-khai-bao");
    if (!dangOTrongForm && document.activeElement !== document.body) return;

    const files = Array.from(e.clipboardData ? e.clipboardData.files : []);
    if (files.length > 0) xuLyDanhSachFile(files);
  });

  inputFile.addEventListener("change", (e) => {
    xuLyDanhSachFile(Array.from(e.target.files));
    inputFile.value = ""; // cho phép chọn lại cùng 1 file lần sau nếu cần
  });

  async function xuLyDanhSachFile(files) {
    const danhSachAnh = files.filter((f) => f.type.startsWith("image/"));
    if (danhSachAnh.length === 0) return;

    for (const file of danhSachAnh) {
      if (window.anhDaTaiLen.length >= GIOI_HAN_SO_ANH) {
        baoLoi(`Chỉ được tối đa ${GIOI_HAN_SO_ANH} ảnh.`);
        break;
      }
      if (!DINH_DANG_ANH_CHO_PHEP.includes(file.type)) {
        baoLoi("Định dạng ảnh không hỗ trợ (chỉ nhận JPG, PNG, WEBP, HEIC).");
        continue;
      }
      if (file.size > GIOI_HAN_DUNG_LUONG_ANH) {
        baoLoi("Ảnh vượt quá 5MB, vui lòng chọn ảnh nhỏ hơn.");
        continue;
      }
      await taiLenMotAnh(file);
    }
  }

  async function taiLenMotAnh(file) {
    const the = taoTheDangTai();
    khungXemTruoc.appendChild(the);

    // Tên file duy nhất, giữ lại đuôi file gốc để dễ nhận diện khi debug.
    const tenFile = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;

    const { error } = await supabaseClient.storage
      .from("anh-khai-bao")
      .upload(tenFile, file);

    if (error) {
      console.error("Lỗi tải ảnh lên Supabase Storage:", error);
      the.remove();
      baoLoi("Không tải được ảnh, vui lòng thử lại.");
      return;
    }

    const { data } = supabaseClient.storage.from("anh-khai-bao").getPublicUrl(tenFile);
    window.anhDaTaiLen.push(data.publicUrl);
    capNhatTheThanhAnhThat(the, data.publicUrl);
  }

  function taoTheDangTai() {
    const the = document.createElement("div");
    the.className = "the-anh-xem-truoc";
    the.style.cssText =
      "width:80px;height:80px;display:flex;align-items:center;justify-content:center;" +
      "border:1px solid #ddd;border-radius:6px;font-size:0.75rem;color:#888;position:relative;";
    the.textContent = "Đang tải...";
    return the;
  }

  function capNhatTheThanhAnhThat(the, url) {
    the.textContent = "";
    the.style.overflow = "hidden";

    const img = document.createElement("img");
    img.src = url;
    img.alt = "Ảnh đính kèm";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";

    const nutXoa = document.createElement("button");
    nutXoa.type = "button";
    nutXoa.textContent = "×";
    nutXoa.setAttribute("aria-label", "Xóa ảnh này");
    nutXoa.style.cssText =
      "position:absolute;top:2px;right:2px;width:20px;height:20px;line-height:18px;" +
      "border-radius:50%;border:none;background:rgba(0,0,0,0.6);color:#fff;cursor:pointer;padding:0;";
    nutXoa.addEventListener("click", () => {
      window.anhDaTaiLen = window.anhDaTaiLen.filter((u) => u !== url);
      the.remove();
    });

    the.appendChild(img);
    the.appendChild(nutXoa);
  }

  function baoLoi(thongDiep) {
    if (!thongBaoAnh) return;
    thongBaoAnh.style.color = "red";
    thongBaoAnh.textContent = thongDiep;
    setTimeout(() => {
      thongBaoAnh.textContent = "";
    }, 4000);
  }
});