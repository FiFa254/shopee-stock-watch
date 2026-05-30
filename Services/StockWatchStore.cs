using MongoDB.Driver;
using ShopeeStockWatch.Data;
using ShopeeStockWatch.Models;

namespace ShopeeStockWatch.Services;

public class StockWatchStore
{
    private readonly StockWatchDbContext _db;
    private readonly ShopeeStockChecker _checker;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public StockWatchStore(StockWatchDbContext db, ShopeeStockChecker checker)
    {
        _db = db;
        _checker = checker;
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
                Url = input.Url.Trim()
            };

            await _db.Items.InsertOneAsync(item, cancellationToken: cancellationToken);
            await InsertEventAsync(NewEvent($"Added \"{item.Name}\" to the watch list.", item.Id), cancellationToken);

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
                await InsertEventAsync(NewEvent($"Removed \"{item.Name}\" from the watch list.", id), cancellationToken);
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<object> CheckAllAsync(CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            var now = DateTimeOffset.UtcNow;
            var results = new List<object>();
            var desiredFilter = Builders<StockWatchItem>.Filter.Eq(entry => entry.Desired, true);
            var items = await _db.Items
                .Find(desiredFilter)
                .ToListAsync(cancellationToken);

            foreach (var item in items)
            {
                var previousStatus = item.Status;
                var result = await _checker.CheckAsync(item.Url, cancellationToken);

                item.Status = result.Status;
                item.Note = result.Message;
                item.LastCheckedAt = now;

                if (result.Status == "in_stock")
                {
                    item.LastSeenInStockAt = now;
                }

                var itemFilter = Builders<StockWatchItem>.Filter.Eq(entry => entry.Id, item.Id);
                await _db.Items.ReplaceOneAsync(itemFilter, item, cancellationToken: cancellationToken);

                if (result.Status == "in_stock" && previousStatus != "in_stock")
                {
                    await InsertEventAsync(
                        NewEvent($"\"{item.Name}\" may be back in stock.", item.Id, "success"),
                        cancellationToken);
                }

                results.Add(new { item.Id, result.Status, result.Message });
            }

            await InsertEventAsync(NewEvent($"Checked {results.Count} product(s)."), cancellationToken);
            await TrimEventsAsync(cancellationToken);

            return new { CheckedAt = now, Results = results };
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

    private async Task TrimEventsAsync(CancellationToken cancellationToken)
    {
        var count = await _db.Events.CountDocumentsAsync(FilterDefinition<StockWatchEvent>.Empty, cancellationToken: cancellationToken);
        if (count <= 100)
        {
            return;
        }

        var oldestToKeep = await _db.Events
            .Find(FilterDefinition<StockWatchEvent>.Empty)
            .SortByDescending(entry => entry.CreatedAt)
            .Skip(100)
            .Limit(1)
            .FirstOrDefaultAsync(cancellationToken);

        if (oldestToKeep is not null)
        {
            var deleteFilter = Builders<StockWatchEvent>.Filter.Lte(entry => entry.CreatedAt, oldestToKeep.CreatedAt);
            await _db.Events.DeleteManyAsync(deleteFilter, cancellationToken);
        }
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
