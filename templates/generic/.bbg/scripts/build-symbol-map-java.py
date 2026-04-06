#!/usr/bin/env python3

"""
build-symbol-map-java.py - Java symbol extractor via regex + import analysis.

Parses Java source files using regex to extract public classes, interfaces,
enums, methods, and their import dependencies.

Usage: python .bbg/scripts/build-symbol-map-java.py [--root <dir>]

Output: .bbg/context/symbol-map.json (unified format)

Zero extra dependencies - uses only Python standard library.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(".")
for i, arg in enumerate(sys.argv[1:], 1):
    if arg == "--root" and i < len(sys.argv) - 1:
        ROOT = Path(sys.argv[i + 1])
        break

OUTPUT_DIR = ROOT / ".bbg" / "context"
OUTPUT_FILE = OUTPUT_DIR / "symbol-map.json"

IGNORE_DIRS = {"node_modules", ".git", ".bbg", "build", "target", ".gradle", ".idea", "out"}

CLASS_PATTERN = re.compile(
    r"^(\s*)(public|protected|private)?\s*(static\s+)?(abstract\s+)?(final\s+)?class\s+(\w+)"
    r"(?:\s+extends\s+(\w+))?"
    r"(?:\s+implements\s+([\w,\s]+))?",
    re.MULTILINE,
)
INTERFACE_PATTERN = re.compile(
    r"^(\s*)(public|protected|private)?\s*(static\s+)?interface\s+(\w+)"
    r"(?:\s+extends\s+([\w,\s]+))?",
    re.MULTILINE,
)
ENUM_PATTERN = re.compile(
    r"^(\s*)(public|protected|private)?\s*enum\s+(\w+)",
    re.MULTILINE,
)
IMPORT_PATTERN = re.compile(r"^import\s+(static\s+)?([\w.]+)\s*;", re.MULTILINE)


def find_java_files(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for fname in filenames:
            if fname.endswith(".java"):
                yield Path(dirpath) / fname


def extract_imports(content):
    deps = []
    for match in IMPORT_PATTERN.finditer(content):
        full_import = match.group(2)
        simple_name = full_import.split(".")[-1]
        if simple_name != "*":
            deps.append(simple_name)
    return deps


def extract_symbols(content, rel_path):
    symbols = []
    imports = extract_imports(content)

    for match in CLASS_PATTERN.finditer(content):
        line_num = content[: match.start()].count("\n") + 1
        name = match.group(6)
        modifiers = [m.strip() for m in [match.group(2), match.group(3), match.group(4), match.group(5)] if m]
        deps = list(imports)
        if match.group(7):
            deps.append(match.group(7).strip())
        if match.group(8):
            deps.extend([d.strip() for d in match.group(8).split(",")])
        symbols.append({
            "name": name,
            "kind": "class",
            "file": str(rel_path),
            "line": line_num,
            "exported": "public" in modifiers,
            "modifiers": modifiers,
            "dependencies": sorted(set(deps)),
            "dependents": [],
            "signature": None,
        })

    for match in INTERFACE_PATTERN.finditer(content):
        line_num = content[: match.start()].count("\n") + 1
        name = match.group(4)
        modifiers = [m.strip() for m in [match.group(2), match.group(3)] if m]
        deps = list(imports)
        if match.group(5):
            deps.extend([d.strip() for d in match.group(5).split(",")])
        symbols.append({
            "name": name,
            "kind": "interface",
            "file": str(rel_path),
            "line": line_num,
            "exported": "public" in modifiers,
            "modifiers": modifiers,
            "dependencies": sorted(set(deps)),
            "dependents": [],
            "signature": None,
        })

    for match in ENUM_PATTERN.finditer(content):
        line_num = content[: match.start()].count("\n") + 1
        name = match.group(3)
        modifiers = [m.strip() for m in [match.group(2)] if m]
        symbols.append({
            "name": name,
            "kind": "enum",
            "file": str(rel_path),
            "line": line_num,
            "exported": "public" in modifiers,
            "modifiers": modifiers,
            "dependencies": sorted(set(imports)),
            "dependents": [],
            "signature": None,
        })

    return symbols


def main():
    all_symbols = []
    for filepath in find_java_files(ROOT):
        try:
            content = filepath.read_text(encoding="utf-8")
            rel_path = filepath.relative_to(ROOT)
            all_symbols.extend(extract_symbols(content, rel_path))
        except (OSError, UnicodeDecodeError):
            continue

    name_to_indices = {}
    for index, symbol in enumerate(all_symbols):
        name_to_indices.setdefault(symbol["name"], []).append(index)

    for symbol in all_symbols:
        for dep in symbol["dependencies"]:
            for idx in name_to_indices.get(dep, []):
                if symbol["name"] not in all_symbols[idx]["dependents"]:
                    all_symbols[idx]["dependents"].append(symbol["name"])

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "language": "java",
        "extractor": "build-symbol-map-java.py",
        "symbols": all_symbols,
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(output, indent=2))
    print(f"Symbol map: {len(all_symbols)} symbols extracted -> {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
