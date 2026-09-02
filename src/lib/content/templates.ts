// AUTO-GENERATED from content/_templates/*.md
export const TEMPLATES: Record<string,string> = {
  "service": "---\nname: New Service\ndescription: One-line summary\nstatus: running\ncategory: media\ntags: []\nserver: \nurls:\n  local: http://192.168.0.10:8080\nport: 8080\n# card_url: single URL opened in kid-friendly Card mode (falls back to preferred address)\ninstall:\n  method: docker\nprobe:\n  enabled: true\n  type: http\n  target: local\n  path: /\n---\n\n## Overview\n\nWhat is it, why it runs, how it is deployed.\n",
  "server": "---\nname: New Server\ndescription: One-line summary\nstatus: active\ncategory: infra\nhostname: hostname\nips:\n  internal: 192.168.0.10\nssh:\n  port: 22\nos: Ubuntu 24.04 LTS\nprobe:\n  enabled: true\n  type: tcp\n  host: internal\n  port: 22\n---\n\n## Overview\n\nWhat the machine does and what runs on it.\n",
  "external": "---\nname: New External Service\ndescription: One-line summary\ntype: saas\nprovider: \nstatus: active\ncategory: external\nurl: https://example.com\nbilling:\n  monthly_cost: 0\n  currency: AUD\n  cycle: monthly\n---\n\n## Overview\n\nWhat it is and why we pay for it.\n"
};
