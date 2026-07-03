"""Reads this container's own identity from the ECS Task Metadata Endpoint
(injected automatically as $ECS_CONTAINER_METADATA_URI_V4 by the Fargate
agent), so a run can record which exact task/log-stream it was without
needing AWS credentials or the AWS SDK. Returns None outside of ECS (e.g.
local runs), since the env var is simply absent there.
"""

from __future__ import annotations

import logging
import os
import urllib.request

logger = logging.getLogger(__name__)


def get_task_arn() -> str | None:
    metadata_uri = os.environ.get("ECS_CONTAINER_METADATA_URI_V4")
    if not metadata_uri:
        return None

    try:
        with urllib.request.urlopen(f"{metadata_uri}/task", timeout=2) as resp:
            import json

            return json.load(resp)["TaskARN"]
    except Exception:
        logger.warning("Could not read ECS task metadata", exc_info=True)
        return None
