# Raspberry Pi homelab

Self-hosted services for my home server. Each one lives in its own folder under `docker/` with a `compose.yml`.

| Folder | What it is |
|---|---|
| `docker/adguardhome` | Network-wide DNS with ad and tracker blocking |
| `docker/autoheal` | Restarts containers whose healthcheck fails |
| `docker/nginx-proxy-manager` | Reverse proxy: reach every service by name (`service.lan`) |
| `docker/portainer` | Web UI to manage Docker |
| `docker/homepage` | Dashboard showing the status of every service |
| `docker/plex` | Media server |
| `docker/radarr`, `docker/sonarr` | Movie and TV library management |
| `docker/prowlarr` | Indexer manager |
| `docker/qbittorrent` | Download client |
| `docker/flaresolverr` | Helper proxy for Prowlarr (testing) |

## Conventions

- `restart: unless-stopped` and, where possible, a healthcheck + `autoheal=true`.
- No root: media services run as a dedicated system user (no login shell, no sudo, no Docker access).
- `no-new-privileges` and RAM/CPU limits where possible; `docker.sock` only where it is strictly needed.
- Plex mounts the media library **read-only**.
- No ports forwarded on the router: remote access only through a VPN.
- Most web UIs are published on IPv4 only, inside the local network.

## What is (and isn't) in this repo

Only the `compose.yml` files and the Homepage config, which live in `~/docker` on the server.
Each service's runtime state (`config/`, `data/`, `conf/`...) is **not** here: it holds databases, API keys
and passwords, and belongs in backups instead.

## Running a service

```bash
cd ~/docker/<service>
docker compose up -d
```

For Homepage, first:

```bash
cp homepage.env.example homepage.env && chmod 600 homepage.env   # then fill it in
cp config/custom.js.example config/custom.js
```
