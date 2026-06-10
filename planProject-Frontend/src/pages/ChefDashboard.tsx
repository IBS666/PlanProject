import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, removeToken } from '../utils/tokenUtils'
import { planService } from '../services/Planservice'
import type { Plan, PlanVersion } from '../services/Planservice'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import * as fabric from 'fabric'
import { PDFDocument } from 'pdf-lib'
import DXFWriter from 'dxf-writer'
import './styles/ChefDashboard.css'
import { jwtDecode } from 'jwt-decode'
import { notificationService, type UserNotification } from '../services/NotificationService'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()


// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Project {
  id: number; name: string; description: string; status: string; createdAt: string
}
interface Location {
  id: number; name: string; type: string; parentId: number | null; children?: Location[]
}
interface Member {
  id: number; name: string; email: string
  role: string | { name: string }; roleInProject?: string
}
interface AppJwtPayload {
  sub?: string; exp?: number; iss?: string; aud?: string
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'?: string
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'?: string
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string | string[]
  Permission?: string | string[]
}
interface DiffChange {
  type: 'ANNOTATION_AJOUTEE' | 'ANNOTATION_SUPPRIMEE' | 'ZONE_MODIFIEE' |
        'ELEMENT_AJOUTE' | 'ELEMENT_SUPPRIME' | 'ELEMENT_DEPLACE' |
        'COTE_MODIFIEE' | 'TEXTE_MODIFIE'
  before: string
  after: string
  detail?: string
  element?: string
  confidence: number
  bbox: [number, number, number, number]
  source?: string
}
interface DiffResult {
  total: number
  changes: DiffChange[]
  summary: string[]
  olderVersionId?: number   
  newerVersionId?: number  
}



// ── HELPERS ───────────────────────────────────────────────────────────────────
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
const STATUS_OPTIONS  = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled']
type Section = 'dashboard' | 'projects' | 'plans' | 'notifications' | 'profile'

// ── PERMISSIONS HOOK ──────────────────────────────────────────────────────────
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

  const canSeeUsers        = can('Lire_Utilisateur') || can('Lire_TousLesUtilisateurs')
  const canManageUsers     = can('Creer_Utilisateur') || can('Modifier_Utilisateur') || can('Supprimer_Utilisateur')
  const canSeeAllProjects  = can('Voir_Tous_Projets')
  const canSeeMyProjects   = can('Lire_MesProjets')
  const canSeeProjects     = canSeeAllProjects || canSeeMyProjects
  const canCreateProject   = can('Creer_Projet')
  const canEditProject     = can('Modifier_Projet')
  const canDeleteProject   = can('Supprimer_Projet')
  const canSeeLocations    = can('Lire_Localisation')
  const canCreateLocation  = can('Creer_Localisation')
  const canDeleteLocation  = can('Supprimer_Localisation')
  const canSeeMembers      = can('Voir_MembresProjet')
  const canAddMember       = can('Ajouter_MembreProjet')
  const canRemoveMember    = can('Supprimer_MembreProjet')
  const canManageMembers   = canAddMember || canRemoveMember
  const canSeePlans        = can('Lire_Plan')
  const canCreatePlan      = can('Creer_Plan')
  const canDeletePlan      = can('Supprimer_Plan')
  const canDeleteVersion   = can('Supprimer_VersionPlan')
  const canCreateVersion   = can('Creer_VersionPlan')
  const canAnnotate        = canCreateVersion || can('Creer_Annotation') || can('Modifier_Annotation')
  const canSeeArchitecturePlans = can('Lire_Plan_Architecture')
  const canSeeElectricitePlans  = can('Lire_Plan_Electricite')
  const canSeePlomberiePlans    = can('Lire_Plan_Plomberie')
  const canSeeStructurePlans    = can('Lire_Plan_Structure')
  const canSeeCvcPlans          = can('Lire_Plan_CVC')
  const canSeeOtherPlans        = can('Lire_Plan_Autre')
  const canSeeRoles    = can('Lire_Role')
  const canManageRoles = can('Creer_Role') || can('Modifier_Role') || can('Supprimer_Role')

  return {
    can, permsSet,
    canSeeUsers, canManageUsers,
    canSeeAllProjects, canSeeMyProjects, canSeeProjects,
    canCreateProject, canEditProject, canDeleteProject,
    canSeeLocations, canCreateLocation, canDeleteLocation,
    canSeeMembers, canAddMember, canRemoveMember, canManageMembers,
    canSeePlans, canCreatePlan, canDeletePlan, canCreateVersion, canAnnotate,
    canSeeRoles, canManageRoles,
    currentEmail, currentRoleName, displayName,
    canSeeArchitecturePlans, canSeeElectricitePlans, canSeePlomberiePlans,
    canSeeStructurePlans, canSeeCvcPlans, canSeeOtherPlans,
    canDeleteVersion,
  }
}

// ── PDF VIEWER MODAL ──────────────────────────────────────────────────────────
interface PdfViewerModalProps {
  version: PlanVersion
  planName: string
  planId: number
  folderColor: string
  folderBg: string
  onClose: () => void
  onSaved?: () => void
  isCurrentVersion: boolean
  canAnnotate: boolean
  allVersions: PlanVersion[]
}

type AnnotTool = 'select' | 'pen' | 'line' | 'rect' | 'circle' | 'text' | 'eraser'

export function PdfViewerModal({
  version, planName, planId, folderColor, folderBg, onClose, onSaved,
  isCurrentVersion, canAnnotate, allVersions,
}: PdfViewerModalProps) {
  const pdfUrl = `http://localhost:5279${version.filePath}`
  const isPdf  = version.fileType?.toLowerCase().includes('pdf') ||
                 version.filePath?.toLowerCase().endsWith('.pdf')

  const [numPages, setNumPages]       = useState(0)
  const [pageNumber, setPageNumber]   = useState(1)
  const [scale, setScale]             = useState(1.2)
  const [pageSize, setPageSize]       = useState<{ w: number; h: number } | null>(null)
  const [tool, setTool]               = useState<AnnotTool>('pen')
  const [color, setColor]             = useState('#e53e3e')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [saving, setSaving]           = useState(false)
  const [showMenu, setShowMenu]       = useState(false)
  const [comment, setComment]         = useState('')

  // ── DIFF STATE ──
  const [diffResult, setDiffResult]             = useState<DiffResult | null>(null)
  const [diffLoading, setDiffLoading]           = useState(false)
  const [diffError, setDiffError]               = useState('')
  const [compareVersionId, setCompareVersionId] = useState<number | null>(null)
  const [showDiffPanel, setShowDiffPanel]       = useState(false)
  const [sideBySide, setSideBySide]             = useState(false)
  const [sideBySideSize, setSideBySideSize]     = useState<{ w: number; h: number } | null>(null)
  const [compareVersion, setCompareVersion]     = useState<PlanVersion | null>(null)

  const canvasElRef    = useRef<HTMLCanvasElement | null>(null)
  const fcRef          = useRef<fabric.Canvas | null>(null)

  // ── Stocke le JSON ET les dimensions du canvas pour chaque page ──
  const savedRef = useRef<Record<number, { json: string; canvasW: number; canvasH: number }>>({})

  const isDrawingRef   = useRef(false)
  const originRef      = useRef<fabric.Point | null>(null)
  const activeShapeRef = useRef<fabric.Object | null>(null)

  const [commentOpen, setCommentOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const pageRotationRef = useRef<Record<number, number>>({})

  const [showOverlay, setShowOverlay] = useState(true)

  const annotationEnabled = canAnnotate && isCurrentVersion
  const [compareViewVersions, setCompareViewVersions] = useState<{ v1: PlanVersion; v2: PlanVersion } | null>(null)
  

  // ── Échapper pour fermer ──
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // ── Sauvegarder la page courante quand on change de page ou de scale ──
  useEffect(() => {
    if (fcRef.current && pageSize) {
      savedRef.current[pageNumber] = {
        json:    JSON.stringify(fcRef.current.toJSON()),
        canvasW: pageSize.w,
        canvasH: pageSize.h,
      }
      fcRef.current.dispose()
      fcRef.current = null
    }
    setPageSize(null)
  }, [pageNumber, scale])

  // ── Initialiser Fabric quand pageSize est prêt ──
  useEffect(() => {
    if (!pageSize || !isPdf || !annotationEnabled) return
    if (!canvasElRef.current) return

    const fc = new fabric.Canvas(canvasElRef.current, {
      isDrawingMode:   false,
      selection:       false,
      width:           pageSize.w,
      height:          pageSize.h,
      backgroundColor: 'transparent',
    })

    // Synchroniser le style du canvas
    canvasElRef.current.style.width  = `${pageSize.w}px`
    canvasElRef.current.style.height = `${pageSize.h}px`

    // Synchroniser le wrapper Fabric
    const wrapper = canvasElRef.current.parentElement
    if (wrapper && wrapper.classList.contains('canvas-container')) {
      Object.assign(wrapper.style, {
        position:      'absolute',
        top:           '0',
        left:          '0',
        width:         `${pageSize.w}px`,
        height:        `${pageSize.h}px`,
        pointerEvents: 'none',
        margin:        '0',
        padding:       '0',
        transform:     'none',
      })
      const upper = wrapper.querySelector('.upper-canvas') as HTMLElement | null
      if (upper) {
        Object.assign(upper.style, {
          position:      'absolute',
          top:           '0',
          left:          '0',
          pointerEvents: 'auto',
        })
      }
    }

    fcRef.current = fc

    // Charger les annotations existantes si la page a déjà été annotée
    const saved = savedRef.current[pageNumber]
    if (saved) {
      fc.loadFromJSON(JSON.parse(saved.json)).then(() => {
        fc.renderAll()
        fc.forEachObject(obj => {
          obj.selectable = tool === 'select'
          obj.evented    = tool === 'select' || tool === 'eraser'
        })
        setupTool(fc)
      })
    } else {
      setupTool(fc)
    }

    return () => {
      if (fcRef.current && pageSize) {
        savedRef.current[pageNumber] = {
          json:    JSON.stringify(fcRef.current.toJSON()),
          canvasW: pageSize.w,
          canvasH: pageSize.h,
        }
        fcRef.current.dispose()
        fcRef.current = null
      }
    }
  }, [pageSize, isPdf, annotationEnabled, pageNumber])

  // ── Mettre à jour l'outil actif ──
  useEffect(() => {
    if (fcRef.current) setupTool(fcRef.current)
  }, [tool, color, strokeWidth])

  function setupTool(fc: fabric.Canvas) {
    fc.isDrawingMode = false
    fc.selection     = false
    fc.off('mouse:down')
    fc.off('mouse:move')
    fc.off('mouse:up')
    fc.off('path:created')
    fc.defaultCursor = 'crosshair'
    fc.forEachObject(o => {
      o.selectable = tool === 'select'
      o.evented    = tool === 'select' || tool === 'eraser'
    })

    if (tool === 'select') {
      fc.selection     = true
      fc.defaultCursor = 'default'
      return
    }

    if (tool === 'pen') {
      fc.isDrawingMode        = true
      fc.freeDrawingBrush     = new fabric.PencilBrush(fc)
      fc.freeDrawingBrush.color = color
      fc.freeDrawingBrush.width = strokeWidth
      fc.on('path:created', (opt) => {
        const path = opt.path
        path.set({
          selectable:    true,
          evented:       true,
          hasControls:   false,
          lockMovementX: true,
          lockMovementY: true,
        })
        fc.renderAll()
      })
      return
    }

    if (tool === 'eraser') {
      fc.defaultCursor = 'cell'
      fc.on('mouse:down', (opt) => {
        if (opt.target) {
          fc.remove(opt.target)
          fc.discardActiveObject()
          fc.renderAll()
        }
      })
      return
    }

    if (tool === 'text') {
      fc.defaultCursor = 'text'
      fc.on('mouse:down', (opt) => {
        if (opt.target) return
        const p   = opt.scenePoint
        const txt = new fabric.IText('Tapez ici', {
          left:       p.x,
          top:        p.y,
          fontSize:   18,
          fill:       color,
          fontFamily: 'sans-serif',
          selectable: true,
          evented:    true,
        })
        fc.add(txt)
        fc.setActiveObject(txt)
        txt.enterEditing()
        fc.renderAll()
      })
      return
    }

    // Outils formes : line, rect, circle
    fc.on('mouse:down', (opt) => {
      if (opt.target) return
      isDrawingRef.current  = true
      originRef.current     = opt.scenePoint
      const p               = opt.scenePoint
      let shape: fabric.Object

      if (tool === 'line') {
        shape = new fabric.Line([p.x, p.y, p.x, p.y], {
          stroke:        color,
          strokeWidth,
          strokeLineCap: 'round',
          selectable:    false,
          evented:       false,
          hasControls:   true,
        })
      } else if (tool === 'rect') {
        shape = new fabric.Rect({
          left:        p.x,
          top:         p.y,
          width:       0,
          height:      0,
          stroke:      color,
          strokeWidth,
          fill:        'transparent',
          selectable:  false,
          evented:     false,
          hasControls: true,
        })
      } else {
        shape = new fabric.Ellipse({
          left:        p.x,
          top:         p.y,
          rx:          0,
          ry:          0,
          stroke:      color,
          strokeWidth,
          fill:        'transparent',
          selectable:  false,
          evented:     false,
          hasControls: true,
        })
      }

      activeShapeRef.current = shape
      fc.add(shape)
    })

    fc.on('mouse:move', (opt) => {
      if (!isDrawingRef.current || !originRef.current || !activeShapeRef.current) return
      const p  = opt.scenePoint
      const ox = originRef.current.x
      const oy = originRef.current.y

      if (tool === 'line') {
        (activeShapeRef.current as fabric.Line).set({ x2: p.x, y2: p.y })
      } else if (tool === 'rect') {
        (activeShapeRef.current as fabric.Rect).set({
          left:   Math.min(p.x, ox),
          top:    Math.min(p.y, oy),
          width:  Math.abs(p.x - ox),
          height: Math.abs(p.y - oy),
        })
      } else {
        (activeShapeRef.current as fabric.Ellipse).set({
          left: Math.min(p.x, ox),
          top:  Math.min(p.y, oy),
          rx:   Math.abs(p.x - ox) / 2,
          ry:   Math.abs(p.y - oy) / 2,
        })
      }
      fc.renderAll()
    })

    fc.on('mouse:up', () => {
      if (activeShapeRef.current) {
        activeShapeRef.current.set({
          selectable:  true,
          evented:     true,
          hasControls: true,
        })
        fc.renderAll()
      }
      isDrawingRef.current   = false
      originRef.current      = null
      activeShapeRef.current = null
    })
  }

  function clearPage() {
    if (!fcRef.current || !pageSize) return
    const active = fcRef.current.getActiveObject()
    if (active) {
      fcRef.current.remove(active)
      fcRef.current.discardActiveObject()
      fcRef.current.renderAll()
    } else {
      fcRef.current.getObjects().forEach(obj => fcRef.current?.remove(obj))
      fcRef.current.renderAll()
    }
    savedRef.current[pageNumber] = {
      json:    JSON.stringify(fcRef.current.toJSON()),
      canvasW: pageSize.w,
      canvasH: pageSize.h,
    }
  }

  function undo() {
    if (!fcRef.current || !pageSize) return
    const objs = fcRef.current.getObjects()
    if (objs.length > 0) {
      fcRef.current.remove(objs[objs.length - 1])
      fcRef.current.renderAll()
      savedRef.current[pageNumber] = {
        json:    JSON.stringify(fcRef.current.toJSON()),
        canvasW: pageSize.w,
        canvasH: pageSize.h,
      }
    }
  }

  // ── DIFF ──
  const handleCompare = async () => {
    if (!compareVersionId) return
    setDiffLoading(true)
    setDiffError('')
    setDiffResult(null)
    try {
      const res = await fetch(
        `${BASE_URL}/plan/${planId}/compare?v1Id=${version.id}&v2Id=${compareVersionId}`,
        { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } }
      )
      if (!res.ok) throw new Error('Erreur lors de la comparaison')
      const data: DiffResult = await res.json()
      console.log('DiffResult reçu:', data)
      setDiffResult(data)
      const cv = allVersions.find(v => v.id === compareVersionId) ?? null
      setCompareVersion(cv)
    } catch (e: any) {
      setDiffError(e.message)
    } finally {
      setDiffLoading(false)
    }
  }

  const getDiffColor = (type: string) =>
    type === 'ANNOTATION_AJOUTEE'  ? '#16a34a' :
    type === 'ANNOTATION_SUPPRIMEE' ? '#ef4444' : '#d97706'

  const getDiffBg = (type: string) =>
    type === 'ANNOTATION_AJOUTEE'  ? '#f0fdf4' :
    type === 'ANNOTATION_SUPPRIMEE' ? '#fff1f2' : '#fffbeb'

  const getDiffLabel = (type: string) =>
    type === 'ANNOTATION_AJOUTEE'  ? 'Annotation ajoutée' :
    type === 'ANNOTATION_SUPPRIMEE' ? 'Annotation supprimée' : 'Zone modifiée'

  // ── SAUVEGARDE DES ANNOTATIONS ──
  const handleSaveAnnotations = async () => {
  if (!fcRef.current || !pageSize) return
  setSaving(true)
  try {
    savedRef.current[pageNumber] = {
      json:    JSON.stringify(fcRef.current.toJSON()),
      canvasW: pageSize.w,
      canvasH: pageSize.h,
    }

    const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer())
    const pdfDoc           = await PDFDocument.load(existingPdfBytes)
    const pages            = pdfDoc.getPages()

    for (let i = 0; i < pages.length; i++) {
      const pageNum = i + 1
      const saved   = savedRef.current[pageNum]
      if (!saved) continue

      // Dimensions natives PDF (avant rotation)
      const pdfW = pages[i].getWidth()
      const pdfH = pages[i].getHeight()

      // Rotation stockée lors du rendu
      const rotation = pageRotationRef.current[pageNum] ?? 0

      // Dimensions affichées après rotation (ce que l'utilisateur a vu)
      const displayW = (rotation === 90 || rotation === 270) ? pdfH : pdfW
      const displayH = (rotation === 90 || rotation === 270) ? pdfW : pdfH

      const canvasW = saved.canvasW  // = 950 (paysage)
      const canvasH = saved.canvasH  // = 734 (paysage)

      console.log(`Page ${pageNum} — rotation: ${rotation}°`)
      console.log(`PDF natif: ${pdfW}×${pdfH} | Affiché: ${displayW}×${displayH} | Canvas: ${canvasW}×${canvasH}`)

      // ── Étape 1 : canvas Fabric aux dimensions d'affichage (avec rotation) ──
      const canvasEl   = document.createElement('canvas')
      const tempCanvas = new fabric.StaticCanvas(canvasEl, {
        width:  canvasW,
        height: canvasH,
      })

      await tempCanvas.loadFromJSON(JSON.parse(saved.json))
      tempCanvas.renderAll()

      // ── Étape 2 : export aux dimensions d'affichage ──
      const fabricDataUrl = tempCanvas.toDataURL({ format: 'png', multiplier: 1 })
      tempCanvas.dispose()

      // ── Étape 3 : redimensionner vers displayW×displayH ──
      const srcImg = new Image()
      srcImg.src   = fabricDataUrl
      await new Promise<void>(resolve => { srcImg.onload = () => resolve() })

      // Canvas intermédiaire aux dimensions affichées
      const displayCanvas        = document.createElement('canvas')
      displayCanvas.width        = Math.round(displayW)
      displayCanvas.height       = Math.round(displayH)
      const displayCtx           = displayCanvas.getContext('2d')!
      displayCtx.drawImage(srcImg, 0, 0, Math.round(displayW), Math.round(displayH))

      // ── Étape 4 : appliquer la rotation INVERSE pour revenir au PDF natif ──
      // Le PDF est affiché pivoté → on doit dé-pivoter l'image pour
      // qu'elle s'aligne avec les coordonnées natives du PDF
      const outputCanvas  = document.createElement('canvas')
      const outputCtx     = outputCanvas.getContext('2d')!

      if (rotation === 90 || rotation === 270) {
        // Après dé-rotation, les dimensions s'inversent
        outputCanvas.width  = Math.round(pdfW)
        outputCanvas.height = Math.round(pdfH)
      } else {
        outputCanvas.width  = Math.round(pdfW)
        outputCanvas.height = Math.round(pdfH)
      }

      outputCtx.save()
      outputCtx.translate(outputCanvas.width / 2, outputCanvas.height / 2)

      // Rotation inverse : si le PDF est à 270°, on tourne de +90°
      if (rotation === 90) {
        outputCtx.rotate(-Math.PI / 2)
        outputCtx.drawImage(
          displayCanvas,
          -Math.round(displayW) / 2,
          -Math.round(displayH) / 2,
          Math.round(displayW),
          Math.round(displayH)
        )
      } else if (rotation === 270) {
        outputCtx.rotate(Math.PI / 2)
        outputCtx.drawImage(
          displayCanvas,
          -Math.round(displayW) / 2,
          -Math.round(displayH) / 2,
          Math.round(displayW),
          Math.round(displayH)
        )
      } else if (rotation === 180) {
        outputCtx.rotate(Math.PI)
        outputCtx.drawImage(
          displayCanvas,
          -Math.round(displayW) / 2,
          -Math.round(displayH) / 2,
          Math.round(displayW),
          Math.round(displayH)
        )
      } else {
        // Pas de rotation
        outputCtx.drawImage(
          displayCanvas,
          -Math.round(pdfW) / 2,
          -Math.round(pdfH) / 2,
          Math.round(pdfW),
          Math.round(pdfH)
        )
      }

      outputCtx.restore()

      const finalDataUrl = outputCanvas.toDataURL('image/png')

      // ── Étape 5 : embarquer dans le PDF aux dimensions NATIVES ──
      const pngImage = await pdfDoc.embedPng(finalDataUrl)
      pages[i].drawImage(pngImage, {
        x:      0,
        y:      0,
        width:  pdfW,   // natif : 612
        height: pdfH,   // natif : 792
      })
    }

    const pdfBytes = await pdfDoc.save()
    const blob     = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
    const file     = new File(
      [blob],
      `annotated_v${version.versionNumber}.pdf`,
      { type: 'application/pdf' }
    )

    await planService.addVersion(planId, file, comment)
    onSaved?.()
  } catch (e) {
    console.error('Erreur sauvegarde', e)
    alert('Erreur lors de la sauvegarde')
  } finally {
    setSaving(false)
  }
}

  const downloadDXF = async () => {
    if (!fcRef.current) return
    const dxf = new DXFWriter()
    fcRef.current.getObjects().forEach(obj => {
      switch (obj.type) {
        case 'line': { const { x1, y1, x2, y2 } = obj as any; dxf.drawLine(x1, y1, x2, y2); break }
        case 'rect': { const { left, top, width, height } = obj as any; dxf.drawLine(left, top, left + width, top); dxf.drawLine(left + width, top, left + width, top + height); dxf.drawLine(left + width, top + height, left, top + height); dxf.drawLine(left, top + height, left, top); break }
        case 'circle': { const { left, top, radius } = obj as any; dxf.drawCircle(left + radius, top + radius, radius); break }
      }
    })
    const blob = new Blob([dxf.toDxfString()], { type: 'application/dxf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob); link.download = 'plan.dxf'; link.click()
  }

  const TOOLS: { id: AnnotTool; title: string; icon: React.ReactElement }[] = [
    { id: 'select', title: 'Sélection',   icon: <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M5 3l14 9-7 1-4 7z'/></svg> },
    { id: 'pen',    title: 'Stylo libre', icon: <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M12 20h9'/><path d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'/></svg> },
    { id: 'line',   title: 'Ligne',       icon: <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><line x1='5' y1='12' x2='19' y2='12'/></svg> },
    { id: 'rect',   title: 'Rectangle',   icon: <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='18' height='18' rx='2'/></svg> },
    { id: 'circle', title: 'Ellipse',     icon: <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='9'/></svg> },
    { id: 'text',   title: 'Texte',       icon: <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='4 7 4 4 20 4 20 7'/><line x1='9' y1='20' x2='15' y2='20'/><line x1='12' y1='4' x2='12' y2='20'/></svg> },
    { id: 'eraser', title: 'Gomme',       icon: <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M20 20H7L3 16l13.5-13.5a2 2 0 0 1 2.83 0l2.84 2.84a2 2 0 0 1 0 2.83z'/><path d='M6 17l-1 1'/></svg> },
  ]
  const COLORS        = ['#e53e3e', '#d97706', '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#0f172a']
  const STROKE_WIDTHS = [1, 2, 3, 5, 8]

  return (
    <div className='pdf-viewer-overlay'>
      {/* ── TOPBAR ── */}
      {!sideBySide && ( <div className='viewer-topbar'>
        <div className='viewer-file-icon' style={{ background: folderBg, color: folderColor }}>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
        </div>
        <div>
          <p className='viewer-file-name'>{planName}</p>
          <p className='viewer-file-meta'>v{version.versionNumber} · {(version.fileSize / 1024).toFixed(0)} KB{!isCurrentVersion && ' · Archivée'}</p>
        </div>
        <div className='viewer-divider' />

        {isPdf && (
          <div className='viewer-page-nav'>
            <button className='viewer-page-btn' onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
            </button>
            <span className='viewer-page-count'>{pageNumber} / {numPages || '…'}</span>
            <button className='viewer-page-btn' onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>
              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='9 18 15 12 9 6'/></svg>
            </button>
          </div>
        )}

        

        

        <div className='viewer-spacer' />

        {!isCurrentVersion && (
          <div className='viewer-readonly-badge'>
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='11' width='18' height='11' rx='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>
            Lecture seule
          </div>
        )}

        

        {/* Bouton Enregistrer annotations */}
        {isPdf && annotationEnabled && !sideBySide && (
          <button
            className='viewer-save-btn'
            disabled={saving}
            onClick={handleSaveAnnotations}
            style={{ border: `1px solid ${folderColor}40`, background: folderBg, color: folderColor }}
            onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = folderColor; e.currentTarget.style.color = '#fff' } }}
            onMouseLeave={e => { e.currentTarget.style.background = folderBg; e.currentTarget.style.color = folderColor }}
          >
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'/><polyline points='17 21 17 13 7 13 7 21'/><polyline points='7 3 7 8 15 8'/></svg>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        )}

        {/* Bouton Télécharger */}
        <div className='viewer-download-wrapper'>
          <button
            className='viewer-download-btn'
            onClick={() => setShowMenu(!showMenu)}
            style={{ border: `1px solid ${folderColor}40`, background: folderBg, color: folderColor }}
            onMouseEnter={e => { e.currentTarget.style.background = folderColor; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = folderBg; e.currentTarget.style.color = folderColor }}
          >
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/>
            </svg>
            Télécharger
          </button>
          {showMenu && (
            <div className='viewer-download-menu'>
              <div className='viewer-download-menu-item' onClick={() => window.open(pdfUrl, '_blank')}>PDF</div>
              {isCurrentVersion && (
                <div className='viewer-download-menu-item' onClick={() => { downloadDXF(); setShowMenu(false) }}>DWG</div>
              )}
            </div>
          )}
        </div>

        <button className='viewer-close-btn' onClick={onClose} title='Fermer (Échap)'>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
        </button>
      </div>)}

      {/* ── BODY ── */}
<div className='viewer-body'>
  {isPdf ? (
    <>
      {annotationEnabled && !sideBySide && (
        <div className='annot-toolbar'>
          {TOOLS.map(t => (
            <button key={t.id} className='annot-tool-btn' onClick={() => setTool(t.id)} title={t.title}
              style={{ background: tool === t.id ? folderColor : 'transparent', color: tool === t.id ? '#fff' : '#94a3b8' }}
              onMouseEnter={e => { if (tool !== t.id) e.currentTarget.style.background = '#334155' }}
              onMouseLeave={e => { if (tool !== t.id) e.currentTarget.style.background = 'transparent' }}>
              {t.icon}
            </button>
          ))}
          <div className='annot-divider' />
          {COLORS.map(c => (
            <button key={c} className='annot-color-dot' onClick={() => setColor(c)} title={c}
              style={{ background: c, border: color === c ? '2px solid #fff' : '2px solid transparent', boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }} />
          ))}
          <div className='annot-divider' />
          {STROKE_WIDTHS.map(w => (
            <button key={w} className='annot-stroke-btn' onClick={() => setStrokeWidth(w)} title={`Épaisseur ${w}`}
              style={{ background: strokeWidth === w ? '#334155' : 'transparent' }}>
              <div style={{ width: 20, height: Math.min(w, 8), background: '#94a3b8', borderRadius: 2 }} />
            </button>
          ))}
          <div className='annot-spacer' />
          <button className='annot-action-btn' onClick={undo} title='Annuler le dernier trait'>
            <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='9 14 4 9 9 4'/><path d='M20 20v-7a4 4 0 0 0-4-4H4'/></svg>
          </button>
          <button className='annot-action-btn danger mb' onClick={clearPage} title='Effacer toutes les annotations'>
            <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M9 6V4h6v2'/></svg>
          </button>
        </div>
      )}

      {sideBySide ? (
  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#0f172a' }}>

    {/* Barre côte à côte */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #334155', background: '#1e293b', flexShrink: 0 }}>
      <button
        onClick={() => { setSideBySide(false); setSideBySideSize(null) }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.color = '#94a3b8' }}
      >
        <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
          <polyline points='15 18 9 12 15 6'/>
        </svg>
        Retour
      </button>

      <div style={{ width: 1, height: 20, background: '#334155' }} />
      <span style={{ fontSize: 12, color: '#64748b' }}>Comparaison</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: folderColor, background: folderBg, padding: '2px 8px', borderRadius: 6, border: `1px solid ${folderColor}30` }}>
        v{version.versionNumber}
      </span>
      <span style={{ fontSize: 12, color: '#475569' }}>vs</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: folderColor, background: folderBg, padding: '2px 8px', borderRadius: 6, border: `1px solid ${folderColor}30` }}>
        v{compareVersion?.versionNumber ?? '—'}
      </span>

      <div style={{ flex: 1 }} />

      {/* Légende */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {[
          { col: '#16a34a', label: 'Ajoutée' },
          { col: '#ef4444', label: 'Supprimée' },
          { col: '#d97706', label: 'Modifiée' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: l.col }} />
            {l.label}
          </div>
        ))}
        {diffResult && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#1d4ed8', color: '#fff' }}>
            {diffResult.total} zone{diffResult.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Bouton toggle overlay */}
      <button
        onClick={() => setShowOverlay(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 8,
          border: `1px solid ${showOverlay ? folderColor : '#334155'}`,
          background: showOverlay ? folderColor : '#0f172a',
          color: showOverlay ? '#fff' : '#94a3b8',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s'
        }}
      >
        <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
          <rect x='3' y='3' width='18' height='18' rx='2'/>
          <path d='M9 9h6M9 12h6M9 15h4'/>
        </svg>
        {showOverlay ? 'Masquer contours' : 'Afficher contours'}
      </button>
    </div>

    {/* Contenu */}
    {diffResult && compareVersion ? (() => {
      // Gauche = toujours la version actuelle (plus récente)
      const leftVersion  = version
      const rightVersion = compareVersion

      // Tous les types de changements sur le plan gauche (récent)
      const leftTypes = ['ANNOTATION_AJOUTEE', 'ANNOTATION_SUPPRIMEE', 'ZONE_MODIFIEE',
                         'ELEMENT_AJOUTE', 'ELEMENT_SUPPRIME', 'ELEMENT_DEPLACE',
                         'COTE_MODIFIEE', 'TEXTE_MODIFIE']

      // Validation bbox
      const validBbox = (c: DiffChange) => {
        if (!c.bbox || c.bbox.length < 4) return false
        const [rx, ry, rw, rh] = c.bbox
        return (
          typeof rx === 'number' && typeof ry === 'number' &&
          typeof rw === 'number' && typeof rh === 'number' &&
          rx >= 0 && ry >= 0 && rw > 0 && rh > 0
        )
      }

      // Compteur de zones pour les labels
      let zoneCounter = 0
      const changesWithLabel = diffResult.changes
        .filter(c => validBbox(c))
        .map(c => {
          const isZone = c.type !== 'ANNOTATION_AJOUTEE' && c.type !== 'ANNOTATION_SUPPRIMEE'
          if (isZone) zoneCounter++
          return {
            ...c,
            label: c.type === 'ANNOTATION_AJOUTEE' ? '+' : c.type === 'ANNOTATION_SUPPRIMEE' ? '−' : String(zoneCounter),
          }
        })

      // Rendu SVG overlay sur le plan gauche (récent)
      const renderOverlay = (size: { w: number; h: number } | null) => {
        if (!size || changesWithLabel.length === 0) return null
        return (
          <svg
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
            width={size.w}
            height={size.h}
            viewBox={`0 0 ${size.w} ${size.h}`}
          >
            {changesWithLabel.map((c, i) => {
              const [rx, ry, rw, rh] = c.bbox
              const x   = rx * size.w
              const y   = ry * size.h
              const w   = rw * size.w
              const h   = rh * size.h
              const col = getDiffColor(c.type)
              return (
                <g key={i}>
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill={`${col}25`}
                    stroke={col}
                    strokeWidth={2}
                    rx={3}
                    strokeDasharray={c.type === 'ZONE_MODIFIEE' ? '6 3' : 'none'}
                  />
                  <rect x={x} y={Math.max(0, y - 18)} width={20} height={16} fill={col} rx={3} />
                  <text
                    x={x + 10}
                    y={Math.max(0, y - 18) + 11}
                    fill='#fff'
                    fontSize={10}
                    fontWeight={700}
                    textAnchor='middle'
                    dominantBaseline='middle'
                  >
                    {c.label}
                  </text>
                </g>
              )
            })}
          </svg>
        )
      }

      return (
        <div style={{ display: 'flex', gap: 0, flex: 1, overflow: 'auto', padding: '16px', alignItems: 'flex-start' }}>

          {/* PDF GAUCHE — version récente avec overlay */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: folderColor, background: folderBg, borderRadius: 6, padding: '4px 12px', border: `1px solid ${folderColor}30` }}>
              v{leftVersion.versionNumber} — actuelle
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Document file={`http://localhost:5279${leftVersion.filePath}`}>
                <Page
                  pageNumber={pageNumber}
                  scale={scale * 0.60}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  onRenderSuccess={page => {
                    const vp = page.getViewport({ scale: scale * 0.60 })
                    setSideBySideSize({ w: Math.round(vp.width), h: Math.round(vp.height) })
                  }}
                />
              </Document>
              {showOverlay && renderOverlay(sideBySideSize)}
            </div>
          </div>

          <div style={{ width: 1, alignSelf: 'stretch', background: '#334155', margin: '32px 12px 0', flexShrink: 0 }} />

          {/* PDF DROITE — version ancienne, pas d'overlay */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: folderColor, background: folderBg, borderRadius: 6, padding: '4px 12px', border: `1px solid ${folderColor}30` }}>
              v{rightVersion.versionNumber} — comparée
            </div>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Document file={`http://localhost:5279${rightVersion.filePath}`}>
                <Page
                  pageNumber={pageNumber}
                  scale={scale * 0.60}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  onRenderSuccess={page => {
                    const vp = page.getViewport({ scale: scale * 0.60 })
                    setSideBySideSize({ w: Math.round(vp.width), h: Math.round(vp.height) })
                  }}
                />
              </Document>
            </div>
          </div>

        </div>
      )
    })() : (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13 }}>
        Aucun résultat de comparaison disponible.
      </div>
    )}
  </div>
) : (
        /* ── MODE NORMAL ── */
        <>
          <div className='pdf-canvas-area'>
            <div className='pdf-page-wrap' >
              <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale} 
                  renderAnnotationLayer={false} 
                  renderTextLayer={false}
                  onRenderSuccess={(page) => {
                  const rotation = page.rotate ?? 0
                  pageRotationRef.current[pageNumber] = rotation
                  
                  const vp = page.getViewport({ scale })
                  console.log('viewport rotation:', rotation)
                  console.log('viewport width:', vp.width, 'height:', vp.height)
                  setPageSize({ w: Math.round(vp.width), h: Math.round(vp.height) })
                }}
                />
              </Document>

              {pageSize && annotationEnabled && (
                <div className='pdf-fabric-layer' style={{ width: pageSize.w, height: pageSize.h }}>
                  <canvas ref={canvasElRef} width={pageSize.w} height={pageSize.h} />
                </div>
              )}

              {diffResult && pageSize && (
                <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }} width={pageSize.w} height={pageSize.h}>
                  {diffResult.changes.map((c, i) => {
                    const [rx, ry, rw, rh] = c.bbox
                    const x = rx * pageSize.w; const y = ry * pageSize.h
                    const w = rw * pageSize.w; const h = rh * pageSize.h
                    const col = getDiffColor(c.type)
                    return (
                      <g key={i}>
                        <rect x={x} y={y} width={w} height={h} fill={`${col}18`} stroke={col} strokeWidth={2} rx={4} strokeDasharray={c.type === 'ZONE_MODIFIEE' ? '5 3' : 'none'} />
                        <rect x={x} y={Math.max(0, y - 18)} width={c.type === 'ZONE_MODIFIEE' ? Math.max(20, String(i + 1).length * 7 + 8) : 20} height={16} fill={col} rx={3} />
                          <text x={x + (c.type === 'ZONE_MODIFIEE' ? Math.max(20, String(i + 1).length * 7 + 8) / 2 : 10)} y={Math.max(0, y - 18) + 11} fill='#fff' fontSize={10} fontWeight={700} textAnchor='middle'>
                            {c.type === 'ANNOTATION_AJOUTEE' ? '+' : c.type === 'ANNOTATION_SUPPRIMEE' ? '−' : String(i + 1)}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* ── PANNEAU DROIT (mode normal uniquement) ── */}
          <div className='viewer-right-panel' style={{ background: 'transparent' }}>

            {/* CARTE COMMENTAIRE */}
            <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <button onClick={() => setCommentOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: commentOpen ? (annotationEnabled ? '#f0f7ff' : '#f8fafc') : '#fff', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: annotationEnabled ? '#dbeafe' : '#f1f5f9' }}>
                    {annotationEnabled ? (
                      <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/></svg>
                    ) : (
                      <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='11' width='18' height='11' rx='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>
                    )}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                    {annotationEnabled ? 'Commentaire' : (!isCurrentVersion ? 'Version archivée' : 'Lecture seule')}
                  </span>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: commentOpen ? '#e2e8f0' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                  <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='#64748b' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' style={{ transition: 'transform 0.2s', transform: commentOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <polyline points='6 9 12 15 18 9'/>
                  </svg>
                </div>
              </button>
              {commentOpen && (
                <div style={{ padding: '12px 14px 14px', borderTop: '1px solid #f1f5f9', background: '#fff', overflowY: 'auto', maxHeight: '200px' }}>
                  {annotationEnabled ? (
                    <>
                      <p style={{ margin: '0 0 8px', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>Ce commentaire sera enregistré avec la nouvelle version annotée.</p>
                      <textarea className='viewer-comment-textarea' value={comment} onChange={e => setComment(e.target.value)} placeholder='Décrivez les modifications apportées...' style={{ borderRadius: 8 }} />
                      <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Version actuelle</span>
                        <span style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600 }}>v{version.versionNumber} · {(version.fileSize / 1024).toFixed(0)} KB</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: '0 0 8px', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                        {!isCurrentVersion ? "Les annotations sont disponibles uniquement pour la version actuelle." : "Vous n'avez pas la permission d'annoter ce document."}
                      </p>
                      {version.comment && (
                        <div style={{ padding: '8px 10px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', marginTop: 4 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commentaire</div>
                          <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>💬 {version.comment}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* CARTE COMPARAISON */}
{isPdf && allVersions.length > 1 && (
  <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flex: compareOpen ? 1 : 'none', minHeight: 0 }}>
    <button onClick={() => setCompareOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: compareOpen ? '#f0f7ff' : '#fff', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#dbeafe' }}>
          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
            <circle cx='18' cy='18' r='3'/><circle cx='6' cy='6' r='3'/><path d='M13 6h3a2 2 0 0 1 2 2v7'/><path d='M11 18H8a2 2 0 0 1-2-2V9'/>
          </svg>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>Comparer les versions</span>
        {diffResult && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#1d4ed8', color: '#fff' }}>{diffResult.total}</span>
        )}
      </div>
      <div style={{ width: 20, height: 20, borderRadius: 6, background: compareOpen ? '#e2e8f0' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
        <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='#64748b' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' style={{ transition: 'transform 0.2s', transform: compareOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points='6 9 12 15 18 9'/>
        </svg>
      </div>
    </button>

    {compareOpen && (
      <div style={{ padding: '12px 14px 14px', borderTop: '1px solid #f1f5f9', background: '#fff', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 5, fontWeight: 500 }}>Comparer avec :</label>
        <select className='modal-select' value={compareVersionId ?? ''} onChange={e => { setCompareVersionId(Number(e.target.value)); setDiffResult(null); setSideBySide(false); setSideBySideSize(null) }} style={{ marginBottom: 10, borderRadius: 8 }}>
          <option value=''>-- Choisir une version --</option>
          {allVersions.filter(v => v.id !== version.id).sort((a, b) => b.versionNumber - a.versionNumber).map(v => (
            <option key={v.id} value={v.id}>v{v.versionNumber} — {v.comment ? v.comment.slice(0, 20) : 'archivée'}</option>
          ))}
        </select>

        <button className='btn-confirm' onClick={handleCompare} disabled={!compareVersionId || diffLoading}
          style={{ width: '100%', marginBottom: 10, borderRadius: 8, opacity: compareVersionId ? 1 : 0.45, cursor: compareVersionId ? 'pointer' : 'not-allowed' }}>
          {diffLoading
            ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <div style={{ width: 11, height: 11, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Analyse en cours...
              </span>
            : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>
                Lancer la comparaison
              </span>
          }
        </button>

        {diffError && (
          <div style={{ padding: '8px 10px', borderRadius: 8, background: '#fff1f2', border: '1px solid #fecaca', marginBottom: 10, fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>
            {diffError}
          </div>
        )}

        {diffResult && (() => {
          // Calcul des numéros de zones UNE SEULE FOIS pour toute la carte
          let zoneCounter = 0
          const changesWithLabel = diffResult.changes.map(c => {
            const isZone = c.type !== 'ANNOTATION_AJOUTEE' && c.type !== 'ANNOTATION_SUPPRIMEE'
            if (isZone) zoneCounter++
            return {
              ...c,
              isZone,
              label: c.type === 'ANNOTATION_AJOUTEE' ? '+' : c.type === 'ANNOTATION_SUPPRIMEE' ? '−' : String(zoneCounter),
              zoneNumber: isZone ? zoneCounter : null,
            }
          })

          return (
            <>
              <button onClick={() => { setSideBySide(p => !p); setSideBySideSize(null) }}
                style={{ width: '100%', marginBottom: 12, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${sideBySide ? folderColor : '#e2e8f0'}`, background: sideBySide ? folderColor : '#f8fafc', color: sideBySide ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}>
                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='8' height='18' rx='1'/><rect x='13' y='3' width='8' height='18' rx='1'/></svg>
                {sideBySide ? 'Quitter côte à côte' : 'Afficher côte à côte'}
              </button>

              <div style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b' }}>{diffResult.total} zone{diffResult.total !== 1 ? 's' : ''} modifiée{diffResult.total !== 1 ? 's' : ''}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ color: '#16a34a', label: '+' }, { color: '#ef4444', label: '−' }, { color: '#d97706', label: 'n°' }].map(l => (
                    <span key={l.label} style={{ fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: 5, background: l.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l.label}</span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {changesWithLabel.map((c, i) => (
                  <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: getDiffBg(c.type), border: `1px solid ${getDiffColor(c.type)}30` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: c.after !== '—' || c.before !== '—' ? 4 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: c.isZone ? 'auto' : 16, minWidth: 16, height: 16, borderRadius: 4, background: getDiffColor(c.type), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: c.isZone ? '0 5px' : '0' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>{c.label}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: getDiffColor(c.type) }}>{getDiffLabel(c.type)}</span>
                      </div>
                    </div>

                    {(c as any).detail && (c as any).detail !== '—' ? (
                      <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>→ {(c as any).detail}</p>
                    ) : c.after !== '—' ? (
                      <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>→ {c.after}</p>
                    ) : null}

                    {(c as any).element && (c as any).element !== '—' && (
                      <p style={{ margin: '3px 0 0', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
                        {(c as any).element}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )
        })()}
      </div>
    )}
  </div>
)}
          </div>
        </>
      )}
    </>
  ) : (
    <div className='non-pdf-fallback'>
      <div className='non-pdf-icon' style={{ background: folderBg, color: folderColor }}>
        <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
      </div>
      <p className='non-pdf-title'>Aperçu non disponible</p>
      <p className='non-pdf-subtitle'>Ce type de fichier ({version.fileType?.split('/')[1]?.toUpperCase() || 'inconnu'}) ne peut pas être affiché directement.</p>
      <a href={pdfUrl} target='_blank' rel='noopener noreferrer' className='non-pdf-download-link' style={{ background: folderColor }}>
        <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/></svg>
        Télécharger le fichier
      </a>
    </div>
  )}
</div>
    </div>
  )
}
// ── MULTI VIEW PAGE ───────────────────────────────────────────────────────────
interface MultiViewPageProps {
  plan: Plan
  folderColor: string
  folderBg: string
  onClose: () => void
  onOpenViewer: (v: PlanVersion, isCurrent: boolean) => void
}

export function MultiViewPage({ plan, folderColor, folderBg, onClose, onOpenViewer }: MultiViewPageProps) {
  const [v1, setV1] = useState<PlanVersion | null>(null)
  const [v2, setV2] = useState<PlanVersion | null>(null)
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(0)

  const [diffResult, setDiffResult]   = useState<DiffResult | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffError, setDiffError]     = useState('')
  const [showOverlay, setShowOverlay] = useState(false)
  const [pageSize, setPageSize]       = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    setDiffResult(null)
    setShowOverlay(false)
    setDiffError('')
  }, [v1, v2])

  const sorted = [...(plan.planVersions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber)

  const getDiffColor = (type: string) =>
    type === 'ANNOTATION_AJOUTEE'   ? '#16a34a' :
    type === 'ANNOTATION_SUPPRIMEE' ? '#ef4444' : '#d97706'

  const handleCompare = async () => {
    if (!v1 || !v2) return
    setDiffLoading(true)
    setDiffResult(null)
    setDiffError('')
    setShowOverlay(false)
    try {
      const older = v1.versionNumber < v2.versionNumber ? v1 : v2
      const newer = v1.versionNumber < v2.versionNumber ? v2 : v1
      const res = await fetch(
        `${BASE_URL}/plan/${plan.id}/compare/contours?v1Id=${older.id}&v2Id=${newer.id}`,
        { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } }
      )
      if (!res.ok) throw new Error('Erreur lors de la comparaison')
      const data: DiffResult = await res.json()
      setDiffResult(data)
      setShowOverlay(true)
    } catch (e: any) {
      setDiffError(e.message)
    } finally {
      setDiffLoading(false)
    }
  }

  const renderOverlay = (size: { w: number; h: number } | null) => {
    if (!size || !diffResult || !showOverlay) return null
    return (
      <svg
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
      >
        {diffResult.changes.map((c, i) => {
          if (!c.bbox || c.bbox.length < 4) return null
          const [rx, ry, rw, rh] = c.bbox
          if (rw <= 0 || rh <= 0) return null
          const x   = rx * size.w
          const y   = ry * size.h
          const w   = rw * size.w
          const h   = rh * size.h
          const col = getDiffColor(c.type)
          return (
            <rect
              key={i}
              x={x} y={y} width={w} height={h}
              fill={`${col}25`}
              stroke={col}
              strokeWidth={2}
              rx={3}
              strokeDasharray={c.type === 'ZONE_MODIFIEE' ? '6 3' : 'none'}
            />
          )
        })}
      </svg>
    )
  }

  return (
    <div className='pdf-viewer-overlay'>
      {/* TOPBAR */}
      <div className='viewer-topbar'>
        <button
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8,
            border: '1px solid #334155', background: '#0f172a', color: '#94a3b8',
            fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.color = '#94a3b8' }}
        >
          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='15 18 9 12 15 6'/>
          </svg>
          Retour
        </button>

        <div style={{ width: 1, height: 20, background: '#334155' }} />

        <div className='viewer-file-icon' style={{ background: folderBg, color: folderColor }}>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <rect x='3' y='3' width='8' height='18' rx='1'/><rect x='13' y='3' width='8' height='18' rx='1'/>
          </svg>
        </div>
        <div>
          <p className='viewer-file-name'>{plan.name}</p>
          <p className='viewer-file-meta'>Visualisation multiple</p>
        </div>

        <div className='viewer-divider' />

        {/* Sélecteurs de versions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Gauche :</label>
          <select
            value={v1?.id ?? ''}
            onChange={e => setV1(sorted.find(v => v.id === Number(e.target.value)) ?? null)}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 7, border: '1px solid #334155',
              background: '#1e293b', color: '#e2e8f0', cursor: 'pointer' }}
          >
            <option value=''>-- version --</option>
            {sorted.map(v => (
              <option key={v.id} value={v.id}>
                v{v.versionNumber}{v.versionNumber === plan.currentVersion ? ' · actuelle' : ''}
                {v.comment ? ` — ${v.comment.slice(0, 20)}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Droite :</label>
          <select
            value={v2?.id ?? ''}
            onChange={e => setV2(sorted.find(v => v.id === Number(e.target.value)) ?? null)}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 7, border: '1px solid #334155',
              background: '#1e293b', color: '#e2e8f0', cursor: 'pointer' }}
          >
            <option value=''>-- version --</option>
            {sorted.map(v => (
              <option key={v.id} value={v.id}>
                v{v.versionNumber}{v.versionNumber === plan.currentVersion ? ' · actuelle' : ''}
                {v.comment ? ` — ${v.comment.slice(0, 20)}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* ── BOUTONS DIFF ── */}
        {v1 && v2 && v1.id !== v2.id && (
          <>
            <div className='viewer-divider' />

            {!diffResult ? (
              <button
                onClick={handleCompare}
                disabled={diffLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 8,
                  border: `1px solid ${folderColor}50`,
                  background: diffLoading ? '#1e293b' : folderBg,
                  color: diffLoading ? '#64748b' : folderColor,
                  fontSize: 12, fontWeight: 600,
                  cursor: diffLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!diffLoading) { e.currentTarget.style.background = folderColor; e.currentTarget.style.color = '#fff' } }}
                onMouseLeave={e => { if (!diffLoading) { e.currentTarget.style.background = folderBg; e.currentTarget.style.color = folderColor } }}
              >
                {diffLoading ? (
                  <>
                    <div style={{ width: 11, height: 11, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                      <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
                    </svg>
                    Détecter les différences
                  </>
                )}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                {/* Compteur */}
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: '#1d4ed8', color: '#fff' }}>
                  {diffResult.total} zone{diffResult.total !== 1 ? 's' : ''}
                </span>

                {/* Toggle overlay */}
                <button
                  onClick={() => setShowOverlay(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 8,
                    border: `1px solid ${showOverlay ? folderColor : '#334155'}`,
                    background: showOverlay ? folderColor : '#0f172a',
                    color: showOverlay ? '#fff' : '#94a3b8',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/>
                  </svg>
                  {showOverlay ? 'Masquer contours' : 'Afficher contours'}
                </button>

                {/* Relancer */}
                <button
                  onClick={handleCompare}
                  disabled={diffLoading}
                  title="Relancer l'analyse"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 8,
                    border: '1px solid #334155', background: '#0f172a',
                    color: '#64748b', fontSize: 11, fontWeight: 500,
                    cursor: diffLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!diffLoading) { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#fff' } }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.color = '#64748b' }}
                >
                  <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                    <polyline points='23 4 23 10 17 10'/><path d='M20.49 15a9 9 0 1 1-2.12-9.36L23 10'/>
                  </svg>
                  Relancer
                </button>

                {/* Légende */}
                {showOverlay && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 4 }}>
                    {[
                      { col: '#16a34a', label: 'Ajouté' },
                      { col: '#ef4444', label: 'Supprimé' },
                      { col: '#d97706', label: 'Modifié' },
                    ].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: l.col }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Erreur */}
            {diffError && (
              <span style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                  <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                </svg>
                {diffError}
              </span>
            )}
          </>
        )}

        {/* Navigation pages */}
        {v1 && v2 && numPages > 1 && (
          <>
            <div className='viewer-divider' />
            <div className='viewer-page-nav'>
              <button className='viewer-page-btn' onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
              </button>
              <span className='viewer-page-count'>{page} / {numPages}</span>
              <button className='viewer-page-btn' onClick={() => setPage(p => Math.min(numPages, p + 1))} disabled={page >= numPages}>
                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='9 18 15 12 9 6'/></svg>
              </button>
            </div>
          </>
        )}

        <div className='viewer-spacer' />

        <button className='viewer-close-btn' onClick={onClose} title='Fermer (Échap)'>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
            <line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>
          </svg>
        </button>
      </div>

      {/* BODY */}
      <div className='viewer-body' style={{ background: '#0f172a', overflow: 'auto' }}>
        {(!v1 || !v2) ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 16, color: '#475569' }}>
            <svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='#334155' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
              <rect x='3' y='3' width='8' height='18' rx='1'/><rect x='13' y='3' width='8' height='18' rx='1'/>
            </svg>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Sélectionnez deux versions dans la barre ci-dessus pour les afficher côte à côte.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 0, flex: 1, padding: '16px', alignItems: 'flex-start',
            minHeight: 0, overflow: 'auto' }}>
            {[{ version: v1 }, { version: v2 }].map(({ version }, idx) => {
              const isPdf = version.fileType?.toLowerCase().includes('pdf') || version.filePath?.toLowerCase().endsWith('.pdf')
              const url = `http://localhost:5279${version.filePath}`
              const isCurrent = version.versionNumber === plan.currentVersion

              return (
                <div key={version.id} style={{ flex: 1, minWidth: 0, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', paddingLeft: idx === 1 ? 12 : 0, paddingRight: idx === 0 ? 12 : 0,
                  borderRight: idx === 0 ? '1px solid #334155' : 'none' }}>

                  {/* Badge version */}
                  <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: folderColor, background: folderBg,
                      borderRadius: 6, padding: '4px 12px', border: `1px solid ${folderColor}30` }}>
                      v{version.versionNumber} — {isCurrent ? 'actuelle' : 'archivée'}
                    </span>
                    <button
                      onClick={() => { onOpenViewer(version, isCurrent); onClose() }}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6,
                        border: `1px solid ${folderColor}40`, background: folderBg, color: folderColor,
                        cursor: 'pointer', fontWeight: 600 }}
                      onMouseEnter={e => { e.currentTarget.style.background = folderColor; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = folderBg; e.currentTarget.style.color = folderColor }}
                    >
                      Ouvrir
                    </button>
                    <a href={url} target='_blank' rel='noopener noreferrer'
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6,
                        border: '1px solid #334155', background: '#1e293b', color: '#94a3b8',
                        cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}>
                      ↓ Télécharger
                    </a>
                  </div>

                  {/* Contenu PDF avec overlay */}
                  {isPdf ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <Document file={url} onLoadSuccess={({ numPages: n }) => { if (idx === 0) setNumPages(n) }}>
                        <Page
                          pageNumber={page}
                          scale={0.8}
                          renderAnnotationLayer={false}
                          renderTextLayer={false}
                          onRenderSuccess={p => {
                            if (idx === 0) {
                              const vp = p.getViewport({ scale: 0.8 })
                              setPageSize({ w: Math.round(vp.width), h: Math.round(vp.height) })
                            }
                          }}
                        />
                      </Document>
                      {renderOverlay(pageSize)}
                    </div>
                  ) : (
                    <div style={{ padding: '48px 24px', textAlign: 'center', color: '#475569', fontSize: 13,
                      border: '1px dashed #334155', borderRadius: 10, width: '100%' }}>
                      Aperçu non disponible<br />
                      <a href={url} target='_blank' rel='noopener noreferrer' style={{ color: folderColor }}>Télécharger</a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
// ── LOCATION TREE NODE ────────────────────────────────────────────────────────
function LocationTreeNode({
  loc, depth = 0, onAddChild, onDelete, onViewPlans, locationsWithPlans, canAdd, canDelete,
}: {
  loc: Location; depth?: number
  onAddChild: (parent: Location) => void
  onDelete: (loc: Location) => void
  onViewPlans: (loc: Location) => void
  locationsWithPlans: Set<number>
  canAdd: boolean
  canDelete: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = (loc.children?.length ?? 0) > 0
  const hasPlans    = locationsWithPlans.has(loc.id)

  return (
    <div style={{ marginLeft: depth > 0 ? 14 : 0, paddingLeft: depth > 0 ? 8 : 0, borderLeft: depth > 0 ? '1.5px dashed #BFDBFE' : 'none', marginTop: 2, marginBottom: 2 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: '0.5px solid transparent', cursor: 'pointer', transition: 'all 0.12s ease' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hasChildren ? (
            <div style={{ width: 18, height: 18, borderRadius: 5, background: expanded ? '#1d4ed8' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={expanded ? '#fff' : '#93C5FD'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          ) : (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#BFDBFE', margin: 'auto' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.name}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
          {hasPlans && (
            <button onClick={() => onViewPlans(loc)} title="Voir les plans"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '0.5px solid #93C5FD', background: '#EFF6FF', color: '#1d4ed8', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#1d4ed8' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Plans
            </button>
          )}
          {canAdd && (
            <button onClick={() => onAddChild(loc)} title="Ajouter une sous-localisation"
              style={{ width: 26, height: 26, borderRadius: 6, border: '0.5px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EAF3DE'; e.currentTarget.style.color = '#3B6D11'; e.currentTarget.style.borderColor = '#97C459' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(loc)} title="Supprimer"
              style={{ width: 26, height: 26, borderRadius: 6, border: '0.5px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FCEBEB'; e.currentTarget.style.color = '#A32D2D'; e.currentTarget.style.borderColor = '#F09595' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#e2e8f0' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          )}
        </div>
      </div>
      {hasChildren && expanded && (
        <div style={{ marginLeft: 14, paddingLeft: 8, borderLeft: '1.5px dashed #BFDBFE', marginTop: 2, marginBottom: 2 }}>
          {loc.children!.map(child => (
            <LocationTreeNode key={child.id} loc={child} depth={depth + 1}
              onAddChild={onAddChild} onDelete={onDelete} onViewPlans={onViewPlans}
              locationsWithPlans={locationsWithPlans} canAdd={canAdd} canDelete={canDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
// ── DASH PIE CHART ────────────────────────────────────────────────────────────
function DashPieChart({ projects }: { projects: Project[] }) {
  useEffect(() => {
    const init = () => {
      const canvas = document.getElementById('dash-pie') as HTMLCanvasElement | null
      if (!canvas) return
      const existing = (canvas as any).__chartInstance
      if (existing) existing.destroy()

      const data = [
        { label: 'Actif',    color: '#16a34a', count: projects.filter(p => p.status === 'Active').length },
        { label: 'En pause', color: '#d97706', count: projects.filter(p => p.status === 'OnHold').length },
        { label: 'Terminé',  color: '#1d4ed8', count: projects.filter(p => p.status === 'Completed').length },
        { label: 'Planifié', color: '#7c3aed', count: projects.filter(p => p.status === 'Planning').length },
        { label: 'Annulé',   color: '#ef4444', count: projects.filter(p => p.status === 'Cancelled').length },
      ].filter(d => d.count > 0)

      if (data.length === 0) return

      const Chart = (window as any).Chart
      if (!Chart) return

      const instance = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: data.map(d => d.label),
          datasets: [{ data: data.map(d => d.count), backgroundColor: data.map(d => d.color), borderWidth: 2, borderColor: '#fff' }],
        },
        options: { responsive: false, plugins: { legend: { display: false } } },
      })
      ;(canvas as any).__chartInstance = instance
    }

    if ((window as any).Chart) {
      init()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
      script.onload = init
      document.head.appendChild(script)
    }
  }, [projects])

  return null
}

// ── DASH BAR CHART ────────────────────────────────────────────────────────────


// APRÈS
function DashBarChart({ byCategory }: { byCategory: Record<string, number> }) {
  useEffect(() => {
    const init = () => {
      const canvas = document.getElementById('dash-bar') as HTMLCanvasElement | null
      if (!canvas) return
      const existing = (canvas as any).__chartInstance
      if (existing) existing.destroy()

      const cats = [
        { label: 'Architecture', color: '#1d4ed8', key: 'Architecture' },
        { label: 'Électricité',  color: '#d97706', key: 'Électricité'  },
        { label: 'Plomberie',    color: '#0891b2', key: 'Plomberie'    },
        { label: 'Structure',    color: '#7c3aed', key: 'Structure'    },
        { label: 'CVC',          color: '#16a34a', key: 'CVC'          },
      ]

      const counts = cats.map(c => byCategory[c.key] ?? 0)
      if (counts.every(v => v === 0)) return

      const Chart = (window as any).Chart
      if (!Chart) return

      const instance = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: cats.map(c => c.label),
          datasets: [{
            data: counts,
            backgroundColor: cats.map(c => c.color),
            borderRadius: 6,
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, stepSize: 1 } },
          },
        },
      })
      ;(canvas as any).__chartInstance = instance
    }

    if ((window as any).Chart) {
      init()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
      script.onload = init
      document.head.appendChild(script)
    }
  }, [byCategory])

  return null
}
// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ChefDashboard() {
  const navigate = useNavigate()
  const perms = usePermissions()
  const [section, setSection] = useState<Section>('dashboard')

  const [projects, setProjects]                             = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects]               = useState(false)
  const [selectedProject, setSelectedProject]               = useState<Project | null>(null)
  const [showAddProjectModal, setShowAddProjectModal]       = useState(false)
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false)
  const [showEditStatusModal, setShowEditStatusModal]       = useState(false)
  const [newProject, setNewProject]                         = useState({ name: '', description: '', status: 'Planning' })
  const [editStatus, setEditStatus]                         = useState('')
  const [projectErrors, setProjectErrors]                   = useState<Record<string, string>>({})
  const [projectSearch, setProjectSearch]                   = useState('')

  const [locationTree, setLocationTree]                       = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations]               = useState(false)
  const [showAddLocationModal, setShowAddLocationModal]       = useState(false)
  const [showDeleteLocationModal, setShowDeleteLocationModal] = useState(false)
  const [selectedLocation, setSelectedLocation]               = useState<Location | null>(null)
  const [parentLocation, setParentLocation]                   = useState<Location | null>(null)
  const [newLocation, setNewLocation]                         = useState({ name: '', type: 'Bloc' })
  const [locationErrors, setLocationErrors]                   = useState<Record<string, string>>({})
  const [locationsWithPlans, setLocationsWithPlans]           = useState<Set<number>>(new Set())

  const [members, setMembers]                             = useState<Member[]>([])
  const [showMembersPanel, setShowMembersPanel]           = useState(false)
  const [showAddMemberModal, setShowAddMemberModal]       = useState(false)
  const [showDeleteMemberModal, setShowDeleteMemberModal] = useState(false)
  const [selectedMember, setSelectedMember]               = useState<Member | null>(null)
  const [memberEmail, setMemberEmail]                     = useState('')
  const [memberEmailError, setMemberEmailError]           = useState('')
  const [loadingMembers, setLoadingMembers]               = useState(false)

  const [selectedLocationForPlans, setSelectedLocationForPlans] = useState<Location | null>(null)
  const [plans, setPlans]                                       = useState<Plan[]>([])
  const [myPlansCount, setMyPlansCount]       = useState(0)
  const [myVersionsCount, setMyVersionsCount] = useState(0)
  const [myPlansByCategory, setMyPlansByCategory] = useState<Record<string, number>>({})
  const [loadingPlans, setLoadingPlans]                         = useState(false)
  const [selectedFolder, setSelectedFolder]                     = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan]                         = useState<Plan | null>(null)
  const [showUploadModal, setShowUploadModal]                   = useState(false)
  const [uploadForm, setUploadForm]                             = useState({ name: '', status: 'Active', category: '', locationId: 0 })
  const [uploadFile, setUploadFile]                             = useState<File | null>(null)
  const [uploadErrors, setUploadErrors]                         = useState<Record<string, string>>({})
  const [uploadLoading, setUploadLoading]                       = useState(false)
  const [uploadTargetPlanId, setUploadTargetPlanId]             = useState<number | null>(null)
  const [showDeleteVersionModal, setShowDeleteVersionModal]     = useState(false)
  const [selectedVersion, setSelectedVersion]                   = useState<PlanVersion | null>(null)
  const [showMultiView, setShowMultiView] = useState(false)

  const [viewerVersion, setViewerVersion]         = useState<PlanVersion | null>(null)
  const [viewerFolderColor, setViewerFolderColor] = useState('#1d4ed8')
  const [viewerFolderBg, setViewerFolderBg]       = useState('#eff6ff')
  const [viewerPlanName, setViewerPlanName]       = useState('')
  const [viewerPlanId, setViewerPlanId]           = useState(0)
  const [viewerIsCurrent, setViewerIsCurrent]     = useState(false)

  const openViewer = (v: PlanVersion, name: string, color: string, bg: string, planId: number, isCurrent: boolean) => {
    setViewerVersion(v); setViewerPlanName(name); setViewerFolderColor(color)
    setViewerFolderBg(bg); setViewerPlanId(planId); setViewerIsCurrent(isCurrent)
  }

  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [allNotifications, setAllNotifications] = useState<UserNotification[]>([])
  const [notifSearch, setNotifSearch] = useState('')
  const [loadingNotifs, setLoadingNotifs] = useState(false)

  const [error, setError]               = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg]     = useState('')
  const [showProfile, setShowProfile]   = useState(false)
  const [showNotif, setShowNotif]       = useState(false)
  const notifRef   = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }
  const handleLogout = () => { removeToken(); navigate('/login') }

  // ── PROJECTS ──
  const fetchProjects = async () => {
    if (!perms.canSeeProjects) return
    setLoadingProjects(true); setError('')
    try {
      const endpoint = perms.canSeeMyProjects ? '/project/my-projects' : '/project'
      const res = await fetch(`${BASE_URL}${endpoint}`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur chargement projets')
      setProjects(await res.json())
    } catch (e: any) { setError(e.message) } finally { setLoadingProjects(false) }
  }
  useEffect(() => {
  if (section === 'dashboard' || section === 'projects') fetchProjects()
  if (section === 'dashboard') fetchDashboardCounts()
}, [section])

  const handleCreateProject = async () => {
    if (!perms.canCreateProject) return
    const errs: Record<string, string> = {}
    if (!newProject.name.trim()) errs.name = 'Nom requis'
    setProjectErrors(errs); if (Object.keys(errs).length > 0) return
    setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/project`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(newProject) })
      if (!res.ok) throw new Error('Erreur création projet')
      await fetchProjects(); setShowAddProjectModal(false); setNewProject({ name: '', description: '', status: 'Planning' }); showSuccess('Projet créé')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const handleDeleteProject = async () => {
    if (!perms.canDeleteProject || !selectedProject) return
    setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/project/${selectedProject.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur suppression projet')
      setProjects(p => p.filter(x => x.id !== selectedProject.id)); setShowDeleteProjectModal(false); setSelectedProject(null); showSuccess('Projet supprimé')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const handleUpdateStatus = async () => {
    if (!perms.canEditProject || !selectedProject) return
    setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/project/${selectedProject.id}`, { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ...selectedProject, status: editStatus }) })
      if (!res.ok) throw new Error('Erreur mise à jour statut')
      await fetchProjects(); setSelectedProject(p => p ? { ...p, status: editStatus } : p); setShowEditStatusModal(false); showSuccess('Statut mis à jour')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  // ── LOCATIONS ──
  const fetchLocationTree = async (projectId: number) => {
    if (!perms.canSeeLocations) return
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
    if (!perms.canCreateLocation) return
    const errs: Record<string, string> = {}
    if (!newLocation.name.trim()) errs.name = 'Nom requis'
    setLocationErrors(errs); if (Object.keys(errs).length > 0) return
    setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/location`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newLocation.name, type: newLocation.type, projectId: selectedProject!.id, parentId: parentLocation?.id ?? null }) })
      if (!res.ok) throw new Error('Erreur création localisation')
      await fetchLocationTree(selectedProject!.id); setShowAddLocationModal(false); setNewLocation({ name: '', type: 'Bloc' }); setParentLocation(null); showSuccess('Localisation ajoutée')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const handleDeleteLocation = async () => {
    if (!perms.canDeleteLocation || !selectedLocation) return
    setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/location/${selectedLocation.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur suppression localisation')
      await fetchLocationTree(selectedProject!.id); setShowDeleteLocationModal(false); showSuccess('Localisation supprimée')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  // ── MEMBERS ──
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
    if (!perms.canAddMember || !memberEmail.trim() || !selectedProject) return
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(memberEmail)) { setMemberEmailError('Adresse email invalide'); return }
    setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/project/${selectedProject.id}/members/${encodeURIComponent(memberEmail)}`, { method: 'POST', headers: authHeaders() })
      if (!res.ok) {
        const msg = await res.text()
        if (res.status === 404) setMemberEmailError('Aucun utilisateur trouvé')
        else if (msg.includes('already')) setMemberEmailError('Déjà membre du projet')
        else setMemberEmailError("Erreur lors de l'ajout")
        return
      }
      await fetchMembers(selectedProject.id); setShowAddMemberModal(false); setMemberEmail(''); setMemberEmailError(''); showSuccess('Membre ajouté')
    } catch { setMemberEmailError('Erreur réseau') } finally { setActionLoading(false) }
  }

  const handleRemoveMember = async () => {
    if (!perms.canRemoveMember || !selectedMember || !selectedProject) return
    setActionLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/project/${selectedProject.id}/members/${selectedMember.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur suppression membre')
      setMembers(m => m.filter(x => x.id !== selectedMember.id)); setShowDeleteMemberModal(false); showSuccess('Membre retiré')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  // ── PLANS ──
  const handleViewPlans = async (loc: Location) => {
    if (!perms.canSeePlans) return
    setSelectedLocationForPlans(loc); setPlans([]); setLoadingPlans(true)
    setSection('plans'); setSelectedFolder(null); setSelectedPlan(null)
    try { setPlans(await planService.getByLocation(loc.id)) }
    catch (e: any) { setError(e.message) } finally { setLoadingPlans(false) }
  }

  const handleUploadPlan = async () => {
    if (!perms.canCreatePlan) return
    const errs: Record<string, string> = {}
    if (!uploadFile) errs.file = 'Fichier requis'
    if (!uploadTargetPlanId) {
      if (!uploadForm.name.trim()) errs.name = 'Nom requis'
      if (!uploadForm.locationId) errs.location = 'Localisation requise'
    }
    setUploadErrors(errs)
    if (Object.keys(errs).length > 0) return
    setUploadLoading(true)
    try {
      if (uploadTargetPlanId) {
        await planService.addVersion(uploadTargetPlanId, uploadFile!)
      } else {
        const fd = new FormData()
        fd.append('Name', uploadForm.name); fd.append('Status', uploadForm.status)
        fd.append('Category', uploadForm.category); fd.append('LocationId', String(uploadForm.locationId))
        fd.append('File', uploadFile!)
        const res = await fetch(`${BASE_URL}/plan`, { method: 'POST', headers: authHeaders(), body: fd })
        if (!res.ok) throw new Error('Erreur upload plan')
      }
      if (selectedLocationForPlans?.id) {
        const updatedPlans = await planService.getByLocation(selectedLocationForPlans.id)
        setPlans(updatedPlans)
        
        // Si on était sur la page versions d'un plan, mettre à jour selectedPlan
        if (selectedPlan) {
          const updated = updatedPlans.find(p => p.id === (uploadTargetPlanId ?? selectedPlan.id))
          setSelectedPlan(updated ?? null)
        }
      }
      const locWithPlans = await planService.getLocationsWithPlans()
      setLocationsWithPlans(new Set(locWithPlans.filter(r => r.hasPlans).map(r => r.locationId)))
      setShowUploadModal(false); setUploadForm({ name: '', status: 'Active', category: '', locationId: 0 })
      setUploadFile(null); setUploadErrors({}); setUploadTargetPlanId(null)
      showSuccess(uploadTargetPlanId ? 'Nouvelle version ajoutée' : 'Plan uploadé')
    } catch (e: any) { setError(e.message) } finally { setUploadLoading(false) }
  }

  // ── VERSIONS ──
  const handleDeleteVersion = async () => {
    if (!perms.canDeleteVersion || !selectedVersion || !selectedPlan) return
    setActionLoading(true)
    try {
      await planService.deleteVersion(selectedVersion.id)
      const updatedPlans = await planService.getByLocation(selectedLocationForPlans!.id)
      setPlans(updatedPlans)
      const updated = updatedPlans.find(p => p.id === selectedPlan.id)
      setSelectedPlan(updated ?? null)
      setShowDeleteVersionModal(false); setSelectedVersion(null)
      showSuccess('Version supprimée')
    } catch (e: any) { setError(e.message) } finally { setActionLoading(false) }
  }

  const flattenLocations = (locs: Location[], depth = 0): { loc: Location; depth: number }[] =>
    locs.flatMap(l => [{ loc: l, depth }, ...flattenLocations(l.children ?? [], depth + 1)])

  const filteredProjects = projects.filter(p => p.name?.toLowerCase().includes(projectSearch.toLowerCase()))

  const navItems: { id: Section; label: string; icon: React.ReactElement; visible: boolean }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='7' height='7'/><rect x='14' y='3' width='7' height='7'/><rect x='14' y='14' width='7' height='7'/><rect x='3' y='14' width='7' height='7'/></svg>, visible: true },
    { id: 'projects', label: 'Mes Projets', icon: <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'/></svg>, visible: perms.canSeeMyProjects },
    { id: 'notifications', label: 'Notifications', icon: (
      <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'/>
        <path d='M13.73 21a2 2 0 0 1-3.46 0'/>
      </svg>
    ), visible: true },
    { id: 'profile' as Section, label: 'Profil', icon: (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/>
    </svg>
  ), visible: true },
  ].filter(item => item.visible) as { id: Section; label: string; icon: React.ReactElement; visible: boolean }[]

  const FOLDERS: { key: string; label: string; color: string; bg: string; icon: React.ReactElement; permission: keyof ReturnType<typeof usePermissions> }[] = [
    { key: 'Architecture', label: 'Architecture', color: '#1d4ed8', bg: '#eff6ff', icon: <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/></svg>, permission: 'canSeeArchitecturePlans' },
    { key: 'Électricité', label: 'Électricité', color: '#d97706', bg: '#fffbeb', icon: <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/></svg>, permission: 'canSeeElectricitePlans' },
    { key: 'Plomberie',   label: 'Plomberie',   color: '#0891b2', bg: '#ecfeff', icon: <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M12 2a5 5 0 0 1 5 5c0 5-5 13-5 13S7 12 7 7a5 5 0 0 1 5-5z'/><circle cx='12' cy='7' r='2'/></svg>, permission: 'canSeePlomberiePlans' },
    { key: 'Structure',   label: 'Structure',   color: '#7c3aed', bg: '#f5f3ff', icon: <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='3' width='18' height='18' rx='2'/><path d='M3 9h18M3 15h18M9 3v18M15 3v18'/></svg>, permission: 'canSeeStructurePlans' },
    { key: 'CVC',         label: 'CVC',         color: '#16a34a', bg: '#f0fdf4', icon: <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24'/></svg>, permission: 'canSeeCvcPlans' },
  ]

  const folderPlans = (key: string) => {
    const permissionKey = `canSee${key}Plans` as keyof typeof perms
    if (!(perms[permissionKey] as boolean)) return []
    return plans.filter(p => {
      const cat = (p.category || '').toLowerCase()
      if (key === 'Architecture') return cat.includes('archi')
      if (key === 'Électricité')  return cat.includes('elec') || cat.includes('électri')
      if (key === 'Plomberie')    return cat.includes('plomb')
      if (key === 'Structure')    return cat.includes('struct')
      if (key === 'CVC')          return cat.includes('cvc') || cat.includes('chauff') || cat.includes('ventil')
      return false
    })
  }

  const visibleFolders = FOLDERS.filter(folder => perms[folder.permission as keyof typeof perms] as boolean)

  const otherPlans = plans.filter(p => {
    const cat = (p.category || '').toLowerCase()
    return !cat.includes('archi') && !cat.includes('elec') && !cat.includes('électri') &&
           !cat.includes('plomb') && !cat.includes('struct') && !cat.includes('cvc') &&
           !cat.includes('chauff') && !cat.includes('ventil')
  })

  const displayedPlans = selectedFolder === null ? [] : selectedFolder === 'Autres' ? otherPlans : folderPlans(selectedFolder)
  const currentFolder  = FOLDERS.find(f => f.key === selectedFolder)

  const fetchNotifications = async () => {
    setLoadingNotifs(true)
    try {
      const data = await notificationService.getMyNotifications()
      setNotifications(data)
    } catch (e) { console.error(e) } finally { setLoadingNotifs(false) }
  }

  const fetchDashboardCounts = async () => {
    if (!perms.canSeePlans) return
    try {
        const [plansCount, versionsCount, byCategory] = await Promise.all([
            planService.getMyPlansCount(),
            planService.getMyVersionsCount(),
            planService.getMyPlansByCategory(),
        ])
        setMyPlansCount(plansCount)
        setMyVersionsCount(versionsCount)
        setMyPlansByCategory(byCategory)
    } catch (e) {
        console.error(e)
    }
}

  const fetchAllNotifications = async () => {
    try {
      const data = await notificationService.getMyNotifications()
      setAllNotifications(data)
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className='app-root'>

      {/* PDF VIEWER OVERLAY */}
      {viewerVersion && (
        <PdfViewerModal
          version={viewerVersion}
          planName={viewerPlanName}
          planId={viewerPlanId}
          folderColor={viewerFolderColor}
          folderBg={viewerFolderBg}
          onClose={() => setViewerVersion(null)}
          onSaved={async () => {
            if (selectedLocationForPlans) {
              const updatedPlans = await planService.getByLocation(selectedLocationForPlans.id)
              setPlans(updatedPlans)
              const updated = updatedPlans.find(p => p.id === viewerPlanId)
              setSelectedPlan(updated ?? null)          
              setSelectedFolder(currentFolder?.key ?? null)
            }
            setViewerVersion(null)                     
            showSuccess('Annotations enregistrées comme nouvelle version')
          }}
          isCurrentVersion={viewerIsCurrent}
          canAnnotate={perms.canAnnotate}
          allVersions={selectedPlan?.planVersions ?? []}
        />
      )}

      {/* MULTI VIEW PAGE */}
      {showMultiView && selectedPlan && (
        <MultiViewPage
          plan={selectedPlan}
          folderColor={currentFolder?.color || '#1d4ed8'}
          folderBg={currentFolder?.bg || '#eff6ff'}
          onClose={() => setShowMultiView(false)}
          onOpenViewer={(v, isCurrent) =>
            openViewer(v, selectedPlan.name, currentFolder?.color || '#1d4ed8',
              currentFolder?.bg || '#eff6ff', selectedPlan.id, isCurrent)
          }
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className='sidebar'>
        <div className='sidebar-header'>
          <div className='sidebar-logo-row'>
            <div className='sidebar-logo-icon'>
              <svg width='18' height='18' viewBox='0 0 20 20' fill='none'><rect x='2' y='2' width='7' height='9' rx='1' stroke='white' strokeWidth='1.5'/><rect x='11' y='2' width='7' height='5' rx='1' stroke='white' strokeWidth='1.5'/><rect x='2' y='13' width='16' height='5' rx='1' stroke='white' strokeWidth='1.5'/></svg>
            </div>
            <div>
              <div className='sidebar-app-name'>Axia Plan</div>
              <div className='sidebar-role-label'>{perms.currentRoleName || 'Utilisateur'}</div>
            </div>
          </div>
        </div>
        <nav className='sidebar-nav'>
          {navItems.map(item => {
            const active = section === item.id || (section === 'plans' && item.id === 'projects')
            return (
              <button key={item.id} className={`nav-btn ${active ? 'active' : ''}`}
                onClick={() => { setSection(item.id); setSelectedProject(null); setLocationTree([]); setSelectedLocationForPlans(null); setPlans([]); setSelectedFolder(null); setSelectedPlan(null); if (item.id === 'notifications') fetchAllNotifications() }}>
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

      {/* ── MAIN ── */}
      <div className='main-area'>
        <header className='topbar'>
          <div className='topbar-breadcrumb'>
            <span className='breadcrumb-app'>Axia Plan</span>
            <span className='breadcrumb-sep'>/</span>
            <span className='breadcrumb-page'>
              {section === 'dashboard' ? 'Tableau de bord' : selectedProject ? selectedProject.name : 'Mes Projets'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            {/* Notifications */}
            <div ref={notifRef} className='notif-wrapper'>
              <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) fetchNotifications() }}
                className={`notif-btn ${showNotif ? 'active' : ''}`} style={{ position: 'relative' }}>
                <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#64748b' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'/><path d='M13.73 21a2 2 0 0 1-3.46 0'/>
                </svg>
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, background: '#ef4444', color: '#fff', borderRadius: '50%', fontSize: 10, fontWeight: 700, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    {notifications.filter(n => !n.isRead).length > 9 ? '9+' : notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
              {showNotif && (
                <div className='notif-dropdown'>
                  <div className='notif-header'>
                    <span className='notif-title'>
                      Notifications
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <span className='notif-count'>{notifications.filter(n => !n.isRead).length > 9 ? '9+' : notifications.filter(n => !n.isRead).length}</span>
                      )}
                    </span>
                    {notifications.some(n => !n.isRead) && (
                      <button className='notif-mark-all-btn' onClick={async () => { await notificationService.markAllAsRead(); setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))) }}>
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                  <div className='notif-list'>
                    {loadingNotifs ? (
                      <div className='notif-loading'>Chargement...</div>
                    ) : notifications.length === 0 ? (
                      <div className='notif-empty'>
                        <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#cbd5e1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'><path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'/><path d='M13.73 21a2 2 0 0 1-3.46 0'/></svg>
                        Aucune notification
                      </div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`notif-item ${n.isRead ? '' : 'unread'}`}
                        onClick={async () => { if (!n.isRead) { await notificationService.markAsRead(n.id); setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x)) } }}>
                        <div className={`notif-dot ${n.isRead ? 'read' : 'unread'}`} />
                        <div className='notif-content'>
                          <p className={`notif-name ${n.isRead ? '' : 'unread'}`}>{n.name}</p>
                          {n.message && <p className='notif-message'>{n.message}</p>}
                          <p className='notif-time'>{new Date(n.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <button className='notif-delete-btn'
                          onClick={async e => { e.stopPropagation(); await notificationService.deleteNotification(n.id); setNotifications(prev => prev.filter(x => x.id !== n.id)) }} title='Supprimer'>
                          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className='topbar-divider' />

            {/* Profil */}
            <div ref={profileRef} className='profile-wrapper'>
              <button className={`profile-btn ${showProfile ? 'open' : ''}`} onClick={() => setShowProfile(!showProfile)}>
                <div className='profile-avatar'>{perms.displayName[0]?.toUpperCase()}</div>
                <div>
                  <div className='profile-name'>{perms.displayName}</div>
                  <div className='profile-subtitle'>{perms.currentRoleName || 'Utilisateur'}</div>
                </div>
                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='6 9 12 15 18 9'/></svg>
              </button>
              {showProfile && (
                <div className='profile-dropdown'>
                  <div className='profile-dropdown-header'>
                    <p className='profile-dropdown-name'>{perms.displayName}</p>
                    <p className='profile-dropdown-email'>{perms.currentEmail}</p>
                  </div>
                  <button className='profile-dropdown-logout' onClick={handleLogout}>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/></svg>
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className='content'>
          {successMsg && (
            <div className='success-banner'>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#16a34a' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M20 6L9 17l-5-5'/></svg>
              <span>{successMsg}</span>
            </div>
          )}
          {error && <div className='error-banner'>⚠ {error}</div>}

          {section === 'dashboard' && (
            <div>
              <div className='dash-greeting'>
                <h1>Bonjour, {perms.displayName}</h1>
                <p>Voici un aperçu de vos projets en cours.</p>
              </div>

              {/* ── STAT CARDS ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Projets',         value: projects.length,                                          color: '#1d4ed8', bg: '#eff6ff' },
                  { label: 'Plans',    value: myPlansCount,    color: '#0891b2', bg: '#ecfeff' },
                  { label: 'Versions', value: myVersionsCount, color: '#7c3aed', bg: '#f5f3ff' },
                  { label: 'Notifs non lues', value: notifications.filter(n => !n.isRead).length,              color: '#ef4444', bg: '#fff1f2' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#ffffff', borderRadius: '12px', border: '0.5px solid #e5e7eb', padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>{s.label}</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* ── GRAPHIQUES ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

                {/* Camembert statuts */}
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '0.5px solid #e5e7eb', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Répartition des projets par statut</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                      <canvas id='dash-pie' width='120' height='120' role='img' aria-label='Répartition statuts projets'></canvas>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      {[
                        { label: 'Actif',    color: '#16a34a', count: projects.filter(p => p.status === 'Active').length },
                        { label: 'En pause', color: '#d97706', count: projects.filter(p => p.status === 'OnHold').length },
                        { label: 'Terminé', color: '#1d4ed8', count: projects.filter(p => p.status === 'Completed').length },
                        { label: 'Planifié', color: '#7c3aed', count: projects.filter(p => p.status === 'Planning').length },
                        { label: 'Annulé',  color: '#ef4444', count: projects.filter(p => p.status === 'Cancelled').length },
                      ].filter(s => s.count > 0).map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
                          <span style={{ color: '#64748b' }}>{s.label}</span>
                          <span style={{ fontWeight: 600, color: '#1e293b', marginLeft: 'auto' }}>{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <DashPieChart projects={projects} />
                </div>

                {/* Barres catégories */}
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '0.5px solid #e5e7eb', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>Plans par catégorie</div>
                  <div style={{ position: 'relative', height: '140px' }}>
                    <canvas id='dash-bar' role='img' aria-label='Plans par catégorie'>Aucune donnée.</canvas>
                  </div>
                  <DashBarChart byCategory={myPlansByCategory} />
                </div>
              </div>

              {/* ── PROJETS RÉCENTS ── */}
              <div className='recent-projects-card'>
                <div className='recent-projects-card-header'>
                  <h2>Mes projets récents</h2>
                  <button className='see-all-btn' onClick={() => setSection('projects')}>Voir tous →</button>
                </div>
                {loadingProjects ? <div className='loading-text'>Chargement...</div>
                  : projects.length === 0 ? (
                    <div className='empty-state'>
                      <p>Aucun projet pour le moment</p>
                      {perms.canCreateProject && <button className='btn-primary' onClick={() => setShowAddProjectModal(true)}>Créer mon premier projet</button>}
                    </div>
                  ) : projects.slice(0, 4).map((p, i) => {
                    const st = getStatusLabel(p.status)
                    return (
                      <div key={p.id} className='recent-project-row'
                        style={{ borderBottom: i < Math.min(projects.length, 4) - 1 ? '1px solid #f1f5f9' : 'none' }}
                        onClick={() => { setSelectedProject(p); setSection('projects'); fetchLocationTree(p.id); if (perms.canSeeMembers) fetchMembers(p.id) }}>
                        <div className='recent-project-info'>
                          <div className='project-icon-wrap'>
                            <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'/></svg>
                          </div>
                          <div>
                            <p className='project-name'>{p.name}</p>
                            <p className='project-date'>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}</p>
                          </div>
                        </div>
                        <span className='status-badge' style={{ color: st.color, background: st.bg }}>{st.label}</span>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          )}

          {/* ── PROJECTS LIST ── */}
          {section === 'projects' && !selectedProject && perms.canSeeProjects && (
            <div>
              <div className='section-header'>
                <div className='section-title'>
                  <h1>Mes Projets</h1>
                  <p>Gérez vos projets et leurs localisations.</p>
                </div>
                <div className='section-actions'>
                  <div className='search-wrapper'>
                    <svg className='search-icon' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/></svg>
                    <input className='search-input' placeholder='Rechercher...' value={projectSearch} onChange={e => setProjectSearch(e.target.value)} />
                  </div>
                  {perms.canCreateProject && (
                    <button className='btn-primary' onClick={() => setShowAddProjectModal(true)}>
                      <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
                      Nouveau projet
                    </button>
                  )}
                </div>
              </div>
              {loadingProjects ? <div className='projects-empty'><p>Chargement...</p></div>
                : filteredProjects.length === 0 ? (
                  <div className='projects-empty'>
                    <p>Aucun projet trouvé</p>
                    {perms.canCreateProject && <button className='btn-primary' onClick={() => setShowAddProjectModal(true)}>Créer un projet</button>}
                  </div>
                ) : (
                  <div className='projects-grid'>
                    {filteredProjects.map(p => {
                      const st = getStatusLabel(p.status)
                      return (
                        <div key={p.id} className='project-card' onClick={() => { setSelectedProject(p); fetchLocationTree(p.id); if (perms.canSeeMembers) fetchMembers(p.id) }}>
                          <div className='project-card-header'>
                            <div className='project-card-meta'>
                              <div className='project-card-icon'>
                                <svg width='17' height='17' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'/></svg>
                              </div>
                              <div>
                                <p className='project-card-name'>{p.name}</p>
                                <p className='project-card-date'>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}</p>
                              </div>
                            </div>
                            <span className='status-badge' style={{ color: st.color, background: st.bg }}>{st.label}</span>
                          </div>
                          {p.description && <p className='project-card-description'>{p.description}</p>}
                          <div className='project-card-actions' onClick={e => e.stopPropagation()}>
                            {perms.canEditProject && (
                              <button className='btn-change-status' onClick={() => { setSelectedProject(p); setEditStatus(p.status); setShowEditStatusModal(true) }}>Changer statut</button>
                            )}
                            {perms.canDeleteProject && (
                              <button className='btn-icon-delete' onClick={() => { setSelectedProject(p); setShowDeleteProjectModal(true) }}>
                                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M9 6V4h6v2'/></svg>
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* ── PROJECT DETAIL ── */}
          {section === 'projects' && selectedProject && perms.canSeeProjects && (
            <div>
              <div className='project-detail-header'>
                <div className='project-detail-title'>
                  <button className='back-btn' onClick={() => { setSelectedProject(null); setLocationTree([]); setMembers([]) }}>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                    Retour aux projets
                  </button>
                  <h1>{selectedProject.name}</h1>
                  <div className='project-detail-badges'>
                    <span className='status-badge' style={{ color: getStatusLabel(selectedProject.status).color, background: getStatusLabel(selectedProject.status).bg }}>{getStatusLabel(selectedProject.status).label}</span>
                    {selectedProject.description && <span style={{ fontSize: 13, color: '#64748b' }}>{selectedProject.description}</span>}
                  </div>
                </div>
                <div className='project-detail-actions'>
                  {perms.canSeeMembers && (
                    <button className={`btn-outline-purple ${showMembersPanel ? 'active' : ''}`} onClick={() => setShowMembersPanel(!showMembersPanel)}>
                      <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/></svg>
                      Membres ({members.length})
                    </button>
                  )}
                  {perms.canCreatePlan && (
                    <button className='btn-outline-purple' onClick={() => { setUploadTargetPlanId(null); setUploadFile(null); setUploadErrors({}); setUploadForm({ name: '', status: 'Active', category: '', locationId: 0 }); setShowUploadModal(true) }}>
                      <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' y1='3' x2='12' y2='15'/></svg>
                      Uploader un plan
                    </button>
                  )}
                </div>
              </div>

              <div className={`detail-grid ${showMembersPanel ? 'with-panel' : 'no-panel'}`}>
                <div className='locations-panel'>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 14px', borderBottom: '0.5px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <div>
                        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Localisations</h2>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{locationTree.length} zone{locationTree.length !== 1 ? 's' : ''} racine{locationTree.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    {perms.canCreateLocation && (
                      <button onClick={() => { setParentLocation(null); setNewLocation({ name: '', type: 'Bloc' }); setShowAddLocationModal(true) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '0.5px solid #93C5FD', background: '#EFF6FF', color: '#1d4ed8', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#1d4ed8' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#1d4ed8'; e.currentTarget.style.borderColor = '#93C5FD' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Ajouter
                      </button>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    {loadingLocations ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12 }}>
                        <div style={{ width: 28, height: 28, border: '2.5px solid #BFDBFE', borderTopColor: '#1d4ed8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>Chargement...</span>
                      </div>
                    ) : locationTree.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '52px 24px', gap: 14, textAlign: 'center' }}>
                        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#f8fafc', border: '1.5px dashed #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#374151' }}>Aucune localisation</p>
                          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Créez votre première zone pour organiser les plans</p>
                        </div>
                        {perms.canCreateLocation && (
                          <button onClick={() => { setParentLocation(null); setNewLocation({ name: '', type: 'Bloc' }); setShowAddLocationModal(true) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#1d4ed8', color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Créer la première localisation
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {locationTree.map(loc => (
                          <LocationTreeNode key={loc.id} loc={loc} depth={0}
                            onAddChild={parent => { setParentLocation(parent); setNewLocation({ name: '', type: 'Appartement' }); setShowAddLocationModal(true) }}
                            onDelete={loc => { setSelectedLocation(loc); setShowDeleteLocationModal(true) }}
                            onViewPlans={handleViewPlans}
                            locationsWithPlans={locationsWithPlans}
                            canAdd={perms.canCreateLocation} canDelete={perms.canDeleteLocation} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {showMembersPanel && perms.canSeeMembers && (
                  <div className='members-panel'>
                    <div className='members-panel-header'>
                      <h2>Membres</h2>
                      {perms.canAddMember && (
                        <button className='btn-add-member' onClick={() => setShowAddMemberModal(true)}>
                          <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/></svg>
                        </button>
                      )}
                    </div>
                    {loadingMembers ? <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>Chargement...</div>
                      : members.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '16px 0', margin: 0 }}>Aucun membre</p>
                      : members.map(m => (
                        <div key={m.id} className='member-row'>
                          <div className='member-info'>
                            <div className='member-avatar'>{m.name?.[0]?.toUpperCase() || '?'}</div>
                            <div>
                              <p className='member-name'>{m.name}</p>
                              <p className='member-role'>{getRoleName(m.role)}</p>
                            </div>
                          </div>
                          {perms.canRemoveMember && (
                            <button className='btn-remove-member' onClick={() => { setSelectedMember(m); setShowDeleteMemberModal(true) }}>
                              <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M9 6V4h6v2'/></svg>
                            </button>
                          )}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PLANS PAGE ── */}
          {section === 'plans' && selectedLocationForPlans && perms.canSeePlans && (
            <div>
              <div className='plans-breadcrumb'>
                <button className='breadcrumb-btn' onClick={() => { setSection('projects'); setSelectedFolder(null); setSelectedPlan(null) }}>
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                  Retour aux localisations
                </button>
                {selectedFolder && (
                  <>
                    <span className='breadcrumb-sep'>/</span>
                    <button className='breadcrumb-btn' onClick={() => { setSelectedFolder(null); setSelectedPlan(null) }}>{selectedLocationForPlans.name}</button>
                  </>
                )}
              </div>

              <div className='plans-header'>
                <div>
                  <h1>{selectedPlan ? selectedPlan.name : selectedFolder ? selectedFolder : selectedLocationForPlans.name}</h1>
                  <p>
                    {loadingPlans ? 'Chargement...' : selectedPlan
                      ? `${selectedPlan.planVersions?.length || 0} version${(selectedPlan.planVersions?.length || 0) > 1 ? 's' : ''} — cliquez sur une version pour l'ouvrir`
                      : selectedFolder ? `${displayedPlans.length} plan${displayedPlans.length !== 1 ? 's' : ''}`
                      : `${plans.length} plan${plans.length !== 1 ? 's' : ''} au total`}
                  </p>
                </div>
              </div>

              {loadingPlans ? (
                <div className='plans-empty'><p>Chargement...</p></div>
              ) : plans.length === 0 ? (
                <div className='plans-empty'>
                  <svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='#cbd5e1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' style={{ margin: '0 auto 16px', display: 'block' }}><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
                  <p>Aucun plan pour cette localisation</p>
                  {perms.canCreatePlan && <button className='btn-primary' onClick={() => { setUploadForm(f => ({ ...f, locationId: selectedLocationForPlans.id })); setShowUploadModal(true) }}>Uploader le premier plan</button>}
                </div>

              ) : selectedPlan ? (
                <div>
                  {perms.canCreateVersion && (
                    <div className='versions-upload-bar' style={{ display: 'flex', gap: 8 }}>
                      <button className='btn-upload-version' onClick={() => { setUploadTargetPlanId(selectedPlan.id); setUploadFile(null); setUploadErrors({}); setShowUploadModal(true) }}>
                        <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' y1='3' x2='12' y2='15'/></svg>
                        Uploader une nouvelle version
                      </button>
                      {(selectedPlan.planVersions?.length ?? 0) >= 2 && (
                        <button
                          onClick={() => setShowMultiView(true)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                            borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc',
                            color: '#475569', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                        >
                          <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                            <rect x='3' y='3' width='8' height='18' rx='1'/><rect x='13' y='3' width='8' height='18' rx='1'/>
                          </svg>
                          Visualisation multiple
                        </button>
                      )}
                    </div>
                  )}
                  {!selectedPlan.planVersions || selectedPlan.planVersions.length === 0 ? (
                    <div className='plans-empty'><p>Aucune version disponible pour ce plan</p></div>
                  ) : (
                    <div className='versions-table'>
                      <div className='versions-table-header'>
                        <span>Historique des versions</span>
                        <span>{selectedPlan.planVersions.length} version{selectedPlan.planVersions.length > 1 ? 's' : ''}</span>
                      </div>
                      {[...selectedPlan.planVersions].sort((a, b) => b.versionNumber - a.versionNumber).map((version, idx, arr) => {
                        const isCurrent = version.versionNumber === selectedPlan.currentVersion
                        const isLast    = idx === arr.length - 1
                        const fc = currentFolder?.color || '#1d4ed8'
                        const fb = currentFolder?.bg    || '#eff6ff'
                        return (
                          <div key={version.id} className='version-row'
                            style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9', background: isCurrent ? `${fb}40` : 'transparent' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = isCurrent ? `${fb}80` : '#fafafa' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isCurrent ? `${fb}40` : 'transparent' }}>
                            <div className='version-file-icon'
                              onClick={() => openViewer(version, selectedPlan.name, fc, fb, selectedPlan.id, isCurrent)}
                              style={{ background: isCurrent ? fb : '#f1f5f9', color: isCurrent ? fc : '#94a3b8', border: isCurrent ? `1.5px solid ${fc}30` : '1px solid #e2e8f0' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 12px ${fc}40` }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
                              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
                            </div>
                            <div className='version-info'>
                              <div className='version-name-row'>
                                <span className='version-number'>Version {version.versionNumber}</span>
                                {isCurrent ? <span className='version-badge-current'>Actuelle</span> : <span className='version-badge-archived'>Archivée</span>}
                              </div>
                              <span className='version-filesize'>{(version.fileSize / 1024).toFixed(0)} KB</span>
                              {version.comment && <p className='version-comment'>💬 {version.comment}</p>}
                            </div>
                            <div className='version-actions'>
                              <button className='btn-open-version'
                                onClick={() => openViewer(version, selectedPlan.name, fc, fb, selectedPlan.id, isCurrent)}
                                style={{ background: isCurrent ? fb : '#f8fafc', borderColor: isCurrent ? `${fc}40` : '#e2e8f0', color: isCurrent ? fc : '#64748b' }}
                                onMouseEnter={e => { e.currentTarget.style.background = fb; e.currentTarget.style.color = fc }}
                                onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? fb : '#f8fafc'; e.currentTarget.style.color = isCurrent ? fc : '#64748b' }}>
                                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'><path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/></svg>
                                Ouvrir
                              </button>
                              <a href={`http://localhost:5279${version.filePath}`} target='_blank' rel='noopener noreferrer' className='btn-download-version'
                                style={{ background: isCurrent ? fc : '#64748b', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px', color: '#fff', textDecoration: 'none' }}>
                                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/></svg>
                                Télécharger
                              </a>
                              {perms.canDeleteVersion && (
                                <button className='btn-delete-version'
                                  onClick={e => { e.stopPropagation(); setSelectedVersion(version); setShowDeleteVersionModal(true) }} title='Supprimer cette version'>
                                  <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M9 6V4h6v2'/></svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              ) : !selectedFolder ? (
                <div className='folders-grid'>
                  {visibleFolders.map(folder => {
                    const count = folderPlans(folder.key).length
                    return (
                      <div key={folder.key} className='folder-card' onClick={() => { setSelectedFolder(folder.key); setSelectedPlan(null) }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = folder.color }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0' }}>
                        <div className='folder-icon' style={{ background: folder.bg, color: folder.color }}>{folder.icon}</div>
                        <p className='folder-label'>{folder.label}</p>
                        <p className='folder-count'>{count} plan{count !== 1 ? 's' : ''}</p>
                      </div>
                    )
                  })}
                  {perms.canSeeOtherPlans && otherPlans.length > 0 && (
                    <div className='folder-card' onClick={() => { setSelectedFolder('Autres'); setSelectedPlan(null) }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#64748b' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#e2e8f0' }}>
                      <div className='folder-icon' style={{ background: '#f1f5f9', color: '#64748b' }}>
                        <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'/></svg>
                      </div>
                      <p className='folder-label'>Autres</p>
                      <p className='folder-count'>{otherPlans.length} plan{otherPlans.length !== 1 ? 's' : ''}</p>
                    </div>
                  )}
                </div>

              ) : (
                displayedPlans.length === 0 ? (
                  <div className='plans-empty'>
                    <svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='#cbd5e1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' style={{ margin: '0 auto 16px', display: 'block' }}><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
                    <p>Aucun plan dans ce dossier</p>
                    {perms.canCreatePlan && (
                      <center><button className='btn-primary' onClick={() => { setUploadTargetPlanId(null); setUploadFile(null); setUploadErrors({}); setUploadForm(f => ({ ...f, locationId: selectedLocationForPlans!.id, category: selectedFolder && selectedFolder !== 'Autres' ? selectedFolder : '' })); setShowUploadModal(true) }}>Ajouter un plan</button></center>
                    )}
                  </div>
                ) : (
                  <div className='plans-table'>
                    {displayedPlans.map((plan, idx) => {
                      const st     = getStatusLabel(plan.status)
                      const folder = FOLDERS.find(f => f.key === selectedFolder)
                      const isLast = idx === displayedPlans.length - 1
                      const versionCount = plan.planVersions?.length || 0
                      return (
                        <div key={plan.id} className='plans-table-row' style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }} onClick={() => setSelectedPlan(plan)}>
                          <div className='plan-icon' style={{ background: folder?.bg || '#eff6ff', color: folder?.color || '#1d4ed8' }}>
                            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
                          </div>
                          <div className='plan-info'>
                            <div className='plan-name-row'>
                              <p className='plan-name'>{plan.name}</p>
                              <span className='status-badge' style={{ color: st.color, background: st.bg }}>{st.label}</span>
                            </div>
                            <div className='plan-meta-row'>
                              {plan.category && <span className='plan-category'>{plan.category}</span>}
                              <span className='plan-version-badge' style={{ color: folder?.color || '#1d4ed8', background: folder?.bg || '#eff6ff' }}>v{plan.currentVersion}</span>
                              <span className='plan-versions-count'>{versionCount} version{versionCount > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={{ flexShrink: 0 }}><polyline points='9 18 15 12 9 6'/></svg>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {section === 'notifications' && (
  <div>
    <div className='dash-greeting'>
      <h1>Notifications</h1>
      <p>Toutes vos notifications reçues.</p>
    </div>

    {/* Barre de recherche + bouton */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
      <div className='search-wrapper'>
        <svg className='search-icon' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
        </svg>
        <input
          className='search-input'
          placeholder='Rechercher par message ou date (ex: 25/05/2026)...'
          value={notifSearch}
          onChange={e => setNotifSearch(e.target.value)}
        />
      </div>

      {allNotifications.some(n => !n.isRead) && (
        <button className='notif-mark-all-btn'
          onClick={async () => {
            await notificationService.markAllAsRead()
            setAllNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
          }}>
          Tout marquer comme lu
        </button>
      )}
    </div>

    {/* Conteneur blanc */}
<div style={{
  background: '#ffffff',
  borderRadius: '12px',
  border: '0.5px solid #e5e7eb',
  padding: '20px',
  marginTop: '16px'
}}>
  {allNotifications.length === 0 ? (
    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Aucune notification</p>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {(() => {
        const q = notifSearch.toLowerCase().trim()
        const matches = (n: typeof allNotifications[0]) => {
          if (!q) return true
          return (n.message ?? '').toLowerCase().includes(q) ||
            new Date(n.createdAt).toLocaleString('fr-FR').toLowerCase().includes(q)
        }
        const unread = allNotifications.filter(n => !n.isRead && matches(n))
        const read   = allNotifications.filter(n =>  n.isRead && matches(n))
        const noResult = q && unread.length === 0 && read.length === 0

        const iconCircle = (isUnread: boolean) => (
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
            background: isUnread ? '#dbeafe' : '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none'
              stroke={isUnread ? '#3b82f6' : '#94a3b8'} strokeWidth='2'
              strokeLinecap='round' strokeLinejoin='round'>
              <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'/>
              <path d='M13.73 21a2 2 0 0 1-3.46 0'/>
            </svg>
          </div>
        )

        return (
          <>
            {/* Non lues */}
            {unread.length > 0 && (
              <>
                <div style={{
                  fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
                  color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 8px'
                }}>Non lues</div>

                {unread.map(n => (
                  <div key={n.id}
                    onClick={async () => {
                      await notificationService.markAsRead(n.id)
                      setAllNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x))
                    }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '14px 16px', borderRadius: '10px', marginBottom: '8px',
                      background: '#eff6ff', border: '0.5px solid #bfdbfe', cursor: 'pointer'
                    }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      {iconCircle(true)}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '3px' }}>
                          {n.message ?? ''}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                          <span style={{
                            fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px',
                            background: '#dbeafe', color: '#1d4ed8'
                          }}>Non lue</span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {new Date(n.createdAt).toLocaleString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={async e => {
                      e.stopPropagation()
                      await notificationService.deleteNotification(n.id)
                      setAllNotifications(prev => prev.filter(x => x.id !== n.id))
                    }} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#ef4444', fontSize: '18px', padding: '2px 6px',
                      borderRadius: '6px', lineHeight: 1, opacity: 0.7
                    }}>×</button>
                  </div>
                ))}
              </>
            )}

            {/* Lues */}
            {read.length > 0 && (
              <>
                <div style={{
                  fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
                  color: '#94a3b8', textTransform: 'uppercase', margin: '12px 0 8px'
                }}>Lues</div>

                {read.map(n => (
                  <div key={n.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '14px 16px', borderRadius: '10px', marginBottom: '8px',
                      background: '#f9fafb', border: '0.5px solid #e5e7eb'
                    }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      {iconCircle(false)}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 400, color: '#475569', marginBottom: '3px' }}>
                          {n.message ?? ''}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                          <span style={{
                            fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px',
                            background: '#f1f5f9', color: '#64748b'
                          }}>Lue</span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {new Date(n.createdAt).toLocaleString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Aucun résultat */}
            {noResult && (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                Aucune notification trouvée pour « {notifSearch} »
              </p>
            )}
          </>
        )
      })()}
    </div>
  )}
</div>
  </div>
)}

        </main>
        
      </div>

      {/* ══ MODALS ══ */}

      {showAddProjectModal && perms.canCreateProject && (
        <div className='modal-overlay' onClick={e => { if (e.target === e.currentTarget) { setShowAddProjectModal(false); setProjectErrors({}) } }}>
          <div className='modal-box'>
            <h2 className='modal-title'>Nouveau projet</h2>
            <div className='modal-form'>
              <div className='modal-field'>
                <label>Nom du projet</label>
                <input className={`modal-input ${projectErrors.name ? 'error' : ''}`} placeholder='Ex: Résidence Les Pins' value={newProject.name}
                  onChange={e => { setNewProject(p => ({ ...p, name: e.target.value })); setProjectErrors(p => ({ ...p, name: '' })) }} />
                {projectErrors.name && <p className='modal-field-error'>⚠ {projectErrors.name}</p>}
              </div>
              <div className='modal-field'>
                <label>Description</label>
                <textarea className='modal-textarea' placeholder='Description du projet...' value={newProject.description}
                  onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className='modal-field'>
                <label>Statut initial</label>
                <select className='modal-select' value={newProject.status} onChange={e => setNewProject(p => ({ ...p, status: e.target.value }))}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getStatusLabel(s).label}</option>)}
                </select>
              </div>
            </div>
            <div className='modal-footer'>
              <button className='btn-cancel' onClick={() => { setShowAddProjectModal(false); setProjectErrors({}); setNewProject({ name: '', description: '', status: 'Planning' }) }}>Annuler</button>
              <button className='btn-confirm' onClick={handleCreateProject} disabled={actionLoading}>{actionLoading ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteProjectModal && selectedProject && perms.canDeleteProject && (
        <div className='modal-overlay' onClick={e => { if (e.target === e.currentTarget) setShowDeleteProjectModal(false) }}>
          <div className='modal-box md'>
            <div className='modal-danger-icon'>
              <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/></svg>
            </div>
            <h2 className='modal-title centered'>Supprimer le projet</h2>
            <p className='modal-subtitle'>Supprimer <strong>{selectedProject.name}</strong> ? Cette action est irréversible.</p>
            <div className='modal-footer'>
              <button className='btn-cancel' onClick={() => setShowDeleteProjectModal(false)}>Annuler</button>
              <button className='btn-danger-confirm' onClick={handleDeleteProject} disabled={actionLoading}>{actionLoading ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {showEditStatusModal && selectedProject && perms.canEditProject && (
        <div className='modal-overlay' onClick={e => { if (e.target === e.currentTarget) setShowEditStatusModal(false) }}>
          <div className='modal-box sm'>
            <h2 className='modal-title' style={{ marginBottom: 8 }}>Changer le statut</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>{selectedProject.name}</p>
            <div className='modal-form'>
              {STATUS_OPTIONS.map(s => {
                const st = getStatusLabel(s)
                return (
                  <button key={s} className='status-option-btn' onClick={() => setEditStatus(s)}
                    style={{ border: editStatus === s ? `2px solid ${st.color}` : '1px solid #e2e8f0', background: editStatus === s ? st.bg : '#fafafa' }}>
                    <div className='status-option-dot' style={{ background: st.color }} />
                    <span style={{ fontSize: 13, fontWeight: editStatus === s ? 700 : 500, color: editStatus === s ? st.color : '#64748b' }}>{st.label}</span>
                    {editStatus === s && <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke={st.color} strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' style={{ marginLeft: 'auto' }}><path d='M20 6L9 17l-5-5'/></svg>}
                  </button>
                )
              })}
            </div>
            <div className='modal-footer'>
              <button className='btn-cancel' onClick={() => setShowEditStatusModal(false)}>Annuler</button>
              <button className='btn-confirm' onClick={handleUpdateStatus} disabled={actionLoading}>{actionLoading ? 'Enregistrement...' : 'Sauvegarder'}</button>
            </div>
          </div>
        </div>
      )}

      {showAddLocationModal && perms.canCreateLocation && (
        <div className='modal-overlay' onClick={e => { if (e.target === e.currentTarget) { setShowAddLocationModal(false); setLocationErrors({}) } }}>
          <div className='modal-box'>
            <h2 className='modal-title'>{parentLocation ? `Ajouter sous « ${parentLocation.name} »` : 'Nouvelle localisation racine'}</h2>
            <div className='modal-form'>
              <div className='modal-field'>
                <label>Nom</label>
                <input className={`modal-input ${locationErrors.name ? 'error' : ''}`} placeholder='Ex: Bâtiment A, Salle 101...' value={newLocation.name}
                  onChange={e => { setNewLocation(p => ({ ...p, name: e.target.value })); setLocationErrors(p => ({ ...p, name: '' })) }} />
                {locationErrors.name && <p className='modal-field-error'>⚠ {locationErrors.name}</p>}
              </div>
              <div className='modal-field'>
                <label>Type</label>
                <select className='modal-select' value={newLocation.type} onChange={e => setNewLocation(p => ({ ...p, type: e.target.value }))}>
                  {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className='modal-footer'>
              <button className='btn-cancel' onClick={() => { setShowAddLocationModal(false); setLocationErrors({}); setParentLocation(null) }}>Annuler</button>
              <button className='btn-confirm' onClick={handleAddLocation} disabled={actionLoading}>{actionLoading ? 'Création...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteLocationModal && selectedLocation && perms.canDeleteLocation && (
        <div className='modal-overlay' onClick={e => { if (e.target === e.currentTarget) setShowDeleteLocationModal(false) }}>
          <div className='modal-box md'>
            <h2 className='modal-title centered'>Supprimer la localisation</h2>
            <p className='modal-subtitle' style={{ marginBottom: 8 }}>Supprimer <strong>{selectedLocation.name}</strong> ?</p>
            <p className='modal-warn-box'>⚠ Impossible de supprimer une localisation ayant des enfants.</p>
            <div className='modal-footer'>
              <button className='btn-cancel' onClick={() => setShowDeleteLocationModal(false)}>Annuler</button>
              <button className='btn-danger-confirm' onClick={handleDeleteLocation} disabled={actionLoading}>{actionLoading ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {showAddMemberModal && perms.canAddMember && (
        <div className='modal-overlay' onClick={e => { if (e.target === e.currentTarget) { setShowAddMemberModal(false); setMemberEmail(''); setMemberEmailError('') } }}>
          <div className='modal-box md'>
            <h2 className='modal-title' style={{ marginBottom: 8 }}>Ajouter un membre</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>Entrez l'adresse email du membre à ajouter au projet.</p>
            <div className='modal-form'>
              <div className='modal-field'>
                <label>Adresse email</label>
                <div className='email-input-wrapper'>
                  <svg className='email-input-icon' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'/><polyline points='22,6 12,13 2,6'/></svg>
                  <input type='email' className={`email-input ${memberEmailError ? 'error' : ''}`} placeholder='exemple@email.com' value={memberEmail}
                    onChange={e => { setMemberEmail(e.target.value); setMemberEmailError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddMemberByEmail() }} autoFocus />
                </div>
                {memberEmailError && <p className='modal-field-error'>⚠ {memberEmailError}</p>}
              </div>
            </div>
            <div className='modal-footer'>
              <button className='btn-cancel' onClick={() => { setShowAddMemberModal(false); setMemberEmail(''); setMemberEmailError('') }}>Annuler</button>
              <button className='btn-confirm' onClick={handleAddMemberByEmail} disabled={!memberEmail.trim() || actionLoading}
                style={{ opacity: memberEmail.trim() ? 1 : 0.5, cursor: memberEmail.trim() ? 'pointer' : 'not-allowed' }}>
                {actionLoading ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteMemberModal && selectedMember && perms.canRemoveMember && (
        <div className='modal-overlay' onClick={e => { if (e.target === e.currentTarget) setShowDeleteMemberModal(false) }}>
          <div className='modal-box md'>
            <h2 className='modal-title centered'>Retirer le membre</h2>
            <p className='modal-subtitle'>Retirer <strong>{selectedMember.name}</strong> du projet ?</p>
            <div className='modal-footer'>
              <button className='btn-cancel' onClick={() => setShowDeleteMemberModal(false)}>Annuler</button>
              <button className='btn-danger-confirm' onClick={handleRemoveMember} disabled={actionLoading}>{actionLoading ? 'Suppression...' : 'Retirer'}</button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (perms.canCreatePlan || perms.canCreateVersion) && (
        <div className='modal-overlay' onClick={e => { if (e.target === e.currentTarget) { setShowUploadModal(false); setUploadErrors({}); setUploadFile(null); setUploadTargetPlanId(null) } }}>
          <div className='modal-box lg'>
            <h2 className='modal-title' style={{ marginBottom: uploadTargetPlanId ? 8 : 24 }}>
              {uploadTargetPlanId ? 'Nouvelle version' : 'Uploader un plan'}
            </h2>
            {uploadTargetPlanId && (
              <p className='upload-info-box'>
                Une nouvelle version sera ajoutée au plan <strong>{selectedPlan?.name || displayedPlans.find(p => p.id === uploadTargetPlanId)?.name || '—'}</strong>.
              </p>
            )}
            <div className='modal-form'>
              {!uploadTargetPlanId && (
                <>
                  <div className='modal-field'>
                    <label>Nom du plan</label>
                    <input className={`modal-input ${uploadErrors.name ? 'error' : ''}`} placeholder='Ex: Plan électrique RDC' value={uploadForm.name}
                      onChange={e => { setUploadForm(p => ({ ...p, name: e.target.value })); setUploadErrors(p => ({ ...p, name: '' })) }} />
                    {uploadErrors.name && <p className='modal-field-error'>⚠ {uploadErrors.name}</p>}
                  </div>
                  <div className='modal-field'>
                    <label>Localisation</label>
                    <select className={`modal-select ${uploadErrors.location ? 'error' : ''}`} value={uploadForm.locationId || ''}
                      onChange={e => { setUploadForm(p => ({ ...p, locationId: Number(e.target.value) })); setUploadErrors(p => ({ ...p, location: '' })) }}>
                      <option value=''>-- Choisir une localisation --</option>
                      {flattenLocations(locationTree).map(({ loc, depth }) => (
                        <option key={loc.id} value={loc.id}>{'　'.repeat(depth)}{loc.name}</option>
                      ))}
                    </select>
                    {uploadErrors.location && <p className='modal-field-error'>⚠ {uploadErrors.location}</p>}
                  </div>
                  <div className='modal-grid-2'>
                    <div className='modal-field'>
                      <label>Catégorie</label>
                      <input className='modal-input' placeholder='Ex: Électrique' value={uploadForm.category}
                        onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))} />
                    </div>
                    <div className='modal-field'>
                      <label>Statut</label>
                      <select className='modal-select' value={uploadForm.status} onChange={e => setUploadForm(p => ({ ...p, status: e.target.value }))}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getStatusLabel(s).label}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
              <div className='modal-field'>
                <label>Fichier</label>
                <label className='file-drop-label'
                  style={{ border: uploadErrors.file ? '2px dashed #ef4444' : '2px dashed #93C5FD', background: uploadFile ? '#eff6ff' : '#fafafa' }}>
                  <input type='file' style={{ display: 'none' }} onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadErrors(p => ({ ...p, file: '' })) }} />
                  {uploadFile ? (
                    <>
                      <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>{uploadFile.name}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{(uploadFile.size / 1024).toFixed(0)} KB</span>
                    </>
                  ) : (
                    <>
                      <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='17 8 12 3 7 8'/><line x1='12' y1='3' x2='12' y2='15'/></svg>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Cliquez pour choisir un fichier</span>
                    </>
                  )}
                </label>
                {uploadErrors.file && <p className='modal-field-error'>⚠ {uploadErrors.file}</p>}
              </div>
            </div>
            <div className='modal-footer'>
              <button className='btn-cancel' onClick={() => { setShowUploadModal(false); setUploadErrors({}); setUploadFile(null); setUploadTargetPlanId(null) }}>Annuler</button>
              <button className='btn-confirm' onClick={handleUploadPlan} disabled={uploadLoading} style={{ cursor: uploadLoading ? 'not-allowed' : 'pointer' }}>
                {uploadLoading ? 'Upload...' : uploadTargetPlanId ? 'Ajouter la version' : 'Uploader'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteVersionModal && selectedVersion && perms.canDeleteVersion && (
        <div className='modal-overlay' onClick={e => { if (e.target === e.currentTarget) setShowDeleteVersionModal(false) }}>
          <div className='modal-box md'>
            <div className='modal-danger-icon'>
              <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4h6v2'/></svg>
            </div>
            <h2 className='modal-title centered'>Supprimer la version</h2>
            <p className='modal-subtitle'>Supprimer la <strong>version {selectedVersion.versionNumber}</strong> du plan <strong>{selectedPlan?.name}</strong> ?</p>
            {selectedVersion.versionNumber === selectedPlan?.currentVersion && (
              <p className='modal-warn-box'>⚠ C'est la version actuelle. La version précédente deviendra la version actuelle.</p>
            )}
            {selectedPlan?.planVersions?.length === 1 && (
              <p className='modal-warn-box' style={{ borderColor: '#ef4444', background: '#fff1f2', color: '#ef4444' }}>⚠ C'est la seule version. Le plan n'aura plus de version après cette suppression.</p>
            )}
            <div className='modal-footer'>
              <button className='btn-cancel' onClick={() => { setShowDeleteVersionModal(false); setSelectedVersion(null) }}>Annuler</button>
              <button className='btn-danger-confirm' onClick={handleDeleteVersion} disabled={actionLoading}>{actionLoading ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  )
  
}