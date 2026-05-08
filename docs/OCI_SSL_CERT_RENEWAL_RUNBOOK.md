# OCI + Hostinger SSL Certificate Renewal Runbook

This runbook documents the three manual DNS renewal scripts for:

- `*.app.arivusystems.com` (wildcard tenant subdomains)
- `app.arivusystems.com` (main app)
- `api.arivusystems.com` (API host)

Because renewal uses `certbot --manual --preferred-challenges dns`, this is **not automatic**.  
You must add/update TXT records in Hostinger each time.

## Prerequisites

- Nginx is running on the VM
- Certbot is installed
- DNS is managed in Hostinger
- Current cert layout:
  - Wildcard cert name: `app.arivusystems.com`
  - Root app cert name: `app.arivusystems.com-0001`
  - API cert name: `api.arivusystems.com`

## Create script directory

```bash
mkdir -p ~/cert-renew
cd ~/cert-renew
```

## Script 1: Renew wildcard cert (`*.app.arivusystems.com`)

Create file: `~/cert-renew/renew-wildcard-app.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  --cert-name app.arivusystems.com \
  -d '*.app.arivusystems.com'

sudo nginx -t
sudo systemctl reload nginx
echo "Wildcard cert renewed: *.app.arivusystems.com"
```

## Script 2: Renew root app cert (`app.arivusystems.com`)

Create file: `~/cert-renew/renew-root-app.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  --cert-name app.arivusystems.com-0001 \
  -d app.arivusystems.com

sudo nginx -t
sudo systemctl reload nginx
echo "Root cert renewed: app.arivusystems.com"
```

## Script 3: Renew API cert (`api.arivusystems.com`)

Create file: `~/cert-renew/renew-api.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  --cert-name api.arivusystems.com \
  -d api.arivusystems.com

sudo nginx -t
sudo systemctl reload nginx
echo "API cert renewed: api.arivusystems.com"
```

## Make scripts executable

```bash
chmod +x ~/cert-renew/*.sh
```

## Run order

```bash
~/cert-renew/renew-wildcard-app.sh
~/cert-renew/renew-root-app.sh
~/cert-renew/renew-api.sh
```

## Verify certificates after renewal

```bash
sudo ls -la /etc/letsencrypt/live/

echo | openssl s_client -connect app.arivusystems.com:443 -servername app.arivusystems.com 2>/dev/null | openssl x509 -noout -dates
echo | openssl s_client -connect ksca1.app.arivusystems.com:443 -servername ksca1.app.arivusystems.com 2>/dev/null | openssl x509 -noout -dates
echo | openssl s_client -connect api.arivusystems.com:443 -servername api.arivusystems.com 2>/dev/null | openssl x509 -noout -dates
```

## Optional SAN checks

Use these to confirm which certificate path serves which domain:

```bash
sudo openssl x509 -in /etc/letsencrypt/live/app.arivusystems.com/fullchain.pem -noout -text | grep -o "DNS:[^,]*" | tr '\n' ' '; echo
sudo openssl x509 -in /etc/letsencrypt/live/app.arivusystems.com-0001/fullchain.pem -noout -text | grep -o "DNS:[^,]*" | tr '\n' ' '; echo
sudo openssl x509 -in /etc/letsencrypt/live/api.arivusystems.com/fullchain.pem -noout -text | grep -o "DNS:[^,]*" | tr '\n' ' '; echo
```

## Notes

- If `nginx -t` fails, fix config first and rerun reload.
- Keep Nginx cert mapping aligned with cert names:
  - `server_name *.app.arivusystems.com` -> `/etc/letsencrypt/live/app.arivusystems.com/...`
  - `server_name app.arivusystems.com` -> `/etc/letsencrypt/live/app.arivusystems.com-0001/...`
  - `server_name api.arivusystems.com` -> `/etc/letsencrypt/live/api.arivusystems.com/...`
