import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, removeToken, decodeToken } from '../utils/tokenUtils'
import { userService } from '../services/Userservice'
import { projectService } from '../services/Projectservice'
import { locationService } from '../services/Locationservice'
import { planService } from '../services/Planservice'
import type { User } from '../services/Userservice'
import type { Project } from '../services/Projectservice'
import type { Location } from '../services/Locationservice'
import type { Plan } from '../services/Planservice'
import { roleService, permissionService, getPermissions } from '../services/RoleService'
import type { Role, Permission, CreateRoleDto, UpdateRoleDto } from '../services/RoleService'
import './styles/AdminDashboard.css'
import { jwtDecode } from 'jwt-decode'
import { auditService } from '../services/Auditservice'
import type { AuditLog } from '../services/Auditservice'




const BASE_URL = 'http://localhost:5279/api'
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` })

// ── Helpers ──────────────────────────────────────────────────────────────────
const getRoleName = (role: string | { name: string }): string => {
  if (!role) return '—'
  if (typeof role === 'string') return role
  return role.name || '—'
}





interface AppJwtPayload {
  sub?: string
  exp?: number
  iss?: string
  aud?: string
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'?: string
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'?: string
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string | string[]
  Permission?: string | string[]
}

const getStatusLabel = (status: string) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    Active:    { label: 'Actif',    color: '#16a34a', bg: '#f0fdf4' },
    Completed: { label: 'Terminé',  color: '#1d4ed8', bg: '#eff6ff' },
    OnHold:    { label: 'En pause', color: '#d97706', bg: '#fffbeb' },
    Cancelled: { label: 'Annulé',   color: '#ef4444', bg: '#fff1f2' },
    Planning:  { label: 'Planifié', color: '#7c3aed', bg: '#fdf4ff' },
  }
  return map[status] || { label: status || '—', color: '#64748b', bg: '#f1f5f9' }
}

const LOCATION_TYPES = ['Bloc', 'Étage', 'Appartement', 'Zone']
type Section = 'dashboard' | 'users' | 'projects' | 'plans' | 'roles'| 'audit'



const groupPermissions = (perms: Permission[]): Record<string, Permission[]> =>
  perms.reduce<Record<string, Permission[]>>((acc, p) => {
    // Grouper par le nom après le premier underscore
    const parts = p.name.split('_')
    const category = parts.length > 1 ? parts[1] : parts[0]
    
    // Mapper vers un domaine lisible
    const domainMap: Record<string, string> = {
      'Utilisateur'      : '👤 Utilisateurs',
      'RôleUtilisateur'  : '👤 Utilisateurs',
      'MotDePasse'       : '🔐 Authentification',
      'Projet'           : '📁 Projets',
      'MesProjets'       : '📁 Projets',
      'TousLesProjets'   : '📁 Projets',
      'MembreProjet'     : '📁 Projets',
      'MembresProjet'    : '📁 Projets',
      'Localisation'     : '📍 Localisations',
      'ArbreLocalisation': '📍 Localisations',
      'Plan'             : '📄 Plans',
      'PlansParLocalisation': '📄 Plans',
      'VersionPlan'     : '🔄 Versions',
      'Annotation'       : '✏️ Annotations',
      'Role'             : '🛡️ Rôles & Permissions',
      'Permission'       : '🛡️ Rôles & Permissions',
      'JournalAudit'     : '📋 Journal d\'audit',
    }

    const key = domainMap[category] || '🔧 Général'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})



// ── LOCATION TREE NODE ────────────────────────────────────────────────────────
function LocationTreeNode({
  loc, depth = 0, onDelete, onAddChild, onViewPlans, locationsWithPlans,
}: {
  loc: Location; depth?: number
  onDelete: (loc: Location) => void
  onAddChild: (parentLoc: Location) => void
  onViewPlans: (loc: Location) => void
  locationsWithPlans: Set<number>
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = (loc.children?.length ?? 0) > 0
  const hasPlans    = locationsWithPlans.has(loc.id)

  return (
    <div style={{ marginLeft: depth > 0 ? 14 : 0, paddingLeft: depth > 0 ? 8 : 0, borderLeft: depth > 0 ? '1.5px dashed #BFDBFE' : 'none', marginTop: 2, marginBottom: 2 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 10,
          border: '0.5px solid transparent',
          cursor: hasChildren ? 'pointer' : 'default',
          transition: 'all 0.12s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Chevron ou dot */}
        <div style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hasChildren ? (
            <div style={{
              width: 18, height: 18, borderRadius: 5,
              background: expanded ? '#1d4ed8' : '#EFF6FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              <svg
                width="9" height="9" viewBox="0 0 24 24" fill="none"
                stroke={expanded ? '#fff' : '#93C5FD'} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          ) : (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#BFDBFE', margin: 'auto' }} />
          )}
        </div>

        {/* Nom */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {loc.name}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
          {hasPlans && (
            <button
              onClick={() => onViewPlans(loc)}
              title="Voir les plans"
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                borderRadius: 6, border: '0.5px solid #93C5FD', background: '#EFF6FF',
                color: '#1d4ed8', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#1d4ed8' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              Plans
            </button>
          )}
          <button
            onClick={() => onAddChild(loc)}
            title="Ajouter une sous-localisation"
            style={{
              width: 26, height: 26, borderRadius: 6,
              border: '0.5px solid #e2e8f0', background: '#f8fafc',
              color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EAF3DE'; e.currentTarget.style.color = '#3B6D11'; e.currentTarget.style.borderColor = '#97C459' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button
            onClick={() => onDelete(loc)}
            title="Supprimer"
            style={{
              width: 26, height: 26, borderRadius: 6,
              border: '0.5px solid #e2e8f0', background: '#f8fafc',
              color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FCEBEB'; e.currentTarget.style.color = '#A32D2D'; e.currentTarget.style.borderColor = '#F09595' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {hasChildren && expanded && (
        <div style={{ marginLeft: 14, paddingLeft: 8, borderLeft: '1.5px dashed #BFDBFE', marginTop: 2, marginBottom: 2 }}>
          {loc.children!.map(child => (
            <LocationTreeNode
              key={child.id} loc={child} depth={depth + 1}
              onAddChild={onAddChild} onDelete={onDelete} onViewPlans={onViewPlans}
              locationsWithPlans={locationsWithPlans}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── PLANS MODAL ───────────────────────────────────────────────────────────────
function PlansModal({ location, plans, loading, onClose }: {
  location: Location; plans: Plan[]; loading: boolean; onClose: () => void
}) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="plans-modal-content">
        <div className="plans-modal-header">
          <div className="plans-modal-icon">
            <svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/>
            </svg>
          </div>
          <div>
            <h2 className="plans-modal-title">Plans — {location.name}</h2>
            <p className="plans-modal-subtitle">{loading ? 'Chargement...' : `${plans.length} plan${plans.length !== 1 ? 's' : ''}`}</p>
          </div>
          <button onClick={onClose} className="plans-modal-close"
            onMouseEnter={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#94a3b8' }}>
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
              <line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>
            </svg>
          </button>
        </div>
        <div className="plans-modal-body">
          {loading ? (
            <div className="loading-state">Chargement...</div>
          ) : plans.length === 0 ? (
            <div className="empty-state">
              <svg width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='#cbd5e1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' style={{ margin: '0 auto 12px', display: 'block' }}>
                <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/>
              </svg>
              <p className="empty-text">Aucun plan pour cette localisation</p>
            </div>
          ) : (
            <div className="plans-list">
              {plans.map(plan => {
                const st = getStatusLabel(plan.status)
                const latestVersion = plan.planVersions?.find(v => v.versionNumber === plan.currentVersion)
                return (
                  <div key={plan.id} className="plan-card"
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.07)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#bfdbfe' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0' }}>
                    <div className="plan-card-header">
                      <div className="plan-card-icon">
                        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                          <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/>
                        </svg>
                      </div>
                      <div>
                        <p className="plan-card-name">{plan.name}</p>
                        {plan.category && <p className="plan-card-category">{plan.category}</p>}
                      </div>
                      <span className="plan-card-status" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                    </div>
                    <div className="plan-card-version">
                      <span className="version-label">Version actuelle :</span>
                      <span className="version-badge">v{plan.currentVersion}</span>
                    </div>
                    {latestVersion && (
                      <p className="plan-card-size">
                        <strong>{(latestVersion.fileSize / 1024).toFixed(0)} KB</strong> · {latestVersion.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}
                      </p>
                    )}
                    {latestVersion ? (
                      <a href={`http://localhost:5279${latestVersion.filePath}`} target='_blank' rel='noopener noreferrer' className="plan-download-btn"
                        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = '#dbeafe'}
                        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = '#eff6ff'}>
                        <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                          <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/>
                        </svg>
                        Télécharger v{plan.currentVersion}
                      </a>
                    ) : (
                      <div className="no-file-message">Aucun fichier disponible</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface Member {
  id: number; name: string; email: string
  role: string | { name: string }; roleInProject?: string
}

function usePermissions() {
  const token = getToken()

  
  const decoded: AppJwtPayload | null = token
    ? (() => { try { return jwtDecode<AppJwtPayload>(token) } catch { return null } })()
    : null

  const rawPerms: string[] = (() => {
    const p = decoded?.Permission
    if (!p) return []
    return Array.isArray(p) ? p : [p]
  })()

  const permsSet = new Set<string>(rawPerms)
  const can = (permission: string) => permsSet.has(permission)

  const currentEmail: string = (() => {
    const e = decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
    if (!e) return ''
    return Array.isArray(e) ? e[0] : e
  })()

  const currentRoleName: string = (() => {
    const r = decoded?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
    if (!r) return ''
    return Array.isArray(r) ? r[0] : r
  })()

  const displayName = currentEmail.split('@')[0] || 'Utilisateur'
  const canSeeAudit = currentRoleName === 'Admin'

  return {
    can,
    canSeeMembers: can('Voir_MembresProjet'),
    canAddMember:  can('Ajouter_MembreProjet'),
    canRemoveMember: can('Supprimer_MembreProjet'),
    currentEmail,
    currentRoleName,
    displayName,
    canSeeAudit

  }
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const perms = usePermissions() 
  const [section, setSection] = useState<Section>('dashboard')

  // ── Users ──
  const [users, setUsers]                   = useState<User[]>([])
  const [loadingUsers, setLoadingUsers]     = useState(false)
  const [showDeleteModal, setShowDeleteModal]   = useState(false)
  const [showEditModal, setShowEditModal]       = useState(false)
  const [selectedUser, setSelectedUser]         = useState<User | null>(null)
  const [editName, setEditName]             = useState('')
  const [editEmail, setEditEmail]           = useState('')
  const [editRole, setEditRole]             = useState('')
  const [showAddModal, setShowAddModal]     = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: '' })
  const [addErrors, setAddErrors]           = useState<Record<string, string>>({})
  const [openMenuId, setOpenMenuId]         = useState<number | null>(null)
  const [search, setSearch]                 = useState('')

  // ── Projects ──
  const [projects, setProjects]                         = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects]           = useState(false)
  const [projectSearch, setProjectSearch]               = useState('')
  const [showAddProjectModal, setShowAddProjectModal]   = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false)
  const [selectedProject, setSelectedProject]           = useState<Project | null>(null)
  const [openProjectMenuId, setOpenProjectMenuId]       = useState<number | null>(null)
  const [newProject, setNewProject]                     = useState({ name: '', description: '', status: 'Planning' })
  const [editProject, setEditProject]                   = useState({ name: '', description: '', status: '' })
  const [projectErrors, setProjectErrors]               = useState<Record<string, string>>({})

  const [members, setMembers]                             = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers]               = useState(false)
  const [showMembersPanel, setShowMembersPanel]           = useState(false)
  const [showAddMemberModal, setShowAddMemberModal]       = useState(false)
  const [showDeleteMemberModal, setShowDeleteMemberModal] = useState(false)
  const [selectedMember, setSelectedMember]               = useState<Member | null>(null)
  const [memberEmail, setMemberEmail]                     = useState('')
  const [memberEmailError, setMemberEmailError]           = useState('')

  // ── Locations ──
  const [locationProjectId, setLocationProjectId]           = useState<number | null>(null)
  const [locationTree, setLocationTree]                     = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations]             = useState(false)
  const [showAddLocationModal, setShowAddLocationModal]     = useState(false)
  const [showDeleteLocationModal, setShowDeleteLocationModal] = useState(false)
  const [selectedLocation, setSelectedLocation]             = useState<Location | null>(null)
  const [parentLocation, setParentLocation]                 = useState<Location | null>(null)
  const [newLocation, setNewLocation]                       = useState({ name: '', type: 'Bâtiment', projectId: 0, parentId: null as number | null })
  const [locationErrors, setLocationErrors]                 = useState<Record<string, string>>({})

  // ── Plans ──
  const [totalPlans, setTotalPlans]                               = useState<number | null>(null)
  const [locationsWithPlans, setLocationsWithPlans]               = useState<Set<number>>(new Set())
  const [showPlansModal, setShowPlansModal]                       = useState(false)
  const [selectedLocationForPlans, setSelectedLocationForPlans]   = useState<Location | null>(null)
  const [plans, setPlans]                                         = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans]                           = useState(false)

  // ── Global UI ──
  const [error, setError]           = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  

  // ── Rôles & Permissions ──
  const [roles, setRoles] = useState<Role[]>([])
const [permissions, setPermissions] = useState<Permission[]>([])
  const [loadingRoles, setLoadingRoles]           = useState(false)
  const [showAddRoleModal, setShowAddRoleModal]   = useState(false)
  const [showEditRoleModal, setShowEditRoleModal] = useState(false)
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false)
  const [selectedRole, setSelectedRole]           = useState<Role | null>(null)
  const [roleFormName, setRoleFormName]           = useState('')
  const [roleFormPermIds, setRoleFormPermIds]     = useState<Set<number>>(new Set())
  const [roleNameError, setRoleNameError]         = useState('')
  const [openRoleMenuId, setOpenRoleMenuId]       = useState<number | null>(null)
  const roleMenuRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // ── Refs ──
  const profileRef      = useRef<HTMLDivElement>(null)
  const menuRefs        = useRef<Record<number, HTMLDivElement | null>>({})
  const projectMenuRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // ── Auth ──
  const token       = getToken()
  const currentUser = token ? (() => { try { return decodeToken(token) } catch { return null } })() : null
  const currentEmail = currentUser?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || ''
  const currentRole  = currentUser?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || ''
  const displayName  = currentEmail.split('@')[0] || 'Admin'

  const [auditLogs, setAuditLogs]       = useState<AuditLog[]>([])
const [loadingAudit, setLoadingAudit] = useState(false)
const [auditFilter, setAuditFilter]   = useState('')

  // ── Fermeture menus au clic extérieur ──
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
      if (openMenuId !== null) {
        const el = menuRefs.current[openMenuId]
        if (el && !el.contains(e.target as Node)) setOpenMenuId(null)
      }
      if (openProjectMenuId !== null) {
        const el = projectMenuRefs.current[openProjectMenuId]
        if (el && !el.contains(e.target as Node)) setOpenProjectMenuId(null)
      }
      if (openRoleMenuId !== null) {
        const el = roleMenuRefs.current[openRoleMenuId]
        if (el && !el.contains(e.target as Node)) setOpenRoleMenuId(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [openMenuId, openProjectMenuId, openRoleMenuId])

  // ── Users ──
  const fetchUsers = async () => {
    setLoadingUsers(true); setError('')
    try { setUsers(await userService.getAll()) }
    catch (e: any) { setError(e.message) }
    finally { setLoadingUsers(false) }
  }
  useEffect(() => { if (section === 'users' || section === 'dashboard') fetchUsers() }, [section])

  const handleDelete = async () => {
    if (!selectedUser) return; setActionLoading(true)
    try {
      await userService.delete(selectedUser.id)
      setUsers(u => u.filter(x => x.id !== selectedUser.id))
      setShowDeleteModal(false); showSuccess('Utilisateur supprimé avec succès')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const handleEdit = async () => {
    if (!selectedUser) return; setActionLoading(true)
    try {
      await userService.update(selectedUser.id, { name: editName, email: editEmail })
      if (editRole !== getRoleName(selectedUser.role)) await userService.updateRole(selectedUser.id, editRole)
      await fetchUsers(); setShowEditModal(false); showSuccess('Utilisateur modifié avec succès')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const handleAdd = async () => {
    const errs: Record<string, string> = {}
    if (!newUser.name.trim()) errs.name = 'Nom requis'
    if (!newUser.email.trim()) errs.email = 'Email requis'
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(newUser.email)) errs.email = 'Email invalide'
    if (!newUser.password.trim()) errs.password = 'Mot de passe requis'
    else if (newUser.password.length < 6) errs.password = 'Minimum 6 caractères'
    setAddErrors(errs)
    if (Object.keys(errs).length > 0) return
    setActionLoading(true)
    try {
      await userService.create(newUser)
      await fetchUsers()
      setShowAddModal(false)
      setNewUser({ name: '', email: '', password: '', role: roles[0]?.name || '' })
      setAddErrors({})
      showSuccess('Utilisateur ajouté avec succès')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  // ── Projects ──
  const fetchProjects = async () => {
    setLoadingProjects(true); setError('')
    try { setProjects(await projectService.getAll()) }
    catch (e: any) { setError(e.message) }
    finally { setLoadingProjects(false) }
  }
  useEffect(() => { if (section === 'projects' || section === 'dashboard') fetchProjects() }, [section])

  useEffect(() => {
  if (section === 'dashboard') {
      planService.getTotalCount().then(setTotalPlans).catch(() => {})
      fetchAuditLogs()
    }
  }, [section])

  const handleDeleteProject = async () => {
    if (!selectedProject) return; setActionLoading(true)
    try {
      await projectService.delete(selectedProject.id)
      setProjects(p => p.filter(x => x.id !== selectedProject.id))
      setShowDeleteProjectModal(false); showSuccess('Projet supprimé avec succès')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const handleEditProject = async () => {
    if (!selectedProject) return
    const errs: Record<string, string> = {}
    if (!editProject.name.trim()) errs.name = 'Nom requis'
    setProjectErrors(errs)
    if (Object.keys(errs).length > 0) return
    setActionLoading(true)
    try {
      await projectService.update(selectedProject.id, editProject)
      await fetchProjects(); setShowEditProjectModal(false); showSuccess('Projet modifié avec succès')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const handleAddProject = async () => {
    const errs: Record<string, string> = {}
    if (!newProject.name.trim()) errs.name = 'Nom requis'
    setProjectErrors(errs)
    if (Object.keys(errs).length > 0) return
    setActionLoading(true)
    try {
      await projectService.create(newProject)
      await fetchProjects()
      setShowAddProjectModal(false)
      setNewProject({ name: '', description: '', status: 'Planning' })
      showSuccess('Projet ajouté avec succès')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  // ── Members ──
    const fetchMembers = async (projectId: number) => {
      if (!perms.canSeeMembers) return
      setLoadingMembers(true)
      try {
        const membersRes = await fetch(`${BASE_URL}/project/${projectId}/members`, { headers: authHeaders() })
        if (!membersRes.ok) throw new Error('Erreur chargement membres')
        setMembers(await membersRes.json())
      } catch (e: any) { setError(e.message) } finally { setLoadingMembers(false) }
    }

      const handleAddMemberByEmail = async () => {
    if (!memberEmail.trim() || !locationProjectId) return
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(memberEmail)) {
      setMemberEmailError('Adresse email invalide')
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch(
        `${BASE_URL}/project/${locationProjectId}/members/${encodeURIComponent(memberEmail)}`,
        { method: 'POST', headers: authHeaders() }
      )
      if (!res.ok) {
        const msg = await res.text()
        if (res.status === 404)             setMemberEmailError('Aucun utilisateur trouvé')
        else if (msg.includes('already'))   setMemberEmailError('Déjà membre du projet')
        else                                setMemberEmailError("Erreur lors de l'ajout")
        return
      }
      await fetchMembers(locationProjectId)
      setShowAddMemberModal(false)
      setMemberEmail('')
      setMemberEmailError('')
      showSuccess('Membre ajouté')
    } catch {
      setMemberEmailError('Erreur réseau')
    } finally {
      setActionLoading(false)
    }
  }

    const handleRemoveMember = async () => {
    if (!selectedMember || !locationProjectId) return
    setActionLoading(true)
    try {
      const res = await fetch(
        `${BASE_URL}/project/${locationProjectId}/members/${selectedMember.id}`,
        { method: 'DELETE', headers: authHeaders() }
      )
      if (!res.ok) throw new Error('Erreur suppression membre')
      setMembers(m => m.filter(x => x.id !== selectedMember.id))
      setShowDeleteMemberModal(false)
      showSuccess('Membre retiré')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }


  // ── Locations ──
  const fetchLocationTree = async (projectId: number) => {
  setLoadingLocations(true); setError('')
  try {
    const tree = await locationService.getTree(projectId)
    setLocationTree(tree)
    const locWithPlans = await planService.getLocationsWithPlans()
    setLocationsWithPlans(new Set(locWithPlans.filter((r: any) => r.hasPlans).map((r: any) => r.locationId)))
    await fetchMembers(projectId)  
  } catch (e: any) { setError(e.message) } finally { setLoadingLocations(false) }
}

  const handleAddLocation = async () => {
    const errs: Record<string, string> = {}
    if (!newLocation.name.trim()) errs.name = 'Nom requis'
    if (!newLocation.type) errs.type = 'Type requis'
    if (!locationProjectId) errs.project = 'Projet requis'
    setLocationErrors(errs)
    if (Object.keys(errs).length > 0) return
    setActionLoading(true)
    try {
      await locationService.create({ name: newLocation.name, type: newLocation.type, projectId: locationProjectId!, parentId: newLocation.parentId })
      await fetchLocationTree(locationProjectId!)
      setShowAddLocationModal(false)
      setNewLocation({ name: '', type: 'Bloc', projectId: locationProjectId!, parentId: null })
      setParentLocation(null)
      showSuccess('Localisation ajoutée avec succès')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return; setActionLoading(true)
    try {
      await locationService.delete(selectedLocation.id)
      if (locationProjectId) await fetchLocationTree(locationProjectId)
      setShowDeleteLocationModal(false); showSuccess('Localisation supprimée avec succès')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const openAddChildModal = (parent: Location) => {
    setParentLocation(parent)
    setNewLocation({ name: '', type: 'Appartement', projectId: locationProjectId!, parentId: parent.id })
    setLocationErrors({}); setShowAddLocationModal(true)
  }
  const openAddRootModal = () => {
    setParentLocation(null)
    setNewLocation({ name: '', type: 'Bloc', projectId: locationProjectId!, parentId: null })
    setLocationErrors({}); setShowAddLocationModal(true)
  }

  const handleViewPlans = async (loc: Location) => {
    setSelectedLocationForPlans(loc); setPlans([]); setLoadingPlans(true); setSection('plans')
    try { setPlans(await planService.getByLocation(loc.id)) }
    catch (e: any) { setError(e.message) } finally { setLoadingPlans(false) }
  }

  // ── Rôles ──
  const fetchRoles = async () => {
    setLoadingRoles(true); setError('')
    try {
      const [r, p] = await Promise.all([roleService.getAll(), permissionService.getAll()])
      setRoles(r); setPermissions(p)
    } catch (e: any) { setError(e.message) } finally { setLoadingRoles(false) }
  }
  useEffect(() => { if (section === 'roles') fetchRoles() }, [section])

  const openAddRole = () => {
    setRoleFormName(''); setRoleFormPermIds(new Set()); setRoleNameError('')
    setShowAddRoleModal(true)
  }
  const openEditRole = (role: Role) => {
    setSelectedRole(role); setRoleFormName(role.name)
    setRoleFormPermIds(new Set(getPermissions(role) .map(p => p.id)))
    setRoleNameError(''); setOpenRoleMenuId(null); setShowEditRoleModal(true)
  }
  const openDeleteRole = (role: Role) => {
    setSelectedRole(role); setOpenRoleMenuId(null); setShowDeleteRoleModal(true)
  }

  const handleCreateRole = async () => {
    if (!roleFormName.trim()) { setRoleNameError('Le nom est requis'); return }
    setActionLoading(true)
    try {
      await roleService.create({ name: roleFormName.trim(), permissionIds: [...roleFormPermIds] })
      await fetchRoles(); setShowAddRoleModal(false); showSuccess('Rôle créé avec succès')
    } catch (e: any) { setRoleNameError(e.message) } finally { setActionLoading(false) }
  }

  const handleUpdateRole = async () => {
    if (!selectedRole || !roleFormName.trim()) { setRoleNameError('Le nom est requis'); return }
    setActionLoading(true)
    try {
      await roleService.update(selectedRole.id, { name: roleFormName.trim(), permissionIds: [...roleFormPermIds] })
      await fetchRoles(); setShowEditRoleModal(false); showSuccess('Rôle modifié avec succès')
    } catch (e: any) { setRoleNameError(e.message) } finally { setActionLoading(false) }
  }

  const handleDeleteRole = async () => {
    if (!selectedRole) return; setActionLoading(true)
    try {
      await roleService.delete(selectedRole.id)
      setRoles(r => r.filter(x => x.id !== selectedRole.id))
      setShowDeleteRoleModal(false); showSuccess('Rôle supprimé avec succès')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const toggleRolePerm = (id: number) =>
    setRoleFormPermIds(prev => {
      const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
    })

  const toggleRolePermGroup = (ids: number[], checked: boolean) =>
    setRoleFormPermIds(prev => {
      const n = new Set(prev); ids.forEach(id => checked ? n.add(id) : n.delete(id)); return n
    })

    
  // ── Misc ──
  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }
  const handleLogout = () => { removeToken(); navigate('/login') }

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || getRoleName(u.role).toLowerCase().includes(q)
  })
  const filteredProjects = projects.filter(p => {
    const q = projectSearch.toLowerCase()
    const d = p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : ''
    return p.name?.toLowerCase().includes(q) || d.includes(q) || p.status?.toLowerCase().includes(q)
  })

  const fetchAuditLogs = async () => {
  if (!perms.canSeeAudit) return
  setLoadingAudit(true)
  try {
    setAuditLogs(await auditService.getLogs())
  } catch (e: any) { setError(e.message) } 
  finally { setLoadingAudit(false) }
}

  useEffect(() => { if (section === 'audit') fetchAuditLogs() }, [section])

  

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord',    icon: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='7' height='7'/><rect x='14' y='3' width='7' height='7'/><rect x='14' y='14' width='7' height='7'/><rect x='3' y='14' width='7' height='7'/></svg> },
    { id: 'users',     label: 'Utilisateurs',       icon: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/></svg> },
    { id: 'projects',  label: 'Projets',            icon: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'/></svg> },
    { id: 'roles',     label: 'Rôles & Permissions',icon: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/></svg> },
    { id: 'audit',     label: "Journal d'audit",    icon: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/><polyline points='10 9 9 9 8 9'/></svg> },
  ]

  const ThreeDotMenu = ({ id, onEdit, onDelete, refs }: {
    id: number; onEdit: () => void; onDelete: () => void
    refs: React.MutableRefObject<Record<number, HTMLDivElement | null>>
  }) => {
    const isOpen = openMenuId === id || openProjectMenuId === id
    const toggle = () => {
      if (refs === menuRefs) setOpenMenuId(openMenuId === id ? null : id)
      else setOpenProjectMenuId(openProjectMenuId === id ? null : id)
    }
    return (
      <div ref={el => { refs.current[id] = el }} className="three-dot-menu">
        <button onClick={toggle} className={`three-dot-btn ${isOpen ? 'open' : ''}`}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}
          onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' } }}>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
            <circle cx='12' cy='5' r='1.5'/><circle cx='12' cy='12' r='1.5'/><circle cx='12' cy='19' r='1.5'/>
          </svg>
        </button>
        {isOpen && (
          <div className="three-dot-dropdown">
            <button onClick={onEdit} className="dropdown-edit"
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#64748b' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
                <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
              </svg>
              Modifier
            </button>
            <div className="dropdown-divider" />
            <button onClick={onDelete} className="dropdown-delete"
              onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/>
                <path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/>
              </svg>
              Supprimer
            </button>
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="admin-dashboard">

      {/* ── SIDEBAR ── */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width='18' height='18' viewBox='0 0 20 20' fill='none'>
              <rect x='2' y='2' width='7' height='9' rx='1' stroke='white' strokeWidth='1.5'/>
              <rect x='11' y='2' width='7' height='5' rx='1' stroke='white' strokeWidth='1.5'/>
              <rect x='2' y='13' width='16' height='5' rx='1' stroke='white' strokeWidth='1.5'/>
            </svg>
          </div>
          <div>
            <div className="sidebar-title">Axia Plan</div>
            <div className="sidebar-subtitle">Admin</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            const active = section === item.id
            return (
              <button key={item.id}
                onClick={() => { setSection(item.id as Section); setLocationProjectId(null); setLocationTree([]) }}
                className={`sidebar-nav-item ${active ? 'active' : ''}`}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                {item.icon}{item.label}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="logout-btn"
            onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'/>
            </svg>
            Paramètres
          </button>

          <button onClick={handleLogout} className="logout-btn"
            onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/>
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <div className="admin-main">

        {/* ── TOPBAR ── */}
        <header className="admin-topbar">
          <div className="topbar-breadcrumb">
            <span className="breadcrumb-item">Axia Plan</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">
              {section === 'dashboard' ? 'Tableau de bord'
                : section === 'users' ? 'Utilisateurs'
                : section === 'roles' ? 'Rôles & Permissions'
                : section === 'plans' ? 'Plans'
                : section === 'audit' ? "Journal d'audit"
                : locationProjectId ? projects.find(p => p.id === locationProjectId)?.name || 'Projets'
                : 'Projets'}
            </span>
            {section === 'plans' && selectedLocationForPlans && (
              <>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current-location">{selectedLocationForPlans.name}</span>
              </>
            )}
          </div>

          <div className="topbar-actions">
            

            {/* Profile */}
            <div ref={profileRef} className="profile-wrapper">
              <button onClick={() => { setShowProfile(!showProfile);  }} className={`profile-btn ${showProfile ? 'active' : ''}`}
                onMouseEnter={e => { if (!showProfile) e.currentTarget.style.background = '#f1f5f9' }}
                onMouseLeave={e => { if (!showProfile) e.currentTarget.style.background = 'transparent' }}>
                <div className="profile-avatar">{displayName[0]?.toUpperCase()}</div>
                <div className="profile-info">
                  <div className="profile-name">{displayName}</div>
                  <div className="profile-role">{currentRole}</div>
                </div>
                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                  <polyline points='6 9 12 15 18 9'/>
                </svg>
              </button>
              {showProfile && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">{displayName[0]?.toUpperCase()}</div>
                    <div>
                      <p className="dropdown-name">{displayName}</p>
                      <p className="dropdown-email">{currentEmail}</p>
                    </div>
                  </div>
                  <div className="dropdown-footer">
                    <button onClick={handleLogout} className="dropdown-logout"
                      onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/>
                      </svg>
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main className="admin-content">

          {/* Toast succès */}
          {successMsg && (
            <div className="success-toast">
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#16a34a' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M20 6L9 17l-5-5'/></svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* ════════ DASHBOARD ════════ */}
          {section === 'dashboard' && (
            <div>
              <div className="dashboard-header">
                <h1 className="dashboard-title">Tableau de bord</h1>
                <p className="dashboard-subtitle">Vue globale de la plateforme Axia Plan.</p>
              </div>
              <div className="stats-grid">
                {[
                  { label: 'Utilisateurs', value: users.length,                      action: () => setSection('users') },
                  { label: 'Projets',      value: projects.length,                   action: () => setSection('projects') },
                  { label: 'Plans',        value: totalPlans !== null ? totalPlans : '…', action: () => {} },
                ].map((s, i) => (
                  <div key={i} onClick={s.action} className="stat-card"
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'}>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value || '—'}</div>
                  </div>
                ))}
              </div>
              <div className="recent-activity-card">
                <div className="recent-header">
                  <div className="recent-icon">
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/>
                    </svg>
                  </div>
                  <h2 className="recent-title">Activité récente</h2>
                  <button
                    className="back-btn"
                    style={{ marginLeft: 'auto', fontSize: 12, color: '#1d4ed8' }}
                    onClick={() => setSection('audit')}
                  >
                    Voir tout →
                  </button>
                </div>

                {(() => {
                  const ACTION_STYLE: Record<string, { color: string; bg: string; label: string }> = {
                    CREATE: { color: '#16a34a', bg: '#f0fdf4', label: 'Création' },
                    UPDATE: { color: '#d97706', bg: '#fffbeb', label: 'Modification' },
                    DELETE: { color: '#ef4444', bg: '#fff1f2', label: 'Suppression' },
                  }
                  const recent = auditLogs.slice(0, 4)

                  return loadingAudit ? (
                    <div className="loading-state" style={{ padding: '20px 0' }}>Chargement...</div>
                  ) : recent.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Aucune activité récente
                    </div>
                  ) : (
                    <div>
                      {recent.map((log, idx) => {
                        const st = ACTION_STYLE[log.action] || { color: '#64748b', bg: '#f1f5f9', label: log.action }
                        const isLast = idx === recent.length - 1
                        return (
                          <div
                            key={log.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}
                          >
                            {/* Icône action */}
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, display: 'block' }} />
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '1px 8px', borderRadius: 20 }}>
                                  {st.label}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                                  {log.entity}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {log.description || '—'}
                              </p>
                            </div>

                            {/* Utilisateur + date */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#334155' }}>{log.userName}</p>
                              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                                {new Date(log.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                {' '}
                                {new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* ════════ USERS ════════ */}
          {section === 'users' && (
            <div>
              <div className="users-header">
                <div>
                  <h1 className="users-title">Utilisateurs</h1>
                  <p className="users-subtitle">Gérez les comptes et les rôles de votre équipe.</p>
                </div>
                <div className="users-actions">
                  <div className="search-wrapper">
                    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className="search-icon">
                      <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
                    </svg>
                    <input type='text' placeholder='Rechercher...' value={search} onChange={e => setSearch(e.target.value)}
                      className="search-input"
                      onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    {search && (
                      <button onClick={() => setSearch('')} className="search-clear">
                        <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
                      </button>
                    )}
                  </div>
                  <button onClick={() => {
                      if (roles.length === 0) fetchRoles()
                      setNewUser(p => ({ ...p, role: roles[0]?.name || '' }))
                      setShowAddModal(true)
                    }} className="add-user-btn"
                    onMouseEnter={e => e.currentTarget.style.background = '#1e40af'}
                    onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}>
                    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                      <line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/>
                    </svg>
                    Ajouter
                  </button>
                </div>
              </div>

              {error && <div className="error-message">⚠ {error}</div>}

              <div className="users-table">
                <div className="table-header">
                  {['Nom', 'Email', 'Rôle', ''].map(h => <span key={h} className="table-header-cell">{h}</span>)}
                </div>
                {loadingUsers
                  ? <div className="loading-state">Chargement...</div>
                  : filteredUsers.length === 0
                    ? <div className="empty-state"><p className="empty-text">{search ? `Aucun résultat pour « ${search} »` : 'Aucun utilisateur trouvé'}</p></div>
                    : filteredUsers.map((u, i) => (
                      <div key={u.id} className="table-row"
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#fafafa'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                        <span className="cell-name">{u.name}</span>
                        <span className="cell-email">{u.email}</span>
                        <span className="cell-role">{getRoleName(u.role) || '—'}</span>
                        <ThreeDotMenu id={u.id} refs={menuRefs}
                          onEdit={() => { setSelectedUser(u); setEditName(u.name); setEditEmail(u.email); setEditRole(getRoleName(u.role)); setShowEditModal(true); setOpenMenuId(null) }}
                          onDelete={() => { setSelectedUser(u); setShowDeleteModal(true); setOpenMenuId(null) }} />
                      </div>
                    ))
                }
              </div>
            </div>
          )}

          {/* ════════ PROJECTS ════════ */}
          {section === 'projects' && (
            <div>
              {!locationProjectId ? (
                <>
                  <div className="projects-header">
                    <div>
                      <h1 className="projects-title">Projets</h1>
                      <p className="projects-subtitle">Cliquez sur un projet pour gérer ses localisations.</p>
                    </div>
                    <div className="projects-actions">
                      <div className="search-wrapper">
                        <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className="search-icon">
                          <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
                        </svg>
                        <input type='text' placeholder='Rechercher...' value={projectSearch} onChange={e => setProjectSearch(e.target.value)}
                          className="search-input"
                          onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                        {projectSearch && (
                          <button onClick={() => setProjectSearch('')} className="search-clear">
                            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
                          </button>
                        )}
                      </div>
                      <button onClick={() => setShowAddProjectModal(true)} className="add-project-btn"
                        onMouseEnter={e => e.currentTarget.style.background = '#1e40af'}
                        onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}>
                        <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                          <line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/>
                        </svg>
                        Nouveau projet
                      </button>
                    </div>
                  </div>

                  {error && <div className="error-message">⚠ {error}</div>}

                  <div className="projects-table">
                    <div className="table-header projects-header-grid">
                      {['Nom', 'Description', 'Statut', 'Créé le', ''].map(h => <span key={h} className="table-header-cell">{h}</span>)}
                    </div>
                    {loadingProjects
                      ? <div className="loading-state">Chargement...</div>
                      : filteredProjects.length === 0
                        ? <div className="empty-state"><p className="empty-text">{projectSearch ? `Aucun résultat pour « ${projectSearch} »` : 'Aucun projet trouvé'}</p></div>
                        : filteredProjects.map((p, i) => {
                          const st = getStatusLabel(p.status)
                          return (
                            <div key={p.id} className="table-row projects-row"
                              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#eff6ff'}
                              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                              onClick={() => { setLocationProjectId(p.id); setLocationTree([]); setLocationsWithPlans(new Set()); fetchLocationTree(p.id) }}>
                              <span className="cell-name">{p.name}</span>
                              <span className="cell-description">{p.description || '—'}</span>
                              <span className="cell-status" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                              <span className="cell-date">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}</span>
                              <div onClick={e => e.stopPropagation()}>
                                <ThreeDotMenu id={p.id} refs={projectMenuRefs}
                                  onEdit={() => { setSelectedProject(p); setEditProject({ name: p.name, description: p.description || '', status: p.status }); setShowEditProjectModal(true); setOpenProjectMenuId(null) }}
                                  onDelete={() => { setSelectedProject(p); setShowDeleteProjectModal(true); setOpenProjectMenuId(null) }} />
                              </div>
                            </div>
                          )
                        })
                    }
                  </div>
                </>
              ) : (
                <>
                  <div className="locations-header">
                    <div>
                      <button onClick={() => { setLocationProjectId(null); setLocationTree([]); setShowMembersPanel(false) }} className="back-btn"
                        onMouseEnter={e => e.currentTarget.style.color = '#1d4ed8'}
                        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                        Retour aux projets
                      </button>
                      <h1 className="locations-title">{projects.find(p => p.id === locationProjectId)?.name}</h1>
                      <p className="locations-subtitle">Localisations du projet — arborescence complète.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setShowMembersPanel(!showMembersPanel)} className="add-location-btn"
                        style={{ background: showMembersPanel ? '#1e40af' : '#64748b' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                        <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                          <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/>
                          <path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/>
                        </svg>
                        Membres ({members.length})
                      </button>
                      <button onClick={openAddRootModal} className="add-location-btn"
                        onMouseEnter={e => e.currentTarget.style.background = '#1e40af'}
                        onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}>
                        <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                          <line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/>
                        </svg>
                        Ajouter une localisation
                      </button>
                    </div>
                  </div>

                  {error && <div className="error-message">⚠ {error}</div>}

                  <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    {/* Arbre des localisations */}
                    <div className="locations-card" style={{ flex: 1 }}>
  {/* En-tête */}
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 14px', borderBottom: '0.5px solid #e2e8f0' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <div>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Localisations</h2>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          {locationTree.length} zone{locationTree.length !== 1 ? 's' : ''} racine{locationTree.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
    <button
      onClick={openAddRootModal}
      style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
        borderRadius: 8, border: '0.5px solid #93C5FD', background: '#EFF6FF',
        color: '#1d4ed8', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#1d4ed8' }}
      onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#1d4ed8'; e.currentTarget.style.borderColor = '#93C5FD' }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Ajouter
    </button>
  </div>

  {/* Corps */}
  <div style={{ padding: '10px 12px' }}>
    {loadingLocations ? (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12 }}>
        <div style={{ width: 28, height: 28, border: '2.5px solid #BFDBFE', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 12, color: '#94a3b8' }}>Chargement...</span>
      </div>
    ) : locationTree.length === 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '52px 24px', gap: 14, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#f8fafc', border: '1.5px dashed #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#374151' }}>Aucune localisation</p>
          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Créez votre première zone pour organiser les plans</p>
        </div>
        <button
          onClick={openAddRootModal}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#1d4ed8', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Créer la première localisation
        </button>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {locationTree.map(loc => (
          <LocationTreeNode
            key={loc.id} loc={loc} depth={0}
            onAddChild={openAddChildModal}
            onDelete={loc => { setSelectedLocation(loc); setShowDeleteLocationModal(true) }}
            onViewPlans={handleViewPlans}
            locationsWithPlans={locationsWithPlans}
          />
        ))}
      </div>
    )}
  </div>
</div>

                    {/* Panneau membres */}
                    {showMembersPanel && (
                      <div className="locations-card" style={{ width: 300, flexShrink: 0 }}>
                        <div className="card-header">
                          <h2 className="card-title">Membres</h2>
                          <button onClick={() => setShowAddMemberModal(true)} style={{
                            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                            background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6,
                            fontSize: 12, fontWeight: 600, cursor: 'pointer'
                          }}>
                            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
                            Ajouter
                          </button>
                        </div>
                        {loadingMembers ? (
                          <div className="loading-state">Chargement...</div>
                        ) : members.length === 0 ? (
                          <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Aucun membre</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {members.map(m => (
                              <div key={m.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 12px', borderRadius: 8, gap: 10
                              }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{
                                    width: 32, height: 32, borderRadius: '50%', background: '#eff6ff',
                                    color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, fontWeight: 700, flexShrink: 0
                                  }}>
                                    {m.name?.[0]?.toUpperCase() || '?'}
                                  </div>
                                  <div>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{m.name}</p>
                                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{getRoleName(m.role)}</p>
                                  </div>
                                </div>
                                <button onClick={() => { setSelectedMember(m); setShowDeleteMemberModal(true) }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, borderRadius: 4, display: 'flex' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#ef4444' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#cbd5e1' }}>
                                  <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                    <polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M9 6V4h6v2'/>
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════ RÔLES & PERMISSIONS ════════ */}
          {section === 'roles' && (() => {
            const grouped = groupPermissions(permissions)
            return (
              <div>
                {/* En-tête */}
                <div className="roles-header">
                  <div>
                    <h1 className="roles-title">Rôles & Permissions</h1>
                    <p className="roles-subtitle">{roles.length} rôle{roles.length !== 1 ? 's' : ''} · {permissions.length} permission{permissions.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={openAddRole} className="add-role-btn"
                    onMouseEnter={e => e.currentTarget.style.background = '#1e40af'}
                    onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}>
                    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                      <line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/>
                    </svg>
                    Nouveau rôle
                  </button>
                </div>

                {error && <div className="error-message">⚠ {error}</div>}

                {/* Tableau */}
                <div className="roles-table">
                  <div className="table-header roles-header-grid">
                    {['Rôle', 'Permissions attribuées', ''].map(h => <span key={h} className="table-header-cell">{h}</span>)}
                  </div>

                  {loadingRoles ? (
                    <div className="loading-state">Chargement...</div>
                  ) : roles.length === 0 ? (
                    <div className="empty-state">
                      <svg width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='#cbd5e1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
                        <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/>
                      </svg>
                      <p className="empty-text">Aucun rôle créé</p>
                    </div>
                  ) : roles.map((role, idx) => (
                    <div key={role.id} className="table-row roles-row"
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#fafafa'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>

                      {/* Nom du rôle */}
                      <div className="role-info">
                        <div className="role-icon">
                          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                            <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/>
                          </svg>
                        </div>
                        <div>
                          <p className="role-name">{role.name}</p>
                          <p className="role-perm-count">{getPermissions(role).length} permission{getPermissions(role).length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      {/* Badges permissions */}
                      <div className="role-perms">
                        {getPermissions(role) .length === 0
                          ? <span className="no-perms">Aucune permission</span>
                          : getPermissions(role) .slice(0, 5).map(p => (
                            <span key={p.id} className="perm-badge">{p.name}</span>
                          ))
                        }
                        {getPermissions(role).length > 5 && (
                          <span className="perm-more">+{getPermissions(role).length - 5}</span>
                        )}
                      </div>

                      {/* Menu 3 points */}
                      <div ref={el => { roleMenuRefs.current[role.id] = el }} className="role-menu">
                        <button onClick={() => setOpenRoleMenuId(openRoleMenuId === role.id ? null : role.id)}
                          className={`role-menu-btn ${openRoleMenuId === role.id ? 'open' : ''}`}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}
                          onMouseLeave={e => { if (openRoleMenuId !== role.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' } }}>
                          <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
                            <circle cx='12' cy='5' r='1.5'/><circle cx='12' cy='12' r='1.5'/><circle cx='12' cy='19' r='1.5'/>
                          </svg>
                        </button>
                        {openRoleMenuId === role.id && (
                          <div className="role-dropdown">
                            <button onClick={() => openEditRole(role)} className="dropdown-edit"
                              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#64748b' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/>
                                <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>
                              </svg>
                              Modifier
                            </button>
                            <div className="dropdown-divider" />
                            <button onClick={() => openDeleteRole(role)} className="dropdown-delete"
                              onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                <polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/>
                                <path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/>
                              </svg>
                              Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── MODAL CRÉATION / MODIFICATION RÔLE ── */}
                {(showAddRoleModal || showEditRoleModal) && (
                  <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowAddRoleModal(false); setShowEditRoleModal(false) } }}>
                    <div className="role-modal">
                      {/* Header */}
                      <div className="role-modal-header">
                        <div className="role-modal-icon">
                          <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                            <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/>
                          </svg>
                        </div>
                        <h2 className="role-modal-title">
                          {showAddRoleModal ? 'Nouveau rôle' : `Modifier « ${selectedRole?.name} »`}
                        </h2>
                        <button onClick={() => { setShowAddRoleModal(false); setShowEditRoleModal(false) }} className="role-modal-close"
                          onMouseEnter={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#ef4444' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#94a3b8' }}>
                          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                            <line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>
                          </svg>
                        </button>
                      </div>

                      {/* Body scrollable */}
                      <div className="role-modal-body">
                        {/* Nom du rôle */}
                        <div className="role-name-field">
                          <label className="form-label">Nom du rôle <span className="required">*</span></label>
                          <input placeholder='Ex: Chef de projet, Technicien...' value={roleFormName}
                            onChange={e => { setRoleFormName(e.target.value); setRoleNameError('') }}
                            className={`form-input ${roleNameError ? 'error' : ''}`}
                            onFocus={e => e.target.style.borderColor = '#1d4ed8'}
                            onBlur={e => e.target.style.borderColor = roleNameError ? '#ef4444' : '#e2e8f0'} />
                          {roleNameError && <p className="form-error">⚠ {roleNameError}</p>}
                        </div>

                        {/* Permissions */}
                        <div className="permissions-section">
                          <div className="permissions-header">
                            <label className="form-label">Permissions</label>
                            <div className="perm-actions">
                              <button onClick={() => setRoleFormPermIds(new Set(permissions.map(p => p.id)))} className="select-all-btn"
                                onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                                onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}>
                                Tout cocher
                              </button>
                              <button onClick={() => setRoleFormPermIds(new Set())} className="deselect-all-btn"
                                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                                Tout décocher
                              </button>
                            </div>
                          </div>

                          {permissions.length === 0 ? (
                            <div className="no-perms-message">Aucune permission disponible</div>
                          ) : (
                            <div className="permissions-list">
                              {Object.entries(grouped).map(([category, perms]) => {
                                const allChecked  = perms.every(p => roleFormPermIds.has(p.id))
                                const someChecked = perms.some(p => roleFormPermIds.has(p.id))
                                return (
                                  <div key={category} className="perm-category">
                                    {/* En-tête catégorie */}
                                    <div onClick={() => toggleRolePermGroup(perms.map(p => p.id), !allChecked)} className="perm-category-header">
                                      <div className={`checkbox ${allChecked ? 'checked' : ''} ${someChecked && !allChecked ? 'partial' : ''}`}>
                                        {allChecked && <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12'/></svg>}
                                        {!allChecked && someChecked && <div className="partial-indicator" />}
                                      </div>
                                      <span className="category-name">{category}</span>
                                      <span className="category-count">{perms.filter(p => roleFormPermIds.has(p.id)).length}/{perms.length}</span>
                                    </div>
                                    {/* Items */}
                                    <div className="perm-items">
                                      {perms.map(perm => {
                                        const checked = roleFormPermIds.has(perm.id)
                                        return (
                                          <label key={perm.id} className="perm-item"
                                            onMouseEnter={e => (e.currentTarget as HTMLLabelElement).style.background = '#f8fafc'}
                                            onMouseLeave={e => (e.currentTarget as HTMLLabelElement).style.background = 'transparent'}>
                                            <div onClick={() => toggleRolePerm(perm.id)} className={`perm-checkbox ${checked ? 'checked' : ''}`}>
                                              {checked && <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12'/></svg>}
                                            </div>
                                            <span onClick={() => toggleRolePerm(perm.id)} className={`perm-name ${checked ? 'checked' : ''}`}>
                                              {perm.name}
                                            </span>
                                          </label>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="role-modal-footer">
                        <button onClick={() => { setShowAddRoleModal(false); setShowEditRoleModal(false) }} className="modal-cancel">Annuler</button>
                        <button onClick={showAddRoleModal ? handleCreateRole : handleUpdateRole} disabled={actionLoading} className="modal-submit"
                          onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = '#1e40af' }}
                          onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}>
                          {actionLoading ? 'Enregistrement...' : showAddRoleModal ? 'Créer le rôle' : 'Sauvegarder'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── MODAL SUPPRESSION RÔLE ── */}
                {showDeleteRoleModal && selectedRole && (
                  <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDeleteRoleModal(false) }}>
                    <div className="delete-modal">
                      <div className="delete-icon">
                        <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                          <polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/>
                          <path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/>
                        </svg>
                      </div>
                      <h2 className="delete-title">Supprimer le rôle</h2>
                      <p className="delete-text">Supprimer le rôle <strong>« {selectedRole.name} »</strong> ?</p>
                      <p className="warning-text">⚠ Les utilisateurs assignés à ce rôle seront affectés.</p>
                      <div className="delete-actions">
                        <button onClick={() => setShowDeleteRoleModal(false)} className="modal-cancel">Annuler</button>
                        <button onClick={handleDeleteRole} disabled={actionLoading} className="modal-delete">{actionLoading ? 'Suppression...' : 'Supprimer'}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ════════ PLANS ════════ */}
          {section === 'plans' && selectedLocationForPlans && (
            <div>
              <div className="plans-header">
                <button onClick={() => setSection('projects')} className="back-btn"
                  onMouseEnter={e => e.currentTarget.style.color = '#1d4ed8'}
                  onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                  Retour aux localisations
                </button>
                <div className="plans-title-section">
                  <h1 className="plans-main-title">Plans — <span className="location-name">{selectedLocationForPlans.name}</span></h1>
                  <p className="plans-count">{loadingPlans ? 'Chargement...' : `${plans.length} plan${plans.length !== 1 ? 's' : ''} trouvé${plans.length !== 1 ? 's' : ''}`}</p>
                </div>
              </div>

              {error && <div className="error-message">⚠ {error}</div>}

              {loadingPlans ? (
                <div className="loading-container">Chargement des plans...</div>
              ) : plans.length === 0 ? (
                <div className="empty-plans">
                  <svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='#cbd5e1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/>
                  </svg>
                  <p className="empty-text">Aucun plan pour cette localisation</p>
                </div>
              ) : (
                <div className="plans-grid">
                  {plans.map(plan => {
                    const st = getStatusLabel(plan.status)
                    const latestVersion = plan.planVersions?.find(v => v.versionNumber === plan.currentVersion)
                    return (
                      <div key={plan.id} className="plan-card"
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#bfdbfe' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0' }}>
                        <div className="plan-card-header">
                          <div className="plan-card-icon">
                            <svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                              <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/>
                            </svg>
                          </div>
                          <div>
                            <p className="plan-card-name">{plan.name}</p>
                            {plan.category && <p className="plan-card-category">{plan.category}</p>}
                          </div>
                          <span className="plan-card-status" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                        </div>
                        <div className="plan-version-info">
                          <span className="version-label">Version actuelle</span>
                          <span className="version-number">v{plan.currentVersion}</span>
                        </div>
                        {latestVersion && (
                          <p className="plan-size">
                            <strong>{(latestVersion.fileSize / 1024).toFixed(0)} KB</strong> · {latestVersion.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}
                          </p>
                        )}
                        {latestVersion ? (
                          <a href={`http://localhost:5279${latestVersion.filePath}`} target='_blank' rel='noopener noreferrer' className="view-plan-btn"
                            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = '#1e40af'}
                            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = '#1d4ed8'}>
                            Voir Plan
                          </a>
                        ) : (
                          <div className="no-file-message">Aucun fichier disponible</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {/* ════════ AUDIT ════════ */}
            {section === 'audit' && perms.canSeeAudit && (
              <div>
                <div className="users-header">
                  <div>
                    <h1 className="users-title">Journal d'audit</h1>
                    <p className="users-subtitle">Historique de toutes les actions effectuées dans le système.</p>
                  </div>
                  <div className="users-actions">
                    <div className="search-wrapper">
                      <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className="search-icon">
                        <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
                      </svg>
                      <input
                        type='text'
                        placeholder='Filtrer par action, entité, utilisateur...'
                        value={auditFilter}
                        onChange={e => setAuditFilter(e.target.value)}
                        className="search-input"
                        onFocus={e => e.target.style.borderColor = '#1d4ed8'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                      {auditFilter && (
                        <button onClick={() => setAuditFilter('')} className="search-clear">
                          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
                        </button>
                      )}
                    </div>
                    <button
                      onClick={fetchAuditLogs}
                      className="add-user-btn"
                      onMouseEnter={e => e.currentTarget.style.background = '#1e40af'}
                      onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}
                    >
                      <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='23 4 23 10 17 10'/><path d='M20.49 15a9 9 0 1 1-2.12-9.36L23 10'/></svg>
                      Actualiser
                    </button>
                  </div>
                </div>

                {error && <div className="error-message">⚠ {error}</div>}

                {(() => {
                  const ACTION_STYLE: Record<string, { color: string; bg: string; label: string }> = {
                    CREATE: { color: '#16a34a', bg: '#f0fdf4', label: 'Création' },
                    UPDATE: { color: '#d97706', bg: '#fffbeb', label: 'Modification' },
                    DELETE: { color: '#ef4444', bg: '#fff1f2', label: 'Suppression' },
                  }
                  const filtered = auditLogs.filter(log => {
                    const q = auditFilter.toLowerCase()
                    return !q ||
                      log.action?.toLowerCase().includes(q) ||
                      log.entity?.toLowerCase().includes(q) ||
                      log.description?.toLowerCase().includes(q) ||
                      log.userName?.toLowerCase().includes(q) ||
                      log.userEmail?.toLowerCase().includes(q)
                  })

                  return loadingAudit ? (
                    <div className="loading-state">Chargement...</div>
                  ) : auditLogs.length === 0 ? (
                    <div className="empty-state">
                      <svg width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='#cbd5e1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' style={{ margin: '0 auto 12px', display: 'block' }}>
                        <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/>
                      </svg>
                      <p className="empty-text">Aucun log d'audit disponible</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="empty-state">
                      <p className="empty-text">Aucun résultat pour « {auditFilter} »</p>
                    </div>
                  ) : (
                    <div className="users-table">
                      {/* Header */}
                      <div className="table-header" style={{ display: 'grid', gridTemplateColumns: '130px 110px 1fr 200px 150px', gap: 12 }}>
                        {['Action', 'Entité', 'Description', 'Utilisateur', 'Date'].map(h => (
                          <span key={h} className="table-header-cell">{h}</span>
                        ))}
                      </div>
                      {/* Rows */}
                      {filtered.map((log, idx) => {
                        const st = ACTION_STYLE[log.action] || { color: '#64748b', bg: '#f1f5f9', label: log.action }
                        const isLast = idx === filtered.length - 1
                        return (
                          <div
                            key={log.id}
                            className="table-row"
                            style={{ display: 'grid', gridTemplateColumns: '130px 110px 1fr 200px 150px', gap: 12, borderBottom: isLast ? 'none' : undefined, alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#fafafa'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                          >
                            {/* Action */}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, width: 'fit-content' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                              {st.label}
                            </span>
                            {/* Entité */}
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, width: 'fit-content' }}>
                              {log.entity || '—'}
                            </span>
                            {/* Description */}
                            <span style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.description || ''}>
                              {log.description || '—'}
                            </span>
                            {/* Utilisateur */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                {log.userName?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{log.userName}</p>
                                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{log.userEmail}</p>
                              </div>
                            </div>
                            {/* Date */}
                            <div>
                              <p style={{ margin: 0, fontSize: 12, color: '#475569', fontWeight: 500 }}>
                                {new Date(log.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                                {new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* Plans modal */}
      {showPlansModal && selectedLocationForPlans && (
        <PlansModal location={selectedLocationForPlans} plans={plans} loading={loadingPlans}
          onClose={() => { setShowPlansModal(false); setSelectedLocationForPlans(null); setPlans([]) }} />
      )}

      {/* ── User : Supprimer ── */}
      {showDeleteModal && selectedUser && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
          <div className="delete-modal">
            <div className="delete-icon">
              <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/>
              </svg>
            </div>
            <h2 className="delete-title">Supprimer l'utilisateur</h2>
            <p className="delete-text">Supprimer <strong>{selectedUser.name}</strong> ? Cette action est irréversible.</p>
            <div className="delete-actions">
              <button onClick={() => setShowDeleteModal(false)} className="modal-cancel">Annuler</button>
              <button onClick={handleDelete} disabled={actionLoading} className="modal-delete">{actionLoading ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── User : Modifier ── */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false) }}>
          <div className="edit-user-modal">
            <h2 className="modal-title">Modifier l'utilisateur</h2>
            <div className="modal-form">
              {[{ label: 'Nom', val: editName, set: setEditName, type: 'text' }, { label: 'Email', val: editEmail, set: setEditEmail, type: 'email' }].map(f => (
                <div key={f.label}>
                  <label className="form-label">{f.label}</label>
                  <input value={f.val} onChange={e => f.set(e.target.value)} type={f.type} className="form-input" onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
              ))}
              <div>
                <label className="form-label">Rôle</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)} className="form-select">
                  {roles.length > 0
                    ? roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)
                    : <option value=''>Aucun rôle disponible</option>
                  }
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowEditModal(false)} className="modal-cancel">Annuler</button>
              <button onClick={handleEdit} disabled={actionLoading} className="modal-submit">{actionLoading ? 'Enregistrement...' : 'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── User : Ajouter ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowAddModal(false); setAddErrors({}) } }}>
          <div className="add-user-modal">
            <h2 className="modal-title">Ajouter un utilisateur</h2>
            <div className="modal-form">
              {([{ label: 'Nom complet', key: 'name', type: 'text', placeholder: 'Ahmed Benali' }, { label: 'Email', key: 'email', type: 'email', placeholder: 'a.benali@entreprise.com' }, { label: 'Mot de passe', key: 'password', type: 'password', placeholder: '••••••••' }] as const).map(f => (
                <div key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={newUser[f.key]}
                    onChange={e => { setNewUser(p => ({ ...p, [f.key]: e.target.value })); setAddErrors(p => ({ ...p, [f.key]: '' })) }}
                    className={`form-input ${addErrors[f.key] ? 'error' : ''}`}
                    onFocus={e => { if (!addErrors[f.key]) e.target.style.borderColor = '#1d4ed8' }}
                    onBlur={e => { if (!addErrors[f.key]) e.target.style.borderColor = '#e2e8f0' }} />
                  {addErrors[f.key] && <p className="form-error">⚠ {addErrors[f.key]}</p>}
                </div>
              ))}
              <div>
                <label className="form-label">Rôle</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)} className="form-select">
                  {roles.length > 0
                    ? roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)
                    : <option value=''>Aucun rôle disponible</option>
                  }
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => { setShowAddModal(false); setAddErrors({}); setNewUser({ name: '', email: '', password: '', role: roles[0]?.name || '' }) }} className="modal-cancel">Annuler</button>
              <button onClick={handleAdd} disabled={actionLoading} className="modal-submit">{actionLoading ? 'Ajout...' : 'Ajouter'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Project : Supprimer ── */}
      {showDeleteProjectModal && selectedProject && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDeleteProjectModal(false) }}>
          <div className="delete-modal">
            <div className="delete-icon">
              <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/>
              </svg>
            </div>
            <h2 className="delete-title">Supprimer le projet</h2>
            <p className="delete-text">Supprimer <strong>{selectedProject.name}</strong> ? Cette action est irréversible.</p>
            <div className="delete-actions">
              <button onClick={() => setShowDeleteProjectModal(false)} className="modal-cancel">Annuler</button>
              <button onClick={handleDeleteProject} disabled={actionLoading} className="modal-delete">{actionLoading ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Project : Modifier ── */}
      {showEditProjectModal && selectedProject && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEditProjectModal(false) }}>
          <div className="edit-project-modal">
            <h2 className="modal-title">Modifier le projet</h2>
            <div className="modal-form">
              <div>
                <label className="form-label">Nom du projet</label>
                <input value={editProject.name} onChange={e => setEditProject(p => ({ ...p, name: e.target.value }))} className={`form-input ${projectErrors.name ? 'error' : ''}`} onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                {projectErrors.name && <p className="form-error">⚠ {projectErrors.name}</p>}
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea value={editProject.description} onChange={e => setEditProject(p => ({ ...p, description: e.target.value }))} rows={3} className="form-textarea" onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label className="form-label">Statut</label>
                <select value={editProject.status} onChange={e => setEditProject(p => ({ ...p, status: e.target.value }))} className="form-select">
                  <option value='Planning'>Planifié</option><option value='Active'>Actif</option><option value='OnHold'>En pause</option><option value='Completed'>Terminé</option><option value='Cancelled'>Annulé</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowEditProjectModal(false)} className="modal-cancel">Annuler</button>
              <button onClick={handleEditProject} disabled={actionLoading} className="modal-submit">{actionLoading ? 'Enregistrement...' : 'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Project : Ajouter ── */}
      {showAddProjectModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowAddProjectModal(false); setProjectErrors({}) } }}>
          <div className="add-project-modal">
            <h2 className="modal-title">Nouveau projet</h2>
            <div className="modal-form">
              <div>
                <label className="form-label">Nom du projet</label>
                <input placeholder='Ex: Refonte site web' value={newProject.name} onChange={e => { setNewProject(p => ({ ...p, name: e.target.value })); setProjectErrors(p => ({ ...p, name: '' })) }} className={`form-input ${projectErrors.name ? 'error' : ''}`} onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                {projectErrors.name && <p className="form-error">⚠ {projectErrors.name}</p>}
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea placeholder='Description du projet...' value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} rows={3} className="form-textarea" onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label className="form-label">Statut</label>
                <select value={newProject.status} onChange={e => setNewProject(p => ({ ...p, status: e.target.value }))} className="form-select">
                  <option value='Planning'>Planifié</option><option value='Active'>Actif</option><option value='OnHold'>En pause</option><option value='Completed'>Terminé</option><option value='Cancelled'>Annulé</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => { setShowAddProjectModal(false); setProjectErrors({}); setNewProject({ name: '', description: '', status: 'Planning' }) }} className="modal-cancel">Annuler</button>
              <button onClick={handleAddProject} disabled={actionLoading} className="modal-submit">{actionLoading ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Location : Supprimer ── */}
      {showDeleteLocationModal && selectedLocation && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDeleteLocationModal(false) }}>
          <div className="delete-modal">
            <div className="delete-icon">
              <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/>
              </svg>
            </div>
            <h2 className="delete-title">Supprimer la localisation</h2>
            <p className="delete-text">Supprimer <strong>{selectedLocation.name}</strong> ?</p>
            <p className="warning-text">⚠ Impossible de supprimer une localisation ayant des enfants.</p>
            <div className="delete-actions">
              <button onClick={() => setShowDeleteLocationModal(false)} className="modal-cancel">Annuler</button>
              <button onClick={handleDeleteLocation} disabled={actionLoading} className="modal-delete">{actionLoading ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Location : Ajouter ── */}
      {showAddLocationModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowAddLocationModal(false); setLocationErrors({}) } }}>
          <div className="add-location-modal">
            <h2 className="modal-title">
              {parentLocation ? `Ajouter sous « ${parentLocation.name} »` : 'Nouvelle localisation racine'}
            </h2>
            {!parentLocation && <div style={{ marginBottom: 20 }} />}
            <div className="modal-form">
              <div>
                <label className="form-label">Nom</label>
                <input placeholder='Ex: Bâtiment A, Salle 101...' value={newLocation.name}
                  onChange={e => { setNewLocation(p => ({ ...p, name: e.target.value })); setLocationErrors(p => ({ ...p, name: '' })) }}
                  className={`form-input ${locationErrors.name ? 'error' : ''}`}
                  onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                {locationErrors.name && <p className="form-error">⚠ {locationErrors.name}</p>}
              </div>
              <div>
                <label className="form-label">Type</label>
                <select value={newLocation.type} onChange={e => setNewLocation(p => ({ ...p, type: e.target.value }))} className="form-select">
                  {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => { setShowAddLocationModal(false); setLocationErrors({}); setParentLocation(null) }} className="modal-cancel">Annuler</button>
              <button onClick={handleAddLocation} disabled={actionLoading} className="modal-submit">{actionLoading ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Member : Ajouter ── */}
        {showAddMemberModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowAddMemberModal(false); setMemberEmail(''); setMemberEmailError('') } }}>
            <div className="add-user-modal">
              <h2 className="modal-title">Ajouter un membre</h2>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20, marginTop: -8 }}>
                Entrez l'email de l'utilisateur à ajouter au projet.
              </p>
              <div className="modal-form">
                <div>
                  <label className="form-label">Adresse email</label>
                  <input
                    type='email'
                    placeholder='exemple@email.com'
                    value={memberEmail}
                    onChange={e => { setMemberEmail(e.target.value); setMemberEmailError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddMemberByEmail() }}
                    className={`form-input ${memberEmailError ? 'error' : ''}`}
                    onFocus={e => { if (!memberEmailError) e.target.style.borderColor = '#1d4ed8' }}
                    onBlur={e => { if (!memberEmailError) e.target.style.borderColor = '#e2e8f0' }}
                    autoFocus
                  />
                  {memberEmailError && <p className="form-error">⚠ {memberEmailError}</p>}
                </div>
              </div>
              <div className="modal-actions">
                <button onClick={() => { setShowAddMemberModal(false); setMemberEmail(''); setMemberEmailError('') }} className="modal-cancel">Annuler</button>
                <button onClick={handleAddMemberByEmail} disabled={!memberEmail.trim() || actionLoading} className="modal-submit"
                  style={{ opacity: memberEmail.trim() ? 1 : 0.5 }}>
                  {actionLoading ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Member : Supprimer ── */}
        {showDeleteMemberModal && selectedMember && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDeleteMemberModal(false) }}>
            <div className="delete-modal">
              <div className="delete-icon">
                <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/>
                </svg>
              </div>
              <h2 className="delete-title">Retirer le membre</h2>
              <p className="delete-text">Retirer <strong>{selectedMember.name}</strong> du projet ?</p>
              <div className="delete-actions">
                <button onClick={() => setShowDeleteMemberModal(false)} className="modal-cancel">Annuler</button>
                <button onClick={handleRemoveMember} disabled={actionLoading} className="modal-delete">
                  {actionLoading ? 'Suppression...' : 'Retirer'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}