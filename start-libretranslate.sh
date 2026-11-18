#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVER_URL="http://127.0.0.1:5000"
MODEL_DIR="$SCRIPT_DIR/assets/libretranslate/models"

if [[ -n "${PYTHON:-}" ]]; then
    python_cmd="$PYTHON"
elif [[ -x "$SCRIPT_DIR/.venv/bin/python" ]]; then
    python_cmd="$SCRIPT_DIR/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    python_cmd="$(command -v python3)"
else
    echo "Python 3 is required to validate the LibreTranslate service." >&2
    exit 1
fi

if [[ -x "$SCRIPT_DIR/.venv/bin/libretranslate" ]]; then
    libretranslate_cmd="$SCRIPT_DIR/.venv/bin/libretranslate"
elif command -v libretranslate >/dev/null 2>&1; then
    libretranslate_cmd="$(command -v libretranslate)"
else
    echo "LibreTranslate is not installed. Install it with: $python_cmd -m pip install libretranslate" >&2
    exit 1
fi

if ! command -v "$python_cmd" >/dev/null 2>&1 && [[ ! -x "$python_cmd" ]]; then
    echo "Python interpreter not found: $python_cmd" >&2
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required. Install it with: sudo dnf install curl" >&2
    exit 1
fi

languages_are_ready() {
    local response
    response="$(curl --silent --show-error --fail --max-time 2 "$SERVER_URL/languages" 2>/dev/null)" || return 1
    printf '%s' "$response" | "$python_cmd" -c '
import json
import sys

try:
    languages = json.load(sys.stdin)
    codes = {language.get("code") for language in languages if isinstance(language, dict)}
except (json.JSONDecodeError, TypeError):
    sys.exit(1)

sys.exit(0 if codes == {"en", "bg"} else 1)
' 2>/dev/null
}

if curl --silent --show-error --fail --max-time 2 "$SERVER_URL/health" >/dev/null 2>&1; then
    if languages_are_ready; then
        echo "LibreTranslate is already running at $SERVER_URL (English <-> Bulgarian)"
        exit 0
    fi
    echo "A LibreTranslate service is already running at $SERVER_URL, but it does not provide exactly English and Bulgarian." >&2
    exit 1
fi

for model in translate-en_bg-1_9 translate-bg_en-1_9; do
    if [[ ! -f "$MODEL_DIR/$model/metadata.json" ]]; then
        echo "Required model is missing: $MODEL_DIR/$model" >&2
        echo "Run install-libretranslate-models.sh first." >&2
        exit 1
    fi
done

STATE_DIR="${XDG_STATE_HOME:-${HOME:?HOME must be set}/.local/state}/pantryiq/libretranslate"
mkdir -p "$STATE_DIR"
stdout_path="$STATE_DIR/server.log"
stderr_path="$STATE_DIR/server-error.log"
pid_path="$STATE_DIR/server.pid"

export ARGOS_PACKAGES_DIR="$MODEL_DIR"
nohup "$libretranslate_cmd" --host 127.0.0.1 --port 5000 --load-only en,bg \
    >"$stdout_path" 2>"$stderr_path" </dev/null &
server_pid=$!
printf '%s\n' "$server_pid" > "$pid_path"

for ((attempt = 0; attempt < 60; attempt++)); do
    if ! kill -0 "$server_pid" 2>/dev/null; then
        echo "LibreTranslate exited during startup. Check $stderr_path" >&2
        exit 1
    fi

    if curl --silent --show-error --fail --max-time 2 "$SERVER_URL/health" >/dev/null 2>&1; then
        if languages_are_ready; then
            echo "LibreTranslate is ready at $SERVER_URL (English <-> Bulgarian)"
            echo "Logs: $stdout_path and $stderr_path"
            exit 0
        fi
        echo "LibreTranslate started but did not expose exactly English and Bulgarian. Check $stderr_path" >&2
        exit 1
    fi
    sleep 1
done

echo "LibreTranslate did not become ready. Check $stderr_path" >&2
exit 1
