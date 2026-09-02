---
name: New Server
description: One-line summary
status: active
category: infra
hostname: hostname
ips:
  internal: 192.168.0.10
ssh:
  port: 22
os: Ubuntu 24.04 LTS
probe:
  enabled: true
  type: tcp
  host: internal
  port: 22
---

## Overview

What the machine does and what runs on it.
