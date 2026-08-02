# HSK Vocab App — bản có đăng nhập + lưu tiến trình

Ứng dụng luyện từ vựng HSK 1-3 (600 từ), có đăng ký/đăng nhập và tự động lưu
tiến trình học (từ đã nhớ, chủ đề đang luyện) lên server, đồng bộ được trên
nhiều thiết bị.

## Cấu trúc project

```
├── index.html        <- toàn bộ giao diện + logic học (1 file, không cần build)
├── api/
│   ├── register.js   <- POST /api/register
│   ├── login.js       <- POST /api/login
│   ├── logout.js      <- POST /api/logout
│   ├── me.js           <- GET  /api/me      (kiểm tra đã đăng nhập chưa)
│   └── progress.js    <- GET/POST /api/progress  (đọc/ghi tiến trình học)
├── lib/
│   ├── db.js           <- kết nối Postgres (Neon), tự tạo bảng khi cần
│   └── auth.js         <- xử lý JWT + cookie đăng nhập
├── sql/schema.sql      <- cấu trúc bảng (chỉ để tham khảo, không cần chạy tay)
├── package.json
└── .env.example
```

Không cần bước "build" gì cả — Vercel tự nhận diện `index.html` là trang tĩnh
và mỗi file trong `api/` là 1 serverless function.

## Deploy lên Vercel — từng bước

### 1. Đưa code lên GitHub
```
git init
git add .
git commit -m "HSK vocab app"
```
Tạo 1 repo mới trên github.com (Public hoặc Private đều được), rồi:
```
git remote add origin https://github.com/<ten-ban>/<ten-repo>.git
git push -u origin main
```

### 2. Import vào Vercel
1. Vào **vercel.com** → đăng nhập bằng GitHub
2. **Add New → Project** → chọn repo vừa tạo → **Deploy**
3. Lần deploy đầu sẽ **lỗi** (vì chưa có database/JWT_SECRET) — không sao, làm tiếp bước 3-4 rồi deploy lại

### 3. Thêm database (Neon Postgres, miễn phí)
1. Vào project trên Vercel → tab **Storage**
2. Bấm **Create Database** (hoặc **Browse Marketplace**) → chọn **Neon**
3. Làm theo hướng dẫn để tạo database → **Connect** vào project của bạn
4. Vercel sẽ tự động thêm biến môi trường `DATABASE_URL` — không cần copy tay

### 4. Thêm JWT_SECRET (bắt buộc)
1. Vào project → **Settings → Environment Variables**
2. Thêm biến:
   - Name: `JWT_SECRET`
   - Value: một chuỗi ngẫu nhiên, càng dài càng khó đoán càng tốt (ví dụ tự gõ lung tung 40-50 ký tự, hoặc dùng máy tính tạo mật khẩu ngẫu nhiên)
3. Save

### 5. Deploy lại
Vào tab **Deployments** → bấm vào dấu **...** ở bản deploy gần nhất → **Redeploy**

### 6. Xong!
Mở link app (dạng `https://ten-repo.vercel.app`) → bấm **Tài khoản → Đăng ký**
để tạo tài khoản đầu tiên. Từ giờ mỗi lần đánh dấu "Đã nhớ" hoặc đổi chủ đề,
tiến trình sẽ tự lưu lên server — đăng nhập từ điện thoại/máy tính khác cũng
thấy đúng tiến trình đó.

## Chạy thử ở máy local (không bắt buộc)

Cần cài Vercel CLI:
```
npm install -g vercel
vercel link          # noi voi project Vercel da tao
vercel env pull .env.development.local     # tai bien moi truong thuc ve may
npm install
vercel dev
```
Mở `http://localhost:3000`.

## Lưu ý bảo mật

- Mật khẩu được hash bằng bcrypt trước khi lưu, không lưu dạng chữ thường (plain text).
- Phiên đăng nhập dùng JWT ký bằng `JWT_SECRET`, lưu trong cookie `httpOnly`
  (JavaScript phía trình duyệt không đọc được), tồn tại 180 ngày.
- Đây là ứng dụng học cá nhân đơn giản — chưa có: quên mật khẩu, xác thực email,
  giới hạn số lần đăng nhập sai (rate limiting). Nếu định chia sẻ rộng rãi cho
  nhiều người dùng thật, nên bổ sung thêm các phần này.
