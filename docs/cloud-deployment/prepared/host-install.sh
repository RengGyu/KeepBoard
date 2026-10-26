#!/bin/sh
# Future NEW Lightsail host only. This script is prepared, not executed here.
set -eu
test "${1:-}" = --approved-new-host || { echo 'Requires approved new cloud host'; exit 2; }
test "$(id -u)" = 0
test -d /opt/keepboard/current/server
apt-get update
apt-get install -y nginx snapd curl ca-certificates xz-utils
id keepboard >/dev/null 2>&1 || useradd --system --home /var/lib/keepboard --create-home keepboard
install -d -m 700 -o keepboard -g keepboard /var/lib/keepboard
install -d -m 755 /var/www/keepboard-acme /opt/keepboard/node
case "$(uname -m)" in x86_64) node_arch=x64;; aarch64) node_arch=arm64;; *) exit 2;; esac
node_version=22.23.4
node_tmp=$(mktemp -d)
curl --fail --silent --show-error "https://nodejs.org/dist/v${node_version}/node-v${node_version}-linux-${node_arch}.tar.xz" -o "$node_tmp/node.tar.xz"
curl --fail --silent --show-error "https://nodejs.org/dist/v${node_version}/SHASUMS256.txt" -o "$node_tmp/SHASUMS256.txt"
expected_sha=$(awk -v filename="node-v${node_version}-linux-${node_arch}.tar.xz" '$2==filename{print $1}' "$node_tmp/SHASUMS256.txt")
test -n "$expected_sha"
echo "$expected_sha  $node_tmp/node.tar.xz" | sha256sum -c -
tar -xJf "$node_tmp/node.tar.xz" -C /opt/keepboard/node --strip-components=1
export PATH=/opt/keepboard/node/bin:$PATH
cd /opt/keepboard/current
npm ci --include=dev --no-audit --no-fund
test -f /etc/keepboard.env || install -m 600 /dev/null /etc/keepboard.env
install -m 644 deploy/keepboard.service /etc/systemd/system/keepboard.service
install -m 644 deploy/keepboard-cert-renew.service /etc/systemd/system/keepboard-cert-renew.service
install -m 644 deploy/keepboard-cert-renew.timer /etc/systemd/system/keepboard-cert-renew.timer
install -m 644 deploy/nginx-http.conf /etc/nginx/sites-available/keepboard
ln -sfn /etc/nginx/sites-available/keepboard /etc/nginx/sites-enabled/keepboard
test ! -L /etc/nginx/sites-enabled/default || unlink /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
snap install --classic certbot
systemctl daemon-reload
echo 'Host files installed. Register DEEPSEEK_API_KEY privately; migrate data before starting the app. No cloud routing switch performed.'
