"""
Companion launcher — the always-on light supervisor (:8768).

The heavy services are started/stopped on demand so nothing eats RAM/VRAM
while idle:

  POST /api/bridge/start     spawn the voice bridge (FunASR + TTS) on :8765
  POST /api/bridge/stop      stop the voice bridge
  POST /api/companion/start  spawn LiveTalking (:8010) + llama-server (:8090)
  POST /api/companion/stop   stop LiveTalking + llama-server
  GET  /api/health           status of all services

This process itself imports nothing heavy (no torch), so it stays small.
"""
from __future__ import annotations

import logging
import os
import subprocess
from pathlib import Path

from fastapi import FastAPI

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("launcher")

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent
SCRATCH = REPO_ROOT / ".scratch"

BRIDGE_PY = HERE / "voice_bridge.py"
BRIDGE_VENV = REPO_ROOT / "venv-speech" / "Scripts" / "python.exe"

LIVETALKING_DIR = REPO_ROOT.parent / "LiveTalking"
LIVETALKING_PY = LIVETALKING_DIR / ".venv-lt" / "Scripts" / "python.exe"
LLAMA_EXE = Path(r"E:\llama-cpp\llama-server.exe")
LLAMA_MODEL = Path(r"E:\llama-cpp\models\Qwen3-4B-Q4_K_M.gguf")

app = FastAPI(title="companion-launcher")


def _port_pid(port: int) -> int | None:
    import psutil

    for conn in psutil.net_connections(kind="tcp"):
        if conn.laddr and conn.laddr.port == port and conn.status == "LISTEN":
            return conn.pid
    return None


def _env() -> dict:
    env = dict(os.environ)
    env["PATH"] = str(REPO_ROOT.parent / "ffmpeg") + os.pathsep + env.get("PATH", "")
    SCRATCH.mkdir(parents=True, exist_ok=True)
    env["TMP"] = str(SCRATCH)
    env["TEMP"] = str(SCRATCH)
    env["HF_HOME"] = str(SCRATCH / "hf-home")
    env["PYTHONIOENCODING"] = "utf-8"
    return env


def _spawn(args: list[str], cwd: Path, log: str) -> None:
    log_file = (SCRATCH / log).open("ab")
    subprocess.Popen(
        args,
        cwd=str(cwd),
        env=_env(),
        stdin=subprocess.DEVNULL,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
    )


@app.get("/api/health")
async def health() -> dict:
    return {
        "bridge": _port_pid(8765) is not None,
        "livetalking": _port_pid(8010) is not None,
        "llama": _port_pid(8090) is not None,
    }


@app.post("/api/bridge/start")
async def bridge_start() -> dict:
    if _port_pid(8765) is None and BRIDGE_PY.is_file() and BRIDGE_VENV.is_file():
        _spawn([str(BRIDGE_VENV), "-m", "uvicorn", "voice_bridge:app", "--host", "127.0.0.1", "--port", "8765"], HERE, "bridge.log")
        logger.info("bridge start requested")
        return {"ok": True, "started": ["bridge"]}
    return {"ok": True, "started": []}


@app.post("/api/bridge/stop")
async def bridge_stop() -> dict:
    stopped = []
    pid = _port_pid(8765)
    if pid is not None:
        try:
            import psutil

            psutil.Process(pid).terminate()
            stopped.append(8765)
        except Exception:  # noqa: BLE001 - best-effort
            logger.exception("bridge stop failed")
    logger.info("bridge stop requested; stopped=%s", stopped)
    return {"ok": True, "stopped": stopped}


@app.post("/api/companion/start")
async def companion_start() -> dict:
    started = []
    if _port_pid(8010) is None and LIVETALKING_PY.is_file():
        _spawn(
            [str(LIVETALKING_PY), "app.py", "--transport", "webrtc", "--model", "wav2lip", "--avatar_id", "wav2lip256_avatar1"],
            LIVETALKING_DIR,
            "livetalking.log",
        )
        started.append("livetalking")
    if _port_pid(8090) is None and LLAMA_EXE.is_file() and LLAMA_MODEL.is_file():
        _spawn(
            [str(LLAMA_EXE), "-m", str(LLAMA_MODEL), "-np", "1", "-c", "8192", "-fa", "on", "--temp", "1.0", "--host", "0.0.0.0", "--port", "8090"],
            REPO_ROOT.parent,
            "llama.log",
        )
        started.append("llama")
    logger.info("companion start requested; started=%s", started)
    return {"ok": True, "started": started}


@app.post("/api/companion/stop")
async def companion_stop() -> dict:
    import psutil

    stopped = []
    for port in (8010, 8090):
        pid = _port_pid(port)
        if pid is not None:
            try:
                psutil.Process(pid).terminate()
                stopped.append(port)
            except Exception:  # noqa: BLE001 - best-effort
                logger.exception("companion stop failed for port %s", port)
    logger.info("companion stop requested; stopped=%s", stopped)
    return {"ok": True, "stopped": stopped}
