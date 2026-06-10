import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, removeToken, decodeToken } from '../utils/tokenUtils'
import { planService } from '../services/Planservice'
import type { Plan, PlanVersion } from '../services/Planservice'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import * as fabric from 'fabric'
import { PDFDocument } from "pdf-lib"
import DXFWriter from "dxf-writer"


// â”€â”€ PDF.js worker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

// â”€â”€ TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


// â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BASE_URL = 'http://localhost:5279/api'
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` })

const getRoleName = (role: string | { name: string }): string => {
  if (!role) return 'â€”'
  if (typeof role === 'string') return role
  return role.name || 'â€”'
}

const getStatusLabel = (status: string) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    Active:    { label: 'Actif',    color: '#16a34a', bg: '#f0fdf4' },
    Completed: { label: 'Terminأ©',  color: '#1d4ed8', bg: '#eff6ff' },
    OnHold:    { label: 'En pause', color: '#d97706', bg: '#fffbeb' },
    Cancelled: { label: 'Annulأ©',   color: '#ef4444', bg: '#fff1f2' },
    Planning:  { label: 'Planifiأ©', color: '#7c3aed', bg: '#fdf4ff' },
  }
  return map[status] || { label: status || 'â€”', color: '#64748b', bg: '#f1f5f9' }
}

const LOCATION_TYPES = ['Bloc', 'أ‰tage', 'Appartement', 'Zone']
const STATUS_OPTIONS  = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled']
type Section = 'dashboard' | 'projects' | 'plans'


interface PdfViewerModalProps {
  version: PlanVersion
  planName: string
  planId: number
  folderColor: string
  folderBg: string
  onClose: () => void
  onSaved?: () => void
  isCurrentVersion: boolean 
}


type AnnotTool = 'select' | 'pen' | 'line' | 'rect' | 'circle' | 'text' | 'eraser'

export function PdfViewerModal({
  version, planName, planId, folderColor, folderBg, onClose, onSaved, isCurrentVersion,
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

  const canvasElRef     = useRef<HTMLCanvasElement | null>(null)
  const fcRef           = useRef<fabric.Canvas | null>(null)
  const savedRef        = useRef<Record<number, string>>({})
  const isDrawingRef    = useRef(false)
  const originRef       = useRef<fabric.Point | null>(null)
  const activeShapeRef  = useRef<fabric.Object | null>(null)

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Reset pageSize when page or scale changes so Fabric reinitialises after render
  useEffect(() => {
    if (fcRef.current) {
      savedRef.current[pageNumber] = JSON.stringify(fcRef.current.toJSON())
      fcRef.current.dispose()
      fcRef.current = null
    }
    setPageSize(null)
  }, [pageNumber, scale])

  // Initialise Fabric only for current version
  useEffect(() => {
    if (!pageSize || !isPdf || !isCurrentVersion) return
    if (!canvasElRef.current) return

    if (fcRef.current) {
      savedRef.current[pageNumber] = JSON.stringify(fcRef.current.toJSON())
      fcRef.current.dispose()
      fcRef.current = null
    }

    const fc = new fabric.Canvas(canvasElRef.current, {
      isDrawingMode: false,
      selection: false,
      width: pageSize.w,
      height: pageSize.h,
      backgroundColor: 'transparent',
    })

    const wrapper = canvasElRef.current.parentElement
    if (wrapper && wrapper.classList.contains('canvas-container')) {
      Object.assign(wrapper.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: `${pageSize.w}px`,
        height: `${pageSize.h}px`,
        pointerEvents: 'none',
      })
      const upper = wrapper.querySelector('.upper-canvas') as HTMLElement | null
      if (upper) {
        Object.assign(upper.style, {
          position: 'absolute',
          top: '0',
          left: '0',
          pointerEvents: 'auto',
        })
      }
    }

    fcRef.current = fc

    const saved = savedRef.current[pageNumber]
    if (saved) {
      fc.loadFromJSON(JSON.parse(saved)).then(() => fc.renderAll())
    }

    setupTool(fc)

    return () => {
      if (fcRef.current) {
        savedRef.current[pageNumber] = JSON.stringify(fcRef.current.toJSON())
        fcRef.current.dispose()
        fcRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, isPdf, isCurrentVersion])

  // Re-apply tool settings without rebuilding the canvas
  useEffect(() => {
    if (fcRef.current) setupTool(fcRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      fc.isDrawingMode    = true
      fc.freeDrawingBrush = new fabric.PencilBrush(fc)
      fc.freeDrawingBrush.color = color
      fc.freeDrawingBrush.width = strokeWidth
      fc.on('path:created', (opt) => {
        const path = opt.path
        path.set({ selectable: true, evented: true, hasControls: false, lockMovementX: true, lockMovementY: true })
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
          left: p.x, top: p.y,
          fontSize: 18, fill: color,
          fontFamily: 'sans-serif',
          selectable: true, evented: true,
        })
        fc.add(txt)
        fc.setActiveObject(txt)
        txt.enterEditing()
        fc.renderAll()
      })
      return
    }

    fc.on('mouse:down', (opt) => {
      if (opt.target) return
      isDrawingRef.current = true
      originRef.current    = opt.scenePoint
      const p = opt.scenePoint
      let shape: fabric.Object

      if (tool === 'line') {
        shape = new fabric.Line([p.x, p.y, p.x, p.y], {
          stroke: color, strokeWidth, strokeLineCap: 'round',
          selectable: false, evented: false, hasControls: true,
        })
      } else if (tool === 'rect') {
        shape = new fabric.Rect({
          left: p.x, top: p.y, width: 0, height: 0,
          stroke: color, strokeWidth, fill: 'transparent',
          selectable: false, evented: false, hasControls: true,
        })
      } else {
        shape = new fabric.Ellipse({
          left: p.x, top: p.y, rx: 0, ry: 0,
          stroke: color, strokeWidth, fill: 'transparent',
          selectable: false, evented: false, hasControls: true,
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
        ;(activeShapeRef.current as fabric.Line).set({ x2: p.x, y2: p.y })
      } else if (tool === 'rect') {
        ;(activeShapeRef.current as fabric.Rect).set({
          left: Math.min(p.x, ox), top: Math.min(p.y, oy),
          width: Math.abs(p.x - ox), height: Math.abs(p.y - oy),
        })
      } else {
        ;(activeShapeRef.current as fabric.Ellipse).set({
          left: Math.min(p.x, ox), top: Math.min(p.y, oy),
          rx: Math.abs(p.x - ox) / 2, ry: Math.abs(p.y - oy) / 2,
        })
      }
      fc.renderAll()
    })

    fc.on('mouse:up', () => {
      if (activeShapeRef.current) {
        activeShapeRef.current.set({ selectable: true, evented: true, hasControls: true })
        fc.renderAll()
      }
      isDrawingRef.current   = false
      originRef.current      = null
      activeShapeRef.current = null
    })
  }

  function clearPage() {
    if (!fcRef.current) return
    const active = fcRef.current.getActiveObject()
    if (active) {
      fcRef.current.remove(active)
      fcRef.current.discardActiveObject()
      fcRef.current.renderAll()
      savedRef.current[pageNumber] = JSON.stringify(fcRef.current.toJSON())
    }
  }

  function undo() {
    if (!fcRef.current) return
    const objs = fcRef.current.getObjects()
    if (objs.length > 0) {
      fcRef.current.remove(objs[objs.length - 1])
      fcRef.current.renderAll()
    }
  }

  const handleSaveAnnotations = async () => {
    if (!fcRef.current) return

    setSaving(true)

    try {
      const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer())
      const pdfDoc = await PDFDocument.load(existingPdfBytes)
      const pages = pdfDoc.getPages()

      savedRef.current[pageNumber] = JSON.stringify(fcRef.current.toJSON())

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const saved = savedRef.current[i + 1]
        if (!saved) continue

        const canvasEl = document.createElement("canvas")
        const tempCanvas = new fabric.StaticCanvas(canvasEl, {
          width: page.getWidth(),
          height: page.getHeight()
        })

        await tempCanvas.loadFromJSON(JSON.parse(saved))
        tempCanvas.renderAll()

        const dataUrl = tempCanvas.toDataURL({
          format: 'png',
          multiplier: 1
        })

        const pngImage = await pdfDoc.embedPng(dataUrl)

        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: page.getWidth(),
          height: page.getHeight()
        })
      }

      const pdfBytes = await pdfDoc.save()
      const buffer = new Uint8Array(pdfBytes).buffer
      const blob = new Blob([buffer], { type: "application/pdf" })
      const file = new File(
        [blob],
        `annotated_v${version.versionNumber}.pdf`,
        { type: "application/pdf" }
      )

      await planService.addVersion(planId, file, comment)

      onSaved?.()
      onClose()
    } catch (e) {
      console.error("Erreur PDF annotations", e)
    } finally {
      setSaving(false)
    }
  }

  const downloadDXF = async () => {
    if (!fcRef.current) return;
    const dxf = new DXFWriter();
    const objects = fcRef.current.getObjects();

    objects.forEach(obj => {
      switch (obj.type) {
        case "line": {
          const { x1, y1, x2, y2 } = obj as any;
          dxf.drawLine(x1, y1, x2, y2);
          break;
        }
        case "rect": {
          const { left, top, width, height } = obj as any;
          dxf.drawLine(left, top, left + width, top);
          dxf.drawLine(left + width, top, left + width, top + height);
          dxf.drawLine(left + width, top + height, left, top + height);
          dxf.drawLine(left, top + height, left, top);
          break;
        }
        case "circle": {
          const { left, top, radius } = obj as any;
          const cx = left + radius;
          const cy = top + radius;
          dxf.drawCircle(cx, cy, radius);
          break;
        }
      }
    });

    const blob = new Blob([dxf.toDxfString()], { type: "application/dxf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "plan.dxf";
    link.click();
  };

  const TOOLS: { id: AnnotTool; title: string; icon: React.ReactElement }[] = [
    { id: 'select', title: 'Sأ©lection',   icon: <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M5 3l14 9-7 1-4 7z'/></svg> },
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.9)', display: 'flex', flexDirection: 'column' }}>

      {/* â”€â”€ TOP BAR â”€â”€ */}
      <div style={{ height: 56, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: folderBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: folderColor, flexShrink: 0 }}>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{planName}</p>
          <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>v{version.versionNumber} آ· {(version.fileSize / 1024).toFixed(0)} KB{!isCurrentVersion && ' آ· Archivأ©e'}</p>
        </div>
        <div style={{ width: 1, height: 28, background: '#e2e8f0', margin: '0 4px' }} />

        {isPdf && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', opacity: pageNumber <= 1 ? 0.4 : 1 }}>
              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
            </button>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, minWidth: 60, textAlign: 'center' }}>{pageNumber} / {numPages || 'â€¦'}</span>
            <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', opacity: pageNumber >= numPages ? 0.4 : 1 }}>
              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='9 18 15 12 9 6'/></svg>
            </button>
          </div>
        )}

        {isPdf && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setScale(s => Math.max(0.5, +(s - 0.15).toFixed(2)))}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 16, fontWeight: 700, lineHeight: 1 }}>âˆ’</button>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, minWidth: 42, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, +(s + 0.15).toFixed(2)))}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</button>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Badge version archivأ©e */}
        {!isCurrentVersion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 7, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><rect x='3' y='11' width='18' height='11' rx='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg>
            Lecture seule
          </div>
        )}

        {isPdf && isCurrentVersion && (
          <button onClick={handleSaveAnnotations} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: `1px solid ${folderColor}40`, background: folderBg, color: folderColor, fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}
            onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.background = folderColor; e.currentTarget.style.color = '#fff' } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = folderBg; e.currentTarget.style.color = folderColor }}>
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'/><polyline points='17 21 17 13 7 13 7 21'/><polyline points='7 3 7 8 15 8'/></svg>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        )}

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7,
              border: `1px solid ${folderColor}40`, background: folderBg, color: folderColor,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = folderColor; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = folderBg; e.currentTarget.style.color = folderColor }}
          >
            <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/>
            </svg>
            Tأ©lأ©charger
          </button>

          {showMenu && (
            <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #ccc', borderRadius: 5, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 10, width: 120 }}>
              <div style={{ padding: '8px', cursor: 'pointer' }} onClick={() => window.open(pdfUrl, '_blank')}>PDF</div>
              {isCurrentVersion && (
                <div style={{ padding: '8px', cursor: 'pointer' }} onClick={() => { downloadDXF(); setShowMenu(false) }}>DWG</div>
              )}
            </div>
          )}
        </div>

        <button onClick={onClose}
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#ef4444' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b' }}
          title='Fermer (أ‰chap)'>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
        </button>
      </div>

      {/* â”€â”€ BODY â”€â”€ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {isPdf ? (
          <>
            {/* â”€â”€ ANNOTATION TOOLBAR â€” current version only â”€â”€ */}
            {isCurrentVersion && (
              <div style={{ width: 52, background: '#1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 4, flexShrink: 0 }}>
                {TOOLS.map(t => (
                  <button key={t.id} onClick={() => setTool(t.id)} title={t.title}
                    style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: tool === t.id ? folderColor : 'transparent', color: tool === t.id ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { if (tool !== t.id) e.currentTarget.style.background = '#334155' }}
                    onMouseLeave={e => { if (tool !== t.id) e.currentTarget.style.background = 'transparent' }}>
                    {t.icon}
                  </button>
                ))}
                <div style={{ width: 28, height: 1, background: '#334155', margin: '6px 0' }} />
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} title={c}
                    style={{ width: 22, height: 22, borderRadius: '50%', border: color === c ? '2px solid #fff' : '2px solid transparent', background: c, cursor: 'pointer', flexShrink: 0, boxShadow: color === c ? `0 0 0 2px ${c}` : 'none', marginBottom: 2 }} />
                ))}
                <div style={{ width: 28, height: 1, background: '#334155', margin: '6px 0' }} />
                {STROKE_WIDTHS.map(w => (
                  <button key={w} onClick={() => setStrokeWidth(w)} title={`أ‰paisseur ${w}`}
                    style={{ width: 36, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer', background: strokeWidth === w ? '#334155' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 20, height: Math.min(w, 8), background: '#94a3b8', borderRadius: 2 }} />
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <button onClick={undo} title='Annuler le dernier trait'
                  style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='9 14 4 9 9 4'/><path d='M20 20v-7a4 4 0 0 0-4-4H4'/></svg>
                </button>
                <button onClick={clearPage} title='Effacer toutes les annotations'
                  style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#f87171' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8' }}>
                  <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14H6L5 6'/><path d='M9 6V4h6v2'/></svg>
                </button>
              </div>
            )}

            {/* â”€â”€ PDF + CANVAS â”€â”€ */}
            <div style={{ flex: 1, overflow: 'auto', background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px' }}>
              <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>

                {/* PDF page */}
                <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    onRenderSuccess={(page) => {
                      const vp = page.getViewport({ scale })
                      const w  = Math.round(vp.width)
                      const h  = Math.round(vp.height)
                      setPageSize(prev => (prev?.w === w && prev?.h === h ? prev : { w, h }))
                    }}
                  />
                </Document>

                {/* Fabric annotation canvas â€” current version only */}
                {pageSize && isCurrentVersion && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: pageSize.w,
                      height: pageSize.h,
                    }}
                  >
                    <canvas
                      ref={canvasElRef}
                      width={pageSize.w}
                      height={pageSize.h}
                    />
                  </div>
                )}
              </div>

              {/* â”€â”€ RIGHT PANEL â”€â”€ */}
              {isCurrentVersion ? (
                /* Annotation comment panel */
                <div style={{
                  position: 'absolute',
                  top: 80,
                  right: 30,
                  width: 272,
                  background: '#fff',
                  borderLeft: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px 16px',
                  gap: 12,
                  boxSizing: 'border-box',
                  zIndex: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#7c3aed' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/>
                      </svg>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Commentaire</span>
                  </div>

                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                    Ce commentaire sera enregistrأ© avec la nouvelle version annotأ©e.
                  </p>

                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Dأ©crivez les modifications apportأ©es..."
                    style={{
                      width: '100%', padding: '10px 12px', fontSize: 13,
                      border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none',
                      color: '#0f172a', background: '#f8fafc', resize: 'none',
                      fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />

                  <div style={{
                    padding: '10px 12px', background: '#f8fafc', borderRadius: 8,
                    border: '1px solid #e2e8f0', fontSize: 11, color: '#64748b', lineHeight: 1.5, flexShrink: 0,
                  }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Version actuelle</div>
                    <div>v{version.versionNumber} آ· {(version.fileSize / 1024).toFixed(0)} KB</div>
                    <div style={{ marginTop: 4, color: '#94a3b8' }}>Prochaine version : v{version.versionNumber + 1}</div>
                  </div>

                  
                </div>
              ) : (
                /* Archived version info panel */
                <div style={{
                  position: 'absolute',
                  top: 80,
                  right: 30,
                  width: 272,
                  background: '#fff',
                  borderLeft: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px 16px',
                  gap: 12,
                  boxSizing: 'border-box',
                  zIndex: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <rect x='3' y='11' width='18' height='11' rx='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/>
                      </svg>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Version archivأ©e</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                    Les annotations et commentaires sont disponibles uniquement pour la version actuelle.
                  </p>
                  {version.comment && (
                    <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Commentaire</div>
                      <p style={{ margin: 0, fontSize: 12, color: '#0f172a', lineHeight: 1.5, fontStyle: 'italic' }}>
                        ًں’¬ {version.comment}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Non-PDF file fallback */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f8fafc' }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: folderBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: folderColor }}>
              <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/></svg>
            </div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Aperأ§u non disponible</p>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Ce type de fichier ({version.fileType?.split('/')[1]?.toUpperCase() || 'inconnu'}) ne peut pas أھtre affichأ© directement.
            </p>
            <a href={pdfUrl} target='_blank' rel='noopener noreferrer'
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 9, background: folderColor, color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginTop: 8 }}>
              <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><polyline points='7 10 12 15 17 10'/><line x1='12' y1='15' x2='12' y2='3'/></svg>
              Tأ©lأ©charger le fichier
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
