# Sổ Tay Nhắc Việc: Hệ thống thiết kế

Giấy contact sheet, mực chì than, xanh ống kính cho các nút bấm. Đỏ bút sáp (grease pencil) chỉ dùng cho việc đã trễ hạn.
Tất cả giá trị nằm trong `:root` ở đầu `web/src/styles.css` (bản v2; bản cũ ở `/cu/` dùng `index.html`). Nền tối tự đổi theo cài đặt của máy (`prefers-color-scheme`).

## Giao diện Hướng D (app + phiếu khách, từ 19/11/2026)
App (`index.html`) và phiếu khách (`form.html`) có `<html class="cine">`, **luôn tối**. Bảng màu theo ảnh mẫu anh Thắng chọn:

| Tên | Mã | Dùng cho |
|---|---|---|
| Royal Blue | `#112250` | Nền chính (sáng dần xuống `#1b2f63`), chữ trên nền vàng/ngà |
| Sapphire | `#3C507D` | Thẻ kính, quầng sáng đáy màn hình |
| Quicksand | `#E0C58F` | Điểm nhấn: tiêu đề trang, số ngày đếm ngược, giờ ekip, lễ ≤ 7 ngày, nút +, viền mảnh |
| Swan Wing | `#F5F0E9` | Chữ chính, nút chính (`.btn.primary`), tab đang chọn |
| Đất nung | `#e8a594` | Chỉ cho trễ hạn |

- **Chữ:** tiêu đề trang Noto Serif Display 600 in hoa vàng ánh kim + dòng `.kicker` nhỏ giãn rộng; tên cặp đôi trên ảnh Noto Serif Display 400; còn lại Inter Tight.
- **Nền (`Sky` trong `ui/Sky.tsx`):** quầng sapphire, đường cung vàng ở đáy, khung viền vàng mảnh quanh màn hình.
- **Ảnh địa danh:** `web/public/places/{hoian,danang,hue}.webp` (+ `-sq` vuông). `domain/place.ts` chọn ảnh theo địa chỉ nhà hàng → nhà gái → nhà trai; không khớp thì dùng ảnh Đà Nẵng. Thêm địa danh: thêm ảnh + một dòng trong `RULES`.
- **Sắp tới:** ô lễ gần nhất (`.hero`) có ảnh, số ngày vàng lớn, giờ ekip trong nhãn vàng; dải `.todaystrip` cho việc gấp nhất (quá hạn trước, rồi hôm nay); mỗi lễ là `.item.wrow` với ô ngày là ảnh vuông, nhãn "Còn n ngày" vàng khi ≤ 7 ngày.
- **Hồ sơ:** khung `.wcover` dùng ảnh địa danh.
- **Logo:** `web/public/logo.webp`, component `Logo` (có sao vàng khi `spark`).
- **Chuyển động** (ánh vàng, chấm nhấp nháy, sao lấp lánh) tắt khi máy bật giảm chuyển động.

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
| (huy hiệu tab) | | | Đỏ chỉ cho số giao trễ ở Kho; phiếu mới dùng `.badge.info` màu `--accent` |
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

## Khoảng cách
`--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-6` 24. Dùng cho padding, margin, gap. Các số lẻ còn lại (10, 14, 18) là khoảng riêng của từng thành phần, không thêm số mới.

## Thành phần (bản v2, `web/src/styles.css`)
| Thành phần | Kiểu | Trạng thái |
|---|---|---|
| `.btn` | mặc định · `.primary` (hành động chính, mỗi thẻ 1 nút) · `.ghost` (phụ) · `.danger` (xoá) · `.sm` (36px, chỉ trong thẻ và thanh tiêu đề) | rê chuột (chỉ máy có chuột), nhấn, tắt (mờ 50%), focus |
| `.list` + `.item` | danh sách có đường kẻ; `.item.is-today`, `.item.static` (không bấm được) | |
| `.date` | "số khung": ngày lớn + thứ, đường kẻ phải | |
| `h2.roll` | tiêu đề tháng ở Sắp tới, kèm số đám | |
| `.chip` | nút lọc `aria-pressed`; `.late` có vòng `--pencil` quanh số | bật, tắt |
| `.tag` | loại lễ (cưới, đính hôn, tiệc) | chỉ để đọc |
| `.st` | trạng thái giao ở Kho; `.late` có vòng `--pencil` | |
| `.card` | khối nội dung; `.card .couple` cho tên khách ở Kho | |
| `.banner` | báo phiếu mới, bấm để mở | |
| `.field` | nhãn + ô nhập + `.hint`; `aria-invalid` khi thiếu | focus (`--focus`), lỗi (`.hint.late`) |
| `.sheet` | `role=dialog`; nhận focus khi mở, giữ Tab bên trong, Esc đóng và trả focus | |
| `.fab` + `.fabmenu` | nút + và menu, trong `aside "Thêm mới"`; Esc đóng | mở, đóng |
| `.badge` | đỏ: số giao trễ · `.info` xanh: phiếu mới | |
| `.toast` | trong vùng `role=status` luôn có sẵn; bên trái nút + | `.err`; tự ẩn |
| `.callout` | giải thích cho khách (nền `--amber-soft`, viền 1px) | không dùng viền dày một bên |
| `.tick` | ô tick việc: vùng bấm 44px quanh ô 22px | |

## Class tiện ích
`.grow` · `.row` · `.stack` · `.small` · `.muted` · `.empty` · `.m0` · `.bare` (nút không viền, dùng cho dòng bấm được) · `.bare.full` · `.sep` (đường kẻ trên) · `.ul-tight` · `.kv` (cặp nhãn – giá trị) · `.msgbox` (khung tin nhắn mẫu) · `.numinput`.
Dùng các class này thay cho `style="…"`. Còn 18 inline style riêng lẻ (độ rộng thanh biểu đồ, vị trí huy hiệu, khoảng cách một chỗ), được phép giữ.

## Chữ trong app
- Với chủ app: gọi "anh". Với khách (phiếu, tin nhắn): studio xưng "mình", gọi khách "bạn" / "hai bạn", không dùng "anh chị". Email nhờ ekip: "bạn".
- Bàn giao đếm theo "bộ", lịch cưới đếm theo "đám" hoặc "cặp". Động từ dùng "bấm" và "giữ".
- Thông báo lỗi nói việc gì đã xảy ra và nêu đúng tên nút cần bấm.
