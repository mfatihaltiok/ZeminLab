import { useMemo, useState } from 'react'
import { Card, Frame } from '../workspace/WorkspaceShell'
import { convert, formatUnitValue, unitsFor, type UnitCategory } from '../../../core/units/unit-conversion'

const categories: { id: UnitCategory; title: string }[] = [
  { id: 'length', title: 'Uzunluk' }, { id: 'area', title: 'Alan' }, { id: 'volume', title: 'Hacim' }, { id: 'mass', title: 'Kütle' }, { id: 'force', title: 'Kuvvet' }, { id: 'stress', title: 'Gerilme' }, { id: 'unitWeight', title: 'Birim hacim ağırlık' }
]

export function UnitConverterScreen() {
  const [category, setCategory] = useState<UnitCategory>('force')
  const options = useMemo(() => unitsFor(category), [category])
  const [value, setValue] = useState('1')
  const [from, setFrom] = useState(options[0]?.id ?? '')
  const [to, setTo] = useState(options[1]?.id ?? options[0]?.id ?? '')
  const result = useMemo(() => { const n = Number(value); if (!Number.isFinite(n) || !from || !to) return undefined; try { return convert(n, from, to) } catch { return undefined } }, [value, from, to])
  const changeCategory = (next: UnitCategory) => { const nextUnits = unitsFor(next); setCategory(next); setFrom(nextUnits[0]?.id ?? ''); setTo(nextUnits[1]?.id ?? nextUnits[0]?.id ?? '') }
  const label = (id: string) => options.find((u) => u.id === id)?.label ?? id
  return <Frame screen="unit-converter">
    <div className="unit-converter-shell">
      <div className="unit-category-bar">{categories.map((item) => <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => changeCategory(item.id)}>{item.title}</button>)}</div>
      <div className="unit-converter-grid">
        <Card title="DÖNÜŞÜM">
          <div className="unit-converter-form">
            <label>Değer<input type="number" value={value} onChange={(e) => setValue(e.target.value)} /></label>
            <label>Kaynak birim<select value={from} onChange={(e) => setFrom(e.target.value)}>{options.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label>
            <div className="unit-arrow">→</div>
            <label>Hedef birim<select value={to} onChange={(e) => setTo(e.target.value)}>{options.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label>
          </div>
          <div className="unit-result"><span>{value || '0'} {label(from)}</span><strong>{result === undefined ? '—' : formatUnitValue(result)} {label(to)}</strong></div>
        </Card>
        <Card title="KULLANIM NOTU"><div className="unit-note"><b>ZeminLab proje ekranları</b><p>Proje içinde gösterilen mühendislik değerleri proje birim sistemine göre sunulur. Bu araç ise farklı mühendislik birimleri arasında bağımsız dönüşüm yapmak için kullanılır.</p><p>Sayısal dönüşüm tek bir merkezi motor üzerinden yapılır; ekranlar kendi dönüşüm katsayılarını taşımaz.</p></div></Card>
      </div>
      <Card title="BİRİM TABLOSU"><table className="data-table"><thead><tr><th>Birim</th><th>Kategori</th><th>SI taban katsayısı</th></tr></thead><tbody>{options.map((u) => <tr key={u.id}><td><b>{u.label}</b></td><td>{categories.find((c) => c.id === category)?.title}</td><td>{u.toBase.toLocaleString('tr-TR', { maximumFractionDigits: 10 })}</td></tr>)}</tbody></table></Card>
    </div>
  </Frame>
}
