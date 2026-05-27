namespace WebApplication2.Models;

public class StockWatchItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public bool Desired { get; set; } = true;
    public string Status { get; set; } = "unknown";
    public string Note { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastCheckedAt { get; set; }
    public DateTimeOffset? LastSeenInStockAt { get; set; }
}
