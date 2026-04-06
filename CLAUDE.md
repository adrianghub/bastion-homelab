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
| bastion-dashboard | **custom build** | dash.bastionreda.online | homelab web UI (this repo) |

## Dashboard (`dashboard/`)

Web UI for managing the homelab — replaces day-to-day SSH operations. Source lives in this repo; deployed as a single Docker container at `dash.bastionreda.online`.

### Stack
- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Fastify + TypeScript + dockerode + systeminformation
- **Auth**: Bearer token (`DASHBOARD_AUTH_TOKEN` in `.env`), stored in localStorage
- **Real-time**: polling every 5s for stats/containers; SSE for log streaming

### Structure
```
dashboard/
├── client/src/
│   ├── api/client.ts          # fetch wrapper, auth header injection, shared types
│   ├── hooks/usePolling.ts    # generic interval hook
│   ├── hooks/useSSE.ts        # SSE hook — passes token as ?token= query param
│   ├── components/
│   │   ├── Layout.tsx         # sidebar nav
│   │   ├── ServiceCard.tsx    # container card with start/stop/restart + SERVICE_URLS map
│   │   ├── SystemGauge.tsx    # CPU/RAM/disk/temp bars
│   │   └── ConfirmDialog.tsx  # Escape-dismissable inline confirm modal
│   └── pages/
│       ├── DashboardPage.tsx  # service grid + system overview (Phase 1 ✓)
│       ├── LogsPage.tsx       # SSE log streaming, container + file sources (Phase 2)
│       ├── BackupPage.tsx     # backup status + known issues (Phase 3)
│       ├── ActionsPage.tsx    # whitelisted quick actions (Phase 3)
│       └── AutomationPage.tsx # scheduled jobs timeline (Phase 4)
├── server/src/
│   ├── auth.ts                # Bearer + ?token= query param check
│   ├── config.ts              # env vars; exits if DASHBOARD_AUTH_TOKEN unset
│   ├── routes/
│   │   ├── containers.ts      # GET /api/containers, POST /api/containers/:id/:action
│   │   ├── system.ts          # GET /api/system
│   │   ├── logs.ts            # GET /api/logs/:source (SSE)
│   │   ├── backup.ts          # GET /api/backup/status
│   │   ├── automation.ts      # GET /api/automation (hardcoded schedule + warnings)
│   │   └── actions.ts         # POST /api/actions/:name (strict whitelist)
│   └── services/
│       ├── docker.ts          # dockerode wrapper
│       └── system.ts          # systeminformation wrapper
├── Dockerfile                 # multi-stage build (client → server → runtime)
├── package.json               # npm workspaces root
└── .env.example
```

### Build & Dev Commands
```bash
# Install all dependencies (run from dashboard/)
npm install --workspaces

# Type-check everything
npm run typecheck             # runs both workspaces

# Build for production
npm run build                 # builds client then server

# Dev: run Vite locally proxying to Pi
cd dashboard/client && npm run dev
# Proxy: /api → http://bastion.local:3000 (set in vite.config.ts)

# Dev: run server locally (needs DASHBOARD_AUTH_TOKEN set)
cd dashboard/server && npm run dev

# Production build check
docker build -t bastion-dashboard ./dashboard
```

### docker-compose.yml Addition
```yaml
bastion-dashboard:
  build:
    context: ./dashboard
  container_name: bastion-dashboard
  restart: unless-stopped
  pid: "host"                   # required — systeminformation reads host /proc via pid namespace
  networks:
    - bastion-net
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - /home/adrianzinko/docker-hub:/docker-hub:ro
    - /home/adrianzinko/scripts:/scripts:ro
    - /var/log/bastion-backup.log:/logs/backup.log:ro
    - /home/adrianzinko/docker-hub/auto-rebuild.log:/logs/auto-rebuild.log:ro
  env_file: .env                # must contain DASHBOARD_AUTH_TOKEN
  labels:
    - "com.centurylinklabs.watchtower.enable=false"
```

> **Note**: `pid: "host"` is required. Without it, `systeminformation` reads namespaced container stats, not the host. Do not replace it with `/proc` volume mounts — that does not work for this library.

### nginx Vhost
Standard pattern (HTTP redirect + HTTPS proxy). Dashboard is served on port 3000 — Fastify handles both static files and `/api/*` on the same port. No WebSocket needed (polling + SSE only).

### Action Whitelist
`server/src/routes/actions.ts` contains a strict name→command map. No user input is interpolated. Adding a new action: add the key/command to the `ACTIONS` record only — never accept arbitrary commands from the client.

### API Endpoints
```
GET  /api/containers                   → ContainerInfo[]
POST /api/containers/:id/start|stop|restart → { ok: true }
GET  /api/system                       → { cpu, mem, disk, temp }
GET  /api/logs/:source?lines=&follow=  → SSE stream
GET  /api/backup/status                → { lastRun, success, issues[] }
GET  /api/automation                   → AutomationJob[]
GET  /api/actions                      → string[] (whitelisted names)
POST /api/actions/:name                → { ok, output }
```

### Implementation Status
- **Phase 1** ✓ — Dashboard (service grid + system overview), Login, Layout, all components
- **Phase 2** — Logs viewer (SSE streaming, container + file sources, search/filter)
- **Phase 3** — Backup status page + Actions page
- **Phase 4** — Automation timeline
- **Phase 5** — Deploy to Pi (docker-compose, nginx, Cloudflare hostname)

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

**Develop the dashboard locally:**
```bash
cd ~/Dev/bastion-homelab/dashboard
npm install --workspaces
cd client && npm run dev   # Vite on :5173, /api proxied to bastion.local:3000
```

**Deploy dashboard to Pi (Phase 5):**
1. Add `bastion-dashboard` block to `~/docker-hub/docker-compose.yml` (see Dashboard section above)
2. Create `nginx/conf.d/dashboard.conf` following standard vhost pattern → port 3000
3. Add `DASHBOARD_AUTH_TOKEN` to `~/docker-hub/.env`
4. Add `dash.bastionreda.online` hostname in Cloudflare Zero Trust dashboard
5. `docker compose up -d bastion-dashboard && docker compose exec proxy nginx -s reload`

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
