"""
Unit tests for the German translation:
  app/i18n.py        — tr(), ui_language(), tmdb_language()
  app/tmdb.py        — language parameter, cache-key stability, overview fallback
  app/routers/auth.py — <html lang> injection
  static/js/*        — every t("…") key has a German entry (i18n.de.js)
  app/**             — every tr("…") key has a German entry (app/i18n.py DE)
"""
import json
import os
import re
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import i18n
from app.i18n import tr, ui_language, tmdb_language
from app.tmdb import TMDB

ROOT = Path(__file__).resolve().parent.parent
PH   = re.compile(r"\{(\w+)\}")


def _tmdb(language):
    with patch("app.tmdb.load_cache", return_value={}):
        return TMDB("KEY", language=language)


class TestTr(unittest.TestCase):

    def test_english_is_passthrough(self):
        self.assertEqual(tr("Some unknown text", lang="en"), "Some unknown text")

    def test_missing_german_entry_falls_back_to_english(self):
        self.assertEqual(tr("Never translated xyz", lang="de"), "Never translated xyz")

    def test_placeholders_are_filled(self):
        with patch.dict(i18n.DE, {"{n} movies": "{n} Filme"}):
            self.assertEqual(tr("{n} movies", lang="de", n=3), "3 Filme")
            self.assertEqual(tr("{n} movies", lang="en", n=3), "3 movies")

    def test_broken_translation_falls_back_instead_of_raising(self):
        with patch.dict(i18n.DE, {"{n} movies": "{anzahl} Filme"}):
            self.assertEqual(tr("{n} movies", lang="de", n=3), "3 movies")


class TestLanguageSettings(unittest.TestCase):

    def test_ui_language_default_is_english(self):
        self.assertEqual(ui_language({"SERVER": {}}), "en")

    def test_ui_language_german(self):
        self.assertEqual(ui_language({"SERVER": {"UI_LANGUAGE": "de"}}), "de")
        self.assertEqual(ui_language({"SERVER": {"UI_LANGUAGE": "DE-de"}}), "de")

    def test_unknown_ui_language_falls_back(self):
        # must never reach <html lang="…"> unvalidated
        self.assertEqual(ui_language({"SERVER": {"UI_LANGUAGE": "\"><script>"}}), "en")

    def test_broken_config_falls_back(self):
        with patch("app.i18n.load_config", side_effect=OSError("boom")):
            self.assertEqual(ui_language(), "en")
            self.assertEqual(tmdb_language(), "en-US")

    def test_tmdb_language(self):
        self.assertEqual(tmdb_language({"TMDB": {}}), "en-US")
        self.assertEqual(tmdb_language({"TMDB": {"TMDB_LANGUAGE": "de-DE"}}), "de-DE")
        self.assertEqual(tmdb_language({"TMDB": {"TMDB_LANGUAGE": "  "}}), "en-US")


class TestTmdbLanguage(unittest.TestCase):

    URL = "https://api.themoviedb.org/3/movie/603?api_key=KEY"

    def test_default_language_keeps_url_and_cache_key(self):
        # existing tmdb_cache.json entries stay valid for English users
        t = _tmdb("en-US")
        self.assertEqual(t._localize(self.URL), self.URL)

    def test_german_appends_language(self):
        t = _tmdb("de-DE")
        self.assertEqual(t._localize(self.URL), self.URL + "&language=de-DE")
        self.assertEqual(t._cache_key(t._localize(self.URL)),
                         "https://api.themoviedb.org/3/movie/603?language=de-DE")

    def test_explicit_language_is_not_overridden(self):
        t   = _tmdb("de-DE")
        url = self.URL + "&language=fr-FR"
        self.assertEqual(t._localize(url), url)

    def test_non_tmdb_url_untouched(self):
        t = _tmdb("de-DE")
        self.assertEqual(t._localize("https://example.org/x?a=1"), "https://example.org/x?a=1")

    def test_get_requests_localized_url(self):
        t = _tmdb("de-DE")
        with patch.object(t, "_request", return_value={"title": "Matrix"}) as req:
            t.get(self.URL)
        req.assert_called_once_with(self.URL + "&language=de-DE")

    def test_empty_german_overview_falls_back_to_english(self):
        t = _tmdb("de-DE")

        def fake(url):
            if "language=de-DE" in url:
                return {"title": "Matrix", "overview": ""}
            return {"title": "The Matrix", "overview": "A hacker learns…"}

        with patch.object(t, "_request", side_effect=fake):
            md = t.movie(603)
        self.assertEqual(md["title"], "Matrix")            # German title kept
        self.assertEqual(md["overview"], "A hacker learns…")

    def test_german_overview_is_kept(self):
        t = _tmdb("de-DE")
        with patch.object(t, "_request",
                          return_value={"title": "Matrix", "overview": "Ein Hacker …"}) as req:
            md = t.movie(603)
        self.assertEqual(md["overview"], "Ein Hacker …")
        self.assertEqual(req.call_count, 1)                # no extra English request


class TestHtmlLangInjection(unittest.TestCase):

    def test_placeholders_replaced(self):
        from app.routers import auth
        with patch("app.routers.auth.ui_language", return_value="de"):
            html = auth._inject('<html lang="__LANG__"><script src="a.js?v=__VERSION__">')
        self.assertIn('<html lang="de">', html)
        self.assertNotIn("__VERSION__", html)

    def test_shipped_pages_carry_the_placeholder(self):
        for page in ("index.html", "login.html"):
            src = (ROOT / "static" / page).read_text(encoding="utf-8")
            self.assertIn('<html lang="__LANG__">', src, page)
            self.assertIn("/static/js/i18n.js", src, page)
            self.assertIn("/static/js/i18n.de.js", src, page)


# ---------------------------------------------------------------------------
# Dictionary coverage — an untranslated key would silently stay English
# ---------------------------------------------------------------------------

_JS_STR = r'"((?:[^"\\]|\\.)*)"'
_T_RE   = re.compile(r'(?<![\w.$])t\(\s*' + _JS_STR)
_TN_RE  = re.compile(r'(?<![\w.$])tn\([^,()]*(?:\([^()]*\))?[^,()]*,\s*' + _JS_STR + r'\s*,\s*' + _JS_STR)
_PY_RE  = re.compile(r'(?<![\w.])tr\(\s*(?:f?)("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')')


def _german_js_dict() -> dict:
    src = (ROOT / "static" / "js" / "i18n.de.js").read_text(encoding="utf-8")
    body = src[src.index("{"): src.rindex("}") + 1]
    return json.loads(body)


class TestFrontendCoverage(unittest.TestCase):

    def test_every_t_key_has_a_german_entry(self):
        de   = _german_js_dict()
        used = set()
        # i18n.js / i18n.de.js only mention t("…") in their doc comments
        files = [f for f in (ROOT / "static" / "js").glob("*.js") if not f.name.startswith("i18n")]
        files.append(ROOT / "static" / "login.html")
        for f in files:
            src = f.read_text(encoding="utf-8")
            for m in _T_RE.finditer(src):
                used.add(json.loads('"' + m.group(1) + '"'))
            for m in _TN_RE.finditer(src):
                used.add(json.loads('"' + m.group(1) + '"'))
                used.add(json.loads('"' + m.group(2) + '"'))
        missing = sorted(used - de.keys())
        self.assertEqual(missing, [], f"{len(missing)} t()-keys without German entry")

    def test_placeholders_match(self):
        bad = {k: v for k, v in _german_js_dict().items()
               if set(PH.findall(k)) != set(PH.findall(v))}
        self.assertEqual(bad, {})

    def test_no_double_quotes_in_german(self):
        # German text lands inside HTML attributes (title="…")
        bad = [v for v in _german_js_dict().values() if '"' in v]
        self.assertEqual(bad, [])


class TestBackendCoverage(unittest.TestCase):

    def test_every_tr_key_has_a_german_entry(self):
        import ast
        used = set()
        for f in (ROOT / "app").rglob("*.py"):
            for m in _PY_RE.finditer(f.read_text(encoding="utf-8")):
                used.add(ast.literal_eval(m.group(1)))
        missing = sorted(used - i18n.DE.keys())
        self.assertEqual(missing, [], f"{len(missing)} tr()-keys without German entry")

    def test_placeholders_match(self):
        bad = {k: v for k, v in i18n.DE.items()
               if set(PH.findall(k)) != set(PH.findall(v))}
        self.assertEqual(bad, {})


if __name__ == "__main__":
    unittest.main()
