from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any


def _box(value: Any) -> list[float] | None:
    if value is None:
        return None
    if hasattr(value, "model_dump"):
        value = value.model_dump()
    if isinstance(value, dict) and all(k in value for k in ("l", "t", "r", "b")):
        try:
            return [float(value[k]) for k in ("l", "t", "r", "b")]
        except (TypeError, ValueError):
            return None
    if isinstance(value, (list, tuple)) and len(value) >= 4:
        try:
            return [float(value[i]) for i in range(4)]
        except (TypeError, ValueError):
            return None
    return None


def _paddle_result_dict(result: Any) -> dict[str, Any]:
    value = getattr(result, "json", None)
    if callable(value):
        value = value()
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return {}
    if not isinstance(value, dict):
        return {}
    data = value.get("res")
    return data if isinstance(data, dict) else value


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return list(value)
    try:
        return value.tolist()
    except AttributeError:
        return [value]


def _run_paddle(image_path: Path, model_root: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    os.environ["PADDLE_PDX_CACHE_HOME"] = str(model_root)
    os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "1"
    os.environ["PADDLE_PDX_OFFLINE"] = "1"
    os.environ["PYTHONNOUSERSITE"] = "1"

    import numpy as np

    if not hasattr(np, "long"):
        np.long = np.int64
    if not hasattr(np, "int"):
        np.int = int
    if not hasattr(np, "bool"):
        np.bool = np.bool_
    if not hasattr(np, "float"):
        np.float = float

    from paddleocr import PaddleOCR

    pipeline = PaddleOCR(
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_detection_model_dir=None,
        text_recognition_model_name="latin_PP-OCRv5_mobile_rec",
        text_recognition_model_dir=None,
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        text_det_limit_side_len=4096,
        text_det_limit_type="max",
        enable_mkldnn=True,
        cpu_threads=max(1, min(8, os.cpu_count() or 1)),
        device="cpu",
    )

    lines: list[dict[str, Any]] = []
    structured: list[dict[str, Any]] = []
    for item in pipeline.predict(str(image_path)):
        data = _paddle_result_dict(item)
        structured.append(data)
        texts = _as_list(data.get("rec_texts")) or _as_list(data.get("text"))
        scores = _as_list(data.get("rec_scores"))
        boxes = _as_list(data.get("rec_boxes")) or _as_list(data.get("rec_polys"))
        for index, raw_text in enumerate(texts):
            text = str(raw_text).strip()
            if not text:
                continue
            score = None
            if index < len(scores):
                try:
                    score = float(scores[index])
                except (TypeError, ValueError):
                    pass
            box = _box(boxes[index]) if index < len(boxes) else None
            lines.append({"text": text, "score": score, "box": box})

    return lines, structured


def _run_docling(path: Path, artifacts_root: Path) -> dict[str, Any]:
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import AcceleratorDevice, AcceleratorOptions, PdfPipelineOptions
    from docling.document_converter import DocumentConverter, ImageFormatOption, PdfFormatOption

    options = PdfPipelineOptions(
        do_ocr=False,
        do_table_structure=True,
        generate_page_images=False,
        generate_picture_images=False,
        do_formula_enrichment=False,
        do_code_enrichment=False,
        artifacts_path=artifacts_root,
        accelerator_options=AcceleratorOptions(
            num_threads=max(1, min(8, os.cpu_count() or 1)),
            device=AcceleratorDevice.CPU,
        ),
    )
    fmt = InputFormat.PDF if path.suffix.lower() == ".pdf" else InputFormat.IMAGE
    format_option = PdfFormatOption(pipeline_options=options) if fmt == InputFormat.PDF else ImageFormatOption(
        pipeline_options=options
    )
    converter = DocumentConverter(allowed_formats=[fmt], format_options={fmt: format_option})
    result = converter.convert(path, raises_on_error=False)
    if result.document is None:
        raise RuntimeError("Docling belge yapısını çıkaramadı.")

    doc = result.document
    tables: list[dict[str, Any]] = []
    for index, table in enumerate(getattr(doc, "tables", [])):
        bbox = None
        page_no = None
        if getattr(table, "prov", None):
            prov = table.prov[0]
            bbox = _box(getattr(prov, "bbox", None))
            page_no = getattr(prov, "page_no", None)
        try:
            dataframe = table.export_to_dataframe(doc=doc)
            rows = dataframe.fillna("").astype(str).values.tolist()
            columns = [str(c) for c in dataframe.columns]
        except Exception:
            rows, columns = [], []
        tables.append({"index": index, "page": page_no, "box": bbox, "columns": columns, "rows": rows})

    try:
        text = doc.export_to_text(traverse_pictures=True)
    except Exception:
        text = ""

    return {
        "provider": "docling-layout-table",
        "version": "2.128.0",
        "text": text,
        "tables": tables,
        "pages": len(getattr(doc, "pages", {})),
        "status": str(getattr(result, "status", "unknown")),
    }


def _render_pdf_pages(pdf_path: Path, temp_root: Path) -> list[Path]:
    import fitz

    doc = fitz.open(pdf_path)
    output: list[Path] = []
    try:
        for page_no, page in enumerate(doc):
            pix = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False)
            target = temp_root / f"page-{page_no + 1}.png"
            pix.save(str(target))
            output.append(target)
    finally:
        doc.close()
    return output


def analyze(input_path: Path, output_path: Path, model_root: Path, docling_root: Path) -> None:
    if not input_path.is_file():
        raise FileNotFoundError(f"Belge bulunamadı: {input_path}")
    if input_path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".pdf"}:
        raise ValueError("Desteklenmeyen belge türü. PNG, JPG veya PDF kullanın.")

    with tempfile.TemporaryDirectory(prefix="zeminlab-doc-") as tmp:
        temp_root = Path(tmp)
        docling_error = None
        try:
            document = _run_docling(input_path, docling_root)
        except Exception as error:
            document = {"provider": "docling-layout-table", "version": "2.128.0", "text": "", "tables": [], "pages": 0, "status": "failed"}
            docling_error = str(error)

        image_paths = [input_path]
        if input_path.suffix.lower() == ".pdf":
            native_text = str(document.get("text") or "").strip()
            image_paths = _render_pdf_pages(input_path, temp_root) if len(re.sub(r"\s+", "", native_text)) < 40 else []

        lines: list[dict[str, Any]] = []
        structured: list[dict[str, Any]] = []
        paddle_error = None
        for image_path in image_paths:
            try:
                page_lines, page_structured = _run_paddle(image_path, model_root)
                lines.extend(page_lines)
                structured.extend(page_structured)
            except Exception as error:
                paddle_error = str(error)

        if not lines and not str(document.get("text") or "").strip():
            raise RuntimeError("Belge okunamadı: güvenilir OCR satırı veya yerel belge metni üretilemedi.")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(
                {
                    "ok": True,
                    "provider": "zeminlab-document-intelligence",
                    "engines": {"ocr": "PaddleOCR PP-OCRv5", "layout_table": "Docling 2.128.0"},
                    "lines": lines,
                    "structured": structured,
                    "document": document,
                    "warnings": {"paddle": paddle_error, "docling": docling_error},
                    "policy": {"no_guessing": True, "requires_user_review": True, "reject_ambiguous_values": True},
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model-root", required=True)
    parser.add_argument("--docling-root", required=True)
    args = parser.parse_args()
    analyze(Path(args.input).resolve(), Path(args.output).resolve(), Path(args.model_root).resolve(), Path(args.docling_root).resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
