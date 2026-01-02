# bastion-homelab

A Raspberry Pi–friendly, docker-based personal cloud behind a reverse proxy

## Reverse proxy & TLS

nginx as bastion-proxy, serving on 80/443

Uses:

- ./nginx/conf.d for per-service vhosts
- ./nginx/ssl and /etc/letsencrypt for certs

## User-facing apps

- Nextcloud (bastion-nextcloud): personal file cloud + apps
- Vaultwarden (bastion-vaultwarden): password manager with DOMAIN=https://pass.bastionreda.online
- FreshRSS: RSS reader (in nginx configs + compose, snippet truncated)
- n8n (bastion-n8n): automation/“glue” engine, already mounted to scripts, backups and Nextcloud data; clearly intended as internal automation backbone. 

## Infrastructure / management

- Portainer (bastion-portainer): Docker UI
- htop-web: ttyd + htop as a web terminal
- Cloudflare tunnel (bastion-tunnel): secure remote access, no open ports
- Postgres + Redis backend for Nextcloud
- Certbot (certbot/dns-cloudflare) with DNS-01 via Cloudflare
- Automation and reliability

## Automatic updates (two-layer): 

- Watchtower for registry-based images (nginx, Portainer, Vaultwarden, tunnel, Postgres, Redis, FreshRSS, Certbot, Watchtower itself) on a 4:00 schedule.
- Custom auto-rebuild system for images you build yourself:
- n8n-custom
- nextcloud-custom
- htop-web-custom

### Implemented via:

- auto-rebuild-custom.sh (main logic)
- check-custom-updates.sh (systemd service entry point)
- bastion-custom-rebuild.timer at 4:30
- Logs to auto-rebuild.log — it shows real rebuild runs for the n8n base image. 

## Backups & disaster recovery

- scripts/backup.sh orchestrates backups.
- backup.log shows the flow: stop containers, archive:
- then restart containers, upload archive to Backblaze B2, prune local backups (keep last 2). 
automated offsite backups to Backblaze B2

This is already “product level” from a homelab perspective.
