import type { ScreenName } from '../../types'

export function screenTitle(active: ScreenName) { return active === 'Dashboard' ? 'Dashboard' : active === 'Models' ? 'Model Library' : active }
export function screenDescription(active: ScreenName) { return active === 'Dashboard' ? 'A decision-ready view of models, runs, investigations, and system health.' : active === 'Models' ? 'Browse model versions, inspect hierarchy, and open the workspace for a model.' : `The ${active.toLowerCase()} workspace is connected to the active model context.` }
