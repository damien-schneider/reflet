export const DISCOVERY_LINKS = [
  '</.well-known/agent-card.json>; rel="service-desc"; type="application/json"',
  '</api/mcp/server-card>; rel="service-desc"; type="application/mcp-server-card+json"',
  '</llms.txt>; rel="alternate"; type="text/markdown"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  '</.well-known/agent-skills/index.json>; rel="agent-skills"; type="application/json"',
  '</.well-known/ard.json>; rel="ard"; type="application/json"',
  '</auth.md>; rel="service-doc"; type="text/markdown"',
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
].join(", ");
