#!/usr/bin/env python3

"""
build-symbol-map-python.py - Python symbol extractor using the ast module.

Parses Python source files using the built-in ast module to extract classes,
functions, and their import dependencies.

Usage: python .bbg/scripts/build-symbol-map-python.py [--root <dir>]

Output: .bbg/context/symbol-map.json (unified format)

Zero extra dependencies - uses only Python standard library (ast module).
"""

import ast
import json
import os
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

IGNORE_DIRS = {
    "node_modules",
    ".git",
    ".bbg",
    "__pycache__",
    ".mypy_cache",
    ".pytest_cache",
    ".venv",
    "venv",
    "env",
    ".tox",
    "dist",
    "build",
    "egg-info",
    ".eggs",
}


def find_python_files(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS and not d.endswith(".egg-info")]
        for fname in filenames:
            if fname.endswith(".py"):
                yield Path(dirpath) / fname


def extract_imports(tree):
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name.split(".")[-1])
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if alias.name != "*":
                    imports.append(alias.name)
    return imports


def is_exported(name):
    return not name.startswith("_")


def get_function_signature(node):
    args = []
    for arg in node.args.args:
        annotation = ""
        if arg.annotation:
            try:
                annotation = ": " + ast.unparse(arg.annotation)
            except (AttributeError, ValueError):
                pass
        args.append(arg.arg + annotation)

    returns = ""
    if node.returns:
        try:
            returns = " -> " + ast.unparse(node.returns)
        except (AttributeError, ValueError):
            pass

    return f"({', '.join(args)}){returns}"


def extract_symbols_from_file(filepath, root):
    try:
        content = filepath.read_text(encoding="utf-8")
        tree = ast.parse(content, filename=str(filepath))
    except (SyntaxError, OSError, UnicodeDecodeError):
        return []

    rel_path = str(filepath.relative_to(root))
    imports = extract_imports(tree)
    symbols = []

    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.ClassDef):
            bases = []
            for base in node.bases:
                try:
                    bases.append(ast.unparse(base))
                except (AttributeError, ValueError):
                    pass

            decorators = []
            for dec in node.decorator_list:
                try:
                    decorators.append(ast.unparse(dec))
                except (AttributeError, ValueError):
                    pass

            modifiers = ["public"] if is_exported(node.name) else ["private"]
            if decorators:
                modifiers.extend(decorators)

            symbols.append({
                "name": node.name,
                "kind": "class",
                "file": rel_path,
                "line": node.lineno,
                "exported": is_exported(node.name),
                "modifiers": modifiers,
                "dependencies": sorted(set(imports + bases)),
                "dependents": [],
                "signature": None,
            })

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            modifiers = ["public"] if is_exported(node.name) else ["private"]
            if isinstance(node, ast.AsyncFunctionDef):
                modifiers.append("async")

            symbols.append({
                "name": node.name,
                "kind": "function",
                "file": rel_path,
                "line": node.lineno,
                "exported": is_exported(node.name),
                "modifiers": modifiers,
                "dependencies": sorted(set(imports)),
                "dependents": [],
                "signature": get_function_signature(node),
            })

    return symbols


def main():
    all_symbols = []
    for filepath in find_python_files(ROOT):
        all_symbols.extend(extract_symbols_from_file(filepath, ROOT))

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
        "language": "python",
        "extractor": "build-symbol-map-python.py",
        "symbols": all_symbols,
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(output, indent=2))
    print(f"Symbol map: {len(all_symbols)} symbols extracted -> {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
