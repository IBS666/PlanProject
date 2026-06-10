from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import os
import tempfile
import logging
import base64
import httpx
import json
from dotenv import load_dotenv


load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Plan Diff Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5279", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config VLM ──────────────────────────────────────────────────────────────
HF_TOKEN = os.environ.get("HF_TOKEN", "")
print(f"HF_TOKEN chargé : {'✅ oui' if HF_TOKEN else '❌ NON'} ({HF_TOKEN[:8]}...)")

HF_API_URL = (
    "https://router.huggingface.co/v1/chat/completions"
   
)

QWEN_MODEL = "Qwen/Qwen2.5-VL-72B-Instruct"

VLM_ENABLED = bool(HF_TOKEN)

if not VLM_ENABLED:
    logger.warning("⚠ HF_TOKEN non définie — fallback sur heuristiques CV")
else:
    logger.info(f"✅ VLM activé : {QWEN_MODEL} via Hugging Face API")

# ── Couleurs Fabric.js ──────────────────────────────────────────────────────
FABRIC_COLORS_HEX = ['#e53e3e', '#d97706', '#16a34a', '#2563eb', '#7c3aed', '#db2777', '#0891b2']
_FABRIC_COLORS_RGB = np.array([
    [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]
    for h in FABRIC_COLORS_HEX
], dtype=np.float32)
_COLOR_NAMES = ['rouge', 'orange', 'vert', 'bleu', 'violet', 'rose', 'cyan']

CHANGE_TYPES = {
    'ANNOTATION_AJOUTEE':   'Annotation ajoutée',
    'ANNOTATION_SUPPRIMEE': 'Annotation supprimée',
    'ZONE_MODIFIEE':        'Zone modifiée',
    'ELEMENT_AJOUTE':       'Élément ajouté',
    'ELEMENT_SUPPRIME':     'Élément supprimé',
    'ELEMENT_DEPLACE':      'Élément déplacé',
    'ELEMENT_MODIFIE':      'Élément modifié',
    'COTE_MODIFIEE':        'Cote modifiée',
    'TEXTE_MODIFIE':        'Texte modifié',
}

DEBUG_DIR = os.path.join(tempfile.gettempdir(), "plan_diff_debug")
os.makedirs(DEBUG_DIR, exist_ok=True)



# ── Paramètres détection (logique notebook) ─────────────────────────────────
DIFF_THRESHOLD    = 20   # seuil absdiff (identique au notebook)
BLUR_KSIZE        = 3    # flou gaussien avant seuillage
MORPH_CLOSE_SIZE  = 9    # kernel morpho close
MORPH_DILATE_SIZE = 9    # kernel morpho dilate
MIN_BBOX_AREA     = 200  # aire min d'un contour (px²)
BBOX_PADDING      = 10   # padding bbox (notebook = 10)   # padding autour de chaque bbox


# ── Décodage image ──────────────────────────────────────────────────────────
def decode_png(data: bytes) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_UNCHANGED)
    if img is None:
        return None
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.shape[2] == 4:
        bgr   = img[:, :, :3].astype(np.float32)
        alpha = img[:, :, 3:4].astype(np.float32) / 255.0
        white = np.full_like(bgr, 255)
        img   = (bgr * alpha + white * (1 - alpha)).astype(np.uint8)
    return img


def roi_to_base64(img_bgr: np.ndarray) -> str:
    """Encode en PNG base64. Convertit BGR→RGB comme le notebook (matplotlib/PIL = RGB)."""
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    _, buf = cv2.imencode(".png", img_rgb)
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def extract_roi(img: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    """Crop exact — identique au notebook : img[y:y+h, x:x+w], sans padding ni resize."""
    return img[y:y+h, x:x+w]


# ── Détection des régions différentes — logique notebook ────────────────────
def compute_absdiff_regions(img1_bgr: np.ndarray,
                             img2_bgr: np.ndarray) -> dict:
    """
    Pipeline directement issu du notebook Colab :
      1. absdiff  →  cvtColor GRAY
      2. threshold(DIFF_THRESHOLD)
      3. GaussianBlur  (optionnel, réduit le bruit)
      4. MORPH_CLOSE + dilate
      5. findContours  →  bboxes avec padding

    Retourne {"bboxes": [(type, x, y, w, h), ...], "mask": mask_clean}
    """
    # ── 1. Différence absolue en niveaux de gris
    diff_bgr  = cv2.absdiff(img1_bgr, img2_bgr)
    diff_gray = cv2.cvtColor(diff_bgr, cv2.COLOR_BGR2GRAY)

    max_diff = int(diff_gray.max())
    logger.info(f"  AbsDiff → max={max_diff}, mean={diff_gray.mean():.2f}")
    if max_diff < DIFF_THRESHOLD:
        logger.warning(f"  ⚠ max_diff ({max_diff}) < threshold ({DIFF_THRESHOLD})")

    # ── 2. Seuillage binaire
    _, mask = cv2.threshold(diff_gray, DIFF_THRESHOLD, 255, cv2.THRESH_BINARY)

    # ── 3. Légère réduction du bruit (identique au notebook)
    if BLUR_KSIZE > 1:
        mask = cv2.GaussianBlur(mask, (BLUR_KSIZE, BLUR_KSIZE), 0)
        _, mask = cv2.threshold(mask, 10, 255, cv2.THRESH_BINARY)

    # ── 4. Morphologie : close puis dilate (notebook)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE,
                                       (MORPH_CLOSE_SIZE, MORPH_CLOSE_SIZE))
    mask_clean = cv2.morphologyEx(mask, cv2.MORPH_CLOSE,  kernel, iterations=2)
    mask_clean = cv2.dilate(mask_clean, kernel, iterations=2)

    # Debug
    cv2.imwrite(os.path.join(DEBUG_DIR, "mask_initial.png"), mask)
    cv2.imwrite(os.path.join(DEBUG_DIR, "mask_clean.png"),   mask_clean)

    # ── 5. Séparation annotations colorées / zones plan (noir & blanc)
    def make_fabric_mask(img_bgr):
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        return ((hsv[:, :, 1] > 40) & (hsv[:, :, 2] > 30)).astype(np.uint8) * 255

    fabric_union  = cv2.bitwise_or(make_fabric_mask(img1_bgr),
                                   make_fabric_mask(img2_bgr))
    kernel_merge  = cv2.getStructuringElement(cv2.MORPH_RECT, (50, 25))
    fabric_merged = cv2.dilate(fabric_union, kernel_merge, iterations=2)
    fabric_merged = cv2.morphologyEx(
        fabric_merged,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_RECT, (30, 30)),
        iterations=2
    )

    mask_annotations = cv2.bitwise_and(mask_clean, fabric_merged)
    mask_zones       = cv2.bitwise_and(mask_clean, cv2.bitwise_not(fabric_merged))

    logger.info(f"  Pixels annotations: {np.sum(mask_annotations > 0)}")
    logger.info(f"  Pixels zones:       {np.sum(mask_zones > 0)}")

    cv2.imwrite(os.path.join(DEBUG_DIR, "mask_annotations.png"), mask_annotations)
    cv2.imwrite(os.path.join(DEBUG_DIR, "mask_zones.png"),       mask_zones)

    bboxes = []
    H, W   = img1_bgr.shape[:2]

    # ── Contours annotations
    for cnt in cv2.findContours(mask_annotations, cv2.RETR_EXTERNAL,
                                cv2.CHAIN_APPROX_SIMPLE)[0]:
        if cv2.contourArea(cnt) < 50:
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        roi_diff = diff_gray[max(0, y):min(H, y+h), max(0, x):min(W, x+w)]
        if roi_diff.max() < DIFF_THRESHOLD:
            continue
        # Padding identique au notebook
        xp = max(0, x - BBOX_PADDING)
        yp = max(0, y - BBOX_PADDING)
        wp = min(W - xp, w + 2 * BBOX_PADDING)
        hp = min(H - yp, h + 2 * BBOX_PADDING)
        logger.info(f"    ✅ ANNOTATION x={xp} y={yp} w={wp} h={hp}")
        bboxes.append(('annotation', xp, yp, wp, hp))

    # ── Contours zones (plan CAD)
    for cnt in cv2.findContours(mask_zones, cv2.RETR_EXTERNAL,
                                cv2.CHAIN_APPROX_SIMPLE)[0]:
        if cv2.contourArea(cnt) < MIN_BBOX_AREA:
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        xp = max(0, x - BBOX_PADDING)
        yp = max(0, y - BBOX_PADDING)
        wp = min(W - xp, w + 2 * BBOX_PADDING)
        hp = min(H - yp, h + 2 * BBOX_PADDING)
        logger.info(f"    ✅ ZONE      x={xp} y={yp} w={wp} h={hp}")
        bboxes.append(('zone', xp, yp, wp, hp))

    logger.info(f"  Total bboxes : {len(bboxes)} "
                f"({sum(1 for b in bboxes if b[0]=='annotation')} ann. + "
                f"{sum(1 for b in bboxes if b[0]=='zone')} zones)")

    return {"bboxes": bboxes, "mask": mask_clean}


# ── Prompt VLM (identique notebook) ────────────────────────────────────────
VLM_PROMPT = """
Tu es un expert en analyse de plans architecturaux (CAD noir et blanc).

Tu reçois 2 images représentant la même zone d’un plan :
- IMAGE 1 = AVANT
- IMAGE 2 = APRÈS

Ta tâche est de comparer uniquement cette zone et détecter les différences.

━━━━━━━━ RECONNAISSANCE DES ÉLÉMENTS ━━━━━━━━

Types d'éléments architecturaux :
  * porte simple  → 1 arc de cercle + ligne droite
  * porte double  → 2 arcs de cercle symétriques
  * fenêtre       → lignes parallèles perpendiculaires au mur, aucun arc
                    la fenetre est toujours dans un mur, jamais en dehors
  * cote          → ligne avec valeur numérique
  * mur           → ligne épaisse sans ouverture


━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ RÈGLES IMPORTANTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Compare uniquement ce qui est visible dans les 2 images.
2. Ne fais aucune hypothèse hors image.
3. Ne mélange pas les éléments entre zones.
4. Si l’élément est au même endroit mais différent → ELEMENT_MODIFIE.
5. Si absent dans IMAGE 2 → ELEMENT_SUPPRIME.
6. Si nouveau dans IMAGE 2 → ELEMENT_AJOUTE.
7. Pour les valeurs numériques, compare précisément (cotes).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 CAS IMPORTANT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Si structure identique mais petit changement visuel → ELEMENT_MODIFIE
- Si impossible à identifier → ZONE_MODIFIEE (fallback)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 FORMAT DE SORTIE (OBLIGATOIRE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :

{{
  "zones": [
    {{
      "zone_id": 1,
      "type": "ELEMENT_MODIFIE",
      "element": "porte simple",
      "before": "porte simple",
      "after": "porte double",
      "detail": "La porte simple a été remplacée par une porte double.",
      "confidence": 0.95
    }},
    {{
      "zone_id": 2,
      "type": "COTE_MODIFIEE",
      "element": "cote",
      "before": "4.25",
      "after": "9.8",
      "detail": "La cote a changé de 4.25 à 9.8.",
      "confidence": 0.99
    }}
  ]
}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 OBJECTIF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Être précis, stable et cohérent sur les plans techniques.
Priorité : exactitude > imagination.
"""


async def classify_one_zone(
    client: httpx.AsyncClient,
    zone_idx: int,
    roi1: np.ndarray,
    roi2: np.ndarray,
) -> tuple[int, dict | None]:
    """
    1 appel VLM pour 1 zone — exactement comme dans le notebook.
    Retourne (zone_idx, result_dict) ou (zone_idx, None) en cas d'erreur.
    """
    payload = {
        "model":       QWEN_MODEL,
        "max_tokens":  1000,
        "temperature": 0.1,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text",      "text": "IMAGE 1 AVANT"},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{roi_to_base64(roi1)}"}},
                {"type": "text",      "text": "IMAGE 2 APRÈS"},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{roi_to_base64(roi2)}"}},
                {"type": "text",      "text": VLM_PROMPT},
            ],
        }],
    }

    try:
        resp = await client.post(
            HF_API_URL,
            headers={
                "Authorization": f"Bearer {HF_TOKEN}",
                "Content-Type":  "application/json",
                "HTTP-Referer":  "http://localhost:8000",
                "X-Title":       "Plan Diff Service",
            },
            json=payload,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        logger.info(f"  Zone {zone_idx} VLM raw: {raw[:200]}")

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        parsed = json.loads(raw)
        zones  = parsed.get("zones", [])
        if not zones:
            logger.warning(f"  ⚠ Zone {zone_idx} : réponse VLM vide")
            return zone_idx, None

        z = zones[0]  # 1 zone par appel → on prend le premier résultat
        if "type" not in z or "before" not in z or "after" not in z:
            logger.warning(f"  ⚠ Zone {zone_idx} : champs manquants")
            return zone_idx, None

        z["confidence"] = round(min(0.99, max(0.0, float(z.get("confidence", 0.75)))), 2)
        z.setdefault("element", "—")
        z.setdefault("detail",  "—")
        if z["type"] not in CHANGE_TYPES:
            z["type"] = "ZONE_MODIFIEE"

        logger.info(f"    Zone {zone_idx} → {z['type']} | {z.get('after')} | conf={z['confidence']}")
        return zone_idx, z

    except httpx.HTTPStatusError as e:
        logger.error(f"  ❌ Zone {zone_idx} HTTP {e.response.status_code} — {e.response.text[:200]}")
    except json.JSONDecodeError as e:
        logger.error(f"  ❌ Zone {zone_idx} JSON error: {e}")
    except Exception as e:
        logger.error(f"  ❌ Zone {zone_idx} erreur: {e}")

    return zone_idx, None


async def classify_all_zones(
    img1_bgr: np.ndarray,
    img2_bgr: np.ndarray,
    zones: list,
) -> dict:
    if not VLM_ENABLED or not zones:
        return {}

    import asyncio

    tasks_args = []
    for zone_idx, x, y, w, h in zones:
        pad = 60 if (w * h) < 20000 else 25
        H, W = img1_bgr.shape[:2]
        roi1 = img1_bgr[max(0,y-pad):min(H,y+h+pad), max(0,x-pad):min(W,x+w+pad)]
        roi2 = img2_bgr[max(0,y-pad):min(H,y+h+pad), max(0,x-pad):min(W,x+w+pad)]
        cv2.imwrite(os.path.join(DEBUG_DIR, f"roi_{zone_idx}_avant.png"), roi1)
        cv2.imwrite(os.path.join(DEBUG_DIR, f"roi_{zone_idx}_apres.png"), roi2)
        tasks_args.append((zone_idx, roi1, roi2))

    async with httpx.AsyncClient(timeout=60.0) as client:
        results_list = await asyncio.gather(
            *[classify_one_zone(client, zone_idx, roi1, roi2)
              for zone_idx, roi1, roi2 in tasks_args]
        )

    results = {}
    for zone_idx, result in results_list:
        if result is not None:
            results[zone_idx] = result

    logger.info(f"  ← VLM : {len(results)}/{len(zones)} zones classifiées")
    return results


# ── Heuristiques CV (fallback) ───────────────────────────────────────────────
def _detect_fabric_color(roi_bgr, tolerance=80):
    if roi_bgr is None or roi_bgr.size == 0:
        return None
    roi_rgb = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
    roi_hsv = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    colored = (roi_hsv[:, :, 1] > 40) & (roi_hsv[:, :, 2] > 30)
    pixels  = roi_rgb[colored]
    if len(pixels) < 5:
        return None
    best, best_r = None, 0.0
    for idx, target in enumerate(_FABRIC_COLORS_RGB):
        ratio = np.sum(np.linalg.norm(pixels - target, axis=1) < tolerance) / len(pixels)
        if ratio > best_r and ratio > 0.15:
            best_r = ratio
            best   = (_COLOR_NAMES[idx], FABRIC_COLORS_HEX[idx], round(ratio, 3))
    return best


def _detect_hatch(roi_gray):
    if roi_gray is None or roi_gray.size == 0:
        return False
    h, w = roi_gray.shape[:2]
    if h < 10 or w < 10:
        return False
    lines = cv2.HoughLinesP(cv2.Canny(roi_gray, 30, 120), 1, np.pi/180,
                             threshold=10, minLineLength=8, maxLineGap=6)
    if lines is None or len(lines) < 3:
        return False
    return sum(
        1 for l in lines
        for a in [abs(np.degrees(np.arctan2(l[0][3]-l[0][1], l[0][2]-l[0][0])))]
        if 10 < a < 80 or 100 < a < 170
    ) >= 3


def _detect_structural_change(g1, g2):
    if g1 is None or g2 is None or g1.size == 0 or g2.size == 0:
        return None
    d1    = np.sum(cv2.Canny(g1, 50, 150) > 0) / max(g1.size, 1)
    d2    = np.sum(cv2.Canny(g2, 50, 150) > 0) / max(g2.size, 1)
    delta = d2 - d1
    if abs(delta) < 0.04:
        return None
    if delta > 0:
        return {'before': 'zone simple', 'after': 'éléments ajoutés',
                'confidence': round(min(0.90, 0.70 + abs(delta)*3), 2)}
    return {'before': 'zone avec éléments', 'after': 'éléments supprimés',
            'confidence': round(min(0.90, 0.70 + abs(delta)*3), 2)}


def _detect_brightness_change(g1, g2):
    if g1 is None or g2 is None or g1.size == 0 or g2.size == 0:
        return None
    delta = float(np.mean(g2)) - float(np.mean(g1))
    if abs(delta) < 15:
        return None
    return ({'before': 'zone sombre', 'after': 'zone éclaircie', 'confidence': 0.72}
            if delta > 0 else
            {'before': 'zone claire',  'after': 'zone assombrie', 'confidence': 0.72})


def classify_annotation_cv(roi1, roi2) -> dict:
   
    c2 = _detect_fabric_color(roi2)
    if c2:
        return {'type': 'ANNOTATION_AJOUTEE', 'before': '—',
                'after': f'annotation {c2[0]}',
                'confidence': round(min(0.95, 0.80 + c2[2]*2), 2)}
    c1 = _detect_fabric_color(roi1)
    if c1:
        return {'type': 'ANNOTATION_SUPPRIMEE', 'before': f'annotation {c1[0]}',
                'after': '—',
                'confidence': round(min(0.95, 0.80 + c1[2]*2), 2)}
    return {'type': 'ANNOTATION_AJOUTEE', 'before': '—',
            'after': 'annotation', 'confidence': 0.70}


def classify_zone_cv_fallback(roi1, roi2, g1, g2) -> dict:
    if _detect_hatch(g2) and not _detect_hatch(g1):
        return {'type': 'ZONE_MODIFIEE', 'before': 'sans hachures',
                'after': 'zone hachurée', 'confidence': 0.82}
    if _detect_hatch(g1) and not _detect_hatch(g2):
        return {'type': 'ZONE_MODIFIEE', 'before': 'zone hachurée',
                'after': 'sans hachures', 'confidence': 0.80}
    s = _detect_structural_change(g1, g2)
    if s:
        return {'type': 'ZONE_MODIFIEE', 'before': s['before'],
                'after': s['after'], 'confidence': s['confidence']}
    b = _detect_brightness_change(g1, g2)
    if b:
        return {'type': 'ZONE_MODIFIEE', 'before': b['before'],
                'after': b['after'], 'confidence': b['confidence']}
    return {'type': 'ZONE_MODIFIEE', 'before': '—',
            'after': 'zone modifiée', 'confidence': 0.60}


def get_roi(img, x, y, w, h, padding=40):
    H, W = img.shape[:2]
    x0, y0 = max(0, x - padding), max(0, y - padding)
    x1, y1 = min(W, x + w + padding), min(H, y + h + padding)
    return img[y0:y1, x0:x1]


# ── Endpoint principal ──────────────────────────────────────────────────────
@app.post("/compare")
async def compare_plans(v1: UploadFile = File(...), v2: UploadFile = File(...)):
    v1_bytes = await v1.read()
    v2_bytes = await v2.read()

    logger.info("=== /compare appelé ===")
    logger.info(f"  v1 : {v1.filename}, taille={len(v1_bytes)}")
    logger.info(f"  v2 : {v2.filename}, taille={len(v2_bytes)}")
    logger.info(f"  VLM activé : {VLM_ENABLED} (modèle: {QWEN_MODEL})")

    with open(os.path.join(DEBUG_DIR, "last_v1.png"), "wb") as f: f.write(v1_bytes)
    with open(os.path.join(DEBUG_DIR, "last_v2.png"), "wb") as f: f.write(v2_bytes)

    # img1 = AVANT (v1 = olderVersion), img2 = APRÈS (v2 = newerVersion)
    img1 = decode_png(v1_bytes)   # AVANT
    img2 = decode_png(v2_bytes)   # APRÈS

    if img1 is None or img2 is None:
        return JSONResponse(status_code=400, content={"error": "Images invalides"})

    logger.info(f"  img1 (AVANT) shape={img1.shape} | img2 (APRÈS) shape={img2.shape}")

    if img1.shape == img2.shape:
        pixel_diff = np.sum(img1 != img2)
        logger.info(f"  Pixels différents : {pixel_diff}")
        if pixel_diff == 0:
            logger.error("  ❌ IMAGES IDENTIQUES")

    if img1.shape != img2.shape:
        h, w = img1.shape[:2]
        img2 = cv2.resize(img2, (w, h))

    img_h, img_w = img1.shape[:2]

    # ── Détection des bboxes (pipeline notebook) ──
    diff     = compute_absdiff_regions(img1, img2)
    bboxes   = diff["bboxes"]
    logger.info(f"  Bboxes total : {len(bboxes)}")

    # ── Séparer annotations (→ CV) et zones (→ VLM) ──
    annotation_bboxes = [(i, x, y, w, h) for i, (t, x, y, w, h) in enumerate(bboxes) if t == 'annotation']
    zone_bboxes       = [(i, x, y, w, h) for i, (t, x, y, w, h) in enumerate(bboxes) if t == 'zone']

    logger.info(f"  Annotations : {len(annotation_bboxes)} | Zones VLM : {len(zone_bboxes)}")

    # ── 1 seul appel VLM pour toutes les zones ──
    vlm_results = {}
    if zone_bboxes:
        vlm_input_zones = [(n+1, x, y, w, h) for n, (_, x, y, w, h) in enumerate(zone_bboxes)]
        logger.info(f"  → Appel VLM unique pour {len(vlm_input_zones)} zone(s)")
        vlm_results = await classify_all_zones(img1, img2, vlm_input_zones)
        logger.info(f"  ← VLM a répondu pour {len(vlm_results)}/{len(vlm_input_zones)} zone(s)")

    # ── Assembler les résultats ──
    changes = []

    # Annotations → CV
    for (_, x, y, w, h) in annotation_bboxes:
        padding = 80 if (w * h) < 15000 else 40
        roi1   = get_roi(img1, x, y, w, h, padding)
        roi2   = get_roi(img2, x, y, w, h, padding)
        result = classify_annotation_cv(roi1, roi2)
        result["source"] = "cv-heuristics"

        nx = max(0.0, x / img_w)
        ny = max(0.0, y / img_h)
        nw = min(w / img_w, 1.0 - nx)
        nh = min(h / img_h, 1.0 - ny)
        if nw <= 0 or nh <= 0:
            continue
        result["bbox"] = [round(nx, 4), round(ny, 4), round(nw, 4), round(nh, 4)]
        changes.append(result)
        logger.info(f"  → [cv] {result['type']} | {result['after']} | conf={result['confidence']}")

    # Zones → VLM (avec fallback CV)
    for n, (_, x, y, w, h) in enumerate(zone_bboxes):
        zone_id = n + 1
        vlm_res = vlm_results.get(zone_id)

        if vlm_res:
            result = {k: v for k, v in vlm_res.items() if k != "zone_id"}
            result["source"] = "qwen2.5-vl"
        else:
            logger.warning(f"  ⚠ Zone {zone_id} absente de la réponse VLM → fallback CV")
            padding = 80 if (w * h) < 15000 else 40
            roi1 = get_roi(img1, x, y, w, h, padding)
            roi2 = get_roi(img2, x, y, w, h, padding)
            g1   = cv2.cvtColor(roi1, cv2.COLOR_BGR2GRAY)
            g2   = cv2.cvtColor(roi2, cv2.COLOR_BGR2GRAY)
            result = classify_zone_cv_fallback(roi1, roi2, g1, g2)
            result["source"] = "cv-heuristics"

        nx = max(0.0, x / img_w)
        ny = max(0.0, y / img_h)
        nw = min(w / img_w, 1.0 - nx)
        nh = min(h / img_h, 1.0 - ny)
        if nw <= 0 or nh <= 0:
            continue
        result["bbox"] = [round(nx, 4), round(ny, 4), round(nw, 4), round(nh, 4)]
        changes.append(result)
        logger.info(
            f"  → [{result['source']}] {result['type']} | {result.get('after')} | conf={result['confidence']}"
        )

    logger.info(f"=== Résultat : {len(changes)} changement(s) ===\n")

    return {
        "total":       len(changes),
        "vlm_enabled": VLM_ENABLED,
        "vlm_model":   QWEN_MODEL if VLM_ENABLED else None,
        "changes":     changes,
        "summary": [
            f"{CHANGE_TYPES.get(c['type'], c['type'])} — "
            f"{c.get('after') or c.get('before') or '—'} "
            f"(conf. {c['confidence']:.0%})"
            for c in changes
        ],
    }

@app.post("/compare/contours")
async def compare_contours_only(v1: UploadFile = File(...), v2: UploadFile = File(...)):
    v1_bytes = await v1.read()
    v2_bytes = await v2.read()

    logger.info("=== /compare/contours appelé ===")
    logger.info(f"  v1 : {v1.filename}, taille={len(v1_bytes)}")
    logger.info(f"  v2 : {v2.filename}, taille={len(v2_bytes)}")

    with open(os.path.join(DEBUG_DIR, "contours_v1.png"), "wb") as f: f.write(v1_bytes)
    with open(os.path.join(DEBUG_DIR, "contours_v2.png"), "wb") as f: f.write(v2_bytes)

    img1 = decode_png(v1_bytes)
    img2 = decode_png(v2_bytes)

    if img1 is None or img2 is None:
        return JSONResponse(status_code=400, content={"error": "Images invalides"})

    logger.info(f"  img1 shape={img1.shape} | img2 shape={img2.shape}")

    if img1.shape != img2.shape:
        h, w = img1.shape[:2]
        img2 = cv2.resize(img2, (w, h))

    img_h, img_w = img1.shape[:2]

    # ── Pipeline CV uniquement ──
    diff   = compute_absdiff_regions(img1, img2)
    bboxes = diff["bboxes"]
    logger.info(f"  Bboxes total : {len(bboxes)}")

    annotation_bboxes = [(i, x, y, w, h) for i, (t, x, y, w, h) in enumerate(bboxes) if t == 'annotation']
    zone_bboxes       = [(i, x, y, w, h) for i, (t, x, y, w, h) in enumerate(bboxes) if t == 'zone']

    logger.info(f"  Annotations : {len(annotation_bboxes)} | Zones : {len(zone_bboxes)}")

    changes = []

    # Annotations → CV
    for (_, x, y, w, h) in annotation_bboxes:
        padding = 80 if (w * h) < 15000 else 40
        roi1   = get_roi(img1, x, y, w, h, padding)
        roi2   = get_roi(img2, x, y, w, h, padding)
        result = classify_annotation_cv(roi1, roi2)
        result["source"] = "cv-heuristics"

        nx = max(0.0, x / img_w)
        ny = max(0.0, y / img_h)
        nw = min(w / img_w, 1.0 - nx)
        nh = min(h / img_h, 1.0 - ny)
        if nw <= 0 or nh <= 0:
            continue
        result["bbox"] = [round(nx, 4), round(ny, 4), round(nw, 4), round(nh, 4)]
        changes.append(result)
        logger.info(f"  → [cv] {result['type']} | {result['after']} | conf={result['confidence']}")

    # Zones → CV fallback uniquement (pas de VLM)
    for (_, x, y, w, h) in zone_bboxes:
        padding = 80 if (w * h) < 15000 else 40
        roi1   = get_roi(img1, x, y, w, h, padding)
        roi2   = get_roi(img2, x, y, w, h, padding)
        g1     = cv2.cvtColor(roi1, cv2.COLOR_BGR2GRAY)
        g2     = cv2.cvtColor(roi2, cv2.COLOR_BGR2GRAY)
        result = classify_zone_cv_fallback(roi1, roi2, g1, g2)
        result["source"] = "cv-heuristics"

        nx = max(0.0, x / img_w)
        ny = max(0.0, y / img_h)
        nw = min(w / img_w, 1.0 - nx)
        nh = min(h / img_h, 1.0 - ny)
        if nw <= 0 or nh <= 0:
            continue
        result["bbox"] = [round(nx, 4), round(ny, 4), round(nw, 4), round(nh, 4)]
        changes.append(result)
        logger.info(f"  → [cv] {result['type']} | {result.get('after')} | conf={result['confidence']}")

    logger.info(f"=== Résultat contours : {len(changes)} changement(s) ===\n")

    return {
        "total":       len(changes),
        "vlm_enabled": False,
        "vlm_model":   None,
        "changes":     changes,
        "summary": [
            f"{CHANGE_TYPES.get(c['type'], c['type'])} — "
            f"{c.get('after') or c.get('before') or '—'} "
            f"(conf. {c['confidence']:.0%})"
            for c in changes
        ],
    }


@app.get("/health")
def health():
    return {
        "status":      "ok",
        "debug_dir":   DEBUG_DIR,
        "vlm_enabled": VLM_ENABLED,
        "vlm_model":   QWEN_MODEL if VLM_ENABLED else None,
    }