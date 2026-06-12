import { getToken } from '../utils/tokenUtils'

const API_BASE = '/api'

export interface Permission {
  id: number;
  name: string;
  rolePermissions?: RolePermission[];
}

export interface RolePermission {
  roleId: number;
  permissionId: number;
  permission?: Permission;
}

export interface Role {
  id: number;
  name: string;
  rolePermissions: RolePermission[];
}

export interface CreateRoleDto {
  name: string;
  permissionIds: number[];
}

export interface UpdateRoleDto {
  name: string;
  permissionIds: number[];
}

export const getPermissions = (role: Role): Permission[] =>
  role.rolePermissions
    ?.map(rp => rp.permission)
    .filter((p): p is Permission => p !== undefined) ?? [];

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
})

export const roleService = {
  getAll: async (): Promise<Role[]> => {
    const res = await fetch(`${API_BASE}/roles`, { headers: authHeaders() })
    if (!res.ok) throw new Error('Impossible de charger les rôles')
    return res.json()
  },

  getById: async (id: number): Promise<Role> => {
    const res = await fetch(`${API_BASE}/roles/${id}`, { headers: authHeaders() })
    if (!res.ok) throw new Error('Rôle introuvable')
    return res.json()
  },

  create: async (dto: CreateRoleDto): Promise<Role> => {
    const res = await fetch(`${API_BASE}/roles`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(dto),
    })
    if (!res.ok) throw new Error('Erreur lors de la création du rôle')
    return res.json()
  },

  update: async (id: number, dto: UpdateRoleDto): Promise<void> => {
    const res = await fetch(`${API_BASE}/roles/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(dto),
    })
    if (!res.ok) throw new Error('Erreur lors de la modification du rôle')
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/roles/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error('Erreur lors de la suppression du rôle')
  },
}

export const permissionService = {
  getAll: async (): Promise<Permission[]> => {
    const res = await fetch(`${API_BASE}/permissions`, { headers: authHeaders() })
    if (!res.ok) throw new Error('Impossible de charger les permissions')
    return res.json()
  },
}