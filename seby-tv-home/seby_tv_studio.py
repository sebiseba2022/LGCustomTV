#!/usr/bin/env python3
"""
Seby TV Studio - Control Center, Live Customizer & Multi-Monitor LAN Cast Server
================================================================================
Rulează pe PC (http://localhost:8765) și pe Telefon (http://192.168.1.247:8765):
1. Sincronizare Live în timp real între PC, Telefon (PWA) și Televizorul LG.
2. Customizare completă: culori, rotunjimi (border-radius), efecte blur, dimensiuni,
   texte flotante poziționabile (X% / Y%), carduri și teme.
3. Multi-Monitor LAN Cast (Fără Wi-Fi pe PC!):
   - Suport pentru selectorul interactiv de ecran/fereastră din browser (WebRTC push-frame, 0% ecran negru!)
   - Suport pentru selectarea Monitorului 1, Monitorului 2 sau Toate Monitoarele
   - Streaming filme/video (.mp4, .mkv, .webm), muzică (.mp3) și poze cu derulare HTTP Byte-Range.
"""

import asyncio
import ctypes
import ctypes.wintypes as wt
import hashlib
import io
import json
import mimetypes
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

try:
    import websockets
    HAS_WEBSOCKETS = True
except ImportError:
    HAS_WEBSOCKETS = False

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PROJECT_DIR, "user_config.json")
UPLOADS_DIR = os.path.join(PROJECT_DIR, "cast_uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

import deploy_to_tv

EVENT_LOCK = threading.Lock()
TV_EVENTS = []
NEXT_EVENT_ID = 1
DIRECT_CAST_FILES = {}

# Buffer for frames pushed from the browser's interactive Screen/Window Picker (getDisplayMedia)
LATEST_BROWSER_FRAME = None
LATEST_BROWSER_FRAME_TIME = 0.0

# High-Speed WebSocket Cast Relay (Port 8766) - Zero HTTP polling overhead (25-30 FPS)
WS_VIEWERS = set()
WS_LOOP = None


async def _ws_cast_handler(websocket):
    global LATEST_BROWSER_FRAME, LATEST_BROWSER_FRAME_TIME
    WS_VIEWERS.add(websocket)
    try:
        async for message in websocket:
            if isinstance(message, (bytes, bytearray)):
                LATEST_BROWSER_FRAME = bytes(message)
                LATEST_BROWSER_FRAME_TIME = time.time()
                dead = []
                for viewer in list(WS_VIEWERS):
                    if viewer is not websocket:
                        try:
                            await viewer.send(LATEST_BROWSER_FRAME)
                        except Exception:
                            dead.append(viewer)
                for d in dead:
                    WS_VIEWERS.discard(d)
            elif isinstance(message, str):
                # Relay WebRTC 60FPS Signaling or Instant Remote Button JSON messages
                dead = []
                for peer in list(WS_VIEWERS):
                    if peer is not websocket:
                        try:
                            await peer.send(message)
                        except Exception:
                            dead.append(peer)
                for d in dead:
                    WS_VIEWERS.discard(d)
    except Exception:
        pass
    finally:
        WS_VIEWERS.discard(websocket)


def broadcast_ws_text_message(payload_dict: dict):
    """Trimite instant (sub 5ms) o comandă JSON către toate televizoarele/preview-urile conectate pe WebSocket."""
    if not WS_LOOP or not WS_VIEWERS:
        return
    msg = json.dumps(payload_dict, ensure_ascii=False)

    async def _send_all():
        dead = []
        for peer in list(WS_VIEWERS):
            try:
                await peer.send(msg)
            except Exception:
                dead.append(peer)
        for d in dead:
            WS_VIEWERS.discard(d)

    try:
        asyncio.run_coroutine_threadsafe(_send_all(), WS_LOOP)
    except Exception:
        pass


def start_websocket_cast_server(ws_port: int = 8766):
    if not HAS_WEBSOCKETS:
        return

    def _run():
        global WS_LOOP
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        WS_LOOP = loop

        async def _serve():
            async with websockets.serve(_ws_cast_handler, "0.0.0.0", ws_port, max_size=4 * 1024 * 1024):
                await asyncio.Future()

        try:
            loop.run_until_complete(_serve())
        except Exception:
            pass

    t = threading.Thread(target=_run, daemon=True)
    t.start()


def parse_multipart_file(headers, rfile):
    """Extrage fișierul încărcat dintr-un request multipart/form-data (compatibil Python 3.13+)."""
    ctype = headers.get("Content-Type", "")
    length = int(headers.get("Content-Length", "0"))
    if length <= 0 or "boundary=" not in ctype:
        return None, None
    boundary = ctype.split("boundary=")[1].split(";")[0].strip().encode("utf-8")
    body = rfile.read(length)
    parts = body.split(b"--" + boundary)
    for part in parts:
        if b'filename="' in part and b"\r\n\r\n" in part:
            head_bytes, file_bytes = part.split(b"\r\n\r\n", 1)
            if file_bytes.endswith(b"\r\n"):
                file_bytes = file_bytes[:-2]
            head_str = head_bytes.decode("utf-8", errors="ignore")
            m = re.search(r'filename="([^"]+)"', head_str)
            filename = m.group(1) if m else "upload.bin"
            return filename, file_bytes
    return None, None


def get_local_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("192.168.1.1", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.1.247"


def load_config() -> dict:
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                if "pc_ip" not in cfg or not cfg["pc_ip"]:
                    cfg["pc_ip"] = get_local_lan_ip()
                return cfg
        except Exception:
            pass
    return {"tv_ip": "192.168.1.242", "tv_passphrase": "1DE7AB", "pc_ip": get_local_lan_ip(), "pc_port": 8765, "cards": []}


def save_config(cfg: dict):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def get_config_hash(cfg: dict) -> str:
    raw = json.dumps(cfg, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.md5(raw).hexdigest()


def push_tv_event(event_dict: dict):
    global NEXT_EVENT_ID
    with EVENT_LOCK:
        event_dict["id"] = NEXT_EVENT_ID
        event_dict["ts"] = time.time()
        NEXT_EVENT_ID += 1
        TV_EVENTS.append(event_dict)
        if len(TV_EVENTS) > 20:
            del TV_EVENTS[:-20]
    # Also broadcast immediately over WebSocket (0ms latency)
    broadcast_ws_text_message({"type": "tv_instant_event", "event": event_dict})


def get_pc_quick_stats() -> str:
    host = socket.gethostname()
    return f"{host} • {get_local_lan_ip()}:8765"


def run_ssh_command_on_tv(tv_ip: str, passphrase: str, remote_cmd: str) -> str:
    try:
        import paramiko
        from cryptography.hazmat.primitives import hashes

        key_path = deploy_to_tv.fetch_ssh_key_from_tv(tv_ip)
        paramiko.RSAKey.HASHES["ssh-rsa"] = hashes.SHA1
        paramiko.Transport._key_info["ssh-rsa"] = paramiko.RSAKey
        if "ssh-rsa" not in paramiko.Transport._preferred_keys:
            paramiko.Transport._preferred_keys = tuple(list(paramiko.Transport._preferred_keys) + ["ssh-rsa"])
        if "ssh-rsa" not in paramiko.Transport._preferred_pubkeys:
            paramiko.Transport._preferred_pubkeys = tuple(["ssh-rsa"] + list(paramiko.Transport._preferred_pubkeys))

        pkey = paramiko.RSAKey.from_private_key_file(key_path, password=passphrase)
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=tv_ip,
            port=9922,
            username="prisoner",
            pkey=pkey,
            timeout=6,
            look_for_keys=False,
            allow_agent=False,
            disabled_algorithms={"pubkeys": ["rsa-sha2-512", "rsa-sha2-256"]},
        )
        _, stdout, stderr = client.exec_command(remote_cmd)
        out = stdout.read().decode("utf-8", errors="ignore") + stderr.read().decode("utf-8", errors="ignore")
        client.close()
        return out.strip()
    except Exception as e:
        return f"Eroare SSH: {e}"


# ==============================================================================
# LG SSAP Official Hardware Remote Control Bridge (ws://TV_IP:3000)
# Controls the TV everywhere (even when on HDMI 1, HDMI 2, Live TV, Netflix, YouTube!)
# ==============================================================================
SSAP_CLIENT_KEY = None
SSAP_BUTTON_MAP = {
    "up": "UP",
    "down": "DOWN",
    "left": "LEFT",
    "right": "RIGHT",
    "ok": "ENTER",
    "back": "BACK",
    "home": "HOME",
    "input": "INPUT_HUB",
    "guide": "GUIDE",
    "list": "LIST",
    "more": "MORE_ACTIONS",
    "volup": "VOLUMEUP",
    "voldown": "VOLUMEDOWN",
    "mute": "MUTE",
    "chup": "CHANNELUP",
    "chdown": "CHANNELDOWN",
    "play": "PLAY",
    "pause": "PAUSE",
    "red": "RED",
    "green": "GREEN",
    "yellow": "YELLOW",
    "blue": "BLUE",
    "num0": "0",
    "num1": "1",
    "num2": "2",
    "num3": "3",
    "num4": "4",
    "num5": "5",
    "num6": "6",
    "num7": "7",
    "num8": "8",
    "num9": "9",
}


async def _send_ssap_command_async(tv_ip: str, btn: str, cards: list):
    global SSAP_CLIENT_KEY
    cfg = load_config()
    if not SSAP_CLIENT_KEY:
        SSAP_CLIENT_KEY = cfg.get("ssap_client_key")

    uri = f"ws://{tv_ip}:3000"
    try:
        async with websockets.connect(uri, open_timeout=3, close_timeout=2) as ws:
            reg_payload = {
                "forcePairing": False,
                "pairingType": "PROMPT",
                "manifest": {
                    "manifestVersion": 1,
                    "appVersion": "1.1",
                    "permissions": [
                        "LAUNCH", "LAUNCH_WEBAPP", "APP_TO_APP", "CLOSE",
                        "TEST_OPEN", "TEST_PROTECTED", "CONTROL_AUDIO",
                        "CONTROL_DISPLAY", "CONTROL_INPUT_JOYSTICK",
                        "CONTROL_INPUT_MEDIA_RECORDING", "CONTROL_INPUT_MEDIA_PLAYBACK",
                        "CONTROL_INPUT_TV", "CONTROL_POWER", "READ_APP_STATUS",
                        "READ_CURRENT_CHANNEL", "READ_INPUT_DEVICE_LIST",
                        "READ_NETWORK_STATE", "READ_RUNNING_APPS", "READ_TV_CHANNEL_LIST",
                        "WRITE_NOTIFICATION_TOAST", "READ_POWER_STATE", "READ_COUNTRY_INFO"
                    ]
                }
            }
            if SSAP_CLIENT_KEY:
                reg_payload["client-key"] = SSAP_CLIENT_KEY

            await ws.send(json.dumps({"type": "register", "id": "reg_1", "payload": reg_payload}))

            # Wait for registered response (if prompt shown on TV, wait up to 15s for user to click OK)
            for _ in range(2):
                raw = await asyncio.wait_for(ws.recv(), timeout=15.0)
                resp = json.loads(raw)
                if resp.get("type") == "registered":
                    new_key = resp.get("payload", {}).get("client-key")
                    if new_key and new_key != SSAP_CLIENT_KEY:
                        SSAP_CLIENT_KEY = new_key
                        cfg["ssap_client_key"] = new_key
                        save_config(cfg)
                    break

            # Execute command via SSAP
            if btn == "home":
                await ws.send(json.dumps({
                    "type": "request", "id": "cmd_1",
                    "uri": "ssap://system.launcher/launch",
                    "payload": {"id": "com.seby.customhome"}
                }))
                await asyncio.wait_for(ws.recv(), timeout=3.0)
                return "Deschis Seby TV Home (peste HDMI / TV)"

            if btn == "power":
                await ws.send(json.dumps({"type": "request", "id": "cmd_1", "uri": "ssap://system/turnOff", "payload": {}}))
                await asyncio.wait_for(ws.recv(), timeout=2.0)
                return "TV Power Off"

            if btn == "volup":
                await ws.send(json.dumps({"type": "request", "id": "cmd_1", "uri": "ssap://audio/volumeUp", "payload": {}}))
                await asyncio.wait_for(ws.recv(), timeout=2.0)
                return "Volum +"

            if btn == "voldown":
                await ws.send(json.dumps({"type": "request", "id": "cmd_1", "uri": "ssap://audio/volumeDown", "payload": {}}))
                await asyncio.wait_for(ws.recv(), timeout=2.0)
                return "Volum -"

            if btn == "mute":
                await ws.send(json.dumps({"type": "request", "id": "vol_q", "uri": "ssap://audio/getVolume", "payload": {}}))
                v_resp = json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
                is_muted = v_resp.get("payload", {}).get("muted", False)
                await ws.send(json.dumps({
                    "type": "request", "id": "cmd_1",
                    "uri": "ssap://audio/setMute",
                    "payload": {"mute": not is_muted}
                }))
                await asyncio.wait_for(ws.recv(), timeout=2.0)
                return f"Mute: {'ON' if not is_muted else 'OFF'}"

            if btn == "chup":
                await ws.send(json.dumps({"type": "request", "id": "cmd_1", "uri": "ssap://tv/channelUp", "payload": {}}))
                await asyncio.wait_for(ws.recv(), timeout=2.0)
                return "Canal +"

            if btn == "chdown":
                await ws.send(json.dumps({"type": "request", "id": "cmd_1", "uri": "ssap://tv/channelDown", "payload": {}}))
                await asyncio.wait_for(ws.recv(), timeout=2.0)
                return "Canal -"

            # For hardware remote keys (UP, DOWN, LEFT, RIGHT, ENTER, BACK, numbers, etc.)
            hw_name = SSAP_BUTTON_MAP.get(btn)
            if hw_name:
                await ws.send(json.dumps({
                    "type": "request", "id": "sock_1",
                    "uri": "ssap://com.webos.service.networkinput/getPointerInputSocket",
                    "payload": {}
                }))
                s_resp = json.loads(await asyncio.wait_for(ws.recv(), timeout=3.0))
                sock_path = s_resp.get("payload", {}).get("socketPath")
                if sock_path:
                    async with websockets.connect(sock_path, open_timeout=2, close_timeout=1) as ptr_ws:
                        await ptr_ws.send(f"type:button\nname:{hw_name}\n\n")
                    return f"Tastă Hardware LG trimisă: {hw_name}"
    except Exception as e:
        return f"SSAP fallback: {e}"
    return ""


def get_windows_monitors():
    """Returnează lista monitoarelor conectate [(left, top, right, bottom), ...]."""
    monitors = []
    try:
        def cb(hMon, hDC, lprc, lparam):
            r = lprc.contents
            monitors.append((r.left, r.top, r.right, r.bottom))
            return 1
        MONITORENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_int, wt.HMONITOR, wt.HDC, ctypes.POINTER(wt.RECT), wt.LPARAM)
        ctypes.windll.user32.EnumDisplayMonitors(0, 0, MONITORENUMPROC(cb), 0)
    except Exception:
        pass
    if not monitors:
        monitors = [(0, 0, 1920, 1080)]
    return monitors


def capture_monitor_jpeg_bytes(monitor_param: str = "1") -> bytes:
    """
    Returnează cadrul JPEG pentru Cast Ecran:
    1. Dacă utilizatorul a pornit Selectorul Interactiv de Ecran/Fereastră din browser (WebRTC),
       returnează direct cadrul live trimis de browser (funcționează pe orice monitor/fereastră fără ecran negru!).
    2. Altfel, încearcă captura directă pe monitorul selectat (1, 2 sau 0 = toate) și dacă sesiunea Windows
       blochează GDI, generează un cadru informativ clar care ghidează utilizatorul.
    """
    global LATEST_BROWSER_FRAME, LATEST_BROWSER_FRAME_TIME
    if LATEST_BROWSER_FRAME and (time.time() - LATEST_BROWSER_FRAME_TIME < 4.0 or monitor_param == "browser"):
        return LATEST_BROWSER_FRAME

    from PIL import Image, ImageDraw, ImageGrab

    monitors = get_windows_monitors()
    try:
        idx = int(monitor_param)
    except Exception:
        idx = 1

    img = None
    try:
        if idx == 0 and len(monitors) > 1:
            img = ImageGrab.grab(all_screens=True)
        elif 1 <= idx <= len(monitors):
            bbox = monitors[idx - 1]
            img = ImageGrab.grab(bbox=bbox, all_screens=True)
        else:
            img = ImageGrab.grab()
    except Exception:
        try:
            img = ImageGrab.grab()
        except Exception:
            img = None

    if img is None:
        # Fallback card if OS blocks background GDI capture
        img = Image.new("RGB", (1280, 720), (11, 37, 69))
        draw = ImageDraw.Draw(img)
        draw.rectangle([60, 60, 1220, 660], outline=(20, 184, 166), width=4)
        draw.text((120, 220), "SEBY TV STUDIO - PARTAJARE ECRAN LIVE", fill=(94, 234, 212))
        draw.text(
            (120, 290),
            "Pentru a alege Monitorul 1, Monitorul 2 sau o Fereastra specifica:",
            fill=(255, 255, 255),
        )
        draw.text(
            (120, 350),
            "Apasa in Seby TV Studio (http://localhost:8765) pe butonul:",
            fill=(203, 213, 225),
        )
        draw.text(
            (120, 410),
            "[ Alege Ce Ecran / Fereastra sa Trimiti pe TV ]",
            fill=(56, 189, 248),
        )
    else:
        img = img.resize((1280, 720))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=75)
    return buf.getvalue()


class StudioRequestHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Range")

    def _send_json(self, data: dict, status: int = 200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path in ("/", "/studio", "/studio_ui.html"):
            self._serve_static_file(os.path.join(PROJECT_DIR, "studio_ui.html"), "text/html; charset=utf-8")
            return

        if path in ("/manifest.webmanifest", "/sw.js", "/icon.png", "/largeIcon.png", "/user_config.json",
                    "/com.seby.customhome_1.0.0_all.ipk", "/Porneste_Seby_TV_Studio.bat"):
            fpath = os.path.join(PROJECT_DIR, path.lstrip("/"))
            if os.path.isfile(fpath):
                ctype, _ = mimetypes.guess_type(fpath)
                self._serve_static_file(fpath, ctype or "application/octet-stream")
                return

        if path.startswith("/tv-app/"):
            rel = path[len("/tv-app/"):] or "index.html"
            safe_path = os.path.abspath(os.path.join(PROJECT_DIR, rel))
            if safe_path.startswith(PROJECT_DIR) and os.path.isfile(safe_path):
                ctype, _ = mimetypes.guess_type(safe_path)
                self._serve_static_file(safe_path, ctype or "application/octet-stream")
            else:
                self.send_error(404)
            return

        if path == "/api/config":
            self._send_json(load_config())
            return

        if path == "/api/monitors":
            mons = get_windows_monitors()
            res = [{"index": i + 1, "width": m[2] - m[0], "height": m[3] - m[1], "left": m[0], "top": m[1]} for i, m in enumerate(mons)]
            self._send_json({"monitors": res})
            return

        if path == "/api/tv/poll":
            since = int(query.get("since", ["0"])[0])
            cfg = load_config()
            now_ts = time.time()
            with EVENT_LOCK:
                if since < 0:
                    pending = []
                else:
                    # Only deliver events created in the last 3 seconds! Never replay stale button presses!
                    pending = [e for e in TV_EVENTS if e["id"] > since and (now_ts - e.get("ts", 0)) < 3.0]
            self._send_json({
                "config_hash": get_config_hash(cfg),
                "config": cfg,
                "events": pending,
                "latest_event_id": NEXT_EVENT_ID - 1,
                "pc_stats": get_pc_quick_stats()
            })
            return

        # Single JPEG frame endpoint for smooth double-buffered TV Screen Mirroring (No black screen on webOS 4.5!)
        if path == "/api/cast/screen.jpg":
            mon = query.get("monitor", ["1"])[0]
            jpg = capture_monitor_jpeg_bytes(mon)
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Content-Length", str(len(jpg)))
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.end_headers()
            self.wfile.write(jpg)
            return

        if path.startswith("/api/cast/media/"):
            fname = os.path.basename(path[len("/api/cast/media/"):])
            fpath = os.path.join(UPLOADS_DIR, fname)
            if os.path.isfile(fpath):
                self._serve_media_with_range(fpath)
            else:
                self.send_error(404)
            return

        if path.startswith("/api/cast/direct/"):
            token = path[len("/api/cast/direct/"):].split("/")[0]
            fpath = DIRECT_CAST_FILES.get(token)
            if fpath and os.path.isfile(fpath):
                self._serve_media_with_range(fpath)
            else:
                self.send_error(404)
            return

        self.send_error(404)

    def do_POST(self):
        global LATEST_BROWSER_FRAME, LATEST_BROWSER_FRAME_TIME
        parsed = urlparse(self.path)
        path = parsed.path

        # Receive live JPEG frame from browser's getDisplayMedia screen/window picker
        if path == "/api/cast/push-frame":
            length = int(self.headers.get("Content-Length", "0"))
            if length > 0:
                LATEST_BROWSER_FRAME = self.rfile.read(length)
                LATEST_BROWSER_FRAME_TIME = time.time()
            self._send_json({"ok": True})
            return

        if path == "/api/config":
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            cfg = json.loads(raw.decode("utf-8"))
            save_config(cfg)
            self._send_json({"ok": True, "hash": get_config_hash(cfg)})
            return

        if path == "/api/tv/event":
            length = int(self.headers.get("Content-Length", "0"))
            ev = json.loads(self.rfile.read(length).decode("utf-8"))
            push_tv_event(ev)
            self._send_json({"ok": True})
            return

        if path == "/api/tv/deploy":
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            cfg = load_config()
            tv_ip = body.get("tv_ip") or cfg.get("tv_ip") or "192.168.1.242"
            tv_pass = body.get("tv_passphrase") or cfg.get("tv_passphrase") or "1DE7AB"
            cfg["tv_ip"] = tv_ip
            cfg["tv_passphrase"] = tv_pass
            save_config(cfg)

            try:
                deploy_to_tv.deploy_via_ares_or_paramiko(tv_ip, tv_pass, uninstall=False)
                self._send_json({"ok": True, "output": f"[OK] Seby TV Home a fost compilat, instalat și deschis pe {tv_ip}!"})
            except SystemExit:
                self._send_json({"ok": False, "output": "[!] Eroare la conectarea cu TV-ul."})
            except Exception as e:
                self._send_json({"ok": False, "output": f"[!] Eroare deploy: {e}"})
            return

        if path == "/api/tv/uninstall":
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            cfg = load_config()
            tv_ip = body.get("tv_ip") or cfg.get("tv_ip") or "192.168.1.242"
            tv_pass = body.get("tv_passphrase") or cfg.get("tv_passphrase") or "1DE7AB"
            try:
                deploy_to_tv.deploy_via_ares_or_paramiko(tv_ip, tv_pass, uninstall=True)
                self._send_json({"ok": True, "output": "[OK] Seby TV Home a fost dezinstalat complet! Televizorul este 100% ca din fabrică."})
            except Exception as e:
                self._send_json({"ok": False, "output": f"Eroare: {e}"})
            return

        if path == "/api/tv/ssh-launch":
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            app_id = body.get("appId", "com.seby.customhome")
            cfg = load_config()
            tv_ip = cfg.get("tv_ip", "192.168.1.242")
            tv_pass = cfg.get("tv_passphrase", "1DE7AB")
            cmd = f"/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch '{{\"id\":\"{app_id}\"}}'"
            out = run_ssh_command_on_tv(tv_ip, tv_pass, cmd)
            self._send_json({"ok": True, "message": f"Lansat pe TV ({app_id}): {out}"})
            return

        if path == "/api/tv/remote-button":
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            btn = body.get("button", "")
            cfg = load_config()
            tv_ip = cfg.get("tv_ip", "192.168.1.242")
            tv_pass = cfg.get("tv_passphrase", "1DE7AB")
            cards = cfg.get("cards", [])

            # 1. Push to Seby TV Home web app event queue for instant UI navigation
            push_tv_event({"type": "remote_key", "key": btn})

            # 2. Direct SSH system commands that always work via luna-send-pub (even on HDMI 1!)
            ssh_cmd = None
            if btn == "home":
                ssh_cmd = '/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch \'{"id":"com.seby.customhome"}\''
            elif btn == "power":
                ssh_cmd = '/usr/bin/luna-send-pub -n 1 luna://com.webos.service.tvpower/power/turnOff \'{}\'; /usr/bin/luna-send-pub -n 1 luna://com.webos.service.tv.power/turnOffScreen \'{}\''
            elif btn == "settings":
                ssh_cmd = '/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch \'{"id":"com.palm.app.settings"}\''
            elif btn == "netflix":
                ssh_cmd = '/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch \'{"id":"netflix"}\''
            elif btn == "prime":
                ssh_cmd = '/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch \'{"id":"amazon"}\''
            elif btn == "movies":
                ssh_cmd = '/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch \'{"id":"youtube.leanback.v4"}\''
            elif btn == "guide" or btn == "list":
                ssh_cmd = '/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch \'{"id":"com.webos.app.livetv"}\''
            elif btn == "input":
                ssh_cmd = '/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch \'{"id":"com.webos.app.hdmi1"}\''
            elif btn == "stb":
                ssh_cmd = '/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch \'{"id":"com.webos.app.hdmi2"}\''
            elif btn == "volup":
                ssh_cmd = '/usr/bin/luna-send-pub -n 1 luna://com.webos.audio/volumeUp \'{}\''
            elif btn == "voldown":
                ssh_cmd = '/usr/bin/luna-send-pub -n 1 luna://com.webos.audio/volumeDown \'{}\''
            elif btn == "mute":
                def _toggle_mute_ssh():
                    st = run_ssh_command_on_tv(tv_ip, tv_pass, '/usr/bin/luna-send-pub -n 1 luna://com.webos.audio/getVolume \'{}\'')
                    now_muted = '"muted":true' in st.replace(" ", "")
                    new_val = "false" if now_muted else "true"
                    run_ssh_command_on_tv(tv_ip, tv_pass, f'/usr/bin/luna-send-pub -n 1 luna://com.webos.audio/setMuted \'{{"muted":{new_val}}}\'')
                threading.Thread(target=_toggle_mute_ssh, daemon=True).start()

            if ssh_cmd:
                threading.Thread(target=run_ssh_command_on_tv, args=(tv_ip, tv_pass, ssh_cmd), daemon=True).start()

            # 4. Also dispatch through official LG SSAP WebSocket (port 3000) for Channel Up/Down & hardware keys
            if HAS_WEBSOCKETS and WS_LOOP and btn in ("chup", "chdown", "power", "home", "up", "down", "left", "right", "ok", "back"):
                asyncio.run_coroutine_threadsafe(_send_ssap_command_async(tv_ip, btn, cards), WS_LOOP)

            self._send_json({"ok": True, "message": f"Comandă executată pe TV: {btn}"})
            return

        if path == "/api/cast/upload":
            orig_filename, file_bytes = parse_multipart_file(self.headers, self.rfile)
            if not orig_filename or file_bytes is None:
                self._send_json({"ok": False, "error": "Niciun fișier primit"}, 400)
                return

            orig_name = os.path.basename(orig_filename)
            safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", orig_name)
            dest_path = os.path.join(UPLOADS_DIR, safe_name)
            with open(dest_path, "wb") as f:
                f.write(file_bytes)

            mtype = self._detect_cast_media_type(safe_name)
            media_url = f"/api/cast/media/{safe_name}?t={int(time.time())}"

            cfg = load_config()
            run_ssh_command_on_tv(
                cfg.get("tv_ip", "192.168.1.242"),
                cfg.get("tv_passphrase", "1DE7AB"),
                '/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch \'{"id":"com.seby.customhome"}\''
            )
            push_tv_event({
                "type": "cast_media",
                "mediaType": mtype,
                "url": media_url,
                "title": orig_name
            })
            self._send_json({"ok": True, "url": media_url, "mediaType": mtype, "title": orig_name})
            return

        if path == "/api/cast/local-path":
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            disk_path = body.get("path", "").strip().strip('"')
            if not os.path.isfile(disk_path):
                self._send_json({"ok": False, "error": f"Fișierul nu a fost găsit pe PC: {disk_path}"})
                return

            token = hashlib.md5(disk_path.encode("utf-8")).hexdigest()[:12]
            DIRECT_CAST_FILES[token] = disk_path
            fname = os.path.basename(disk_path)
            mtype = self._detect_cast_media_type(fname)
            media_url = f"/api/cast/direct/{token}/{fname}"

            cfg = load_config()
            run_ssh_command_on_tv(
                cfg.get("tv_ip", "192.168.1.242"),
                cfg.get("tv_passphrase", "1DE7AB"),
                '/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch \'{"id":"com.seby.customhome"}\''
            )
            push_tv_event({
                "type": "cast_media",
                "mediaType": mtype,
                "url": media_url,
                "title": fname
            })
            self._send_json({"ok": True, "message": f"Streaming direct pornit pe TV: {fname}"})
            return

        if path == "/api/wallpaper/upload":
            orig_filename, file_bytes = parse_multipart_file(self.headers, self.rfile)
            if not orig_filename or file_bytes is None:
                self._send_json({"ok": False}, 400)
                return
            ext = os.path.splitext(orig_filename)[1] or ".jpg"
            wp_name = f"custom_wallpaper{ext}"
            dest_path = os.path.join(UPLOADS_DIR, wp_name)
            with open(dest_path, "wb") as f:
                f.write(file_bytes)
            wp_url = f"/api/cast/media/{wp_name}?t={int(time.time())}"
            self._send_json({"ok": True, "url": wp_url})
            return

        self.send_error(404)

    def _detect_cast_media_type(self, filename: str) -> str:
        ext = os.path.splitext(filename.lower())[1]
        if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"):
            return "image"
        if ext in (".mp3", ".wav", ".ogg", ".flac", ".m4a"):
            return "audio"
        return "video"

    def _serve_static_file(self, fpath: str, content_type: str):
        with open(fpath, "rb") as f:
            data = f.read()
        self.send_response(200)
        self._send_cors_headers()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def _serve_media_with_range(self, fpath: str):
        file_size = os.path.getsize(fpath)
        ctype, _ = mimetypes.guess_type(fpath)
        ctype = ctype or "application/octet-stream"

        range_header = self.headers.get("Range")
        start, end = 0, file_size - 1
        status = 200

        if range_header and range_header.startswith("bytes="):
            status = 206
            parts = range_header[6:].split("-")
            if parts[0]:
                start = int(parts[0])
            if len(parts) > 1 and parts[1]:
                end = int(parts[1])
            end = min(end, file_size - 1)

        chunk_len = (end - start) + 1
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(chunk_len))
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        self.end_headers()

        with open(fpath, "rb") as f:
            f.seek(start)
            remaining = chunk_len
            while remaining > 0:
                buf = f.read(min(65536, remaining))
                if not buf:
                    break
                try:
                    self.wfile.write(buf)
                except Exception:
                    break
                remaining -= len(buf)


def main():
    cfg = load_config()
    port = int(cfg.get("pc_port", 8765))
    lan_ip = get_local_lan_ip()
    cfg["pc_ip"] = lan_ip
    save_config(cfg)

    start_websocket_cast_server(port + 1)
    server = ThreadingHTTPServer(("0.0.0.0", port), StudioRequestHandler)
    print("=========================================================================")
    print(" SEBY TV STUDIO (PC & TELEFON) & HIGH-FPS WEBSOCKET CAST PORNIT!")
    print(f" -> Deschide pe Calculator: http://localhost:{port}")
    print(f" -> Deschide pe Telefon:    http://{lan_ip}:{port}")
    print(f" -> Turbo WebSocket Cast:   ws://{lan_ip}:{port + 1}")
    print("=========================================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
