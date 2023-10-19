[![Maintainability](https://api.codeclimate.com/v1/badges/1c3d4f9f17d9514df0ec/maintainability)](https://codeclimate.com/github/qlaffont/solidstart-protected-auth/maintainability) [![Test Coverage](https://api.codeclimate.com/v1/badges/1c3d4f9f17d9514df0ec/test_coverage)](https://codeclimate.com/github/qlaffont/solidstart-protected-auth/test_coverage) ![npm](https://img.shields.io/npm/v/solidstart-protected-auth) ![npm](https://img.shields.io/npm/dm/solidstart-protected-auth) ![Snyk Vulnerabilities for npm package](https://img.shields.io/snyk/vulnerabilities/npm/solidstart-protected-auth) ![NPM](https://img.shields.io/npm/l/solidstart-protected-auth)

# SolidStart Protected Auth

Add protected routes to SolidStart.

## Usage

See example folder


## API

### SolidStartAuthProtectedLogin

**Options**

| Field Name      | Type                             | Description                                                         |
| --------------- | -------------------------------- | ------------------------------------------------------------------- |
| callback        | VoidFunction / AsyncVoidFunction | Specify a callback after login (generally redirect to oauth portal) |
| authCallbackURL | string                           | Specify auth callback url in case of accessToken already exist      |

Return: React Component

### SolidStartAuthProtectedLogout

**Options**

| Field Name  | Type                             | Description                                                                       |
| ----------- | -------------------------------- | --------------------------------------------------------------------------------- |
| preCallback | VoidFunction / AsyncVoidFunction | Specify a callback before logout (generally send to api that user want to logout) |
| callback    | VoidFunction / AsyncVoidFunction | Specify a callback after logout (generally redirect to home)                      |

Return: React Component

### SolidStartAuthProtectedCallback

**Options**

| Field Name | Type                             | Description                                                                     |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------- |
| callback   | VoidFunction / AsyncVoidFunction | Specify a callback after auth callback (generally redirect to protected routes) |


Return: React Component

### useSolidStartAuthProtectedHandler

**Options**

| Field Name      | Type                                | Description                                                              |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| publicURLs      | string[]                            | List of public URLs                                                      |
| loginURL        | string                              | Endpoint for login (ex: /auth/login)                                     |
| authCallbackURL | string                              | Endpoint for auth callback (ex: /auth)                                   |
| renewTokenFct   | (oldAccessToken?: string) => string | Function who will run to renew token (ex: refresh token)                 |
| verifyTokenFct  | (accessToken?: string) => string    | Function who test accessToken validity (ex: verify JWT token expiration) |
| allowNotFound   | boolean?                            | Allow to consult Not found pages in public                               |

Return: Hook who need to be use to pages/_app.tsx

### useSolidStartAuthProtected

Return: {isConnected: boolean; setIsConnected: Dispatch<boolean>} // User is connected

### getAndSaveAccessToken

**Options**

| Field Name    | Type                                                   | Description                                                  |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| renewTokenFct | (oldAccessToken?: string) => string OR Promise<string> | Function who will run to renew token (ex: refresh token)  to |
| accessToken   | string                                                 | access token to save                                         |

Return: boolean (Token is saved)

### getAccessToken

Return: string  (Return access token)

### removeAccessToken

Return: void

## Maintain

This package use [TSdx](https://github.com/jaredpalmer/tsdx). Please check documentation to update this package.
