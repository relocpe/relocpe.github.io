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
import sys
CREATED = {"Ya.Music-RPC": "2026-10-11T23:33:59Z", "Nimbus": "2026-08-31T13:32:09Z"}
repos = []
if "--cache" in sys.argv:            # offline rebuild from the last fetched data
    repos = json.loads((HERE / "repos.json").read_text())["repos"]
    for r in repos: r.setdefault("created", CREATED.get(r["name"], r["pushed"]))
for r in ([] if repos else get(f"https://api.github.com/users/{U}/repos?per_page=100&type=owner")):
    if r["name"] in SKIP or r["private"] or (r["fork"] and r["name"] not in KEEP_FORKS): continue
    full = get(r["url"]); langs = get(r["languages_url"]); tot = sum(langs.values()) or 1
    repos.append({"name": r["name"], "url": r["html_url"], "desc": r["description"] or "", "ru": RU.get(r["name"], ""),
        "lang": r["language"], "langs": [[k, round(v * 100 / tot, 1), COL.get(k, "#8E8E8E")] for k, v in langs.items()],
        "stars": r["stargazers_count"], "forks": r["forks_count"], "pushed": r["pushed_at"], "topics": r.get("topics", []),
        "created": r["created_at"], "license": (r.get("license") or {}).get("spdx_id"), "parent": (full.get("parent") or {}).get("full_name"),
        "shot": SHOTS.get(r["name"])})
repos.sort(key=lambda x: (x["shot"] is None, x["pushed"]), reverse=False)
if "--cache" not in sys.argv: (HERE / "repos.json").write_text(json.dumps({"built": datetime.datetime.now(datetime.timezone.utc).isoformat(), "repos": repos}, ensure_ascii=False, indent=1))
E = html.escape
MON = "янв фев мар апр мая июн июл авг сен окт ноя дек".split()
def card(r, i):
    d = datetime.datetime.fromisoformat(r["pushed"].replace("Z", "+00:00"))
    when = f"{d.day} {MON[d.month-1]} {d.year}"
    year = r["created"][:4]
    stack = " · ".join(k for k, p, c in sorted(r["langs"], key=lambda x: -x[1]) if p >= 5)
    if r["shot"]:
        s, w, h, alt = r["shot"]
        media = f'<img src="{s}" alt="{E(alt)}" width="{w}" height="{h}" loading="lazy" decoding="async">'
    else:
        media = f'<canvas class="dith" data-dith="{E(r["name"])}" data-l1="{E(stack)}" data-l2="★ {r["stars"]} · forks {r["forks"]} · {E(r["license"] or "")} · {r["created"][:4]}" data-l3="{E(r["desc"])}" width="720" height="450" aria-label="{E(r["name"])}: {E(r["desc"])}" role="img"></canvas>'
    fork = f' · форк {E(r["parent"])}' if r["parent"] else ""
    return f"""<li class="row">
 <a class="row-a" href="{E(r['url'])}" target="_blank" rel="noopener" data-cl="открыть" data-media="{i-1}" aria-describedby="rd{i}">
  <span class="r-no">{i:02d}</span>
  <span class="r-name ln"><span>{E(r['name'])}</span></span>
  <span class="r-meta">{E(stack)}<br><span>{year}</span></span>
 </a>
 <div class="r-sub" id="rd{i}">
  <p class="r-d">{E(r['desc'])}<span class="r-ru">{E(r['ru'])}</span><span class="r-fk">{fork[3:] if fork else ''}</span></p>
  <p class="r-st"><span>★ {r['stars']}</span><span>{E(r['license'] or '')}</span><time datetime="{E(r['pushed'])}" data-pushed>{when}</time><a href="{E(r['url'])}" target="_blank" rel="noopener" class="r-gh" data-cl="github">github ↗</a></p>
 </div>
 <div class="r-x"><div class="r-xi"><div class="media" data-m="{i-1}">{media}</div></div></div>
</li>"""
block = "\n".join(card(r, i + 1) for i, r in enumerate(repos))
p = HERE / "index.html"; s = p.read_text()
s = re.sub(r"<!--repos-->.*?<!--/repos-->", lambda m: f"<!--repos-->\n{block}\n<!--/repos-->", s, flags=re.S)
p.write_text(s); print(len(repos), "repos:", [r["name"] for r in repos])
