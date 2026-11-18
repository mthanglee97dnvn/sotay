# Sổ Tay Nhắc Việc: Hệ thống thiết kế

Giấy contact sheet, mực chì than, xanh ống kính cho các nút bấm. Đỏ bút sáp (grease pencil) chỉ dùng cho việc đã trễ hạn.
Tất cả giá trị nằm trong `:root` ở đầu `web/src/styles.css` (bản v2; bản cũ ở `/cu/` dùng `index.html`). Nền tối tự đổi theo cài đặt của máy (`prefers-color-scheme`).

## Màu
| Biến | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `--bg` | #f3f4f6 | #0e1116 | Nền trang |
| `--panel` | #ffffff | #161a21 | Thẻ, bảng, hộp thoại |
| `--chip` | #eceef2 | #1f242d | Nhãn, đầu bảng, nút ghost khi rê chuột |
| `--ink` | #15171c | #e9ecf1 | Chữ chính |
| `--muted` | #5a5f6a | #9aa1ae | Chữ phụ (đạt 4.5:1) |
| `--line` | #e1e4ea | #272c35 | Đường kẻ trang trí |
| `--field-line` | #8a909b | #6f7786 | Viền ô nhập (đạt 3:1) |
| `--accent` / `--on-accent` | #2745a3 / #fff | #8ea6ff / #0e1116 | Nút chính, mục đang chọn |
| `--accent-soft` | #e7ecfa | #1c2540 | Nền gợi ý, hướng dẫn |
| `--ok` + `--green-soft` | #16714a | #6fd3a0 | Đã xong, sẵn sàng, ngày trống |
| `--warn` + `--red-soft` | #c21d2e | #ff7b7b | Quá hạn, xoá, lỗi |
| `--on-warn` | #fff | #0e1116 | Chữ trên nền `--warn` (huy hiệu số, thông báo lỗi) |
| `--amber` + `--amber-soft` | #8a5a00 | #f0c060 | Sắp đến hạn, chưa gửi |
| `--teal` + `--teal-soft` | #16675c | #7fd6c8 | Lịch tư vấn |
| `--hi` / `--mid` | = `--warn` / #a26c00 | | Viền ô tick theo mức ưu tiên |
| `--scrim` | rgba(20,18,14,.45) | | Lớp nền mờ sau hộp thoại |

Quy tắc: không gõ mã màu thẳng trong CSS hay HTML, chỉ dùng biến. Màu chữ luôn phải đạt tương phản 4.5:1 trên `--panel` và `--bg`.

## Chữ
- Font hiển thị: `--display` (Bricolage Grotesque), dùng cho tiêu đề, tên tháng, số đếm.
- Font nội dung: Be Vietnam Pro, cỡ gốc `--fs-base` là 15px.

| Biến | px | Dùng cho |
|---|---|---|
| `--fs-xs` | 12 | Nhãn chip, chú thích |
| `--fs-sm` | 13 | Nút nhỏ, dòng phụ, bảng |
| `--fs-md` | 14 | Thông báo, mô tả |
| `--fs-base` | 15 | Chữ thường, tiêu đề nhóm |
| `--fs-input` | 16 | Ô nhập trên điện thoại (để iOS không tự phóng to) |
| `--fs-lg` | 17 | Tiêu đề hộp thoại, tên tháng |
| `--fs-xl` | 19 | Tiêu đề khối |
| `--fs-2xl` | 22 | Tên tháng trong Lịch, số tổng |
| `--fs-3xl` | 26 | Tiêu đề form khách, chuông báo |
| `--fs-4xl` | 30 | Tiêu đề trang |

Độ đậm: 400 cho chữ thường, 500 cho nút, 600 cho nhãn và tên, 700 cho tiêu đề. Không dùng cỡ chữ lẻ nửa pixel.

## Bo góc, bóng đổ, chuyển động
- Bo góc: `--r-xs` 4 (ô màu chú thích, sự kiện trong lịch) · `--r-sm` 8 (select nhỏ, ô nhỏ) · `--r-md` 10 (nút, ô nhập) · `--r-lg` 14 (thẻ, khối, bảng; `--radius` cũng là giá trị này) · `--r-xl` 20 (hộp thoại, nút +, chuông) · `--r-pill` (chip, nút tròn dài).
- Một ngoại lệ có chủ ý: vòng bút sáp đỏ vẽ tay (`--pencil`, SVG) quanh số giao trễ trên `.chip.late` và nhãn `.st.late` trong Kho. Chỉ dùng cho việc trễ, như biên tập viên khoanh khung trên contact sheet.
- Sắp tới chia theo cuộn tháng (`h2.roll`, "Tháng 12/2026" + số đám); cột ngày là "số khung" lớn bằng font hiển thị, ngăn với nội dung bằng 1 đường kẻ; lễ hôm nay nền `--accent-soft`.
- Bóng đổ: `--shadow` (thẻ) · `--shadow-md` (nút +, thông báo nổi) · `--shadow-lg` (hộp thoại, chuông).
- Chuyển động: `--t-fast` 0.15s với `--ease`, chỉ dùng khi người dùng bấm, mở hoặc đóng.

## Thành phần
| Thành phần | Kiểu | Trạng thái |
|---|---|---|
| `.btn` | mặc định · `.pri` (hành động chính, mỗi khối 1 nút) · `.ghost` (phụ) · `.danger` (xoá) · `.sm` | rê chuột, nhấn, tắt (mờ 50%), focus, đang chạy (`.spin`) |
| `.chip` | `.late` (oval đỏ) · `.soon` (vàng nâu) · `.unsent` · `.ok` | Chỉ để đọc |
| Ô nhập | `input`, `select`, `textarea`; luôn có `<label>` hoặc `aria-label` | focus (vòng `--focus`) |
| Thẻ việc `.card` | tiêu đề là `button.rowbtn.cardbtn` | đã xong, quá hạn, đã ghim |
| Dòng mở rộng | `button.rowbtn[aria-expanded]`, `button.mtoggle` | mở, đóng |
| Hộp thoại `.sheet` | `role=dialog`; con trỏ bị giữ bên trong, Esc để đóng | |
| `.toast` | `role=status`; nằm bên trái nút +, không che nút | Tự ẩn sau 2.6 giây, 6 giây nếu chữ dài |
| `.callout` | Hộp giải thích cho khách (nền `--amber-soft`, viền 1px) | Không dùng viền dày một bên |
| `.tick` | Ô tick việc: vùng bấm 44px quanh ô 22px | |
| Xoá | Bấm 2 lần: "Bấm lần nữa để xoá việc / ghi chú / phiếu" | |

## Class tiện ích
`.grow` · `.w-full` · `.t-center` · `.mt-1` (6) · `.mt-2` (8) · `.mt-25` (10) · `.mt-3` (14) · `.hrow` · `.hstack` · `.t-ok` · `.t-amber` · `.t-warn` · `.t-muted` · `.t-xs` · `.mini-sel`
Dùng các class này thay cho `style="…"`. Vẫn còn khoảng 38 inline style riêng lẻ (độ rộng hay chiều cao cụ thể), được phép giữ.

## Chữ trong app
- Với chủ app: gọi "anh". Với khách (phiếu, tin nhắn): studio xưng "mình", gọi khách "bạn" / "hai bạn", không dùng "anh chị". Email nhờ ekip: "bạn".
- Bàn giao đếm theo "bộ", lịch cưới đếm theo "đám" hoặc "cặp". Động từ dùng "bấm" và "giữ".
- Thông báo lỗi nói việc gì đã xảy ra và nêu đúng tên nút cần bấm.
