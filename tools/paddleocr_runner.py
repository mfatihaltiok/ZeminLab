from __future__ import annotations

import argparse
import json
import os
from pathlib import Path


def result_to_dict(result):
    value = getattr(result, 'json', None)
    if callable(value):
        value = value()
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {}
    if isinstance(value, dict):
        return value
    if isinstance(result, dict):
        return result
    return {}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    image_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()
    if not image_path.is_file():
        raise FileNotFoundError(f'Görsel bulunamadı: {image_path}')

    from paddleocr import PaddleOCR

    device = os.environ.get('ZEMINLAB_OCR_DEVICE', 'cpu')
    ocr = PaddleOCR(
        lang='tr',
        device=device,
        use_doc_orientation_classify=True,
        use_doc_unwarping=True,
        use_textline_orientation=True,
    )
    result = ocr.predict(str(image_path))
    lines = []
    for item in result:
        data = result_to_dict(item)
        texts = data.get('rec_texts') or []
        scores = data.get('rec_scores') or []
        boxes = data.get('rec_boxes') or data.get('rec_polys') or []
        for index, text in enumerate(texts):
            text = str(text).strip()
            if not text:
                continue
            score = float(scores[index]) if index < len(scores) else None
            box = boxes[index] if index < len(boxes) else None
            lines.append({'text': text, 'score': score, 'box': box})

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps({'ok': True, 'provider': 'paddleocr-local', 'lines': lines}, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
