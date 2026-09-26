"""
i18n.py — backend side of the UI translation.

Same contract as static/js/i18n.js: the English source string is the key,
a missing translation falls back to English, placeholders use str.format
style names:  tr("{n} movies", n=12).

Only user-facing strings go through tr() (scan step labels, API error
messages shown as toasts, Telegram texts). Log lines stay English.
"""
from app.config import load_config
from app.logger import get_logger

log = get_logger(__name__)

SUPPORTED_UI_LANGUAGES = ("en", "de")
DEFAULT_TMDB_LANGUAGE  = "en-US"

# English → German. Keep keys byte-identical to the tr() call sites.
DE: dict[str, str] = {
    # ---- Scan progress (app/scanner.py: STEPS + _set_step labels/details) ----
    "Loading configuration":    "Einstellungen werden geladen",
    "Scanning Plex library":    "Plex-Bibliothek wird gescannt",
    "Validating TMDB metadata": "TMDB-Metadaten werden geprüft",
    "Analyzing collections":    "Filmreihen werden analysiert",
    "Analyzing directors":      "Regisseure werden analysiert",
    "Building suggestions":     "Vorschläge werden erstellt",
    "Analyzing actors":         "Schauspieler werden analysiert",
    "Building results":         "Ergebnisse werden erstellt",
    "Scanning {n} library":     "{n} Bibliothek wird gescannt",
    "Scanning {n} libraries":   "{n} Bibliotheken werden gescannt",
    "{n} movies":               "{n} Filme",
    "{n} directors":            "{n} Regisseure",
    "{n} library films":        "{n} Filme in der Bibliothek",
    "{n} actors":               "{n} Schauspieler",

    # ---- Scan errors (shown as „Scan failed: …“) ----
    "TMDB_API_KEY missing in config": "TMDB_API_KEY fehlt in den Einstellungen",
    "TMDB API key invalid or unreachable": "TMDB-API-Schlüssel ungültig oder TMDB nicht erreichbar",
    "No libraries enabled — enable at least one library in Config":
        "Keine Bibliothek aktiviert — aktivieren Sie mindestens eine Bibliothek in den Einstellungen",
    "{label} library is missing: {fields} — please complete the library settings in Config.":
        "Bei der Bibliothek {label} fehlt: {fields} — bitte vervollständigen Sie die Bibliothekseinstellungen.",
    "URL":          "URL",
    "API key":      "API-Schlüssel",
    "token":        "Token",
    "library name": "Bibliotheksname",
    "Plex URL is not configured — please fill in the Plex URL in Config.":
        "Keine Plex-URL eingerichtet — bitte tragen Sie die Plex-URL in den Einstellungen ein.",
    "Plex library '{label}' has no URL configured — please fill in the URL in Config.":
        "Für die Plex-Bibliothek „{label}“ ist keine URL eingerichtet — bitte tragen Sie die URL in den Einstellungen ein.",
    "Plex library '{label}' has no token configured — please fill in the Plex token in Config.":
        "Für die Plex-Bibliothek „{label}“ ist kein Token eingerichtet — bitte tragen Sie den Plex-Token in den Einstellungen ein.",
    "Plex library '{name}' not found on {url}": "Plex-Bibliothek „{name}“ auf {url} nicht gefunden",
    "Jellyfin library '{name}' not found": "Jellyfin-Bibliothek „{name}“ nicht gefunden",
    "Emby library '{name}' not found":     "Emby-Bibliothek „{name}“ nicht gefunden",
    "Cannot connect to Jellyfin at {url} — check url in config and that Jellyfin is reachable":
        "Keine Verbindung zu Jellyfin unter {url} — prüfen Sie die URL in den Einstellungen und ob Jellyfin erreichbar ist",
    "Cannot connect to Emby at {url} — check url in config and that Emby is reachable":
        "Keine Verbindung zu Emby unter {url} — prüfen Sie die URL in den Einstellungen und ob Emby erreichbar ist",

    # ---- Setup check (app/config.py config_issues) ----
    "TMDB API key is missing.":          "TMDB-API-Schlüssel fehlt.",
    "Jellyfin URL is missing.":          "Jellyfin-URL fehlt.",
    "Jellyfin API key is missing.":      "Jellyfin-API-Schlüssel fehlt.",
    "Jellyfin library name is missing.": "Name der Jellyfin-Bibliothek fehlt.",
    "Plex URL is missing.":              "Plex-URL fehlt.",
    "Plex token is missing.":            "Plex-Token fehlt.",
    "Plex library name is missing.":     "Name der Plex-Bibliothek fehlt.",
    "{label}: {fields} missing.":        "{label} – fehlt: {fields}.",

    # ---- Scan / results API ----
    "Setup required":              "Einrichtung erforderlich",
    "Scan already in progress":    "Es läuft bereits ein Scan",
    "Could not acquire scan lock": "Scan konnte nicht gestartet werden (Sperre belegt)",
    "TMDB not configured":         "TMDB ist nicht eingerichtet",
    "TMDB API key not configured": "Kein TMDB-API-Schlüssel eingerichtet",
    "Movie not found":             "Film nicht gefunden",

    # ---- Login ----
    "No user configured — set credentials in Config first":
        "Kein Benutzer eingerichtet — legen Sie zuerst Zugangsdaten in den Einstellungen fest",
    "Auth not fully configured (missing secret key)":
        "Anmeldung nicht vollständig eingerichtet (geheimer Schlüssel fehlt)",
    "Invalid username or password": "Benutzername oder Passwort ungültig",

    # ---- API keys ----
    "Maximum of {n} API keys reached": "Höchstzahl von {n} API-Schlüsseln erreicht",
    "Key not found":                   "Schlüssel nicht gefunden",

    # ---- Cache ----
    "No cache file to back up": "Keine Cache-Datei zum Sichern vorhanden",
    "No backup file found":     "Keine Sicherungsdatei gefunden",

    # ---- Settings: save + connection tests ----
    "Cannot write to /config — check folder permissions and PUID/PGID ({e})":
        "Schreiben nach /config nicht möglich — prüfen Sie die Ordnerrechte und PUID/PGID ({e})",
    "URL and API key are required":            "URL und API-Schlüssel sind erforderlich",
    "URL and token are required":              "URL und Token sind erforderlich",
    "URL must start with http:// or https://": "Die URL muss mit http:// oder https:// beginnen",
    "Invalid URL format":                      "Ungültiges URL-Format",
    "Cannot connect to {url}":                 "Keine Verbindung zu {url}",
    "Server error: {e}":                       "Serverfehler: {e}",
    "Invalid API key":                         "Ungültiger API-Schlüssel",
    "Connected successfully":                  "Verbindung erfolgreich",
    "Connected — library '{name}' found":      "Verbunden — Bibliothek „{name}“ gefunden",
    "Library '{name}' not found. Available: {available}":
        "Bibliothek „{name}“ nicht gefunden. Verfügbar: {available}",
    "none":                                    "keine",
    "Could not list libraries: {e}":           "Bibliotheken konnten nicht abgerufen werden: {e}",
    "Cannot reach Plex at {url} — {e}":        "Plex unter {url} nicht erreichbar — {e}",
    "Plex returned HTTP {code}":               "Plex antwortete mit HTTP {code}",
    "Invalid Plex token (401 Unauthorized)":   "Ungültiger Plex-Token (401 Unauthorized)",
    "Could not connect — check URL and credentials":
        "Verbindung fehlgeschlagen — prüfen Sie URL und Zugangsdaten",

    # ---- Integrations (Radarr, Overseerr/Jellyseerr/Seerr, Watchtower) ----
    "URL and API key required":        "URL und API-Schlüssel erforderlich",
    "Invalid Radarr URL":              "Ungültige Radarr-URL",
    "Invalid TMDB ID":                 "Ungültige TMDB-ID",
    "Radarr disabled":                 "Radarr ist deaktiviert",
    "Radarr 4K disabled":              "Radarr 4K ist deaktiviert",
    "Radarr not enabled":              "Radarr ist nicht aktiviert",
    "Radarr not configured":           "Radarr ist nicht eingerichtet",
    "Radarr URL not configured":       "Keine Radarr-URL eingerichtet",
    "Could not reach Radarr":          "Radarr nicht erreichbar",
    "Movie not found in Radarr":       "Film in Radarr nicht gefunden",
    "Overseerr disabled":              "Overseerr ist deaktiviert",
    "Overseerr API key not configured": "Kein Overseerr-API-Schlüssel eingerichtet",
    "Jellyseerr disabled":             "Jellyseerr ist deaktiviert",
    "Jellyseerr API key not configured": "Kein Jellyseerr-API-Schlüssel eingerichtet",
    "Seerr disabled":                  "Seerr ist deaktiviert",
    "Seerr API key not configured":    "Kein Seerr-API-Schlüssel eingerichtet",
    "Watchtower disabled":             "Watchtower ist deaktiviert",
    "Watchtower URL not configured":   "Keine Watchtower-URL eingerichtet",
    "Invalid Watchtower URL scheme":   "Ungültiges Schema der Watchtower-URL",
    "Update request sent — container will restart shortly":
        "Update angefordert — der Container startet in Kürze neu",

    # ---- Letterboxd ----
    "URL is required":                    "URL ist erforderlich",
    "Invalid URL":                        "Ungültige URL",
    "Only Letterboxd URLs are supported": "Nur Letterboxd-URLs werden unterstützt",
    "No movies found — check the URL is a public Letterboxd list or watchlist":
        "Keine Filme gefunden — prüfen Sie, ob die URL auf eine öffentliche Letterboxd-Liste oder -Watchlist zeigt",
    "Maximum 50 Letterboxd URLs allowed": "Höchstens 50 Letterboxd-URLs erlaubt",

    # ---- Overrides ----
    "Unknown kind: {kind}": "Unbekannter Typ: {kind}",

    # ---- Trakt ----
    "Client ID is required":           "Client-ID ist erforderlich",
    "Could not reach Trakt API: {e}":  "Trakt-API nicht erreichbar: {e}",
    "Trakt returned HTTP {code}":      "Trakt antwortete mit HTTP {code}",
    "Missing required fields":         "Pflichtfelder fehlen",

    # ---- Telegram (Markdown — keep the *…* markers) ----
    "🎬 *Cineplete Scan Complete*":   "🎬 *Cineplete-Scan abgeschlossen*",
    "📚 Library: {n} movies":         "📚 Bibliothek: {n} Filme",
    "🎯 Global Score: *{score}%*":    "🎯 Gesamtwertung: *{score}%*",
    "🔴 Franchises missing: {n}":     "🔴 Fehlend in Filmreihen: {n}",
    "🎭 Directors missing: {n}":      "🎭 Fehlend bei Regisseuren: {n}",
    "⭐ Classics missing: {n}":       "⭐ Fehlende Klassiker: {n}",
    "💡 Suggestions: {n}":            "💡 Vorschläge: {n}",
    "⚠️ Metadata issues: {no_guid} no GUID · {no_match} no match":
        "⚠️ Metadaten-Probleme: {no_guid} ohne GUID · {no_match} ohne Treffer",
    "⬇️ *Radarr grabbed:* {title}":   "⬇️ *Radarr hat geladen:* {title}",
    "⬇️ *Radarr grabbed {n} wishlist movies:*": "⬇️ *Radarr hat {n} Filme der Merkliste geladen:*",
}

_DICTS = {"de": DE}


def ui_language(cfg: dict | None = None) -> str:
    """Configured UI language, validated — anything unknown falls back to "en"."""
    try:
        cfg  = cfg or load_config()
        lang = str(cfg.get("SERVER", {}).get("UI_LANGUAGE", "en")).strip().lower()[:2]
    except Exception as e:   # a broken config must never take the page down
        log.warning(f"Could not read UI_LANGUAGE: {e} — using en")
        return "en"
    return lang if lang in SUPPORTED_UI_LANGUAGES else "en"


def tmdb_language(cfg: dict | None = None) -> str:
    """Configured TMDB language (e.g. "de-DE"), default "en-US"."""
    try:
        cfg  = cfg or load_config()
        lang = str(cfg.get("TMDB", {}).get("TMDB_LANGUAGE", "")).strip()
    except Exception as e:
        log.warning(f"Could not read TMDB_LANGUAGE: {e} — using {DEFAULT_TMDB_LANGUAGE}")
        return DEFAULT_TMDB_LANGUAGE
    return lang or DEFAULT_TMDB_LANGUAGE


def tr(text: str, lang: str | None = None, **kwargs) -> str:
    """Translate an English UI string into the configured UI language."""
    lang = lang or ui_language()
    out  = _DICTS.get(lang, {}).get(text, text)
    if kwargs:
        try:
            out = out.format(**kwargs)
        except (KeyError, IndexError, ValueError):
            # A broken translation must not cost the message — use the English original
            out = text.format(**kwargs)
    return out
