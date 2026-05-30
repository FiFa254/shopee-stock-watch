const stockItemsEl = document.querySelector("#stockItems");
const stockEventsEl = document.querySelector("#stockEvents");
const stockSummaryEl = document.querySelector("#stockSummary");
const stockAddForm = document.querySelector("#stockAddForm");
const stockNotifyButton = document.querySelector("#stockNotifyButton");

let previousInStock = new Set();

function stockResolveApiUrl(path) {
    const netlifyApi = document.querySelector('meta[name="netlify-stock-api"]')?.content;
    if (!netlifyApi) {
        return path;
    }

    if (path === "/Stock/State") {
        return `${netlifyApi}?action=state`;
    }
    if (path === "/Stock/Add") {
        return `${netlifyApi}?action=add`;
    }
    const deleteMatch = path.match(/^\/Stock\/Delete\/(.+)$/);
    if (deleteMatch) {
        return `${netlifyApi}?action=delete&id=${encodeURIComponent(deleteMatch[1])}`;
    }
    const statusMatch = path.match(/^\/Stock\/SetStatus\/(.+)$/);
    if (statusMatch) {
        return `${netlifyApi}?action=setStatus&id=${encodeURIComponent(statusMatch[1])}`;
    }

    return path;
}

async function stockApi(path, options = {}) {
    const response = await fetch(stockResolveApiUrl(path), {
        headers: { "content-type": "application/json" },
        ...options
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "เกิดข้อผิดพลาด");
    return body;
}

function stockStatusKey(item) {
    const raw = item?.status ?? item?.Status ?? "unknown";
    const normalized = String(raw).trim().toLowerCase().replace(/-/g, "_");
    if (normalized === "in_stock" || normalized === "instock") return "in_stock";
    if (normalized === "out_of_stock" || normalized === "outofstock" || normalized === "sold_out") {
        return "out_of_stock";
    }
    return "unknown";
}

function stockStatusText(statusKey) {
    return {
        in_stock: "มีของ",
        out_of_stock: "ไม่มีของ",
        unknown: "ยังไม่ทราบ"
    }[statusKey] || "ยังไม่ทราบ";
}

function stockFormatDate(value) {
    if (!value) return "ยังไม่เคยบันทึก";
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

function stockItemId(item) {
    return item.id ?? item.Id ?? "";
}

function stockMaybeNotify(items) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const current = new Set(items.filter((item) => stockStatusKey(item) === "in_stock").map(stockItemId));
    for (const item of items) {
        const id = stockItemId(item);
        const name = item.name ?? item.Name ?? "สินค้า";
        if (stockStatusKey(item) === "in_stock" && !previousInStock.has(id)) {
            new Notification("แจ้งเตือนสต็อก Shopee", { body: `${name} มีของแล้ว!` });
        }
    }
    previousInStock = current;
}

function stockRenderItems(items) {
    if (!items.length) {
        stockItemsEl.innerHTML = `<div class="sw-empty">ยังไม่มีสินค้าในรายการ — เพิ่มลิงก์ Shopee จากแบบฟอร์มด้านล่าง</div>`;
        return;
    }

    stockItemsEl.innerHTML = items.map((item) => {
        const statusKey = stockStatusKey(item);
        const url = item.url ?? item.Url ?? "";
        const id = stockItemId(item);
        const name = item.name ?? item.Name ?? "สินค้า";
        const hint = statusKey === "unknown"
            ? `<p class="sw-item-hint">กด เปิด ดูใน Shopee แล้วเลือก มีของ หรือ ไม่มีของ</p>`
            : "";
        return `
        <article class="sw-item sw-item-${stockEscape(statusKey)}">
            <div class="sw-item-body">
                <h3 class="sw-item-name">${stockEscape(name)}</h3>
                ${hint}
            </div>
            <span class="sw-status sw-status-${stockEscape(statusKey)}">${stockStatusText(statusKey)}</span>
            <div class="sw-item-actions">
                <a class="sw-btn sw-btn-outline" href="${stockEscape(url)}" target="_blank" rel="noreferrer">เปิด</a>
                <button class="sw-btn sw-btn-outline sw-btn-status-in" data-status="in_stock" data-id="${stockEscape(id)}" type="button">มีของ</button>
                <button class="sw-btn sw-btn-outline sw-btn-status-out" data-status="out_of_stock" data-id="${stockEscape(id)}" type="button">ไม่มีของ</button>
                <button class="sw-btn sw-btn-outline sw-btn-danger" data-delete="${stockEscape(id)}" type="button">ลบ</button>
            </div>
        </article>`;
    }).join("");
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
        const inStock = state.items.filter((item) => stockStatusKey(item) === "in_stock").length;
        stockSummaryEl.textContent = `${state.items.length} รายการ · มีของ ${inStock} รายการ`;
        stockMaybeNotify(state.items);
    } catch (error) {
        stockSummaryEl.textContent = error.message;
        stockItemsEl.innerHTML = `<div class="sw-empty">ไม่สามารถโหลดข้อมูลได้ — ตรวจสอบ MongoDB / MONGODB_URI บน Netlify</div>`;
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
    const statusBtn = event.target.closest("[data-status]");
    if (statusBtn) {
        const id = statusBtn.dataset.id;
        const status = statusBtn.dataset.status;
        statusBtn.disabled = true;
        try {
            await stockApi(`/Stock/SetStatus/${id}`, {
                method: "POST",
                body: JSON.stringify({ status })
            });
            await stockRefresh();
        } catch (error) {
            alert(error.message);
        } finally {
            statusBtn.disabled = false;
        }
        return;
    }

    const deleteBtn = event.target.closest("[data-delete]");
    if (!deleteBtn) return;

    if (!confirm("ลบรายการนี้?")) return;

    try {
        await stockApi(`/Stock/Delete/${deleteBtn.dataset.delete}`, { method: "DELETE" });
        await stockRefresh();
    } catch (error) {
        alert(error.message);
    }
});

stockItemsEl.innerHTML = `<div class="sw-loading">กำลังโหลด</div>`;
stockRefresh();
setInterval(stockRefresh, 30000);
