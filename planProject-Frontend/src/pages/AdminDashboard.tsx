import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, removeToken, decodeToken } from '../utils/tokenUtils'
import { userService } from '../services/Userservice'
import { projectService } from '../services/Projectservice'
import { locationService } from '../services/Locationservice'
import type { User } from '../services/Userservice'
import type { Project } from '../services/Projectservice'
import type { Location } from '../services/Locationservice'

const getRoleName = (role: string | { name: string }): string => {
  if (!role) return '—'
  if (typeof role === 'string') return role
  return role.name || '—'
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

type Section = 'dashboard' | 'users' | 'projects'

const INITIAL_NOTIFICATIONS = [
  { id: 1, text: 'Nouvel utilisateur enregistré', time: 'Il y a 5 min', unread: true },
  { id: 2, text: 'Rôle modifié pour un utilisateur', time: 'Il y a 1h', unread: true },
  { id: 3, text: 'Utilisateur supprimé avec succès', time: 'Il y a 3h', unread: false },
]

// ── LOCATION TREE NODE ──────────────────────────────────────────────────────
function LocationTreeNode({
  loc,
  depth = 0,
  onDelete,
  onAddChild,
}: {
  loc: Location
  depth?: number
  onDelete: (loc: Location) => void
  onAddChild: (parentLoc: Location) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = loc.children && loc.children.length > 0

  const typeColors: Record<string, { color: string; bg: string }> = {
    Bloc:  { color: '#000000', bg: '#eff6ff' },
    Étage:     { color: '#000000', bg: '#fdf4ff' },
    Appartement:     { color: '#000000', bg: '#f0fdf4' },
    Autre:     { color: '#000000', bg: '#f1f5f9' },
  }
  const tc = typeColors[loc.type] || typeColors['Autre']

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 14px', borderRadius: 8,
          background: depth === 0 ? '#fafafa' : 'transparent',
          border: depth === 0 ? '1px solid #e2e8f0' : 'none',
          marginBottom: 4, transition: 'background 0.12s',
          cursor: hasChildren ? 'pointer' : 'default',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = depth === 0 ? '#f0f6ff' : '#f8fafc' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = depth === 0 ? '#fafafa' : 'transparent' }}
      >
        

        
        

        {/* Location icon */}
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke={tc.color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={{ flexShrink: 0 }}>
          <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/>
          <circle cx='12' cy='10' r='3'/>
        </svg>

        <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', flex: 1 }}>{loc.name}</span>

        <span style={{ fontSize: 11, fontWeight: 700, color: tc.color, background: tc.bg, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>
          {loc.type}
        </span>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onAddChild(loc)}
            title='Ajouter un enfant'
            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b' }}
          >
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
          </button>
          <button
            onClick={() => onDelete(loc)}
            title='Supprimer'
            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b' }}
          >
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M9 6V4h6v2'/></svg>
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: 22, paddingLeft: 4 }}>
          {loc.children!.map(child => (
            <LocationTreeNode key={child.id} loc={child} depth={depth + 1} onDelete={onDelete} onAddChild={onAddChild} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('dashboard')

  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Ingenieur' })
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  // Projects state
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [openProjectMenuId, setOpenProjectMenuId] = useState<number | null>(null)
  const [newProject, setNewProject] = useState({ name: '', description: '', status: 'Planning' })
  const [editProject, setEditProject] = useState({ name: '', description: '', status: '' })
  const [projectErrors, setProjectErrors] = useState<Record<string, string>>({})

  // Locations state
  const [locationProjectId, setLocationProjectId] = useState<number | null>(null)
  const [locationTree, setLocationTree] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [showDeleteLocationModal, setShowDeleteLocationModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [parentLocation, setParentLocation] = useState<Location | null>(null)
  const [newLocation, setNewLocation] = useState({ name: '', type: 'Bâtiment', projectId: 0, parentId: null as number | null })
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({})

  // Shared
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)

  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const menuRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const projectMenuRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const token = getToken()
  const currentUser = token ? (() => { try { return decodeToken(token) } catch { return null } })() : null
  const currentEmail = currentUser?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || ''
  const currentRole = currentUser?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || ''
  const unreadCount = notifications.filter(n => n.unread).length
  const displayName = currentEmail.split('@')[0] || 'Admin'

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
      if (openMenuId !== null) {
        const el = menuRefs.current[openMenuId]
        if (el && !el.contains(e.target as Node)) setOpenMenuId(null)
      }
      if (openProjectMenuId !== null) {
        const el = projectMenuRefs.current[openProjectMenuId]
        if (el && !el.contains(e.target as Node)) setOpenProjectMenuId(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [openMenuId, openProjectMenuId])

  // ── USERS ──
  const fetchUsers = async () => {
    setLoadingUsers(true); setError('')
    try { setUsers(await userService.getAll()) }
    catch (e: any) { setError(e.message) }
    finally { setLoadingUsers(false) }
  }

  useEffect(() => { if (section === 'users' || section === 'dashboard') fetchUsers() }, [section])

  const handleDelete = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      await userService.delete(selectedUser.id)
      setUsers(u => u.filter(x => x.id !== selectedUser.id))
      setShowDeleteModal(false); showSuccess('Utilisateur supprimé avec succès')
    } catch (e: any) { setError(e.message) }
    finally { setActionLoading(false) }
  }

  const handleEdit = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      await userService.update(selectedUser.id, { name: editName, email: editEmail })
      if (editRole !== getRoleName(selectedUser.role)) {
        await userService.updateRole(selectedUser.id, editRole)
      }
      await fetchUsers(); setShowEditModal(false); showSuccess('Utilisateur modifié avec succès')
    } catch (e: any) { setError(e.message) }
    finally { setActionLoading(false) }
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
      await fetchUsers(); setShowAddModal(false)
      setNewUser({ name: '', email: '', password: '', role: 'Ingenieur' }); setAddErrors({})
      showSuccess('Utilisateur ajouté avec succès')
    } catch (e: any) { setError(e.message) }
    finally { setActionLoading(false) }
  }

  // ── PROJECTS ──
  const fetchProjects = async () => {
    setLoadingProjects(true); setError('')
    try { setProjects(await projectService.getAll()) }
    catch (e: any) { setError(e.message) }
    finally { setLoadingProjects(false) }
  }

  useEffect(() => { if (section === 'projects' || section === 'dashboard') fetchProjects() }, [section])

  const handleDeleteProject = async () => {
    if (!selectedProject) return
    setActionLoading(true)
    try {
      await projectService.delete(selectedProject.id)
      setProjects(p => p.filter(x => x.id !== selectedProject.id))
      setShowDeleteProjectModal(false); showSuccess('Projet supprimé avec succès')
    } catch (e: any) { setError(e.message) }
    finally { setActionLoading(false) }
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
    } catch (e: any) { setError(e.message) }
    finally { setActionLoading(false) }
  }

  const handleAddProject = async () => {
    const errs: Record<string, string> = {}
    if (!newProject.name.trim()) errs.name = 'Nom requis'
    setProjectErrors(errs)
    if (Object.keys(errs).length > 0) return
    setActionLoading(true)
    try {
      await projectService.create(newProject)
      await fetchProjects(); setShowAddProjectModal(false)
      setNewProject({ name: '', description: '', status: 'Planning' })
      showSuccess('Projet ajouté avec succès')
    } catch (e: any) { setError(e.message) }
    finally { setActionLoading(false) }
  }

  // ── LOCATIONS ──
  const fetchLocationTree = async (projectId: number) => {
    setLoadingLocations(true); setError('')
    try { setLocationTree(await locationService.getTree(projectId)) }
    catch (e: any) { setError(e.message) }
    finally { setLoadingLocations(false) }
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
      await locationService.create({
        name: newLocation.name,
        type: newLocation.type,
        projectId: locationProjectId!,
        parentId: newLocation.parentId,
      })
      await fetchLocationTree(locationProjectId!)
      setShowAddLocationModal(false)
      setNewLocation({ name: '', type: 'Bloc', projectId: locationProjectId!, parentId: null })
      setParentLocation(null)
      showSuccess('Localisation ajoutée avec succès')
    } catch (e: any) { setError(e.message) }
    finally { setActionLoading(false) }
  }

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return
    setActionLoading(true)
    try {
      await locationService.delete(selectedLocation.id)
      if (locationProjectId) await fetchLocationTree(locationProjectId)
      setShowDeleteLocationModal(false)
      showSuccess('Localisation supprimée avec succès')
    } catch (e: any) { setError(e.message) }
    finally { setActionLoading(false) }
  }

  const openAddChildModal = (parent: Location) => {
    setParentLocation(parent)
    setNewLocation({ name: '', type: 'Appartement', projectId: locationProjectId!, parentId: parent.id })
    setLocationErrors({})
    setShowAddLocationModal(true)
  }

  const openAddRootModal = () => {
    setParentLocation(null)
    setNewLocation({ name: '', type: 'Bloc', projectId: locationProjectId!, parentId: null })
    setLocationErrors({})
    setShowAddLocationModal(true)
  }

  // ── HELPERS ──
  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }
  const markAllRead = () => setNotifications(n => n.map(x => ({ ...x, unread: false })))
  const handleLogout = () => { removeToken(); navigate('/login') }

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || getRoleName(u.role).toLowerCase().includes(q)
  })

  const filteredProjects = projects.filter(p => {
    const q = projectSearch.toLowerCase()
    const formattedDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : ''
    return p.name?.toLowerCase().includes(q) || formattedDate.includes(q) || p.status?.toLowerCase().includes(q)
  })

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', padding: '11px 14px', fontSize: 14,
    border: hasError ? '1px solid #ef4444' : '1px solid #e2e8f0',
    borderRadius: 8, outline: 'none', color: '#0f172a',
    background: hasError ? '#fff8f8' : '#f8fafc', boxSizing: 'border-box',
  })

  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='7' height='7'/><rect x='14' y='3' width='7' height='7'/><rect x='14' y='14' width='7' height='7'/><rect x='3' y='14' width='7' height='7'/></svg> },
    { id: 'users', label: 'Utilisateurs', icon: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/></svg> },
    { id: 'projects', label: 'Projets', icon: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'/></svg> },
  ]

  const ThreeDotMenu = ({ id, onEdit, onDelete, refs }: { id: number; onEdit: () => void; onDelete: () => void; refs: React.MutableRefObject<Record<number, HTMLDivElement | null>> }) => {
    const isOpen = openMenuId === id || openProjectMenuId === id
    const toggle = () => {
      if (refs === menuRefs) setOpenMenuId(openMenuId === id ? null : id)
      else setOpenProjectMenuId(openProjectMenuId === id ? null : id)
    }
    return (
      <div ref={el => { refs.current[id] = el }} style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <button onClick={toggle}
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: isOpen ? '#f1f5f9' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}
          onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' } }}
        >
          <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'><circle cx='12' cy='5' r='1.5'/><circle cx='12' cy='12' r='1.5'/><circle cx='12' cy='19' r='1.5'/></svg>
        </button>
        {isOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: 160, background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 30 }}>
            <button onClick={onEdit}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: '#0f172a', fontWeight: 500, textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#64748b' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/></svg>
              Modifier
            </button>
            <div style={{ height: 1, background: '#f1f5f9', margin: '0 10px' }} />
            <button onClick={onDelete}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444', fontWeight: 500, textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/></svg>
              Supprimer
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 240, background: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 20 }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width='18' height='18' viewBox='0 0 20 20' fill='none'><rect x='2' y='2' width='7' height='9' rx='1' stroke='white' strokeWidth='1.5'/><rect x='11' y='2' width='7' height='5' rx='1' stroke='white' strokeWidth='1.5'/><rect x='2' y='13' width='16' height='5' rx='1' stroke='white' strokeWidth='1.5'/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', letterSpacing: '-0.3px' }}>Axia Plan</div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Admin</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {navItems.map(item => {
            const active = section === item.id
            return (
              <button key={item.id} onClick={() => { setSection(item.id as Section); setLocationProjectId(null); setLocationTree([]) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: active ? '#eff6ff' : 'transparent', color: active ? '#1d4ed8' : '#64748b', fontWeight: active ? 700 : 500, fontSize: 14, marginBottom: 4, transition: 'all 0.15s', textAlign: 'left' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >{item.icon}{item.label}</button>
            )
          })}
        </nav>
        <div style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#000000', fontWeight: 600, fontSize: 14, transition: 'background 0.15s', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/></svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* ── TOPBAR ── */}
        <header style={{ position: 'fixed', top: 0, left: 240, right: 0, zIndex: 15, height: 64, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0', padding: '0 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Axia Plan</span>
            <span style={{ color: '#cbd5e1', fontSize: 12 }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              {section === 'dashboard' ? 'Tableau de bord' : section === 'users' ? 'Utilisateurs' : locationProjectId ? projects.find(p => p.id === locationProjectId)?.name || 'Projets' : 'Projets'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Notifications */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={() => { setShowNotif(!showNotif); setShowProfile(false) }}
                style={{ position: 'relative', width: 38, height: 38, borderRadius: 9, border: '1px solid transparent', background: showNotif ? '#f1f5f9' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!showNotif) e.currentTarget.style.background = '#f1f5f9' }}
                onMouseLeave={e => { if (!showNotif) e.currentTarget.style.background = 'transparent' }}
              >
                <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#64748b' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'/><path d='M13.73 21a2 2 0 0 1-3.46 0'/></svg>
                {unreadCount > 0 && <span style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '2px solid white' }} />}
              </button>
              {showNotif && (
                <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 320, background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 100 }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Notifications</span>
                      {unreadCount > 0 && <span style={{ background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 100 }}>{unreadCount}</span>}
                    </div>
                    {unreadCount > 0 && <button onClick={markAllRead} style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Tout marquer lu</button>}
                  </div>
                  {notifications.map((n, i) => (
                    <div key={n.id} style={{ padding: '13px 18px', borderBottom: i < notifications.length - 1 ? '1px solid #f8fafc' : 'none', background: n.unread ? '#fafbff' : 'white', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.unread ? '#1d4ed8' : '#e2e8f0', flexShrink: 0, marginTop: 5 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: '#0f172a', fontWeight: n.unread ? 600 : 400, lineHeight: 1.5 }}>{n.text}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 1, height: 22, background: '#e2e8f0', margin: '0 4px' }} />
            {/* Profile */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button onClick={() => { setShowProfile(!showProfile); setShowNotif(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 10px 5px 5px', borderRadius: 10, border: '1px solid transparent', cursor: 'pointer', background: showProfile ? '#f1f5f9' : 'transparent', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!showProfile) e.currentTarget.style.background = '#f1f5f9' }}
                onMouseLeave={e => { if (!showProfile) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 16, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{displayName[0]?.toUpperCase()}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{currentRole}</div>
                </div>
                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' style={{ marginLeft: 2 }}><polyline points='6 9 12 15 18 9'/></svg>
              </button>
              {showProfile && (
                <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 220, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 100 }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14 }}>{displayName[0]?.toUpperCase()}</div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{displayName}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentEmail}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #f1f5f9' }}>
                    <button onClick={handleLogout}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748b', fontWeight: 600, textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/></svg>
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, padding: '32px 36px', paddingTop: 96 }}>

          {successMsg && (
            <div style={{ position: 'fixed', top: 76, right: 24, zIndex: 100, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#16a34a' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M20 6L9 17l-5-5'/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{successMsg}</span>
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {section === 'dashboard' && (
            <div>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 6 }}>Tableau de bord</h1>
                <p style={{ color: '#64748b', fontSize: 14 }}>Vue globale de la plateforme Axia Plan.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
                {[
                  { label: 'Utilisateurs', value: users.length, action: () => setSection('users') },
                  { label: 'Projets', value: projects.length, action: () => setSection('projects') },
                  { label: 'Plans', value: '—', action: () => {} },
                ].map((s, i) => (
                  <div key={i} onClick={s.action}
                    style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'}
                  >
                    <div style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#1d4ed8', letterSpacing: '-1px' }}>{s.value || '—'}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Actions rapides</h2>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => setSection('users')} style={{ padding: '10px 16px', background: '#1d4ed8', color: 'white', fontWeight: 600, fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer' }}>Gérer les utilisateurs</button>
                    <button onClick={() => setSection('projects')} style={{ padding: '10px 16px', background: '#1d4ed8', color: 'white', fontWeight: 600, fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer' }}>Gérer les projets</button>
                  </div>
                </div>
                <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Derniers projets</h2>
                  {projects.slice(0, 3).map(p => {
                    const st = getStatusLabel(p.status)
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{p.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 100 }}>{st.label}</span>
                      </div>
                    )
                  })}
                  {projects.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Aucun projet</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {section === 'users' && (
            <div>
              <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 6 }}>Utilisateurs</h1>
                  <p style={{ color: '#64748b', fontSize: 14 }}>Gérez les comptes et les rôles de votre équipe.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>
                    <input type='text' placeholder='Rechercher...' value={search} onChange={e => setSearch(e.target.value)}
                      style={{ paddingLeft: 34, paddingRight: search ? 32 : 14, paddingTop: 10, paddingBottom: 10, fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', color: '#0f172a', background: '#ffffff', width: 220, boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                    {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 2 }}><svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg></button>}
                  </div>
                  <button onClick={() => setShowAddModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#1d4ed8', color: 'white', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(29,78,216,0.25)', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1e40af'} onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}
                  >
                    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
                    Ajouter
                  </button>
                </div>
              </div>
              {error && <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#b91c1c', fontSize: 13 }}>⚠ {error}</div>}
              <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'visible', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 48px', padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Nom', 'Email', 'Rôle', ''].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>)}
                </div>
                {loadingUsers ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Chargement...</div>
                ) : filteredUsers.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center' }}>
                    <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>{search ? `Aucun résultat pour « ${search} »` : 'Aucun utilisateur trouvé'}</p>
                  </div>
                ) : filteredUsers.map((u, i) => (
                  <div key={u.id}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 48px', padding: '15px 24px', borderBottom: i < filteredUsers.length - 1 ? '1px solid #f1f5f9' : 'none', alignItems: 'center', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#fafafa'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                  >
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{u.name}</span>
                    <span style={{ color: '#64748b', fontSize: 13 }}>{u.email}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{getRoleName(u.role) || '—'}</span>
                    <ThreeDotMenu id={u.id} refs={menuRefs}
                      onEdit={() => { setSelectedUser(u); setEditName(u.name); setEditEmail(u.email); setEditRole(getRoleName(u.role)); setShowEditModal(true); setOpenMenuId(null) }}
                      onDelete={() => { setSelectedUser(u); setShowDeleteModal(true); setOpenMenuId(null) }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PROJECTS (liste ou détail localisations) ── */}
          {section === 'projects' && (
            <div>
              {/* ── VUE LISTE PROJETS ── */}
              {!locationProjectId ? (
                <>
                  <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                      <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 6 }}>Projets</h1>
                      <p style={{ color: '#64748b', fontSize: 14 }}>Cliquez sur un projet pour gérer ses localisations.</p>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>
                      <input type='text' placeholder='Rechercher...' value={projectSearch} onChange={e => setProjectSearch(e.target.value)}
                        style={{ paddingLeft: 34, paddingRight: projectSearch ? 32 : 14, paddingTop: 10, paddingBottom: 10, fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', color: '#0f172a', background: '#ffffff', width: 220, boxSizing: 'border-box' }}
                        onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                      {projectSearch && <button onClick={() => setProjectSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 2 }}><svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg></button>}
                    </div>
                  </div>
                  {error && <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#b91c1c', fontSize: 13 }}>⚠ {error}</div>}
                  <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'visible', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 48px', padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['Nom', 'Description', 'Statut', 'Créé le', ''].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>)}
                    </div>
                    {loadingProjects ? (
                      <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Chargement...</div>
                    ) : filteredProjects.length === 0 ? (
                      <div style={{ padding: '48px', textAlign: 'center' }}>
                        <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>{projectSearch ? `Aucun résultat pour « ${projectSearch} »` : 'Aucun projet trouvé'}</p>
                      </div>
                    ) : filteredProjects.map((p, i) => {
                      const st = getStatusLabel(p.status)
                      return (
                        <div key={p.id}
                          style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 48px', padding: '15px 24px', borderBottom: i < filteredProjects.length - 1 ? '1px solid #f1f5f9' : 'none', alignItems: 'center', transition: 'background 0.12s', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#eff6ff'}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                          onClick={() => {
                            setLocationProjectId(p.id)
                            setLocationTree([])
                            fetchLocationTree(p.id)
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#64748b', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>{p.name}</span>
                          <span style={{ color: '#64748b', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{p.description || '—'}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: st.color, padding: '3px 10px', borderRadius: 100, display: 'inline-block' }}>{st.label}</span>
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}</span>
                          <div onClick={e => e.stopPropagation()}>
                            <ThreeDotMenu id={p.id} refs={projectMenuRefs}
                              onEdit={() => { setSelectedProject(p); setEditProject({ name: p.name, description: p.description || '', status: p.status }); setShowEditProjectModal(true); setOpenProjectMenuId(null) }}
                              onDelete={() => { setSelectedProject(p); setShowDeleteProjectModal(true); setOpenProjectMenuId(null) }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                /* ── VUE LOCALISATIONS DU PROJET ── */
                <>
                  <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      {/* Breadcrumb retour */}
                      <button
                        onClick={() => { setLocationProjectId(null); setLocationTree([]) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 600, padding: '0 0 10px', marginBottom: 4 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#1d4ed8'}
                        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                      >
                        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                        Retour aux projets
                      </button>
                      <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 6 }}>
                        {projects.find(p => p.id === locationProjectId)?.name}
                      </h1>
                      <p style={{ color: '#64748b', fontSize: 14 }}>Localisations du projet — arborescence complète.</p>
                    </div>
                    <button onClick={openAddRootModal}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#1d4ed8', color: 'white', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(29,78,216,0.25)', whiteSpace: 'nowrap', marginTop: 30 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#1e40af'} onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}
                    >
                      <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
                      Ajouter une localisation
                    </button>
                  </div>

                  {error && <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#b91c1c', fontSize: 13 }}>⚠ {error}</div>}

                  <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Arborescence</h2>
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                        {locationTree.length} localisation{locationTree.length !== 1 ? 's' : ''} racine{locationTree.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {loadingLocations ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Chargement...</div>
                    ) : locationTree.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center' }}>
                        <svg width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='#cbd5e1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' style={{ margin: '0 auto 12px', display: 'block' }}><path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/><circle cx='12' cy='10' r='3'/></svg>
                        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 12px' }}>Aucune localisation pour ce projet</p>
                        <button onClick={openAddRootModal} style={{ padding: '9px 18px', background: '#1d4ed8', color: 'white', fontWeight: 600, fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                          Créer la première localisation
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {locationTree.map(loc => (
                          <LocationTreeNode
                            key={loc.id}
                            loc={loc}
                            depth={0}
                            onDelete={loc => { setSelectedLocation(loc); setShowDeleteLocationModal(true) }}
                            onAddChild={openAddChildModal}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ══ USER MODALS (unchanged) ══ */}
      {showDeleteModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 400, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/></svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>Supprimer l'utilisateur</h2>
            <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>Supprimer <strong>{selectedUser.name}</strong> ? Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleDelete} disabled={actionLoading} style={{ flex: 1, padding: '11px', background: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>{actionLoading ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 420, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Modifier l'utilisateur</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {[{ label: 'Nom', val: editName, set: setEditName, type: 'text' }, { label: 'Email', val: editEmail, set: setEditEmail, type: 'email' }].map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{f.label}</label>
                  <input value={f.val} onChange={e => f.set(e.target.value)} type={f.type} style={inputStyle()} onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Rôle</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)} style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#f8fafc' }}>
                  <option value='Admin'>Admin</option><option value='Chef'>Chef</option><option value='Ingenieur'>Ingénieur</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleEdit} disabled={actionLoading} style={{ flex: 1, padding: '11px', background: '#1d4ed8', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>{actionLoading ? 'Enregistrement...' : 'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) { setShowAddModal(false); setAddErrors({}) } }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 420, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Ajouter un utilisateur</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {([{ label: 'Nom complet', key: 'name', type: 'text', placeholder: 'Ahmed Benali' }, { label: 'Email', key: 'email', type: 'email', placeholder: 'a.benali@entreprise.com' }, { label: 'Mot de passe', key: 'password', type: 'password', placeholder: '••••••••' }] as const).map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={newUser[f.key]} onChange={e => { setNewUser(p => ({ ...p, [f.key]: e.target.value })); setAddErrors(p => ({ ...p, [f.key]: '' })) }} style={inputStyle(!!addErrors[f.key])} onFocus={e => { if (!addErrors[f.key]) e.target.style.borderColor = '#1d4ed8' }} onBlur={e => { if (!addErrors[f.key]) e.target.style.borderColor = '#e2e8f0' }} />
                  {addErrors[f.key] && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>⚠ {addErrors[f.key]}</p>}
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Rôle</label>
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))} style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#f8fafc' }}>
                  <option value='Admin'>Admin</option><option value='Chef'>Chef</option><option value='Ingenieur'>Ingénieur</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAddModal(false); setAddErrors({}); setNewUser({ name: '', email: '', password: '', role: 'Ingenieur' }) }} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleAdd} disabled={actionLoading} style={{ flex: 1, padding: '11px', background: '#1d4ed8', border: 'none', borderRadius: 8, cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>{actionLoading ? 'Ajout...' : 'Ajouter'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PROJECT MODALS (unchanged) ══ */}
      {showDeleteProjectModal && selectedProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowDeleteProjectModal(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 400, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/></svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>Supprimer le projet</h2>
            <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>Supprimer <strong>{selectedProject.name}</strong> ? Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteProjectModal(false)} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleDeleteProject} disabled={actionLoading} style={{ flex: 1, padding: '11px', background: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>{actionLoading ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {showEditProjectModal && selectedProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowEditProjectModal(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 420, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Modifier le projet</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nom du projet</label>
                <input value={editProject.name} onChange={e => setEditProject(p => ({ ...p, name: e.target.value }))} style={inputStyle(!!projectErrors.name)} onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                {projectErrors.name && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>⚠ {projectErrors.name}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Description</label>
                <textarea value={editProject.description} onChange={e => setEditProject(p => ({ ...p, description: e.target.value }))} rows={3} style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#f8fafc', resize: 'vertical', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Statut</label>
                <select value={editProject.status} onChange={e => setEditProject(p => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#f8fafc' }}>
                  <option value='Planning'>Planifié</option><option value='Active'>Actif</option><option value='OnHold'>En pause</option><option value='Completed'>Terminé</option><option value='Cancelled'>Annulé</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowEditProjectModal(false)} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleEditProject} disabled={actionLoading} style={{ flex: 1, padding: '11px', background: '#1d4ed8', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>{actionLoading ? 'Enregistrement...' : 'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}

      {showAddProjectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) { setShowAddProjectModal(false); setProjectErrors({}) } }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 420, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Nouveau projet</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nom du projet</label>
                <input placeholder='Ex: Refonte site web' value={newProject.name} onChange={e => { setNewProject(p => ({ ...p, name: e.target.value })); setProjectErrors(p => ({ ...p, name: '' })) }} style={inputStyle(!!projectErrors.name)} onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                {projectErrors.name && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>⚠ {projectErrors.name}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Description</label>
                <textarea placeholder='Description du projet...' value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} rows={3} style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#f8fafc', resize: 'vertical', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Statut</label>
                <select value={newProject.status} onChange={e => setNewProject(p => ({ ...p, status: e.target.value }))} style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#f8fafc' }}>
                  <option value='Planning'>Planifié</option><option value='Active'>Actif</option><option value='OnHold'>En pause</option><option value='Completed'>Terminé</option><option value='Cancelled'>Annulé</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAddProjectModal(false); setProjectErrors({}); setNewProject({ name: '', description: '', status: 'Planning' }) }} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleAddProject} disabled={actionLoading} style={{ flex: 1, padding: '11px', background: '#1d4ed8', border: 'none', borderRadius: 8, cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>{actionLoading ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ LOCATION MODALS ══ */}
      {showDeleteLocationModal && selectedLocation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowDeleteLocationModal(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 400, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/></svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>Supprimer la localisation</h2>
            <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 8, lineHeight: 1.6 }}>
              Supprimer <strong>{selectedLocation.name}</strong> ?
            </p>
            <p style={{ color: '#d97706', fontSize: 12, textAlign: 'center', marginBottom: 24, background: '#fffbeb', padding: '8px 12px', borderRadius: 8, border: '1px solid #fde68a' }}>
              ⚠ Impossible de supprimer une localisation ayant des enfants.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteLocationModal(false)} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleDeleteLocation} disabled={actionLoading} style={{ flex: 1, padding: '11px', background: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>{actionLoading ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {showAddLocationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) { setShowAddLocationModal(false); setLocationErrors({}) } }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 420, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              {parentLocation ? `Ajouter sous « ${parentLocation.name} »` : 'Nouvelle localisation racine'}
            </h2>
            
            {!parentLocation && <div style={{ marginBottom: 20 }} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nom</label>
                <input
                  placeholder='Ex: Bâtiment A, Salle 101...'
                  value={newLocation.name}
                  onChange={e => { setNewLocation(p => ({ ...p, name: e.target.value })); setLocationErrors(p => ({ ...p, name: '' })) }}
                  style={inputStyle(!!locationErrors.name)}
                  onFocus={e => e.target.style.borderColor = '#1d4ed8'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                {locationErrors.name && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>⚠ {locationErrors.name}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Type</label>
                <select
                  value={newLocation.type}
                  onChange={e => setNewLocation(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#f8fafc' }}
                >
                  {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAddLocationModal(false); setLocationErrors({}); setParentLocation(null) }} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleAddLocation} disabled={actionLoading} style={{ flex: 1, padding: '11px', background: '#1d4ed8', border: 'none', borderRadius: 8, cursor: actionLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>{actionLoading ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
