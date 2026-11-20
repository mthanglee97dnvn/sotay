# Sổ Tay: giao diện theo website, có Sáng và Tối

Ngày: 2026-11-20 · Chủ app: anh Thắng (MThanglee) · Trạng thái: chờ duyệt

## Vì sao

Anh Thắng muốn app Sổ Tay mặc cùng "bộ đồ" với website studio mthangleestudio.com (repo `mthanglee97dnvn/mthanglee-web`), để app, phiếu khách và website trông như của một studio. Anh không cần ảnh địa danh nữa. Anh đã xem bản vẽ thử (artifact "Sổ Tay theo website") và giữ hai kiểu: **A · Giấy sáng** và **C · Đêm**, kèm nút đổi giao diện.

## Mục tiêu

- Toàn bộ app (`web/index.html`): Sắp tới, Hồ sơ cưới (WeddingSheet), Việc, Kho sản phẩm, Thợ, Thêm, Thành viên, Phiếu chưa khớp, Nhập dữ liệu cũ, các bảng/hộp thoại, thông báo nổi, màn đăng nhập (Gate) dùng hệ thiết kế của website.
- Hai giao diện:
  - **Sáng (A):** nền giấy ngà `--paper #ebe6dd`, phụ `--paper-2 #e2dcd1`, chữ mực `--ink #111`, `--ink-2 #4a4640`, `--ink-3 #8f887d`, kẻ `--rule #c9c2b6`. Nút chính đen chữ ngà.
  - **Tối (C):** nền đen mực `#111`, chữ ngà `#ebe6dd`, phụ `#cfc8bc` / `#bdb6aa`, kẻ `rgb(235 230 221 / .16)`. Nút chính ngà chữ đen. Thẻ nổi trên nền tối hơi sáng hơn nền (bản vẽ dùng `#1b1a18`).
- Chữ như website: tiêu đề và tên cặp đôi Archivo rộng, in hoa, đậm 800 (`font-stretch` 112–118%); dòng phụ/kicker Noto Serif Display nghiêng 300; chữ thường và nút Be Vietnam Pro. Bỏ Inter Tight và Noto Serif Display đứng.
- Nút bo tròn dạng viên thuốc (`--r-pill`), viền 1px theo màu chữ; nút chính đặc. Bảng trượt bo `--r-sheet 18px`.
- **Nút đổi giao diện**, ba lựa chọn **Tự động · Sáng · Tối**, mặc định Tự động (theo `prefers-color-scheme` của máy):
  - nút nhỏ mặt trời/mặt trăng trên thanh đầu trang cạnh ảnh đại diện, chạm là đổi qua lại Sáng/Tối (từ Tự động thì đổi sang ngược với cái đang hiện);
  - bản đủ ba lựa chọn trong tab Thêm;
  - lưu theo từng máy (localStorage, có try/catch; không lưu được thì dùng Tự động), không đồng bộ giữa các máy hay người dùng;
  - áp trước khi vẽ trang (script nhỏ trong `<head>`) để không chớp sáng/tối khi mở app;
  - `meta theme-color` (thanh trạng thái iPhone) đổi theo giao diện đang hiện.
- **Phiếu khách (`web/form.html`) luôn Sáng**, không có nút đổi, không theo máy khách. Nhìn như website.
- Màu trạng thái giữ nghĩa cũ nhưng hợp hai nền: trễ hạn dùng đỏ đất (sáng `#a3341f`, tối `#f0a08c` trong bản vẽ), chỉ cho trễ hạn; "sắp đến hạn", "đã xong", "lịch tư vấn" phân biệt bằng chữ/gạch chân/chấm, mức màu tối thiểu. Mọi chữ đạt tương phản 4.5:1 ở cả hai nền.
- Bố cục Sắp tới theo bản vẽ: kicker "sắp tới" + tiêu đề in hoa; ô lễ gần nhất là khung viền mảnh (Sáng) / thẻ hơi sáng hơn nền (Tối) với số ngày lớn, tên cặp đôi, dòng loại lễ · ngày · nơi, nhãn giờ ekip dạng viên thuốc đặc; dải việc gấp có chấm đỏ đất; cuộn tháng "THÁNG 12/2026 · n đám"; mỗi lễ một dòng với cột ngày số lớn Archivo, tên in hoa, dòng phụ, "Còn n ngày" (≤ 7 ngày thì gạch chân đậm thay cho màu vàng cũ). Thanh tab đáy 6 tab như hiện tại.
- Logo: dùng logo chữ của website (`public/brand/logo-ink.webp` cho Sáng, `logo-white.webp` cho Tối, lấy từ repo website).

## Không làm (non-goals)

- Không đổi tính năng, dữ liệu, quyền, luồng hay chữ nội dung (trừ chữ thuộc về trang trí bị bỏ).
- Không đổi website.
- Không dùng chung file màu giữa hai repo; chép giá trị và ghi "lấy từ website" trong DESIGN.md.
- Không thêm giao diện thứ ba hay tuỳ chọn màu nhấn.

## Không được xảy ra (anti-goals)

- Còn sót xanh hoàng gia, vàng Quicksand, sao, khung viền vàng, quầng sáng hay ảnh địa danh ở bất kỳ màn nào.
- Chớp màu sai khi mở app, hoặc phiếu khách hiện tối.
- Chữ khó đọc ở một trong hai giao diện; nút nhỏ hơn 44px.
- Vượt ngân sách dung lượng: app ≤ 200 KB gzip, phiếu khách ≤ 80 KB gzip (`web/scripts/size.mjs`).
- Hiệu ứng chạy khi máy bật giảm chuyển động.

## Ràng buộc

- Stack giữ nguyên: Vite + Preact + Firebase trong `web/`, CSS một file `web/src/styles.css`, test vitest + `web/test/smoke.py`, CI ở `.github/workflows`.
- Chữ gửi khách xưng "mình", gọi "bạn"/"hai bạn", không "anh chị".
- Trước khi đẩy lên (push/deploy) phải hỏi anh Thắng và cho anh xem ảnh chụp màn hình điện thoại (390px) cả Sáng lẫn Tối.

## Các cách đã cân nhắc

1. **Viết lại lớp giao diện từ gốc** (anh chọn): thay token bằng bộ của website (hai bộ Sáng/Tối), xoá lớp `.cine`/Hướng D, `Sky`, ảnh địa danh, làm lại kiểu từng thành phần trong `styles.css`, thêm nút đổi giao diện. Tốn công nhất nhưng gọn, nhẹ, một chỗ để sửa.
2. Phủ lớp "kiểu website" lên lớp cũ: nhanh nhưng hai lớp đè nhau, nặng file, dễ sót màu cũ. Loại.
3. Dùng chung file token giữa website và app: hai repo riêng, nối phức tạp, lợi ít. Loại.

## Đã quyết

- Hai giao diện A (Sáng) và C (Tối) như bản vẽ; mặc định Tự động; nút đổi trên đầu trang + bản đủ trong Thêm; lưu theo máy.
- Phiếu khách luôn Sáng.
- Bỏ ảnh địa danh: gỡ khỏi Sắp tới và Hồ sơ; xoá `web/public/places/`, `domain/place.ts` và test của nó, `ui/Sky.tsx`.
- Font: Archivo (trục rộng), Be Vietnam Pro, Noto Serif Display nghiêng 300 — cùng bộ với website.

## Quyết định của Claude (anh Thắng xem lại khi đọc)

- **Màu chữ phụ:** `--ink-3 #8f887d` chỉ dùng cho trang trí (kẻ, biểu tượng mờ), không dùng cho chữ vì không đạt 4.5:1 trên nền giấy. Chữ phụ dùng `--ink-2` (Sáng) / `#cfc8bc` (Tối).
- **Nút "+" nổi:** giữ nguyên chức năng, vẽ lại như bản vẽ: tròn đen chữ ngà (Sáng), tròn ngà chữ đen (Tối).
- **Phiếu khách:** ép giao diện Sáng ngay trong HTML, không có script đổi giao diện, `theme-color` cố định màu giấy. Dùng chung file CSS được, miễn giữ trong ngân sách mà `scripts/size.mjs` đo.
- **Màu Tối còn lại** (ô nhập, thông báo, viền focus, bề mặt phụ) suy từ bảng màu chân trang website và bản vẽ C: chỉ đen, ngà và các mức trong suốt của ngà; không thêm màu mới ngoài đỏ đất cho trễ hạn.
- **Chỗ trước đây có ảnh địa danh** (Hồ sơ, ô lễ): thay bằng đầu trang chữ cùng kiểu Sắp tới (kicker nghiêng + tên in hoa + dòng phụ), không thêm ảnh.

## Để lại cho người làm

- Cách nạp font (Google Fonts như hiện tại hay tự host như website) — miễn giữ ngân sách và có đủ dấu tiếng Việt.
- Tên token, cấu trúc CSS, chọn `[data-theme]` hay class trên `<html>`, biểu tượng mặt trời/mặt trăng (vẽ SVG như bộ `icons.tsx`).
- Kiểu cụ thể của các màn chưa có trong bản vẽ (Hồ sơ, Việc, Kho, Thợ, Thêm, Gate, bảng nhập), theo đúng ngôn ngữ của Sắp tới và website.
- Cập nhật `DESIGN.md` (bỏ phần Hướng D và bảng màu cũ, ghi hệ mới, hai giao diện, nút đổi) và test smoke cho: không còn màu cũ, phiếu khách luôn sáng, nút đổi lưu và áp trước khi vẽ, tương phản đạt ở cả hai giao diện.
