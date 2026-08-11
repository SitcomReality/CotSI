#!/usr/bin/env python3
"""
Parse calibration_v1.json and print a concise threshold summary.

Usage:
  python3 dev/scripts/parse_calibration.py [path/to/calibration_v1.json]

If no path is given, looks for calibration_v1.json in the current directory.

Outputs:
  1. A table of derived thresholds with target percentiles and fields
  2. The exact DEFAULT_TERRAIN_RULES override ready to paste into terrainGenParams.js
  3. Optional: raw JSON threshold-only export with --json flag
"""

import json
import sys
from pathlib import Path


def load_calibration(path):
    with open(path) as f:
        return json.load(f)


def print_threshold_table(calib):
    thresholds = calib.get("thresholds", {})
    meta = calib.get("meta", {})

    print("=" * 70)
    print(f"Calibration: {calib.get('title', 'Unknown')}")
    print(f"Generated:  {meta.get('dateGenerated', 'Unknown')}")
    print(f"Seeds: {meta.get('seedCount', '?')}  "
          f"Radii: {meta.get('radii', '?')}  "
          f"Fingerprint: {meta.get('noiseConfigFingerprint', '?')}")
    print("=" * 70)
    print()

    # Threshold table
    header = f"{'Threshold':<28} {'Value':>8}  {'Target %':>9}  {'Field':<12}"
    print(header)
    print("-" * len(header))

    for key, t in thresholds.items():
        label = key
        value = t.get("value", 0)
        target = t.get("targetPercentile", "?")
        field = t.get("field", "?")
        print(f"  {label:<26} {value:>8.4f}  p{target:>7}  {field:<12}")

    # Slope normalization
    sn = calib.get("slopeNormalization", {})
    if sn:
        print()
        print(f"Slope normalization: {sn.get('value', '?'):.4f}")
        print(f"  ({sn.get('method', '?')})")
    print()


def print_rules_override(calib):
    """Print DEFAULT_TERRAIN_RULES object ready to paste into terrainGenParams.js."""
    thresholds = calib.get("thresholds", {})

    print("--- Copy-paste into src/params/game/terrainGenParams.js ---")
    print()
    print("export const DEFAULT_TERRAIN_RULES = {")

    # Elevation-derived (sorted in same order as terrainGenParams.js)
    elev_order = [
        ("waterMaxElevation",         "p12 target"),
        ("mountainThreshold",         "p97 target"),
        ("plateauThreshold",          "p90 target"),
        ("hillElevationMin",          "p55 target"),
        ("marshMaxElevation",         "p35 target"),
    ]

    for key, comment in elev_order:
        t = thresholds.get(key, {})
        val = t.get("value", "???")
        print(f"  {key}: {val:.4f},  // {comment}")

    print()

    # Moisture-derived
    moist_order = [
        ("forestMinMoisture",         "p72 target"),
        ("denseForestMinMoisture",    "p85 target"),
        ("desertMaxMoisture",         "p20 target"),
        ("marshMinMoisture",          "p58 target"),
    ]

    for key, comment in moist_order:
        t = thresholds.get(key, {})
        val = t.get("value", "???")
        print(f"  {key}: {val:.4f},  // {comment}")

    print()

    # Temperature-derived
    temp_order = [
        ("freezeTempMax",             "p15 target"),
    ]

    for key, comment in temp_order:
        t = thresholds.get(key, {})
        val = t.get("value", "???")
        print(f"  {key}: {val:.4f},  // {comment}")

    # Non-calibrated constants (keep current values)
    print()
    print("  // --- not calibrated (keep current values) ---")
    print(f"  waterMinMoisture:         0.50,")
    print(f"  treeLineMax:              0.85,")
    print(f"  snowLineMax:              0.15,")
    print("};")
    print()


def print_json_export(calib):
    """Print thresholds-only JSON (no LUT arrays)."""
    export = {
        "thresholds": calib.get("thresholds", {}),
        "slopeNormalization": calib.get("slopeNormalization", {}),
        "meta": calib.get("meta", {}),
    }
    print(json.dumps(export, indent=2))


def main():
    args = sys.argv[1:]

    # Check for --json flag
    json_mode = False
    if "--json" in args:
        json_mode = True
        args.remove("--json")

    # Find calibration file
    if args:
        path = Path(args[0])
    else:
        path = Path("calibration_v1.json")
        if not path.exists():
            path = Path("dev/calibration_v1.json")

    if not path.exists():
        print(f"Error: {path} not found.", file=sys.stderr)
        print("Usage: python3 dev/scripts/parse_calibration.py [path/to/calibration_v1.json] [--json]",
              file=sys.stderr)
        sys.exit(1)

    calib = load_calibration(path)

    if json_mode:
        print_json_export(calib)
    else:
        print_threshold_table(calib)
        print_rules_override(calib)


if __name__ == "__main__":
    main()
