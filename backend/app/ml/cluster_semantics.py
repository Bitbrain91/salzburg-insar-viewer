from __future__ import annotations

from typing import Literal


ClusterKind = Literal["standard", "annex", "foreign"]


def cluster_kind_from_id(cluster_id: object) -> ClusterKind:
    """Derive the public cluster kind from the final cluster-id segment.

    The ordering is intentional: foreign is the stricter semantic class and
    must win before the more general annex-prefix check.
    """
    value = str(cluster_id or "")
    suffix = value.rsplit(":", 1)[-1]
    if suffix == "foreign":
        return "foreign"
    if suffix.startswith("annex_"):
        return "annex"
    return "standard"


def cluster_kind_sql(cluster_id_expression: str) -> str:
    """Return the read-time SQL expression matching cluster_kind_from_id.

    Callers pass trusted, static SQL identifiers from application code. The
    derived value is intentionally not persisted as another source of truth.
    """
    return (
        "CASE "
        f"WHEN split_part({cluster_id_expression}, ':', "
        f"array_length(string_to_array({cluster_id_expression}, ':'), 1)) = 'foreign' "
        "THEN 'foreign' "
        f"WHEN left(split_part({cluster_id_expression}, ':', "
        f"array_length(string_to_array({cluster_id_expression}, ':'), 1)), 6) = 'annex_' "
        "THEN 'annex' "
        "ELSE 'standard' END"
    )
