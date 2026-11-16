# Sổ Tay Nhắc Việc: cài app thật lên iPhone và iPad (không cần Mac)

Làm một lần, mất khoảng 45 phút. Mọi bước đều miễn phí và làm trên máy tính Windows.

| Phần | Làm ở đâu | Để làm gì |
|---|---|---|
| A. Firebase | console.firebase.google.com | Nơi lưu và đồng bộ dữ liệu, đăng nhập Google |
| B. GitHub | github.com | Máy Mac trên mạng tự build file cài `SoTay.ipa` |
| C. Sideloadly | Máy Windows + dây cáp | Cài `SoTay.ipa` lên iPhone, iPad |
| D. Chuyển dữ liệu | Bản Sổ Tay trong Claude → app mới | Mang việc, phiếu khách, link bàn giao sang |

---

## A. Tạo Firebase (khoảng 15 phút)

1. Vào **console.firebase.google.com**, đăng nhập bằng Gmail của studio, bấm **Create a project**, đặt tên `sotay-mthanglee`. Tắt Google Analytics rồi bấm **Create**.
2. Menu trái: **Build → Authentication → Get started → Sign-in method → Google → Enable**. Chọn email hỗ trợ rồi bấm **Save**.
   *Phải bật bước này trước bước 6, nếu không file plist sẽ thiếu mã đăng nhập.*
3. **Build → Firestore Database → Create database**. Location chọn **asia-southeast1 (Singapore)**, chọn **Start in production mode**, rồi bấm **Create**.
4. Trong Firestore, mở tab **Rules**. Xoá hết, dán nội dung file `firestore.rules` (trong thư mục này) vào, rồi bấm **Publish**.
   Quy tắc này đảm bảo mỗi tài khoản Google chỉ thấy dữ liệu của chính mình.
5. Bấm bánh răng ⚙ → **Project settings**. Ở mục *Your apps*, bấm biểu tượng **</>** (Web), đặt tên `Sổ Tay web`, rồi bấm **Register app**.
   Firebase hiện một đoạn `const firebaseConfig = { apiKey: "...", ... }`. Chép phần trong ngoặc nhọn ra Notepad và **thêm dấu ngoặc kép cho tên mỗi mục**, như sau:
   ```json
   {"apiKey":"AIza...","authDomain":"sotay-mthanglee.firebaseapp.com","projectId":"sotay-mthanglee","storageBucket":"sotay-mthanglee.firebasestorage.app","messagingSenderId":"123...","appId":"1:123...:web:abc..."}
   ```
   Đây là **FIREBASE_CONFIG**, sẽ dùng ở phần B.
6. Vẫn ở *Your apps*, bấm **Add app → iOS**. Ô *Apple bundle ID* điền đúng `vn.mthanglee.sotay`, bấm **Register app**, rồi **Download GoogleService-Info.plist**. Các bước còn lại bấm Next cho qua.
7. Vào **console.cloud.google.com** và chọn đúng dự án `sotay-mthanglee` ở thanh trên cùng.
   - Vào **APIs & Services → Library**, tìm và bấm **Enable** cho **Google Calendar API** và **Google Drive API**.
   - Vào **Google Auth Platform**, mục **Audience**. Để chế độ **Testing**, rồi ở **Test users** bấm **Add users** và thêm Gmail của anh (và Gmail của ekip nếu ekip cũng dùng app).
8. Quay lại Firebase: **Authentication → Settings → Authorized domains → Add domain**, điền `TÊN-GITHUB.github.io` (làm sau khi có tài khoản GitHub ở phần B).

> Lần đầu đăng nhập, Google sẽ báo "Google chưa xác minh ứng dụng này", vì app chỉ dùng nội bộ. Bấm **Tiếp tục**. App chỉ xin quyền **xem** Lịch và Drive, không sửa hay xoá gì.

---

## B. Build app trên GitHub (khoảng 10 phút, sau đó chờ khoảng 15 phút)

1. Tạo tài khoản ở **github.com**, rồi bấm **New repository**, đặt tên `sotay`.
   - Chọn **Public** nếu muốn có cả bản web cho máy tính miễn phí (mã nguồn sẽ công khai; dữ liệu khách nằm ở Firebase, không nằm trong mã).
   - Chọn **Private** nếu chỉ cần app iPhone, iPad.
2. Trong repository, bấm **uploading an existing file**. Giải nén `sotay-app.zip`, rồi **kéo toàn bộ nội dung bên trong** (kể cả thư mục `.github`) thả vào trang. Bấm **Commit changes**.
3. Vào **Settings → Secrets and variables → Actions → New repository secret**, tạo 2 secret:
   - `FIREBASE_CONFIG`: dán đoạn JSON ở bước A5.
   - `GOOGLE_SERVICE_INFO_PLIST`: mở file `GoogleService-Info.plist` bằng Notepad, chép toàn bộ rồi dán vào.
4. (Chỉ khi chọn Public) Vào **Settings → Pages → Source**, chọn **GitHub Actions**.
5. Mở tab **Actions → Build Sổ Tay → Run workflow**. Khoảng 15 phút sau, mở lần chạy đó, kéo xuống mục **Artifacts** và tải **SoTay-ipa-…** về. Giải nén ra được `SoTay.ipa`.
   Bản web nằm ở `https://TÊN-GITHUB.github.io/sotay/`. Mở bằng Chrome trên máy tính, bấm biểu tượng **Cài đặt app** trên thanh địa chỉ là có app trên Windows.

> Lần build đầu mà báo lỗi (dấu ✗ đỏ), anh mở bước bị lỗi, chép đoạn chữ đỏ gửi Claude để sửa.

---

## C. Cài lên iPhone và iPad bằng Sideloadly (khoảng 10 phút)

1. Cài **iTunes** từ apple.com (bản tải trực tiếp, **không** lấy bản trên Microsoft Store), rồi cài **Sideloadly** từ sideloadly.io.
2. Cắm iPhone vào máy tính bằng dây, mở khoá máy và bấm **Tin cậy**.
3. Mở Sideloadly, kéo `SoTay.ipa` vào, điền Apple ID của anh, rồi bấm **Start**. Nhập mã xác minh nếu Apple hỏi.
4. Trên iPhone:
   - Vào **Cài đặt → Cài đặt chung → Quản lý VPN & thiết bị**, chọn Apple ID của anh, rồi bấm **Tin cậy**.
   - Vào **Cài đặt → Quyền riêng tư & Bảo mật → Chế độ nhà phát triển**, bật lên rồi khởi động lại máy.
5. Mở app **Sổ Tay**, đăng nhập Google, và cho phép **Thông báo** để máy reo đúng giờ kể cả khi đã tắt app.
6. Làm lại các bước trên với iPad.

**Với Apple ID miễn phí, app chạy được 7 ngày.** Trước khi hết hạn, cắm máy và bấm Start trong Sideloadly lần nữa. Dữ liệu không mất, vì nằm trên Firebase.
Trong Sideloadly có tuỳ chọn **Auto-refresh** để tự gia hạn qua Wi-Fi khi máy tính đang bật.
Nếu sau này đăng ký **Apple Developer (99 USD/năm)**, app sẽ cài qua TestFlight, dùng 90 ngày mỗi bản và cài được cho cả ekip. Khi đó nhờ Claude thêm bước ký app vào quy trình build.

---

## D. Chuyển dữ liệu từ bản Sổ Tay trong Claude

1. Mở bản Sổ Tay trong Claude trên máy tính, vào **Cài đặt & chuông → Xuất dữ liệu (file .json)**.
2. Mở app mới:
   - **Trên máy tính:** dùng bản web ở mục B5.
   - **Trên iPhone:** gửi file .json qua Zalo hoặc Google Drive cho chính mình, rồi lưu vào app Tệp.
3. Đăng nhập Google, vào **Cài đặt & chuông → Nhập dữ liệu từ file .json** và chọn file vừa xuất. App tự tải lại và đồng bộ sang mọi máy.
4. Từ đây chỉ dùng app mới. Bản trong Claude vẫn mở được, nhưng dữ liệu của hai bản không đồng bộ với nhau.

---

## Khác biệt so với bản trong Claude

| | Bản trong Claude | App mới |
|---|---|---|
| Chuông khi đã tắt app | Không reo (phải dùng file .ics) | **Reo đúng giờ**, dùng tiếng chuông riêng của app |
| Mở app | Qua Claude hoặc trình duyệt | Biểu tượng riêng trên iPhone và iPad |
| Đồng bộ | Tài khoản Claude | Tài khoản Google (Firebase) |
| Đọc Google Lịch và Form | Qua kết nối của Claude | Trực tiếp. Mỗi giờ có thể phải bấm đăng nhập Google lại một lần khi tải lịch |
| Quét hội thoại bằng AI | Có | **Không có**, vì tính năng này chạy nhờ Claude |
| Thông báo phiếu mới, link vừa cập nhật | Thông báo của trình duyệt | Thông báo của iPhone |

---

## Cập nhật app về sau

Nhờ Claude sửa app, rồi thay file `src/app.html` (và các file khác Claude gửi) trên GitHub. GitHub sẽ tự build bản `.ipa` mới, anh chỉ cần cài lại bằng Sideloadly. Dữ liệu vẫn giữ nguyên.
