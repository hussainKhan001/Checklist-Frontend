// ── Flat permission list (used for total count + backward compat) ─────────────
export const PERMISSIONS = [
  { key: 'admin_access',       group: 'System & Core',         label: 'Access Admin Panel',                    type: 'admin' },
  { key: 'view_dashboard',     group: 'System & Core',         label: 'View Dashboard Stats',                  type: 'read'  },
  { key: 'view_inspections',   group: 'Inspections',           label: 'View Inspections',                      type: 'read'  },
  { key: 'manage_inspections', group: 'Inspections',           label: 'Edit & Delete Inspections',             type: 'write' },
  { key: 'view_projects',      group: 'Projects & Floors',     label: 'View Projects & Floors',                type: 'read'  },
  { key: 'manage_projects',    group: 'Projects & Floors',     label: 'Add / Edit / Delete Projects',          type: 'write' },
  { key: 'manage_floors',      group: 'Projects & Floors',     label: 'Add / Edit / Delete Floors & Locations',type: 'write' },
  { key: 'view_trades',        group: 'Trades & Checkpoints',  label: 'View Trades & Checkpoints',             type: 'read'  },
  { key: 'manage_trades',      group: 'Trades & Checkpoints',  label: 'Add / Edit / Delete Trades & Checkpoints', type: 'write' },
  { key: 'manage_users',       group: 'Users & Roles',         label: 'Manage Users',                          type: 'write' },
  { key: 'manage_roles',       group: 'Users & Roles',         label: 'Manage Roles & Permissions',            type: 'write' },
  { key: 'view_sites',         group: 'Site Flow',             label: 'Browse Site Structure',                 type: 'read'  },
  { key: 'submit_forms',       group: 'Site Flow',             label: 'Create & Submit Inspections',           type: 'write' },
  { key: 'upload_photo',       group: 'Site Flow',             label: 'Upload Inspection Photos',              type: 'write' },
]

// ── Sections (feature-area grouping for the permission matrix UI) ─────────────
export const PERMISSION_SECTIONS = [
  {
    key: 'core',
    label: 'System & Core',
    permissions: PERMISSIONS.filter(p => p.group === 'System & Core'),
  },
  {
    key: 'inspections',
    label: 'Inspections',
    permissions: PERMISSIONS.filter(p => p.group === 'Inspections'),
  },
  {
    key: 'projects',
    label: 'Projects & Floors',
    permissions: PERMISSIONS.filter(p => p.group === 'Projects & Floors'),
  },
  {
    key: 'trades',
    label: 'Trades & Checkpoints',
    permissions: PERMISSIONS.filter(p => p.group === 'Trades & Checkpoints'),
  },
  {
    key: 'users',
    label: 'Users & Roles',
    permissions: PERMISSIONS.filter(p => p.group === 'Users & Roles'),
  },
  {
    key: 'site',
    label: 'Site Flow',
    permissions: PERMISSIONS.filter(p => p.group === 'Site Flow'),
  },
]

// ── Node type labels + styles ─────────────────────────────────────────────────
export const NODE_TYPE_LABELS = {
  admin: 'Admin node',
  read:  'Read node',
  write: 'Write node',
}
export const NODE_TYPE_STYLES = {
  admin: 'text-purple-500',
  read:  'text-blue-500',
  write: 'text-orange-500',
}

// ── Dependency map ────────────────────────────────────────────────────────────
export const PERMISSION_DEPS = {
  view_dashboard:     ['admin_access'],
  view_inspections:   ['admin_access'],
  view_projects:      ['admin_access'],
  view_trades:        ['admin_access'],
  manage_users:       ['admin_access'],
  manage_roles:       ['admin_access'],
  manage_projects:    ['admin_access', 'view_projects'],
  manage_floors:      ['admin_access', 'view_projects'],
  manage_trades:      ['admin_access', 'view_trades'],
  manage_inspections: ['admin_access', 'view_inspections'],
  submit_forms:       ['view_sites'],
  upload_photo:       ['view_sites', 'submit_forms'],
}

export function getRequiredPerms(perm, visited = new Set()) {
  if (visited.has(perm)) return []
  visited.add(perm)
  const direct = PERMISSION_DEPS[perm] || []
  return [...direct, ...direct.flatMap(d => getRequiredPerms(d, visited))]
}

export function getDependentPerms(perm) {
  const reverse = {}
  Object.entries(PERMISSION_DEPS).forEach(([k, deps]) =>
    deps.forEach(d => { (reverse[d] = reverse[d] || []).push(k) })
  )
  const result = new Set()
  function collect(p) {
    ;(reverse[p] || []).forEach(d => { if (!result.has(d)) { result.add(d); collect(d) } })
  }
  collect(perm)
  return [...result]
}

// ── Legacy group list (kept for any component that still uses it) ─────────────
export const PERMISSION_GROUPS = [...new Set(PERMISSIONS.map(p => p.group))]

// ── UI helpers ────────────────────────────────────────────────────────────────
export const COLOR_OPTIONS = [
  { value: 'orange', label: 'Orange', cls: 'bg-orange-500' },
  { value: 'blue',   label: 'Blue',   cls: 'bg-blue-500'   },
  { value: 'green',  label: 'Green',  cls: 'bg-emerald-500'},
  { value: 'purple', label: 'Purple', cls: 'bg-purple-500' },
  { value: 'red',    label: 'Red',    cls: 'bg-red-500'    },
  { value: 'gray',   label: 'Gray',   cls: 'bg-gray-400'   },
]

export const ROLE_BADGE_CLS = {
  orange: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
  blue:   'bg-blue-100   dark:bg-blue-500/20   text-blue-700   dark:text-blue-400',
  green:  'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  purple: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
  red:    'bg-red-100    dark:bg-red-500/20    text-red-700    dark:text-red-400',
  gray:   'bg-gray-100   dark:bg-gray-700      text-gray-600   dark:text-gray-300',
}
