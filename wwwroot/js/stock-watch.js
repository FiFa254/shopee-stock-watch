const stockItemsEl = document.querySelector("#stockItems");
const stockEventsEl = document.querySelector("#stockEvents");
const stockSummaryEl = document.querySelector("#stockSummary");
const stockAddForm = document.querySelector("#stockAddForm");
const stockCheckButton = document.querySelector("#stockCheckButton");
const stockNotifyButton = document.querySelector("#stockNotifyButton");

let previousInStock = new Set();

async function stockApi(path, options = {}) {
    const response = await fetch(path, {
        headers: { "content-type": "application/json" },
        ...options
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "เกิดข้อผิดพลาด");
    return body;
}

function stockStatusText(status) {
    return {
        in_stock: "มีสต็อก",
        out_of_stock: "หมด",
        unknown: "ไม่ทราบ"
    }[status] || "ไม่ทราบ";
}

function stockFormatDate(value) {
    if (!value) return "ยังไม่เคยตรวจ";
    return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function stockEscape(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    }[char]));
}

function stockMaybeNotify(items) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const current = new Set(items.filter((item) => item.status === "in_stock").map((item) => item.id));
    for (const item of items) {
        if (item.status === "in_stock" && !previousInStock.has(item.id)) {
            new Notification("แจ้งเตือนสต็อก Shopee", { body: `${item.name} อาจมีสต็อกแล้ว!` });
        }
    }
    previousInStock = current;
}

function stockRenderItems(items) {
    if (!items.length) {
        stockItemsEl.innerHTML = `<div class="sw-empty">ยังไม่มีสินค้าในรายการ — เพิ่มลิงก์ Shopee ด้านซ้าย</div>`;
        return;
    }

    stockItemsEl.innerHTML = items.map((item) => `
        <article class="sw-item">
            <div class="sw-item-main">
                <h3>${stockEscape(item.name)}</h3>
                <a class="sw-item-link" href="${stockEscape(item.url)}" target="_blank" rel="noreferrer">${stockEscape(item.url)}</a>
                <p class="sw-item-note">${stockEscape(item.note || "พร้อมตรวจสต็อก")} · ตรวจล่าสุด ${stockFormatDate(item.lastCheckedAt)}</p>
            </div>
            <div class="sw-item-side">
                <span class="sw-status ${stockEscape(item.status)}">${stockStatusText(item.status)}</span>
                <div class="sw-actions">
                    <a class="sw-btn sw-btn-outline" href="${stockEscape(item.url)}" target="_blank" rel="noreferrer">เปิด</a>
                    <button class="sw-btn sw-btn-outline sw-btn-danger" data-delete="${stockEscape(item.id)}" type="button">ลบ</button>
                </div>
            </div>
        </article>
    `).join("");
}

function stockRenderEvents(events) {
    if (!events.length) {
        stockEventsEl.innerHTML = `<p class="sw-summary">ยังไม่มีกิจกรรม</p>`;
        return;
    }

    stockEventsEl.innerHTML = events.slice(0, 50).map((event) => `
        <div class="sw-event ${stockEscape(event.level === "success" ? "success" : "")}">
            <span class="sw-event-message">${stockEscape(event.message)}</span>
            <time>${stockFormatDate(event.createdAt)}</time>
        </div>
    `).join("");
}

async function stockRefresh() {
    try {
        const state = await stockApi("/Stock/State");
        stockRenderItems(state.items);
        stockRenderEvents(state.events);
        stockSummaryEl.textContent = `${state.items.length} รายการ · ตรวจอัตโนมัติประมาณ ${state.settings.dailyCheckHour}:00 น.`;
        stockMaybeNotify(state.items);
    } catch (error) {
        stockSummaryEl.textContent = error.message;
        stockItemsEl.innerHTML = `<div class="sw-empty">ไม่สามารถโหลดข้อมูลได้ — ตรวจสอบว่า MongoDB เปิดอยู่</div>`;
    }
}

stockAddForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(stockAddForm);
    const submitBtn = stockAddForm.querySelector("[type=submit]");
    submitBtn.disabled = true;

    try {
        await stockApi("/Stock/Add", {
            method: "POST",
            body: JSON.stringify(Object.fromEntries(formData))
        });
        stockAddForm.reset();
        await stockRefresh();
    } catch (error) {
        alert(error.message);
    } finally {
        submitBtn.disabled = false;
    }
});

stockCheckButton.addEventListener("click", async () => {
    stockCheckButton.disabled = true;
    stockSummaryEl.textContent = "กำลังตรวจสอบ Shopee...";

    try {
        await stockApi("/Stock/Check", { method: "POST", body: "{}" });
        await stockRefresh();
    } catch (error) {
        stockSummaryEl.textContent = error.message;
    } finally {
        stockCheckButton.disabled = false;
    }
});

stockNotifyButton.addEventListener("click", async () => {
    if (!("Notification" in window)) {
        alert("เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน");
        return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
        stockNotifyButton.textContent = "แจ้งเตือนเปิดแล้ว";
    }
    await stockRefresh();
});

stockItemsEl.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;

    if (!confirm("ลบรายการนี้?")) return;

    try {
        await stockApi(`/Stock/Delete/${button.dataset.delete}`, { method: "DELETE" });
        await stockRefresh();
    } catch (error) {
        alert(error.message);
    }
});

stockItemsEl.innerHTML = `<div class="sw-loading">กำลังโหลด</div>`;
stockRefresh();
setInterval(stockRefresh, 30000);
