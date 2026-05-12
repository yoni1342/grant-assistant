# Fundory Daily IG Post — n8n setup

This is the n8n side of the daily IG carousel generator. n8n (AWS) triggers it on a cron, SSHes into the box that runs `grant-assistant`, and curls the local cron endpoint. The endpoint spawns `claude -p` (Max OAuth) to write copy, renders the slide PNGs, and uploads to Supabase storage. Slack notifies on success/failure.

## Prereqs on the grant-assistant host

1. Migrations applied to Supabase (`20260512_ig_posts.sql` + `20260512_ig_posts_variable_plan.sql`).
2. `claude` CLI present and OAuth'd against your Claude Max plan — check with `claude --version` and confirm `/root/.claude/.credentials.json` exists with `"subscriptionType":"max"`.
3. PM2 process `grant-assistant` serving on `localhost:3002`.
4. `CRON_SECRET` set in `.env.local` (it already is — same token used by the existing local crontab entries).

## n8n-side setup

### 1. Open SSH from n8n container → grant-assistant host

n8n on AWS needs an SSH credential it can use to reach the box.

```sh
# On the n8n AWS box, as root or ubuntu:
docker exec -it <n8n-container> sh
# Inside the container:
ssh-keygen -t ed25519 -f /home/node/.ssh/fundory_host -N ""
cat /home/node/.ssh/fundory_host.pub
```

Copy that public key, then on the grant-assistant host:

```sh
cat >> /root/.ssh/authorized_keys <<'EOF'
ssh-ed25519 AAAA…  n8n@fundory-daily-ig-post
EOF
chmod 600 /root/.ssh/authorized_keys
```

Test from the n8n container:

```sh
ssh -i /home/node/.ssh/fundory_host root@<grant-assistant-host> "echo ok"
```

### 2. Register the SSH credential in n8n

n8n UI → **Credentials → New → SSH**:
- Type: SSH (private key)
- Host: `<grant-assistant-host>` (the IP/hostname you SSH'd to above)
- Port: `22`
- Username: `root`
- Private Key: paste contents of `/home/node/.ssh/fundory_host`

Save and copy the credential ID.

### 3. Set the env var n8n needs

n8n UI → **Settings → Environment Variables** (or the `.env` file mounted into the n8n container):

```
FUNDORY_CRON_SECRET=<same value as CRON_SECRET in grant-assistant/.env.local>
```

Restart n8n if you added it via `.env`.

### 4. Register Slack OAuth credential (optional but recommended)

n8n UI → **Credentials → New → Slack OAuth2 API**. Use the existing Fundory Slack workspace credential if you already have one.

### 5. Import the workflow

n8n UI → **Workflows → Import from File** → pick `workflows/fundory-daily-ig-post.json` from this repo.

After import, open the workflow and replace the four `REPLACE_WITH_*` placeholders:
- `REPLACE_WITH_SSH_CREDENTIAL_ID` → the SSH credential from step 2 (click the SSH node, re-pick the credential from the dropdown)
- `REPLACE_WITH_SLACK_CREDENTIAL_ID` → the Slack OAuth credential from step 4 (on both Slack nodes)
- `REPLACE_WITH_FUNDORY_CHANNEL_ID` → channel ID for success notifications
- `REPLACE_WITH_ALERTS_CHANNEL_ID` → channel ID for failure alerts

Activate the workflow.

### 6. Remove the local cron entry (optional)

The grant-assistant host currently has a local crontab line that hits the same endpoint at 7am. Once n8n is firing it, remove the local entry to avoid double-runs:

```sh
crontab -l | grep -v daily-ig-post | crontab -
```

### 7. Manual smoke test from n8n

Open the workflow, click **Execute workflow** once. Should complete in 30–90s with a Slack message containing today's theme + slide plan and a link to `/admin/ig-posts`.
