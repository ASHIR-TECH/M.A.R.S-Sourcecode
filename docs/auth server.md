The bug that test hunt found
normalize is not defined in src/providers/github.js:48 — every GitHub sign-in would have 500'd in production. My unit tests passed because they only covered pre-network validation. The integration test completes a real code exchange and caught it immediately. GitHub sign-in is unverified against live GitHub until you test it for real.
Running the auth server on EC2
Assumes Ubuntu 24.04, auth.yourdomain.com A-record pointed at the instance.
1. Instance prep
# security group: allow 22, 80, 443. Do NOT open 4000.
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs git
node -v   # must be >= 22.5 for node:sqlite; 24.x recommended
2. Service user and code
sudo useradd --system --home /opt/mars-auth --shell /usr/sbin/nologin mars-auth
sudo mkdir -p /opt/mars-auth && sudo chown mars-auth:mars-auth /opt/mars-auth
sudo -u mars-auth git clone https://github.com/ASHIR-TECH/M.A.R.S-Sourcecode.git /opt/mars-auth/repo
cd /opt/mars-auth/repo/auth-server
sudo -u mars-auth npm ci --omit=dev
3. Environment file
sudo -u mars-auth cp .env.example .env
sudo -u mars-auth nano .env
sudo chown mars-auth:mars-auth .env
sudo chmod 600 .env      # holds JWT_SECRET + provider secrets
HOST=127.0.0.1          # localhost only; Caddy is the public door
PORT=4000
AUTH_ISSUER=https://auth.yourdomain.com
AUTH_AUDIENCE=mars-mobile
JWT_SECRET=<48 random bytes>
ALLOWED_REDIRECT_URIS=mars://auth,exp://127.0.0.1:8081/--/auth
DATABASE_PATH=/opt/mars-auth/data/auth.db
TRUST_PROXY_HOPS=1
GOOGLE_CLIENT_ID=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
Generate the secret server-side so it never passes through your shell history:
sudo -u mars-auth node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
4. systemd
sudo tee /etc/systemd/system/mars-auth.service > /dev/null <<'UNIT'
[Unit]
Description=MARS identity service
After=network.target

[Service]
Type=simple
User=mars-auth
Group=mars-auth
WorkingDirectory=/opt/mars-auth/repo/auth-server
EnvironmentFile=/opt/mars-auth/repo/auth-server/.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/mars-auth/data

[Install]
WantedBy=multi-user.target
UNIT

sudo mkdir -p /opt/mars-auth/data && sudo chown mars-auth:mars-auth /opt/mars-auth/data
sudo systemctl daemon-reload
sudo systemctl enable --now mars-auth
sudo systemctl status mars-auth
curl -s localhost:4000/health
ProtectSystem=strict makes the whole filesystem read-only except data/, so a code bug can't overwrite the app.
5. Caddy for TLS
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile > /dev/null <<'CADDY'
auth.yourdomain.com {
  reverse_proxy 127.0.0.1:4000
  encode gzip
}
CADDY
sudo systemctl reload caddy
Caddy provisions and renews the certificate automatically. Then point the app at it:
# mobile/.env
EXPO_PUBLIC_AUTH_SERVER_URL=https://auth.yourdomain.com
6. Register the redirect URI
Add to Google and GitHub consoles, exactly:
exp://127.0.0.1:8081/--/auth    (dev, emulator)
exp://192.168.1.X:8081/--/auth  (dev, physical device)
They must match ALLOWED_REDIRECT_URIS character for character.
7. Backups
sudo tee /etc/cron.daily/mars-auth-backup > /dev/null <<'BKP'
#!/bin/sh
sqlite3 /opt/mars-auth/data/auth.db ".backup '/var/backups/mars-auth-$(date +\%F).db'" \
  && find /var/backups -name 'mars-auth-*.db' -mtime +14 -delete
BKP
sudo chmod +x /etc/cron.daily/mars-auth-backup
Use .backup, not cp — copying a live SQLite file can capture a torn write.
8. Updates
cd /opt/mars-auth/repo && sudo -u mars-auth git pull
cd auth-server && sudo -u mars-auth npm ci --omit=dev
sudo systemctl restart mars-auth
Two things to know
Your .env is not in the repo, so on a fresh clone you must re-enter it. Keep a copy in your password manager — losing JWT_SECRET logs out every active access token.