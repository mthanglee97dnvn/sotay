# Nút tư vấn ngay trên danh sách Sắp tới

Ngày: 2026-11-22 · Chủ app: anh Thắng · Trạng thái: chờ duyệt

## Vì sao
Lướt danh sách Sắp tới là biết ngay cặp nào đã tư vấn và nắm thông tin, cặp nào chưa, và đổi trạng thái ngay tại đó sau khi gọi khách, không phải mở từng hồ sơ.

## Đã quyết
- Mỗi dòng lễ sắp tới có một **nút tư vấn** nằm bên trái "Còn n ngày".
- **Bấm là đổi trạng thái ngay**, dùng đúng trường "Đã tư vấn" của hồ sơ, nên nút "Cần hẹn tư vấn" và khung tư vấn trong hồ sơ đổi theo.
- Cách làm: mỗi dòng thành một khung chứa hai nút riêng (phần tên mở hồ sơ như cũ, nút tư vấn đổi trạng thái). Không vuốt hay giữ lâu, không lồng nút trong nút.

```
22  THANH HUYỀN & VĂN THƯƠNG            Hôm nay
CN  Cưới · Có quay
24  HUỲNH THỊ TƯỜNG VI        (Chưa tư vấn)  Còn 2 ngày
T3  Cưới · Có quay
24  THỤC ĐOAN & HOÀNG THẮNG    ✓ Đã tư vấn   Còn 2 ngày
T3  Cưới
```

## Quyết định của Claude (anh xem lại)
- Chữ trên nút: **"Chưa tư vấn"** (viên thuốc viền, chữ đậm, để nổi) và **"✓ Đã tư vấn"** (chữ thường, dấu tick, nhạt hơn). Không thêm màu mới, đúng quy tắc chỉ dùng đỏ cho trễ hạn.
- Sau khi bấm: hiện thông báo nhỏ "Đã đánh dấu đã tư vấn" / "Đã bỏ đánh dấu" kèm nút **Hoàn tác** trong vài giây.
- Không hiện nút cho đám **hôm nay, đã qua, hoặc đã huỷ** (giống khung tư vấn trong hồ sơ).
- Người chỉ có quyền xem: thấy chữ trạng thái, không bấm đổi được.
- Chỉ ở danh sách Sắp tới (và ô tìm kiếm của nó); danh sách giao trễ/đã qua và các lễ khác của cặp trong hồ sơ giữ như cũ.
- Vùng bấm tối thiểu 44px; người dùng trình đọc màn hình nghe được "Đánh dấu đã tư vấn cho <tên cặp>" / "Bỏ đánh dấu đã tư vấn cho <tên cặp>".
- Trên điện thoại hẹp, tên cặp xuống dòng chứ không đẩy nút ra ngoài màn hình.

## Không làm
Không đổi luật nhắc tư vấn, không thêm trạng thái mới (vẫn một trạng thái "đã tư vấn và nắm thông tin"), không đổi nút "Cần hẹn tư vấn".

## Kiểm tra
Smoke: bấm đổi được và lưu vào hồ sơ; Hoàn tác trả lại; bấm nút không mở hồ sơ, bấm tên vẫn mở; không có nút ở đám hôm nay/đã qua; người xem không đổi được; không tràn ở 320px; tương phản đạt ở Sáng và Tối.
