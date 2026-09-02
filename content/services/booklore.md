---
name: Booklore
description: Self-hosted ebook library and management server
status: running
category: media
tags: [ebooks, opds, kobo]
server: nimbus-goku
icon: booklore
urls:
  domain: https://booklore.nimbuscloud.au
  tailscale: http://100.103.192.88:3001
  local: http://192.168.0.147:3001
port: 3001
install:
  method: docker
  directory: ~/docker/ebooks
  image: ghcr.io/herraristotle/booklore-app:latest
  container: booklore
  autostart: true
probe:
  enabled: true
  type: http
  target: local
  path: /
  expect_status: "200-399,401,403"
monitors:
  beszel: null
---

## Overview

Booklore is a self-hosted ebook library and management server. It provides a web
interface for browsing, reading, and managing ebooks, with metadata pulled from
Google Books, Goodreads, Amazon, Douban and RanobeDB. Books are served from the
NAS-mounted `/mnt/media/E-Books` directory and are accessible via browser or
directly on Kobo devices via OPDS.

## Access

| Method | URL |
| --- | --- |
| Public (via Caddy) | https://booklore.nimbuscloud.au |
| Local network | http://192.168.0.147:3001 |

## Updating

```bash
cd ~/docker/ebooks
docker compose pull
docker compose up -d
```

## Useful Commands

| Task | Command |
| --- | --- |
| View logs | `docker logs booklore` |
| Restart | `cd ~/docker/ebooks && docker compose restart booklore` |
| Fix image perms | `docker exec booklore chown -R booklore:booklore /app/data/` |
