document.addEventListener("DOMContentLoaded", async () => {
  const selectXa = document.getElementById("que-quan-xa");
  const inputId = document.getElementById("que-quan-id");
  const inputText = document.getElementById("que-quan-text");
  if (!selectXa || !inputId || !inputText) return; // trang không có form này thì bỏ qua

  const { data, error } = await supabaseClient
    .from("dia_danh_nhom")
    .select("id, ten_nhom")
    .eq("cap_hanh_chinh", "xã/phường (2025)")
    .order("ten_nhom", { ascending: true });

  if (error) {
    console.error("Lỗi tải danh sách xã/phường:", error);
    return;
  }

  data.forEach((row) => {
    const opt = document.createElement("option");
    opt.value = row.id;
    opt.textContent = row.ten_nhom;
    opt.dataset.ten = row.ten_nhom;
    selectXa.appendChild(opt);
  });

  selectXa.addEventListener("change", () => {
    if (selectXa.value) {
      inputId.value = selectXa.value;
      inputText.value = selectXa.options[selectXa.selectedIndex].dataset.ten;
    } else {
      inputId.value = "AG-TINH";
      inputText.value = "An Giang";
    }
  });
});