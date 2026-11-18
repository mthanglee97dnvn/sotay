# Đồng bộ lịch Google vào Sổ Tay – thiết kế

## Mục đích
Mở Sổ Tay là thấy ngay sắp tới có lễ nào và cần hẹn tư vấn với ai, khỏi nhập tay từng lễ. Các lễ đã có sẵn trên Google Lịch của anh Thắng (`leminhthang97@gmail.com`) ở hai nơi:
- lịch **"FrameVis Bookings"**, do Framevis tự tạo;
- **lịch chính**: các lễ anh tự tạo từ trước.

**Lịch là bản chuẩn** (anh chốt): lịch trình vẫn sửa trên Framevis hoặc Google Lịch, Sổ Tay cập nhật theo.

## Mục tiêu
- Mỗi sự kiện là lễ chụp ở hai lịch trên thành **một hồ sơ** trong Sổ Tay (mỗi lễ, mỗi ngày một hồ sơ). Việc đếm ngày, nhắc tư vấn và hạn giao sản phẩm chạy như hồ sơ thường.
- Lễ mới trên lịch thì có hồ sơ mới. Lễ đổi ngày, giờ hay lịch trình thì hồ sơ cập nhật theo. Lễ bị xoá trên lịch thì hồ sơ được đánh dấu "Đã huỷ trên lịch".
- Vợ anh và những người khác thấy các hồ sơ này. Chỉ lịch của anh được đọc, vì lịch nằm trong tài khoản của anh.

## Không làm
- Không đọc phần "Nhân sự" (ai chụp, ai quay); Framevis đã có.
- Không ghi ngược từ Sổ Tay vào Framevis hay lịch.
- Không lấy sự kiện không phải lễ chụp (họp, việc riêng, "Thôi Nôi…").
- Không chạy khi không ai mở app (đó là cách 2, Apps Script, để sau nếu cần).

## Điều phải tránh
- Tạo hồ sơ trùng: cùng một lễ có ở cả hai lịch, hoặc đồng bộ lại nhiều lần.
- Mất dữ liệu riêng của Sổ Tay khi đồng bộ: đã tư vấn chưa, link sản phẩm, ghi chú, phiếu khách đã điền.
- Ghi Firestore quá nhiều làm hết hạn mức miễn phí.

## Các cách đã cân nhắc
1. **App tự đọc lịch mỗi lần anh mở** ← anh chọn.
   - Ưu điểm: miễn phí, không cài thêm gì, dùng lại phần đăng nhập Google sẵn có.
   - Hạn chế: chỉ cập nhật khi anh mở app; thỉnh thoảng thoáng hiện cửa sổ Google.
2. **Google Apps Script chạy mỗi giờ.** Lúc nào cũng mới nhất, nhưng anh phải cài và cấp quyền một lần. Để dành, vì phần đọc lịch dùng chung được.

## Anh đã quyết
- Lịch là bản chuẩn.
- Đọc cả lịch Framevis lẫn lịch chính.
- Dùng cách 1.

## Đề xuất của Claude (anh duyệt cùng bản này)
- **Nhận biết lễ chụp:** tên sự kiện có dạng `Gói - Tên khách / Kênh (… Chụp …)`. Nếu tên có nhiều đoạn " - ", lấy đoạn cuối.
  - **Loại lễ:** gói có "báo hỷ" là *Tiệc báo hỷ*; có "đính hôn", "ăn hỏi" hoặc "đám hỏi" là *Đính hôn*; còn lại là *Cưới*.
  - **Có quay:** trong ngoặc có chữ "Quay".
  - **Kênh:** FB là Facebook cá nhân, Page là Fanpage, IG là Instagram, Zalo là Zalo.
- **Đọc lịch trình** từ phần ghi chú (bỏ định dạng HTML):
  - **Tên:** dòng "TIMELINE / CÔ DÂU - CHÚ RỂ" (hoặc dấu "&"). Không có thì lấy "Khách: …" (Framevis). Không có nữa thì lấy tên trong tiêu đề, đặt làm tên cô dâu.
  - **Địa chỉ, số điện thoại, giờ** lấy theo từng mục *Nhà trai*, *Nhà gái*, *Nhà hàng*: giờ xuất phát, trình lễ, rước dâu, makeup, đón khách, đãi tiệc.
  - **Số điện thoại khách** ở dòng "Khách: Tên · SĐT" của Framevis dùng khi chưa có số điện thoại nào khác.
  - **Ghi chú gốc của lịch** được giữ nguyên và hiện trong hồ sơ, để không mất chi tiết em chưa đọc được (vd "Phụ kiện cô dâu…").
- **Ngày lễ** lấy theo giờ bắt đầu, tính theo giờ Việt Nam.
- **Ghép trùng:** cùng ngày và cùng số điện thoại (hoặc cùng tên khách khi bỏ dấu) ở hai lịch thì gộp làm một, ưu tiên bản Framevis. Một mã đặt lịch Framevis có 2 ngày vẫn là 2 hồ sơ.
- **Phần lấy từ lịch** (loại lễ, ngày, tên, số điện thoại, địa chỉ, giờ, có quay, kênh):
  - hiện **chỉ đọc** trong hồ sơ, kèm dòng "Sửa trên Framevis / Google Lịch";
  - giá trị nào trên lịch để trống thì **không xoá** giá trị đang có. Nhờ vậy thông tin khách tự điền qua phiếu vẫn được giữ cho những lễ mới ghi "BÁO GIÁ 2026".
- **Phần riêng của Sổ Tay** không bao giờ bị đồng bộ ghi đè: đã tư vấn, link ảnh và video, ghi chú, link chat.
- **Phạm vi đọc:** từ 60 ngày trước (để Kho sản phẩm có các lễ vừa chụp) đến 13 tháng tới.
- **Khi nào đồng bộ:**
  - Khi anh mở app, và 30 phút một lần nếu app vẫn mở.
  - Có nút "Đồng bộ lịch" và dòng trạng thái "Đã đồng bộ lúc hh:mm · n lễ" ở màn Sắp tới (chỉ admin thấy).
  - Lần đầu hoặc khi phiên Google hết hạn, lần chạm đầu tiên sẽ mở cửa sổ Google.
- **Tiết kiệm lượt ghi:** chỉ ghi hồ sơ có thay đổi, nhận biết bằng dấu so sánh giống phần nhắc việc.
- **Quyền Google:** vẫn chỉ xin quyền sự kiện lịch, quyền app đang dùng; không xin thêm.
  - Quyền này không liệt kê được danh sách lịch, nên mã lịch Framevis được lưu sẵn trong Cài đặt (admin sửa được).
  - Bỏ qua các sự kiện nhắc việc do chính Sổ Tay tạo.

## Để người làm tự quyết
Cách lưu mã nguồn sự kiện trên hồ sơ, cấu trúc hàm đọc lịch trình, và chi tiết giao diện dòng trạng thái và nhãn "Đã huỷ trên lịch".
