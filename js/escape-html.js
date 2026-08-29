function escapeHTML(giaTri) {
  if (giaTri === null || giaTri === undefined) return "";
 
  return String(giaTri)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}