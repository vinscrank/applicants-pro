from .schemas import SearchCommand
from .preferences import command_has_posted_constraint
from .location_match import location_rules_for_command
from .title_match import title_keywords_for_command

__all__ = ["has_strict_prompt_constraints"]


def has_strict_prompt_constraints(command: SearchCommand) -> bool:
    if title_keywords_for_command(command):
        return True
    if command.require_role_match and any(r.strip() for r in command.allowed_roles):
        return True
    if command.require_location and location_rules_for_command(command):
        return True
    return command_has_posted_constraint(command)
