from .config import OWNER_EMAILS


def is_owner(user) -> bool:
    if not user or not getattr(user, "email", None):
        return False
    return user.email.strip().lower() in OWNER_EMAILS
