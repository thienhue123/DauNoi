// Tự động biến <nav> có sẵn thành menu responsive, không cần sửa HTML thẻ nav
document.addEventListener("DOMContentLoaded", () => {
  const thanhNav = document.querySelector("nav");
  if (!thanhNav) return;

  thanhNav.classList.add("co-menu-di-dong");

  const nutMoMenu = document.createElement("button");
  nutMoMenu.type = "button";
  nutMoMenu.className = "nut-menu-di-dong";
  nutMoMenu.setAttribute("aria-label", "Mở menu");
  nutMoMenu.innerHTML = "<span></span><span></span><span></span>";
  thanhNav.insertBefore(nutMoMenu, thanhNav.firstChild);

  nutMoMenu.addEventListener("click", () => {
    thanhNav.classList.toggle("menu-mo");
    nutMoMenu.classList.toggle("la-mo");
  });
});