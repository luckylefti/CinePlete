/* ============================================================
   i18n.js — UI translation (loads first, before every other script)

   The English source string IS the key:  t("Rescan Library")
   A missing translation silently falls back to the English text,
   so an untranslated string is never an empty label.

   The language comes from <html lang="…">, injected server-side
   from SERVER.UI_LANGUAGE (see app/routers/auth.py).

   Placeholders:  t("{n} movies", {n: 12})
   Plurals:       tn(n, "{n} movie", "{n} movies")
   Dictionaries:  static/js/i18n.<lang>.js  →  I18N.<lang> = {…}
============================================================ */

const I18N   = {}
const LANG   = (document.documentElement.lang || "en").slice(0, 2).toLowerCase()
const LOCALE = LANG === "de" ? "de-DE" : undefined   // undefined = browser default (upstream behaviour)

function t(s, vars){
  const dict = I18N[LANG]
  let out = (dict && dict[s]) || s
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
  return out
}

function tn(n, one, many, vars){
  return t(n === 1 ? one : many, Object.assign({n}, vars || {}))
}

/* Translate the static HTML shell (text nodes + title/placeholder/aria-label).
   Only exact dictionary matches are replaced, so user data is never touched. */
function translateDom(root){
  const dict = I18N[LANG]
  if (!dict || !root) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())){
    const raw = node.nodeValue
    const key = raw.trim()
    if (key && dict[key]) node.nodeValue = raw.replace(key, dict[key])
  }
  root.querySelectorAll("[title],[placeholder],[aria-label]").forEach(el => {
    for (const attr of ["title", "placeholder", "aria-label"]){
      const v = el.getAttribute(attr)
      if (v && dict[v]) el.setAttribute(attr, dict[v])
    }
  })
}
