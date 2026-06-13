import { useAuth } from '../../store/authContext'
import './XpBar.css'

/** Mirror of `Django_Backend/api/models.py::XP_LEVELS`. Kept on the frontend
 *  so the bar fills correctly even if the backend serializer ever misses a
 *  tier field. Must stay in sync with the backend table. */
const XP_LEVELS: ReadonlyArray<[number, string]> = [
  [0, 'Law Apprentice'],
  [100, 'Court Clerk'],
  [250, 'Paralegal'],
  [450, 'Junior Counsel'],
  [700, 'Solicitor'],
  [1000, 'Barrister'],
  [1400, 'Senior Advocate'],
  [1900, 'Magistrate'],
  [2500, 'Judge Master'],
  [3200, 'Chief Justice'],
]

function tierForXp(xp: number): { label: string; min: number; next: number | null } {
  let last: [number, string] = XP_LEVELS[0]
  for (let i = 0; i < XP_LEVELS.length; i++) {
    const [threshold, label] = XP_LEVELS[i]
    if (xp < threshold) return { min: last[0], label: last[1], next: threshold }
    last = [threshold, label]
    if (i === XP_LEVELS.length - 1) return { min: threshold, label, next: null }
  }
  return { min: last[0], label: last[1], next: null }
}

export function XpBar() {
  const { user } = useAuth()
  if (!user) return null

  const xp = user.xp ?? 0
  // Compute from xp locally; backend fields are used only as overrides when
  // they exist and are non-null.
  const tier = tierForXp(xp)
  const label = user.xp_label ?? tier.label
  const tierMin = user.xp_current_tier_min ?? tier.min
  const tierMax =
    user.xp_next_tier_min !== undefined ? user.xp_next_tier_min : tier.next

  let percent = 100
  // Default for the max tier: just show total XP.
  let progressLabel = `${xp} XP`

  if (tierMax != null && tierMax > tierMin) {
    const intoTier = Math.max(0, xp - tierMin)
    const span = tierMax - tierMin
    percent = Math.min(100, Math.max(0, (intoTier / span) * 100))
    // Tier-relative numbers so the label matches the bar's fill.
    // e.g. "0 / 150" right after leveling up; "75 / 150" halfway through.
    progressLabel = `${intoTier} / ${span}`
  }

  return (
    <div className="xp-bar" title={`${label} · ${xp} XP total`}>
      <span className="xp-bar-label">{label}</span>
      <div className="xp-bar-track" aria-label={`${label}: ${progressLabel}`}>
        <div className="xp-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="xp-bar-progress">{progressLabel}</span>
    </div>
  )
}
