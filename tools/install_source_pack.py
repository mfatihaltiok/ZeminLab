from __future__ import annotations

import argparse
from pathlib import Path
from urllib.request import urlopen

SOURCES = {
    'erol-2014': ('https://www.yukselproje.com.tr/uploads/docs/1625148279_geoteknikmuhendisligindesahadeneyleri-mart2016.pdf', 'erol-2014/saha-deneyleri-2014.pdf'),
    'erol-2018': ('https://www.yukselproje.com.tr/uploads/docs/1640872640_jet20211223vers09.pdf', 'erol-2018/jet-enjeksiyon-2018.pdf'),
}


def download(url: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(url, timeout=60) as response, target.open('wb') as out:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='source-pack')
    parser.add_argument('--only', action='append', choices=sorted(SOURCES))
    args = parser.parse_args()
    root = Path(args.output)
    selected = args.only or list(SOURCES)
    for key in selected:
        url, relative = SOURCES[key]
        target = root / relative
        print(f'Downloading {key} -> {target}')
        download(url, target)
    print('Source-pack installation completed.')


if __name__ == '__main__':
    main()
