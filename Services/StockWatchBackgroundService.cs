namespace WebApplication2.Services;

public class StockWatchBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<StockWatchBackgroundService> _logger;
    private DateOnly? _lastRunDate;

    public StockWatchBackgroundService(IServiceScopeFactory scopeFactory, ILogger<StockWatchBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var store = scope.ServiceProvider.GetRequiredService<StockWatchStore>();
                var state = await store.GetStateAsync(stoppingToken);
                var now = DateTimeOffset.Now;
                var today = DateOnly.FromDateTime(now.DateTime);

                if (now.Hour == state.Settings.DailyCheckHour && _lastRunDate != today)
                {
                    _lastRunDate = today;
                    await store.CheckAllAsync(stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Stock watch scheduled check failed.");
            }
        }
    }
}
