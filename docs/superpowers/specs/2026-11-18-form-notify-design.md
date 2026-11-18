# Báo ngay khi khách gửi phiếu + cho khách bổ sung sau – thiết kế

## Mục đích
Anh Thắng cần **biết ngay** khi khách bấm "Gửi" trên phiếu thông tin, để xử lý kịp mà không phải chờ tới lúc mở Sổ Tay. Khách nhiều khi chưa có giờ giấc lúc gửi phiếu, nên **link cũ phải dùng lại được để bổ sung**, kể cả sau khi anh đã đưa phiếu vào hồ sơ.

## Mục tiêu
- Chậm nhất khoảng **1–2 phút** sau khi khách bấm gửi, Gmail trên điện thoại của anh báo có phiếu.
- Báo cả **phiếu mới** lẫn **phiếu cập nhật** (khách mở lại link và gửi bổ sung).
- Khách mở lại link bất cứ lúc nào để sửa hoặc bổ sung thông tin, gửi xong lại thành phiếu chờ anh đưa vào hồ sơ.

## Không làm
- Không dùng gói trả phí, không cài thêm app.
- Không gửi email cho khách.
- Không tự đưa phiếu vào hồ sơ; anh vẫn bấm "Đưa vào hồ sơ" để duyệt.
- Không tự ghi vào Framevis.

## Điều phải tránh
- Báo trùng nhiều lần cho cùng một lần gửi.
- Bỏ sót phiếu.
- Lộ mật khẩu hay khoá bí mật trong mã.

## Các cách đã cân nhắc
1. **Google Apps Script trên tài khoản của anh, kiểm tra mỗi phút, gửi email** ← anh chọn. Chắc chắn, không phụ thuộc khách; cần cài một lần khoảng 5 phút.
2. **Nút "Báo cho mình qua Zalo/Messenger" trên phiếu.** Tức thì nhưng phụ thuộc khách có bấm hay không. Không làm lúc này.
3. **Thông báo đẩy từ chính Sổ Tay.** Cần gói Firebase trả phí, anh đã loại.

## Anh đã quyết
- Cần biết ngay sau khi khách bấm gửi.
- Dùng cách 1.
- Khách thiếu giờ vẫn gửi được, và được mở lại link cũ để bổ sung sau.

## Đề xuất của Claude (anh duyệt cùng bản này)
- **Email gửi về:** `leminhthang97@gmail.com`, tức chính tài khoản chạy đoạn mã.
  - Tiêu đề: `Phiếu mới: Lan & Minh – Cưới 20/12/2026`. Phiếu bổ sung thì đổi "Phiếu mới" thành "Khách bổ sung phiếu".
  - Nội dung: các thông tin khách điền, **danh sách mục còn thiếu** (ví dụ "Chưa có: giờ trình lễ, giờ xuất phát"), và nút mở Sổ Tay.
- **Không báo trùng:** sau khi gửi email, đoạn mã đánh dấu đã báo cho đúng lần gửi đó. Khách gửi lại với nội dung khác thì báo tiếp; bấm gửi lại y như cũ thì không báo nữa.
- **Cách đoạn mã chạy:**
  - Dùng quyền tài khoản Google của anh (chủ dự án Firebase) để đọc phiếu, nên không cần khoá bí mật nào.
  - Kiểm tra mỗi 1 phút. Mức này nằm trong giới hạn miễn phí của Google: khoảng 1.440 lần/ngày, mỗi lần dưới 2 giây.
- **Phiếu bổ sung:**
  - Phiếu đã đưa vào hồ sơ vẫn mở được.
  - Trang phiếu hiện thông tin đã gửi, kèm nút **"Bổ sung / sửa thông tin"**.
  - Gửi xong, phiếu quay về trạng thái chờ duyệt. Sổ Tay hiện dòng **"Khách bổ sung phiếu"** để phân biệt với phiếu mới.
  - Đưa vào hồ sơ lần nữa thì chỉ ghi thêm những ô khách vừa điền, không xoá ô đang có.
  - Luật phân quyền được nới tương ứng, vẫn chỉ cho khách sửa phần câu trả lời.
- **Cài đặt:**
  - Em viết sẵn đoạn mã kèm hướng dẫn từng bước bằng tiếng Việt, có ảnh minh hoạ.
  - Anh mở script.google.com, dán mã, bấm chạy hàm `caiDat` một lần và bấm cấp quyền.
  - Em không tự cấp quyền thay anh được.
- **Kiểm tra sau khi cài:** em gửi thử một phiếu giả, anh xác nhận đã nhận email.

## Để người làm tự quyết
Cấu trúc đoạn mã, cách đánh dấu đã báo, định dạng email, cách hiện "phiếu cập nhật" trong app.
