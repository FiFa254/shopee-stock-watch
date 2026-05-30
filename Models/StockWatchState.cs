namespace ShopeeStockWatch.Models;

public class StockWatchState
{
    public List<StockWatchItem> Items { get; set; } = [];
    public List<StockWatchEvent> Events { get; set; } = [];
    public StockWatchSettings Settings { get; set; } = new();
}

public class StockWatchSettings
{
    public int DailyCheckHour { get; set; } = 9;
}
