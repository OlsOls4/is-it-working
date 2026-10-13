#!/bin/bash
# Deploy is-it-working to Vercel production via the REST API.
# Needs a Vercel token: set VERCEL_TOKEN, or run where a proxy injects it for api.vercel.com.
# Deploys whatever git tracks (+ untracked, non-ignored files), minus screenshots/.
set -e
cd "$(dirname "$0")/.."
AUTH=(); [ -n "$VERCEL_TOKEN" ] && AUTH=(-H "Authorization: Bearer $VERCEL_TOKEN")
python3 - <<'P' > /tmp/iiw-deploy.json
import subprocess, base64, json, os
files = [{'file': f, 'data': base64.b64encode(open(f, 'rb').read()).decode(), 'encoding': 'base64'}
         for f in subprocess.check_output(['git', 'ls-files', '-c', '-o', '--exclude-standard']).decode().split('\n')
         if f and os.path.isfile(f) and not f.startswith('screenshots/')]
print(json.dumps({'name': 'is-it-working', 'target': 'production', 'projectSettings': {'framework': 'nextjs'}, 'files': files}))
P
resp=$(curl -s "${AUTH[@]}" -X POST "https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1" -H "Content-Type: application/json" --data @/tmp/iiw-deploy.json)
id=$(echo "$resp" | jq -r .id); echo "deployment: $id"
[ "$id" = null ] && { echo "$resp"; exit 1; }
for i in $(seq 1 40); do s=$(curl -s "${AUTH[@]}" https://api.vercel.com/v13/deployments/$id | jq -r .readyState); [ "$s" = READY -o "$s" = ERROR ] && break; sleep 5; done
echo "state: $s"
curl -s "${AUTH[@]}" https://api.vercel.com/v13/deployments/$id | jq -r '.alias[]?' | sed 's#^#https://#'
