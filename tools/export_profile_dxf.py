from __future__ import annotations
import argparse, json
from pathlib import Path
import ezdxf

def main():
    p=argparse.ArgumentParser(); p.add_argument('--input',required=True); p.add_argument('--output',required=True); args=p.parse_args()
    data=json.loads(Path(args.input).read_text(encoding='utf-8'))
    doc=ezdxf.new('R2018'); msp=doc.modelspace()
    layers=data.get('layers', data.get('profile',{}).get('layers', [])) if isinstance(data,dict) else []
    x0=0.0; y=0.0; width=10.0
    for layer in layers:
        top=float(layer.get('top',y)); bottom=float(layer.get('bottom',top+float(layer.get('thickness',1))))
        msp.add_lwpolyline([(x0,top),(x0+width,top),(x0+width,bottom),(x0,bottom)],close=True)
        name=str(layer.get('soilType',layer.get('name','Layer')))
        msp.add_text(name,dxfattribs={'height':0.25}).set_placement((x0+0.25,(top+bottom)/2))
        y=bottom
    doc.saveas(args.output)
if __name__=='__main__': main()
