using ShopeeStockWatch.Data;

namespace ShopeeStockWatch.Infrastructure;

public static class MongoConfiguration
{
    public static MongoDbSettings Resolve(IConfiguration configuration)
    {
        var settings = configuration.GetSection("MongoDb").Get<MongoDbSettings>() ?? new MongoDbSettings();

        var atlasUri = Environment.GetEnvironmentVariable("MONGODB_URI")
            ?? Environment.GetEnvironmentVariable("MONGO_URL");
        if (!string.IsNullOrWhiteSpace(atlasUri))
        {
            settings.ConnectionString = atlasUri;
        }

        var databaseName = Environment.GetEnvironmentVariable("MONGODB_DATABASE_NAME");
        if (!string.IsNullOrWhiteSpace(databaseName))
        {
            settings.DatabaseName = databaseName;
        }

        return settings;
    }
}
