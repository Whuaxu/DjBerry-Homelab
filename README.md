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
<img src="https://img.shields.io/badge/services-11-2fd158?style=for-the-badge&labelColor=0d0d0f" alt="11 services" />
<img src="https://img.shields.io/badge/open%20ports-0-ff9500?style=for-the-badge&labelColor=0d0d0f" alt="0 open ports" />
<img src="https://img.shields.io/badge/secrets%20in%20repo-0-ff3b30?style=for-the-badge&labelColor=0d0d0f" alt="0 secrets in repo" />

</div>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="" />

## 🎛️ What's running

Every service lives in its own folder under [`docker/`](docker/) with a single `compose.yml`.

| | Service | What it does |
|:---:|---|---|
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/adguard-home.svg" width="32" /> | [**AdGuard Home**](docker/adguardhome/compose.yml) | Network-wide DNS with ad and tracker blocking for every device in the house |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/nginx-proxy-manager.svg" width="32" /> | [**Nginx Proxy Manager**](docker/nginx-proxy-manager/compose.yml) | Reverse proxy: reach every service by name (`service.lan`) instead of `IP:port` |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/homepage.png" width="32" /> | [**Homepage**](docker/homepage/compose.yml) | Custom-themed dashboard with live status and stats for every service |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/plex.svg" width="32" /> | [**Plex**](docker/plex/compose.yml) | Media server for the TVs and phones at home |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/radarr.svg" width="32" /> | [**Radarr**](docker/radarr/compose.yml) | Movie library management |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/sonarr.svg" width="32" /> | [**Sonarr**](docker/sonarr/compose.yml) | TV library management and calendar |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/prowlarr.svg" width="32" /> | [**Prowlarr**](docker/prowlarr/compose.yml) | Indexer manager |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/qbittorrent.svg" width="32" /> | [**qBittorrent**](docker/qbittorrent/compose.yml) | Download client with minimal seeding |
| <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/flaresolverr.svg" width="32" /> | [**FlareSolverr**](docker/flaresolverr/compose.yml) | Helper proxy for Prowlarr *(testing)* |
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
            QB["qBittorrent"]
            PX["Plex"]
        end

        DATA[("💾 /srv/data<br/>media + downloads")]
    end

    D -- "DNS :53" --> AG
    D -- "http://service.lan" --> NPM
    VPN -.-> AG
    VPN -.-> NPM
    NPM --> HP & PT & RS & PX
    PR --> RS --> QB --> DATA
    DATA -- "read-only" --> PX
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
│   ├── adguardhome/          compose.yml
│   ├── autoheal/             compose.yml
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
│   └── sonarr/               compose.yml
├── .gitignore                ← allowlist: only the files above get published
└── README.md
```

> [!NOTE]
> Each service's runtime state (`config/`, `data/`, `conf/`...) is **not** in this repo: it holds databases, API keys and passwords, and belongs in backups instead.

## 🚀 Quick start

On the server, each stack lives in `~/docker/<service>`:

```bash
cd ~/docker/<service>
docker compose up -d
```

<details>
<summary><b>🎛️ Homepage needs one extra step</b></summary>

<br />

Create the secrets file from the template, lock it down and fill it in:

```bash
cd ~/docker/homepage
cp homepage.env.example homepage.env
chmod 600 homepage.env
nano homepage.env
docker compose up -d
```

> [!WARNING]
> Fill in real credentials before enabling a widget. qBittorrent bans an IP after 5 failed logins, and a misconfigured widget will retry until it gets banned.

</details>

<details>
<summary><b>🔄 Updating a service</b></summary>

<br />

`:latest` images don't update on their own. Pull the new image and recreate the container:

```bash
cd ~/docker/<service>
docker compose pull
docker compose up -d
docker image prune -f
```

</details>

## 🧰 Built with

<p align="center">
  <img src="https://skillicons.dev/icons?i=raspberrypi,linux,docker,nginx,bash,css,js&theme=dark" alt="Raspberry Pi, Linux, Docker, Nginx, Bash, CSS, JavaScript" />
</p>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:2fd158,50:ff9500,100:ff3b30&height=120&section=footer" alt="" width="100%" />
