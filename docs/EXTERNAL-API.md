# Fundory External API (`/api/v1`)

A read-only REST API that lets another platform pull **one organization's** data
out of Fundory. It is designed so an integration is **org-scoped and isolated**:
a key issued by Organization A can only ever read Organization A's data.

---

## How access works (the "proof you're the valid org" flow)

1. An **owner or admin of the org** signs in to Fundory and goes to
   **Settings → API**. Only they can mint a key — that login is the proof that
   they control the organization.
2. They click **Create API key**, choose scopes, and Fundory shows the secret
   **once**: `fnd_live_…`. Only a salted SHA-256 hash is stored; the plaintext is
   never persisted and can't be recovered.
3. The external platform stores that key as a secret and sends it on every
   request as a bearer token.
4. Each request is matched to its key → its `org_id` → its scopes. **The caller
   never passes an org id for data access** — it's derived from the key — so a
   key physically cannot reach another organization.

Because the secret is a bearer credential, it must only be used **server-to-server**.
Never embed it in a browser, mobile app, or any client the public can inspect.

---

## Authentication

```
Authorization: Bearer fnd_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Verify a key and discover endpoints:

```bash
curl https://app.fundory.ai/api/v1 \
  -H "Authorization: Bearer fnd_live_…"
```

Response:

```json
{
  "organization": { "id": "…", "name": "Acme Nonprofit", "plan": "professional" },
  "scopes": ["*"],
  "endpoints": { "organization": "…/api/v1/organization", "grants": "…/api/v1/grants", ... }
}
```

---

## Scopes (roles)

A key holds one or more scopes. `*` grants read access to everything (including
resources added later).

| Scope                | Grants read access to                         |
| -------------------- | --------------------------------------------- |
| `organization:read`  | Org profile, mission, contact & metadata      |
| `grants:read`        | Tracked grants, stages & screening results    |
| `proposals:read`     | Proposals and their sections                  |
| `documents:read`     | Uploaded document records & metadata          |
| `narratives:read`    | Reusable narrative library                    |
| `awards:read`        | Awarded grants & funding records              |
| `funders:read`       | Funder profiles & research                    |
| `reports:read`       | Grant reports (interim & final)               |
| `activity:read`      | Activity / audit log                          |
| `*`                  | All of the above                              |

A request without the required scope returns `403 insufficient_scope`.

---

## Endpoints

All endpoints are `GET` and return JSON.

| Endpoint                  | Scope               | Returns                                            |
| ------------------------- | ------------------- | -------------------------------------------------- |
| `/api/v1`                 | —                   | Key info, bound org, available endpoints           |
| `/api/v1/organization`    | `organization:read` | The organization's profile                         |
| `/api/v1/grants`          | `grants:read`       | Grants (paginated), each with its source grant     |
| `/api/v1/grants/{id}`     | `grants:read`       | One grant + proposals, awards, documents           |
| `/api/v1/proposals`       | `proposals:read`    | Proposals (paginated)                              |
| `/api/v1/proposals/{id}`  | `proposals:read`    | One proposal + ordered sections                    |
| `/api/v1/documents`       | `documents:read`    | Document records (paginated)                        |
| `/api/v1/narratives`      | `narratives:read`   | Narrative library (paginated)                      |
| `/api/v1/awards`          | `awards:read`       | Awards (paginated)                                 |
| `/api/v1/funders`         | `funders:read`      | Funder profiles (paginated)                        |
| `/api/v1/reports`         | `reports:read`      | Reports (paginated)                                |
| `/api/v1/activity`        | `activity:read`     | Activity log (paginated)                           |
| `/api/v1/export`          | any                 | Everything the key can read, in one payload        |

### Pagination

List endpoints accept `?limit=` (1–200, default 50) and `?offset=` (default 0):

```json
{
  "data": [ ... ],
  "pagination": { "total": 412, "limit": 50, "offset": 0, "has_more": true }
}
```

### Bulk export

`GET /api/v1/export` returns every resource the key has a scope for, in a single
object, capped at 1000 rows per resource. Anything truncated is listed in
`meta.truncated` — page the per-resource endpoint for the full set.

```bash
curl https://app.fundory.ai/api/v1/export \
  -H "Authorization: Bearer fnd_live_…"
```

---

## Errors

```json
{ "error": { "code": "invalid_key", "message": "Invalid API key." } }
```

| Status | Code                  | Meaning                                       |
| ------ | --------------------- | --------------------------------------------- |
| 401    | `missing_credentials` | No/!malformed `Authorization` header          |
| 401    | `invalid_key`         | Key not found                                  |
| 401    | `revoked_key`         | Key was revoked                                |
| 401    | `expired_key`         | Key passed its expiry                          |
| 403    | `org_inactive`        | The organization is not active                 |
| 403    | `insufficient_scope`  | Key lacks the scope for this endpoint          |
| 404    | `not_found`           | Resource doesn't exist (or not in this org)    |
| 429    | `rate_limited`        | Too many requests (see `retry_after_ms`)       |
| 500    | `internal_error`      | Unexpected server error                        |

## Rate limits

120 requests/minute per key. Responses include `X-RateLimit-Limit` and
`X-RateLimit-Remaining`. A `429` includes `retry_after_ms`.

## Revoking

Revoke a key any time from **Settings → API**. It stops working immediately on
the next request. Revocation cannot be undone — mint a new key to rotate.

## Security notes

- Keys are stored only as salted SHA-256 hashes; the plaintext is shown once.
- Every call is recorded in an audit log (`api_request_log`).
- The API is read-only — it cannot modify or delete any data.
- Excluded from responses by design: vector embeddings and large extracted
  document text (internal machinery, not org content).
