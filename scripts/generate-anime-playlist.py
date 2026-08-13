#!/usr/bin/env python3
"""生成二次元日漫歌单 livePlaylist.ts（含内嵌逐字歌词）"""
import json, re, urllib.request, time

SRC = r"E:/项目/博客/live_data/anime_playlist.json"
OUT = r"E:/项目/博客/src/data/livePlaylist.ts"
TAKE = 12  # 精选首数

def fetch(url, timeout=10):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "ignore")

def parse_lrc(text):
    """解析 LRC → [[ms, text], ...]"""
    out = []
    for line in text.splitlines():
        line = line.strip()
        # 匹配多个时间标签 + 文本
        m = re.findall(r"\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]", line)
        if not m:
            continue
        # 文本 = 去掉所有时间标签后的部分
        body = re.sub(r"\[[^\]]*\]", "", line).strip()
        if not body:
            continue
        mm, ss = int(m[0][0]), int(m[0][1])
        ms = mm * 60000 + ss * 1000
        if len(m[0]) > 2 and m[0][2]:
            frac = m[0][2].ljust(3, "0")[:3]
            ms += int(frac)
        out.append([ms, body])
    return out

def main():
    with open(SRC, encoding="utf-8") as f:
        songs = json.load(f)

    picked = []
    seen_names = set()
    for s in songs:
        if len(picked) >= TAKE:
            break
        name = s.get("name", "")
        if not name or name in seen_names:
            continue
        # 跳过 TV Size 重复版本（保留完整版）
        if "TV Size" in name:
            continue
        seen_names.add(name)
        m = re.search(r"id=(\d+)", s.get("url", ""))
        if not m:
            continue
        netease_id = int(m.group(1))
        picked.append({"name": name, "artist": s.get("artist", ""),
                       "neteaseId": netease_id, "pic": s.get("pic", ""),
                       "lrc": s.get("lrc", "")})

    print(f"精选 {len(picked)} 首，拉取歌词...")
    entries = []
    for i, p in enumerate(picked):
        lyric = []
        if p["lrc"]:
            try:
                raw = fetch(p["lrc"])
                lyric = parse_lrc(raw)
            except Exception as e:
                print(f"  歌词拉取失败 {p['name']}: {e}")
        print(f"  {i+1}. {p['name']} - {p['artist']} ({len(lyric)} 行歌词)")
        entries.append({
            "id": f'netease-{p["neteaseId"]}',
            "name": p["name"],
            "artist": p["artist"],
            "cover": p["pic"],
            "src": f'http://47.104.189.4/music/?server=netease&type=url&id={p["neteaseId"]}',
            "neteaseId": p["neteaseId"],
            "lrcUrl": f'http://47.104.189.4/music/?server=netease&type=lrc&id={p["neteaseId"]}',
            "lyric": lyric,
        })

    # 生成 TS
    def lyric_ts(ly):
        return "[" + ",".join(f"[{ms},{json.dumps(txt, ensure_ascii=False)}]" for ms, txt in ly) + "]"

    lines = []
    lines.append("// AUTO-GENERATED：二次元日漫歌单（网易云歌单 9564103735 精选）")
    lines.append("// 由 scripts/generate-anime-playlist.py 生成，含内嵌逐字歌词。")
    lines.append("import type { Playlist } from '@/types'")
    lines.append("")
    lines.append("export const LIVE_PLAYLIST: Playlist = {")
    lines.append("  id: 'live-anime',")
    lines.append("  name: '二次元日漫精选',")
    lines.append(f"  cover: \"{entries[0]['cover']}\",")
    lines.append("  description: '二次元日漫歌曲精选（网易云歌单 9564103735）',")
    lines.append("  songs: [")
    for e in entries:
        lines.append("    {")
        lines.append(f"      id: \"{e['id']}\",")
        lines.append(f"      name: {json.dumps(e['name'], ensure_ascii=False)},")
        lines.append(f"      artist: {json.dumps(e['artist'], ensure_ascii=False)},")
        lines.append(f"      album: \"\",")
        lines.append(f"      cover: {json.dumps(e['cover'], ensure_ascii=False)},")
        lines.append(f"      src: \"{e['src']}\",")
        lines.append("      duration: 0,")
        lines.append(f"      neteaseId: {e['neteaseId']},")
        lines.append(f"      lrcUrl: \"{e['lrcUrl']}\",")
        lines.append(f"      lyric: {lyric_ts(e['lyric'])},")
        lines.append("    },")
    lines.append("  ],")
    lines.append("}")
    lines.append("")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"已写入 {OUT}")

if __name__ == "__main__":
    main()
