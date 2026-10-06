# Google store search: requests, responses and operating rules

Updated: 4 October 2026.

## Current scope

Find potential nearby sellers from a product and pincode. Use official Google APIs, not scraping. Individual customer comments/reviews and review summaries are excluded for now. Keep overall rating and rating count.

Discovery does not confirm stock, exact model, final price, discounts or card offers. Store calls establish those answers.

## How our flow works

1. Extract the brand/category from the supplied product details. This is our work, not a Google Places feature.
2. Geocode the pincode to coordinates.
3. Use Text Search for product/brand queries; Nearby Search for broad store categories.
4. Calculate straight-line distance and remove stores beyond the chosen radius.
5. Apply D55: rating descending; normally hide stores with fewer than 50 ratings, with the recorded fallback when insufficient options exist.
6. Return selectable stores with phone, listed hours and source links.

The 10 km circle is centred on Google's pincode location, not the customer's home. Driving distance differs. Ratings order is our sorting of returned candidates, not a claim to find every highest-rated shop in the area.

## 1. Geocoding: locate the pincode

GET endpoint:

```text
https://maps.googleapis.com/maps/api/geocode/json
```

Query parameters for our test:

```text
components=postal_code:500037|country:IN
key=[SERVER_SECRET]
```

Other inputs include `address`, `bounds`, `region` and `language`. Components constrain address matching; a region biases it.

Response: `status`, `results[]`, and sometimes `error_message`. Results contain `formatted_address`, `address_components`, `place_id`, `types`, and `geometry` including location, viewport and location type. Check status before using results: no match is not a valid location.

Our saved test resolved 500037 to latitude 17.4899635, longitude 78.4352235.

[Official Geocoding request and response](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding)

## 2. Shared Places request headers

```text
Content-Type: application/json
X-Goog-Api-Key: [SERVER_SECRET]
X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType,places.businessStatus,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.regularOpeningHours,places.currentOpeningHours,places.googleMapsUri,places.websiteUri,nextPageToken
```

This is our proposed Text Search field list; remove `nextPageToken` for Nearby Search. A field mask is the list of response fields requested. Search requires one; avoid `*` in production. Phone, rating and opening-hours fields trigger the Enterprise search billing category. No review fields are included.

[Official Text Search guide and field tiers](https://developers.google.com/maps/documentation/places/web-service/text-search)

## 3. Text Search: product or brand sellers

POST endpoint:

```text
https://places.googleapis.com/v1/places:searchText
```

Actual body used for the iPhone test:

```json
{
  "textQuery": "iPhone retailers",
  "locationBias": {
    "circle": {
      "center": {
        "latitude": 17.4899635,
        "longitude": 78.4352235
      },
      "radius": 10000
    }
  },
  "regionCode": "IN",
  "languageCode": "en",
  "pageSize": 20
}
```

A circle bias can return outside matches. Our first test excluded two of twenty results after distance checks. A repeated request can produce different candidates or order. Current guide limit: up to 60 across pages; each additional page is another request.

[Text Search guide](https://developers.google.com/maps/documentation/places/web-service/text-search)

### Available body options

| Field | Use |
|---|---|
| textQuery | Required search phrase |
| languageCode / regionCode | Language / regional presentation; regionCode is not a country boundary |
| locationBias | Circle or rectangle preference |
| locationRestriction | Rectangle boundary; cannot combine with locationBias |
| includedType / strictTypeFiltering | One category / enforce category |
| openNow | Filter to listed-open businesses |
| minRating | Minimum stars, rounded upward to half-star increments |
| rankPreference | RELEVANCE or DISTANCE |
| pageSize / pageToken | Up to 20 per page / subsequent page |
| maxResultCount | Deprecated; use pageSize |
| priceLevels | Business price bands, not iPhone selling prices |
| includePureServiceAreaBusinesses | Include businesses without customer-facing premises |
| includeFutureOpeningBusinesses | Include future openings |
| routingParameters | Travel calculations |
| searchAlongRouteParameters | Search along a route |
| evOptions | Electric-vehicle charging filters |

There is no minimum rating-count filter; our code checks `userRatingCount`.

Response envelope: `places[]`, optional `nextPageToken`, `searchUri`, `routingSummaries[]` and experimental `contextualContents[]`. We do not request contextual review content.

[Complete Text Search request/response reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/searchText)

## 4. Nearby Search: category within a circle

POST endpoint:

```text
https://places.googleapis.com/v1/places:searchNearby
```

Example:

```json
{
  "includedTypes": ["electronics_store"],
  "maxResultCount": 20,
  "locationRestriction": {
    "circle": {
      "center": {
        "latitude": 17.4899635,
        "longitude": 78.4352235
      },
      "radius": 10000
    }
  },
  "rankPreference": "POPULARITY",
  "languageCode": "en",
  "regionCode": "IN"
}
```

Options: `includedTypes`, `excludedTypes`, `includedPrimaryTypes`, `excludedPrimaryTypes` (up to 50 categories each); `maxResultCount` (1–20); required `locationRestriction`; `rankPreference` (POPULARITY or DISTANCE); `languageCode`; `regionCode`; `routingParameters`; `includeFutureOpeningBusinesses`.

“Primary” means the business's main category. Nearby Search lacks keywords, brand, minimum-rating and open-now request filters. It has no pagination token. Response contains `places[]` and optional `routingSummaries[]`. Twenty results do not mean twenty total matching businesses.

[Complete Nearby Search reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/searchNearby)
[Supported category names](https://developers.google.com/maps/documentation/places/web-service/place-types)

## 5. Available store response fields

| Group | Fields |
|---|---|
| Identity | id, name, displayName |
| Address | formattedAddress, shortFormattedAddress, addressComponents, postalAddress |
| Location | location, viewport, plusCode |
| Categories | types, primaryType, primaryTypeDisplayName |
| Contact | nationalPhoneNumber, internationalPhoneNumber, websiteUri |
| Reputation | rating, userRatingCount |
| Hours | regularOpeningHours, currentOpeningHours, secondary-hours fields |
| Business status | businessStatus, openingDate, movedPlaceId |
| Source | googleMapsUri, googleMapsLinks, attributions |
| Optional extras | photos, accessibilityOptions, parkingOptions, paymentOptions, delivery |

`name` is a resource path; `displayName.text` is the readable store name. Opening-hours objects can include `openNow`, `periods` and `weekdayDescriptions`. Missing hours mean unknown, not closed. Missing phones mean unavailable; returned numbers may reach central support.

Many additional fields serve restaurants, hotels, charging stations and other categories. The complete reference is authoritative; availability and method support vary. Individual reviews and summaries exist in the API but are excluded from our scope.

[Complete Place response schema](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places)

### Real response evidence

[Saved iPhone request and raw response](../research/iphone-places-api-request-response.json) contains the exact repeated search, twenty results and a redacted key. Requested fields were name, address, coordinates, phone, rating, rating count and Maps link; it does not contain hours or store IDs.

Example from that capture:

```json
{
  "displayName": {"text": "Apple World", "languageCode": "en"},
  "rating": 4.5,
  "userRatingCount": 500,
  "nationalPhoneNumber": "096183 40061",
  "location": {
    "latitude": 17.4851871,
    "longitude": 78.38134579999999
  }
}
```

This excerpt omits the captured address and Maps URL for brevity. It is a historical API response, not a current stock or phone verification.

## 6. Optional Place Details

GET `https://places.googleapis.com/v1/places/PLACE_ID`.

No JSON body. Send the key and field mask in headers; here fields use `id,displayName,...` without the `places.` prefix. Query options include `languageCode`, `regionCode` and `sessionToken` for applicable autocomplete sessions.

Returns one Place object directly. Use when additional information is needed after selection; initial search can already return our required details. No separate call per store is necessary for those fields.

[Official Place Details guide](https://developers.google.com/maps/documentation/places/web-service/place-details)

## 7. Costs for this scope

Eligible India list pricing, checked 4 October 2026:

| Operation | Monthly free requests | USD per 1,000 after allowance |
|---|---:|---:|
| Geocoding | 70,000 | $1.50 |
| Text/Nearby Search Enterprise: phone, rating, hours | 7,000 per category | $10.50 |
| Place Details Enterprise | 7,000 | $6.00 |

One geocoding plus one search: $0.012 after both allowances, approximately ₹1.15 at illustrative ₹96/$, before taxes. No per-store multiplier for search results. Extra pages and alternative searches add requests. Straight-line distance and local sorting require no extra Google call.

Actual invoice, eligibility and remaining free usage were not verified. Trial credits may change the amount payable.

[India price list](https://developers.google.com/maps/billing-and-pricing/pricing-india)
[India pricing eligibility](https://developers.google.com/maps/billing-and-pricing/india)
[Places billing rules](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)

## 8. Implementation checks

- Keep the key on our server, in the existing GOOGLEPLACES_API_KEY variable. Never ship it in the chat widget or public JavaScript.
- Handle HTTP errors, quota limits, invalid input and empty results.
- Deduplicate by store ID; filter distance using full precision.
- Show rating count alongside rating, as D54 requires.
- Retain unknown hours and unconfirmed stock labels.
- Follow Google's logo/source attribution and storage rules; place IDs have different storage allowances from full Places content.
- Historical review test files remain test evidence. Do not add reviews to ongoing requests.

[Official Places display and storage policies](https://developers.google.com/maps/documentation/places/web-service/policies)

## Verification limits

Live Geocoding, Nearby Search and Text Search succeeded for 500037. The iPhone search produced a plausible seller shortlist. This document is checked against official references and saved responses. App integration, full coverage, store authorisation, inventory, phone routing and billing statements remain unverified.

