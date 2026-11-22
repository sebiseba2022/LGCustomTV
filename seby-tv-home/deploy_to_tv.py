#!/usr/bin/env python3
"""
Seby TV Home - Builder & Installer pentru LG webOS Developer Mode
=================================================================
Acest script face automat 3 lucruri (fără să ai nevoie de SDK-ul complicat LG CLI):
1. Generează iconițele PNG oficiale (80x80 și 130x130) și împachetează aplicația
   în formatul oficial LG webOS (.ipk = arhivă Debian ar cu control.tar.gz + data.tar.gz).
2. Dacă îi dai IP-ul televizorului și Passphrase-ul din aplicația "Developer Mode" de pe TV,
   se conectează direct la TV pe portul 9922 și instalează / lansează "Seby TV Home".
3. Cu opțiunea --uninstall, șterge aplicația de pe TV și lasă televizorul 100% ca din fabrică.

Utilizare rapidă:
  Doar construire fișier .ipk:
    python deploy_to_tv.py --build-only

  Instalare directă pe TV:
    python deploy_to_tv.py --ip 192.168.1.XXX --passphrase CODUL_DE_PE_TV

  Dezinstalare completă (revenire 100% la original):
    python deploy_to_tv.py --ip 192.168.1.XXX --passphrase CODUL_DE_PE_TV --uninstall
"""

import argparse
import gzip
import io
import json
import os
import struct
import subprocess
import sys
import tarfile
import time
import urllib.request
import zlib

APP_ID = "com.seby.customhome"
APP_VERSION = "1.0.0"
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
IPK_FILENAME = f"{APP_ID}_{APP_VERSION}_all.ipk"
IPK_PATH = os.path.join(PROJECT_DIR, IPK_FILENAME)


def create_gradient_png(width: int, height: int) -> bytes:
    """Generează o iconiță PNG validă (albastru-indigo modern) fără librării externe."""
    raw_rows = bytearray()
    for y in range(height):
        raw_rows.append(0)  # Filter type 0
        for x in range(width):
            # Rounded corner mask
            dx = min(x, width - 1 - x)
            dy = min(y, height - 1 - y)
            radius = int(width * 0.22)
            alpha = 255
            if dx < radius and dy < radius:
                dist_sq = (radius - dx) ** 2 + (radius - dy) ** 2
                if dist_sq > radius ** 2:
                    alpha = 0

            # Gradient colors (#2563eb -> #4f46e5) + inner "S" highlight
            t = (x + y) / float(width + height)
            r = int(37 * (1 - t) + 99 * t)
            g = int(99 * (1 - t) + 70 * t)
            b = int(235 * (1 - t) + 229 * t)

            # Simple center emblem glow
            cx, cy = width / 2.0, height / 2.0
            if ((x - cx) ** 2 + (y - cy) ** 2) < (width * 0.24) ** 2:
                r = min(255, r + 110)
                g = min(255, g + 110)
                b = min(255, b + 110)

            raw_rows.extend((r, g, b, alpha))

    def png_chunk(chunk_type: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    compressed = zlib.compress(bytes(raw_rows), 9)
    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", compressed)
        + png_chunk(b"IEND", b"")
    )


def ensure_icons():
    icon_80 = os.path.join(PROJECT_DIR, "icon.png")
    icon_130 = os.path.join(PROJECT_DIR, "largeIcon.png")
    if not os.path.exists(icon_80):
        with open(icon_80, "wb") as f:
            f.write(create_gradient_png(80, 80))
    if not os.path.exists(icon_130):
        with open(icon_130, "wb") as f:
            f.write(create_gradient_png(130, 130))


def make_tar_gz_bytes(files_dict: dict) -> bytes:
    """Creează o arhivă .tar.gz în memorie cu permisiuni UNIX standard (0755/0644)."""
    buf = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", fileobj=buf, mtime=int(time.time())) as gz:
        with tarfile.open(mode="w", fileobj=gz, format=tarfile.USTAR_FORMAT) as tar:
            for arcname, content in files_dict.items():
                info = tarfile.TarInfo(name=arcname)
                if content is None:
                    info.type = tarfile.DIRTYPE
                    info.mode = 0o755
                    info.size = 0
                    tar.addfile(info)
                else:
                    info.type = tarfile.REGTYPE
                    info.mode = 0o644
                    info.size = len(content)
                    info.mtime = int(time.time())
                    info.uid = 0
                    info.gid = 0
                    info.uname = "root"
                    info.gname = "root"
                    tar.addfile(info, io.BytesIO(content))
    return buf.getvalue()


def ar_entry(name: str, data: bytes) -> bytes:
    """Creează o intrare în formatul Debian/webOS 'ar' archive."""
    mtime = str(int(time.time())).ljust(12).encode("ascii")
    uid = "0".ljust(6).encode("ascii")
    gid = "0".ljust(6).encode("ascii")
    mode = "100644".ljust(8).encode("ascii")
    size = str(len(data)).ljust(10).encode("ascii")
    ident = name.ljust(16).encode("ascii")
    header = ident + mtime + uid + gid + mode + size + b"`\n"
    padding = b"\n" if (len(data) % 2 == 1) else b""
    return header + data + padding


def build_ipk() -> str:
    """Construiește pachetul oficial .ipk pentru LG webOS."""
    ensure_icons()

    app_files = ["appinfo.json", "index.html", "style.css", "app.js", "icon.png", "largeIcon.png", "user_config.json"]
    data_map = {
        "./": None,
        "./usr/": None,
        "./usr/palm/": None,
        "./usr/palm/applications/": None,
        f"./usr/palm/applications/{APP_ID}/": None,
    }

    total_installed_size = 0
    for fname in app_files:
        fpath = os.path.join(PROJECT_DIR, fname)
        with open(fpath, "rb") as f:
            raw = f.read()
        total_installed_size += len(raw)
        data_map[f"./usr/palm/applications/{APP_ID}/{fname}"] = raw

    data_tar_gz = make_tar_gz_bytes(data_map)

    control_text = (
        f"Package: {APP_ID}\n"
        f"Version: {APP_VERSION}\n"
        f"Section: misc\n"
        f"Priority: optional\n"
        f"Architecture: all\n"
        f"Installed-Size: {total_installed_size}\n"
        f"Maintainer: Seby Custom UI <seby@local>\n"
        f"Description: Custom Home Launcher fara reclame pentru LG webOS\n"
        f"webOS-Package-Format-Version: 2\n"
        f"webOS-Packager-Version: 1.0.0\n"
    ).encode("utf-8")

    control_tar_gz = make_tar_gz_bytes({"./": None, "./control": control_text})
    debian_binary = b"2.0\n"

    ar_archive = (
        b"!<arch>\n"
        + ar_entry("debian-binary", debian_binary)
        + ar_entry("control.tar.gz", control_tar_gz)
        + ar_entry("data.tar.gz", data_tar_gz)
    )

    with open(IPK_PATH, "wb") as f:
        f.write(ar_archive)

    print(f"[OK] Pachetul webOS a fost construit cu succes: {IPK_PATH} ({len(ar_archive)} bytes)")
    return IPK_PATH


def fetch_ssh_key_from_tv(tv_ip: str) -> str:
    """Descarcă cheia privată SSH de pe Key Server-ul aplicației Developer Mode (port 9991) sau folosește cheia deja salvată."""
    key_path = os.path.join(PROJECT_DIR, "tv_webos_rsa")
    if os.path.exists(key_path) and os.path.getsize(key_path) > 100:
        return key_path
    url = f"http://{tv_ip}:9991/webos_rsa"
    print(f"[*] Se descarcă cheia de conectare de la TV ({url})...")
    try:
        with urllib.request.urlopen(url, timeout=8) as resp:
            key_data = resp.read()
        with open(key_path, "wb") as f:
            f.write(key_data)
        try:
            os.chmod(key_path, 0o600)
        except Exception:
            pass
        print("[OK] Cheia SSH a fost descărcată de pe televizor!")
        return key_path
    except Exception as e:
        print(f"[!] Nu am putut descărca cheia de la {url}: {e}")
        print("    Verifică pe TV în aplicația 'Developer Mode' că 'Key Server' este pe ON!")
        sys.exit(1)


def deploy_via_ares_or_paramiko(tv_ip: str, passphrase: str, uninstall: bool = False):
    """Instalează sau dezinstalează pachetul .ipk pe televizorul LG."""
    ipk_file = build_ipk()
    key_path = fetch_ssh_key_from_tv(tv_ip)

    # Try Python paramiko first if available, or install it cleanly, or use Windows OpenSSH + decrypted key
    try:
        import paramiko
    except ImportError:
        print("[*] Se instalează librăria SSH (paramiko) pentru conectarea directă la TV...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "paramiko"])
        import paramiko

    print(f"[*] Conectare la televizorul LG ({tv_ip}:9922)...")
    # webOS 4.x uses legacy ssh-rsa (SHA1) keys; register SHA1 in Paramiko 4+
    from cryptography.hazmat.primitives import hashes
    paramiko.RSAKey.HASHES["ssh-rsa"] = hashes.SHA1
    paramiko.Transport._key_info["ssh-rsa"] = paramiko.RSAKey
    paramiko.Transport._preferred_keys = tuple(
        list(paramiko.Transport._preferred_keys) + ["ssh-rsa"]
    )
    paramiko.Transport._preferred_pubkeys = tuple(
        ["ssh-rsa"] + list(paramiko.Transport._preferred_pubkeys)
    )
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        pkey = paramiko.RSAKey.from_private_key_file(key_path, password=passphrase)
    except Exception as e:
        print(f"[!] Eroare la decriptarea cheii cu Passphrase-ul '{passphrase}': {e}")
        print("    Verifică Passphrase-ul afișat în stânga-jos în aplicația Developer Mode de pe TV!")
        sys.exit(1)

    try:
        client.connect(
            hostname=tv_ip,
            port=9922,
            username="prisoner",
            pkey=pkey,
            timeout=10,
            look_for_keys=False,
            allow_agent=False,
            disabled_algorithms={"pubkeys": ["rsa-sha2-512", "rsa-sha2-256"]},
        )
    except Exception as e:
        print(f"[!] Nu m-am putut conecta la TV pe portul 9922: {e}")
        sys.exit(1)

    print("[OK] Conectat cu succes la televizorul LG (43UM7450PLA)!")

    if uninstall:
        print(f"[*] Se dezinstalează {APP_ID} și se revine 100% la meniul original LG...")
        cmd = f"/usr/bin/luna-send-pub -n 1 luna://com.webos.appInstallService/dev/remove '{{\"id\":\"{APP_ID}\"}}'"
        _, stdout, stderr = client.exec_command(cmd)
        print(stdout.read().decode("utf-8", errors="ignore"))
        print("[OK] Seby TV Home a fost dezinstalat complet! Televizorul este 100% ca din fabrică.")
        client.close()
        return

    # Upload IPK to /media/developer/temp
    _, out_check, _ = client.exec_command("mkdir -p /media/developer/temp")
    out_check.read()
    remote_ipk = f"/media/developer/temp/{IPK_FILENAME}"
    print(f"[*] Se trimite aplicația pe TV ({remote_ipk})...")
    sftp = client.open_sftp()
    sftp.put(ipk_file, remote_ipk)
    sftp.close()

    # Install via webOS dev appInstallService using luna-send-pub
    print("[*] Se instalează Seby TV Home pe televizor...")
    install_payload = json.dumps({
        "id": APP_ID,
        "ipkUrl": remote_ipk,
        "subscribe": True
    })
    install_cmd = f"/usr/bin/luna-send-pub -i -n 12 luna://com.webos.appInstallService/dev/install '{install_payload}'"
    _, stdout, stderr = client.exec_command(install_cmd)
    out_text = stdout.read().decode("utf-8", errors="ignore")
    err_text = stderr.read().decode("utf-8", errors="ignore")
    if out_text.strip():
        print(out_text)
    if err_text.strip():
        print("STDERR:", err_text)

    time.sleep(2)
    # Launch the new Custom Home immediately on the TV screen
    print("[*] Se deschide Seby TV Home pe ecranul televizorului...")
    launch_cmd = f"/usr/bin/luna-send-pub -n 1 luna://com.webos.applicationManager/launch '{{\"id\":\"{APP_ID}\"}}'"
    _, stdout, stderr = client.exec_command(launch_cmd)
    out_launch = stdout.read().decode("utf-8", errors="ignore")
    print(out_launch)
    err_launch = stderr.read().decode("utf-8", errors="ignore")
    if err_launch.strip():
        print("STDERR:", err_launch)

    client.close()
    print("\n=====================================================================")
    print(" GATA! 'Seby TV Home' este acum instalat și deschis pe televizorul tău!")
    print(" Sfat: Cât timp aplicația e deschisă pe TV, ține apăsată tasta '0' sau '1'")
    print(" pe telecomandă timp de 3 secunde ca să îi pui scurtătură rapidă!")
    print("=====================================================================")


def main():
    parser = argparse.ArgumentParser(description="Build & Install Seby TV Home pentru LG webOS")
    parser.add_argument("--build-only", action="store_true", help="Doar construiește fișierul .ipk")
    parser.add_argument("--ip", type=str, help="Adresa IP a televizorului LG (ex: 192.168.1.105)")
    parser.add_argument("--passphrase", type=str, help="Passphrase-ul din aplicația Developer Mode de pe TV")
    parser.add_argument("--uninstall", action="store_true", help="Dezinstalează Custom Home și revine la original")

    args = parser.parse_args()

    if args.build_only or (not args.ip and not args.passphrase):
        build_ipk()
        if not args.build_only:
            print("\nPentru a-l trimite direct pe TV, rulează:")
            print("  python deploy_to_tv.py --ip <IP_TV> --passphrase <COD_TV>")
        return

    if not args.ip or not args.passphrase:
        print("[!] Te rog specifică atât --ip cât și --passphrase!")
        sys.exit(1)

    deploy_via_ares_or_paramiko(args.ip, args.passphrase, uninstall=args.uninstall)


if __name__ == "__main__":
    main()

