from .schemas import SearchCommand

DEFAULT_PROMPT = ""

DEFAULT_COMMAND = SearchCommand()


def parse_prompt(text: str, base: SearchCommand | None = None) -> SearchCommand:
    cmd = base.model_copy() if base else SearchCommand()
    cmd.prompt_text = text.strip()
    return cmd
