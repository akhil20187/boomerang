# Amazon product extraction — build reference

Recorded: 5 October 2026. User requested this reference for the final product. This records a tested option, not a permanent provider decision or completed integration.

## Tested route

Use Monid MCP to run Apify endpoint `/delicious_zebu/amazon-product-details-scraper`.

This is a third-party scraper reading Amazon pages, not Amazon's official API. Inspect its current schema and pricing before running it; these can change.

1. Discover Amazon product details tools through `monid_discover`.
2. Inspect with `monid_inspect`, provider `apify`, endpoint `/delicious_zebu/amazon-product-details-scraper`.
3. Submit `monid_run` using the input below.
4. If status is `RUNNING`, poll `monid_get_run` using the returned run ID until terminal.
5. Check provider HTTP status and actual output, then save the result. `COMPLETED` alone does not establish usable product data.

```json
{
  "provider": "apify",
  "endpoint": "/delicious_zebu/amazon-product-details-scraper",
  "input": {
    "body": {
      "Params": ["https://www.amazon.in/dp/B0H4LBXQDC?th=1"],
      "website": "amazon.in",
      "language": "en",
      "currency": "INR"
    }
  }
}
```

`Params` accepts product URLs or Amazon product IDs (ASINs). A full URL determines the marketplace; `website` determines it for a bare ASIN. The inspected schema also supports optional `zipCode`; this was not supplied or tested. Start with one product per run to control cost.

## Verified test

- Run ID: `01M4431QPKJ8DC2ZPPZW6ZE6CV`.
- Completed with provider HTTP 200, one returned product, in 16.6 seconds.
- Actual charge: $0.00375. Inspected price: $0.00375 per result, one result per input query.
- Product: Samsung Galaxy M47 5G, ASIN `B0H4LBXQDC`.
- Selected variant: Blaze Blue, 6GB RAM, 128GB storage, Without Samsung Care.
- Price: ₹35,999 INR; MRP ₹46,999; in stock.
- Seller: Clicktech Retail Private Ltd; ships from Amazon.
- Rating: 3.1/5, count 700.
- Identity, variant, price, stock, seller and rating matched the earlier real-browser read of the same listing.
- Response included 18 image URLs, 9 video entries, other variant IDs, specifications, descriptions, box contents, warranty and review data. Media URLs were returned but not individually opened or verified.

Full saved response: [raw JSON](../../research/raw/amazon-B0H4LBXQDC-monid-2026-10-05.json). The saved file wraps the product output with request and test metadata; it omits account identifiers.

## Response shape and useful fields

Monid's run response contains `runId`, `status`, `providerResponse`, `cost`, `resultCount`, and `output`. `output` is an array of product records. The following is a shortened subset of the actual record, not the complete schema:

```json
{
  "asin": "B0H4LBXQDC",
  "product_url": "https://www.amazon.in/dp/B0H4LBXQDC",
  "brand_name": "Samsung",
  "price": "₹35,999",
  "price_value": 35999,
  "currency": "INR",
  "list_price": "₹46,999",
  "availability": "In stock",
  "seller_name": "Clicktech Retail Private Ltd",
  "default_variant": [
    "Colour: Blaze Blue",
    "Size: 6GB + 128GB",
    "Configuration: Without Samsung Care"
  ],
  "images": [
    "https://m.media-amazon.com/images/I/71Wv9hJURNL._SL1500_.jpg",
    "https://m.media-amazon.com/images/I/71PLlLseWYL._SL1500_.jpg"
  ],
  "product_information": {
    "Colour": "Blaze Blue",
    "RAM Memory Installed": "6 GB",
    "Memory Storage Capacity": "128 GB"
  }
}
```

| Field | Use / limitation |
|---|---|
| `asin`, `product_url`, `title`, `brand_name` | Identify the requested product; retain the source link. |
| `default_variant` | Selected colour, size and configuration; do not confuse these with other variants. |
| `product_information` | Product specifications; keys vary by product type. Missing fields stay unknown. |
| `images` | Ordered image URLs; no per-image colour label or explicit main-image flag in this response. |
| `variants` | Other ASINs and their attributes; not confirmation that each variant is stocked or equally priced. |
| `price_value`, `currency`, `price` | Numeric amount, currency and display text. Amazon price is context, not a nearby shop's price. |
| `availability`, `seller_name`, `ships_from` | Amazon listing context at extraction time. |
| `delivery_date`, `fastest_delivery_date` | Location-dependent estimates. No pincode was supplied, so do not present them as customer-confirmed. |
| `rating_stars`, `rating_count` | Returned as strings in this test. |
| `videos` | Video URLs and metadata; some durations were null and entries may overlap. |
| `coupon` | Empty in this test; empty does not prove no offers exist. |
| `scrape_time` | Provider timestamp; timezone was not established. Record our own UTC fetch time when integrated. |

## Colour and image selection

Colour is explicit: `default_variant` says `Colour: Blaze Blue`, and `product_information.Colour` says `Blaze Blue`.

The image list does not explicitly map each image to a colour or designate a main image. The first image is a candidate for the confirmation card, not a verified selection. Before relying on this rule, open the first image and check it against the selected variant and the listing's main image. Galleries may include diagrams, lifestyle images or other colours. Preserve the explicit colour text even when showing an image.

## Proposed integration approach

These are implementation recommendations, not new user decisions:

- Extract exact identity and selected variant, then let the customer confirm before searching nearby shops or starting calls.
- Keep raw provider output separately from the smaller product object used by the card. Preserve source URL and fetch time.
- Validate identity and required fields; do not fill missing details with guesses. Ask for a typed description or correction if extraction cannot identify the product.
- Use product-type-specific attributes rather than requiring phone-only fields for every product.
- Show Amazon price only as an Amazon reference price. Shop availability, final prices and offers come from shop calls.
- Keep Monid credentials on the server and out of browser code or documents.

## Remaining checks

- First image correctness and colour mapping.
- Pincode handling and returned delivery context.
- Detailed bank offers: absent from this response despite summaries being visible in the earlier browser read.
- Repeated reliability, other Amazon products/categories, missing fields and blocked-page behaviour.
- Final-product integration, error handling and cost controls.
- Flipkart and other product-link extraction need separate tools/tests; this test proves Amazon only.

Next build step: verify the first image, then implement and test a small product-confirmation object using the fields above.
