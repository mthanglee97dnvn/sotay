# Thợ freelancer: danh sách và nút hỏi lịch nhanh

## Vì sao
Ekip của anh Thắng đã đủ người cho số lịch hiện có. Thỉnh thoảng có khách rất cần một ngày đã kín, nhờ anh tìm thêm thợ để nhận show giúp. Lúc này anh phải mở Facebook và nhắn **từng thợ quen** để hỏi còn trống ngày đó không, rồi mới chốt với khách. Khách chưa chốt, nên ngày cần hỏi thường **chưa có hồ sơ lễ** trong Sổ Tay. Mục tiêu: có sẵn danh sách thợ quen và hỏi được từng người trong vài giây.

## Mục tiêu
- Tab mới **"Thợ"** trên thanh dưới, nằm giữa "Kho sản phẩm" và "Thêm" (anh chọn Cách 1).
- Danh sách thợ freelancer, mỗi thợ có: tên, link Facebook, làm gì (chụp / quay / cả hai), một dòng ghi chú (khu vực, giá, điểm mạnh).
- Đầu trang có ô **ngày cần thợ** và chọn **chụp / quay**. Có thể thêm khu vực (mặc định Đà Nẵng).
- Mỗi thợ có nút **"Hỏi lịch"**: chép sẵn tin hỏi lịch rồi mở khung chat Messenger với thợ đó. Anh dán và gửi.
- Thêm, sửa, xoá thợ ngay trong tab.

## Không làm
- Không theo dõi ai đã trả lời, ai trống, ai nhận show. Anh xem trên Facebook.
- Thợ không đăng nhập, không thấy app.
- Không gắn thợ vào hồ sơ lễ.

## Ràng buộc
- Miễn phí (Firebase Spark, GitHub Pages). Gói chính dưới 200 KB, nên tab này tải khi mở, như Kho và Việc.
- Messenger không cho điền sẵn chữ từ app khác, nên chỉ làm được kiểu chép tin rồi mở chat.
- Giữ giao diện điện ảnh hiện tại: tiêu đề chữ nghiêng, thẻ kính, màu vàng.

## Cách làm đã cân nhắc
1. **Tab "Thợ" trên thanh dưới (đã chọn):** một chạm là tới. Thanh dưới có 5 nút, hơi hẹp hơn nhưng vẫn vừa trên iPhone.
2. Đặt trong trang "Thêm": thanh giữ 4 nút nhưng phải bấm 2 lần, chậm khi khách đang chờ.
3. Thêm vào nút +: mở được từ mọi trang, nhưng nút + dùng để tạo mới nên dễ lẫn.

## Các quyết định
- **Ai được sửa:** admin và người có quyền "Được sửa" thêm, sửa, xoá thợ. Người "Chỉ xem" chỉ xem và vẫn hỏi lịch được. (Em tự quyết.)
- **Lưu ở đâu:** `orgs/mthanglee/freelancers/{id}` trong Firestore, luật phân quyền giống hồ sơ lễ và việc.
- **Tin hỏi lịch** (anh Thắng duyệt câu chữ, giọng thân với thợ, khác giọng với khách):
  "Hí Lô Ae, ngày {Thứ Sáu 28/11} bên Thén đang cần tìm thợ {chụp / quay / chụp và quay}, Ae còn rảnh lịch không báo giúp Thén để nhận lịch nhé"
  Ngày và loại việc chèn vào khi đã chọn. Chưa chọn ngày thì giữ nguyên "ngày này", chưa chọn loại việc thì chỉ ghi "tìm thợ". (Em tự quyết phần chèn.)
- **Mở chat:** từ link Facebook, lấy tên người dùng hoặc id để mở `m.me/...` (trên điện thoại sẽ mở Messenger). Nếu không đọc được link thì mở chính link Facebook đó. Không có link thì chỉ chép tin. (Em tự quyết.)
- **Lọc:** chọn "chụp" thì thợ làm chụp hoặc cả hai lên trước, thợ chỉ quay xếp sau và mờ đi. "Quay" làm ngược lại. Có ô tìm theo tên. (Em tự quyết.)

## Để người làm tự quyết
Biểu tượng tab, bố cục thẻ thợ, trạng thái trống, cách sửa (dùng bảng nổi giống hồ sơ lễ).
