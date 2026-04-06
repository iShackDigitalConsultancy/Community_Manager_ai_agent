# Universal Single Sign-On (SSO) Integration Guide

This guide describes how to connect various RealEstateMeta / SmartBuilding applications (web, mobile, backend microservices) to our central Logto Identity Hub.

## 1. Authentication Concept
We use an **OIDC (OpenID Connect) / OAuth 2.0** pipeline. 
When users open any platform in our suite:
1. They are redirected to `auth.realestatemeta.ai`.
2. They log in (or enter an OTP).
3. They are redirected back to your application with an Authorization Code.
4. Your application exchanges that code for an `Access Token` (JWT), which proves you are logged in globally.

---

## 2. Integrating a Frontend Application (React / Angular / Next.js)

Your frontend should NEVER store passwords or manage user sessions directly in PostgreSQL. Instead, use an SDK to delegate login.

### React / Next.js Setup
Install the official SDK:
```bash
npm install @logto/react
```

Wrap your application in the provider:
```tsx
import { LogtoProvider, LogtoConfig } from '@logto/react';

const config: LogtoConfig = {
  endpoint: 'https://auth.realestatemeta.ai',
  appId: '<YOUR_APP_ID_FROM_CONSOLE>',
};

export const App = () => (
  <LogtoProvider config={config}>
    <YourAppContent />
  </LogtoProvider>
);
```

To let users log in, hook into the SDK:
```tsx
import { useLogto } from '@logto/react';

const LoginButton = () => {
  const { signIn, isAuthenticated } = useLogto();

  if (isAuthenticated) return <p>You are globally logged in!</p>;
  return <button onClick={() => signIn('http://localhost:3000/callback')}>Login securely</button>;
};
```

---

## 3. Integrating a Backend Microservice / API (Node.js / Express)

For backend APIs (like the Community Manager AI agent), you do not perform redirect flows. Instead, your backend sits behind a wall, validating the `Access Token` attached to incoming HTTP requests by Frontends.

To do this, use `jwks-rsa` alongside standard `jsonwebtoken` libraries to asymmetrically verify the token.

### Standard Express.js Setup
```typescript
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// 1. Initialise the key set from our central hub
const client = jwksClient({
  jwksUri: 'https://auth.realestatemeta.ai/oidc/jwks', // The master key signature
  cache: true
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// 2. Validate incoming requests
export const UniversalAuthMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized SSO Token' });
        
        req.user = decoded; // Contains global user ID and roles
        next();
    });
};
```

---

## 4. Universal Payload / Role Synchronization

In the Logto Admin Console, we configure "Custom JWT Claims". The tokens minted by `auth.realestatemeta.ai` should always export the following payload globally:

```json
{
  "sub": "user_2x4a... (Global User ID)",
  "email": "wayne@ishackventures.com",
  "role": "system_admin",
  "sso_verified": true,
  "assigned_schemes": ["uuid1", "uuid2"],
  "company_id": "company123"
}
```
If a user makes an API call to a completely different server (e.g. `smartbuildingapp.com/api/billing`), the API immediately knows the user is a `system_admin` without ever needing to query a local database.

---

## 5. Machine-to-Machine (M2M) Communication

When the "Clearances Backend" needs to talk to the "Community Manager Backend" natively (without a user clicking a button), it must use **M2M client credentials**.

1. Create a "Machine-to-Machine" app in Logto Console.
2. The Clearances Backend pings the Hub:
```bash
curl --request POST \
  --url https://auth.realestatemeta.ai/oidc/token \
  --header 'content-type: application/x-www-form-urlencoded' \
  --data grant_type=client_credentials \
  --data client_id=YOUR_M2M_ID \
  --data client_secret=YOUR_M2M_SECRET \
  --data resource=urn:api:community-manager 
```
3. Attach the resulting access token to the backend API request.
