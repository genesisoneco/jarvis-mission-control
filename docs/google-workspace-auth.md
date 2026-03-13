# Google Workspace auth helper

This helper authorizes the local Google OAuth client in `C:\Users\Richard Yoon\.openclaw\credentials\oauth.json` for:

- Gmail modify/send
- Drive read/write
- Sheets read/write
- Calendar read/write

## Run

```powershell
python C:\Users\Richard Yoon\.openclaw\workspace-operator\scripts\google_oauth_setup.py
```

## What it does

- opens the Google consent URL
- waits for the callback on the redirect URI from `oauth.json`
- exchanges the code for tokens
- saves the token bundle to:

```text
C:\Users\Richard Yoon\.openclaw\credentials\google-workspace-token.json
```

## Important

Use the browser session for `askgenesisone@gmail.com` when approving access.

After it completes, ask Jarvis to verify access.
