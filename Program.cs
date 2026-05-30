using ShopeeStockWatch.Data;
using ShopeeStockWatch.Infrastructure;
using ShopeeStockWatch.Services;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://+:{port}");
}

var mongoSettings = MongoConfiguration.Resolve(builder.Configuration);
builder.Services.Configure<MongoDbSettings>(_ =>
{
    _.ConnectionString = mongoSettings.ConnectionString;
    _.DatabaseName = mongoSettings.DatabaseName;
});
builder.Services.AddSingleton(_ => mongoSettings);
builder.Services.AddSingleton<StockWatchDbContext>();

builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddSingleton<StockWatchStore>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<StockWatchDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        await db.PingAsync();
        await db.EnsureDefaultsAsync();
        logger.LogInformation("Connected to MongoDB successfully.");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Could not connect to MongoDB. Set MONGODB_URI (Atlas) or run MongoDB locally.");
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

if (string.IsNullOrEmpty(port))
{
    app.UseHttpsRedirection();
}

app.UseRouting();
app.UseAuthorization();
app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Stock}/{action=Index}/{id?}")
    .WithStaticAssets();

app.Run();
