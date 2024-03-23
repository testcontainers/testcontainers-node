# Supertokens Module

[Supertokens](https://supertokens.com/): Open source alternative to Auth0 / Firebase Auth / AWS Cognito.

## Install

```bash
npm install @testcontainers/supertokens --save-dev
```

## Examples

The following examples communicate with the [API](https://app.swaggerhub.com/apis/supertokens/CDI/4.0.2/) exposed by the SuperTokens Core, which are meant to be consumed by your backend only.

Register a new user using email password:

```javascript
const container = await SupertokensContainer().start()
const response = await fetch(`${container.getConnectionUri()}/recipe/signup`, {
    method: "POST",
    headers: {
    rid: "emailpassword",
    "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
});
const user = (await response.json()).user;
```

Sign in an existing user:

```javascript
const container = await SupertokensContainer().start()
const response = await fetch(`${container.getConnectionUri()}/recipe/signin`, {
    method: "POST",
    headers: {
    rid: "emailpassword",
    "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
});
const user = (await response.json()).user;
```
