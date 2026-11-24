"""HTTP com cache em disco: cada URL baixada uma vez vira arquivo em data/raw/.

Exercícios fechados não mudam, então o cache é permanente para eles. Para o
exercício corrente, use refresh=True (ou apague o arquivo) para rebaixar.
"""
import hashlib
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
UA = "transparencia-guacu/0.1 (coleta de dados publicos)"
_last = 0.0


def get_json(url: str, cache_name: str, refresh: bool = False, pause: float = 1.0):
    path = RAW / cache_name
    if path.exists() and not refresh:
        return json.loads(path.read_text(encoding="utf-8"))

    global _last
    wait = pause - (time.time() - _last)
    if wait > 0:
        time.sleep(wait)

    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                body = r.read().decode("utf-8")
            break
        except Exception as e:  # noqa: BLE001 - rede pública instável, tenta de novo
            if attempt == 3:
                raise RuntimeError(f"falhou {url}: {e}") from e
            time.sleep(3 * (attempt + 1))
    _last = time.time()

    data = json.loads(body)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return data


def short_hash(s: str) -> str:
    return hashlib.sha1(s.encode()).hexdigest()[:8]
