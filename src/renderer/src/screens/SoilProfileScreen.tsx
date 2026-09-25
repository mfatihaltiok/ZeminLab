import { Frame } from '../workspace/WorkspaceShell'

/**
 * Legacy compatibility screen.
 * Engineering profile calculations were intentionally removed from this path.
 * The active workflow is IdealizedSoilProfileScreen -> canonical engineering engines.
 */
export default function SoilProfileScreen(_props: Record<string, unknown> = {}) {
  return (
    <Frame screen="profile">
      <div className="empty-state">
        <strong>Eski Zemin Profili ekranı devre dışıdır.</strong>
        <span>Hesaplamalar yalnız İdealize Zemin Profili üzerinden yürütülür.</span>
      </div>
    </Frame>
  )
}
