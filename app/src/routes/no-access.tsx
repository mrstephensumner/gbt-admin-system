import { Lock } from 'lucide-react'

/** Registry-gate notice for signed-in but unregistered identities (spec 002 US1). */
export function NoAccessScreen() {
  return (
    <div className="gb-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="gb-empty" style={{ maxWidth: 420 }}>
        <div className="gb-empty__icon">
          <Lock size={40} />
        </div>
        <h1 style={{ fontSize: 'var(--fs-h3)', marginBottom: 8 }}>You don't have access yet</h1>
        <p>
          Your sign-in worked, but you haven't been added as an operator. Ask the owner to add you
          from the Team screen.
        </p>
      </div>
    </div>
  )
}
