import { MongoClient } from "mongodb";

let cachedClient;
let cachedDb;

export async function getDb() {
  if (cachedDb) return cachedDb;

  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!uri) {
    throw new Error("Set MONGODB_URI in Netlify environment variables.");
  }

  const dbName = process.env.MONGODB_DATABASE_NAME || "StockWatchDb";
  cachedClient = new MongoClient(uri);
  await cachedClient.connect();
  cachedDb = cachedClient.db(dbName);
  return cachedDb;
}

export async function ensureDefaults(db) {
  const settings = db.collection("app_settings");
  const existing = await settings.findOne({ _id: "settings" });
  if (!existing) {
    await settings.insertOne({ _id: "settings", DailyCheckHour: 9 });
  }
}
