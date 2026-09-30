# ESRA Promo Site

Promotional landing page for [ESRA](https://github.com/rrpauls/esra) and
[ESRA Agents](https://github.com/rrpauls/esra-agents).

**Live site:** [esra-agents.rrpauls.chatgpt.site](https://esra-agents.rrpauls.chatgpt.site)

## Local preview

The website is a dependency-free static build in `dist/`. Serve that directory
with any local HTTP server, then open the printed local URL.

For example, on macOS:

```sh
ruby -run -e httpd dist -p 4173
```

## Structure

- `dist/index.html` — the complete responsive landing page.
- `.openai/hosting.json` — Sites hosting configuration.

The site presents ESRA 1.2, the specification/implementation boundary, the
bounded eight-stage improvement cycle, and current evidence-gated maturity
claims.
