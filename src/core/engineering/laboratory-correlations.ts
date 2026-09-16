/**
 * Laboratory empirical-correlation registry.
 *
 * Deliberately contains no correlation equations yet.
 *
 * The laboratory screen accepts measured results directly. Empirical values
 * such as Cu, phi, Cc, Em or strength parameters must only be calculated
 * after their source documents are supplied and the equations, applicability
 * limits, units and notation have been verified.
 */

export type LaboratoryCorrelationId =
  | 'cu'
  | 'phi'
  | 'cc'
  | 'em'
  | 'shear-strength'

export interface LaboratoryCorrelationDefinition {
  id: LaboratoryCorrelationId
  name: string
  source?: string
  equation?: string
  applicability?: string
  status: 'awaiting-source'
}

export const laboratoryCorrelationRegistry: LaboratoryCorrelationDefinition[] = [
  { id: 'cu', name: 'Drenajsız kayma dayanımı Cu', status: 'awaiting-source' },
  { id: 'phi', name: 'İçsel sürtünme açısı φ', status: 'awaiting-source' },
  { id: 'cc', name: 'Sıkışma indisi Cc', status: 'awaiting-source' },
  { id: 'em', name: 'Elastisite modülü Em', status: 'awaiting-source' },
  { id: 'shear-strength', name: 'Kesme dayanımı parametreleri', status: 'awaiting-source' }
]
