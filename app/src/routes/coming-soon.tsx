import type { ReactNode } from 'react'
import { Badge, Card } from '../components'

/**
 * Designed roadmap placeholder (spec 005 FR-005 revised): unmistakably an
 * upcoming feature — badge, factual purpose, planned capabilities — with no
 * interactive controls.
 */
export function ComingSoon({
  icon,
  title,
  description,
  planned,
}: {
  icon: ReactNode
  title: string
  description: string
  planned: string[]
}) {
  return (
    <Card>
      <div className="gb-empty" data-testid="coming-soon">
        <div className="gb-empty__icon">{icon}</div>
        <h2 style={{ fontSize: 'var(--fs-h3)', marginBottom: 6, display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
          {title}
          <Badge tone="info">In development</Badge>
        </h2>
        <p style={{ maxWidth: 480, margin: '0 auto' }}>{description}</p>
        <div style={{ maxWidth: 400, margin: '16px auto 0', textAlign: 'left' }}>
          <div className="gb-eyebrow" style={{ marginBottom: 8 }}>
            Planned
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {planned.map((item) => (
              <div key={item} className="gb-meta-row">
                — {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

/** Full-page module placeholder with the standard page header. */
export function ModulePlaceholder(props: {
  icon: ReactNode
  title: string
  description: string
  planned: string[]
}) {
  return (
    <div>
      <div className="gb-page-head">
        <h1>{props.title}</h1>
      </div>
      <ComingSoon {...props} />
    </div>
  )
}
