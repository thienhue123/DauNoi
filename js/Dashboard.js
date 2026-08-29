// DASHBOARD QUẢN TRỊ
// ================================

document.addEventListener("DOMContentLoaded", () => {
  const adminPassword = sessionStorage.getItem("adminPassword");

  // Chưa đăng nhập quản trị
  if (!adminPassword) {
    window.location.href = "auth.html";
    return;
  }

  // Có mật khẩu quản trị
  hienThiDashboard();
});

function hienThiDashboard() {
  // Các phần tử có thể có trong Dashboard
  const khuVucAdmin = document.getElementById("khu-vuc-admin");
  const nutDangXuat = document.getElementById("logout-btn");

  if (khuVucAdmin) {
    khuVucAdmin.style.display = "";
  }

  if (nutDangXuat) {
    nutDangXuat.addEventListener("click", dangXuat);
  }
}

function dangXuat() {
  sessionStorage.removeItem("adminPassword");
  window.location.href = "auth.html";
}