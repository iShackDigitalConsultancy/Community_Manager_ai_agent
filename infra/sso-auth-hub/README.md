# RealEstateMeta — Unified Auth Hub (SSO)

This directory contains the infrastructure-as-code required to launch the central Single Sign-On (SSO) Identity Provider (IdP) for all RealEstateMeta and SmartBuilding applications. 
We use **Logto**, an enterprise OIDC provider, to handle unified logins securely without monthly user-scaling constraints.

## Deployment Instructions

### DigitalOcean, AWS EC2, or Linux VPS
1. SSH into your target server.
2. Ensure Docker and Docker-Compose are installed.
3. Securely transfer this `docker-compose.yml` to the server.
4. Replace `REPLACE_WITH_STRONG_PASSWORD` with a cryptographically secure string (do not use quotes).
5. Run the deployment:
   ```bash
   docker-compose up -d
   ```
6. Set up a reverse proxy (Nginx or Caddy) or Cloudflare tunnel to proxy ports 3001 to `auth.realestatemeta.ai` and 3002 to `admin.auth.realestatemeta.ai`.

### Railway Deployment (Alternative to Docker)
If you are deploying to Railway, you do not need this file.
1. Create a New Project -> PostgreSQL Database.
2. Create a New Service -> Public Github Repo -> Enter `logto-io/logto`.
3. Give it the `DB_URL` environment variable mapped to Railway's Postgres.
4. Railway will automatically expose the domain for you.

## Connecting the Applications
Once logging into the Admin console (`admin.auth.realestatemeta.ai`):
1. Create an "API Resource" for your backend to secure it.
2. Ensure the generated Domain String is mapped to `OIDC_ISSUER_URI` and `OIDC_JWKS_URI` in your backend's `.env` files.
3. This seamlessly switches authentication checking to external asymmetric JWKS.
