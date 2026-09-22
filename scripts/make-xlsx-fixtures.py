#!/usr/bin/env python3
"""Generate real .xlsx fixtures that exercise every branch of the viewer.

Why a generator instead of checked-in binaries: the fixtures must be
deterministic (fixed seed, no wall clock) and reviewable, and the largest one is
multi-megabyte. Every file here has one stated purpose — a dimension of the
circuit breaker, or a parser path — so a failure points at a named cause
instead of "some spreadsheet did not render".

    python scripts/make-xlsx-fixtures.py --out ../../demo/xlsx

Requires openpyxl (bare Python is fine; this repo ships no runtime deps).
"""

from __future__ import annotations

import argparse
import os
import random
import string
from datetime import date, timedelta

from openpyxl import Workbook
from openpyxl.cell import WriteOnlyCell
from openpyxl.utils import get_column_letter

# A fixed seed keeps every fixture byte-stable across runs.
SEED = 42

TOKEN_ALPHABET = string.ascii_lowercase + string.digits


def token(rng: random.Random, length: int) -> str:
    """A poorly-compressible token, so archive size can be controlled."""
    return "".join(rng.choice(TOKEN_ALPHABET) for _ in range(length))


def build_basic(path: str) -> dict:
    """Three sheets (one hidden), real dates, a bool column, column gaps, a formula.

    Exercises: sheet list + order + hidden flag, shared strings, inline strings,
    the tz/date path (custom numFmt), boolean cells, missing cells staying gaps,
    and a formula cell (openpyxl stores no cached value — see the note printed
    by --report).
    """
    workbook = Workbook()
    data = workbook.active
    data.title = "Data"
    data.append(["ID", "Name", "Amount", "When", "Active", "Notes"])

    base = date(2026, 1, 5)
    for index in range(1, 61):
        row = [
            index,
            # Every 4th name is left out on purpose: the cell is absent from the
            # XML, and the reader must keep the gap instead of shifting columns.
            None if index % 4 == 0 else f"item-{index:03d}",
            round(index * 13.37, 2),
            base + timedelta(days=index) if index % 3 == 0 else None,
            index % 2 == 0,
            None if index % 5 else "a note that is a bit longer than the rest",
        ]
        data.append(row)

    # Number formats: money for C, a date format for D.
    for row in range(2, 62):
        data.cell(row=row, column=3).number_format = "#,##0.00"
        data.cell(row=row, column=4).number_format = "yyyy-mm-dd"

    # A formula with no cached value (openpyxl does not write one).
    data.cell(row=63, column=1, value="Total")
    data.cell(row=63, column=3, value="=SUM(C2:C61)")
    data.freeze_panes = "A2"

    detail = workbook.create_sheet("Q2 detail")
    detail.append(["Region", "Units", "Revenue"])
    for region in ("north", "south", "east", "west"):
        detail.append([region, 120, 4500.5])

    hidden = workbook.create_sheet("Hidden notes")
    hidden.append(["internal only"])
    hidden.append(["do not publish"])
    hidden.sheet_state = "hidden"

    workbook.save(path)
    return {"purpose": "sheets + hidden + dates + bool + column gaps + formula", "sheets": 3}


def build_wide(path: str, columns: int = 150, rows: int = 20) -> dict:
    """More columns than the column ceiling (default maxCols = 100)."""
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Wide"
    sheet.append([f"col_{index:03d}" for index in range(1, columns + 1)])
    for row in range(1, rows + 1):
        sheet.append([row * 1000 + column for column in range(1, columns + 1)])
    workbook.save(path)
    return {"purpose": f"{columns} columns -> column ceiling", "sheets": 1}


def build_long(path: str, rows: int = 12000) -> dict:
    """More data rows than the row ceiling (default maxRows = 10000, preview 200)."""
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Rows"
    sheet.append(["n", "label", "value", "flag"])
    for index in range(1, rows + 1):
        sheet.append([index, f"row-{index:05d}", index * 3, index % 2 == 0])
    workbook.save(path)
    return {"purpose": f"{rows} rows -> row ceiling + preview budget", "sheets": 1}


def build_long_cell(path: str, length: int = 20000) -> dict:
    """One cell far past the cell ceiling (default maxCellLength = 10240).

    20 000 chars is legal for Excel (limit 32 767), so this is a real file a user
    could actually have.
    """
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "LongCell"
    sheet.append(["id", "blob", "after"])
    sheet.append([1, "short", "kept"])
    sheet.append([2, "x" * length, "kept"])
    sheet.append([3, "short again", "kept"])
    workbook.save(path)
    return {"purpose": f"one {length:,}-char cell -> cell ceiling", "sheets": 1}


def build_deep_sheet(path: str, rows: int = 60000, columns: int = 12) -> dict:
    """A small archive whose worksheet XML inflates past the per-sheet ceiling.

    Every cell holds the same long token, so the XML is huge and highly
    compressible: the archive stays small (passing the file-size gate) while the
    declared inflated size blows past maxSheetBytes (32 MB). This is the exact
    case the two container gates exist for — a size check on the file itself
    would wave it through.
    """
    workbook = Workbook(write_only=True)
    sheet = workbook.create_sheet("Deep")
    filler = "alpha-bravo-charlie-delta-echo-01"
    sheet.append([f"c{index:02d}" for index in range(columns)])
    for _ in range(rows):
        sheet.append([filler] * columns)
    workbook.save(path)
    return {
        "purpose": f"{rows}x{columns} uniform cells -> compressed-small but inflates huge (sheet ceiling)",
        "sheets": 1,
    }


def build_big_archive(path: str, rows: int = 90000, columns: int = 6) -> dict:
    """An archive that itself exceeds the file-size gate (default 5 MB).

    Content is pseudorandom on purpose: repetitive text would compress away and
    the archive would stay small, which is exactly the asymmetry the other
    fixtures demonstrate.
    """
    rng = random.Random(SEED)
    workbook = Workbook(write_only=True)
    sheet = workbook.create_sheet("Big")
    sheet.append([f"c{index}" for index in range(columns)])
    for _ in range(rows):
        sheet.append([token(rng, 16) for _ in range(columns)])
    workbook.save(path)
    return {"purpose": f"{rows}x{columns} random tokens -> archive over the 5 MB file gate", "sheets": 1}


BUILDERS = {
    "basic-3sheets.xlsx": build_basic,
    "wide-150cols.xlsx": build_wide,
    "long-12000rows.xlsx": build_long,
    "long-cell-20k.xlsx": build_long_cell,
    "deep-sheet-60k.xlsx": build_deep_sheet,
    "big-archive.xlsx": build_big_archive,
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="demo/xlsx", help="output directory")
    parser.add_argument("--only", default="", help="build just one fixture by name")
    arguments = parser.parse_args()

    out_dir = os.path.abspath(arguments.out)
    os.makedirs(out_dir, exist_ok=True)

    print(f"fixtures -> {out_dir}")
    print(f"{'file':<24} {'bytes':>10}  purpose")
    print("-" * 100)

    for name, builder in BUILDERS.items():
        if arguments.only and arguments.only != name:
            continue
        path = os.path.join(out_dir, name)
        meta = builder(path)
        size = os.path.getsize(path)
        print(f"{name:<24} {size:>10,}  {meta['purpose']}")

    print()
    print("note: openpyxl writes formulas without a cached value, so the =SUM cell in")
    print("      basic-3sheets.xlsx renders EMPTY. A file saved by Excel/WPS carries the")
    print("      cached <v> and renders the number — the reader shows what the file holds.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
