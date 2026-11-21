# Phiếu khách điền sẵn thông tin hồ sơ

Ngày: 2026-11-21 · Chủ app: anh Thắng · Trạng thái: chờ duyệt

## Vì sao
Hồ sơ cưới thường đã có một phần thông tin, do khách gửi qua phiếu hoặc anh tự nhập. Khi khách cần bổ sung, anh muốn chỉ việc chép link gửi khách: khách mở ra thấy phiếu đã điền sẵn mọi thứ đang có, rồi chỉ điền thêm phần còn thiếu.

## Đã quyết
- **Mỗi hồ sơ một link** (cách 1). Link khách đang giữ mở ra phiếu điền sẵn **thông tin mới nhất trong hồ sơ**, kể cả phần anh tự nhập hay sửa sau. Hồ sơ chưa có link thì tạo link lần đầu.
- **Hướng làm 1:** phiếu giữ một bản sao (`prefill`) **chỉ gồm các mục dành cho khách**: loại lễ, tên cô dâu/chú rể, số điện thoại, ngày, địa chỉ, các giờ lễ. Bản sao tự cập nhật mỗi khi lưu hồ sơ. Khách chỉ đọc được bản sao, không bao giờ đọc được hồ sơ thật. Ghi chú nội bộ, tư vấn, giao ảnh vẫn kín.
- **Khi khách gửi lại**, phiếu vẫn vào mục "Phiếu mới" để anh xem rồi bấm đưa vào hồ sơ như bây giờ. Lúc đưa vào, app **chỉ lấy những mục khách thật sự thêm hoặc sửa** so với bản khách đã thấy, nên phần anh vừa sửa trong lúc khách đang mở phiếu không bị ghi đè. Ô khách để trống không xoá thông tin đã có.

## Các hướng đã cân nhắc
1. Bản sao các mục cho khách, tự cập nhật khi lưu hồ sơ (anh chọn): kín, luôn mới nhất.
2. Cho link đọc thẳng hồ sơ: phải mở quyền đọc hồ sơ cho người cầm link, lộ ghi chú nội bộ. Loại.
3. Chỉ cập nhật bản sao khi bấm "Chép link": khách có thể thấy bản cũ. Loại.

## Không làm
- Không đổi giao diện phiếu (vẫn luôn Sáng), không thêm mục mới, không đổi chữ trong phiếu ngoài phần nói bên dưới.
- Không cho khách xem hay sửa ghi chú nội bộ, tư vấn, giao ảnh, ekip.
- Không tự đưa phiếu vào hồ sơ: anh vẫn bấm duyệt.

## Ràng buộc
- Luật Firestore: người cầm link chỉ được đọc phiếu như bây giờ; chỉ người sửa được hồ sơ (admin/editor) mới ghi `prefill`. Phần khách gửi vẫn bị kiểm tra như cũ (chỉ các mục cho phép, mỗi mục ≤ 1000 ký tự); bản khách đã thấy (`base`) gửi kèm cũng bị kiểm tra y như vậy.
- Chữ gửi khách xưng "mình", gọi "bạn"/"hai bạn".
- Hỏi anh trước khi đưa lên.

## Quyết định của Claude
- Nút trong hồ sơ: "Gửi phiếu cho khách điền" giữ nguyên chỗ cũ. Hồ sơ đã có link thì nút chép **đúng link cũ** (làm mới bản sao trước khi chép), không tạo link mới. Tin nhắn chép kèm đổi thành lời mời **xem lại và bổ sung** khi hồ sơ đã có thông tin.
- Hồ sơ cũ đã có link từ trước: app tìm link mới nhất của hồ sơ đó và dùng lại, không tạo thêm.
- Khách mở link khi phiếu lần trước **chưa được anh đưa vào hồ sơ**: phiếu hiện những gì khách đã gửi, đè lên bản sao, để khách không mất phần vừa điền.
- Ô "Ghi chú cho studio" của khách không lấy từ hồ sơ (ghi chú hồ sơ là nội bộ); khách thấy lại ghi chú mình gửi lần trước.

## Để lại cho người làm
Tên trường lưu link trên hồ sơ, cách tìm link cũ, và cách cập nhật bản sao khi lưu hồ sơ (miễn đúng các điều trên, có test cho: điền sẵn, không lộ mục nội bộ, không ghi đè phần anh vừa sửa, ô trống không xoá, luật Firestore chặn người lạ ghi `prefill`).
