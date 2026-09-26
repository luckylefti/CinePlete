/* ============================================================
   config.js — Config tab renderer, save, cache management
============================================================ */

// Returns the HTML for a quality profile select + Fetch button
function qualityProfileField(id, currentId, instance) {
  return `
  <div class="form-group">
    <label class="form-label">${t("Quality Profile")}</label>
    <div style="display:flex;gap:.5rem;align-items:center">
      <select id="${id}"
        style="flex:1;background:var(--bg3);border:1px solid var(--border2);
               border-radius:8px;color:var(--text);font-family:'DM Mono',monospace;
               font-size:.82rem;padding:.45rem .6rem;outline:none">
        <option value="${currentId||0}">${currentId ? t("⚠ ID {id} — click Fetch to verify", {id: currentId}) : t("— click Fetch to load profiles —")}</option>
      </select>
      <button type="button" class="btn-sm" style="white-space:nowrap;font-size:.72rem;padding:5px 12px"
        onclick="fetchRadarrProfiles('${instance}','${id}')">${t("⟳ Fetch")}</button>
    </div>
  </div>`
}

async function fetchRadarrProfiles(instance, selectId) {
  const btn = event.target
  btn.disabled = true; btn.textContent = "…"
  try {
    const res = await api(`/api/radarr/profiles?instance=${instance}`)
    if (!res.ok) {
      toast(t("Could not fetch profiles: {error}", {error: res.error}), "error")
      return
    }
    const sel = document.getElementById(selectId)
    if (!sel) return
    const current = parseInt(sel.value) || 0
    sel.innerHTML = res.profiles.map(p =>
      `<option value="${p.id}" ${p.id === current ? "selected" : ""}>${p.name} (${p.id})</option>`
    ).join("")
    toast(t("Quality profiles loaded"), "success")
  } catch(e) {
    toast(t("Failed to fetch profiles: {error}", {error: e?.message||t("network error")}), "error")
  } finally {
    btn.disabled = false; btn.textContent = t("⟳ Fetch")
  }
}

function _ageStr(s){
  if (s < 3600)  return t("{n}m ago", {n: Math.floor(s/60)})
  if (s < 86400) return t("{n}h ago", {n: Math.floor(s/3600)})
  return t("{n}d ago", {n: Math.floor(s/86400)})
}

async function loadCacheInfo(){
  try {
    const [info, bkp] = await Promise.all([
      api("/api/cache/info"),
      api("/api/cache/backup/info"),
    ])
    const el = document.getElementById("cache-info")
    if (!el) return
    let html = ""
    if (!info.exists){
      html += `<div>${t("No cache yet — will be created on first scan.")}</div>`
    } else {
      html += `<div>${t("Cache:")} <span style="color:var(--text)">${info.size_mb} MB</span> · ${t("updated")} <span style="color:var(--text)">${_ageStr(info.age_seconds)}</span></div>`
    }
    if (bkp.exists){
      html += `<div style="margin-top:.3rem">${t("Backup:")} <span style="color:var(--text)">${bkp.size_mb} MB</span> · ${t("saved")} <span style="color:var(--text)">${_ageStr(bkp.age_seconds)}</span></div>`
    } else {
      html += `<div style="margin-top:.3rem;color:var(--text3)">${t("No backup yet")}</div>`
    }
    el.innerHTML = html
  } catch(e) {}
}

async function backupCache(){
  const res = await api("/api/cache/backup","POST",{})
  if (res.ok){ toast(t("Cache backed up ({size} MB)", {size: res.size_mb}),"success"); loadCacheInfo() }
  else toast(t("Backup failed: {error}", {error: res.error}),"error")
}

async function restoreCache(){
  if (!confirm(t("Restore cache from backup? Current cache will be overwritten."))) return
  const res = await api("/api/cache/restore","POST",{})
  if (res.ok){ toast(t("Cache restored ({size} MB)", {size: res.size_mb}),"success"); loadCacheInfo() }
  else toast(t("Restore failed: {error}", {error: res.error}),"error")
}

async function clearCache(){
  if (!confirm(t("Clear the TMDB cache? The next scan will re-fetch all data from TMDB."))) return
  const res = await api("/api/cache/clear","POST",{})
  if (res.ok){ toast(t("TMDB cache cleared"),"success"); loadCacheInfo() }
  else toast(t("Failed to clear cache: {error}", {error: res.error}),"error")
}

function toggleSecret(id){
  const input = document.getElementById(id)
  const eye   = document.getElementById(id+"-eye")
  if (!input) return
  if (input.type === "password"){
    input.type = "text"
    if (eye) eye.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
  } else {
    input.type = "password"
    if (eye) eye.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`
  }
}

async function testJellyfinConnection(){
  const url     = document.getElementById("cfg_jf_url")?.value?.trim()
  const token   = document.getElementById("cfg_jf_key")?.value?.trim()
  const library = document.getElementById("cfg_jf_library")?.value?.trim()
  const result  = document.getElementById("jf-test-result")

  if (!url || !token) { toast(t("Enter Jellyfin URL and API key first"), "error"); return }
  if (result) result.textContent = t("Testing…")

  const res = await api("/api/jellyfin/test", "POST", { url, token, library })
  if (result) {
    result.textContent = res.ok ? `✓ ${res.message}` : `✗ ${res.error}`
    result.style.color = res.ok ? "var(--green)" : "var(--red)"
  }
}

// Build library entry HTML
function _libEntryHtml(lib, idx) {
  const libType    = lib.type || "plex"
  const isPlex     = libType === "plex"
  const isEmby     = libType === "emby"
  const serverName = isPlex ? "Plex" : isEmby ? "Emby" : "Jellyfin"

  const typeBadge = isPlex
    ? `<span style="background:#e5a00d;color:#000;font-size:.62rem;padding:2px 7px;border-radius:4px;font-weight:700">PLEX</span>`
    : isEmby
    ? `<span style="background:#00A4DC;color:#fff;font-size:.62rem;padding:2px 7px;border-radius:4px;font-weight:700">EMBY</span>`
    : `<span style="background:#7B2FBE;color:#fff;font-size:.62rem;padding:2px 7px;border-radius:4px;font-weight:700">JELLYFIN</span>`

  const urlPlaceholder = isPlex ? "http://plex:32400"
                       : isEmby ? "http://emby:8096"
                       : "http://jellyfin:8096"

  const credField = isPlex
    ? `<div class="form-group" style="margin-bottom:.5rem">
         <label class="form-label" style="font-size:.72rem">${t("Token")}</label>
         ${_secretInput(`lib_${idx}_cred`, lib.token||"")}
       </div>`
    : `<div class="form-group" style="margin-bottom:.5rem">
         <label class="form-label" style="font-size:.72rem">${t("API Key")}</label>
         ${_secretInput(`lib_${idx}_cred`, lib.api_key||"")}
       </div>`

  return `
  <div class="lib-entry" data-idx="${idx}" data-type="${libType}"
       style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;
              padding:1rem 1.2rem;margin-bottom:.75rem">
    <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.75rem">
      ${typeBadge}
      <input id="lib_${idx}_label" value="${escHtml(lib.label||"")}"
        placeholder="${t("{server} library label", {server: serverName})}"
        style="flex:1;background:transparent;border:none;border-bottom:1px solid var(--border2);
               color:var(--text);font-family:'DM Mono',monospace;font-size:.82rem;
               padding:2px 4px;outline:none"/>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.75rem;color:var(--text2);white-space:nowrap">
        <input type="checkbox" id="lib_${idx}_enabled" ${lib.enabled?"checked":""}
          style="width:14px;height:14px;accent-color:var(--gold);cursor:pointer"/>
        ${t("Enable")}
      </label>
      <button onclick="removeLibEntry(${idx})"
        style="background:none;border:none;color:var(--text3);cursor:pointer;
               font-size:1rem;line-height:1;padding:2px 4px;flex-shrink:0" title="${t("Remove")}">&#x2715;</button>
    </div>
    <div class="form-group" style="margin-bottom:.5rem">
      <label class="form-label" style="font-size:.72rem">URL</label>
      <input id="lib_${idx}_url" type="url" value="${escHtml(lib.url||"")}"
        placeholder="${urlPlaceholder}"
        style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;
               color:var(--text);font-family:'DM Mono',monospace;font-size:.78rem;
               padding:.4rem .65rem;box-sizing:border-box"/>
      <div style="font-size:.68rem;color:var(--text3);margin-top:.2rem">
        ${t("⚠ Do not use <code>localhost</code> — use your server's LAN IP (e.g. <code>192.168.1.x</code>).")}
      </div>
    </div>
    ${credField}
    <div class="form-group" style="margin-bottom:.5rem">
      <label class="form-label" style="font-size:.72rem">${t("Library Name")}</label>
      <input id="lib_${idx}_library" value="${escHtml(lib.library_name||"")}"
        placeholder="${t("Movies")}"
        style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;
               color:var(--text);font-family:'DM Mono',monospace;font-size:.78rem;
               padding:.4rem .65rem;box-sizing:border-box"/>
      <div style="font-size:.68rem;color:var(--text3);margin-top:.2rem">
        ${t("Exact name of the library in {server} (e.g. \"Movies\"). Case-sensitive.", {server: serverName})}
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:.5rem;margin-top:.25rem">
      <button class="btn-sm" style="font-size:.72rem;padding:5px 14px"
        onclick="testLibEntry(${idx})">${t("Test Connection")}</button>
      <span id="lib_${idx}_test" style="font-size:.72rem"></span>
    </div>
  </div>`
}

function _secretInput(id, val) {
  return `<div style="position:relative;display:flex;align-items:center">
    <input id="${id}" type="password" value="${escHtml(val)}"
      style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;
             color:var(--text);font-family:'DM Mono',monospace;font-size:.78rem;
             padding:.4rem 2.2rem .4rem .65rem;box-sizing:border-box"/>
    <button type="button" onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password'"
      style="position:absolute;right:.4rem;background:none;border:none;color:var(--text3);
             cursor:pointer;font-size:.78rem;padding:2px">&#x1F441;</button>
  </div>`
}

function addLibEntry(type) {
  const idx = document.querySelectorAll(".lib-entry").length
  const newLib = {
    id: `${type}-${Date.now()}`,
    type,
    enabled: true,
    label: "",
    url: "",
    token: "",
    api_key: "",
    library_name: "Movies",
    page_size: 500,
    short_movie_limit: 60,
  }
  const div = document.createElement("div")
  div.innerHTML = _libEntryHtml(newLib, idx)
  document.getElementById("lib-list").appendChild(div.firstElementChild)
}

function removeLibEntry(idx) {
  document.querySelector(`.lib-entry[data-idx="${idx}"]`)?.remove()
  // Re-index remaining entries
  document.querySelectorAll(".lib-entry").forEach((el, i) => {
    el.dataset.idx = i
    el.querySelectorAll("[id]").forEach(inp => {
      inp.id = inp.id.replace(/^lib_\d+_/, `lib_${i}_`)
    })
  })
}

async function testLibEntry(idx) {
  const el      = document.querySelector(`.lib-entry[data-idx="${idx}"]`)
  const type    = el?.dataset.type || "plex"
  const url     = document.getElementById(`lib_${idx}_url`)?.value?.trim()
  const cred    = document.getElementById(`lib_${idx}_cred`)?.value?.trim()
  const lib     = document.getElementById(`lib_${idx}_library`)?.value?.trim()
  const resEl   = document.getElementById(`lib_${idx}_test`)
  if (!resEl) return

  // Warn early when localhost / 127.0.0.1 is used — inside Docker these
  // point to the CinePlete container itself, not the host machine.
  if (/localhost|127\.0\.0\.1/.test(url || "")) {
    let port = 8096
    try { port = new URL(url).port || 8096 } catch {}
    resEl.innerHTML = `\u2717 <span style="color:var(--red,#ef4444)">
      <b>${t("localhost won't work inside Docker.")}</b><br>
      ${t("Use your server’s LAN IP (e.g. {lan}) or {host} on Docker Desktop.", {
        lan:  `<code>http://192.168.1.x:${port}</code>`,
        host: `<code>http://host.docker.internal:${port}</code>`,
      })}
    </span>`
    resEl.style.color = "var(--red,#ef4444)"
    return
  }

  resEl.textContent = t("Testing…")
  resEl.style.color = "var(--text3)"
  const payload = type === "plex"
    ? { type, url, token: cred, library_name: lib }
    : { type, url, api_key: cred, library_name: lib }
  const res = await api("/api/library/test", "POST", payload)
  if (res.ok) {
    resEl.textContent = t("✓ Connected")
    resEl.style.color = "var(--green)"
  } else {
    resEl.textContent = `\u2717 ${res.error || t("Failed")}`
    resEl.style.color = "var(--red,#ef4444)"
  }
}

function _collectLibraries() {
  return Array.from(document.querySelectorAll(".lib-entry")).map(el => {
    const idx  = parseInt(el.dataset.idx)
    const type = el.dataset.type || "plex"
    const base = {
      id:             `${type}-${idx}`,
      type,
      enabled:        document.getElementById(`lib_${idx}_enabled`)?.checked ?? true,
      label:          document.getElementById(`lib_${idx}_label`)?.value?.trim() || "",
      url:            document.getElementById(`lib_${idx}_url`)?.value?.trim() || "",
      library_name:   document.getElementById(`lib_${idx}_library`)?.value?.trim() || "",
      page_size:      500,
      short_movie_limit: 60,
    }
    const cred = document.getElementById(`lib_${idx}_cred`)?.value?.trim() || ""
    if (type === "plex") base.token   = cred
    else                 base.api_key = cred
    return base
  // Drop placeholder entries that have never been filled in
  }).filter(lib => lib.url)
}

// UI languages — option names stay in their own language on purpose
const UI_LANGUAGES = [["en", "English"], ["de", "Deutsch"]]

// TMDB metadata languages (TMDB "language" parameter)
function _tmdbLanguages(){
  return [
    ["en-US", t("English (United States)")],
    ["en-GB", t("English (United Kingdom)")],
    ["de-DE", t("German (Germany)")],
    ["de-AT", t("German (Austria)")],
    ["de-CH", t("German (Switzerland)")],
    ["fr-FR", t("French (France)")],
    ["es-ES", t("Spanish (Spain)")],
    ["it-IT", t("Italian (Italy)")],
    ["nl-NL", t("Dutch (Netherlands)")],
    ["pt-BR", t("Portuguese (Brazil)")],
    ["pl-PL", t("Polish (Poland)")],
    ["sv-SE", t("Swedish (Sweden)")],
    ["da-DK", t("Danish (Denmark)")],
    ["ja-JP", t("Japanese (Japan)")],
  ]
}

function _langSelect(id, options, current){
  // Keep an unknown stored value selectable instead of silently dropping it
  const opts = options.some(([code]) => code === current) ? options : [...options, [current, current]]
  return `
  <select id="${id}"
    style="width:100%;background:var(--bg3);border:1px solid var(--border2);
           border-radius:8px;color:var(--text);font-family:'DM Mono',monospace;
           font-size:.82rem;padding:.45rem .6rem;outline:none">
    ${opts.map(([code, name]) =>
      `<option value="${escHtml(code)}" ${code === current ? "selected" : ""}>${escHtml(name)}</option>`
    ).join("")}
  </select>`
}

function renderConfig(){
  const c     = document.getElementById("content")
  const cfg   = CONFIG||{}
  const tmdb  = cfg.TMDB        ||{}
  const stm   = cfg.STREAMING   ||{}
  const radarr= cfg.RADARR      ||{}
  const seerr = cfg.SEERR       ||{}
  const r4k   = cfg.RADARR_4K   ||{}
  const cls   = cfg.CLASSICS    ||{}
  const act   = cfg.ACTOR_HITS  ||{}
  const auto  = cfg.AUTOMATION  ||{}
  const tg    = cfg.TELEGRAM    ||{}
  const ovs   = cfg.OVERSEERR   ||{}
  const jss   = cfg.JELLYSEERR  ||{}
  const wh    = cfg.WEBHOOK     ||{}
  const wtch  = cfg.WATCHTOWER   ||{}
  const auth  = cfg.AUTH         ||{}
  const fsolv = cfg.FLARESOLVERR ||{}
  const trkt  = cfg.TRAKT        ||{}
  const srv   = cfg.SERVER       ||{}
  const uiLang   = srv.UI_LANGUAGE   || "en"
  const tmdbLang = tmdb.TMDB_LANGUAGE || "en-US"

  const field = (id, label, value, type="text") => {
    const isSecret  = type === "secret"
    const inputType = isSecret ? "password" : type
    const toggle    = isSecret ? `
      <button type="button" onclick="toggleSecret('${id}')"
        style="position:absolute;right:.6rem;top:50%;transform:translateY(-50%);
               background:none;border:none;cursor:pointer;color:var(--text3);
               display:flex;align-items:center;padding:2px"
        title="${t("Show/hide")}">
        <svg id="${id}-eye" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      </button>` : ""
    return `
  <div class="form-group">
    <label class="form-label" for="${id}">${label}</label>
    <div style="position:relative">
      <input class="form-input" id="${id}" type="${inputType}" value="${value??""}"
        style="${isSecret?"padding-right:2.2rem":""}"/>
      ${toggle}
    </div>
  </div>`
  }

  const check = (id, label, checked) => `
  <div class="form-group" style="display:flex;align-items:center;gap:.6rem">
    <input type="checkbox" id="${id}" ${checked?"checked":""}
      style="accent-color:var(--gold);width:14px;height:14px;cursor:pointer"/>
    <label for="${id}" class="form-label" style="margin:0;cursor:pointer">${label}</label>
  </div>`

  const svcBadge = (txt, bg, fg = '#fff') =>
    `<span style="background:${bg};color:${fg};font-size:.58rem;padding:2px 6px;
      border-radius:4px;font-weight:700;margin-right:.45rem;vertical-align:middle;
      letter-spacing:.04em">${txt}</span>`
  const sec  = (s, b = '') => `<div class="form-section-title">${b}${s}</div>`
  // Grey suffix after a section title, e.g. “(optional)”
  const tag  = s => ` <span style="font-size:.75rem;font-weight:400;color:var(--text3)">${s}</span>`
  const sub  = s => `<p style="font-size:.65rem;letter-spacing:.1em;text-transform:uppercase;color:var(--text3);margin:1rem 0 .75rem">${s}</p>`
  const hint = s => `<p style="font-size:.68rem;color:var(--text3);margin-top:-.25rem;margin-bottom:.5rem">${s}</p>`

  c.innerHTML = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;align-items:start">

    <!-- LEFT COLUMN -->
    <div>
      <div class="form-section" id="language-section">
        ${sec(t("Language"))}
        <div class="form-group">
          <label class="form-label" for="cfg_ui_language">${t("UI language")}</label>
          ${_langSelect("cfg_ui_language", UI_LANGUAGES, uiLang)}
        </div>
        ${hint(t("The page reloads after saving when the UI language changes."))}
        <div class="form-group">
          <label class="form-label" for="cfg_tmdb_language">${t("TMDB language")}</label>
          ${_langSelect("cfg_tmdb_language",
              _tmdbLanguages().map(([code, name]) => [code, `${name} — ${code}`]), tmdbLang)}
        </div>
        ${hint(t("Language of titles, overviews and franchise names from TMDB. After a change, titles are fetched again on the next scan (separate cache)."))}
      </div>

      <div class="form-section">
        ${sec(t("Authentication") + tag(t("(optional)")))}
        <div class="form-group">
          <label class="form-label">${t("Auth Mode")}</label>
          <select id="cfg_auth_method"
            style="width:100%;background:var(--bg3);border:1px solid var(--border2);
                   border-radius:8px;color:var(--text);font-family:'DM Mono',monospace;
                   font-size:.82rem;padding:.45rem .6rem;outline:none">
            <option value="None"                     ${(auth.AUTH_METHOD||"None")==="None"?"selected":""}>${t("None — open access")}</option>
            <option value="DisabledForLocalAddresses" ${auth.AUTH_METHOD==="DisabledForLocalAddresses"?"selected":""}>${t("Local network free, login from internet")}</option>
            <option value="Forms"                     ${auth.AUTH_METHOD==="Forms"?"selected":""}>${t("Always require login")}</option>
          </select>
        </div>
        ${field("cfg_auth_username", t("Username"), auth.AUTH_USERNAME||"")}
        ${field("cfg_auth_password", t("New Password"), "", "secret")}
        ${auth.AUTH_HAS_PASSWORD
          ? hint(t("Password is set. Leave blank to keep current password."))
          : hint(t("No password set yet. Enter one to enable login."))}
      </div>

      <div class="form-section">
        ${sec(t("API Keys") + tag(t("(optional)")))}
        <p style="color:var(--text3);font-size:.75rem;margin:0 0 .75rem">
          ${t("API keys allow external tools (n8n, Home Assistant, scripts) to call the CinePlete API without a browser session.")}<br>
          ${t("Pass the key as an {header} request header or a {param} query parameter.", {
            header: `<code style="color:var(--gold)">X-Api-Key</code>`,
            param:  `<code style="color:var(--gold)">?apikey=</code>`,
          })}<br>
          <span style="color:var(--amber,#f59e0b)">${t("⚠ Keys are only enforced when Auth Mode is set to Forms or DisabledForLocalAddresses.")}</span>
        </p>
        <div id="apikeys-list" style="display:flex;flex-direction:column;gap:.35rem;margin-bottom:.75rem"></div>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
          <input id="apikey-name-input" class="form-input" type="text" placeholder="${t("Key name (e.g. Home Assistant)")}"
            style="flex:1;min-width:160px;max-width:280px;font-size:.8rem;padding:.35rem .55rem"/>
          <button class="btn-sm" style="font-size:.72rem;padding:5px 14px;white-space:nowrap;
            border-color:rgba(229,160,13,.3);color:var(--gold)"
            onclick="createApiKey()">${t("+ Generate key")}</button>
        </div>
        <div id="apikey-new-box" style="display:none;margin-top:.75rem;padding:.6rem .75rem;
          background:var(--bg3);border:1px solid rgba(229,160,13,.3);border-radius:8px">
          <p style="color:var(--text3);font-size:.72rem;margin:0 0 .4rem">
            ${t("⚠ Copy this key now — it will not be shown again.")}
          </p>
          <div style="display:flex;gap:.5rem;align-items:center">
            <code id="apikey-new-value" style="flex:1;font-size:.75rem;color:var(--gold);
              word-break:break-all;font-family:'DM Mono',monospace"></code>
            <button class="btn-sm" style="font-size:.7rem;padding:4px 10px;flex-shrink:0"
              onclick="copyApiKey()">${t("Copy")}</button>
          </div>
        </div>
      </div>

      <div class="form-section" id="libraries-section">
        ${sec(t("Libraries"))}
        <div id="lib-list">
          ${((CONFIG.LIBRARIES||[]).length
            ? CONFIG.LIBRARIES
            : [{type:"plex",enabled:false,label:"",url:"",token:"",library_name:"Movies",page_size:500,short_movie_limit:60}]
          ).map((lib, i) => _libEntryHtml(lib, i)).join("")}
        </div>
        <div style="display:flex;gap:.5rem;margin-top:.5rem">
          <button class="btn-sm" style="font-size:.72rem;padding:5px 14px;border-color:rgba(229,160,13,.3);color:var(--gold)"
            onclick="addLibEntry('plex')">${t("+ Add Plex")}</button>
          <button class="btn-sm" style="font-size:.72rem;padding:5px 14px;border-color:rgba(123,47,190,.3);color:#9B5FDE"
            onclick="addLibEntry('jellyfin')">${t("+ Add Jellyfin")}</button>
          <button class="btn-sm" style="font-size:.72rem;padding:5px 14px;border-color:rgba(0,164,220,.3);color:#00A4DC"
            onclick="addLibEntry('emby')">${t("+ Add Emby")}</button>
        </div>
        <p style="font-size:.7rem;color:var(--text3);margin:.5rem 0 0">
          ${t("All enabled libraries are scanned in parallel and merged by TMDB ID.")}
        </p>
      </div>

      <div class="form-section">
        ${sec("TMDB")}
        ${field("cfg_tmdb_key",t("TMDB API Key"), tmdb.TMDB_API_KEY||"", "secret")}
        ${field("cfg_streaming_country",t("Streaming Country"), stm.STREAMING_COUNTRY||"US")}
        ${hint(t("2-letter ISO country code for JustWatch streaming availability (e.g. US, GB, FR, DE, CA, AU)."))}
      </div>

      <details class="form-section">
        <summary style="display:flex;align-items:center;justify-content:space-between">
          <span class="form-section-title" style="margin-bottom:0">${t("Advanced Settings")}</span>
          <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </summary>
        <div style="margin-top:1rem">
          ${sub(t("Classics"))}
          ${field("cfg_classics_pages",  t("Pages to fetch"), cls.CLASSICS_PAGES      ??4,    "number")}
          ${field("cfg_classics_votes",  t("Minimum votes"),  cls.CLASSICS_MIN_VOTES  ??5000, "number")}
          ${field("cfg_classics_rating", t("Minimum rating"), cls.CLASSICS_MIN_RATING ??8.0,  "number")}
          ${field("cfg_classics_max",    t("Max results"),    cls.CLASSICS_MAX_RESULTS??120,  "number")}
          ${sub(t("Actors"))}
          ${field("cfg_actor_votes", t("Min votes per film"), act.ACTOR_MIN_VOTES            ??500, "number")}
          ${field("cfg_actor_max",   t("Max results per actor"), act.ACTOR_MAX_RESULTS_PER_ACTOR??10,  "number")}
          ${sub("TMDB")}
          ${field("cfg_tmdb_workers",t("Concurrent workers (1–10)"), tmdb.TMDB_WORKERS??6,"number")}
          ${hint(t("Higher = faster first scan. Default 6, max 10."))}
        </div>
      </details>

      <div class="form-section">
        ${sec("Telegram" + tag(t("(optional)")), svcBadge('TELEGRAM','#2AABEE'))}
        ${check("cfg_tg_enabled", t("Enabled"), tg.TELEGRAM_ENABLED)}
        ${field("cfg_tg_token",   t("Bot Token"),tg.TELEGRAM_BOT_TOKEN||"", "secret")}
        ${field("cfg_tg_chat",    t("Chat ID"),  tg.TELEGRAM_CHAT_ID  ||"")}
        ${field("cfg_tg_interval",t("Min interval between notifications (min)"), tg.TELEGRAM_MIN_INTERVAL??30,"number")}
        ${hint(t("Get your Bot Token from @BotFather and Chat ID from @userinfobot."))}
      </div>

      <div class="form-section">
        ${sec(t("Automation"))}
        ${field("cfg_poll_interval",t("Library poll interval (min, 0 = disabled)"), auto.LIBRARY_POLL_INTERVAL??30,"number")}
        ${hint(t("Auto-scans when your media server library size changes."))}
        <div class="form-group">
          <label class="form-label">${t("Scheduled rescan")}</label>
          <select id="cfg_auto_scan_schedule"
            style="width:100%;background:var(--bg3);border:1px solid var(--border2);
                   border-radius:8px;color:var(--text);font-family:'DM Mono',monospace;
                   font-size:.82rem;padding:.45rem .6rem;outline:none">
            <option value="off"    ${(auto.AUTO_SCAN_SCHEDULE||"off")==="off"    ?"selected":""}>${t("Off")}</option>
            <option value="daily"  ${auto.AUTO_SCAN_SCHEDULE==="daily"  ?"selected":""}>${t("Daily at 02:00")}</option>
            <option value="weekly" ${auto.AUTO_SCAN_SCHEDULE==="weekly" ?"selected":""}>${t("Weekly on Sunday at 02:00")}</option>
          </select>
        </div>
        ${hint(t("Full rescan on a fixed schedule, regardless of library changes."))}
      </div>

      <div class="form-section" id="cache-section">
        ${sec(t("TMDB Cache"))}
        <div id="cache-info" style="font-size:.75rem;color:var(--text3);margin-bottom:.75rem">${t("Loading…")}</div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn-sm" style="font-size:.72rem;padding:5px 14px;border-color:rgba(34,197,94,.3);color:var(--green)" onclick="backupCache()">${t("💾 Backup")}</button>
          <button class="btn-sm" style="font-size:.72rem;padding:5px 14px;border-color:rgba(59,130,246,.3);color:var(--blue)" onclick="restoreCache()">${t("↩ Restore")}</button>
          <button class="btn-sm btn-ignore" style="font-size:.72rem;padding:5px 14px" onclick="clearCache()">${t("🗑 Clear")}</button>
        </div>
      </div>

    </div>

    <!-- RIGHT COLUMN — Integrations -->
    <div>
      <div class="form-section">
        ${sec("Radarr" + tag(t("(optional)")), svcBadge('RADARR','#7B2FBE'))}
        ${check("cfg_radarr_enabled", t("Enabled"), radarr.RADARR_ENABLED)}
        ${field("cfg_radarr_url",  t("Radarr URL"),  radarr.RADARR_URL     ||"")}
        ${field("cfg_radarr_key",  t("Radarr API Key"), radarr.RADARR_API_KEY ||"", "secret")}
        ${field("cfg_radarr_root", t("Root Folder Path"), radarr.RADARR_ROOT_FOLDER_PATH ||"")}
        ${qualityProfileField("cfg_radarr_quality", radarr.RADARR_QUALITY_PROFILE_ID??0, "primary")}
        ${check("cfg_radarr_search", t("Search &amp; download on add"), radarr.RADARR_SEARCH_ON_ADD)}
      </div>

      <div class="form-section">
        ${sec("Radarr 4K" + tag(t("(optional)")), svcBadge('RADARR 4K','#7B2FBE'))}
        ${check("cfg_r4k_enabled", t("Enabled"), r4k.RADARR_4K_ENABLED)}
        ${field("cfg_r4k_url",  t("Radarr 4K URL"),  r4k.RADARR_4K_URL     ||"")}
        ${field("cfg_r4k_key",  t("Radarr 4K API Key"),  r4k.RADARR_4K_API_KEY ||"", "secret")}
        ${field("cfg_r4k_root", t("Root Folder Path"),   r4k.RADARR_4K_ROOT_FOLDER_PATH ||"")}
        ${qualityProfileField("cfg_r4k_quality", r4k.RADARR_4K_QUALITY_PROFILE_ID??0, "4k")}
        ${check("cfg_r4k_search", t("Search &amp; download on add"), r4k.RADARR_4K_SEARCH_ON_ADD)}
        ${hint(t("Shows a separate '+ 4K' button on every movie card."))}
      </div>

      <div class="form-section">
        ${sec("Seerr" + tag(t("(optional)")), svcBadge('SEERR','#14b8a6'))}
        ${check("cfg_seerr_enabled", t("Enabled"), seerr.SEERR_ENABLED)}
        ${field("cfg_seerr_url", t("Seerr URL"), seerr.SEERR_URL    ||"")}
        ${field("cfg_seerr_key", t("API Key"),    seerr.SEERR_API_KEY||"", "secret")}
        ${hint(t("Unified successor to Overseerr &amp; Jellyseerr. API key found in Seerr → Settings → General."))}
      </div>

      <div class="form-section">
        ${sec("Overseerr" + tag(t("(legacy)")), svcBadge('OVERSEERR','#F59E0B','#000'))}
        ${check("cfg_ovs_enabled", t("Enabled"), ovs.OVERSEERR_ENABLED)}
        ${field("cfg_ovs_url",   t("Overseerr URL"), ovs.OVERSEERR_URL    ||"")}
        ${field("cfg_ovs_key",   t("API Key"),         ovs.OVERSEERR_API_KEY||"", "secret")}
        ${hint(t("⚠️ Legacy — no longer maintained upstream. Consider migrating to Seerr."))}
      </div>

      <div class="form-section">
        ${sec("Jellyseerr" + tag(t("(legacy)")), svcBadge('JELLYSEERR','#29B4E8'))}
        ${check("cfg_jss_enabled", t("Enabled"), jss.JELLYSEERR_ENABLED)}
        ${field("cfg_jss_url",   t("Jellyseerr URL"), jss.JELLYSEERR_URL    ||"")}
        ${field("cfg_jss_key",   t("API Key"),          jss.JELLYSEERR_API_KEY||"", "secret")}
        ${hint(t("⚠️ Legacy — no longer maintained upstream. Consider migrating to Seerr."))}
      </div>

      <div class="form-section">
        ${sec("Webhook" + tag(t("(optional)")), svcBadge('WEBHOOK','#6366F1'))}
        ${check("cfg_wh_enabled", t("Enabled"), wh.WEBHOOK_ENABLED)}
        ${field("cfg_wh_secret",  t("Secret (optional)"), wh.WEBHOOK_SECRET||"", "secret")}
        ${hint(t("POST to {url} from Plex/Jellyfin/Emby to trigger a rescan. Leave secret blank to allow unauthenticated calls.", {url: "<code style='color:var(--gold)'>/api/webhook?secret=…</code>"}))}
      </div>

      <div class="form-section">
        ${sec("Watchtower" + tag(t("(optional)")), svcBadge('WATCHTOWER','#2496ED'))}
        ${check("cfg_wtch_enabled", t("Auto-update enabled"), wtch.WATCHTOWER_ENABLED)}
        ${field("cfg_wtch_url",   t("Watchtower URL"),wtch.WATCHTOWER_URL        ||"")}
        ${field("cfg_wtch_token", t("API Token"), wtch.WATCHTOWER_API_TOKEN  ||"", "secret")}
        ${hint(t("Pulls the latest CinePlete image automatically. Enable the Watchtower HTTP API with {env} and set a matching token.", {env: "<code style='color:var(--gold)'>WATCHTOWER_HTTP_API_UPDATE=true</code>"}))}
        <button class="btn-sm" style="margin-top:.5rem;font-size:.72rem;padding:5px 14px;border-color:rgba(59,130,246,.3);color:var(--blue)"
          onclick="triggerWatchtowerUpdate()">${t("⬆ Update Now")}</button>
        <span id="wtchStatus" style="font-size:.72rem;color:var(--text3);margin-left:.5rem"></span>
      </div>

      <div class="form-section">
        ${sec("FlareSolverr" + tag(t("(optional)")), svcBadge('FLARESOLVERR','#F48120'))}
        ${field("cfg_flaresolverr_url", t("FlareSolverr URL"), fsolv.FLARESOLVERR_URL||"")}
        ${hint(t("e.g. http://flaresolverr:8191 — used to bypass Cloudflare when fetching Letterboxd lists."))}
      </div>

      <div class="form-section">
        ${sec("Trakt" + tag(t("(optional)")), svcBadge('TRAKT','#ED2224'))}
        ${trkt.TRAKT_ACCESS_TOKEN
          ? `<div id="traktConnectBox" style="display:none"></div>
             <div id="traktConnectedBox">
               <div style="font-size:.78rem;color:var(--green);margin-bottom:.75rem">
                 ${t("✓ Connected as {user}", {user: `<strong>@${escHtml(trkt.TRAKT_USERNAME||"")}</strong>`})}
               </div>
               <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
                 <button class="btn-sm" style="font-size:.72rem;padding:5px 14px;
                   border-color:rgba(237,34,36,.4);color:#ED2224"
                   onclick="traktRefreshWatched(this)">${t("⟳ Refresh history")}</button>
                 <button class="btn-sm btn-ignore" style="font-size:.72rem;padding:5px 14px"
                   onclick="traktDisconnect()">${t("Disconnect")}</button>
                 <span id="traktRefreshStatus" style="font-size:.7rem;color:var(--text3)"></span>
               </div>
             </div>`
          : `<div id="traktConnectedBox" style="display:none"></div>
             <div id="traktConnectBox">
               ${field("cfg_trakt_id",     t("Client ID"),     trkt.TRAKT_CLIENT_ID    ||"")}
               ${field("cfg_trakt_secret", t("Client Secret"), trkt.TRAKT_CLIENT_SECRET||"", "secret")}
               <button class="btn-sm" style="font-size:.72rem;padding:5px 14px;margin-top:.25rem;
                 border-color:rgba(237,34,36,.4);color:#ED2224"
                 onclick="traktConnect()">${t("🔗 Connect via Trakt")}</button>
             </div>`}
        <div id="traktDeviceBox" style="display:none;margin-top:.75rem;padding:.75rem;
          background:var(--bg3);border:1px solid var(--border2);border-radius:8px;
          text-align:center"></div>
        ${check("cfg_trakt_hide", t("Hide watched movies from all grids"), trkt.TRAKT_HIDE_WATCHED||false)}
        ${hint(t("When enabled, movies you have marked as watched in Trakt are hidden from all recommendation grids (except Wishlist)."))}
      </div>

      <button class="btn-primary" onclick="saveConfig()">${t("Save Configuration")}</button>
      <div id="cfgStatus" style="font-size:.75rem;color:var(--text3);margin-top:.6rem;text-align:center"></div>
    </div>

  </div>`

  loadCacheInfo()
  loadApiKeys()
}

async function saveConfig(){
  const v  = id => document.getElementById(id)?.value?.trim()||""
  const vi = id => parseInt(v(id))||0
  const vf = id => parseFloat(v(id))||0
  const vc = id => document.getElementById(id)?.checked||false

  const payload = {
    SERVER:{
      UI_LANGUAGE: v("cfg_ui_language") || CONFIG?.SERVER?.UI_LANGUAGE || "en",
      MEDIA_SERVER: (() => {
        const libs = _collectLibraries()
        const first = libs.find(l => l.enabled)
        return first?.type || "plex"
      })(),
    },
    LIBRARIES: _collectLibraries(),
    // Derive legacy PLEX/JELLYFIN from LIBRARIES for backward compat
    PLEX: (() => {
      const libs = _collectLibraries()
      const p = libs.find(l => l.type === "plex")
      return p ? {
        PLEX_URL: p.url, PLEX_TOKEN: p.token, LIBRARY_NAME: p.library_name,
        PLEX_PAGE_SIZE: p.page_size || 500, SHORT_MOVIE_LIMIT: p.short_movie_limit || 60,
      } : (CONFIG?.PLEX || {})
    })(),
    JELLYFIN: (() => {
      const libs = _collectLibraries()
      const j = libs.find(l => l.type === "jellyfin")
      return j ? {
        JELLYFIN_URL: j.url, JELLYFIN_API_KEY: j.api_key,
        JELLYFIN_LIBRARY_NAME: j.library_name,
        JELLYFIN_PAGE_SIZE: j.page_size || 500, SHORT_MOVIE_LIMIT: j.short_movie_limit || 60,
      } : (CONFIG?.JELLYFIN || {})
    })(),
    EMBY: (() => {
      const libs = _collectLibraries()
      const e = libs.find(l => l.type === "emby")
      return e ? {
        EMBY_URL: e.url, EMBY_API_KEY: e.api_key,
        EMBY_LIBRARY_NAME: e.library_name,
        EMBY_PAGE_SIZE: e.page_size || 500, SHORT_MOVIE_LIMIT: e.short_movie_limit || 60,
      } : (CONFIG?.EMBY || {})
    })(),
    TMDB:{
      TMDB_API_KEY: v("cfg_tmdb_key"),
      TMDB_WORKERS: vi("cfg_tmdb_workers"),
      TMDB_LANGUAGE: v("cfg_tmdb_language") || CONFIG?.TMDB?.TMDB_LANGUAGE || "en-US",
    },
    CLASSICS:{
      CLASSICS_PAGES:      vi("cfg_classics_pages"),
      CLASSICS_MIN_VOTES:  vi("cfg_classics_votes"),
      CLASSICS_MIN_RATING: vf("cfg_classics_rating"),
      CLASSICS_MAX_RESULTS:vi("cfg_classics_max"),
    },
    ACTOR_HITS:{
      ACTOR_MIN_VOTES:             vi("cfg_actor_votes"),
      ACTOR_MAX_RESULTS_PER_ACTOR: vi("cfg_actor_max"),
    },
    RADARR:{
      RADARR_ENABLED:           vc("cfg_radarr_enabled"),
      RADARR_URL:               v("cfg_radarr_url"),
      RADARR_API_KEY:           v("cfg_radarr_key"),
      RADARR_ROOT_FOLDER_PATH:  v("cfg_radarr_root"),
      RADARR_QUALITY_PROFILE_ID:vi("cfg_radarr_quality"),
      RADARR_SEARCH_ON_ADD:     vc("cfg_radarr_search"),
    },
    RADARR_4K:{
      RADARR_4K_ENABLED:           vc("cfg_r4k_enabled"),
      RADARR_4K_URL:               v("cfg_r4k_url"),
      RADARR_4K_API_KEY:           v("cfg_r4k_key"),
      RADARR_4K_ROOT_FOLDER_PATH:  v("cfg_r4k_root"),
      RADARR_4K_QUALITY_PROFILE_ID:vi("cfg_r4k_quality"),
      RADARR_4K_SEARCH_ON_ADD:     vc("cfg_r4k_search"),
    },
    SEERR:{
      SEERR_ENABLED: vc("cfg_seerr_enabled"),
      SEERR_URL:     v("cfg_seerr_url"),
      SEERR_API_KEY: v("cfg_seerr_key"),
    },
    OVERSEERR:{
      OVERSEERR_ENABLED: vc("cfg_ovs_enabled"),
      OVERSEERR_URL:     v("cfg_ovs_url"),
      OVERSEERR_API_KEY: v("cfg_ovs_key"),
    },
    JELLYSEERR:{
      JELLYSEERR_ENABLED: vc("cfg_jss_enabled"),
      JELLYSEERR_URL:     v("cfg_jss_url"),
      JELLYSEERR_API_KEY: v("cfg_jss_key"),
    },
    WEBHOOK:{
      WEBHOOK_ENABLED: vc("cfg_wh_enabled"),
      WEBHOOK_SECRET:  v("cfg_wh_secret"),
    },
    WATCHTOWER:{
      WATCHTOWER_ENABLED:   vc("cfg_wtch_enabled"),
      WATCHTOWER_URL:       v("cfg_wtch_url"),
      WATCHTOWER_API_TOKEN: v("cfg_wtch_token"),
    },
    TELEGRAM:{
      TELEGRAM_ENABLED:      vc("cfg_tg_enabled"),
      TELEGRAM_BOT_TOKEN:    v("cfg_tg_token"),
      TELEGRAM_CHAT_ID:      v("cfg_tg_chat"),
      TELEGRAM_MIN_INTERVAL: vi("cfg_tg_interval"),
    },
    AUTOMATION:{
      LIBRARY_POLL_INTERVAL: vi("cfg_poll_interval"),
      AUTO_SCAN_SCHEDULE:    v("cfg_auto_scan_schedule"),
    },
    AUTH:{
      AUTH_METHOD:   v("cfg_auth_method"),
      AUTH_USERNAME: v("cfg_auth_username"),
      AUTH_PASSWORD: v("cfg_auth_password"),  // virtual — backend hashes and stores
    },
    FLARESOLVERR:{
      FLARESOLVERR_URL: v("cfg_flaresolverr_url"),
    },
    STREAMING:{
      STREAMING_COUNTRY: v("cfg_streaming_country").toUpperCase()||"US",
    },
    TRAKT:{
      // Fields may not exist in DOM (connected = form hidden) or may be blank (just disconnected).
      // Use || not ?? so that empty string "" also falls back to the stored config value,
      // preventing a "Save Configuration" with blank fields from wiping the client secret.
      TRAKT_CLIENT_ID:     document.getElementById("cfg_trakt_id")?.value?.trim()
                           || CONFIG?.TRAKT?.TRAKT_CLIENT_ID     || "",
      TRAKT_CLIENT_SECRET: document.getElementById("cfg_trakt_secret")?.value?.trim()
                           || CONFIG?.TRAKT?.TRAKT_CLIENT_SECRET || "",
      TRAKT_HIDE_WATCHED:  vc("cfg_trakt_hide"),
      // OAuth tokens managed by device flow only — always preserve from in-memory config
      TRAKT_ENABLED:       CONFIG?.TRAKT?.TRAKT_ENABLED      ?? false,
      TRAKT_ACCESS_TOKEN:  CONFIG?.TRAKT?.TRAKT_ACCESS_TOKEN  || "",
      TRAKT_REFRESH_TOKEN: CONFIG?.TRAKT?.TRAKT_REFRESH_TOKEN || "",
      TRAKT_USERNAME:      CONFIG?.TRAKT?.TRAKT_USERNAME      || "",
    },
  }

  const res = await api("/api/config","POST",payload)
  const st  = document.getElementById("cfgStatus")
  if (res.ok){
    st.textContent = t("✓ Saved")
    st.style.color = "var(--green)"
    toast(t("Configuration saved"),"success")
    // <html lang> is set server-side, so a new UI language needs a reload
    if (payload.SERVER.UI_LANGUAGE !== LANG){
      location.reload()
      return
    }
    if (res.configured){
      CONFIGURED = true
      CONFIG     = await api("/api/config")
      await loadResults()
    }
  } else {
    st.textContent = t("✗ Error saving")
    st.style.color = "var(--red)"
    toast(t("Error saving config: {error}", {error: res.error||t("unknown error")}),"error")
  }
}
async function triggerWatchtowerUpdate() {
  const el = document.getElementById("wtchStatus")
  if (el) { el.textContent = t("Triggering…"); el.style.color = "var(--text3)" }
  try {
    const r = await api("/api/watchtower/update", "POST")
    if (r.ok) {
      if (el) { el.textContent = t("✓ Update triggered"); el.style.color = "var(--green)" }
      toast(t("Watchtower update triggered — new image will pull shortly"), "success")
    } else {
      if (el) { el.textContent = `✗ ${r.error||r.status}`; el.style.color = "var(--red)" }
      toast(t("Watchtower error: {error}", {error: r.error||r.status}), "error")
    }
  } catch(e) {
    if (el) { el.textContent = t("✗ Request failed"); el.style.color = "var(--red)" }
    toast(t("Watchtower request failed"), "error")
  }
}

// ---------------------------------------------------------------------------
// Trakt device-code OAuth helpers
// ---------------------------------------------------------------------------

let _traktPollTimer = null

async function traktConnect() {
  const clientId     = document.getElementById("cfg_trakt_id")?.value?.trim()
  const clientSecret = document.getElementById("cfg_trakt_secret")?.value?.trim()
  if (!clientId || !clientSecret) {
    toast(t("Enter Client ID and Client Secret first"), "error"); return
  }

  const box = document.getElementById("traktDeviceBox")
  if (box) { box.style.display = "block"; box.innerHTML = t("Connecting…") }

  const res = await api("/api/trakt/device/code", "POST", { client_id: clientId, client_secret: clientSecret })
  if (!res.ok) {
    if (box) box.innerHTML = `<span style="color:var(--red)">✗ ${escHtml(res.error||t("Failed"))}</span>`
    return
  }

  const { device_code, user_code, verification_url, expires_in, interval } = res
  const expiresAt = Date.now() + expires_in * 1000

  if (box) {
    box.innerHTML = `
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:.5rem">
        ${t("Go to {link} and enter:", {link: `<a href="${escHtml(verification_url)}" target="_blank" rel="noopener"
          style="color:var(--gold)">${escHtml(verification_url)}</a>`})}
      </div>
      <div style="font-size:1.8rem;font-weight:700;letter-spacing:.25em;color:var(--text);
                  font-family:'DM Mono',monospace;margin:.5rem 0">${escHtml(user_code)}</div>
      <div id="traktCountdown" style="font-size:.7rem;color:var(--text3)"></div>`
  }

  // Start polling
  if (_traktPollTimer) clearInterval(_traktPollTimer)
  _traktPollTimer = setInterval(async () => {
    const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000))
    const cd = document.getElementById("traktCountdown")
    if (cd) cd.textContent = t("Waiting for authorisation… ({n}s remaining)", {n: remaining})

    if (Date.now() > expiresAt) {
      clearInterval(_traktPollTimer); _traktPollTimer = null
      if (box) box.innerHTML = `<span style="color:var(--red)">${t("✗ Code expired — try again")}</span>`
      return
    }

    const poll = await api("/api/trakt/device/poll", "POST", {
      client_id: clientId, client_secret: clientSecret, device_code,
    })

    if (poll.status === "pending") return // keep waiting

    clearInterval(_traktPollTimer); _traktPollTimer = null

    if (poll.status === "success") {
      if (box) box.style.display = "none"
      const cbBox = document.getElementById("traktConnectedBox")
      const ctBox = document.getElementById("traktConnectBox")
      if (cbBox) {
        cbBox.style.display = "block"
        cbBox.innerHTML = `
          <div style="font-size:.78rem;color:var(--green);margin-bottom:.75rem">
            ${t("✓ Connected as {user}", {user: `<strong>@${escHtml(poll.username||"")}</strong>`})}
          </div>
          <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
            <button class="btn-sm" style="font-size:.72rem;padding:5px 14px;
              border-color:rgba(237,34,36,.4);color:#ED2224"
              onclick="traktRefreshWatched(this)">${t("⟳ Refresh history")}</button>
            <button class="btn-sm btn-ignore" style="font-size:.72rem;padding:5px 14px"
              onclick="traktDisconnect()">${t("Disconnect")}</button>
            <span id="traktRefreshStatus" style="font-size:.7rem;color:var(--text3)"></span>
          </div>`
      }
      if (ctBox) ctBox.style.display = "none"
      // Re-sync in-memory CONFIG from the server so any subsequent "Save
      // Configuration" preserves the freshly-stored tokens (access + refresh).
      // The partial manual update below was incomplete (TRAKT_REFRESH_TOKEN was
      // never set, and TRAKT_ACCESS_TOKEN was set to the placeholder "set").
      try { CONFIG = await api("/api/config") } catch {}
      toast(t("Trakt connected as @{user}", {user: poll.username||""}), "success")
      // Refresh watched list
      _fetchTraktWatched?.()
    } else if (poll.status === "denied") {
      if (box) box.innerHTML = `<span style="color:var(--red)">${t("✗ Access denied by user")}</span>`
    } else if (poll.status === "expired") {
      if (box) box.innerHTML = `<span style="color:var(--red)">${t("✗ Code expired — try again")}</span>`
    } else {
      if (box) box.innerHTML = `<span style="color:var(--red)">${t("✗ Error — try again")}</span>`
    }
  }, (interval || 5) * 1000)
}

async function traktDisconnect() {
  if (!confirm(t("Disconnect Trakt? Your watch history overlay will be removed."))) return
  const res = await api("/api/trakt/disconnect", "POST")
  if (!res.ok) { toast(t("Disconnect failed"), "error"); return }

  const cbBox = document.getElementById("traktConnectedBox")
  const ctBox = document.getElementById("traktConnectBox")
  const box   = document.getElementById("traktDeviceBox")
  if (cbBox) cbBox.style.display = "none"
  if (box)   box.style.display   = "none"
  if (ctBox) {
    // Read credentials BEFORE clearing CONFIG — they are still present at this point
    const _storedId     = escHtml(CONFIG?.TRAKT?.TRAKT_CLIENT_ID     || "")
    const _storedSecret = escHtml(CONFIG?.TRAKT?.TRAKT_CLIENT_SECRET || "")
    ctBox.style.display = "block"
    ctBox.innerHTML = `
      <div class="form-group">
        <label class="form-label" for="cfg_trakt_id">${t("Client ID")}</label>
        <div style="position:relative">
          <input class="form-input" id="cfg_trakt_id" type="text" value="${_storedId}"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="cfg_trakt_secret">${t("Client Secret")}</label>
        <div style="position:relative">
          <input class="form-input" id="cfg_trakt_secret" type="password" value="${_storedSecret}"
            style="padding-right:2.2rem"/>
          <button type="button" onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password'"
            style="position:absolute;right:.4rem;top:50%;transform:translateY(-50%);
                   background:none;border:none;color:var(--text3);cursor:pointer;font-size:.78rem;padding:2px">&#x1F441;</button>
        </div>
      </div>
      <button class="btn-sm" style="font-size:.72rem;padding:5px 14px;margin-top:.25rem;
        border-color:rgba(237,34,36,.4);color:#ED2224"
        onclick="traktConnect()">${t("🔗 Connect via Trakt")}</button>`
  }
  if (CONFIG?.TRAKT) {
    CONFIG.TRAKT.TRAKT_ACCESS_TOKEN  = ""
    CONFIG.TRAKT.TRAKT_REFRESH_TOKEN = ""
    CONFIG.TRAKT.TRAKT_USERNAME      = ""
    CONFIG.TRAKT.TRAKT_ENABLED       = false
  }
  // Clear watched set
  if (typeof _traktWatchedIds !== "undefined") _traktWatchedIds = null
  toast(t("Trakt disconnected"))
}

async function traktRefreshWatched(btn) {
  const statusEl = document.getElementById("traktRefreshStatus")
  btn.disabled = true
  if (statusEl) { statusEl.textContent = t("Refreshing…"); statusEl.style.color = "var(--text3)" }

  // Bust backend cache then re-fetch
  await api("/api/trakt/watched/refresh", "POST")
  const res = await _fetchTraktWatched()

  btn.disabled = false
  if (statusEl) {
    if (res?.ok) {
      const n = _traktWatchedIds?.size ?? 0
      statusEl.textContent = tn(n, "✓ {n} watched movie", "✓ {n} watched movies")
      statusEl.style.color = "var(--green)"
    } else {
      statusEl.textContent = t("⚠ Could not reach Trakt — check server logs")
      statusEl.style.color = "var(--amber, #f59e0b)"
    }
    setTimeout(() => { if (statusEl) statusEl.textContent = "" }, 4000)
  }
  if (res?.ok) {
    toast(t("Trakt: watched history refreshed"), "success")
  } else {
    toast(t("Trakt: could not fetch watched history"), "error")
  }
  // Update cards on the current tab
  if (typeof render !== "undefined" && !["config","logs"].includes(ACTIVE_TAB)) render()
}

/* ── API Key management ─────────────────────────────────────── */

async function loadApiKeys() {
  const container = document.getElementById("apikeys-list")
  if (!container) return
  const res = await api("/api/apikeys")
  if (!res.ok) return
  const keys = res.keys || []
  if (!keys.length) {
    container.innerHTML = `<p style="color:var(--text3);font-size:.75rem;margin:0">${t("No API keys yet.")}</p>`
    return
  }
  container.innerHTML = keys.map(k => {
    const date = new Date(k.created_at * 1000).toLocaleDateString(LOCALE)
    return `
      <div class="meta-item" style="justify-content:space-between;gap:.5rem" id="apikey-row-${escHtml(k.id)}">
        <div style="min-width:0">
          <span style="font-size:.8rem;color:var(--text)">${escHtml(k.name)}</span>
          <span style="font-size:.72rem;color:var(--text3);margin-left:.5rem;font-family:'DM Mono',monospace">${escHtml(k.preview)}</span>
          <span style="font-size:.68rem;color:var(--text3);margin-left:.5rem">${t("created {date}", {date})}</span>
        </div>
        <button class="btn-sm btn-ignore" style="font-size:.7rem;padding:3px 10px;flex-shrink:0"
          onclick="revokeApiKey('${escHtml(k.id)}','${escHtml(k.name)}',this)">${t("Revoke")}</button>
      </div>`
  }).join("")
}

async function createApiKey() {
  const nameInput = document.getElementById("apikey-name-input")
  const name = nameInput?.value?.trim() || t("Unnamed key")
  const res = await api("/api/apikeys", "POST", { name })
  if (!res.ok) { toast(res.error || t("Failed to create key"), "error"); return }

  // Show the raw key once
  const box = document.getElementById("apikey-new-box")
  const val = document.getElementById("apikey-new-value")
  if (box && val) {
    val.textContent = res.key
    box.style.display = "block"
  }
  if (nameInput) nameInput.value = ""
  toast(t("API key \"{name}\" created — copy it now", {name: res.name}), "success")
  loadApiKeys()
}

function copyApiKey() {
  const val = document.getElementById("apikey-new-value")?.textContent || ""
  if (!val) return
  // navigator.clipboard requires HTTPS or localhost — use execCommand fallback for HTTP
  if (navigator.clipboard) {
    navigator.clipboard.writeText(val)
      .then(() => toast(t("Key copied to clipboard"), "success"))
      .catch(() => _copyFallback(val))
  } else {
    _copyFallback(val)
  }
}

function _copyFallback(text) {
  const ta = document.createElement("textarea")
  ta.value = text
  ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0"
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  try {
    document.execCommand("copy")
    toast(t("Key copied to clipboard"), "success")
  } catch {
    toast(t("Could not copy — please select and copy manually"), "error")
  }
  document.body.removeChild(ta)
}

async function revokeApiKey(id, name, btn) {
  if (!confirm(t("Revoke API key \"{name}\"? Any tool using it will lose access.", {name}))) return
  btn.disabled = true
  const res = await api(`/api/apikeys/${id}`, "DELETE")
  if (res.ok) {
    const row = document.getElementById(`apikey-row-${id}`)
    if (row) { row.style.opacity = "0"; row.style.transition = "opacity .3s"; setTimeout(() => { row.remove(); loadApiKeys() }, 320) }
    toast(t("API key \"{name}\" revoked", {name}), "info")
  } else {
    btn.disabled = false
    toast(res.error || t("Failed to revoke key"), "error")
  }
}

