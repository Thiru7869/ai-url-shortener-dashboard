# API Reference

Base URL (local): `http://localhost:4000`

All JSON responses use a consistent envelope:

```jsonc
// success
{ "success": true, "data": { /* ... */ }, "meta": { /* optional, e.g. pagination */ } }

// error
{ "success": false, "error": { "message": "Human-readable message", "details": { /* optional */ } } }
```

## Links

### Create a short link

`POST /api/links`

```json
{
  "title": "Summer Sale Campaign",
  "originalUrl": "https://example.com/summer-sale",
  "customAlias": "summer26",
  "expiresAt": "2027-01-01T00:00:00.000Z"
}
```

`customAlias` and `expiresAt` are optional. Returns `201` with the created link, or
`409` if the alias is already taken, or `400` on validation failure (invalid URL,
missing title, past expiry date, invalid alias characters).

### List links

`GET /api/links?page=1&limit=10&search=summer&status=ACTIVE`

- `page` (default 1), `limit` (default 10, max 100)
- `search` — matches title, original URL, or short code (case-insensitive)
- `status` — `ACTIVE` | `DISABLED` | `EXPIRED`

Returns `200` with `data: Link[]` and `meta.pagination: { page, limit, total, totalPages }`.

### Get link details

`GET /api/links/:id` → `200` with the link, or `404` if not found / soft-deleted.

### Update a link

`PUT /api/links/:id`

```json
{ "title": "New Title", "originalUrl": "https://example.com/new-target", "expiresAt": null }
```

All fields optional. Note: the short code / alias is immutable after creation.

### Enable / disable a link

`PATCH /api/links/:id/status`

```json
{ "status": "DISABLED" }
```

### Delete a link (soft delete)

`DELETE /api/links/:id` → `200`. The row is retained with `deletedAt` set; it stops
appearing in lists and details (`404` on subsequent lookups) and its short code
resolves as unknown (`404`) on redirect, since a soft-deleted link is treated as if
it never existed, not merely inactive.

### Link analytics

`GET /api/links/:id/analytics?days=30`

Returns total clicks, a daily click time series, and top-10 distributions for
referrer, browser, device, and country — all computed from the `Click` table for
that link.

## Redirect

`GET /:shortCode`

- `302` redirect to the original URL on success (click is recorded asynchronously).
- `404` if the code doesn't exist (or was soft-deleted).
- `410 Gone` if the link is disabled or past its expiry date.

## Dashboard

`GET /api/dashboard/stats`

```json
{ "success": true, "data": { "totalLinks": 6, "totalClicks": 602, "activeLinks": 4, "expiredLinks": 1 } }
```

## Health

`GET /health` → `200 { "success": true, "data": { "status": "ok" } }` — used by the
Docker healthcheck.

## Postman / test.http

A full Postman collection covering every endpoint above (including the negative
cases — duplicate alias, invalid URL, unknown short code) is at
`postman/url-shortener.postman_collection.json`.
