"""Import the newest browser-tested build for each catalog entry."""

from argparse import ArgumentParser
from functools import partial
from hashlib import sha256
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen
import base64
import json
import os
import re
import shutil
import subprocess
import time

from PIL import Image, ImageStat
import websocket


PROJECT = Path(__file__).resolve().parents[1]
ASSET_TYPES = set(".html .htm .css .js .mjs .json .csv .txt .svg .png .jpg .jpeg .gif .webp .ico .woff .woff2 .ttf .otf .mp4 .webm .mp3 .ogg .wav .wasm .glb .gltf .bin .pdf".split())
ASSET_DIRS = {"assets", "images", "media", "fonts", "data", "models", "sounds"}
TEXT_TYPES = {".html", ".htm", ".css", ".js", ".mjs", ".json"}
ROOT = "/simulations/"
LEGACY_LOGO = b"../Sim4_Screentime/Simfluence-white-GrS-scaled.webp"


class Links(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.references = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if value and name in {"src", "href", "poster"}:
                self.references.append(value)


def entrypoint(workspace, name):
    source = (workspace / name).resolve()
    if source.parent != workspace:
        raise ValueError(f"Invalid source folder: {name}")
    for relative in ("dist/index.html", "out/index.html", "build/index.html", "index.html"):
        candidate = source / relative
        if candidate.is_file():
            return candidate.resolve()
    raise FileNotFoundError(f"No built index.html in {name}")


def local_reference(value, current, root):
    try:
        uri = urlsplit(value)
    except ValueError:
        return None
    if uri.scheme or uri.netloc or not uri.path or uri.path.startswith("/"):
        return None
    path = (current.parent / unquote(uri.path)).resolve()
    if path.is_dir():
        path = path / "index.html"
    if path.is_relative_to(root) and path.suffix.lower() in ASSET_TYPES and path.is_file():
        if not any(part.startswith(".") for part in path.relative_to(root).parts):
            return path
    return None


def package_files(index):
    root = index.parent
    pending = [index]
    for directory in (child for child in root.iterdir() if child.is_dir() and child.name in ASSET_DIRS):
        for path in directory.rglob("*"):
            if path.is_file() and path.suffix.lower() in ASSET_TYPES and path.resolve().is_relative_to(root):
                if not any(part.startswith(".") for part in path.relative_to(root).parts):
                    pending.append(path)
    files = set()
    while pending:
        path = pending.pop()
        if path in files:
            continue
        files.add(path)
        if path.suffix.lower() not in TEXT_TYPES:
            continue
        content = path.read_text(encoding="utf-8-sig", errors="replace")
        refs = re.findall(r"url\(\s*['\"]?([^'\"\)]+)", content, re.I)
        refs += re.findall(r"['\"`]([^'\"`\r\n<>]{1,240}\.[a-zA-Z0-9]{2,5}(?:\?[^'\"`\r\n]*)?)['\"`]", content)
        if path.suffix.lower() in {".html", ".htm"}:
            refs.extend(Links(content).references)
        for ref in refs:
            resolved = local_reference(ref.strip(), path, root)
            if resolved:
                pending.append(resolved)
    return sorted(files)


def version(index, files, shared_logo):
    checksum = sha256()
    for path in files:
        data = path.read_bytes()
        if path.suffix.lower() in TEXT_TYPES and re.search(rb"AIza[0-9A-Za-z_-]{35}|gh[pousr]_[A-Za-z0-9_]{36,}|sk-(?:proj-)?[A-Za-z0-9_-]{35,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", data):
            raise ValueError(f"Possible credential in {path}")
        checksum.update(path.relative_to(index.parent).as_posix().encode() + b"\0")
        checksum.update(sha256(data).digest())
        if LEGACY_LOGO in data:
            checksum.update(sha256(shared_logo.read_bytes()).digest())
    return checksum.hexdigest()


def copy_candidate(index, files, target, shared_logo):
    for path in files:
        destination = target / path.relative_to(index.parent)
        destination.parent.mkdir(parents=True, exist_ok=True)
        if path.suffix.lower() in TEXT_TYPES:
            source = path.read_bytes()
            if LEGACY_LOGO in source:
                relative_logo = Path(os.path.relpath(shared_logo, destination.parent)).as_posix().encode()
                destination.write_bytes(source.replace(LEGACY_LOGO, relative_logo))
                continue
        shutil.copy2(path, destination)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class Server(ThreadingHTTPServer):
    def handle_error(self, request, address):
        from sys import exc_info
        if not isinstance(exc_info()[1], (ConnectionAbortedError, ConnectionResetError, BrokenPipeError)):
            super().handle_error(request, address)


class Browser:
    def __init__(self, binary, profile, software=False):
        self.profile = profile
        flags = {"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}
        rendering = ["--disable-gpu"] if software else ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
        self.process = subprocess.Popen([
            binary, "--headless=new", "--no-first-run", "--disable-background-networking", *rendering,
            "--hide-scrollbars",
            "--remote-debugging-port=0", f"--user-data-dir={profile}", "about:blank",
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **flags)
        self.socket = None
        self.counter = 0

    def __enter__(self):
        try:
            port_file = self.profile / "DevToolsActivePort"
            for _ in range(100):
                if self.process.poll() is not None:
                    raise RuntimeError("Chromium exited during startup")
                if port_file.is_file():
                    port = port_file.read_text().splitlines()[0]
                    with urlopen(f"http://127.0.0.1:{port}/json/list", timeout=5) as response:
                        tab = next(tab for tab in json.load(response) if tab["type"] == "page")
                    self.socket = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=12, suppress_origin=True)
                    break
                time.sleep(.1)
            if not self.socket:
                raise RuntimeError("Chromium did not start")
            self.command("Page.enable")
            self.command("Emulation.setDeviceMetricsOverride", width=1280, height=720, deviceScaleFactor=1, mobile=False)
            self.command("Page.addScriptToEvaluateOnNewDocument", source="""
              window.catalogErrors = [];
              addEventListener('error', event => {
                if (event.error) catalogErrors.push(event.message);
                else if (event.target?.matches?.('script, link[rel="stylesheet"], img')) {
                  const resource = event.target.src || event.target.href;
                  if (resource && new URL(resource, location.href).origin === location.origin) catalogErrors.push(resource);
                }
              }, true);
              addEventListener('unhandledrejection', event => catalogErrors.push(String(event.reason)));
            """)
            return self
        except Exception:
            self.__exit__()
            raise

    def __exit__(self, *_):
        if self.socket:
            try:
                self.socket.send(json.dumps({"id": self.counter + 1, "method": "Browser.close"}))
            except websocket.WebSocketException:
                pass
            finally:
                self.socket.shutdown()
        try:
            self.process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait()

    def command(self, method, **params):
        self.counter += 1
        self.socket.send(json.dumps({"id": self.counter, "method": method, "params": params}))
        while True:
            message = json.loads(self.socket.recv())
            if message.get("id") == self.counter:
                if "error" in message:
                    raise RuntimeError(message["error"].get("message"))
                return message["result"]

    def evaluate(self, expression):
        result = self.command("Runtime.evaluate", expression=expression, returnByValue=True)
        if "exceptionDetails" in result:
            raise RuntimeError(result["result"].get("description", "Browser evaluation failed"))
        return result["result"].get("value")

    def preview(self, url, thumbnail):
        with urlopen(url, timeout=10) as page:
            if page.status != 200 or page.headers.get_content_type() != "text/html":
                raise RuntimeError(f"Expected HTML at {url}")
        navigation = self.command("Page.navigate", url=url)
        if navigation.get("errorText"):
            raise RuntimeError(navigation["errorText"])
        for _ in range(60):
            status = self.evaluate("""({url: location.href, ready: document.readyState,
              rendered: (document.body?.innerText.trim().length ?? 0) > 24 || !!document.querySelector('canvas')})""")
            if status["url"].rstrip("/") == url.rstrip("/") and status["ready"] == "complete" and status["rendered"]:
                break
            time.sleep(.1)
        else:
            raise RuntimeError(f"Page did not render at {url}: {status}")
        time.sleep(.28)
        errors = self.evaluate("window.catalogErrors || []")
        if errors:
            raise RuntimeError("; ".join(errors[:3]))
        self.socket.settimeout(5)
        screenshot = self.command("Page.captureScreenshot", format="png", captureBeyondViewport=False)
        with Image.open(BytesIO(base64.b64decode(screenshot["data"]))) as image:
            image = image.convert("RGB").resize((640, 360), Image.Resampling.LANCZOS)
            if max(ImageStat.Stat(image).stddev) < 3:
                raise RuntimeError("Browser rendered an effectively blank page")
            image.save(thumbnail, "WEBP", quality=76, method=4)


def locate_browser(requested):
    if requested:
        return requested
    for path in (
        shutil.which("chromium"), shutil.which("google-chrome"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ):
        if path and Path(path).is_file():
            return str(path)
    raise RuntimeError("Supply the Chrome or Chromium executable with --browser")


def take_preview(binary, temporary, url, thumbnail):
    for attempt in range(2):
        with TemporaryDirectory(prefix="browser-", dir=temporary, ignore_cleanup_errors=True) as profile:
            try:
                with Browser(binary, Path(profile), software=bool(attempt)) as browser:
                    browser.preview(url, thumbnail)
                return
            except websocket.WebSocketException as error:
                if attempt == 1:
                    raise RuntimeError(f"Browser could not finish loading {url}: {error}") from error


def refresh(workspace, browser_path):
    manifest = json.loads((PROJECT / "catalog-sources.json").read_text(encoding="utf-8"))
    ids = [entry["id"] for entry in manifest]
    if len(ids) != len(set(ids)) or not all(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) for slug in ids):
        raise ValueError("Each entry needs a unique, stable slug")

    published = PROJECT / "dist"
    previous_file = PROJECT / "catalog.lock.json"
    previous = json.loads(previous_file.read_text(encoding="utf-8")) if previous_file.is_file() and published.is_dir() else {}
    cache = PROJECT / ".catalog-previews"
    cache.mkdir(exist_ok=True)
    cards, versions = [], {}

    with TemporaryDirectory(prefix=".catalog-", dir=PROJECT) as temporary:
        temp = Path(temporary)
        site = temp / "simulations"
        shutil.copytree(PROJECT / "site", site)
        (site / "thumbs").mkdir()
        (site / "labs").mkdir()
        shared_logo = site / "media" / "simfluence.webp"
        shared_logo.parent.mkdir()
        shutil.copy2(workspace / "Sim4_Screentime" / "Simfluence-white-GrS-scaled.webp", shared_logo)
        origin_for_url = partial(Handler, directory=temp)
        with Server(("127.0.0.1", 0), origin_for_url) as server:
            worker = Thread(target=server.serve_forever, daemon=True)
            worker.start()
            origin = f"http://127.0.0.1:{server.server_port}{ROOT}"
            try:
                for entry in manifest:
                    slug = entry["id"]
                    thumbnail = site / "thumbs" / f"{slug}.webp"
                    target = site / "labs" / slug
                    old = previous.get(slug)
                    chosen = None
                    href = entry.get("url", f"./labs/{slug}/")
                    problems = []
                    if "url" in entry:
                        try:
                            url = urlsplit(href)
                            if url.scheme != "https" or url.netloc != "siimkl.github.io":
                                raise ValueError("Public links must point to the selected GitHub Pages account")
                            take_preview(browser_path, temp, href, thumbnail)
                            chosen = {"url": href}
                        except (OSError, RuntimeError, ValueError) as error:
                            problems.append(str(error))
                    else:
                        candidates = []
                        for name in entry["sources"]:
                            try:
                                index = entrypoint(workspace, name)
                                files = package_files(index)
                                stamp = max(path.stat().st_mtime_ns for path in files)
                                candidates.append((stamp, name, index, files))
                            except (OSError, ValueError) as error:
                                problems.append(f"{name}: {error}")
                        for _, name, index, files in sorted(candidates, reverse=True):
                            try:
                                fingerprint = version(index, files, shared_logo)
                                cached_thumbnail = cache / f"{fingerprint}.webp"
                                if target.exists():
                                    if target.resolve().parent != (site / "labs").resolve():
                                        raise ValueError(f"Invalid candidate destination: {target}")
                                    shutil.rmtree(target)
                                copy_candidate(index, files, target, shared_logo)
                                if old == {"source": name, "revision": fingerprint} and (published / "thumbs" / thumbnail.name).is_file():
                                    shutil.copy2(published / "thumbs" / thumbnail.name, thumbnail)
                                elif cached_thumbnail.is_file():
                                    shutil.copy2(cached_thumbnail, thumbnail)
                                else:
                                    take_preview(browser_path, temp, origin + href.removeprefix("./"), thumbnail)
                                    shutil.copy2(thumbnail, cached_thumbnail)
                                chosen = {"source": name, "revision": fingerprint}
                                break
                            except (OSError, RuntimeError, ValueError) as error:
                                problems.append(f"{name}: {error}")

                    if chosen is None:
                        if old and (published / "thumbs" / thumbnail.name).is_file():
                            shutil.copy2(published / "thumbs" / thumbnail.name, thumbnail)
                            if "source" in old:
                                if target.exists():
                                    if target.resolve().parent != (site / "labs").resolve():
                                        raise ValueError(f"Invalid fallback destination: {target}")
                                    shutil.rmtree(target)
                                shutil.copytree(published / "labs" / slug, target)
                            href = old.get("url", f"./labs/{slug}/")
                            chosen = old
                            print(f"{slug}: kept the last verified version ({' | '.join(problems)})", flush=True)
                        else:
                            print(f"FAILED {slug}: {' | '.join(problems)}", flush=True)
                            continue
                    elif problems:
                        print(f"{slug}: skipped a candidate ({' | '.join(problems)})", flush=True)

                    versions[slug] = chosen
                    cards.append({
                        **{key: entry[key] for key in ("id", "title", "description", "topics", "en")},
                        "keywords": entry.get("keywords", []), "href": href, "image": f"./thumbs/{thumbnail.name}",
                    })
                    print(f"OK {slug}: {chosen.get('source', chosen.get('url'))}", flush=True)
            finally:
                server.shutdown()
                worker.join()

        if len(cards) != len(manifest):
            raise RuntimeError(f"Verified {len(cards)} of {len(manifest)} entries. No catalog replacement.")
        (site / "catalog.json").write_text(json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        backup = temp / "previous-dist"
        if published.exists():
            if published.resolve().parent != PROJECT:
                raise ValueError("Invalid existing publication folder")
            published.replace(backup)
        try:
            site.replace(published)
        except OSError:
            if backup.exists():
                backup.replace(published)
            raise
        previous_file.write_text(json.dumps(versions, indent=2) + "\n", encoding="utf-8")
        print(f"Catalog ready with {len(cards)} entries", flush=True)


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", type=Path, default=PROJECT.parent)
    parser.add_argument("--browser")
    args = parser.parse_args()
    refresh(args.workspace.resolve(), locate_browser(args.browser))


if __name__ == "__main__":
    main()
