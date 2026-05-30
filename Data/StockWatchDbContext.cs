using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using ShopeeStockWatch.Models;

namespace ShopeeStockWatch.Data;

public class AppSettingsDocument
{
    [BsonId]
    public string Id { get; set; } = "settings";

    public int DailyCheckHour { get; set; } = 9;
}

public class StockWatchDbContext
{
    public StockWatchDbContext(MongoDbSettings settings)
    {
        var client = new MongoClient(settings.ConnectionString);
        Database = client.GetDatabase(settings.DatabaseName);
    }

    public IMongoDatabase Database { get; }

    public IMongoCollection<StockWatchItem> Items =>
        Database.GetCollection<StockWatchItem>("watch_items");

    public IMongoCollection<StockWatchEvent> Events =>
        Database.GetCollection<StockWatchEvent>("watch_events");

    public IMongoCollection<AppSettingsDocument> Settings =>
        Database.GetCollection<AppSettingsDocument>("app_settings");

    public async Task EnsureDefaultsAsync(CancellationToken cancellationToken = default)
    {
        var existing = await Settings
            .Find(Builders<AppSettingsDocument>.Filter.Eq(document => document.Id, "settings"))
            .FirstOrDefaultAsync(cancellationToken);

        if (existing is null)
        {
            await Settings.InsertOneAsync(new AppSettingsDocument(), cancellationToken: cancellationToken);
        }
    }

    public async Task PingAsync(CancellationToken cancellationToken = default)
    {
        await Database.RunCommandAsync<BsonDocument>(
            new BsonDocument("ping", 1),
            cancellationToken: cancellationToken);
    }
}
