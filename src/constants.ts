export const TERRAFORM_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  REPLACE: 'replace',
  NO_OP: 'no-op'
} as const;

export type TerraformAction = typeof TERRAFORM_ACTIONS[keyof typeof TERRAFORM_ACTIONS];

export const ACTION_SYMBOLS = {
  CREATE: '#',
  UPDATE: '~',
  DELETE: '-',
  REPLACE: '+/-'
} as const;

export const ACTION_DESCRIPTIONS = {
  [TERRAFORM_ACTIONS.CREATE]: 'Resource will be created',
  [TERRAFORM_ACTIONS.UPDATE]: 'Resource will be updated in-place',
  [TERRAFORM_ACTIONS.DELETE]: 'Resource will be destroyed',
  [TERRAFORM_ACTIONS.REPLACE]: 'Resource will be destroyed and recreated',
  [TERRAFORM_ACTIONS.NO_OP]: 'No changes'
} as const;

export const ACTION_EMOJIS = {
  [TERRAFORM_ACTIONS.CREATE]: '➕',
  [TERRAFORM_ACTIONS.UPDATE]: '🔄',
  [TERRAFORM_ACTIONS.DELETE]: '❌',
  [TERRAFORM_ACTIONS.REPLACE]: '🔄'
} as const;