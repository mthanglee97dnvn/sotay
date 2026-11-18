# Cài báo phiếu mới qua Gmail (làm một lần, khoảng 5 phút)

Sau khi cài, cứ mỗi phút tài khoản Google của anh tự kiểm tra Sổ Tay. Khách nào vừa gửi hoặc bổ sung phiếu, anh nhận một email trên Gmail.

Làm trên **máy tính**, đăng nhập Google bằng **leminhthang97@gmail.com** (tài khoản chủ dự án Firebase).

## 1. Tạo dự án
1. Mở **https://script.google.com** và bấm **Dự án mới** (New project).
2. Bấm vào chữ **Dự án không có tiêu đề** ở góc trên, đổi tên thành `Sổ Tay – báo phiếu`.

## 2. Bật tệp cài đặt
1. Bấm biểu tượng **bánh răng ⚙ Cài đặt dự án** (Project Settings) ở thanh bên trái.
2. Đánh dấu ô **Hiển thị tệp kê khai "appsscript.json" trong trình chỉnh sửa**.
3. Quay lại biểu tượng **< > Trình chỉnh sửa** (Editor).

## 3. Dán 2 tệp
1. Bấm tệp **appsscript.json**, xoá hết nội dung, rồi dán toàn bộ nội dung tệp `appsscript.json` em gửi.
2. Bấm tệp **Code.gs**, xoá hết nội dung, rồi dán toàn bộ nội dung tệp `Code.gs` em gửi.
3. Bấm **💾 Lưu** (hoặc Ctrl + S).

## 4. Chạy cài đặt
1. Ở thanh trên, ô chọn hàm (cạnh nút ▷ Chạy), chọn **caiDat**.
2. Bấm **▷ Chạy** (Run).
3. Google hỏi cấp quyền, anh làm lần lượt:
   - **Xem xét quyền** (Review permissions), rồi chọn **leminhthang97@gmail.com**.
   - Nếu hiện "Google chưa xác minh ứng dụng này": bấm **Nâng cao** (Advanced), rồi **Đi tới Sổ Tay – báo phiếu (không an toàn)**. Đây là đoạn mã của chính anh nên an toàn.
   - Bấm **Cho phép** (Allow).
4. Phía dưới hiện **Nhật ký thực thi**, có dòng *"Đã cài xong: mỗi phút Sổ Tay sẽ kiểm tra phiếu mới…"* là xong.

## 5. (Tuỳ chọn) Xem thử email
Chọn hàm **guiThu** rồi bấm **▷ Chạy**. Gmail sẽ nhận một email có tiêu đề bắt đầu bằng `[Thử] Phiếu mới: …`.

## Cần biết
- Email gửi từ chính Gmail của anh tới chính anh, tên người gửi là **Sổ Tay MThanglee**.
- **Muốn tắt:** mở biểu tượng **⏰ Trình kích hoạt** (Triggers) ở thanh trái và xoá dòng `kiemTraPhieu`.
- **Muốn bật lại:** chạy lại **caiDat**.
- Khi em cập nhật đoạn mã, anh chỉ cần dán lại tệp `Code.gs` rồi bấm **Lưu**, không phải cấp quyền lại. Nếu tệp `appsscript.json` cũng đổi thì Google sẽ hỏi cấp quyền lại một lần.
