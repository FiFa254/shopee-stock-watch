using MongoDB.Driver;
using ShopeeStockWatch.Data;
using ShopeeStockWatch.Models;

namespace ShopeeStockWatch.Services;

public class StockWatchStore
{
    private readonly StockWatchDbContext _db;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public StockWatchStore(StockWatchDbContext db)
    {
        _db = db;
    }

    public async Task<StockWatchState> GetStateAsync(CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            return await LoadStateAsync(cancellationToken);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<StockWatchItem> AddItemAsync(AddStockWatchItemRequest input, CancellationToken cancellationToken = default)
    {
        if (!input.Url.Contains("shopee", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Please enter a Shopee product URL.");
        }

        await _lock.WaitAsync(cancellationToken);
        try
        {
            var item = new StockWatchItem
            {
                Name = string.IsNullOrWhiteSpace(input.Name) ? "Shopee product" : input.Name.Trim(),
                Url = input.Url.Trim(),
                Note = "เปิดลิงก์ Shopee แล้วกด มีของ หรือ ไม่มีของ"
            };

            await _db.Items.InsertOneAsync(item, cancellationToken: cancellationToken);
            await InsertEventAsync(NewEvent($"เพิ่ม \"{item.Name}\" ในรายการติดตาม", item.Id), cancellationToken);

            return item;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<StockWatchItem?> SetStatusAsync(string id, string status, CancellationToken cancellationToken = default)
    {
        if (status is not ("in_stock" or "out_of_stock"))
        {
            throw new InvalidOperationException("Status must be in_stock or out_of_stock.");
        }

        await _lock.WaitAsync(cancellationToken);
        try
        {
            var itemFilter = Builders<StockWatchItem>.Filter.Eq(entry => entry.Id, id);
            var item = await _db.Items.Find(itemFilter).FirstOrDefaultAsync(cancellationToken);
            if (item is null)
            {
                return null;
            }

            var previousStatus = item.Status;
            var now = DateTimeOffset.UtcNow;
            item.Status = status;
            item.Note = status == "in_stock" ? "บันทึกว่ามีของ" : "บันทึกว่าไม่มีของ";
            item.LastCheckedAt = now;

            if (status == "in_stock")
            {
                item.LastSeenInStockAt = now;
            }

            await _db.Items.ReplaceOneAsync(itemFilter, item, cancellationToken: cancellationToken);

            var statusLabel = status == "in_stock" ? "มีของ" : "ไม่มีของ";
            await InsertEventAsync(NewEvent($"\"{item.Name}\" → {statusLabel}", item.Id, status == "in_stock" ? "success" : "info"), cancellationToken);

            if (status == "in_stock" && previousStatus != "in_stock")
            {
                await InsertEventAsync(NewEvent($"\"{item.Name}\" อาจมีสต็อกแล้ว", item.Id, "success"), cancellationToken);
            }

            return item;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task DeleteItemAsync(string id, CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            var itemFilter = Builders<StockWatchItem>.Filter.Eq(entry => entry.Id, id);
            var item = await _db.Items.Find(itemFilter).FirstOrDefaultAsync(cancellationToken);
            await _db.Items.DeleteOneAsync(itemFilter, cancellationToken);

            if (item is not null)
            {
                await InsertEventAsync(NewEvent($"ลบ \"{item.Name}\" ออกจากรายการ", id), cancellationToken);
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task<StockWatchState> LoadStateAsync(CancellationToken cancellationToken)
    {
        var items = await _db.Items
            .Find(FilterDefinition<StockWatchItem>.Empty)
            .SortByDescending(item => item.CreatedAt)
            .ToListAsync(cancellationToken);

        var events = await _db.Events
            .Find(FilterDefinition<StockWatchEvent>.Empty)
            .SortByDescending(entry => entry.CreatedAt)
            .Limit(100)
            .ToListAsync(cancellationToken);

        var settingsFilter = Builders<AppSettingsDocument>.Filter.Eq(document => document.Id, "settings");
        var settingsDoc = await _db.Settings
            .Find(settingsFilter)
            .FirstOrDefaultAsync(cancellationToken)
            ?? new AppSettingsDocument();

        return new StockWatchState
        {
            Items = items,
            Events = events,
            Settings = new StockWatchSettings { DailyCheckHour = settingsDoc.DailyCheckHour }
        };
    }

    private async Task InsertEventAsync(StockWatchEvent entry, CancellationToken cancellationToken)
    {
        await _db.Events.InsertOneAsync(entry, cancellationToken: cancellationToken);
    }

    private static StockWatchEvent NewEvent(string message, string? itemId = null, string level = "info")
    {
        return new StockWatchEvent
        {
            ItemId = itemId,
            Level = level,
            Message = message
        };
    }
}
