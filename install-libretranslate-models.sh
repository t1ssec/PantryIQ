#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
MODEL_DIR="$SCRIPT_DIR/assets/libretranslate/models"
DOWNLOAD_DIR="$SCRIPT_DIR/assets/libretranslate/downloads"

if [[ -n "${PYTHON:-}" ]]; then
    python_cmd="$PYTHON"
elif [[ -x "$SCRIPT_DIR/.venv/bin/python" ]]; then
    python_cmd="$SCRIPT_DIR/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    python_cmd="$(command -v python3)"
else
    echo "Python 3 is required. Install it with: sudo dnf install python3" >&2
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

if ! "$python_cmd" -c 'from argostranslate import package' >/dev/null 2>&1; then
    echo "Argos Translate is not installed for $python_cmd." >&2
    echo "Install LibreTranslate in this Python environment first (for example: $python_cmd -m pip install libretranslate)." >&2
    exit 1
fi

mkdir -p "$MODEL_DIR" "$DOWNLOAD_DIR"
export ARGOS_PACKAGES_DIR="$MODEL_DIR"

models=(
    "translate-en_bg-1_9 https://argos-net.com/v1/translate-en_bg-1_9.argosmodel"
    "translate-bg_en-1_9 https://argos-net.com/v1/translate-bg_en-1_9.argosmodel"
)

for model in "${models[@]}"; do
    read -r name url <<< "$model"
    if [[ -f "$MODEL_DIR/$name/metadata.json" ]]; then
        echo "$name is already installed"
        continue
    fi

    package_path="$(mktemp "$DOWNLOAD_DIR/$name.XXXXXX.argosmodel")"
    if ! curl --location --fail --silent --show-error --output "$package_path" "$url"; then
        rm -f -- "$package_path"
        echo "Could not download $name" >&2
        exit 1
    fi

    if ! "$python_cmd" -c \
        'import sys; from argostranslate import package; package.install_from_path(sys.argv[1])' \
        "$package_path"; then
        rm -f -- "$package_path"
        echo "Could not install $name" >&2
        exit 1
    fi

    rm -f -- "$package_path"
    echo "$name installed"
done
