# Deploy Shopee Stock Watch ออนไลน์ฟรี (Netlify + Atlas)

โปรเจกต์นี้ deploy บน **Netlify** (หน้าเว็บ + API) + **MongoDB Atlas** (ฐานข้อมูลฟรี)

| ส่วน | บริการ |
|------|--------|
| เว็บ + API | [Netlify](https://netlify.com) |
| ฐานข้อมูล | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) M0 |

Repo: `https://github.com/FiFa254/shopee-stock-watch`

---

## 1. สร้าง MongoDB (Atlas)

1. สมัคร [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. สร้าง cluster **M0 Free**
3. **Database Access** → สร้าง user + password
4. **Network Access** → **Add IP Address** → `0.0.0.0/0` (ให้ Netlify Functions เข้าถึงได้)
5. **Connect** → Drivers → คัดลอก connection string  
   `mongodb+srv://USER:PASS@cluster....mongodb.net/?retryWrites=true&w=majority`

---

## 2. Deploy บน Netlify

1. Push โค้ดขึ้น GitHub
2. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
3. เลือก repo `shopee-stock-watch`
4. ค่า build (จาก `netlify.toml` อัตโนมัติ):
   - **Build command:** `npm run build`
   - **Publish directory:** `public`
   - **Functions:** `netlify/functions`
5. **Site configuration** → **Environment variables:**
   - `MONGODB_URI` = connection string จาก Atlas
   - `MONGODB_DATABASE_NAME` = `StockWatchDb` (ถ้าต้องการ)
6. **Deploy site**

ได้ URL เช่น `https://your-site.netlify.app`

---

## 3. รันบนเครื่อง (ASP.NET + MongoDB local)

ไม่ผ่าน Netlify — ใช้แอป .NET เดิม:

```powershell
cd WebApplication2
dotnet run --urls http://localhost:5243
```

ต้องมี MongoDB ที่ `localhost:27017` (ดู `appsettings.json`)

---

## 4. ทดสอบ build Netlify ในเครื่อง

ต้องติดตั้ง [Node.js](https://nodejs.org) ก่อน:

```powershell
cd WebApplication2
npm install
npm run build
```

โฟลเดอร์ `public/` จะถูกสร้างสำหรับ deploy

---

## 5. โครงสร้าง deploy

```
netlify.toml          # ตั้งค่า Netlify
netlify/functions/    # API (stock.mjs)
scripts/              # prepare-netlify.mjs → สร้าง public/
public/               # สร้างตอน build (ไม่ commit)
wwwroot/              # ต้นฉบับ CSS/JS (ใช้ทั้ง local และ Netlify)
```

---

## 6. ข้อจำกัดแพลน Free

- **Netlify Functions:** มี quota ฟรี; cold start ครั้งแรกอาจช้า
- **Atlas M0:** พอสำหรับใช้ส่วนตัว
- ไม่มี background job รายวันแบบ ASP.NET บน Netlify (บันทึกสถานะด้วยตนเองผ่านเว็บ)

---

## 7. Push การเปลี่ยนแปลง

```powershell
git add -A
git commit -m "Your message"
git push
```

Netlify จะ build ใหม่ถ้าเปิด continuous deployment
