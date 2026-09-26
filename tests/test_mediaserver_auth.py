"""Jellyfin/Emby requests carry the modern Authorization header (plus legacy X-Emby-Token)."""
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.mediaserver_auth import auth_headers


class TestAuthHeaders(unittest.TestCase):

    def test_both_schemes(self):
        h = auth_headers("abc123")
        self.assertEqual(h["Authorization"], 'MediaBrowser Token="abc123"')
        self.assertEqual(h["X-Emby-Token"], "abc123")

    def test_key_is_trimmed(self):
        self.assertEqual(auth_headers("  abc \n")["Authorization"], 'MediaBrowser Token="abc"')

    def test_jellyfin_client_sends_authorization(self):
        from app import jellyfin_api
        resp = MagicMock(status_code=200)
        resp.json.return_value = {"Items": []}
        with patch.object(jellyfin_api.requests, "get", return_value=resp) as get:
            jellyfin_api._jf_get("/Library/MediaFolders", {"url": "http://jf:8096", "api_key": "k"})
        self.assertEqual(get.call_args.kwargs["headers"]["Authorization"], 'MediaBrowser Token="k"')


if __name__ == "__main__":
    unittest.main()
