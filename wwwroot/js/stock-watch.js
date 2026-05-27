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
    if (!response.ok) throw new Error(body.error || "Request failed");
    return body;
}

function stockStatusText(status) {
    return {
        in_stock: "In stock",
        out_of_stock: "Sold out",
        unknown: "Unknown"
    }[status] || "Unknown";
}

function stockFormatDate(value) {
    if (!value) return "never";
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
            new Notification("Shopee stock alert", { body: item.name });
        }
    }
    previousInStock = current;
}

function stockRenderItems(items) {
    if (!items.length) {
        stockItemsEl.innerHTML = `<div class="stock-panel stock-empty">No products yet.</div>`;
        return;
    }

    stockItemsEl.innerHTML = items.map((item) => `
        <article class="stock-item">
            <div class="stock-item-main">
                <h2>${stockEscape(item.name)}</h2>
                <a href="${stockEscape(item.url)}" target="_blank" rel="noreferrer">${stockEscape(item.url)}</a>
                <p>${stockEscape(item.note || "Ready to check")} · Last checked ${stockFormatDate(item.lastCheckedAt)}</p>
            </div>
            <div class="stock-item-side">
                <span class="stock-status ${stockEscape(item.status)}">${stockStatusText(item.status)}</span>
                <div class="stock-actions">
                    <a class="btn btn-outline-secondary btn-sm" href="${stockEscape(item.url)}" target="_blank" rel="noreferrer">Open</a>
                    <button class="btn btn-outline-secondary btn-sm" data-delete="${stockEscape(item.id)}" type="button">Delete</button>
                </div>
            </div>
        </article>
    `).join("");
}

function stockRenderEvents(events) {
    if (!events.length) {
        stockEventsEl.innerHTML = `<p class="stock-muted">No activity yet.</p>`;
        return;
    }

    stockEventsEl.innerHTML = events.slice(0, 50).map((event) => `
        <div class="stock-event">
            <span>${stockEscape(event.message)}</span>
            <time>${stockFormatDate(event.createdAt)}</time>
        </div>
    `).join("");
}

async function stockRefresh() {
    const state = await stockApi("/Stock/State");
    stockRenderItems(state.items);
    stockRenderEvents(state.events);
    stockSummaryEl.textContent = `${state.items.length} product(s) · daily check around ${state.settings.dailyCheckHour}:00`;
    stockMaybeNotify(state.items);
}

stockAddForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(stockAddForm);
    await stockApi("/Stock/Add", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(formData))
    });
    stockAddForm.reset();
    await stockRefresh();
});

stockCheckButton.addEventListener("click", async () => {
    stockCheckButton.disabled = true;
    stockSummaryEl.textContent = "Checking Shopee...";
    try {
        await stockApi("/Stock/Check", { method: "POST", body: "{}" });
        await stockRefresh();
    } finally {
        stockCheckButton.disabled = false;
    }
});

stockNotifyButton.addEventListener("click", async () => {
    if (!("Notification" in window)) {
        alert("This browser does not support notifications.");
        return;
    }
    await Notification.requestPermission();
    await stockRefresh();
});

stockItemsEl.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;
    await stockApi(`/Stock/Delete/${button.dataset.delete}`, { method: "DELETE" });
    await stockRefresh();
});

stockRefresh();
setInterval(stockRefresh, 30000);
