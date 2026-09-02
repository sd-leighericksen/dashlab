---
name: TestBoi
description: One-line summary
status: running
category: media
tags: []
server: 
urls:
  local: http://192.168.0.10:8080
port: 8080
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
