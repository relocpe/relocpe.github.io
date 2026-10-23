#!/usr/bin/env bash
# Usage: ./set-base-url.sh https://example.com/   (trailing slash added if missing)
# Rewrites canonical / og:url / og:image / twitter:image in index.html.
set -euo pipefail
new="${1:?usage: $0 https://domain/}"; [[ "$new" == */ ]] || new="$new/"
cd "$(dirname "$0")"
old=$(sed -n 's/.*<link rel="canonical" href="\([^"]*\)".*/\1/p' index.html)
[ -n "$old" ] || { echo "canonical not found" >&2; exit 1; }
python3 - "$old" "$new" <<'PY'
import sys; o,n=sys.argv[1],sys.argv[2]
s=open('index.html',encoding='utf-8').read(); open('index.html','w',encoding='utf-8').write(s.replace(o,n))
PY
echo "base url: $old -> $new"
