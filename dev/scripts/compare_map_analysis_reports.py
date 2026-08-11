#!/usr/bin/env python3
"""
compare_map_analysis_reports.py — diff two or more batch analysis reports.

Usage:
  python3 dev/scripts/compare_map_analysis_reports.py <report_a.txt> <report_b.txt> [report_c.txt ...]

Output:
  Side-by-side comparison of key metrics across all reports.
  Sections that are identical across all reports are collapsed.
  Numerical changes are flagged with delta indicators.

Supports up to 6 reports side-by-side.
"""

import re
import sys
from collections import OrderedDict, defaultdict
from pathlib import Path


# ──────────────────────── PARSER ────────────────────────

def parse_report(text):
    """Return a structured dict of all sections in a batch report."""
    data = {
        'config': {},
        'noise_config': {},
        'terrain_rules': {},
        'slope_norm': None,
        'epicenter_grid': {},
        'snapshot': None,
        'radii': OrderedDict(),
        'seam_results': {},    # radius -> [{pass_count, fail_count, total, total_mismatches}]
        'climate_results': {}, # radius -> {biomes, biome_default_count, gap_cells}
        'threshold_derivation': {},
        'quantile_lut': {},
    }

    lines = text.split('\n')

    def is_radius_header(l):
        return bool(re.match(r'^---\s+Radius\s+(\d+)\s+---$', l))

    def ensure_radius(r):
        if r not in data['radii']:
            data['radii'][r] = {}

    i = 0
    while i < len(lines):
        line = lines[i]

        # ── Active Configuration ──
        if line == '=== Active Configuration ===':
            i += 1
            while i < len(lines) and not line.startswith('===') and not is_radius_header(lines[i]):
                if 'Base seed:' in lines[i] and 'Seeds:' in lines[i]:
                    m = re.search(r'Base seed:\s*(.+?)\s*\|\s*Seeds:', lines[i])
                    if m: data['config']['base_seed'] = m.group(1).strip()
                    m = re.search(r'Seeds:\s*(\d+)', lines[i])
                    if m: data['config']['num_seeds'] = int(m.group(1))
                    m = re.search(r'Radii:\s*([\d,\s]+)', lines[i])
                    if m: data['config']['radii'] = [int(x) for x in m.group(1).split(',')]
                i += 1
            continue

        # ── Noise Config ──
        if line == 'Noise Config:':
            i += 1
            cur_r = None
            while i < len(lines) and not lines[i].startswith('Terrain Rules') and not lines[i].startswith('===') and not is_radius_header(lines[i]):
                m = re.match(r'\s*Radius\s+(\d+):', lines[i])
                if m:
                    cur_r = int(m.group(1))
                    data['noise_config'][cur_r] = []
                elif cur_r is not None:
                    m = re.match(r'\s*([\w\s]+?)\s+octaves=(\d+)\s+freq=([\d.]+)\s+lacunarity=(\d+)\s+gain=([\d.]+)(?:\s+offset=([\d.]+))?', lines[i])
                    if m:
                        data['noise_config'][cur_r].append({
                            'field': m.group(1).strip(),
                            'octaves': int(m.group(2)),
                            'freq': float(m.group(3)),
                            'lacunarity': int(m.group(4)),
                            'gain': float(m.group(5)),
                            'offset': float(m.group(6)) if m.group(6) else None,
                        })
                i += 1
            continue

        # ── Terrain Rules ──
        if line.startswith('Terrain Rules'):
            i += 1
            while i < len(lines) and lines[i].strip() and not lines[i].startswith('Slope Normalization') and not lines[i].startswith('===') and not is_radius_header(lines[i]) and not lines[i].startswith('Noise Config'):
                m = re.match(r'\s{2}(\w+)\s+([\d.]+)', lines[i])
                if m:
                    data['terrain_rules'][m.group(1)] = float(m.group(2))
                i += 1
            continue

        # ── Slope Normalization ──
        m = re.match(r'Slope Normalization:\s+([\d.]+)', line)
        if m:
            data['slope_norm'] = float(m.group(1))
            i += 1
            continue

        # ── Epicenter Grid ──
        m = re.match(r'Epicenter Grid:\s+cellSize=(\d+)\s+jitterAmplitude=([\d.]+)', line)
        if m:
            data['epicenter_grid'] = {'cellSize': int(m.group(1)), 'jitterAmplitude': float(m.group(2))}
            i += 1
            continue

        # ── Snapshot Tests ──
        if line == '=== Snapshot Tests ===':
            snap = {'status': 'N/A', 'radius': None, 'seeds': {}}
            i += 1
            while i < len(lines) and not lines[i].startswith('===') and not is_radius_header(lines[i]):
                m = re.match(r'Status:\s*(.+)', lines[i])
                if m: snap['status'] = m.group(1).strip()
                m = re.match(r'Radius:\s*(\d+)\s*\|\s*Seeds:\s*(\d+)', lines[i])
                if m:
                    snap['radius'] = int(m.group(1))
                    snap['num_seeds'] = int(m.group(2))
                m = re.match(r'Seed\s+"([^"]+)"\s+\((\d+)\s+tiles\):', lines[i])
                if m:
                    sname, tiles = m.group(1), int(m.group(2))
                    sd = {'tiles': tiles, 'fails': [], 'measured': {}}
                    i += 1
                    while i < len(lines) and not lines[i].startswith('Seed "') and not lines[i].startswith('===') and not is_radius_header(lines[i]) and lines[i].strip():
                        fm = re.match(r'\s+FAIL:\s+(\w+):\s+([\d.]+)%\s+out of range\s+\[([\d.]+)%,?\s*([\d.]+)%\]', lines[i])
                        if fm:
                            sd['fails'].append({'terrain': fm.group(1), 'value': float(fm.group(2)), 'lo': float(fm.group(3)), 'hi': float(fm.group(4))})
                        mm = re.match(r'\s+Measured:\s+(.+)$', lines[i])
                        if mm:
                            for tok in mm.group(1).split():
                                kv = tok.split('=')
                                if len(kv) == 2:
                                    sd['measured'][kv[0]] = kv[1].rstrip('%')
                        i += 1
                    snap['seeds'][sname] = sd
                    continue
                i += 1
            data['snapshot'] = snap
            continue

        # ── Radius block: terrain, heatmaps, histograms, freq verif, spatial, correlations ──
        rm = is_radius_header(line)
        if rm:
            r = int(re.match(r'^---\s+Radius\s+(\d+)\s+---$', line).group(1))
            ensure_radius(r)
            i += 1
            # Parse inline sections until next === or --- Radius
            while i < len(lines) and not is_radius_header(lines[i]) and not lines[i].lstrip().startswith('==='):
                if not lines[i].strip():
                    i += 1
                    continue
                block = lines[i]

                # Terrain distribution
                if block.startswith('Terrain distribution'):
                    data['radii'][r]['terrain'] = {'entries': []}
                    i += 1
                    while i < len(lines) and not lines[i].lstrip().startswith('Trader position') and not lines[i].lstrip().startswith('Pooled Histograms') and not is_radius_header(lines[i]) and not lines[i].lstrip().startswith('==='):
                        if not lines[i].strip():
                            i += 1
                            continue
                        m = re.match(r'\s{2}([\w\s]+?)\s+([\d.]+)%\s*\+/-\s*([\d.]+)\s*\(min\s+([\d.]+)%,?\s*max\s+([\d.]+)%\)', lines[i])
                        if m:
                            data['radii'][r]['terrain']['entries'].append({
                                'terrain': m.group(1).strip(),
                                'mean': float(m.group(2)),
                                'std': float(m.group(3)),
                                'min': float(m.group(4)),
                                'max': float(m.group(5)),
                            })
                        i += 1
                    continue

                # Trader heatmap
                if block.startswith('Trader position heatmap'):
                    i += 1
                    while i < len(lines) and not lines[i].lstrip().startswith('Concentration:') and not is_radius_header(lines[i]) and not lines[i].lstrip().startswith('==='):
                        i += 1
                    if i < len(lines):
                        m = re.match(r'\s+Concentration:\s+Gini=([\d.]+)\s+unique=(\d+)\s+expected=([\d.]+)\s+\(obs/exp ratio:\s*([\d.]+)\)', lines[i])
                        if m:
                            data['radii'][r]['trader_heatmap'] = {
                                'gini': float(m.group(1)),
                                'unique': int(m.group(2)),
                                'expected': float(m.group(3)),
                                'obs_exp_ratio': float(m.group(4)),
                            }
                    i += 1
                    continue

                # Champion heatmap
                if block.startswith('Champion spawn heatmap'):
                    i += 1
                    while i < len(lines) and not lines[i].lstrip().startswith('Concentration:') and not is_radius_header(lines[i]) and not lines[i].lstrip().startswith('==='):
                        i += 1
                    if i < len(lines):
                        m = re.match(r'\s+Concentration:\s+Gini=([\d.]+)\s+unique=(\d+)\s+expected=([\d.]+)\s+\(obs/exp ratio:\s*([\d.]+)\)', lines[i])
                        if m:
                            data['radii'][r]['champ_heatmap'] = {
                                'gini': float(m.group(1)),
                                'unique': int(m.group(2)),
                                'expected': float(m.group(3)),
                                'obs_exp_ratio': float(m.group(4)),
                            }
                    i += 1
                    continue

                # Pooled Histograms
                if block.startswith('Pooled Histograms'):
                    data['radii'][r]['histograms'] = {'fields': []}
                    i += 1
                    while i < len(lines) and not lines[i].lstrip().startswith('Frequency Verification') and not is_radius_header(lines[i]) and not lines[i].lstrip().startswith('==='):
                        if not lines[i].strip():
                            i += 1
                            continue
                        m = re.match(r'\s{2}([\w\s]+?)\s+p10=([\d.]+)\s+p25=([\d.]+)\s+p50=([\d.]+)\s+p75=([\d.]+)\s+p90=([\d.]+)\s+p99=([\d.]+)', lines[i])
                        if m:
                            data['radii'][r]['histograms']['fields'].append({
                                'field': m.group(1).strip(),
                                'p10': float(m.group(2)), 'p25': float(m.group(3)),
                                'p50': float(m.group(4)), 'p75': float(m.group(5)),
                                'p90': float(m.group(6)), 'p99': float(m.group(7)),
                            })
                        i += 1
                    continue

                # Frequency Verification
                if block.startswith('Frequency Verification'):
                    data['radii'][r]['freq_verif'] = {'fields': []}
                    i += 1
                    cur_field = None
                    while i < len(lines) and not is_radius_header(lines[i]) and not lines[i].startswith('==='):
                        if not lines[i].strip():
                            i += 1
                            continue
                        m = re.match(r'\s{2}([\w\s]+?):', lines[i])
                        if m and not lines[i].strip().startswith('config freq=') and not lines[i].strip().startswith('target:') and not lines[i].strip().startswith('zero-crossings') and not lines[i].strip().startswith('effective'):
                            cur_field = m.group(1).strip()
                            data['radii'][r]['freq_verif']['fields'].append({'name': cur_field, 'lines': []})
                        elif cur_field:
                            data['radii'][r]['freq_verif']['fields'][-1]['lines'].append(lines[i].strip())
                        i += 1
                    continue

                # Spatial Statistics
                if block.startswith('Spatial Statistics'):
                    data['radii'][r]['spatial'] = {'entries': []}
                    i += 1
                    while i < len(lines) and not lines[i].lstrip().startswith('Cross-field Correlations') and not is_radius_header(lines[i]) and not lines[i].lstrip().startswith('==='):
                        if not lines[i].strip():
                            i += 1
                            continue
                        m = re.match(r'\s{2}(\w+)\s+patches=([\d.]+)\s+singletons=([\d.]+)\s+mean=([\d.]+)\s+med=([\d.]+)\s+largest=([\d.]+)%\s+gini=([\d.]+)', lines[i])
                        if m:
                            data['radii'][r]['spatial']['entries'].append({
                                'terrain': m.group(1),
                                'patches': float(m.group(2)),
                                'singletons': float(m.group(3)),
                                'mean': float(m.group(4)),
                                'median': float(m.group(5)),
                                'largest_pct': float(m.group(6)),
                                'gini': float(m.group(7)),
                            })
                        i += 1
                    continue

                # Cross-field Correlations
                if block.startswith('Cross-field Correlations'):
                    data['radii'][r]['correlations'] = {'entries': []}
                    i += 1
                    while i < len(lines) and not is_radius_header(lines[i]) and not lines[i].startswith('==='):
                        if not lines[i].strip():
                            i += 1
                            continue
                        m = re.match(r'\s{2}([\w\s]+?)\s+r=([-\d.]+)\s+±([\d.]+)', lines[i])
                        if m:
                            data['radii'][r]['correlations']['entries'].append({
                                'pair': m.group(1).strip(),
                                'r': float(m.group(2)),
                                'std': float(m.group(3)),
                            })
                        i += 1
                    continue

                # Not a recognized block header, skip
                i += 1
            continue

        # ── Chunk-Seam Test (top-level, carries its own radius) ──
        if line == '=== Chunk-Seam Invariant Test (multi-seed) ===':
            i += 1
            seam_radius = None
            while i < len(lines) and not is_radius_header(lines[i]) and not lines[i].startswith('==='):
                if not lines[i].strip():
                    i += 1
                    continue
                m = re.match(r'Seeds:\s*(\d+)\s*\|\s*Radius:\s*(\d+)', lines[i])
                if m:
                    seam_radius = int(m.group(2))
                    seam_data = {
                        'num_seeds': int(m.group(1)),
                        'fail_count': 0,
                        'pass_count': 0,
                        'total': 0,
                        'status': 'PASSED',
                        'seed_details': [],
                        'total_mismatches': 0,
                    }
                    i += 1
                    # Skip blank lines before status line
                    while i < len(lines) and not lines[i].strip():
                        i += 1
                    m2 = re.match(r'(\d+)/(\d+)\s+seed\(s\)\s+(FAILED|PASSED):', lines[i])
                    if m2:
                        seam_data['fail_count'] = int(m2.group(1))
                        seam_data['total'] = int(m2.group(2))
                        seam_data['pass_count'] = seam_data['total'] - seam_data['fail_count']
                        seam_data['status'] = m2.group(3)
                    i += 1
                    # Parse individual seed results
                    while i < len(lines) and not is_radius_header(lines[i]) and not lines[i].startswith('==='):
                        if not lines[i].strip():
                            i += 1
                            continue
                        m3 = re.match(r'\s*Seed\s+"([^"]+)":\s*(\d+)\s+mismatch\(es\)', lines[i])
                        if m3:
                            sd = {'name': m3.group(1), 'count': int(m3.group(2)), 'mismatches': []}
                            seam_data['total_mismatches'] += sd['count']
                            i += 1
                            while i < len(lines) and not re.match(r'\s*Seed\s+"', lines[i]) and not is_radius_header(lines[i]) and not lines[i].startswith('==='):
                                if not lines[i].strip():
                                    i += 1
                                    continue
                                mm = re.match(r'\s*\((-?\d+,-?\d+)\)\s+terrain:\s+stored="([^"]+)"\s+recomputed="([^"]+)"', lines[i])
                                if mm:
                                    sd['mismatches'].append({
                                        'coord': mm.group(1),
                                        'stored': mm.group(2),
                                        'recomputed': mm.group(3),
                                    })
                                i += 1
                            seam_data['seed_details'].append(sd)
                            continue
                        i += 1
                    if seam_radius is not None:
                        data['seam_results'][seam_radius] = seam_data
                    continue
                i += 1
            continue

        # ── Climate Coverage Report (top-level, carries its own radius) ──
        if line == '=== Climate Coverage Report ===':
            i += 1
            cl_radius = None
            cl_data = {'biomes': {}, 'biome_default_count': 0, 'gap_cells': []}
            while i < len(lines) and not is_radius_header(lines[i]) and not lines[i].startswith('==='):
                if not lines[i].strip():
                    i += 1
                    continue
                m = re.match(r'Seed:\s*(.+?)\s*\|\s*Radius:\s*(\d+)\s*\|\s*Tiles:\s*(\d+)', lines[i])
                if m:
                    cl_radius = int(m.group(2))
                    cl_data['seed'] = m.group(1)
                    cl_data['tiles'] = int(m.group(3))
                m = re.match(r'\s{2}(\w[\w_]*):\s*(\d+)\s+tiles?\s*\(([\d.]+)%\)', lines[i])
                if m:
                    cl_data['biomes'][m.group(1)] = {'tiles': int(m.group(2)), 'pct': float(m.group(3))}
                m = re.match(r'\s*biome_default tiles:\s*(\d+)\s+\(coverage gaps\)', lines[i])
                if m:
                    cl_data['biome_default_count'] = int(m.group(1))
                m = re.match(r'Climate cells covered only by biome_default:\s*(\d+)', lines[i])
                if m:
                    ge = {'count': int(m.group(1)), 'cells': []}
                    i += 1
                    while i < len(lines) and not lines[i].startswith('Spatial Statistics') and not lines[i].startswith('=== Climate Coverage') and not lines[i].startswith('Note:') and not is_radius_header(lines[i]) and not lines[i].startswith('==='):
                        if not lines[i].strip():
                            i += 1
                            continue
                        cc = re.match(r'\s+elev\s*\[([\d.]+),\s*([\d.]+)\]\s+moist\s*\[([\d.]+),\s*([\d.]+)\]\s+\((\d+)\s+tiles?\)', lines[i])
                        if cc:
                            ge['cells'].append({
                                'elev_lo': float(cc.group(1)), 'elev_hi': float(cc.group(2)),
                                'moist_lo': float(cc.group(3)), 'moist_hi': float(cc.group(4)),
                                'tiles': int(cc.group(5)),
                            })
                        i += 1
                    cl_data['gap_cells'].append(ge)
                    continue
                i += 1
            if cl_radius is not None:
                data['climate_results'][cl_radius] = cl_data
            else:
                # If we couldn't determine the radius, attach to default
                pass
            continue

        # ── Threshold Derivation ──
        if line == '=== Threshold Derivation ===':
            i += 1
            while i < len(lines) and not lines[i].startswith('Derived Thresholds') and not lines[i].startswith('=== Exchange'):
                i += 1
            i += 1  # skip "Derived Thresholds" line
            while i < len(lines) and not lines[i].startswith('Slope normalization') and not lines[i].startswith('Quantile LUT') and not lines[i].startswith('==='):
                if not lines[i].strip():
                    i += 1
                    continue
                m = re.match(r'\s{2}(\w+)\s+([\d.]+)\s+\(p(\d+)[,.]?\s*([\w\s]*)\)', lines[i])
                if m:
                    data['threshold_derivation'][m.group(1)] = {
                        'value': float(m.group(2)),
                        'percentile': f"p{m.group(3)}",
                        'field': m.group(4).strip(),
                    }
                i += 1
            while i < len(lines) and not lines[i].startswith('Quantile LUT') and not is_radius_header(lines[i]) and not lines[i].startswith('==='):
                m = re.match(r'Slope normalization:\s+([\d.]+)', lines[i])
                if m:
                    data['threshold_derivation']['slope_norm'] = float(m.group(1))
                i += 1
            if i < len(lines) and lines[i].startswith('Quantile LUT'):
                data['quantile_lut'] = {'fields': []}
                i += 1
                while i < len(lines) and not lines[i].startswith('===') and not lines[i].startswith('---'):
                    if not lines[i].strip():
                        i += 1
                        continue
                    m = re.match(r'\s{2}([\w\s]+?)\s+raw:([\d.]+)→([\d.]+)\s+raw:([\d.]+)→([\d.]+)\s+raw:([\d.]+)→([\d.]+)', lines[i])
                    if m:
                        data['quantile_lut']['fields'].append({
                            'field': m.group(1).strip(),
                            'p10_raw': float(m.group(2)), 'p10_norm': float(m.group(3)),
                            'p50_raw': float(m.group(4)), 'p50_norm': float(m.group(5)),
                            'p90_raw': float(m.group(6)), 'p90_norm': float(m.group(7)),
                        })
                    i += 1
                continue

        i += 1

    return data


# ──────────────────────── HELPERS ────────────────────────

def fmt(val, width=8, decimals=2):
    if val is None:
        return '—'.rjust(width)
    return f'{val:>.{decimals}f}'.rjust(width)


def fmt_pct(val, width=7):
    if val is None:
        return '—'.rjust(width)
    return f'{val:>.1f}%'.rjust(width)


# ──────────────────────── COMPARATORS ────────────────────────

def compare_configs(datasets, labels):
    parts = []
    # Collect all data for comparison
    configs = [d['config'] for d in datasets]
    t_rules = [d['terrain_rules'] for d in datasets]
    noises = [d['noise_config'] for d in datasets]
    slopes = [d['slope_norm'] for d in datasets]
    epis = [d['epicenter_grid'] for d in datasets]

    def all_same(vals):
        return len(set(str(v) for v in vals)) <= 1

    if (all_same(configs) and all_same(t_rules) and all_same(noises)
            and all_same(slopes) and all_same(epis)):
        return '  (no configuration changes)'

    parts.append(f'  {"Parameter":<30} {" | ".join(f"{l:>20}" for l in labels)}')

    for k in ['base_seed', 'num_seeds', 'radii']:
        vals = [str(d['config'].get(k, '—')) for d in datasets]
        if not all_same(vals):
            parts.append(f'  {k:<30} {" | ".join(f"{v:>20}" for v in vals)}')

    all_keys = sorted(set(k for d in t_rules for k in d))
    for k in all_keys:
        vals = [d.get(k) for d in t_rules]
        if not all_same(vals):
            parts.append(f'  {k:<30} {" | ".join(f"{fmt(v, width=10, decimals=4):>20}" if v is not None else "—".rjust(20) for v in vals)}')

    vals = slopes
    if not all_same(vals):
        parts.append(f'  {"slope_norm":<30} {" | ".join(f"{fmt(v, width=10, decimals=4):>20}" if v is not None else "—".rjust(20) for v in vals)}')

    for k in ['cellSize', 'jitterAmplitude']:
        vals = [epi.get(k, '—') for epi in epis]
        if not all_same(vals):
            parts.append(f'  epicenter_{k:<20} {" | ".join(f"{str(v):>20}" for v in vals)}')

    return '\n'.join(parts)


def compare_snapshot(datasets, labels):
    parts = []
    snaps = [d['snapshot'] for d in datasets]
    if all(s is None for s in snaps):
        return '  (no snapshot test data)'
    present = [(i, s) for i, s in enumerate(snaps) if s is not None]
    if len(present) <= 1:
        for idx, s in present:
            fc = sum(1 for sd in s['seeds'].values() if sd['fails'])
            parts.append(f'  [{labels[idx]}] Status: {s.get("status", "N/A")}  ({fc}/{len(s["seeds"])} seeds with failures)')
        return '\n'.join(parts)

    # Multiple have snapshot data
    for idx, s in present:
        fc = sum(1 for sd in s['seeds'].values() if sd['fails'])
        parts.append(f'  [{labels[idx]}] Status: {s.get("status", "N/A")}  ({fc}/{len(s["seeds"])} seeds failed)')

    parts.append('')
    parts.append(f'  {"Seed":<16} {" | ".join(f"{labels[i]:>32}" for i, _ in present)}')
    all_seeds = sorted(set(k for _, s in present for k in s['seeds']))
    for seed in all_seeds:
        row = []
        for idx, s in present:
            sd = s['seeds'].get(seed)
            if not sd:
                row.append('—'.rjust(32))
            elif not sd['fails']:
                row.append('PASS'.rjust(32))
            else:
                fls = ', '.join(f"{f['terrain']}={f['value']:.1f}" for f in sd['fails'][:3])
                if len(sd['fails']) > 3:
                    fls += '...'
                row.append(fls.rjust(32))
        parts.append(f'  {seed:<16} {" | ".join(row)}')
    return '\n'.join(parts)


def compare_terrain(datasets, labels):
    parts = []
    all_radii = sorted(set(r for d in datasets for r in d['radii']))
    for r in all_radii:
        has = [r in d['radii'] and 'terrain' in d['radii'][r] for d in datasets]
        if not any(has):
            continue

        all_t = sorted(set(e['terrain'] for i, d in enumerate(datasets) if has[i] for e in d['radii'][r]['terrain']['entries']))

        parts.append(f'\n── Radius {r} terrain ──')
        parts.append(f'  {"Terrain":<18} {" | ".join(f"{labels[i]:>30}" for i, h in enumerate(has) if h)}')

        # Compact representations showing mean only
        for t in all_t:
            entries = []
            for i, d in enumerate(datasets):
                if not has[i]:
                    entries.append(None)
                else:
                    found = [e for e in d['radii'][r]['terrain']['entries'] if e['terrain'] == t]
                    entries.append(found[0] if found else None)
            row = []
            vals = []
            for e in entries:
                if e:
                    row.append(f'{e["mean"]:>5.1f}% ±{e["std"]:.1f}')
                    vals.append(e['mean'])
                else:
                    row.append('—'.rjust(12))
            parts.append(f'  {t:<18} {" | ".join(p.rjust(30) for p in row)}')

            if len(vals) >= 2:
                deltas = []
                for vi in range(1, len(vals)):
                    d = vals[vi] - vals[vi-1]
                    deltas.append(d)
                # Only show delta line if any delta >= 0.5pp
                if any(abs(d) >= 0.5 for d in deltas):
                    delta_strs = []
                    for d in deltas:
                        sign = '+' if d >= 0 else ''
                        delta_strs.append(f'{sign}{d:.2f}pp')
                    parts.append(f'  {"  Δ":<18}  {" | ".join(f"{ds:>12}" for ds in delta_strs)}')

    return '\n'.join(parts)


def compare_histograms(datasets, labels):
    parts = []
    all_radii = sorted(set(r for d in datasets for r in d['radii']))
    for r in all_radii:
        has = [r in d['radii'] and 'histograms' in d['radii'][r] for d in datasets]
        if not any(has):
            continue

        all_f = sorted(set(f['field'] for i, d in enumerate(datasets) if has[i] for f in d['radii'][r]['histograms']['fields']))
        # Only show if values differ
        changed = []
        for f in all_f:
            p90s = []
            for i, d in enumerate(datasets):
                if not has[i]:
                    p90s.append(None)
                else:
                    found = [e for e in d['radii'][r]['histograms']['fields'] if e['field'] == f]
                    p90s.append(found[0]['p90'] if found else None)
            if len(set(str(v) for v in p90s if v is not None)) > 1:
                changed.append((f, p90s))

        if not changed:
            continue

        parts.append(f'\n── Radius {r} histogram p90 changes ──')
        parts.append(f'  {"Field":<18} {" | ".join(f"{labels[i]:>24}" for i, h in enumerate(has) if h)}')
        for f, p90s in changed:
            row = [f'{p90:.3f}'.rjust(24) if p90 is not None else '—'.rjust(24) for p90 in p90s]
            parts.append(f'  {f:<18} {" | ".join(row)}')

    return '\n'.join(parts)


def compare_seam(datasets, labels):
    parts = []
    all_radii = sorted(set(r for d in datasets for r in d['seam_results']))
    if not all_radii:
        return '  (no seam test data or identical across reports)'

    for r in all_radii:
        has_data = [r in d['seam_results'] for d in datasets]
        parts.append(f'\n── Radius {r} seam test ──')
        for i, d in enumerate(datasets):
            if not has_data[i]:
                parts.append(f'  [{labels[i]}] —')
                continue
            sd = d['seam_results'][r]
            tm = sd.get('total_mismatches', 0)
            parts.append(f'  [{labels[i]}] {sd["status"]}  pass={sd["pass_count"]}/{sd["total"]}  total_mismatches={tm}')

    return '\n'.join(parts)


def compare_climate(datasets, labels):
    parts = []
    all_radii = sorted(set(r for d in datasets for r in d['climate_results']))
    if not all_radii:
        return '  (no climate coverage data)'

    for r in all_radii:
        has_data = [r in d['climate_results'] for d in datasets]
        # Check if biome_default counts differ
        counts = [d['climate_results'][r]['biome_default_count'] if has_data[i] else None for i, d in enumerate(datasets)]
        if len(set(str(c) for c in counts if c is not None)) <= 1:
            # All same, check biomes
            all_same = True
            all_biomes = sorted(set(b for i, d in enumerate(datasets) if has_data[i] for b in d['climate_results'][r]['biomes']))
            for b in all_biomes:
                pcts = []
                for i, d in enumerate(datasets):
                    if has_data[i]:
                        pcts.append(d['climate_results'][r]['biomes'].get(b, {}).get('pct', 0))
                if len(set(str(p) for p in pcts)) > 1:
                    all_same = False
                    break
            if all_same:
                continue

        parts.append(f'\n── Radius {r} climate coverage ──')
        # biome_default gap tiles
        cstrs = []
        for i, d in enumerate(datasets):
            if has_data[i]:
                cstrs.append(str(d['climate_results'][r]['biome_default_count']))
            else:
                cstrs.append('—')
        parts.append(f'  biome_default gap: {" | ".join(f"{c:>6}" for c in cstrs)}')

        all_biomes = sorted(set(b for i, d in enumerate(datasets) if has_data[i] for b in d['climate_results'][r]['biomes']))
        parts.append(f'  {"Biome":<24} {" | ".join(f"{labels[i]:>20}" for i, h in enumerate(has_data) if h)}')
        for b in all_biomes:
            pcts = []
            for i, d in enumerate(datasets):
                if has_data[i]:
                    pcts.append(d['climate_results'][r]['biomes'].get(b, {}).get('pct', 0))
                else:
                    pcts.append(None)
            if len(set(str(p) for p in pcts if p is not None)) <= 1:
                continue
            parts.append(f'  {b:<24} {" | ".join(f"{fmt_pct(p, width=8):>20}" if p is not None else "—".rjust(20) for p in pcts)}')

    return '\n'.join(parts)


def compare_spatial(datasets, labels):
    parts = []
    all_radii = sorted(set(r for d in datasets for r in d['radii']))
    for r in all_radii:
        has = [r in d['radii'] and 'spatial' in d['radii'][r] for d in datasets]
        if not any(has):
            continue

        all_t = sorted(set(e['terrain'] for i, d in enumerate(datasets) if has[i] for e in d['radii'][r]['spatial']['entries']))

        changed = []
        for t in all_t:
            ginis = []
            for i, d in enumerate(datasets):
                if not has[i]:
                    ginis.append(None)
                else:
                    found = [e for e in d['radii'][r]['spatial']['entries'] if e['terrain'] == t]
                    ginis.append(found[0]['gini'] if found else None)
            if len(set(str(g) for g in ginis if g is not None)) > 1:
                changed.append((t, ginis))

        if not changed:
            continue

        parts.append(f'\n── Radius {r} spatial Gini (changes) ──')
        parts.append(f'  {"Terrain":<18} {" | ".join(f"{labels[i]:>24}" for i, h in enumerate(has) if h)}')
        for t, ginis in changed:
            row = [f'{g:.4f}'.rjust(24) if g is not None else '—'.rjust(24) for g in ginis]
            parts.append(f'  {t:<18} {" | ".join(row)}')

    return '\n'.join(parts)


def compare_thresholds(datasets, labels):
    parts = []
    all_thresh = [d['threshold_derivation'] for d in datasets]
    if all(not t for t in all_thresh):
        return '  (no threshold derivation data)'

    all_keys = sorted(set(k for d in all_thresh for k in d), key=lambda k: (k == 'slope_norm', k))
    changed_keys = []
    for k in all_keys:
        vals = [d.get(k, {}) if isinstance(d.get(k), dict) else d.get(k) for d in all_thresh]
        if len(set(str(v) for v in vals if v is not None)) > 1:
            changed_keys.append(k)

    if not changed_keys:
        return '  (no threshold changes)'

    parts.append(f'\n── Threshold derivation ──')
    parts.append(f'  {"Param":<26} {" | ".join(f"{l:>24}" for l in labels)}')
    for k in changed_keys:
        if k == 'slope_norm':
            vals = [d.get(k) for d in all_thresh]
            parts.append(f'  {k:<26} {" | ".join(f"{fmt(v, width=12, decimals=4):>24}" if v is not None else "—".rjust(24) for v in vals)}')
        else:
            vals = [d.get(k, {}).get('value') for d in all_thresh]
            pcts = [d.get(k, {}).get('percentile', '') for d in all_thresh]
            parts.append(f'  {k:<26} {" | ".join(f"{fmt(v, width=10, decimals=4):>24}" if v is not None else "—".rjust(24) for v in vals)}')
            parts.append(f'  {"":>26} {" | ".join(f"{p:>24}" for p in pcts)}')

    return '\n'.join(parts)


# ──────────────────────── MAIN ────────────────────────

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    paths = [Path(p) for p in sys.argv[1:]]
    if len(paths) > 6:
        print('Error: at most 6 reports can be compared at once.', file=sys.stderr)
        sys.exit(1)

    for p in paths:
        if not p.exists():
            print(f'Error: file not found: {p}', file=sys.stderr)
            sys.exit(1)

    labels = []
    for p in paths:
        m = re.search(r'T(\d{2}-\d{2})', p.stem)
        labels.append(m.group(1) if m else p.stem.replace('batch_report_', 'r')[:12])
    datasets = [parse_report(p.read_text()) for p in paths]

    print('#' * 72)
    print(f'# Batch Report Comparison')
    print(f'# Files: {", ".join(str(p) for p in paths)}')
    print('#' * 72)

    print('\n═══ Config Changes ═══')
    print(compare_configs(datasets, labels))

    print('\n═══ Snapshot Tests ═══')
    print(compare_snapshot(datasets, labels))

    print('\n═══ Terrain Distribution ═══')
    print(compare_terrain(datasets, labels))

    print('\n═══ Histogram Percentiles ═══')
    print(compare_histograms(datasets, labels))

    print('\n═══ Chunk-Seam Test ═══')
    print(compare_seam(datasets, labels))

    print('\n═══ Climate Coverage ═══')
    print(compare_climate(datasets, labels))

    print('\n═══ Spatial Gini (changes) ═══')
    print(compare_spatial(datasets, labels))

    print('\n═══ Threshold Derivation ═══')
    print(compare_thresholds(datasets, labels))

    print('')


if __name__ == '__main__':
    main()
