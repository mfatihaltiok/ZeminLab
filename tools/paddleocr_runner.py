from __future__ import annotations

import argparse
import json
import os
from pathlib import Path


def result_to_dict(result):
    value = getattr(result, "json", None)
    if callable(value):
        value = value()
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {}
    if isinstance(value, dict):
        return value
    return {}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    image_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()
    if not image_path.is_file():
        raise FileNotFoundError(f"Görsel bulunamadı: {image_path}")

    model_root = Path(__file__).resolve().parent.parent / "resources" / "paddleocr-vl-v1"
    if not model_root.is_dir():
        raise RuntimeError("Yerel PaddleOCR model paketi bulunamadı.")

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

    try:
        from paddleocr import PaddleOCR
    except ModuleNotFoundError as error:
        raise RuntimeError(
            "Bundled PaddleOCR runtime bulunamadı. ZeminLab kurulumu "
            "resources/python-runtime ve PaddleOCR paketini içermelidir."
        ) from error

    # Evrensel taban: yalnızca CPU. Böylece hedef bilgisayarın GPU/CUDA
    # markası veya sürümü OCR'un çalışması için gerekli değildir.
    cpu_threads = max(1, min(8, os.cpu_count() or 1))

    try:
        pipeline = PaddleOCR(
            lang="tr",
            ocr_version="PP-OCRv5",
            device="cpu",
            use_doc_orientation_classify=True,
            use_doc_unwarping=True,
            use_textline_orientation=True,
            text_det_limit_side_len=2048,
            text_det_limit_type="max",
            enable_mkldnn=True,
            cpu_threads=cpu_threads,
        )
        result = pipeline.predict(str(image_path))
    except Exception as error:
        raise RuntimeError(f"PaddleOCR görüntü işleme başarısız oldu: {error}") from error

    lines = []
    structured = []

    for item in result:
        data = result_to_dict(item)
        structured.append(data)

        texts = data.get("rec_texts") or data.get("text") or []
        scores = data.get("rec_scores") or []
        boxes = data.get("rec_boxes") or data.get("rec_polys") or []

        if isinstance(texts, str):
            texts = [texts]

        for index, text in enumerate(texts):
            text = str(text).strip()
            if not text:
                continue

            score = None
            if index < len(scores):
                try:
                    score = float(scores[index])
                except (TypeError, ValueError):
                    score = None

            box = boxes[index] if index < len(boxes) else None
            lines.append({
                "text": text,
                "score": score,
                "box": box,
            })

    if not lines and not structured:
        raise RuntimeError("PaddleOCR görüntüyü işledi ancak okunabilir sonuç üretmedi.")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(
            {
                "ok": True,
                "provider": "paddleocr-pp-ocrv5-local-cpu",
                "model": "PP-OCRv5",
                "language": "tr",
                "device": "cpu",
                "lines": lines,
                "structured": structured,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
