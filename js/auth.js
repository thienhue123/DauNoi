// ĐĂNG NHẬP QUẢN TRỊ
const EDGE_FUNCTION_URL = "https://zidorfsicyswxgjvvmax.supabase.co/functions/v1/admin-actions";
// Nếu phiên này đã đăng nhập rồi, khỏi bắt nhập lại — vào thẳng Dashboard.
  if (sessionStorage.getItem("adminPassword"))
    {window.location.href = "Dashboard.html";}
const form = document.getElementById("login-form");
const passwordInput = document.getElementById("password-input");
const errorMsg = document.getElementById("error-msg");
const nutDangNhap = form.querySelector("button[type='submit']");

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  const password = passwordInput.value.trim();

  if (!password) {
    errorMsg.textContent = "Vui lòng nhập mật khẩu.";
    return;
  }

  errorMsg.textContent = "";
  nutDangNhap.disabled = true;
  nutDangNhap.textContent = "Đang kiểm tra...";

  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ action: "ping" }),
    });

    if (res.status === 401) {
      errorMsg.textContent = "Sai mật khẩu. Vui lòng thử lại.";
      nutDangNhap.disabled = false;
      nutDangNhap.textContent = "Đăng nhập";
      return;
    }

    if (!res.ok) {
      errorMsg.textContent = "Có lỗi khi kết nối máy chủ. Vui lòng thử lại.";
      nutDangNhap.disabled = false;
      nutDangNhap.textContent = "Đăng nhập";
      return;
    }

    // Mật khẩu đúng: lưu lại để các trang admin khác dùng, rồi chuyển vào Dashboard.
    sessionStorage.setItem("adminPassword", password);
    window.location.href = "Dashboard.html";
  } catch (err) {
    console.error("Lỗi khi kiểm tra đăng nhập:", err);
    errorMsg.textContent = "Không kết nối được máy chủ. Kiểm tra mạng và thử lại.";
    nutDangNhap.disabled = false;
    nutDangNhap.textContent = "Đăng nhập";
  }
});