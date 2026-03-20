import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, removeToken, decodeToken } from '../utils/tokenUtils'
import { planService } from '../services/Planservice'
import type { Plan } from '../services/Planservice'

// ── TYPES ────────────────────────────────────────────────────────────────────
interface Project {
  id: number
  name: string
  description: string
  status: string
  createdAt: string
}

interface Location {
  id: number
  name: string
  type: string
  parentId: number | null
  children?: Location[]
}

interface Member {
  id: number
  name: string
  email: string
  role: string | { name: string }
  roleInProject?: string
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:5279/api'
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` })

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
const STATUS_OPTIONS = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled']

type Section = 'dashboard' | 'projects' | 'plans'

// ── LOCATION TREE NODE ───────────────────────────────────────────────────────
function LocationTreeNode({
  loc, depth = 0, onAddChild, onDelete, onViewPlans, locationsWithPlans,
}: {
  loc: Location; depth?: number
  onAddChild: (parent: Location) => void
  onDelete: (loc: Location) => void
  onViewPlans: (loc: Location) => void
  locationsWithPlans: Set<number>
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = (loc.children?.length ?? 0) > 0
  const hasPlans = locationsWithPlans.has(loc.id)

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 14px', borderRadius: 8,
          background: depth === 0 ? '#fafafa' : 'transparent',
          border: depth === 0 ? '1px solid #e2e8f0' : 'none',
          marginBottom: 4, cursor: hasChildren ? 'pointer' : 'default',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = depth === 0 ? '#f0f6ff' : '#f8fafc' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = depth === 0 ? '#fafafa' : 'transparent' }}
      >
        {hasChildren
          ? <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'
              style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
              <polyline points='9 18 15 12 9 6'/>
            </svg>
          : <div style={{ width: 12, flexShrink: 0 }} />
        }
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#64748b' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={{ flexShrink: 0 }}>
          <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/><circle cx='12' cy='10' r='3'/>
        </svg>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', flex: 1 }}>{loc.name}</span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {hasPlans && (
            <button onClick={() => onViewPlans(loc)}
              style={{ height: 26, padding: '0 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#1d4ed8', fontSize: 11, fontWeight: 700 }}
              onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
              onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}>
              <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
              Plans
            </button>
          )}
          <button onClick={() => onAddChild(loc)} title='Ajouter'
            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b' }}>
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
          </button>
          <button onClick={() => onDelete(loc)} title='Supprimer'
            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b' }}>
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M9 6V4h6v2'/></svg>
          </button>
        </div>
      </div>
      {hasChildren && expanded && (
        <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: 22, paddingLeft: 4 }}>
          {loc.children!.map(child => (
            <LocationTreeNode key={child.id} loc={child} depth={depth + 1}
              onAddChild={onAddChild} onDelete={onDelete} onViewPlans={onViewPlans}
              locationsWithPlans={locationsWithPlans} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ChefDashboard() {
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('dashboard')

  // Auth
  const token = getToken()
  const currentUser = token ? (() => { try { return decodeToken(token) } catch { return null } })() : null
  const currentEmail = currentUser?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || ''
  const currentUserId = currentUser?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || ''
  const displayName = currentEmail.split('@')[0] || 'Chef'

  // Projects
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false)
  const [showEditStatusModal, setShowEditStatusModal] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '', status: 'Planning' })
  const [editStatus, setEditStatus] = useState('')
  const [projectErrors, setProjectErrors] = useState<Record<string, string>>({})
  const [projectSearch, setProjectSearch] = useState('')

  // Locations
  const [locationTree, setLocationTree] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [showDeleteLocationModal, setShowDeleteLocationModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [parentLocation, setParentLocation] = useState<Location | null>(null)
  const [newLocation, setNewLocation] = useState({ name: '', type: 'Bloc' })
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({})
  const [locationsWithPlans, setLocationsWithPlans] = useState<Set<number>>(new Set())

  // Members
  const [members, setMembers] = useState<Member[]>([])
  const [allUsers, setAllUsers] = useState<Member[]>([])
  const [showMembersPanel, setShowMembersPanel] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showDeleteMemberModal, setShowDeleteMemberModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [memberToAdd, setMemberToAdd] = useState<number | null>(null)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberEmailError, setMemberEmailError] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Plans
  const [selectedLocationForPlans, setSelectedLocationForPlans] = useState<Location | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadLocation, setUploadLocation] = useState<Location | null>(null)
  const [uploadForm, setUploadForm] = useState({ name: '', status: 'Active', category: '', locationId: 0 })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const [uploadLoading, setUploadLoading] = useState(false)

  // UI
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }
  const handleLogout = () => { removeToken(); navigate('/login') }

  // ── PROJECTS ──
  const fetchProjects = async () => {
    setLoadingProjects(true); setError('')
    try {
      const res = await fetch(`${BASE_URL}/project/my-projects`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur chargement projets')
      setProjects(await res.json())
    } catch (e: any) { setError(e.message) } finally { setLoadingProjects(false) }
  }

  useEffect(() => { if (section === 'dashboard' || section === 'projects') fetchProjects() }, [section])

  const handleCreateProject = async () => {
    const errs: Record<string, string> = {}
    if (!newProject.name.trim()) errs.name = 'Nom requis'
    setProjectErrors(errs); if (Object.keys(errs).length > 0) return
    setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/project`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      })
      if (!res.ok) throw new Error('Erreur création projet')
      await fetchProjects()
      setShowAddProjectModal(false)
      setNewProject({ name: '', description: '', status: 'Planning' })
      showSuccess('Projet créé avec succès')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const handleDeleteProject = async () => {
    if (!selectedProject) return; setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/project/${selectedProject.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur suppression projet')
      setProjects(p => p.filter(x => x.id !== selectedProject.id))
      setShowDeleteProjectModal(false)
      if (selectedProject?.id === selectedProject?.id) setSelectedProject(null)
      showSuccess('Projet supprimé')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const handleUpdateStatus = async () => {
    if (!selectedProject) return; setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/project/${selectedProject.id}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selectedProject, status: editStatus }),
      })
      if (!res.ok) throw new Error('Erreur mise à jour statut')
      await fetchProjects()
      setSelectedProject(p => p ? { ...p, status: editStatus } : p)
      setShowEditStatusModal(false)
      showSuccess('Statut mis à jour')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  // ── LOCATIONS ──
  const fetchLocationTree = async (projectId: number) => {
    setLoadingLocations(true); setError('')
    try {
      const [treeRes, plansRes] = await Promise.all([
        fetch(`${BASE_URL}/location/project/${projectId}/tree`, { headers: authHeaders() }),
        planService.getLocationsWithPlans(),
      ])
      if (!treeRes.ok) throw new Error('Erreur chargement localisations')
      setLocationTree(await treeRes.json())
      setLocationsWithPlans(new Set(plansRes.filter(r => r.hasPlans).map(r => r.locationId)))
    } catch (e: any) { setError(e.message) } finally { setLoadingLocations(false) }
  }

  const handleAddLocation = async () => {
    const errs: Record<string, string> = {}
    if (!newLocation.name.trim()) errs.name = 'Nom requis'
    setLocationErrors(errs); if (Object.keys(errs).length > 0) return
    setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/location`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLocation.name, type: newLocation.type, projectId: selectedProject!.id, parentId: parentLocation?.id ?? null }),
      })
      if (!res.ok) throw new Error('Erreur création localisation')
      await fetchLocationTree(selectedProject!.id)
      setShowAddLocationModal(false)
      setNewLocation({ name: '', type: 'Bloc' }); setParentLocation(null)
      showSuccess('Localisation ajoutée')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return; setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/location/${selectedLocation.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur suppression localisation')
      await fetchLocationTree(selectedProject!.id)
      setShowDeleteLocationModal(false)
      showSuccess('Localisation supprimée')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  // ── MEMBERS ──
  const fetchMembers = async (projectId: number) => {
    setLoadingMembers(true)
    try {
      const [membersRes, usersRes] = await Promise.all([
        fetch(`${BASE_URL}/project/${projectId}/members`, { headers: authHeaders() }),
        fetch(`${BASE_URL}/user`, { headers: authHeaders() }),
      ])
      if (!membersRes.ok) throw new Error('Erreur chargement membres')
      setMembers(await membersRes.json())
      if (usersRes.ok) setAllUsers(await usersRes.json())
    } catch (e: any) { setError(e.message) } finally { setLoadingMembers(false) }
  }

  const handleAddMember = async () => {
    if (!memberToAdd || !selectedProject) return; setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/project/${selectedProject.id}/members/${memberToAdd}`, {
        method: 'POST', headers: authHeaders(),
      })
      if (!res.ok) throw new Error('Erreur ajout membre')
      await fetchMembers(selectedProject.id)
      setShowAddMemberModal(false); setMemberToAdd(null)
      showSuccess('Membre ajouté')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const handleAddMemberByEmail = async () => {
    if (!memberEmail.trim() || !selectedProject) return
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(memberEmail)) {
      setMemberEmailError('Adresse email invalide')
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/project/${selectedProject.id}/members/${encodeURIComponent(memberEmail)}`, {
        method: 'POST', headers: authHeaders(),
      })
      if (!res.ok) {
        const msg = await res.text()
        if (res.status === 404) setMemberEmailError('Aucun utilisateur trouvé avec cet email')
        else if (msg.includes('already')) setMemberEmailError('Cet utilisateur est déjà membre du projet')
        else setMemberEmailError("Erreur lors de l'ajout")
        return
      }
      await fetchMembers(selectedProject.id)
      setShowAddMemberModal(false); setMemberEmail(''); setMemberEmailError('')
      showSuccess('Membre ajouté au projet')
    } catch (e: any) { setMemberEmailError('Erreur réseau') } finally { setActionLoading(false) }
  }

  const handleRemoveMember = async () => {
    if (!selectedMember || !selectedProject) return; setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/project/${selectedProject.id}/members/${selectedMember.id}`, {
        method: 'DELETE', headers: authHeaders(),
      })
      if (!res.ok) throw new Error('Erreur suppression membre')
      setMembers(m => m.filter(x => x.id !== selectedMember.id))
      setShowDeleteMemberModal(false)
      showSuccess('Membre retiré')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  // ── PLANS ──
  const handleViewPlans = async (loc: Location) => {
    setSelectedLocationForPlans(loc); setPlans([]); setLoadingPlans(true); setSection('plans'); setSelectedFolder(null)
    try { setPlans(await planService.getByLocation(loc.id)) }
    catch (e: any) { setError(e.message) } finally { setLoadingPlans(false) }
  }

  const handleUploadPlan = async () => {
    const errs: Record<string, string> = {}
    if (!uploadForm.name.trim()) errs.name = 'Nom requis'
    if (!uploadFile) errs.file = 'Fichier requis'
    if (!uploadForm.locationId) errs.location = 'Localisation requise'
    setUploadErrors(errs); if (Object.keys(errs).length > 0) return
    setUploadLoading(true)
    try {
      const fd = new FormData()
      fd.append('Name', uploadForm.name)
      fd.append('Status', uploadForm.status)
      fd.append('Category', uploadForm.category)
      fd.append('LocationId', String(uploadForm.locationId))
      fd.append('File', uploadFile!)
      const res = await fetch(`${BASE_URL}/plan`, { method: 'POST', headers: authHeaders(), body: fd })
      if (!res.ok) throw new Error('Erreur upload plan')
      // Refresh plans if we're on the same location
      if (selectedLocationForPlans?.id === uploadForm.locationId) {
        setPlans(await planService.getByLocation(uploadForm.locationId))
      }
      // Refresh locationsWithPlans
      const locWithPlans = await planService.getLocationsWithPlans()
      setLocationsWithPlans(new Set(locWithPlans.filter(r => r.hasPlans).map(r => r.locationId)))
      setShowUploadModal(false)
      setUploadForm({ name: '', status: 'Active', category: '', locationId: 0 })
      setUploadFile(null); setUploadErrors({})
      showSuccess('Plan uploadé avec succès')
    } catch (e: any) { setError(e.message) } finally { setUploadLoading(false) }
  }

  // Flatten location tree for select
  const flattenLocations = (locs: Location[], depth = 0): { loc: Location; depth: number }[] =>
    locs.flatMap(l => [{ loc: l, depth }, ...flattenLocations(l.children ?? [], depth + 1)])

  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(projectSearch.toLowerCase())
  )

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', padding: '11px 14px', fontSize: 14,
    border: hasError ? '1px solid #ef4444' : '1px solid #e2e8f0',
    borderRadius: 8, outline: 'none', color: '#0f172a',
    background: hasError ? '#fff8f8' : '#f8fafc', boxSizing: 'border-box',
  })

  const navItems: { id: Section; label: string; icon: React.ReactElement }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='7' height='7'/><rect x='14' y='3' width='7' height='7'/><rect x='14' y='14' width='7' height='7'/><rect x='3' y='14' width='7' height='7'/></svg> },
    { id: 'projects', label: 'Mes Projets', icon: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'/></svg> },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 240, background: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 20 }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width='18' height='18' viewBox='0 0 20 20' fill='none'><rect x='2' y='2' width='7' height='9' rx='1' stroke='white' strokeWidth='1.5'/><rect x='11' y='2' width='7' height='5' rx='1' stroke='white' strokeWidth='1.5'/><rect x='2' y='13' width='16' height='5' rx='1' stroke='white' strokeWidth='1.5'/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', letterSpacing: '-0.3px' }}>Axia Plan</div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Chef de projet</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {navItems.map(item => {
            const active = section === item.id || (section === 'plans' && item.id === 'projects')
            return (
              <button key={item.id}
                onClick={() => { setSection(item.id); setSelectedProject(null); setLocationTree([]); setSelectedLocationForPlans(null); setPlans([]) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: active ? '#f5f3ff' : 'transparent', color: active ? '#7c3aed' : '#64748b', fontWeight: active ? 700 : 500, fontSize: 14, marginBottom: 4, transition: 'all 0.15s', textAlign: 'left' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >{item.icon}{item.label}</button>
            )
          })}
        </nav>
        <div style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9' }}>
          <button onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#0f172a', fontWeight: 600, fontSize: 14, textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/></svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* TOPBAR */}
        <header style={{ position: 'fixed', top: 0, left: 240, right: 0, zIndex: 15, height: 64, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0', padding: '0 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Axia Plan</span>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              {section === 'dashboard' ? 'Tableau de bord' : selectedProject ? selectedProject.name : 'Mes Projets'}
            </span>
            {section === 'plans' && selectedLocationForPlans && (
              <><span style={{ color: '#cbd5e1' }}>/</span><span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>{selectedLocationForPlans.name}</span></>
            )}
          </div>
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowProfile(!showProfile)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 10px 5px 5px', borderRadius: 10, border: '1px solid transparent', cursor: 'pointer', background: showProfile ? '#f1f5f9' : 'transparent', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!showProfile) e.currentTarget.style.background = '#f1f5f9' }}
              onMouseLeave={e => { if (!showProfile) e.currentTarget.style.background = 'transparent' }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 13 }}>{displayName[0]?.toUpperCase()}</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Chef de projet</div>
              </div>
              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='6 9 12 15 18 9'/></svg>
            </button>
            {showProfile && (
              <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 200, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 100 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{displayName}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentEmail}</p>
                </div>
                <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748b', fontWeight: 600, textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/></svg>
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ flex: 1, padding: '32px 36px', paddingTop: 96 }}>

          {successMsg && (
            <div style={{ position: 'fixed', top: 76, right: 24, zIndex: 100, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#16a34a' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M20 6L9 17l-5-5'/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{successMsg}</span>
            </div>
          )}

          {error && (
            <div style={{ background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#b91c1c', fontSize: 13 }}>⚠ {error}</div>
          )}

          {/* ── DASHBOARD ── */}
          {section === 'dashboard' && (
            <div>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 6 }}>
                  Bonjour, {displayName} 👋
                </h1>
                <p style={{ color: '#64748b', fontSize: 14 }}>Voici un aperçu de vos projets en cours.</p>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
                {[
                  { label: 'Mes projets', value: projects.length, color: '#7c3aed', bg: '#f5f3ff' },
                  { label: 'En cours', value: projects.filter(p => p.status === 'Active').length, color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Planifiés', value: projects.filter(p => p.status === 'Planning').length, color: '#d97706', bg: '#fffbeb' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke={s.color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'/></svg>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: s.color, letterSpacing: '-1px' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Recent projects */}
              <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Mes projets récents</h2>
                  <button onClick={() => setSection('projects')}
                    style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Voir tous →
                  </button>
                </div>
                {loadingProjects ? (
                  <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Chargement...</div>
                ) : projects.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 12px' }}>Aucun projet pour le moment</p>
                    <button onClick={() => setShowAddProjectModal(true)}
                      style={{ padding: '9px 18px', background: '#7c3aed', color: 'white', fontWeight: 600, fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                      Créer mon premier projet
                    </button>
                  </div>
                ) : projects.slice(0, 4).map((p, i) => {
                  const st = getStatusLabel(p.status)
                  return (
                    <div key={p.id}
                      onClick={() => { setSelectedProject(p); setSection('projects'); fetchLocationTree(p.id); fetchMembers(p.id) }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < Math.min(projects.length, 4) - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.7'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#7c3aed' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'/></svg>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{p.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 9px', borderRadius: 100 }}>{st.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── PROJECTS ── */}
          {section === 'projects' && !selectedProject && (
            <div>
              <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 6 }}>Mes Projets</h1>
                  <p style={{ color: '#64748b', fontSize: 14 }}>Gérez vos projets et leurs localisations.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>
                    <input placeholder='Rechercher...' value={projectSearch} onChange={e => setProjectSearch(e.target.value)}
                      style={{ paddingLeft: 34, paddingRight: 14, paddingTop: 10, paddingBottom: 10, fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', color: '#0f172a', background: '#fff', width: 200, boxSizing: 'border-box' as const }}
                      onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                  <button onClick={() => setShowAddProjectModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#7c3aed', color: 'white', fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.25)', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                    onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}>
                    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
                    Nouveau projet
                  </button>
                </div>
              </div>

              {loadingProjects ? (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Chargement...</div>
              ) : filteredProjects.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '60px', textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 16px' }}>Aucun projet trouvé</p>
                  <button onClick={() => setShowAddProjectModal(true)}
                    style={{ padding: '10px 20px', background: '#7c3aed', color: 'white', fontWeight: 600, fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                    Créer un projet
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {filteredProjects.map(p => {
                    const st = getStatusLabel(p.status)
                    return (
                      <div key={p.id}
                        style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                        onClick={() => { setSelectedProject(p); fetchLocationTree(p.id); fetchMembers(p.id) }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#c4b5fd' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='#7c3aed' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'/></svg>
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{p.name}</p>
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}</p>
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '3px 9px', borderRadius: 100, flexShrink: 0 }}>{st.label}</span>
                        </div>
                        {p.description && <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>}
                        <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setSelectedProject(p); setEditStatus(p.status); setShowEditStatusModal(true) }}
                            style={{ flex: 1, padding: '8px', background: '#f5f3ff', color: '#7c3aed', fontWeight: 600, fontSize: 12, borderRadius: 7, border: '1px solid #e9d5ff', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f5f3ff'}>
                            Changer statut
                          </button>
                          <button onClick={() => { setSelectedProject(p); setShowDeleteProjectModal(true) }}
                            style={{ width: 34, height: 34, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#ef4444' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#94a3b8' }}>
                            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M9 6V4h6v2'/></svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PROJECT DETAIL ── */}
          {section === 'projects' && selectedProject && (
            <div>
              <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <button onClick={() => { setSelectedProject(null); setLocationTree([]); setMembers([]) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 600, padding: '0 0 10px', marginBottom: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#7c3aed'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                    Retour aux projets
                  </button>
                  <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 6 }}>{selectedProject.name}</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: getStatusLabel(selectedProject.status).color, background: getStatusLabel(selectedProject.status).bg, padding: '3px 10px', borderRadius: 100 }}>
                      {getStatusLabel(selectedProject.status).label}
                    </span>
                    {selectedProject.description && <span style={{ fontSize: 13, color: '#64748b' }}>{selectedProject.description}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 30 }}>
                  <button onClick={() => setShowMembersPanel(!showMembersPanel)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: showMembersPanel ? '#f5f3ff' : '#fff', color: '#7c3aed', fontWeight: 600, fontSize: 13, borderRadius: 9, border: '1px solid #c4b5fd', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                    onMouseLeave={e => e.currentTarget.style.background = showMembersPanel ? '#f5f3ff' : '#fff'}>
                    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/></svg>
                    Membres ({members.length})
                  </button>
                  <button onClick={() => { setShowUploadModal(true); setUploadForm(f => ({ ...f, locationId: 0 })) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#7c3aed', color: 'white', fontWeight: 700, fontSize: 13, borderRadius: 9, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.25)' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                    onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}>
                    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' y1='3' x2='12' y2='15'/></svg>
                    Uploader un plan
                  </button>
                  <button onClick={() => { setParentLocation(null); setNewLocation({ name: '', type: 'Bloc' }); setShowAddLocationModal(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#fff', color: '#7c3aed', fontWeight: 600, fontSize: 13, borderRadius: 9, border: '1px solid #c4b5fd', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
                    Ajouter localisation
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: showMembersPanel ? '1fr 320px' : '1fr', gap: 20, alignItems: 'start' }}>

                {/* Location tree */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Arborescence</h2>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{locationTree.length} localisation{locationTree.length !== 1 ? 's' : ''} racine{locationTree.length !== 1 ? 's' : ''}</span>
                  </div>
                  {loadingLocations ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>Chargement...</div>
                  ) : locationTree.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <svg width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='#cbd5e1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' style={{ margin: '0 auto 12px', display: 'block' }}><path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'/><circle cx='12' cy='10' r='3'/></svg>
                      <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 12px' }}>Aucune localisation</p>
                      <button onClick={() => { setParentLocation(null); setNewLocation({ name: '', type: 'Bloc' }); setShowAddLocationModal(true) }}
                        style={{ padding: '9px 18px', background: '#7c3aed', color: 'white', fontWeight: 600, fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                        Créer la première localisation
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {locationTree.map(loc => (
                        <LocationTreeNode key={loc.id} loc={loc} depth={0}
                          onAddChild={parent => { setParentLocation(parent); setNewLocation({ name: '', type: 'Appartement' }); setShowAddLocationModal(true) }}
                          onDelete={loc => { setSelectedLocation(loc); setShowDeleteLocationModal(true) }}
                          onViewPlans={handleViewPlans}
                          locationsWithPlans={locationsWithPlans} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Members panel */}
                {showMembersPanel && (
                  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Membres</h2>
                      <button onClick={() => setShowAddMemberModal(true)}
                        style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #c4b5fd', background: '#f5f3ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#ede9fe'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f5f3ff'}>
                        <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
                      </button>
                    </div>
                    {loadingMembers ? (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>Chargement...</div>
                    ) : members.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '16px 0', margin: 0 }}>Aucun membre</p>
                    ) : members.map((m, i) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < members.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                            {m.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{m.name}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 11, color: '#94a3b8' }}>{m.roleInProject || getRoleName(m.role)}</p>
                          </div>
                        </div>
                        <button onClick={() => { setSelectedMember(m); setShowDeleteMemberModal(true) }}
                          style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#ef4444' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#94a3b8' }}>
                          <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M9 6V4h6v2'/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PLANS PAGE ── */}
          {section === 'plans' && selectedLocationForPlans && (() => {
            const FOLDERS = [
              { key: 'Architecture', label: 'Architecture', color: '#1d4ed8', bg: '#eff6ff', icon: <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/></svg> },
              { key: 'Électricité', label: 'Électricité', color: '#d97706', bg: '#fffbeb', icon: <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/></svg> },
              { key: 'Plomberie', label: 'Plomberie', color: '#0891b2', bg: '#ecfeff', icon: <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M12 2a5 5 0 0 1 5 5c0 5-5 13-5 13S7 12 7 7a5 5 0 0 1 5-5z'/><circle cx='12' cy='7' r='2'/></svg> },
              { key: 'Structure', label: 'Structure', color: '#7c3aed', bg: '#f5f3ff', icon: <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='18' height='18' rx='2'/><path d='M3 9h18M3 15h18M9 3v18M15 3v18'/></svg> },
              { key: 'CVC', label: 'CVC', color: '#16a34a', bg: '#f0fdf4', icon: <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24'/></svg> },
            ]

            const folderPlans = (key: string) => plans.filter(p => {
              const cat = (p.category || '').toLowerCase()
              if (key === 'Architecture') return cat.includes('archi')
              if (key === 'Électricité') return cat.includes('elec') || cat.includes('électri')
              if (key === 'Plomberie') return cat.includes('plomb')
              if (key === 'Structure') return cat.includes('struct')
              if (key === 'CVC') return cat.includes('cvc') || cat.includes('chauff') || cat.includes('ventil')
              return false
            })

            const otherPlans = plans.filter(p => {
              const cat = (p.category || '').toLowerCase()
              return !cat.includes('archi') && !cat.includes('elec') && !cat.includes('électri') &&
                     !cat.includes('plomb') && !cat.includes('struct') && !cat.includes('cvc') &&
                     !cat.includes('chauff') && !cat.includes('ventil')
            })

            const displayedPlans = selectedFolder === null ? [] :
              selectedFolder === 'Autres' ? otherPlans :
              folderPlans(selectedFolder)

            return (
            <div>
              {/* Header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <button onClick={() => { setSection('projects'); setSelectedFolder(null) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 600, padding: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#7c3aed'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                    Retour aux localisations
                  </button>
                  {selectedFolder && (
                    <>
                      <span style={{ color: '#cbd5e1' }}>/</span>
                      <button onClick={() => setSelectedFolder(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 600, padding: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#7c3aed'}
                        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                        {selectedLocationForPlans.name}
                      </button>
                      <span style={{ color: '#cbd5e1' }}>/</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>{selectedFolder}</span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
                      {selectedFolder
                        ? <>{selectedFolder} </>
                        : <>Plans </>
                      }
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>
                      {loadingPlans ? 'Chargement...' : selectedFolder
                        ? `${displayedPlans.length} plan${displayedPlans.length !== 1 ? 's' : ''}`
                        : `${plans.length} plan${plans.length !== 1 ? 's' : ''} au total`}
                    </p>
                  </div>
                  <button onClick={() => { setUploadForm(f => ({ ...f, locationId: selectedLocationForPlans.id })); setShowUploadModal(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: '#7c3aed', color: 'white', fontWeight: 700, fontSize: 13, borderRadius: 9, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.25)' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                    onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}>
                    <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' y1='3' x2='12' y2='15'/></svg>
                    Uploader un plan
                  </button>
                </div>
              </div>

              {loadingPlans ? (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Chargement...</div>
              ) : plans.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '60px', textAlign: 'center' }}>
                  <svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='#cbd5e1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' style={{ margin: '0 auto 16px', display: 'block' }}><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
                  <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 16px' }}>Aucun plan pour cette localisation</p>
                  <button onClick={() => { setUploadForm(f => ({ ...f, locationId: selectedLocationForPlans.id })); setShowUploadModal(true) }}
                    style={{ padding: '10px 20px', background: '#7c3aed', color: 'white', fontWeight: 600, fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                    Uploader le premier plan
                  </button>
                </div>
              ) : !selectedFolder ? (
                /* ── VUE DOSSIERS ── */
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                    {FOLDERS.map(folder => {
                      const count = folderPlans(folder.key).length
                      return (
                        <div key={folder.key}
                          onClick={() => setSelectedFolder(folder.key)}
                          style={{ background: '#fff', border: `1px solid #e2e8f0`, borderRadius: 14, padding: '20px', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = folder.color; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
                        >
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: folder.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: folder.color, marginBottom: 14 }}>
                            {folder.icon}
                          </div>
                          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{folder.label}</p>
                          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{count} plan{count !== 1 ? 's' : ''}</p>
                        </div>
                      )
                    })}
                    {/* Dossier Autres */}
                    {otherPlans.length > 0 && (
                      <div
                        onClick={() => setSelectedFolder('Autres')}
                        style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#64748b'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}
                      >
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginBottom: 14 }}>
                          <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'/></svg>
                        </div>
                        <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Autres</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{otherPlans.length} plan{otherPlans.length !== 1 ? 's' : ''}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── VUE PLANS DU DOSSIER ── */
                displayedPlans.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '60px', textAlign: 'center' }}>
                    <svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='#cbd5e1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' style={{ margin: '0 auto 16px', display: 'block' }}><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
                    <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>Aucun plan dans ce dossier</p>
                  </div>
                ) : (
                  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    {displayedPlans.map((plan, idx) => {
                      const st = getStatusLabel(plan.status)
                      const latestVersion = plan.planVersions?.find(v => v.versionNumber === plan.currentVersion)
                      const folder = FOLDERS.find(f => f.key === selectedFolder)
                      const isLast = idx === displayedPlans.length - 1
                      return (
                        <div key={plan.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: isLast ? 'none' : '1px solid #f1f5f9', transition: 'background 0.12s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#fafafa' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                        >
                          {/* Icon */}
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: folder?.bg || '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: folder?.color || '#7c3aed' }}>
                            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.name}</p>
                              <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>{st.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {plan.category && <span style={{ fontSize: 11, color: '#94a3b8' }}>{plan.category}</span>}
                              <span style={{ fontSize: 11, fontWeight: 600, color: folder?.color || '#7c3aed', background: folder?.bg || '#f5f3ff', padding: '1px 7px', borderRadius: 100 }}>v{plan.currentVersion}</span>
                              {latestVersion && (
                                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                  {(latestVersion.fileSize / 1024).toFixed(0)} KB · {latestVersion.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Download button */}
                          {latestVersion ? (
                            <a href={`http://localhost:5279${latestVersion.filePath}`} target='_blank' rel='noopener noreferrer'
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: folder?.color || '#7c3aed', borderRadius: 8, textDecoration: 'none', color: 'white', fontSize: 12, fontWeight: 600, flexShrink: 0, transition: 'opacity 0.15s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85'}
                              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '1'}>
                              <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/></svg>
                              Télécharger
                            </a>
                          ) : (
                            <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>Aucun fichier</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>
          )})()}
        </main>
      </div>

      {/* ══ MODALS ══ */}

      {/* Create Project */}
      {showAddProjectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAddProjectModal(false); setProjectErrors({}) } }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 420, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Nouveau projet</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nom du projet</label>
                <input placeholder='Ex: Résidence Les Pins' value={newProject.name}
                  onChange={e => { setNewProject(p => ({ ...p, name: e.target.value })); setProjectErrors(p => ({ ...p, name: '' })) }}
                  style={inputStyle(!!projectErrors.name)}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                {projectErrors.name && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>⚠ {projectErrors.name}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Description</label>
                <textarea placeholder='Description du projet...' value={newProject.description}
                  onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#f8fafc', resize: 'vertical', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Statut initial</label>
                <select value={newProject.status} onChange={e => setNewProject(p => ({ ...p, status: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#f8fafc' }}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getStatusLabel(s).label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAddProjectModal(false); setProjectErrors({}); setNewProject({ name: '', description: '', status: 'Planning' }) }}
                style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleCreateProject} disabled={actionLoading}
                style={{ flex: 1, padding: '11px', background: '#7c3aed', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>
                {actionLoading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project */}
      {showDeleteProjectModal && selectedProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteProjectModal(false) }}>
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

      {/* Edit Status */}
      {showEditStatusModal && selectedProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowEditStatusModal(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 380, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Changer le statut</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>{selectedProject.name}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {STATUS_OPTIONS.map(s => {
                const st = getStatusLabel(s)
                return (
                  <button key={s} onClick={() => setEditStatus(s)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 9, border: editStatus === s ? `2px solid ${st.color}` : '1px solid #e2e8f0', background: editStatus === s ? st.bg : '#fafafa', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: editStatus === s ? 700 : 500, color: editStatus === s ? st.color : '#64748b' }}>{st.label}</span>
                    {editStatus === s && <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke={st.color} strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' style={{ marginLeft: 'auto' }}><path d='M20 6L9 17l-5-5'/></svg>}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowEditStatusModal(false)} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleUpdateStatus} disabled={actionLoading} style={{ flex: 1, padding: '11px', background: '#7c3aed', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>{actionLoading ? 'Enregistrement...' : 'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Location */}
      {showAddLocationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAddLocationModal(false); setLocationErrors({}) } }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 420, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>
              {parentLocation ? `Ajouter sous « ${parentLocation.name} »` : 'Nouvelle localisation racine'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nom</label>
                <input placeholder='Ex: Bâtiment A, Salle 101...' value={newLocation.name}
                  onChange={e => { setNewLocation(p => ({ ...p, name: e.target.value })); setLocationErrors(p => ({ ...p, name: '' })) }}
                  style={inputStyle(!!locationErrors.name)}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                {locationErrors.name && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>⚠ {locationErrors.name}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Type</label>
                <select value={newLocation.type} onChange={e => setNewLocation(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#f8fafc' }}>
                  {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAddLocationModal(false); setLocationErrors({}); setParentLocation(null) }}
                style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleAddLocation} disabled={actionLoading}
                style={{ flex: 1, padding: '11px', background: '#7c3aed', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>
                {actionLoading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Location */}
      {showDeleteLocationModal && selectedLocation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteLocationModal(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 400, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>Supprimer la localisation</h2>
            <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 8 }}>Supprimer <strong>{selectedLocation.name}</strong> ?</p>
            <p style={{ color: '#d97706', fontSize: 12, textAlign: 'center', marginBottom: 24, background: '#fffbeb', padding: '8px 12px', borderRadius: 8, border: '1px solid #fde68a' }}>⚠ Impossible de supprimer une localisation ayant des enfants.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteLocationModal(false)} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleDeleteLocation} disabled={actionLoading} style={{ flex: 1, padding: '11px', background: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>{actionLoading ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member */}
      {showAddMemberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAddMemberModal(false); setMemberEmail(''); setMemberEmailError('') } }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 400, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Ajouter un membre</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>Entrez l'adresse email du membre à ajouter au projet.</p>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Adresse email</label>
              <div style={{ position: 'relative' }}>
                <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'/><polyline points='22,6 12,13 2,6'/>
                </svg>
                <input
                  type='email'
                  placeholder='exemple@email.com'
                  value={memberEmail}
                  onChange={e => { setMemberEmail(e.target.value); setMemberEmailError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddMemberByEmail() }}
                  style={{ width: '100%', paddingLeft: 38, paddingRight: 14, paddingTop: 11, paddingBottom: 11, fontSize: 14, border: memberEmailError ? '1px solid #ef4444' : '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: memberEmailError ? '#fff8f8' : '#f8fafc', boxSizing: 'border-box' }}
                  onFocus={e => { if (!memberEmailError) e.target.style.borderColor = '#7c3aed' }}
                  onBlur={e => { if (!memberEmailError) e.target.style.borderColor = '#e2e8f0' }}
                  autoFocus
                />
              </div>
              {memberEmailError && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444' }}>⚠ {memberEmailError}</p>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAddMemberModal(false); setMemberEmail(''); setMemberEmailError('') }}
                style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleAddMemberByEmail} disabled={!memberEmail.trim() || actionLoading}
                style={{ flex: 1, padding: '11px', background: '#7c3aed', border: 'none', borderRadius: 8, cursor: memberEmail.trim() ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 14, color: 'white', opacity: memberEmail.trim() ? 1 : 0.5 }}>
                {actionLoading ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member */}
      {showDeleteMemberModal && selectedMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteMemberModal(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 400, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>Retirer le membre</h2>
            <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>Retirer <strong>{selectedMember.name}</strong> du projet ?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteMemberModal(false)} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleRemoveMember} disabled={actionLoading} style={{ flex: 1, padding: '11px', background: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>{actionLoading ? 'Suppression...' : 'Retirer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Plan */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowUploadModal(false); setUploadErrors({}); setUploadFile(null) } }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px', maxWidth: 460, width: '90%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>Uploader un plan</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nom du plan</label>
                <input placeholder='Ex: Plan électrique RDC' value={uploadForm.name}
                  onChange={e => { setUploadForm(p => ({ ...p, name: e.target.value })); setUploadErrors(p => ({ ...p, name: '' })) }}
                  style={inputStyle(!!uploadErrors.name)}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                {uploadErrors.name && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>⚠ {uploadErrors.name}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Localisation</label>
                <select value={uploadForm.locationId || ''} onChange={e => { setUploadForm(p => ({ ...p, locationId: Number(e.target.value) })); setUploadErrors(p => ({ ...p, location: '' })) }}
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: uploadErrors.location ? '1px solid #ef4444' : '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#f8fafc' }}>
                  <option value=''>-- Choisir une localisation --</option>
                  {flattenLocations(locationTree).map(({ loc, depth }) => (
                    <option key={loc.id} value={loc.id}>{'　'.repeat(depth)}{loc.name}</option>
                  ))}
                </select>
                {uploadErrors.location && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>⚠ {uploadErrors.location}</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Catégorie</label>
                  <input placeholder='Ex: Électrique' value={uploadForm.category}
                    onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}
                    style={inputStyle()}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Statut</label>
                  <select value={uploadForm.status} onChange={e => setUploadForm(p => ({ ...p, status: e.target.value }))}
                    style={{ width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', color: '#0f172a', background: '#f8fafc' }}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getStatusLabel(s).label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Fichier</label>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px', border: uploadErrors.file ? '2px dashed #ef4444' : '2px dashed #c4b5fd', borderRadius: 10, background: uploadFile ? '#f5f3ff' : '#fafafa', cursor: 'pointer' }}>
                  <input type='file' style={{ display: 'none' }} onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadErrors(p => ({ ...p, file: '' })) }} />
                  {uploadFile ? (
                    <>
                      <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#7c3aed' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed' }}>{uploadFile.name}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{(uploadFile.size / 1024).toFixed(0)} KB</span>
                    </>
                  ) : (
                    <>
                      <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' y1='3' x2='12' y2='15'/></svg>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Cliquez pour choisir un fichier</span>
                    </>
                  )}
                </label>
                {uploadErrors.file && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444' }}>⚠ {uploadErrors.file}</p>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowUploadModal(false); setUploadErrors({}); setUploadFile(null) }}
                style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#475569' }}>Annuler</button>
              <button onClick={handleUploadPlan} disabled={uploadLoading}
                style={{ flex: 1, padding: '11px', background: '#7c3aed', border: 'none', borderRadius: 8, cursor: uploadLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, color: 'white' }}>
                {uploadLoading ? 'Upload...' : 'Uploader'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
