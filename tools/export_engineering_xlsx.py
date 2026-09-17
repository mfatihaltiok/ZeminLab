from __future__ import annotations
import argparse, json
from pathlib import Path
import openpyxl
from openpyxl.styles import Font

def main():
    p=argparse.ArgumentParser(); p.add_argument('--input',required=True); p.add_argument('--output',required=True); args=p.parse_args()
    data=json.loads(Path(args.input).read_text(encoding='utf-8'))
    wb=openpyxl.Workbook(); ws=wb.active; ws.title='ZeminLab'
    ws.append(['ZeminLab mühendislik çıktısı']); ws['A1'].font=Font(bold=True,size=14)
    def emit(prefix,obj):
        if isinstance(obj,dict):
            for k,v in obj.items(): emit(f'{prefix}.{k}' if prefix else k,v)
        elif isinstance(obj,list):
            for n,v in enumerate(obj): emit(f'{prefix}[{n}]',v)
        else: ws.append([prefix,str(obj)])
    emit('',data); ws.column_dimensions['A'].width=48; ws.column_dimensions['B'].width=80
    wb.save(args.output)
if __name__=='__main__': main()
