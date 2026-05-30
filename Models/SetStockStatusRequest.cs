using System.ComponentModel.DataAnnotations;

namespace ShopeeStockWatch.Models;

public class SetStockStatusRequest
{
    [Required]
    [RegularExpression("^(in_stock|out_of_stock)$")]
    public string Status { get; set; } = string.Empty;
}
