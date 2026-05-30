using Microsoft.AspNetCore.Mvc;
using ShopeeStockWatch.Models;
using ShopeeStockWatch.Services;

namespace ShopeeStockWatch.Controllers;

public class StockController : Controller
{
    private readonly StockWatchStore _store;

    public StockController(StockWatchStore store)
    {
        _store = store;
    }

    public IActionResult Index()
    {
        return View();
    }

    [HttpGet]
    public async Task<IActionResult> State(CancellationToken cancellationToken)
    {
        return Json(await _store.GetStateAsync(cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddStockWatchItemRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { error = "Please enter a product name and Shopee URL." });
        }

        try
        {
            return Json(await _store.AddItemAsync(request, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        await _store.DeleteItemAsync(id, cancellationToken);
        return Json(new { ok = true });
    }

    [HttpPost]
    public async Task<IActionResult> SetStatus(string id, [FromBody] SetStockStatusRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { error = "สถานะต้องเป็น in_stock หรือ out_of_stock" });
        }

        var item = await _store.SetStatusAsync(id, request.Status, cancellationToken);
        if (item is null)
        {
            return NotFound(new { error = "ไม่พบรายการนี้" });
        }

        return Json(item);
    }
}
