"""
mediaserver_auth.py — request headers for Jellyfin and Emby.

Newer Jellyfin releases reject the legacy X-Emby-Token header (legacy
authorization disabled) and answer 401 even for a valid key. The
`Authorization: MediaBrowser Token="…"` scheme is understood by Jellyfin
old and new; X-Emby-Token is kept for Emby and older Jellyfin versions.
"""


def auth_headers(api_key: str) -> dict:
    key = str(api_key or "").strip()
    return {
        "Authorization": f'MediaBrowser Token="{key}"',
        "X-Emby-Token":  key,
    }
