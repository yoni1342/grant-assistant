# GetModeDeals Daily Newsletter — n8n Workflows

Phase 1 (MVP) automation for the daily deals email.

## Files

- `getmodedeals-newsletter.workflow.json` — main pipeline (cron → fetch → normalize → render → send)
- `getmodedeals-error-handler.workflow.json` — separate workflow that catches failures and posts to Slack
- `email-template.html` — standalone HTML preview (open in a browser to see the layout)

## Defaults baked in (change before going live)

| Setting | Value | Where to change |
|---|---|---|
| Schedule | Daily 13:00 UTC (≈8am ET in EDT) | "Daily 8am ET" node — cron expression |
| Deals per email | 8 | "Top 8" node — `maxItems` |
| Sort | Newest first | "Fetch Products" node — `orderby=date&order=desc` |
| Recipient | `$NEWSLETTER_TEST_TO` env var (defaults to `you@example.com`) | n8n host env vars |
| From address | `$NEWSLETTER_FROM` env var (defaults to `newsletter@getmodedeals.com`) | n8n host env vars |
| Reply-To | `$NEWSLETTER_REPLY_TO` env var | n8n host env vars |
| Click target | The deal page on getmodedeals.com (existing affiliate cloak handles redirect) | "Normalize" Code node |

## Import steps

1. Open https://n8n.tebita.com/home/workflows
2. **Workflows → Import from File** → upload `getmodedeals-newsletter.workflow.json`
3. **Workflows → Import from File** → upload `getmodedeals-error-handler.workflow.json`
4. Set environment variables on the n8n host (or in n8n's UI under Settings → Environment if your instance supports it):
   - `NEWSLETTER_TEST_TO` — start with your own email; switch to a SendGrid list/segment after MVP works
   - `NEWSLETTER_FROM` — verified SendGrid sender
   - `NEWSLETTER_REPLY_TO` — verified SendGrid sender
   - `SLACK_ERROR_WEBHOOK_URL` — Slack incoming webhook
5. Create a **HTTP Header Auth** credential in n8n called `SendGrid Bearer`:
   - Name: `Authorization`
   - Value: `Bearer YOUR_SENDGRID_API_KEY`
6. Open the main workflow → click "Send via SendGrid" node → re-pick the `SendGrid Bearer` credential from the dropdown (the import references a placeholder ID).
7. Open main workflow → **Settings (⚙) → Error Workflow** → select `GetModeDeals Error Handler`.
8. Click **Execute Workflow** to run once manually. Inspect the SendGrid response and your inbox.
9. Once verified, toggle the workflow to **Active**.

## Known caveats

- **Price extraction is regex-based** against the prose in `content.rendered`. Patterns like `for $X.XX` and `= $X.XX` are matched; anything outside that gets `price: null`. Items still send; they just render without a price line.
- **No outbound URL in WP REST.** We click through to the getmodedeals.com deal page rather than direct-to-merchant. This matches Brad's Deals' pattern and lets the existing affiliate cloak do its job.
- **Cron is in UTC.** `0 13 * * *` is 8am EDT (Mar–Nov) but 9am EST. If you want true 8am ET year-round, set the n8n container's `GENERIC_TIMEZONE=America/New_York` and change cron to `0 8 * * *`.
- **Schedule trigger is set to inactive on import.** Don't toggle Active until your manual test send is clean.

## Phase 2 hooks (already structured for easy upgrade)

- Replace "Top 8" Limit node with a Claude HTTP Request that ranks the 30 fetched products and returns the top 8 IDs. The Render node already takes a generic product array.
- Replace static intro string in "Render Email" with a Claude-generated intro based on the day's selection.
- Add a Clevertap branch in parallel with SendGrid for the second delivery channel.
- For better price/URL fidelity, switch "Fetch Products" to `/wp-json/wc/v3/products` with WooCommerce consumer key/secret — exposes structured `regular_price`, `sale_price`, `external_url` and removes the regex.

## Local preview

Open `email-template.html` in a browser to see the layout (with placeholder text where products would go). The actual rendered HTML lives entirely inside the "Render Email" Code node — edit it there.
