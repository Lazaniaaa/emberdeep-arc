# Deploying Emberdeep to Vultr

Emberdeep is a static site: `npm run build` produces `dist/`, which any web server can host. Nothing here needs
a database, an API key or a secret. The economy is simulated in the browser.

## One-time: create the server (about 5 minutes)

1. Vultr panel -> **Deploy +** -> **Deploy New Server** -> **Cloud Compute (Shared CPU)**.
2. Location: whichever is closest to your judges. Image: **Ubuntu 24.04 LTS**.
3. Plan: the cheapest one that includes an **IPv4 address**. The site is tiny (2 MB); the smallest plan is plenty.
4. Under **Additional Features**, open **Cloud-Init User-Data** and paste the contents of `deploy/server-setup.sh`.
   (If your panel has no such field, add the script under Products -> Orchestration -> Startup Scripts as a
   *Boot* script and select it here.)
5. Deploy, wait until the server shows **Running**, then copy its **IP address** and **root password**
   from the server page.

## Every time you want to publish

From the project folder in **Git Bash** (it has `ssh` and `scp`):

    bash deploy/deploy.sh <the server IP>

or in PowerShell, if OpenSSH Client is installed (Settings -> Apps -> Optional features):

    .\deploy\deploy.ps1 -Server <the server IP>

It builds the game and uploads it to a new folder under `/var/www/emberdeep-releases/`. Only when the upload is
complete does it switch the site to that folder, so a dropped connection never leaves the site empty. The four newest
releases stay on the server, so tabs that are still open keep working. Then open
`https://<IP with dashes>.sslip.io`, for example `https://203-0-113-5.sslip.io`.

The first HTTPS load can take up to a minute while Caddy gets a certificate. `http://<IP>` works meanwhile.

## If something is off

- Blank page: `ssh root@<IP>` then `ls -l /var/www/emberdeep/` (a link to the newest release; it should list `index.html`, `assets`, `maps`).
- Go back to an older version: `ls /var/www/emberdeep-releases`, then `ln -sfn /var/www/emberdeep-releases/<folder> /var/www/emberdeep`.
- No HTTPS: `journalctl -u caddy -n 50` on the server. Port 443 must be open (the setup script opens it with UFW;
  also check Vultr's **Firewall** tab if you enabled one).
- Your own domain instead of sslip.io: point an A record at the IP, then replace the first line of
  `/etc/caddy/Caddyfile` with your domain and run `systemctl reload caddy`.
- Update the game later: just run `deploy.ps1` again.

## The Hall of Descents on Arc (optional)

The on-chain leaderboard needs one small service on the same server: it replays a finished descent and signs the
result for the Hall contract. It runs as its own locked-down user, listens only on localhost, and Caddy sends
`/api/*` to it. Its signing key is made on the server and never leaves it. Full order of steps, with the contract
deployment in between: [docs/arc/README.md](../docs/arc/README.md#deploying-in-order).

    .\deploy\attest.ps1 -Server <IP>                    # first time: installs it, prints the signer address
    .\deploy\attest.ps1 -Server <IP> -Hall 0x<address>  # once the Hall is deployed: starts it for that Hall
    .\deploy\attest.ps1 -Server <IP>                    # later updates keep the Hall address

On the server: `systemctl status emberdeep-attest`, `journalctl -u emberdeep-attest -n 50`,
`curl -s localhost:8787/api/health`. The Caddyfile from before the `/api` route is kept as
`/etc/caddy/Caddyfile.before-attest`.
