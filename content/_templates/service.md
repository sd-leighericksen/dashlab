---
name: New Service
description: One-line summary
status: running
category: media
tags: []
server: 
urls:
  local: http://192.168.0.10:8080
port: 8080
# card_url: single URL opened in kid-friendly Card mode (falls back to preferred address)
install:
  method: docker
probe:
  enabled: true
  type: http
  target: local
  path: /
---

## Overview

What is it, why it runs, how it is deployed.
