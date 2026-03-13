import json
import os
import sys
import time
import webbrowser
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlencode, urlparse, parse_qs
from urllib.request import Request, urlopen

ROOT = Path.home() / '.openclaw'
CREDENTIALS = ROOT / 'credentials' / 'oauth.json'
TOKENS = ROOT / 'credentials' / 'google-workspace-token.json'

SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar',
]


def load_client_config():
    if not CREDENTIALS.exists():
        raise SystemExit(f'Missing credentials file: {CREDENTIALS}')
    data = json.loads(CREDENTIALS.read_text(encoding='utf-8'))
    cfg = data.get('installed') or data.get('web')
    if not cfg:
        raise SystemExit('oauth.json does not contain an installed/web client config')
    return cfg


class CallbackHandler(BaseHTTPRequestHandler):
    code = None
    error = None

    def log_message(self, format, *args):
        return

    def do_GET(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        CallbackHandler.code = qs.get('code', [None])[0]
        CallbackHandler.error = qs.get('error', [None])[0]
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        if CallbackHandler.code:
            self.wfile.write(b'<html><body><h2>Google authorization received.</h2><p>You can close this window and return to PowerShell.</p></body></html>')
        else:
            self.wfile.write(b'<html><body><h2>Authorization failed or was cancelled.</h2><p>You can close this window and return to PowerShell.</p></body></html>')


def exchange_code(token_uri, client_id, client_secret, redirect_uri, code):
    payload = urlencode({
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code',
    }).encode('utf-8')
    req = Request(token_uri, data=payload, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))


def main():
    cfg = load_client_config()
    redirect_uri = (cfg.get('redirect_uris') or ['http://localhost'])[0]
    parsed = urlparse(redirect_uri)
    if parsed.scheme != 'http' or parsed.hostname not in ('localhost', '127.0.0.1'):
        raise SystemExit(f'Unsupported redirect URI for this helper: {redirect_uri}')

    port = parsed.port or 80
    state = str(int(time.time()))
    auth_url = cfg['auth_uri'] + '?' + urlencode({
        'client_id': cfg['client_id'],
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'access_type': 'offline',
        'prompt': 'consent',
        'scope': ' '.join(SCOPES),
        'state': state,
    })

    server = HTTPServer((parsed.hostname, port), CallbackHandler)
    print('Open this URL in a browser logged into askgenesisone@gmail.com:')
    print(auth_url)
    print('\nTrying to open the browser automatically...')
    webbrowser.open(auth_url)
    print(f'\nWaiting for Google callback on {redirect_uri} ...')
    while CallbackHandler.code is None and CallbackHandler.error is None:
        server.handle_request()

    if CallbackHandler.error:
        raise SystemExit(f'Google returned an error: {CallbackHandler.error}')

    tokens = exchange_code(
        cfg['token_uri'],
        cfg['client_id'],
        cfg['client_secret'],
        redirect_uri,
        CallbackHandler.code,
    )

    expires_at = None
    if 'expires_in' in tokens:
        expires_at = (datetime.now(timezone.utc) + timedelta(seconds=int(tokens['expires_in']))).isoformat()

    out = {
        'provider': 'google-workspace',
        'email': 'askgenesisone@gmail.com',
        'scopes': SCOPES,
        'client_id': cfg['client_id'],
        'token_uri': cfg['token_uri'],
        'redirect_uri': redirect_uri,
        'access_token': tokens.get('access_token'),
        'refresh_token': tokens.get('refresh_token'),
        'id_token': tokens.get('id_token'),
        'token_type': tokens.get('token_type'),
        'expires_at': expires_at,
        'raw': tokens,
    }
    TOKENS.parent.mkdir(parents=True, exist_ok=True)
    TOKENS.write_text(json.dumps(out, indent=2), encoding='utf-8')
    print(f'\nSaved token bundle to: {TOKENS}')
    print('Next step: tell Jarvis "verify google access".')


if __name__ == '__main__':
    try:
        main()
    except OSError as e:
        print(f'Local callback server failed: {e}')
        sys.exit(1)
