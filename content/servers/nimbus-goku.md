---
name: Nimbus Goku
description: Plex / media server
status: active
category: infra
tags: [media, plex]
icon: server
hostname: nimbusgoku
ips:
  internal: 192.168.0.43
  tailscale: 100.103.192.88
ssh:
  port: 22
  user: leighericksen
hardware:
  brand: HP
  model: Desktop
  cpu: i5-4570 @ 3.20GHz
  ram_gb: 8
  storage: 689.4GB total (223.6GB + 465.8GB)
os: Ubuntu 24.04.3 LTS
location: Garage IT Cupboard
purpose: Plex/Media Server
tech_stack: Ubuntu 24.04.3 LTS, NAS mounted at /mnt/media
probe:
  enabled: true
  type: tcp
  host: internal
  port: 22
monitors:
  beszel_system: nimbusgoku
---

## Overview

Primary media server for Nimbus Cloud. Runs Plex plus the *arr stack in Docker,
managed via Portainer. NAS mounted at `/mnt/media`.

## Tech Stack

- Ubuntu 24.04.3 LTS
- Docker + Portainer agent
- Watchtower for image updates
- Restic backups to Namek
