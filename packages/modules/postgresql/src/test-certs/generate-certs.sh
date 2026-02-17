#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CA_CERT="${SCRIPT_DIR}/ca.crt"
SERVER_CERT="${SCRIPT_DIR}/server.crt"
SERVER_KEY="${SCRIPT_DIR}/server.key"

DAYS="${1:-36500}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

cat > "${TMP_DIR}/server.ext" <<EOF
subjectAltName=DNS:localhost,IP:127.0.0.1
extendedKeyUsage=serverAuth
EOF

openssl req \
  -x509 \
  -newkey rsa:2048 \
  -nodes \
  -keyout "${TMP_DIR}/ca.key" \
  -out "${CA_CERT}" \
  -days "${DAYS}" \
  -subj "/CN=testcontainers-postgres-ca"

openssl req \
  -newkey rsa:2048 \
  -nodes \
  -keyout "${SERVER_KEY}" \
  -out "${TMP_DIR}/server.csr" \
  -subj "/CN=localhost"

openssl x509 \
  -req \
  -in "${TMP_DIR}/server.csr" \
  -CA "${CA_CERT}" \
  -CAkey "${TMP_DIR}/ca.key" \
  -CAcreateserial \
  -CAserial "${TMP_DIR}/ca.srl" \
  -out "${SERVER_CERT}" \
  -days "${DAYS}" \
  -sha256 \
  -extfile "${TMP_DIR}/server.ext"

chmod 600 "${SERVER_KEY}"

echo "Generated:"
echo "  ${CA_CERT}"
echo "  ${SERVER_CERT}"
echo "  ${SERVER_KEY}"
