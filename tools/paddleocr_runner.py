from __future__ import annotations
import argparse, json
from pathlib import Path
from paddleocr import PaddleOCR

def main():
    p=argparse.ArgumentParser(); p.add_argument('--input',required=True); p.add_argument('--output',required=True); args=p.parse_args()
    ocr=PaddleOCR(lang='tr', use_doc_orientation_classify=True, use_doc_unwarping=True, use_textline_orientation=True)
    result=ocr.predict(args.input)
    rows=[]
    for item in result:
        if hasattr(item,'json'):
            rows.append(item.json)
        else:
            rows.append(str(item))
    Path(args.output).write_text(json.dumps(rows,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
if __name__=='__main__': main()
