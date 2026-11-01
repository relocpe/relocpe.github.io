#!/usr/bin/env python3
"""Fetch relocpe's public repos at build time, write repos.json and bake cards into index.html."""
import json, urllib.request, html, datetime, re, pathlib
U = "relocpe"; HERE = pathlib.Path(__file__).parent
SKIP = {U, f"{U}.github.io"}
KEEP_FORKS = {"Nimbus"}            # own project hosted as a fork
SHOTS = {"Ya.Music-RPC": ("../shared/ya-music-rpc.jpg", 546, 500, "Мини-плеер Ya.Music-RPC в строке меню macOS")}
RU = {"Ya.Music-RPC": "Трек из Яндекс Музыки в статусе Discord и мини-плеер в строке меню.",
      "Nimbus": "zapret с интерфейсом: Discord и YouTube без блокировок и без терминала."}
COL = {"C": "#555555", "Swift": "#F05138", "Shell": "#89E051", "Makefile": "#427819", "CSS": "#663399", "JavaScript": "#F1E05A", "Python": "#3572A5", "HTML": "#E34C26", "Objective-C": "#438EFF"}
def get(u):
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "relocpe-site-build"}), timeout=20))
repos = []
for r in get(f"https://api.github.com/users/{U}/repos?per_page=100&type=owner"):
    if r["name"] in SKIP or r["private"] or (r["fork"] and r["name"] not in KEEP_FORKS): continue
    full = get(r["url"]); langs = get(r["languages_url"]); tot = sum(langs.values()) or 1
    repos.append({"name": r["name"], "url": r["html_url"], "desc": r["description"] or "", "ru": RU.get(r["name"], ""),
        "lang": r["language"], "langs": [[k, round(v * 100 / tot, 1), COL.get(k, "#8E8E8E")] for k, v in langs.items()],
        "stars": r["stargazers_count"], "forks": r["forks_count"], "pushed": r["pushed_at"], "topics": r.get("topics", []),
        "license": (r.get("license") or {}).get("spdx_id"), "parent": (full.get("parent") or {}).get("full_name"),
        "shot": SHOTS.get(r["name"])})
repos.sort(key=lambda x: (x["shot"] is None, x["pushed"]), reverse=False)
(HERE / "repos.json").write_text(json.dumps({"built": datetime.datetime.now(datetime.timezone.utc).isoformat(), "repos": repos}, ensure_ascii=False, indent=1))
E = html.escape
MON = "янв фев мар апр мая июн июл авг сен окт ноя дек".split()
def card(r, i):
    d = datetime.datetime.fromisoformat(r["pushed"].replace("Z", "+00:00"))
    when = f"{d.day} {MON[d.month-1]} {d.year}"
    if r["shot"]:
        s, w, h, alt = r["shot"]
        media = f'<div class="rc-media"><img src="{s}" alt="{E(alt)}" width="{w}" height="{h}" loading="eager" decoding="async"></div>'
    else:
        rows = "".join(f'<li><span class="lg-n">{E(k)}</span><span class="lg-b" style="--p:{p}%;--c:{c}"></span><span class="lg-p">{p:g}%</span></li>' for k, p, c in r["langs"])
        media = f'<div class="rc-media rc-langs" aria-label="Языки репозитория"><ul>{rows}</ul></div>'
    bar = "".join(f'<i style="flex:{p};background:{c}" title="{E(k)} {p:g}%"></i>' for k, p, c in r["langs"])
    lc = COL.get(r["lang"], "#8E8E8E")
    meta = [f'<li><i class="ld" style="background:{lc}"></i>{E(r["lang"] or "—")}</li>',
            f'<li title="звёзды"><svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l1.9 4 4.3.5-3.2 2.9.9 4.3L8 11l-3.9 2.2.9-4.3L1.8 6l4.3-.5z"/></svg>{r["stars"]}</li>', f'<li title="форки"><svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="3" r="1.6"/><circle cx="12" cy="3" r="1.6"/><circle cx="8" cy="13" r="1.6"/><path d="M4 4.6v1.4c0 1.4 1 2.2 2.4 2.2h3.2C11 8.2 12 7.4 12 6V4.6M8 8.2v3.2"/></svg>{r["forks"]}</li>']
    if r["license"]: meta.append(f'<li>{E(r["license"])}</li>')
    meta.append(f'<li><time datetime="{E(r["pushed"])}" data-pushed>{when}</time></li>')
    fork = f'<p class="rc-fork">форк {E(r["parent"])}</p>' if r["parent"] else ""
    topics = "".join(f"<li>#{E(t)}</li>" for t in r["topics"][:4])
    return f'''<li class="rc{' has-shot' if r['shot'] else ''}">
 <a class="rc-a" href="{E(r['url'])}" target="_blank" rel="noopener" data-hint="github ↗">
  {media}
  <div class="rc-body">
   <p class="rc-k"><span>{i:02d}</span><span class="rc-own">{U} /</span></p>
   <h3 class="rc-n"><span data-sc>{E(r['name'])}</span><span class="rc-arr" aria-hidden="true">↗</span></h3>
   <p class="rc-d">{E(r['desc'])}</p>
   {f'<p class="rc-ru">{E(r["ru"])}</p>' if r['ru'] else ''}
   {fork}
   <ul class="rc-top">{topics}</ul>
   <div class="rc-bar" aria-hidden="true">{bar}</div>
   <ul class="rc-meta">{''.join(meta)}</ul>
  </div>
 </a>
</li>'''
block = "\n".join(card(r, i + 1) for i, r in enumerate(repos))
p = HERE / "index.html"; s = p.read_text()
s = re.sub(r"<!--repos-->.*?<!--/repos-->", lambda m: f"<!--repos-->\n{block}\n<!--/repos-->", s, flags=re.S)
p.write_text(s); print(len(repos), "repos:", [r["name"] for r in repos])
