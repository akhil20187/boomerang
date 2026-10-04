# Google listing data: implementation evidence

Checked 5 October 2026 against Google's primary documentation. This records constraints and remaining engineering work, not a new product decision.

Sources: [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies), [service-specific terms](https://cloud.google.com/maps-platform/terms/maps-service-terms).

## Attribution

The compact chat card can use the exact text `Google Maps`, in normal sans-serif type, 400 weight, 12–16px, accessible contrast, no wrapping and `translate="no"`. Place it inside the listings container. Keep the shop's call answers visually separate; Google did not provide those answers. Synthetic demo listings must not be attributed to Google.

## Persistent data

Google permits indefinite storage of place IDs. The cited Places exception permits latitude/longitude caching for up to 30 days; it does not establish permission to retain names, phone numbers, hours or ratings indefinitely.

Current draft and task snapshots retain listing fields. Draft expiry alone does not solve retention of task snapshots. This remains an implementation gap before public customer use; a generic 30-day expiry for all listing fields must not be presented as verified compliance.

The proposed approach is to retain place IDs and our own call evidence separately, fetch current listing details when needed, and avoid keeping Google listing payloads in permanent task records. Dispatch needs a fresh phone lookup using the approved place ID. Status polling should read our call state without repeatedly fetching or billing Google. Task views need a separate listing lookup on initial load, with fresh attribution.

This has not been implemented or checked. Existing data has not been removed. Customer answers, transcript and recording retention also require an agreed retention policy.
