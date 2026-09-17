from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import fitz

FIGURE_RE = re.compile(r"(?:Şekil|Fig(?:ure)?|TABLO|Table)\s*([0-9A-Za-zÇçĞğİıÖöŞşÜü.-]+)", re.I)


def index_pdf(pdf_path: Path, source_key: str, output_dir: Path, dpi: int = 144) -> list[dict]:
    output_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    result: list[dict] = []
    zoom = dpi / 72.0
    matrix = fitz.Matrix(zoom, zoom)
    for page_no, page in enumerate(doc, start=1):
        text = page.get_text("text") or ""
        labels = [m.group(1) for m in FIGURE_RE.finditer(text)]
        # Render each page containing figure/table markers. The report layer can
        # later crop/select the relevant page using exact source metadata.
        if not labels:
            continue
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        image_name = f"{source_key.lower()}-p{page_no:04d}.png"
        image_path = output_dir / image_name
        pix.save(image_path)
        keywords = sorted(set(re.findall(r"[A-Za-zÇçĞğİıÖöŞşÜü]{4,}", text.lower())))[:120]
        for label in labels:
            result.append({
                "id": f"{source_key}-p{page_no}-{label}",
                "sourceKey": source_key,
                "page": page_no,
                "imagePath": str(image_path).replace("\\", "/"),
                "figureLabel": label,
                "keywords": keywords,
            })
    doc.close()
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Index Erol source PDFs for offline ZeminLab reports")
    parser.add_argument("--pdf", action="append", required=True, help="PDF path")
    parser.add_argument("--source-key", action="append", required=True, help="Matching source key")
    parser.add_argument("--output", required=True, help="Source-pack output directory")
    args = parser.parse_args()
    if len(args.pdf) != len(args.source_key):
        raise SystemExit("--pdf and --source-key counts must match")

    output = Path(args.output)
    index: list[dict] = []
    for pdf, key in zip(args.pdf, args.source_key):
        index.extend(index_pdf(Path(pdf), key, output / key, dpi=144))
    index_path = output / "index.json"
    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(json.dumps({"version": 1, "figures": index}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Indexed {len(index)} figure references -> {index_path}")


if __name__ == "__main__":
    main()
