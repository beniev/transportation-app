# Project: Transportation App (Tovil)

## Railway Deployment

### SSL Issue
Railway CLI has SSL certificate issues due to Netspark/Norton SSL interception (MITM).
The CLI uses Rust's `rustls` which rejects the intercepted certificates as `UnknownIssuer`.
**Workaround**: Use `curl -k` with direct GraphQL API calls.

### Railway API Token
```
Token: a3204df8-e4c8-4c6e-8f25-38752aec8443
Name: API Token2
Scope: beniev's Projects
```

### Project Details
```
Project ID: a992071b-8549-4ab3-9619-5215fe82d2c2
Project Name: transportation-app
Environment: production (ID: e9b4e900-e2d4-42e9-995d-a8fd727dcd36)

Services:
  - backend:    80323feb-36ea-4455-9fb7-ca71bb3df055  (api.tovil.app)
  - frontend:   af29a599-1ad0-431b-afd6-0fad6e4bbdb7  (www.tovil.app)
  - PostgreSQL: 94240b3e-e13f-4f36-87df-06c420be76f9
```

### Deploy Commands

**Deploy both services with specific commit:**
```bash
COMMIT=$(git rev-parse HEAD)

# Frontend
curl -k -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a3204df8-e4c8-4c6e-8f25-38752aec8443" \
  -d "{\"query\":\"mutation { serviceInstanceDeploy(serviceId: \\\"af29a599-1ad0-431b-afd6-0fad6e4bbdb7\\\", environmentId: \\\"e9b4e900-e2d4-42e9-995d-a8fd727dcd36\\\", commitSha: \\\"$COMMIT\\\") }\"}"

# Backend
curl -k -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a3204df8-e4c8-4c6e-8f25-38752aec8443" \
  -d "{\"query\":\"mutation { serviceInstanceDeploy(serviceId: \\\"80323feb-36ea-4455-9fb7-ca71bb3df055\\\", environmentId: \\\"e9b4e900-e2d4-42e9-995d-a8fd727dcd36\\\", commitSha: \\\"$COMMIT\\\") }\"}"
```

**Check deployment status:**
```bash
curl -k -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a3204df8-e4c8-4c6e-8f25-38752aec8443" \
  -d '{"query":"{ project(id: \"a992071b-8549-4ab3-9619-5215fe82d2c2\") { services { edges { node { name deployments(first: 1) { edges { node { id status createdAt } } } } } } } }"}'
```

### Important Notes
- Always specify `commitSha` — without it, Railway may deploy an old cached commit
- Frontend build uses TypeScript strict mode — unused variables cause build failures (TS6133)
- Backend Dockerfile is at `/backend/Dockerfile`, frontend at `/frontend/Dockerfile`
- After deploy, user may need `Ctrl+Shift+R` to clear browser cache

## Git
- Remote: https://github.com/beniev/transportation-app.git
- Branch: main
- Git SSL verification is disabled due to Netspark (git config http.sslVerify false)

## Tech Stack
- Backend: Django 5.0 + DRF, Python 3.12
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- DB: PostgreSQL 16
- AI: Google Gemini 2.5 Pro (item parsing, price analysis)
- i18n: Hebrew (RTL) + English

## API Pagination
DRF uses PageNumberPagination globally (PAGE_SIZE=20).
Frontend must unwrap: `response.data.results ?? response.data`
