using System.ComponentModel.DataAnnotations;

namespace WebApplication2.Models;

public class AddStockWatchItemRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Url]
    public string Url { get; set; } = string.Empty;
}
