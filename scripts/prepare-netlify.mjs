import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

mkdirSync(join(publicDir, "css"), { recursive: true });
mkdirSync(join(publicDir, "js"), { recursive: true });

cpSync(join(root, "wwwroot", "css", "site.css"), join(publicDir, "css", "site.css"));
cpSync(join(root, "wwwroot", "js", "stock-watch.js"), join(publicDir, "js", "stock-watch.js"));

const indexHtml = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="netlify-stock-api" content="/.netlify/functions/stock" />
  <title>Shopee Stock Watch</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
  <link rel="stylesheet" href="/css/site.css" />
</head>
<body>
  <header class="sw-header">
    <div class="sw-container sw-header-inner">
      <a class="sw-brand" href="/">
        <span class="sw-brand-icon">S</span>
        <span>Shopee Stock Watch</span>
      </a>
      <span class="sw-badge">Netlify</span>
    </div>
  </header>

  <main class="sw-main">
    <div class="sw-container">
      <section class="sw-hero">
        <div>
          <p class="sw-eyebrow">ติดตามสินค้า Shopee</p>
          <h1>Stock Watch</h1>
          <p class="sw-lead">เพิ่มลิงก์สินค้า เปิดดูใน Shopee แล้วกดบันทึกสถานะ มีของ / ไม่มีของ (ฟรี ไม่ดึงข้อมูลจาก Shopee อัตโนมัติ)</p>
        </div>
        <button id="stockNotifyButton" class="sw-btn sw-btn-ghost" type="button">เปิดการแจ้งเตือน</button>
      </section>

      <div class="sw-dashboard">
        <aside class="sw-sidebar">
          <section class="sw-panel">
            <h2>เพิ่มสินค้า</h2>
            <form id="stockAddForm" class="sw-form">
              <label>
                ชื่อสินค้า
                <input class="sw-input" name="name" placeholder="หูฟัง, คีย์บอร์ด, ของ limited" required />
              </label>
              <label>
                URL Shopee
                <input class="sw-input" name="url" placeholder="https://shopee.co.th/product/..." required />
              </label>
              <p class="sw-hint">คัดลอกลิงก์จากแถบที่อยู่หลังเปิดสินค้า (ล็อกอิน Shopee ก่อน) จากนั้นกด เปิด แล้วเลือก มีของ / ไม่มีของ</p>
              <button class="sw-btn sw-btn-primary sw-btn-full" type="submit">เพิ่มรายการ</button>
            </form>
          </section>

          <section class="sw-panel sw-panel-compact">
            <p id="stockSummary" class="sw-summary">กำลังโหลด...</p>
          </section>

          <section class="sw-panel">
            <h2>กิจกรรมล่าสุด</h2>
            <div id="stockEvents" class="sw-timeline"></div>
          </section>
        </aside>

        <section class="sw-content">
          <div class="sw-content-header">
            <h2>รายการที่ติดตาม</h2>
          </div>
          <div id="stockItems" class="sw-items"></div>
        </section>
      </div>
    </div>
  </main>

  <footer class="sw-footer">
    <div class="sw-container">
      <p>&copy; ${new Date().getFullYear()} Shopee Stock Watch · บันทึกสถานะด้วยตนเอง</p>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/js/stock-watch.js"></script>
</body>
</html>
`;

writeFileSync(join(publicDir, "index.html"), indexHtml);
console.log("Netlify public/ prepared.");
