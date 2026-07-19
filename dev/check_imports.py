#!/usr/bin/env python3
"""
check_imports.py — CotSI import and layer-boundary checker (no dependencies).

Gates:
  1. Every relative import/export-from specifier in src/ resolves to a real file.
  2. Every named import refers to a symbol the target module actually exports
     (follows `export { x } from './y.js'` re-export chains).
  3. Boundary report: cross-layer imports vs the rules in dev/cssConventions.md §2.
     Informational only — existing debt is tracked there; do not add to it.

Usage:  python3 dev/check_imports.py
Exit code is non-zero if gate 1 or 2 fails.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')

# ---------------------------------------------------------------------------
# Layer rules (dev/cssConventions.md §2). Layers not listed may import anything.
# ---------------------------------------------------------------------------
ALLOWED = {
    'shared':     {'shared'},
    'engine':     {'shared', 'engine'},
    'game/rules': {'shared', 'engine', 'game/rules'},
    'game/state': {'shared', 'engine', 'game/rules', 'game/state'},
    'render':     {'shared', 'engine'},
    'ui':         {'shared', 'ui'},
    # runtime/ and entrypoint.js may import everything.
}

IMPORT_FROM_RE = re.compile(r"""\bimport\s*(\{[^}]*\}|\*\s+as\s+[\w$]+)\s*from\s*['"]([^'"]+)['"]""")
EXPORT_FROM_RE = re.compile(r"""\bexport\s*(\{[^}]*\})\s*from\s*['"]([^'"]+)['"]""")
SIDE_EFFECT_RE = re.compile(r"""\bimport\s*['"]([^'"]+)['"]""")
DYNAMIC_RE = re.compile(r"""\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)""")

EXPORT_DECL_RE = re.compile(
    r"\bexport\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)")
EXPORT_LIST_RE = re.compile(r"\bexport\s*\{([^}]*)\}(?!\s*from)")

EXPORT_FAILURES = set()


def layer_of(relpath):
    parts = relpath.split('/')
    if relpath == 'src/entrypoint.js':
        return 'entrypoint'
    if len(parts) >= 3 and parts[0] == 'src':
        if parts[1] == 'game' and len(parts) >= 4:
            return f'game/{parts[2]}'
        return parts[1]
    return 'unknown'


def strip_comments(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"//[^\n]*", "", text)
    return text


def walk_js():
    for dirpath, dirnames, filenames in os.walk(SRC):
        dirnames[:] = [d for d in dirnames if d != 'vendor']
        for name in sorted(filenames):
            if name.endswith('.js'):
                yield os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, '/')


def resolve(importer, spec):
    return os.path.normpath(os.path.join(os.path.dirname(importer), spec)).replace(os.sep, '/')


def split_list(clause):
    """'{ a, b as c }' → [('a', 'a'), ('b', 'c')] as (source, alias) pairs."""
    out = []
    for part in clause.strip()[1:-1].split(','):
        part = part.strip()
        if not part:
            continue
        bits = [b.strip() for b in part.split(' as ')]
        out.append((bits[0], bits[-1]))
    return out


def exported_names(relpath, _seen=None):
    """All names a module exports, following re-export chains."""
    if _seen is None:
        _seen = set()
    if relpath in _seen:
        return set()
    _seen.add(relpath)
    full = os.path.join(ROOT, relpath)
    if not os.path.exists(full):
        return set()
    text = strip_comments(open(full, encoding='utf8').read())
    names = set(EXPORT_DECL_RE.findall(text))
    for group in EXPORT_LIST_RE.findall(text):
        names.update(alias for _, alias in split_list('{' + group + '}'))
    for clause, spec in EXPORT_FROM_RE.findall(text):
        target = resolve(relpath, spec)
        available = exported_names(target, _seen)
        for src_name, alias in split_list(clause):
            if available and src_name not in available:
                EXPORT_FAILURES.add(
                    f'{relpath} re-exports {src_name} from {spec}, '
                    f'but {target} does not export it')
            names.add(alias)
    return names


def main():
    missing_files = []
    missing_exports = []
    boundary = []

    for relpath in walk_js():
        text = strip_comments(open(os.path.join(ROOT, relpath), encoding='utf8').read())
        importer_layer = layer_of(relpath)

        def check_target(spec):
            target = resolve(relpath, spec)
            if not os.path.exists(os.path.join(ROOT, target)):
                missing_files.append(f'{relpath}: "{spec}" → {target} not found')
                return None
            target_layer = layer_of(target)
            allowed = ALLOWED.get(importer_layer)
            if (allowed is not None and target.startswith('src/')
                    and '/vendor/' not in target
                    and target_layer not in allowed and target_layer != importer_layer):
                boundary.append(f'{relpath}  ({importer_layer} → {target_layer}: {target})')
            return target

        for clause, spec in IMPORT_FROM_RE.findall(text):
            target = check_target(spec)
            if target and clause.startswith('{') and '/vendor/' not in target:
                available = exported_names(target)
                if available:
                    for src_name, _ in split_list(clause):
                        if src_name not in available:
                            missing_exports.append(
                                f'{relpath}: imports {src_name} from {spec}, '
                                f'but {target} does not export it')
        for _, spec in EXPORT_FROM_RE.findall(text):
            check_target(spec)  # existence; names verified via exported_names()
        for spec in SIDE_EFFECT_RE.findall(text):
            check_target(spec)
        for spec in DYNAMIC_RE.findall(text):
            check_target(spec)

    # force evaluation of every module's export list (catches dangling re-exports)
    for relpath in walk_js():
        exported_names(relpath)

    ok = True
    if missing_files:
        ok = False
        print(f'BROKEN IMPORTS ({len(missing_files)}):')
        for e in missing_files:
            print('  ' + e)
    if missing_exports or EXPORT_FAILURES:
        ok = False
        print(f'MISSING EXPORTS ({len(missing_exports) + len(EXPORT_FAILURES)}):')
        for e in missing_exports + sorted(EXPORT_FAILURES):
            print('  ' + e)
    if boundary:
        print(f'BOUNDARY REPORT ({len(boundary)} known-debt imports, informational):')
        for e in boundary:
            print('  ' + e)
    if ok:
        print(f'OK — all imports resolve, all named exports verified '
              f'({sum(1 for _ in walk_js())} files checked).')
    else:
        print('FAILED')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
