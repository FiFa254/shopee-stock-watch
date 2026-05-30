import { getDb, ensureDefaults } from "./mongo.mjs";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

function resolveAction(event) {
  const url = new URL(event.rawUrl);
  const fromQuery = url.searchParams.get("action");
  if (fromQuery) {
    const queryId = url.searchParams.get("id");
    return {
      action: fromQuery,
      id: queryId ? decodeURIComponent(queryId) : undefined,
      url,
    };
  }

  const path = url.pathname.replace(/\/+$/, "");
  if (path.endsWith("/Stock/State")) return { action: "state", url };
  if (path.endsWith("/Stock/Add")) return { action: "add", url };
  const deleteMatch = path.match(/\/Stock\/Delete\/([^/]+)$/);
  if (deleteMatch) return { action: "delete", id: deleteMatch[1], url };
  const statusMatch = path.match(/\/Stock\/SetStatus\/([^/]+)$/);
  if (statusMatch) return { action: "setStatus", id: statusMatch[1], url };

  return { action: null, url };
}

function newEvent(message, itemId = null, level = "info") {
  return {
    _id: crypto.randomUUID().replace(/-/g, ""),
    ItemId: itemId,
    Level: level,
    Message: message,
    CreatedAt: new Date(),
  };
}

export async function handler(event) {
  const { action, id, url } = resolveAction(event);
  const method = event.httpMethod.toUpperCase();

  try {
    const db = await getDb();
    await ensureDefaults(db);

    const items = db.collection("watch_items");
    const events = db.collection("watch_events");

    if (action === "state" && method === "GET") {
      const itemList = await items.find({}).sort({ CreatedAt: -1 }).toArray();
      const eventList = await events.find({}).sort({ CreatedAt: -1 }).limit(100).toArray();
      const settingsDoc =
        (await db.collection("app_settings").findOne({ _id: "settings" })) ?? {
          _id: "settings",
          DailyCheckHour: 9,
        };

      return json(200, {
        items: itemList.map(normalizeItem),
        events: eventList.map(normalizeEvent),
        settings: {
          dailyCheckHour: settingsDoc.DailyCheckHour ?? settingsDoc.dailyCheckHour ?? 9,
        },
      });
    }

    if (action === "add" && method === "POST") {
      const body = JSON.parse(event.body || "{}");
      const name = (body.name || "").trim();
      const itemUrl = (body.url || "").trim();

      if (!itemUrl.toLowerCase().includes("shopee")) {
        return json(400, { error: "Please enter a Shopee product URL." });
      }

      const item = {
        _id: crypto.randomUUID().replace(/-/g, ""),
        Name: name || "Shopee product",
        Url: itemUrl,
        Desired: true,
        Status: "unknown",
        Note: "เปิดลิงก์ Shopee แล้วกด มีของ หรือ ไม่มีของ",
        CreatedAt: new Date(),
        LastCheckedAt: null,
        LastSeenInStockAt: null,
      };

      await items.insertOne(item);
      await events.insertOne(
        newEvent(`เพิ่ม "${item.Name}" ในรายการติดตาม`, item._id)
      );

      return json(200, normalizeItem(item));
    }

    if (action === "delete" && method === "DELETE") {
      const itemId = id || url.pathname.split("/").pop();
      const existing = await findItemById(items, itemId);
      await items.deleteOne({ _id: existing._id });
      if (existing) {
        await events.insertOne(
          newEvent(`ลบ "${existing.Name ?? existing.name}" ออกจากรายการ`, itemId)
        );
      }
      return json(200, { ok: true });
    }

    if (action === "setStatus" && method === "POST") {
      const itemId = id || url.pathname.split("/").pop();
      const body = JSON.parse(event.body || "{}");
      const status = body.status;

      if (status !== "in_stock" && status !== "out_of_stock") {
        return json(400, { error: "สถานะต้องเป็น in_stock หรือ out_of_stock" });
      }

      const existing = await findItemById(items, itemId);
      if (!existing) {
        return json(404, { error: "ไม่พบรายการนี้" });
      }

      const previousStatus = existing.Status ?? existing.status;
      const now = new Date();
      const updated = {
        ...existing,
        Status: status,
        Note: status === "in_stock" ? "บันทึกว่ามีของ" : "บันทึกว่าไม่มีของ",
        LastCheckedAt: now,
        LastSeenInStockAt:
          status === "in_stock"
            ? now
            : existing.LastSeenInStockAt ?? existing.lastSeenInStockAt ?? null,
      };

      await items.replaceOne({ _id: existing._id }, updated);

      const itemName = updated.Name ?? updated.name;
      const statusLabel = status === "in_stock" ? "มีของ" : "ไม่มีของ";
      await events.insertOne(
        newEvent(`"${itemName}" → ${statusLabel}`, itemId, "success")
      );

      if (status === "in_stock" && previousStatus !== "in_stock") {
        await events.insertOne(
          newEvent(`"${itemName}" อาจมีสต็อกแล้ว`, itemId, "success")
        );
      }

      return json(200, normalizeItem(updated));
    }

    return json(404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return json(500, { error: error.message || "Server error" });
  }
}

async function findItemById(collection, itemId) {
  if (!itemId) return null;
  const byId = await collection.findOne({ _id: itemId });
  if (byId) return byId;
  return collection.findOne({ Id: itemId });
}

function normalizeItem(doc) {
  return {
    id: doc._id,
    name: doc.Name ?? doc.name,
    url: doc.Url ?? doc.url,
    desired: doc.Desired ?? doc.desired,
    status: doc.Status ?? doc.status,
    note: doc.Note ?? doc.note,
    createdAt: doc.CreatedAt ?? doc.createdAt,
    lastCheckedAt: doc.LastCheckedAt ?? doc.lastCheckedAt,
    lastSeenInStockAt: doc.LastSeenInStockAt ?? doc.lastSeenInStockAt,
  };
}

function normalizeEvent(doc) {
  return {
    id: doc._id,
    itemId: doc.ItemId ?? doc.itemId,
    level: doc.Level ?? doc.level,
    message: doc.Message ?? doc.message,
    createdAt: doc.CreatedAt ?? doc.createdAt,
  };
}
