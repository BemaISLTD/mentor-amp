const hasAnyRole = (roles: string[], allowedRoles: string[]) =>
  roles.some(role => allowedRoles.includes(role.toLowerCase()))

export const canImportData = (roles: string[]) =>
  hasAnyRole(roles, ['admin', 'actuary', 'model_developer'])

export const canSubmitRuns = (roles: string[]) =>
  hasAnyRole(roles, ['admin', 'actuary', 'model_developer'])

export const canReviewData = (roles: string[]) =>
  hasAnyRole(roles, ['admin', 'actuary', 'reviewer'])

export const canEditProjectSettings = (roles: string[]) =>
  hasAnyRole(roles, ['admin'])
