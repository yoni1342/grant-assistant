#!/usr/bin/env bash
#
# Provision AWS SES inbound email for support@fundory.ai.
#
#   support@fundory.ai
#     -> apex MX -> SES inbound-smtp (us-east-1)
#     -> SES receipt rule -> S3 (raw MIME) + SNS notify
#     -> SNS HTTPS subscription -> https://fundory.ai/api/inbound-email
#     -> threaded onto a support_request, all platform admins alerted
#
# Idempotent: safe to re-run. The two PRODUCTION-AFFECTING steps (activating the
# rule set and flipping the apex MX) only run when RUN_GO_LIVE=1, and must come
# AFTER the app is deployed with INBOUND_EMAIL_SECRET / INBOUND_EMAIL_BUCKET set
# and the migration applied — otherwise inbound mail can't be processed yet.
#
# Prereqs: aws cli configured (the nova4ai-deploy admin keys), and the app
# deployed so the SNS subscription URL resolves.
#
# Usage:
#   INBOUND_EMAIL_SECRET=xxxx ./scripts/provision-inbound-email.sh        # stage everything (no MX change)
#   INBOUND_EMAIL_SECRET=xxxx RUN_GO_LIVE=1 ./scripts/provision-inbound-email.sh   # + activate + flip MX

set -euo pipefail

REGION="${REGION:-us-east-1}"
DOMAIN="${DOMAIN:-fundory.ai}"
RECIPIENT="${RECIPIENT:-support@fundory.ai}"
ZONE_ID="${ZONE_ID:-Z00322472SVWWWPPXX02D}"
RULE_SET="${RULE_SET:-fundory-inbound}"
RULE_NAME="${RULE_NAME:-support-to-app}"
TOPIC_NAME="${TOPIC_NAME:-fundory-inbound-email}"
KEY_PREFIX="${KEY_PREFIX:-inbound/}"
APP_URL="${APP_URL:-https://fundory.ai}"

: "${INBOUND_EMAIL_SECRET:?Set INBOUND_EMAIL_SECRET (same value as the app env var)}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${BUCKET:-fundory-inbound-email-${ACCOUNT_ID}}"
ENDPOINT="${APP_URL}/api/inbound-email?token=${INBOUND_EMAIL_SECRET}"

echo "Account=${ACCOUNT_ID} Region=${REGION} Bucket=${BUCKET}"
echo "Endpoint=${APP_URL}/api/inbound-email?token=***"

# 1. S3 bucket for raw inbound MIME -------------------------------------------
if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "Creating bucket $BUCKET"
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
fi
# Lifecycle: drop raw emails after 90 days (the parsed copy lives in Postgres).
aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration '{
  "Rules": [{"ID":"expire-raw-email","Status":"Enabled","Filter":{"Prefix":"'"${KEY_PREFIX}"'"},"Expiration":{"Days":90}}]
}'

# 2. Bucket policy: allow SES to write objects for this account ----------------
aws s3api put-bucket-policy --bucket "$BUCKET" --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowSESPuts",
    "Effect": "Allow",
    "Principal": {"Service": "ses.amazonaws.com"},
    "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::'"${BUCKET}"'/*",
    "Condition": {"StringEquals": {"aws:Referer": "'"${ACCOUNT_ID}"'"}}
  }]
}'

# 3. SNS topic + HTTPS subscription to the app endpoint -----------------------
TOPIC_ARN="$(aws sns create-topic --name "$TOPIC_NAME" --region "$REGION" --query TopicArn --output text)"
echo "Topic=$TOPIC_ARN"
# Allow SES to publish to the topic.
aws sns set-topic-attributes --region "$REGION" --topic-arn "$TOPIC_ARN" \
  --attribute-name Policy --attribute-value '{
  "Version":"2012-10-17",
  "Statement":[{"Effect":"Allow","Principal":{"Service":"ses.amazonaws.com"},
    "Action":"SNS:Publish","Resource":"'"${TOPIC_ARN}"'",
    "Condition":{"StringEquals":{"AWS:SourceAccount":"'"${ACCOUNT_ID}"'"}}}]
}'
# Subscribe the app endpoint (AWS will POST a SubscriptionConfirmation the app
# auto-confirms). Requires the app to already be deployed.
if ! aws sns list-subscriptions-by-topic --region "$REGION" --topic-arn "$TOPIC_ARN" \
      --query "Subscriptions[?Endpoint=='${ENDPOINT}']" --output text | grep -q .; then
  echo "Subscribing app endpoint to SNS"
  aws sns subscribe --region "$REGION" --topic-arn "$TOPIC_ARN" \
    --protocol https --endpoint "$ENDPOINT" --return-subscription-arn
fi

# 4. SES receipt rule set + rule (store to S3, notify SNS) --------------------
aws ses create-receipt-rule-set --region "$REGION" --rule-set-name "$RULE_SET" 2>/dev/null || true
aws ses delete-receipt-rule --region "$REGION" --rule-set-name "$RULE_SET" --rule-name "$RULE_NAME" 2>/dev/null || true
aws ses create-receipt-rule --region "$REGION" --rule-set-name "$RULE_SET" --rule '{
  "Name": "'"${RULE_NAME}"'",
  "Enabled": true,
  "ScanEnabled": true,
  "TlsPolicy": "Optional",
  "Recipients": ["'"${RECIPIENT}"'"],
  "Actions": [{
    "S3Action": {
      "BucketName": "'"${BUCKET}"'",
      "ObjectKeyPrefix": "'"${KEY_PREFIX}"'",
      "TopicArn": "'"${TOPIC_ARN}"'"
    }
  }]
}'
echo "Receipt rule '${RULE_NAME}' created in rule set '${RULE_SET}'."

# ---------------------------------------------------------------------------
# PRODUCTION-AFFECTING — only with RUN_GO_LIVE=1, AFTER the app is deployed.
# ---------------------------------------------------------------------------
if [ "${RUN_GO_LIVE:-0}" = "1" ]; then
  echo ">> Activating receipt rule set"
  aws ses set-active-receipt-rule-set --region "$REGION" --rule-set-name "$RULE_SET"

  echo ">> Flipping apex MX for ${DOMAIN} -> inbound-smtp.${REGION}.amazonaws.com"
  aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" --change-batch '{
    "Comment": "SES inbound for support@'"${DOMAIN}"'",
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "'"${DOMAIN}"'.",
        "Type": "MX",
        "TTL": 300,
        "ResourceRecords": [{"Value": "10 inbound-smtp.'"${REGION}"'.amazonaws.com"}]
      }
    }]
  }'
  echo ">> LIVE. support@${DOMAIN} now routes to the app."
else
  echo "Staged (no MX change). Re-run with RUN_GO_LIVE=1 after deploy to go live."
fi
