using System.Text.Json;
using WebApplication2.Models;

namespace WebApplication2.Services;

public class StockWatchStore
{
    private readonly string _dbPath;
    private readonly ShopeeStockChecker _checker;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public StockWatchStore(IWebHostEnvironment environment, ShopeeStockChecker checker)
    {
        _dbPath = Path.Combine(environment.ContentRootPath, "App_Data", "stock-watch.json");
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
            var state = await LoadStateAsync(cancellationToken);
            var item = new StockWatchItem
            {
                Name = string.IsNullOrWhiteSpace(input.Name) ? "Shopee product" : input.Name.Trim(),
                Url = input.Url.Trim()
            };

            state.Items.Insert(0, item);
            state.Events.Insert(0, NewEvent($"Added \"{item.Name}\" to the watch list.", item.Id));
            await SaveStateAsync(state, cancellationToken);
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
            var state = await LoadStateAsync(cancellationToken);
            var item = state.Items.FirstOrDefault(entry => entry.Id == id);
            state.Items.RemoveAll(entry => entry.Id == id);

            if (item is not null)
            {
                state.Events.Insert(0, NewEvent($"Removed \"{item.Name}\" from the watch list.", id));
            }

            await SaveStateAsync(state, cancellationToken);
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
            var state = await LoadStateAsync(cancellationToken);
            var now = DateTimeOffset.UtcNow;
            var results = new List<object>();

            foreach (var item in state.Items.Where(entry => entry.Desired))
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

                if (result.Status == "in_stock" && previousStatus != "in_stock")
                {
                    state.Events.Insert(0, NewEvent($"\"{item.Name}\" may be back in stock.", item.Id, "success"));
                }

                results.Add(new { item.Id, result.Status, result.Message });
            }

            state.Events.Insert(0, NewEvent($"Checked {results.Count} product(s)."));
            state.Events = state.Events.Take(100).ToList();
            await SaveStateAsync(state, cancellationToken);
            return new { CheckedAt = now, Results = results };
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task<StockWatchState> LoadStateAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_dbPath))
        {
            return new StockWatchState();
        }

        await using var stream = File.OpenRead(_dbPath);
        return await JsonSerializer.DeserializeAsync<StockWatchState>(stream, _jsonOptions, cancellationToken)
            ?? new StockWatchState();
    }

    private async Task SaveStateAsync(StockWatchState state, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_dbPath)!);
        await using var stream = File.Create(_dbPath);
        await JsonSerializer.SerializeAsync(stream, state, _jsonOptions, cancellationToken);
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
