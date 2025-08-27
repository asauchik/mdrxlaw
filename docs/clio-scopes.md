# CLIO OAuth Scopes Configuration

The CLIO authorization URL now supports overriding requested scopes via the `CLIO_SCOPES` environment variable.

Default scopes used (space separated):
```
profile.read contacts.read matters.read documents.read activities.read calendar_entries.read communications.read custom_fields.read offline_access
```

Key notes:
- Include `offline_access` to obtain a `refresh_token` (required for silent refresh before the access token expires).
- 401 / 403 responses after apparently successful token exchange usually mean:
  * One or more scopes are invalid (CLIO rejects the token at resource endpoint)
  * Consent was revoked
  * Refresh token was never issued (missing `offline_access` scope)
  * Using legacy colon formatted scopes (`read:contacts`) instead of dot format (`contacts.read`).
- You can set a custom scope list in `.env.local`:
```
CLIO_SCOPES="profile.read contacts.read offline_access"
```

After changing scopes you must have the user re-authorize.

If tokens keep getting rejected:
1. Confirm the app's redirect URI exactly matches `CLIO_REDIRECT_URI`.
2. Inspect the raw token response (logged in callback) to verify `refresh_token` is present.
3. Use the status endpoint logs to see retry/refresh attempts.
4. Remove old consent in CLIO UI and re-connect.
