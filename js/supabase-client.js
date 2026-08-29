// ===== KẾT NỐI TỚI SUPABASE =====
// File này chỉ có 1 nhiệm vụ: tạo ra "supabaseClient" để các file JS khác
// (submit-form.js, cases.js, admin.js...) dùng chung để gửi/lấy dữ liệu.

// Lấy từ Project Settings >
const SUPABASE_URL = "https://zidorfsicyswxgjvvmax.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZG9yZnNpY3lzd3hnanZ2bWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMjMyNTAsImV4cCI6MjEwMDc5OTI1MH0.X0X6H_xJQFoIN5XJicI7mySt0TnXdIdQ7f0DI4GI-4k";

// window.supabase.createClient(...) : hàm có sẵn từ thư viện Supabase
// (thư viện này được nạp qua thẻ <script> CDN trong file HTML, nên phải dùng window.supabase để truy cập —
// nếu không có window. thì sẽ báo lỗi "supabase is not defined" khi chạy JS trong trình duyệt).
// TRƯỚC file supabase-client.js này thì mới dùng được window.supabase)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Không dùng "export" vì dự án này không dùng module bundler —
// biến supabaseClient sẽ tự động dùng được ở các file .js load SAU file này.