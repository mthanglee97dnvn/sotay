# Sổ Tay Nhắc Việc: Hệ thống thiết kế

App mặc cùng "bộ đồ" với website studio mthangleestudio.com: giấy ngà, mực đen, chữ in hoa rộng, dòng phụ nghiêng có chân, nút viên thuốc. Mọi giá trị **lấy từ website** (`mthanglee-web`, `src/site/styles/tokens.css`) và nằm trong `:root` ở đầu `web/src/styles.css`. Sửa màu hay font ở website thì chép sang đây.

## Hai giao diện: Sáng và Tối (từ 20/11/2026)
- **Sáng** = thân trang website. **Tối** = chân trang website (dải đêm). Đặt bằng `html[data-theme=light|dark]`.
- **Nút đổi:** mặt trời/mặt trăng ở góc trên bên phải mọi màn của app (`.themebtn`, đổi Sáng ↔ Tối), và mục **Giao diện** trong tab Thêm với 3 lựa chọn **Tự động** (theo cài đặt sáng/tối của máy, mặc định) · **Sáng** · **Tối**.
- Lựa chọn lưu **theo từng máy** ở `localStorage['sotay2-theme']` (`auto`/`light`/`dark`; giá trị lạ hoặc không đọc được thì coi là Tự động). Code ở `web/src/theme.ts`; một đoạn script nhỏ trong `<head>` của `index.html` áp giao diện **trước khi vẽ trang** để không chớp màu, và đổi `meta theme-color` (`#ebe6dd` / `#111111`).
- **Phiếu khách (`form.html`) luôn Sáng**: `<html data-theme="light">`, không có script đổi, không theo máy khách.
- **Mỗi hồ sơ một link phiếu**, mở ra điền sẵn thông tin dành cho khách đang có trong hồ sơ. Nút trong hồ sơ: "Gửi phiếu cho khách điền" → "Chép link và tin nhắn" (luôn cùng một link; tin nhắn nhờ khách xem lại và bổ sung).
- Không còn: nền xanh, vàng, sao, khung viền vàng, quầng sáng, ảnh địa danh (Hướng D đã bỏ).

## Màu
| Biến | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `--bg` (`--paper`) | #ebe6dd | #111 | Nền trang, bảng trượt, thanh tab |
| `--panel` (`--card`) | #ebe6dd (viền `--line`) | #1b1a18 | Thẻ, khối, ô lễ gần nhất, ô nhập |
| `--chip` (`--paper-2`) | #e2dcd1 | #242220 | Nền phụ: tab chọn, lễ hôm nay, khung tin nhắn mẫu |
| `--ink` | #111 | #ebe6dd | Chữ chính |
| `--muted` | #4a4640 | #cfc8bc | Chữ phụ (đạt 4.5:1) |
| `--ink-3` | #8f887d | | **Chỉ trang trí**, không dùng cho chữ (không đạt 4.5:1) |
| `--line` | #c9c2b6 | ngà 16% | Đường kẻ |
| `--field-line` | #7b746a | ngà 42% | Viền ô nhập (đạt 3:1) |
| `--solid` / `--on-solid` (= `--accent` / `--on-accent`) | #111 / #ebe6dd | #ebe6dd / #111 | Nút chính, nút +, tab đang chọn, nhãn giờ ekip |
| `--late` (`--warn`) | #a3341f | #f0a08c | **Chỉ cho việc quá hạn và lỗi**: chữ, giờ ở dải việc gấp |
| `--scrim` | mực 60% | | Lớp mờ sau bảng trượt |

Quy tắc: ngoài đỏ đất cho trễ hạn, app không có màu nào khác. Trạng thái khác dùng chữ, gạch chân, chấm, độ mờ: "Còn n ngày" ≤ 7 ngày thì gạch chân đậm; đã xong viết chữ thường. Không gõ mã màu thẳng trong CSS hay HTML, chỉ dùng biến. Chữ đạt 4.5:1 ở cả hai giao diện (smoke kiểm tra).

## Chữ
- **Archivo** rộng (`--wide`, đậm 800, in hoa, `font-stretch` 112–118%): tiêu đề trang, tên cặp đôi, số ngày, tiêu đề nhóm và tháng.
- **Noto Serif Display nghiêng 300** (`--serif`): dòng phụ/kicker ("sắp tới", loại lễ trên đầu hồ sơ, ngày hôm nay).
- **Be Vietnam Pro** (`--body`): chữ thường, nút, nhãn.
- Nạp từ Google Fonts (có bộ tiếng Việt) trong `index.html` và `form.html`.
- Cỡ: `--fs-xs` 12 · `--fs-sm` 13 · `--fs-md` 14 · `--fs-base` 15 · `--fs-input` 16 (ô nhập, để iOS không phóng to) · `--fs-lg` 17 · `--fs-xl` 19 · `--fs-2xl` 22 · `--fs-3xl` 26 · `--fs-4xl` 30 (tiêu đề trang). Số ngày ở ô lễ gần nhất 48px.

## Sắp tới và hồ sơ
- Đầu trang: logo chữ của website (`web/public/brand/logo-ink.webp` cho Sáng, `logo-white.webp` cho Tối, component `ui/Logo.tsx`), tiêu đề "LỊCH CƯỚI", ngày hôm nay nghiêng.
- Ô lễ gần nhất (`.hero`): khung viền mảnh (Sáng) / thẻ hơi sáng hơn nền (Tối); số ngày lớn trước, rồi tên in hoa, dòng phụ; giờ ekip là viên thuốc đặc.
- Bộ lọc (`.stat`): viên thuốc viền mảnh, bật thì đặc.
- Dải việc gấp (`.todaystrip`): kẻ trên dưới; trễ hạn thì giờ màu `--late`.
- Lễ (`.wrow`): dòng kẻ, cột ngày số lớn Archivo, tên in hoa, dòng phụ, "Còn n ngày" bên phải.
- Đầu hồ sơ (`.wcover`): loại lễ nghiêng + tên in hoa + ngày, không ảnh.

## Bo góc, bóng đổ, chuyển động
- Bo góc: `--r-pill` 99 (mọi nút, chip, bộ lọc, ô tìm) · `--r-sheet` 18 (bảng trượt) · `--r-md` 10 (ô nhập) · `--r-lg` 14 (thẻ) · `--r-sm` 8, `--r-xs` 4 (ô nhỏ).
- Sắp tới chia theo cuộn tháng (`h2.roll`, "Tháng 12/2026" + số đám); cột ngày là "số khung" lớn bằng font hiển thị, ngăn với nội dung bằng 1 đường kẻ; lễ hôm nay nền `--chip`.
- Bóng đổ: thẻ không bóng (chỉ viền) · `--shadow-md` (nút +, menu +, thông báo nổi) · `--shadow-lg` (bảng trượt).
- Chuyển động: `--t-fast` 0.15s với `--ease`, chỉ dùng khi người dùng bấm, mở hoặc đóng; tắt khi máy bật giảm chuyển động.
- Focus: viền 2px màu chữ, cách 3px.

## Khoảng cách
`--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-6` 24. Dùng cho padding, margin, gap. Các số lẻ còn lại (10, 14, 18) là khoảng riêng của từng thành phần, không thêm số mới.

## Thành phần (bản v2, `web/src/styles.css`)
| Thành phần | Kiểu | Trạng thái |
|---|---|---|
| `.btn` | viên thuốc viền 1px màu chữ · `.primary` đặc (`--solid`, hành động chính, mỗi thẻ 1 nút) · `.ghost` (phụ, không viền) · `.danger` (xoá) · `.sm` (36px trong thẻ; trên đầu bảng trượt vẫn 44px) | rê chuột (chỉ máy có chuột), nhấn, tắt (mờ 50%), focus |
| `.list` + `.item` | danh sách có đường kẻ; `.item.is-today`, `.item.static` (không bấm được) | |
| `.date` | "số khung": ngày lớn + thứ, đường kẻ phải | |
| `h2.roll` | tiêu đề tháng ở Sắp tới, kèm số đám | |
| `.chip` | nút lọc `aria-pressed` | bật, tắt |
| `.tag` | loại lễ (cưới, đính hôn, tiệc) | chỉ để đọc |
| `.card` | khối nội dung | |
| `.banner` | báo phiếu mới, bấm để mở | |
| `.field` | nhãn + ô nhập + `.hint`; `aria-invalid` khi thiếu | focus (`--focus`), lỗi (`.hint.late`) |
| `.sheet` | `role=dialog`; nhận focus khi mở, giữ Tab bên trong, Esc đóng và trả focus | |
| `.fab` + `.fabmenu` | nút + và menu, trong `aside "Thêm mới"`; Esc đóng | mở, đóng |
| `.badge` | `.info` đặc màu chữ: phiếu mới | |
| `.toast` | trong vùng `role=status` luôn có sẵn; bên trái nút + | `.err`; tự ẩn |
| `.callout` | giải thích cho khách (nền `--paper-2`, vạch trái 2px màu chữ) | |
| `.tick` | ô tick việc: vùng bấm 44px quanh ô 22px | |
| `.themebtn` | nút đổi Sáng/Tối, góc trên phải, 44px | |
| `.themepick` | nhóm 3 lựa chọn giao diện trong Thêm (`role=radiogroup`) | |

## Class tiện ích
`.grow` · `.row` · `.stack` · `.small` · `.muted` · `.empty` · `.m0` · `.bare` (nút không viền, dùng cho dòng bấm được) · `.bare.full` · `.sep` (đường kẻ trên) · `.ul-tight` · `.kv` (cặp nhãn – giá trị) · `.msgbox` (khung tin nhắn mẫu) · `.numinput`.
Dùng các class này thay cho `style="…"`. Còn 18 inline style riêng lẻ (độ rộng thanh biểu đồ, vị trí huy hiệu, khoảng cách một chỗ), được phép giữ.

## Chữ trong app
- Với chủ app: gọi "anh". Với khách (phiếu, tin nhắn): studio xưng "mình", gọi khách "bạn" / "hai bạn", không dùng "anh chị". Email nhờ ekip: "bạn".
- Bàn giao đếm theo "bộ", lịch cưới đếm theo "đám" hoặc "cặp". Động từ dùng "bấm" và "giữ".
- Thông báo lỗi nói việc gì đã xảy ra và nêu đúng tên nút cần bấm.
