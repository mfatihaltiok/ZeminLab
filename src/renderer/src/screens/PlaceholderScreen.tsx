import type { ScreenDefinition } from './screen-types'
import ProjectInfo from './project/ProjectInfo'

interface PlaceholderScreenProps {
  screen: ScreenDefinition
}

export default function PlaceholderScreen({ screen }: PlaceholderScreenProps) {
  if (screen.id === 'project-info') {
    return <ProjectInfo />
  }

  return (
    <section className="engineering-screen">
      <header className="engineering-header">
        <div>
          <div className="engineering-header-category">
            {screen.category}
          </div>
          <h2>{screen.title}</h2>
        </div>
      </header>

      <div className="engineering-content">
        <div className="calculation-card">
          <div className="calculation-card-title">
            {screen.title}
          </div>

          <div className="screen-placeholder">
            <div className="screen-placeholder-title">
              {screen.title}
            </div>

            <div className="screen-placeholder-text">
              Bu ekranın mühendislik veri modeli ve hesap motoru hazırlanacaktır.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
