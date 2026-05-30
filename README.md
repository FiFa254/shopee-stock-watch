# shopee-stock-watch — Shopee Stock Watch

ASP.NET Core MVC web application for tracking Shopee product availability. Data is stored in **MongoDB**.

## Tech Stack

- ASP.NET Core MVC (.NET 10)
- MongoDB (local)
- Background service for daily stock checks

## Prerequisites

- .NET 10 SDK
- **MongoDB Community Server** running on `localhost:27017`

## Configuration

MongoDB settings in `appsettings.json`:

```json
"MongoDb": {
  "ConnectionString": "mongodb://localhost:27017",
  "DatabaseName": "StockWatchDb"
}
```

Collections used:
- `watch_items` — products being tracked
- `watch_events` — activity log
- `app_settings` — daily check hour setting

## Run

```powershell
cd "C:\Users\64502\source\repos\shopee-stock-watch"
dotnet run --urls http://localhost:5243
```

Open: http://localhost:5243

## Features

- Add Shopee product URLs to a watch list
- Check stock on demand
- Automatic daily check (default 9:00 AM)
- Browser notifications when items come back in stock
- Data persisted in MongoDB (survives app restarts)

## Build

```powershell
dotnet build
```

## Deploy ออนไลน์ฟรี

ใช้ **Netlify** (เว็บ + API) + **MongoDB Atlas** (ฐานข้อมูล) — ดูขั้นตอนใน [DEPLOY.md](./DEPLOY.md)

รันบนเครื่องด้วย `dotnet run` ได้เหมือนเดิม (ไม่ผ่าน Netlify)
