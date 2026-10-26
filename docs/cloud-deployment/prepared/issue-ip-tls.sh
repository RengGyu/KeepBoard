#!/bin/sh
# Future new cloud host. Stage and production issuance are separate explicit steps.
set -eu
test "$(id -u)" = 0
mode=${1:-}
case "$mode" in staging|production) ;; *) echo 'Choose staging or production after cloud/TLS approval';exit 2;; esac
: "${STATIC_IP:?attached Lightsail IPv4 required}"
python3 -c 'import ipaddress,os; a=ipaddress.ip_address(os.environ["STATIC_IP"]); assert a.version==4 and a.is_global'
version=$(/snap/bin/certbot --version)
CERTBOT_VERSION="$version" python3 -c 'import os,re; v=tuple(map(int,re.search(r"(\d+)\.(\d+)",os.environ["CERTBOT_VERSION"]).groups())); assert v >= (5,4)'
if test "$mode" = staging;then
 /snap/bin/certbot certonly --staging --config-dir /var/lib/keepboard-acme-staging --work-dir /var/lib/keepboard-acme-work --logs-dir /var/log/keepboard-acme-staging --preferred-profile shortlived --webroot --webroot-path /var/www/keepboard-acme --ip-address "$STATIC_IP" --cert-name "$STATIC_IP" --agree-tos --non-interactive --register-unsafely-without-email
 echo 'Staging issuance only: NOT trusted, NOT used by nginx, NO routing switch'
else
 /snap/bin/certbot certonly --preferred-profile shortlived --webroot --webroot-path /var/www/keepboard-acme --ip-address "$STATIC_IP" --cert-name "$STATIC_IP" --agree-tos --non-interactive --register-unsafely-without-email
 sed "s/__STATIC_IP__/$STATIC_IP/g" /opt/keepboard/current/deploy/nginx-https.conf.template > /etc/nginx/sites-available/keepboard
 nginx -t
 systemctl reload nginx
 systemctl enable --now keepboard-cert-renew.timer
 curl --fail --silent --show-error "https://$STATIC_IP/api/health"
 echo 'Trusted IP HTTPS check passed. Vercel and existing Mac services still unchanged.'
fi
