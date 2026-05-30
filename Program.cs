using WebApplication2.Data;
using WebApplication2.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection("MongoDb"));
builder.Services.AddSingleton(sp =>
{
    var settings = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<MongoDbSettings>>().Value;
    return settings;
});
builder.Services.AddSingleton<StockWatchDbContext>();

builder.Services.AddControllersWithViews();
builder.Services.AddHttpClient<ShopeeStockChecker>();
builder.Services.AddSingleton<StockWatchStore>();
builder.Services.AddHostedService<StockWatchBackgroundService>();

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
        logger.LogWarning(ex, "Could not connect to MongoDB. Ensure MongoDB is running on localhost:27017.");
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseAuthorization();
app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Stock}/{action=Index}/{id?}")
    .WithStaticAssets();

app.Run();
