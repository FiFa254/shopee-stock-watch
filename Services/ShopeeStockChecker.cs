namespace ShopeeStockWatch.Services;

public class ShopeeStockChecker
{
    private static readonly string[] SoldOutSignals =
    [
        "sold out",
        "out of stock",
        "สินค้าหมด",
        "หมดชั่วคราว",
        "ไม่พร้อมจำหน่าย"
    ];

    private static readonly string[] InStockSignals =
    [
        "ซื้อเลย",
        "เพิ่มไปยังรถเข็น",
        "add to cart",
        "buy now"
    ];

    private readonly HttpClient _httpClient;

    public ShopeeStockChecker(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<StockCheckResult> CheckAsync(string url, CancellationToken cancellationToken = default)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            request.Headers.AcceptLanguage.ParseAdd("th-TH,th;q=0.9,en;q=0.8");

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            var html = (await response.Content.ReadAsStringAsync(cancellationToken)).ToLowerInvariant();

            if (!response.IsSuccessStatusCode)
            {
                return new StockCheckResult("unknown", $"Shopee returned {(int)response.StatusCode}; open the product page to verify.");
            }

            if (SoldOutSignals.Any(html.Contains))
            {
                return new StockCheckResult("out_of_stock", "Found a sold-out signal.");
            }

            if (InStockSignals.Any(html.Contains))
            {
                return new StockCheckResult("in_stock", "Found a buy or add-to-cart signal.");
            }

            return new StockCheckResult("unknown", "Could not read a clear stock state from Shopee.");
        }
        catch (Exception ex)
        {
            return new StockCheckResult("unknown", $"Check failed: {ex.Message}");
        }
    }
}
