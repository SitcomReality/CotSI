#!/usr/bin/env python3
"""
check_analysis_imports.py — Import checker for the map-gen analysis tool (no deps).

Verifies that every relative import in dev/tools/analysis/ resolves to a real file,
and that every named import refers to a symbol the target module actually exports.

Does NOT check layer boundaries — those rules only apply to src/.

Usage:  python3 dev/scripts/check_analysis_imports.py
Exit code is non-zero when any import fails to resolve.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ANALYSIS = os.path.join(ROOT, 'dev', 'tools', 'analysis')

# ── Regex patterns ──────────────────────────────────────────────────────────────

IMPORT_FROM_RE = re.compile(r"""\bimport\s*(\{[^}]*\}|\*\s+as\s+[\w$]+)\s*from\s*['"]([^'"]+)['"]""")
EXPORT_FROM_RE = re.compile(r"""\bexport\s*(\{[^}]*\})\s*from\s*['"]([^'"]+)['"]""")
SIDE_EFFECT_RE = re.compile(r"""\bimport\s*['"]([^'"]+)['"]""")
DYNAMIC_RE = re.compile(r"""\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)""")

EXPORT_DECL_RE = re.compile(
    r"\bexport\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)")
EXPORT_LIST_RE = re.compile(r"\bexport\s*\{([^}]*)\}(?!\s*from)")

EXPORT_FAILURES = set()


# ── Helpers ─────────────────────────────────────────────────────────────────────

def strip_comments(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"//[^\n]*", "", text)
    return text


def walk_analysis_js():
    for dirpath, _dirnames, filenames in os.walk(ANALYSIS):
        for name in sorted(filenames):
            if name.endswith('.js'):
                yield os.path.join('dev', 'tools', 'analysis', os.path.relpath(dirpath, ANALYSIS), name).replace(os.sep, '/')


def resolve(importer_rel, spec):
    """Resolve a relative import spec to a path relative to ROOT."""
    importer_dir = os.path.dirname(os.path.join(ROOT, importer_rel))
    return os.path.normpath(os.path.join(importer_dir, spec)).replace(os.sep, '/')


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


def exported_names(relpath):
    """Return the set of names a module exports."""
    full = os.path.join(ROOT, relpath)
    if not os.path.exists(full):
        return set()
    text = strip_comments(open(full, encoding='utf8').read())
    names = set(EXPORT_DECL_RE.findall(text))
    for group in EXPORT_LIST_RE.findall(text):
        names.update(alias for _, alias in split_list('{' + group + '}'))
    # Follow re-export chains for cross-project modules that use them
    for clause, spec in EXPORT_FROM_RE.findall(text):
        target = resolve(relpath, spec)
        available = exported_names(target)
        for src_name, alias in split_list(clause):
            if available and src_name not in available:
                EXPORT_FAILURES.add(
                    f'{relpath} re-exports {src_name} from {spec}, '
                    f'but {target} does not export it')
            names.add(alias)
    return names


# ── Main ────────────────────────────────────────────────────────────────────────

def main():
    missing_files = []
    missing_exports = []

    for relpath in walk_analysis_js():
        full = os.path.join(ROOT, relpath)
        text = strip_comments(open(full, encoding='utf8').read())

        def check_target(spec, line_desc):
            target = resolve(relpath, spec)
            if not os.path.exists(os.path.join(ROOT, target)):
                missing_files.append(f'{relpath}: {line_desc} "{spec}" → {target} not found')
                return None
            return target

        for clause, spec in IMPORT_FROM_RE.findall(text):
            target = check_target(spec, 'import')
            if target and clause.startswith('{'):
                available = exported_names(target)
                if available:
                    for src_name, _ in split_list(clause):
                        if src_name not in available:
                            missing_exports.append(
                                f'{relpath}: imports "{src_name}" from `{spec}`, '
                                f'but {target} does not export it')

        for clause, spec in EXPORT_FROM_RE.findall(text):
            target = check_target(spec, 're-export')

        for spec in SIDE_EFFECT_RE.findall(text):
            check_target(spec, 'side-effect import')

        for spec in DYNAMIC_RE.findall(text):
            check_target(spec, 'dynamic import')

    # Force evaluation of all export lists (catches dangling re-exports)
    for relpath in walk_analysis_js():
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
    if ok:
        print(f'OK — all analysis imports resolve, all named exports verified '
              f'({sum(1 for _ in walk_analysis_js())} files checked).')
    else:
        print('FAILED')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
