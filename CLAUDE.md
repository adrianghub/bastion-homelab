# bastion-homelab — CLAUDE.md

## Project Overview

Raspberry Pi 5 (aarch64, Debian bookworm), 8GB RAM, 459GB NVMe (`/dev/nvme0n1p2`).
All services defined in a single `~/docker-hub/docker-compose.yml`.
SSH access: `ssh adrianzinko@bastion.local`. Ops shortcuts: `make help` from `~/docker-hub/`.

## Architecture

- **Network**: all containers on `bastion-net`; nginx (`bastion-proxy`) proxies all external traffic
- **TLS**: wildcard cert `*.bastionreda.online` via Certbot DNS-01/Cloudflare; cert path `/etc/letsencrypt/live/bastionreda.online-0001/`
- **Remote access**: Cloudflare Tunnel in token mode (`--token`), no open ports — new hostnames added via Cloudflare Zero Trust dashboard → Tunnels → Edit → Public Hostname
- **Storage**: all persistent data under `~/docker-hub/data/` on NVMe

## Services

| Container | Image | URL | Notes |
|---|---|---|---|
| bastion-proxy | registry nginx:1.29 | — | reverse proxy |
| bastion-nextcloud | **custom build** | cloud.bastionreda.online | Nextcloud 32 |
| bastion-nextcloud-db | registry postgres:17.5-alpine | — | Nextcloud DB |
| bastion-nextcloud-redis | registry redis:8.0-alpine | — | Nextcloud cache |
| bastion-n8n | **custom build** | n8n.bastionreda.online | automation engine |
| bastion-vaultwarden | registry | pass.bastionreda.online | password manager |
| bastion-freshrss | registry | rss.bastionreda.online | RSS reader |
| bastion-portainer | registry | portainer.bastionreda.online | Docker UI |
| bastion-htop-web | **custom build** | status.bastionreda.online | ttyd+htop, auth_basic |
| bastion-tunnel | registry cloudflared | — | Cloudflare tunnel |
| bastion-watchtower | registry | — | auto-updates at 04:00 |
| bastion-certbot | registry | — | cert renewal |
| nc_app_flow | registry nextcloud/flow | — | Nextcloud AI assistant |

## Custom-Built Images

Rebuilt automatically by systemd at 04:30 when base images change:
- `n8n-custom/Dockerfile` — adds Docker CLI + docker-compose to n8n base
- `nextcloud-custom/Dockerfile` — adds Docker group access to nextcloud base
- `htop-web-custom/Dockerfile` — adds htop to ttyd alpine base

## Key Files

```
~/docker-hub/
├── docker-compose.yml          # single source of truth
├── .env                        # secrets (gitignored): POSTGRES_PASSWORD, ADMIN_TOKEN,
│                               #   CLOUDFRONT_TUNNEL_TOKEN, FRESH_RSS_API_PASS,
│                               #   WG_EASY_PASSWORD, WG_EASY_DNS
├── Makefile                    # ops shortcuts — run `make help`
├── nginx/conf.d/               # one .conf file per service vhost
├── nginx/.htpasswd             # basic auth (status.bastionreda.online)
├── certbot/certs/              # Let's Encrypt certs (mounted into nginx)
├── certbot/conf/cloudflare.ini # Cloudflare API key for DNS-01 challenge
├── data/                       # all persistent app data
├── auto-rebuild-custom.sh      # rebuilds custom images when base images change
├── check-custom-updates.sh     # systemd entry point for above
└── AUTO_UPDATE_GUIDE.md        # update system documentation
~/scripts/
├── backup.sh                   # INFRA + APPS → Backblaze B2 (must run as root)
├── restore.sh                  # restore from B2 + local APPS archive (must run as root)
└── nextcloud-upgrade.sh        # occ upgrade/repair — called by auto-rebuild post-hook
```

Secrets for backups: age encryption; recipients at `~/.config/age/recipients.txt`, private key at `~/.config/age/key.txt`.

## Automation Schedule

| Time | Job | Mechanism |
|---|---|---|
| 04:00 daily | Watchtower — registry image updates | Watchtower container (`--label-enable`) |
| 04:30 daily | Auto-rebuild custom images | systemd `bastion-custom-rebuild.timer` |
| 03:00 (1st, 15th) | Full backup → Backblaze B2 | user crontab → `backup.sh` |
| 04:00 (1st, bi-monthly) | Cert renewal | crontab → `certbot renew` |
| every 5 min | Nextcloud background jobs | crontab → `php cron.php` |
| Sun 05:00 | Docker prune | crontab — **see Known Issues** |

## Common Workflows

**Add a new service:**
1. Add service block to `docker-compose.yml` — include `networks: [bastion-net]` and `com.centurylinklabs.watchtower.enable=true` label
2. Create `nginx/conf.d/<service>.conf` — follow existing vhost pattern (HTTP→HTTPS + proxy_pass)
3. Add public hostname in Cloudflare Zero Trust dashboard
4. `docker compose up -d <service> && docker compose exec proxy nginx -s reload`

**Rebuild custom image manually:**
```bash
cd ~/docker-hub && ./auto-rebuild-custom.sh
# single service:
make rebuild-n8n    # or rebuild-nextcloud / rebuild-htop-web
```

**Run backup manually:**
```bash
sudo /home/adrianzinko/scripts/backup.sh
tail -f /var/log/bastion-backup.log
```

**Renew cert manually:** `make ssl-renew`

**Nextcloud upgrade + repair:** `make nextcloud-update`

**View logs:**
```bash
make logs-<service>
sudo journalctl -u bastion-custom-rebuild.service -f
tail -f /var/log/bastion-backup.log
tail -f ~/docker-hub/auto-rebuild.log
```

## nginx Vhost Pattern

All vhosts follow this structure — do not deviate:
- HTTP block: `return 301 https://$host$request_uri`
- HTTPS block: `ssl_certificate /etc/letsencrypt/live/bastionreda.online-0001/fullchain.pem`
- Security headers on every vhost: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- Proxy target uses Docker internal DNS: `proxy_pass http://<container_name>:<port>`
- WebSocket services additionally need:
  ```nginx
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  ```
  (required for: n8n, vaultwarden, any service using WebSocket)

## Known Issues — Do Not Touch Without Reading

- **DANGEROUS Sunday cron**: `0 5 * * 0 docker system prune -a -f --volumes` — `--volumes` flag deletes ALL unused volumes; can cause data loss if a container is stopped during the 04:30 rebuild. Remove `--volumes` from this cron entry.
- **B2 storage cap hit**: upload failed with 403 on 2026-01-15. Verify B2 bucket free space before trusting backup DR posture.
- **Nextcloud file data not in B2**: `INCLUDE_NEXTCLOUD_DATA_TO_B2=0` in `backup.sh` — 26GB of photos/videos have no offsite backup.
- **Cloudflare tunnel version pinned**: `cloudflared:2025.7.0` in compose but `watchtower.enable=true`; Watchtower cannot bump pinned tags — update manually.
- **Cert renewal frequency**: runs bi-monthly but certs expire in 90 days — one missed run leaves ~1 month buffer. Consider monthly.
