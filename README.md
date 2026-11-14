<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:ff3b30,50:ff9500,100:2fd158&height=220&section=header&text=DjBerry%20Homelab&fontSize=60&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Server%20by%20day%20%C2%B7%20DJ%20booth%20by%20night&descSize=18&descAlignY=58" alt="DjBerry Homelab" width="100%" />

<a href="#-whats-running">
  <img src="https://readme-typing-svg.demolab.com?font=Martian+Mono&weight=600&size=18&duration=2800&pause=900&color=2FD158&center=true&vCenter=true&width=640&lines=Self-hosted+on+a+Raspberry+Pi+5;Network-wide+ad+and+tracker+blocking;Every+service+at+service.lan;Hardened%2C+non-root+containers;Zero+ports+open+to+the+internet" alt="Typing intro" />
</a>

<br />

<img src="https://img.shields.io/badge/Raspberry%20Pi%205-A22846?style=for-the-badge&logo=raspberrypi&logoColor=white" alt="Raspberry Pi 5" />
<img src="https://img.shields.io/badge/Docker%20Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Compose" />
<img src="https://img.shields.io/badge/Raspberry%20Pi%20OS-Debian-A81D33?style=for-the-badge&logo=debian&logoColor=white" alt="Raspberry Pi OS (Debian)" />
<br />
<img src="https://img.shields.io/badge/services-14-2fd158?style=for-the-badge&labelColor=0d0d0f" alt="14 services" />
<img src="https://img.shields.io/badge/open%20ports-0-ff9500?style=for-the-badge&labelColor=0d0d0f" alt="0 open ports" />
<img src="https://img.shields.io/badge/secrets%20in%20repo-0-ff3b30?style=for-the-badge&labelColor=0d0d0f" alt="0 secrets in repo" />

</div>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="" />

## 🎛️ What's running

Every service lives in its own folder under [`docker/`](docker/) with a single `compose.yml`, and a root [`docker/compose.yml`](docker/compose.yml) brings them all up with one command.

| | Service | What it does |
|:---:|---|---|
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/adguard-home.svg" width="32" /> | [**AdGuard Home**](docker/adguardhome/compose.yml) | Network-wide DNS with ad and tracker blocking for every device in the house |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/nginx-proxy-manager.svg" width="32" /> | [**Nginx Proxy Manager**](docker/nginx-proxy-manager/compose.yml) | Reverse proxy: reach every service by name (`service.lan`) instead of `IP:port` |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/homepage.png" width="32" /> | [**Homepage**](docker/homepage/compose.yml) | Custom-themed dashboard with live status and stats for every service |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/plex.svg" width="32" /> | [**Plex**](docker/plex/compose.yml) | Media server for the TVs and phones at home |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/radarr.svg" width="32" /> | [**Radarr**](docker/radarr/compose.yml) | Movie library management |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/sonarr.svg" width="32" /> | [**Sonarr**](docker/sonarr/compose.yml) | TV library management and calendar |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/bazarr.svg" width="32" /> | [**Bazarr**](docker/bazarr/compose.yml) | Subtitles for the movie and TV library |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/prowlarr.svg" width="32" /> | [**Prowlarr**](docker/prowlarr/compose.yml) | Indexer manager |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/qbittorrent.svg" width="32" /> | [**qBittorrent**](docker/qbittorrent/compose.yml) | Download client with minimal seeding |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/flaresolverr.svg" width="32" /> | [**FlareSolverr**](docker/flaresolverr/compose.yml) | Helper proxy for Prowlarr |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/whatsapp.svg" width="32" /> | [**WAHA**](docker/waha/compose.yml) | WhatsApp HTTP API (GOWS engine, no browser) plus a small [bot](docker/waha/bot/index.js) that answers through it (`/status` lists every service's health from Uptime Kuma, `/jitsi` posts a Jitsi meeting link in any chat, `/help` lists the commands) |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/uptime-kuma.svg" width="32" /> | [**Uptime Kuma**](docker/uptime-kuma/compose.yml) | Checks every service and sends a WhatsApp alert (via WAHA) when one goes down |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/portainer.svg" width="32" /> | [**Portainer**](docker/portainer/compose.yml) | Web UI to manage Docker |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/healthchecks.svg" width="32" /> | [**autoheal**](docker/autoheal/compose.yml) | Restarts any container whose healthcheck fails |

## 🗺️ Architecture

```mermaid
flowchart LR
    subgraph home["🏠 Home network"]
        D["📱 Phones · 💻 PCs · 📺 TVs"]
    end
    VPN["🔒 Tailscale<br/>remote access"]

    subgraph pi["🍓 Raspberry Pi 5"]
        AG["🛡️ AdGuard Home<br/>DNS + ad blocking"]
        NPM["🔀 Nginx Proxy Manager<br/>*.lan reverse proxy"]
        HP["🎛️ Homepage"]
        PT["🐳 Portainer"]

        subgraph media["🎬 Media stack"]
            PR["Prowlarr"]
            RS["Radarr · Sonarr"]
            BZ["Bazarr<br/>subtitles"]
            QB["qBittorrent"]
            PX["Plex"]
        end

        DATA[("💾 /srv/data<br/>media + downloads")]

        UK["📟 Uptime Kuma<br/>checks + alerts"]
        WA["💬 WAHA<br/>WhatsApp HTTP API"]
        BOT["🤖 Bot<br/>no published ports"]
    end

    WAC["☁️ WhatsApp"]

    D -- "DNS :53" --> AG
    D -- "http://service.lan" --> NPM
    VPN -.-> AG
    VPN -.-> NPM
    NPM --> HP & PT & RS & BZ & PX
    PR --> RS --> QB --> DATA
    RS --> BZ -- "subtitles" --> DATA
    DATA -- "read-only" --> PX
    WA -- "outbound only" --> WAC
    WA <-- "webhook · API" --> BOT
    UK -- "alerts" --> WA
    BOT -- "/status · /metrics" --> UK
```

## 🛡️ Security by default

Every stack follows the same rules:

| | Rule |
|:---:|---|
| 👤 | **No root.** Media services run as a dedicated system user: no login shell, no sudo, no Docker access |
| 🔒 | **`no-new-privileges`** and **RAM/CPU limits** wherever possible |
| 🐳 | **`docker.sock` only where strictly needed** (Portainer and autoheal) |
| 📼 | **Read-only media.** Plex mounts the library `:ro`, so it can never modify or delete files |
| ❤️‍🩹 | **Self-healing.** Healthchecks + `autoheal=true` restart anything that hangs |
| 🚪 | **Zero port forwarding.** Nothing is exposed on the router; remote access only through a VPN |
| 🌐 | **LAN only.** Most web UIs are published on IPv4 inside the local network |

## 📁 Repo layout

```
.
├── docker/
│   ├── compose.yml           ← root project: includes every stack below
│   ├── adguardhome/          compose.yml
│   ├── autoheal/             compose.yml
│   ├── bazarr/               compose.yml
│   ├── flaresolverr/         compose.yml
│   ├── homepage/
│   │   ├── compose.yml
│   │   ├── homepage.env.example   ← template for the secrets
│   │   └── config/                ← dashboard YAML, CSS theme and JS
│   ├── nginx-proxy-manager/  compose.yml
│   ├── plex/                 compose.yml
│   ├── portainer/            compose.yml
│   ├── prowlarr/             compose.yml
│   ├── qbittorrent/          compose.yml
│   ├── radarr/               compose.yml
│   ├── sonarr/               compose.yml
│   ├── uptime-kuma/          compose.yml
│   └── waha/
│       ├── compose.yml            ← WAHA + the bot
│       ├── waha.env.example       ← template for the API key and passwords
│       ├── bot.env.example        ← template for the bot's key and allowed numbers
│       └── bot/                   ← the bot's code: Dockerfile + index.js
├── .gitignore                ← allowlist: only the files above get published
└── README.md
```

> [!NOTE]
> Each service's runtime state (`config/`, `data/`, `conf/`...) is **not** in this repo: it holds databases, API keys and passwords, and belongs in backups instead.

## 🚀 Quick start

Clone the repo, create the Homepage and WAHA secrets files and start everything from the root project:

```bash
git clone https://github.com/Whuaxu/DjBerry-Homelab.git
cd DjBerry-Homelab/docker

cp homepage/homepage.env.example homepage/homepage.env
chmod 600 homepage/homepage.env
nano homepage/homepage.env        # fill in your keys, passwords and IPs

cp waha/waha.env.example waha/waha.env
cp waha/bot.env.example waha/bot.env
chmod 600 waha/waha.env waha/bot.env
nano waha/waha.env                # API key and dashboard passwords
nano waha/bot.env                 # same API key + numbers allowed to use the bot + Kuma key for /status

docker compose up -d
```

That's it: one project, every stack. The usual commands work for all services at once, or for just one:

| Command | What it does |
|---|---|
| `docker compose up -d` | Start everything |
| `docker compose up -d plex` | Start (or recreate) a single service |
| `docker compose ps` | Status of every container |
| `docker compose logs -f sonarr` | Follow one service's logs |
| `docker compose stop qbittorrent` | Stop a single service |

> [!WARNING]
> Fill in real credentials in `homepage.env` before enabling a widget. qBittorrent bans an IP after 5 failed logins, and a misconfigured widget will retry until it gets banned.

> [!CAUTION]
> `docker compose down` from the root stops **everything**, AdGuard included, so every device on the network loses DNS. Use `docker compose stop <service>` to stop just one.

<details>
<summary><b>🔄 Updating</b></summary>

<br />

`:latest` images don't update on their own. Pull the new images and recreate whatever changed:

```bash
cd DjBerry-Homelab/docker
docker compose pull               # or: docker compose pull plex
docker compose up -d
docker image prune -f             # remove the old images
```

</details>

<details>
<summary><b>📦 Running a single stack on its own</b></summary>

<br />

Every folder is also a standalone Compose project, so you can run just the stacks you want:

```bash
cd DjBerry-Homelab/docker/adguardhome
docker compose up -d
```

> [!IMPORTANT]
> Pick **one** way per service: the root project or its own folder, not both. Services have fixed `container_name` values, so starting the same one from two projects fails with *"container name already in use"*.

</details>

## 🧰 Built with

<p align="center">
  <img src="https://skillicons.dev/icons?i=raspberrypi,linux,docker,nginx,bash,css,js&theme=dark" alt="Raspberry Pi, Linux, Docker, Nginx, Bash, CSS, JavaScript" />
</p>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:2fd158,50:ff9500,100:ff3b30&height=120&section=footer" alt="" width="100%" />
