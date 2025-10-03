## سامانه مشاوره مدرسه

Full‑stack Node/Express app with login/sign up, role‑based panels (student/counselor), image uploads, charts (Chart.js), and SMS notification on new student registration.

### اجرای محلی
```bash
npm install
PORT=3000 node server.js
# http://localhost:3000
```

ورود مشاور:
- ایمیل: `mzhganasdyanzadh@gmail.com`
- رمز: `MohiDoni23`

### متغیرهای محیطی
یک فایل `.env` بسازید (یا از `.env.example` کپی کنید):
```
SESSION_SECRET=replace-with-strong-secret
COUNSELOR_PHONE=+989xxxxxxxxx
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

اگر اطلاعات Twilio را پر نکنید، پیامک به صورت Mock در لاگ نوشته می‌شود.

### استقرار با Render

1) ریپو را به GitHub پوش کنید. سپس در Render (New → Web Service) ریپو را وصل کنید.
2) Build: `npm install` ، Start: `node server.js`
3) Environment → متغیرها را از `.env.example` تنظیم کنید.
4) Disk اضافه کنید: Name: `uploads` و Mount Path: `/app/uploads`

یا از Blueprint این ریپو استفاده کنید: `render.yaml`

### ساخت Docker image
```bash
docker build -t school-counseling-portal .
docker run -p 3000:3000 --env-file .env -v $(pwd)/uploads:/app/uploads school-counseling-portal
```
