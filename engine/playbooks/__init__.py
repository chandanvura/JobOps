"""JobOps Autonomous Playbook Auto-Remediation Engine
Zero-cost, local-first playbook system for detecting and auto-resolving known operational defects.
"""

from .definitions import PLAYBOOKS, Playbook
from .resolver import PlaybookResolver

__all__ = ["PLAYBOOKS", "Playbook", "PlaybookResolver"]
