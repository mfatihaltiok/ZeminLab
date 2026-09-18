from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
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


def load_paddleocr_vl():
    try:
        from paddleocr import PaddleOCRVL
        return PaddleOCRVL
    except ModuleNotFoundError as error:
        if error.name != "paddleocr":
            raise

    commands = [
        [
            sys.executable, "-m", "pip", "install",
            "-U", "paddleocr[doc-parser]",
            "paddlepaddle>=3.2.1",
            "--index-url", "https://pypi.org/simple",
        ]
    ]

    last_error = None
    for command in commands:
        try:
            subprocess.check_call(command)
            from paddleocr import PaddleOCRVL
            return PaddleOCRVL
        except subprocess.CalledProcessError as error:
            last_error = error

    raise RuntimeError(
        "PaddleOCR-VL kurulamadı. PaddlePaddle >=3.2.1 ve paddleocr[doc-parser] kurulumu başarısız."
    ) from last_error


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    image_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()
    if not image_path.is_file():
        raise FileNotFoundError(f"Görsel bulunamadı: {image_path}")

    PaddleOCRVL = load_paddleocr_vl()

    model_dir = os.environ.get("ZEMINLAB_PADDLEOCR_VL_MODEL", "").strip()
    kwargs = {
        "use_doc_orientation_classify": True,
        "use_doc_unwarping": True,
        "use_layout_detection": True,
    }

    # Setup paketine model konduğunda tamamen offline çalışır.
    # Model yolu verilmezse PaddleOCR kendi yerel önbelleğini kullanır.
    if model_dir:
        kwargs["vl_rec_model_dir"] = model_dir
        kwargs["vl_rec_backend"] = "transformers"

    pipeline = PaddleOCRVL(**kwargs)
    result = pipeline.predict(str(image_path))

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
            score = float(scores[index]) if index < len(scores) else None
            box = boxes[index] if index < len(boxes) else None
            lines.append({"text": text, "score": score, "box": box})

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(
            {
                "ok": True,
                "provider": "paddleocr-vl-0.9b-local",
                "model": "PaddleOCR-VL-0.9B",
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
