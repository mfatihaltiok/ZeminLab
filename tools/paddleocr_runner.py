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
    os.environ["PADDLE_PDX_CACHE_HOME"] = str(model_root)
    os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "1"
    os.environ["PADDLE_PDX_OFFLINE"] = "1"
    os.environ["PYTHONNOUSERSITE"] = "1"

    # PaddleOCR 3.3.2 / PaddlePaddle 3.2.x still touches legacy NumPy aliases.
    # NumPy 1.26.4 is retained for the VL runtime; restore only the aliases
    # required by the framework before importing Paddle/PaddleOCR.
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
        from paddleocr import PaddleOCRVL
    except ModuleNotFoundError as error:
        raise RuntimeError(
            "Bundled PaddleOCR runtime bulunamadı. ZeminLab kurulumu "
            "resources/python-runtime ve PaddleOCR paketini içermelidir."
        ) from error

    model_root = Path(__file__).resolve().parent.parent / "resources" / "paddleocr-vl-v1"
    vl_model_dir = model_root / "PaddleOCR-VL"
    layout_model_dir = model_root / "PP-DocLayoutV2"
    orientation_model_dir = model_root / "PP-LCNet_x1_0_doc_ori"
    unwarping_model_dir = model_root / "UVDoc"

    if not vl_model_dir.is_dir() or not layout_model_dir.is_dir():
        raise RuntimeError(
            "PaddleOCR-VL yerel model paketi bulunamadı. "
            "ZeminLab kurulumunun resources/paddleocr-vl-v1 klasörünü içerdiğini kontrol edin."
        )

    kwargs = {
        "use_doc_orientation_classify": orientation_model_dir.is_dir(),
        "use_doc_unwarping": unwarping_model_dir.is_dir(),
        "use_layout_detection": True,
        "vl_rec_model_dir": str(vl_model_dir),
        "layout_detection_model_dir": str(layout_model_dir),
    }
    if orientation_model_dir.is_dir():
        kwargs["doc_orientation_classify_model_dir"] = str(orientation_model_dir)
    if unwarping_model_dir.is_dir():
        kwargs["doc_unwarping_model_dir"] = str(unwarping_model_dir)

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
