# Deployment

Production: <https://zone-blanche.eg-infra.work>. Every push to `main` that
passes the checks is in production about a minute later. Nothing is deployed by
hand.

## How a commit reaches production

```
push to main
  └─ GitHub Actions, .github/workflows/ci.yml
       ├─ job check:  npm ci, lint, typecheck, test, build      (~15 s)
       └─ job deploy (needs check, main only, one at a time)
            ├─ ssh deploy@$DEPLOY_HOST  →  scripts/deploy.sh <sha>   (~1 min)
            │     git fetch + reset to <sha> (must be on main)
            │     docker compose up --detach --build   (rebuilds the image)
            └─ GET https://$DOMAIN/api/trains/6111/<today>, straight to the
               server (curl --resolve): 200 or 404 means the app answers
```

A red `check` job means no deploy. The image build also runs lint, typecheck
and tests (`Dockerfile`), so a commit that fails there never replaces the
running container either. While the new container loads the open data (~20 s),
the site is down: accepted for a personal tool.

## Files

| File | Role |
|---|---|
| `.github/workflows/ci.yml` | `check` and `deploy` jobs |
| `scripts/deploy.sh` | Runs on the server; the deploy key's only allowed command |
| `Dockerfile` | Stage `data` downloads the open data (cached by Docker until `scripts/download-data.sh` changes); stage `build` checks and builds; the final image runs `node dist-server/main.js` |
| `compose.yaml` | Services `app` (port 3000, internal) and `caddy` (80/443, HTTPS for `$DOMAIN`) |
| `Caddyfile` | Caddy: `{$DOMAIN}` → `app:3000`, gzip/zstd |

## Server

- Vultr free tier: 1 vCPU, 458 MB RAM, 10 GB disk, Debian 13. 2 GB swap
  (`/swapfile`, swappiness 10): the image build and the data loading need it.
- Docker Engine and the Compose plugin from Docker's apt repository.
- Firewall (ufw): 22, 80, 443 (tcp, and 443/udp for HTTP/3).
- Checkout in `/srv/zone-blanche`, owned by the `deploy` user (in the `docker`
  group). `/srv/zone-blanche/.env` (not in git) holds
  `DOMAIN=zone-blanche.eg-infra.work`.
- DNS: `eg-infra.work` is on Cloudflare; the `zone-blanche` A record is
  proxied (orange cloud). Caddy gets its own Let's Encrypt certificate through
  it (HTTP challenge), and Cloudflare connects to it over HTTPS.
- Memory in use: app ~160 MB, Caddy ~10 MB. A train takes ~2 s.

Admin access: `ssh root@<DEPLOY_HOST>` with the owner's personal key.

## Secrets and variables (GitHub repository settings)

| Name | Kind | Content |
|---|---|---|
| `DEPLOY_SSH_KEY` | secret | Private ed25519 deploy key (exists only there) |
| `DEPLOY_KNOWN_HOSTS` | secret | The server's SSH host keys, so the job trusts only this server |
| `DEPLOY_HOST` | variable | The server's IPv4 address |
| `DOMAIN` | variable | `zone-blanche.eg-infra.work` |

The deploy key is locked on the server, in `/home/deploy/.ssh/authorized_keys`:

```
command="/srv/zone-blanche/scripts/deploy.sh",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty ssh-ed25519 … github-actions@zone-blanche
```

Whatever the job asks, the server runs `deploy.sh`, which reads the commit from
the SSH command, accepts only a hexadecimal hash, and only one that is on
`main`. A leaked key can redeploy a commit of `main`, nothing else.

## Operations

All on the server, in `/srv/zone-blanche`, as `deploy` (`su deploy`) or root.

- **State**: `docker compose ps`, `docker stats --no-stream`, `free -m`.
- **Logs**: `docker compose logs -f app` (load times, then errors),
  `docker compose logs caddy` (certificates).
- **Deployed commit**: `git log --oneline -1` (as `deploy`: root gets git's
  "dubious ownership" error).
- **Redeploy / retry a failed deploy**: re-run the workflow on GitHub, or on
  the server `scripts/deploy.sh <sha of a commit on main>`.
- **Roll back**: `git revert` the bad commit and push; the pipeline deploys the
  revert. In a hurry: `scripts/deploy.sh <previous good sha>` on the server
  (the next push to `main` deploys `main` again).
- **Refresh the open data** (the `data` image layer is cached forever):
  `docker compose build --no-cache app && docker compose up -d`, or change
  `scripts/download-data.sh`.
- **Rotate the deploy key**: `ssh-keygen -t ed25519 -N "" -f key`, put
  `key.pub` in `authorized_keys` with the same `command=…` prefix,
  `gh secret set DEPLOY_SSH_KEY < key`, delete `key`.
- **Server rebuilt / new IP**: redo the Server section, then
  `ssh-keyscan <ip>` (check it against the console) into `DEPLOY_KNOWN_HOSTS`,
  `gh variable set DEPLOY_HOST`, update the DNS record, and copy
  `scripts/deploy.sh` once into the new checkout (it is the key's forced
  command, so it must exist before the first deploy).

## Pitfalls already met

- **Cloudflare challenges GitHub's runners**: a check through
  `https://$DOMAIN` from CI never gets a 200. The job resolves `$DOMAIN` to
  `$DEPLOY_HOST` itself (`curl --resolve`), so it checks the server it just
  deployed, with its real certificate.
- **Memory**: the app was cut from 1.2 GB to ~0.5 GB peak (see the journal,
  "Memory below 512 MB"). `node --max-old-space-size=256` in the image is part
  of that: removing it makes V8 grow past the server's RAM while loading.
- **Disk full** ("no space left on device" while exporting the image): old
  build cache piles up (each new `node:24-slim` re-downloads the open data).
  `deploy.sh` prunes the cache not used by the last build; by hand:
  `docker builder prune --force --filter until=1h`, then `df -h /`.
- **`npm ci` in Docker** needs `--ignore-scripts`: the `prepare` script calls
  `git`, absent from the image.
- **Hosting history**: Koyeb's free tier is closed to new accounts (2026);
  Render's free tier (0.1 CPU) meant ~80 s startup and 10–15 s per train;
  hence the Vultr server.
