namespace WebApplication2.Models;

public class StockWatchEvent
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string? ItemId { get; set; }
    public string Level { get; set; } = "info";
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
