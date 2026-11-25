"""Verify that a deployment contains each catalog card and its launch files."""

from pathlib import Path
from urllib.parse import urlsplit
import json


project = Path(__file__).resolve().parents[1]
site = project / "dist"
manifest = json.loads((project / "catalog-sources.json").read_text(encoding="utf-8"))
catalog = json.loads((site / "catalog.json").read_text(encoding="utf-8"))
lock = json.loads((project / "catalog.lock.json").read_text(encoding="utf-8"))

assert (site / "index.html").is_file()
assert (site / "catalog.js").is_file()
assert (site / "site.css").is_file()
assert (site / "manrope.woff2").is_file()
assert [item["id"] for item in catalog] == [item["id"] for item in manifest]
assert set(lock) == {item["id"] for item in catalog}
for item in catalog:
    slug = item["id"]
    assert item["title"] and item["description"] and item["topics"], slug
    assert item["image"] == f"./thumbs/{slug}.webp", slug
    assert (site / "thumbs" / f"{slug}.webp").read_bytes()[:4] == b"RIFF", slug
    if "url" in lock[slug]:
        target = urlsplit(item["href"])
        assert target.scheme == "https" and target.netloc == "siimkl.github.io", slug
        assert item["href"] == lock[slug]["url"], slug
    else:
        assert item["href"] == f"./labs/{slug}/", slug
        assert (site / "labs" / slug / "index.html").is_file(), slug

assert not any(path.name.startswith(".") for path in site.rglob("*"))
print(f"Verified {len(catalog)} catalog entries")
