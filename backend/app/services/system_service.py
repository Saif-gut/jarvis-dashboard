from __future__ import annotations

import platform
import socket
from datetime import UTC, datetime
from pathlib import Path

import psutil


def read_system_metrics() -> dict[str, object]:
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage(Path.home().anchor)
    return {
        "cpu_percent": round(psutil.cpu_percent(interval=0.1), 1),
        "memory_percent": round(memory.percent, 1),
        "memory_used": memory.used,
        "memory_total": memory.total,
        "disk_used": disk.used,
        "disk_free": disk.free,
        "disk_total": disk.total,
        "disk_percent": round(disk.percent, 1),
        "cpu_cores_logical": psutil.cpu_count(logical=True) or 0,
        "cpu_cores_physical": psutil.cpu_count(logical=False),
        "operating_system": f"{platform.system()} {platform.release()}",
        "hostname": socket.gethostname(),
        "last_updated": datetime.now(UTC).isoformat(),
    }
