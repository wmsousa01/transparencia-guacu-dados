"""HTTP com cache em disco: cada recurso baixado uma vez vira arquivo em data/raw/.

Exercícios fechados não mudam, então o cache é permanente para eles. Para o
exercício corrente, use refresh=True (ou apague o arquivo) para rebaixar.
"""
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
UA = "transparencia-guacu/0.2 (coleta de dados publicos)"
_last = 0.0


def get_bytes(url: str, cache_name: str, refresh: bool = False, pause: float = 1.0,
              data: bytes | None = None, timeout: int = 180) -> bytes:
    path = RAW / cache_name
    if path.exists() and not refresh:
        return path.read_bytes()

    global _last
    wait = pause - (time.time() - _last)
    if wait > 0:
        time.sleep(wait)

    for attempt in range(4):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                body = r.read()
            break
        except Exception as e:  # noqa: BLE001 - rede pública instável, tenta de novo
            if attempt == 3:
                raise RuntimeError(f"falhou {url}: {e}") from e
            time.sleep(3 * (attempt + 1))
    _last = time.time()

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(body)
    return body


def get_json(url: str, cache_name: str, refresh: bool = False, pause: float = 1.0):
    path = RAW / cache_name
    if path.exists() and not refresh:
        return json.loads(path.read_text(encoding="utf-8"))
    data = json.loads(get_bytes(url, cache_name + ".tmp", True, pause).decode("utf-8"))
    (RAW / (cache_name + ".tmp")).unlink()
    vazio = isinstance(data, dict) and data.get("items") == [] or data == []
    if not vazio:  # "ainda não entregue" não pode virar cache permanente
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return data
