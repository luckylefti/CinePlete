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


class TestCollectionsAreNotMovies(unittest.TestCase):
    """Jellyfin collections (BoxSet, TMDB collection ID) must not land in the movie list."""

    def test_boxset_and_folder_skipped(self):
        from app import jellyfin_api
        items = [
            {"Name": "Kevin – Allein zu Haus", "Type": "Movie", "IsFolder": False,
             "ProviderIds": {"Tmdb": "771"}, "RunTimeTicks": 6_000_000_000 * 10},
            {"Name": "Allein zu Haus Filmreihe", "Type": "BoxSet", "IsFolder": True,
             "ProviderIds": {"Tmdb": "9888"}},
            {"Name": "Ordner", "Type": "Folder", "IsFolder": True, "ProviderIds": {"Tmdb": "1"}},
        ]

        def fake(path, lc=None, params=None, timeout=120):
            if path == "/Library/MediaFolders":
                return {"Items": [{"Name": "Filme", "Id": "lib1"}]}
            self.assertEqual(params.get("ExcludeItemTypes"), "BoxSet")
            return {"Items": items if params["StartIndex"] == 0 else [], "TotalRecordCount": len(items)}

        with patch.object(jellyfin_api, "_jf_get", side_effect=fake):
            media_ids, *_ = jellyfin_api.scan_movies({"url": "http://jf", "api_key": "k", "library_name": "Filme"})
        self.assertEqual(media_ids, {771: "Kevin – Allein zu Haus"})
