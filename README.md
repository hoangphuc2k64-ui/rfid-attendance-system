# Dự án điểm danh RFID – ESP32-S3 + Google Sheet + Apps Script

## Cấu trúc project
```
rfid-attendance/
├── platformio.ini     # (cài Platformio IDE) cấu hình board + thư viện
├── wokwi.toml         # trỏ Wokwi extension tới file firmware build ra
├── diagram.json       # sơ đồ mạch mô phỏng (RFID-RC522 + ESP32-S3 + buzzer)
├── Code.gs            # code Google Apps Script (dán vào script.google.com)
├── src/
│   └── main.cpp       # code chính chạy trên ESP32-S3
├── local-proxy/
│   └── server.js      # (cài Node) chạy local  
└── README.md
```

## Cách chạy trong VS Code

### 1. Cài extension
- **PlatformIO IDE**
- **Wokwi for VS Code** (đăng ký license miễn phí tại https://wokwi.com/vscode nếu dùng cho học tập/cá nhân)

### 2. Mở thư mục project
Mở thư mục `rfid-attendance` bằng VS Code (File > Open Folder).
Tạo các file và paste các code đã được viết sẵn hoặc clone về
PlatformIO sẽ tự nhận diện `platformio.ini` và cài icon PlatformIO ở sidebar trái.

### 3. Cấu hình Google Sheet + Apps Script (làm trước)
1. Tạo Google Sheet mới, đặt tên tùy ý.
2. Tạo 2 sheet con: `SinhVien` và `DiemDanh` (xem cấu trúc cột trong Code.gs).
3. Nhập vài dòng dữ liệu mẫu vào `SinhVien` (UID để tạm, sẽ cập nhật UID thật sau khi test).
4. Mở Tiện ích mở rộng > Apps Script, dán nội dung `Code.gs` vào.
5. Deploy as Web App (xem hướng dẫn chi tiết trong comment đầu file Code.gs).
6. Copy URL `https://.../exec`.

### 4. Cập nhật code ESP32
Mở `src/main.cpp`, sửa dòng URL (request đến server)
```
const char* proxyURL = "http://<IP máy bạn>:3000/";  # đang để port của server.js là 3000
```

### 5. Cập nhật code trong server 
Mở `local-proxy`, sửa URL thành URL đang hoạt động của App Script
```
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/.../exec';
```

### 6. Build firmware
Trong sidebar PlatformIO, bấm **Build** (icon dấu check), hoặc:
- Mở Command Palette (`Ctrl+Shift+P`) → gõ `PlatformIO: Build`

Hoặc thoát Visual Studio Code vào lại sẽ tự build 
Việc build sẽ tạo ra file `.pio/build/esp32-s3-devkitc-1/firmware.bin`
mà `wokwi.toml` đang trỏ tới.

### 7. Chạy mô phỏng Wokwi (*)
Mở file `diagram.json`, bấm nút **Play/Start Simulation** (do Wokwi extension thêm vào,
thường ở góc trên phải editor), hoặc Command Palette → `Wokwi: Start Simulator`.

### 8. Test
- Trong cửa sổ mô phỏng, click vào đầu đọc RFID (RC522) → chọn **"Read RFID Card"**.
- Nhập UID (hex) trùng với UID trong sheet `SinhVien` để test hợp lệ,
  hoặc UID ngẫu nhiên để test trường hợp không tìm thấy.
- Theo dõi kết quả trong **Serial Monitor** (tab dưới cùng của Wokwi panel).
- Kiểm tra sheet `DiemDanh` — Apps Script sẽ tự ghi log mỗi lần quẹt thẻ.

## Lưu ý quan trọng
- `Wokwi-GUEST` là mạng WiFi ảo Wokwi cấp sẵn cho phép gọi Internet thật —
  không cần chỉnh sửa gì, chỉ cần mô phỏng ESP32 có hỗ trợ WiFi (ESP32-S3 có sẵn).
- Nếu gặp lỗi HTTP 302/301 khi gọi Apps Script, đảm bảo dòng
  `http.setFollowRedirects(...)` có trong code (đã có sẵn trong main.cpp).
- Muốn tránh 1 sinh viên quẹt trùng nhiều lần trong ngày: thêm cột
  "Đã điểm danh" trong sheet SinhVien và kiểm tra thêm logic trong Code.gs.
- Muốn bảo mật hơn: thêm tham số `key=xxxx` cố định trong URL và kiểm tra
  trong hàm `doGet` trước khi cho tra cứu.
