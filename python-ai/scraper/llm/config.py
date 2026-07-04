import os

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite").strip()
GEMINI_PARSE_MODEL = os.getenv("GEMINI_PARSE_MODEL", "gemini-2.5-flash").strip() or GEMINI_MODEL
LLM_MONTHLY_BUDGET_USD = float(os.getenv("LLM_MONTHLY_BUDGET_USD", "5"))
LLM_BUDGET_CEILING_USD = float(os.getenv("LLM_BUDGET_CEILING_USD", os.getenv("LLM_MONTHLY_BUDGET_USD", "5")))
LLM_DAILY_BUDGET_USD = float(os.getenv("LLM_DAILY_BUDGET_USD", "0"))
LLM_MAX_DAILY_CALLS = int(os.getenv("LLM_MAX_DAILY_CALLS", "0"))
AUTO_DISCOVER_MAX = int(os.getenv("AUTO_DISCOVER_MAX", "40"))

GEMINI_INPUT_COST_PER_TOKEN = 0.075 / 1_000_000
GEMINI_OUTPUT_COST_PER_TOKEN = 0.30 / 1_000_000

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
