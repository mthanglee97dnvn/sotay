# Sổ Tay MThanglee – làm lại từ đầu (thiết kế)

Ngày: 17/11/2026 · Người đặt: Lê Minh Thắng (MThanglee Studio, phóng sự cưới Đà Nẵng)

## 1. Vì sao làm lại

App "Sổ Tay Nhắc Việc" hiện tại là một file HTML ~240 KB, lớn dần qua nhiều đợt: ban đầu chạy trong Claude, sau đó gắn thêm một lớp "dịch" để chạy trên Firebase + GitHub Pages. Kết quả: nhiều tính năng anh không còn dùng, mở chậm, và đăng nhập/đọc Google hay lỗi vặt (cửa sổ Google treo trên Cốc Cốc, Safari chặn cửa sổ, API chưa bật…).

Anh muốn một app **nhanh nhất và dễ dùng nhất** cho đúng việc anh và vợ làm hằng ngày.

## 2. App dùng để làm gì (phạm vi)

Người dùng thật: **anh (admin) và vợ anh** – hai người trực fanpage, chăm sóc khách, lấy lịch trình ngày cưới và lên kế hoạch chụp. Thiết kế cho tối đa **20 tài khoản Gmail**.

1. **Hồ sơ theo từng lễ** – **mỗi lễ (mỗi ngày) một hồ sơ riêng**; một cặp book 2 dịch vụ (vd đám hỏi + đám cưới, hoặc tiệc + cưới) sẽ có 2 hồ sơ. Mỗi hồ sơ: tên, SĐT, loại lễ, ngày, địa chỉ nhà gái / nhà trai / nhà hàng, lịch trình trong ngày, kênh khách nhắn (FB cá nhân, fanpage, Zalo, Instagram) kèm link chat, ghi chú.
2. **Phiếu cho khách tự điền** – anh gửi link; khách điền trên điện thoại **không cần đăng nhập**; thông tin vào thẳng hồ sơ ngay lập tức. Anh đóng app vẫn được; **lần tới mở app sẽ thấy thông báo "Bạn có n phiếu mới"** (không cần điện thoại rung lúc khách gửi).
3. **Nhắc việc / ghi chú** – việc cần làm có giờ nhắc, gắn với một đám hoặc việc chung.
4. **Đếm ngày & hẹn tư vấn** – còn ~1–2 tháng tới lễ, app nhắc hẹn tư vấn; nút soạn sẵn tin nhắn (xưng "anh", gọi khách "em", giọng thân) và mở đúng kênh chat của khách; đánh dấu "đã tư vấn".
5. **Kho sản phẩm** (thay tab Bàn giao) – theo từng đám: link ảnh, link video (Google Photos/Drive), thay link khi khách xin chỉnh, giữ link cũ; hạn giao **ảnh 7–10 ngày, video 25–30 ngày** sau ngày cưới; đám chỉ chụp thì không có video; trễ hạn/sắp tới hạn được làm nổi; nút **"Sao chép tin nhắc"** để anh tự dán vào Framevis/Zalo nhắc ekip; tìm theo tên khách ra ngay link.
6. **Tóm tắt** (chỉ admin) – số đám theo tháng, số cần hẹn tư vấn, số giao trễ / sắp tới hạn.

### Phân quyền
| Vai trò | Ai | Được làm |
|---|---|---|
| Admin | anh (chỉ 1 người) | mọi thứ; thêm/xoá người; đổi quyền; xem Tóm tắt |
| Được sửa | người admin cấp (vd vợ anh) | thêm/sửa hồ sơ, việc, link sản phẩm, gửi link phiếu |
| Chỉ xem | người được thêm nhưng chưa cấp quyền sửa | xem, không sửa |
| Không vào được | Gmail chưa được thêm | màn hình "chưa được mời" |

Quyền phải được **kho dữ liệu chặn thật** (quy tắc Firestore), không chỉ ẩn nút.

### Không làm (non-goals)
- Phân lịch cho ekip, ghi ai chụp/ai quay – anh dùng **Framevis**.
- Tab Lịch Google (xem ngày trống từ Google Calendar), đọc Google Form/Sheets, quét hội thoại bằng AI, app iPhone/App Store/TestFlight, nhật ký chi tiết "ai sửa gì".
- Gói trả phí (Firebase Blaze) hay bất cứ thứ gì cần gắn thẻ.

### Thất bại dù vẫn "chạy được" (anti-goals)
- Đăng nhập lỗi, cửa sổ Google bật liên tục hoặc treo.
- Mở app chậm trên 4G, hay phải chờ quay vòng.
- Người chỉ xem vẫn sửa được dữ liệu.
- Mất dữ liệu cũ khi chuyển sang bản mới.

## 3. Ràng buộc
- Miễn phí: Firebase gói Spark (Auth + Firestore + Hosting), không Cloud Functions.
- Đăng nhập bắt buộc bằng Google (Gmail).
- Chạy tốt trên iPhone/iPad (Safari, cả khi "Thêm vào MH chính"), Android Chrome, máy tính (Chrome, Cốc Cốc).
- Tiếng Việt toàn bộ; giữ bộ màu/chữ hiện có (DESIGN.md: nền giấy, xanh ống kính, đỏ chỉ cho trễ hạn).
- Bản **demo trước**, sau đó anh mua tên miền riêng → phải gắn tên miền riêng được mà không sửa code.
- Claude không tự gõ mật khẩu hay khoá bí mật thay anh; bước nào cần anh phê duyệt (Google, GitHub) thì anh bấm.
- Dự án Firebase hiện có: `sotay-mthanglee` (Google sign-in, Firestore Singapore đã bật). Kho mã: `mthanglee97dnvn/sotay`.

## 4. Các hướng đã cân nhắc
1. **Viết lại thành web app gọn trên Firebase** – code chia nhỏ, nhanh, phân quyền thật, phiếu khách công khai. Tốn công nhất. **← anh chọn.**
2. Giữ app cũ, cắt bớt + thêm quyền – nhanh nhưng giữ lớp "dịch" gây lỗi; tốc độ cải thiện ít.
3. AppSheet / Notion – không cần code nhưng không làm đúng phiếu khách, đếm ngày, nhắc hạn; nhiều người dùng thì tốn phí.

## 5. Những gì đã chốt về cách làm
- Web app riêng (không còn file Claude artifact, không còn lớp "dịch").
- Firebase Auth (Google) + Firestore; phân quyền bằng quy tắc Firestore.
- Phiếu khách: link công khai, không đăng nhập, chỉ ghi được vào đúng phiếu được mời.
- Kho sản phẩm thay tab Bàn giao; không lưu ekip.
- Nhắc giờ khi đã đóng web: tiếp tục cách **sự kiện Google Lịch của từng người** (đã làm và chạy được), chỉ xin quyền ghi sự kiện (calendar.events) – không còn quyền đọc lịch hay Sheets.
- Chuyển toàn bộ dữ liệu cũ (việc, ghi chú, phiếu khách, link bàn giao) sang bản mới.
- **Mỗi lễ một hồ sơ** (anh chốt): đám hỏi và đám cưới của cùng một cặp là 2 hồ sơ, mỗi hồ sơ có lịch trình, đếm ngày, hạn giao sản phẩm riêng.
- **Phiếu mới khi app đóng** (anh chốt): không cần báo đẩy; khi mở app hiện thông báo và số phiếu mới trên màn hình chính.

## 6. Đề xuất của Claude (anh có thể sửa)
- **Màn hình chính "Sắp tới"**: danh sách đám theo ngày, mỗi dòng 1 chạm mở hồ sơ; dải trên cùng: "Cần hẹn tư vấn (n)", "Giao trễ (n)", "Việc hôm nay (n)". 4 mục dưới đáy: Sắp tới · Việc · Kho sản phẩm · Thêm (Tóm tắt, Thành viên, Cài đặt). Nút + nổi: thêm đám / gửi link phiếu / thêm việc.
- **Công nghệ**: Vite + Preact + TypeScript, Firebase SDK dạng module; mục tiêu tải lần đầu < 150 KB nén, mở < 2 giây trên 4G, dùng được khi mất mạng (bộ nhớ đệm Firestore), có manifest để "Thêm vào MH chính".
- **Đặt web trên Firebase Hosting** (miễn phí, cùng tên miền với trang đăng nhập Google → đăng nhập ổn định trên iPhone), gắn tên miền riêng sau. Bản demo có thể chạy ở `sotay-mthanglee.web.app`.
- **Một Gmail = một vai trò**, lưu ở danh sách thành viên; admin cố định là Gmail của anh.
- **Tạo nhanh lễ thứ hai cho cùng cặp**: trong hồ sơ có nút "Thêm lễ khác cho cặp này" – chép sẵn tên, SĐT, kênh chat; tìm theo tên khách ra cả hai hồ sơ cạnh nhau.
- **Chuyển dữ liệu một lần** từ cả bản trong Claude lẫn bản web hiện tại: việc/ghi chú cũ thành "việc chung"; link bàn giao cũ tự ghép vào đúng hồ sơ nếu khớp tên + ngày, không khớp thì để mục "Chưa ghép" cho anh chọn.
- **Google Lịch**: sự kiện nhắc vào lịch của người được giao việc, không giao ai thì vào lịch người tạo; cập nhật khi app đang mở; khoảng mỗi giờ, lần chạm đầu có thể thoáng hiện cửa sổ Google (giới hạn gói miễn phí).
- **Phiếu khách theo loại lễ** giữ đúng luật hiện có: Cưới đủ trường; Đính hôn (gộp Ăn hỏi) không có rước dâu và nhà hàng; Tiệc báo hỷ chỉ địa chỉ nhà hàng, SĐT cô dâu chú rể, giờ đón khách, giờ đãi tiệc.

## 7. Để người làm tự quyết
- Cấu trúc dữ liệu chi tiết trong Firestore, tên trường, chỉ mục.
- Cách triển khai lên Hosting (GitHub Actions hay khác) – miễn không bắt Claude nhập khoá bí mật và anh chỉ cần bấm phê duyệt.
- Cách chống spam phiếu công khai (mã phiếu khó đoán, hết hạn, giới hạn kích thước).
- Thiết kế chi tiết từng màn hình theo DESIGN.md.
