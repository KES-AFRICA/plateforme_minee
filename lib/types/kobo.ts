// ─── types/kobo.ts ────────────────────────────────────────────────────────────

// ── Poste géolocalisé (liste carte) ──────────────────────────────────────────
export interface PosteMapItem {
  substation:       string | null;
  substation_name:  string | null;
  type:             string | null;  // H61, H59…
  type_poste_H61:   string | null;  // S, SL, SP…
  feeder:           string | null;
  feeder_name:      string | null;
  exploitation:     string | null;
  regime:           string | null;
  regime_poste:     "publique" | "privee" | "mixte" | null;
  zone_type:        string | null;
  statut_acces:     string | null;
  latitude:         number;
  longitude:        number;
  photo_poste:      string | null;
  submission_time:  string | null;
  submitted_by:     string | null;
  kobo_id:          number | null;
}

export interface PostesMapResponse {
  count:  number;
  postes: PosteMapItem[];
}

// ── Busbar (Jeu de barre) ─────────────────────────────────────────────────────
export interface Busbar {
  id:            string;
  name:          string | null;
  voltage_level: string | null;
  phase:         string | null;
}

// ── Support & Armement ────────────────────────────────────────────────────────
export interface Support {
  hauteur:      string | null;
  etat:         string | null;
  type_support: string | null;
}

export interface Armement {
  type:           string | null;
  etat:           string | null;
  atronconnement: string | null;
}

// ── Appareillage HTA ──────────────────────────────────────────────────────────
export interface Appareillage {
  parafoudre:           string | null;
  etat_parafoudre:      string | null;
  tableau_bt:           string | null;
  detecteur_defaut:     string | null;
  coupe_circuit:        string | null;
  disjoncteur_hp:       string | null;
  pmr:                  string | null;
  photo_appareillage:   string | null;
}

// ── Transformateur ────────────────────────────────────────────────────────────
export interface Transformateur {
  nom:                   string | null;
  puissance_kva:         string | null;
  tension_primaire_kv:   string | null;
  tension_secondaire_kv: string | null;
  statut_presence:       string | null;
  actif:                 string | null;
  marque:                string | null;
  type:                  string | null;
  refroidissement:       string | null;
  etat_visuel:           string | null;
  relai_protection:      string | null;
  type_intervention:     string | null;
  remplacement_planifie: string | null;
  id_transformer:        string | null;
  photo_transfo:         string | null;
}

// ── Switch (appareil dans une cellule) ────────────────────────────────────────
export interface Switch {
  nom:                   string | null;
  type:                  string | null;
  forme:                 string | null;
  phase:                 string | null;
  tension_kv:            string | null;
  borne_t1:              string | null;
  borne_t2:              string | null;
  commande:              string | null;
  etat_visuel:           string | null;
  actif:                 string | null;
  type_intervention:     string | null;
  remplacement_planifie: string | null;
}

// ── Cellule HTA (bay) ─────────────────────────────────────────────────────────
export interface Cellule {
  bay_id:        string | null;
  type_bay:      string | null;  // CI, CP…
  fabricant:     string | null;
  modele:        string | null;
  commande:      string | null;
  etat_visuel:   string | null;
  signalisation: string | null;
  nom_cellule:   string | null;
  barcode_bay:   string | null;
  busbar_id:     string | null;
  busbar:        Busbar | null;
  photo_bay:     string | null;
  switches:      Switch[];
}

// ── Tableau BT ────────────────────────────────────────────────────────────────
export interface BTBoard {
  type:     string | null;
  capacity: string | null;
  actif:    string | null;
  photo:    string | null;
}

// ── Client commercial ─────────────────────────────────────────────────────────
export interface ClientCommercial {
  type_client:       string | null;
  nom_client:        string | null;
  activite:          string | null;
  type_compteur:     string | null;
  mrid_compteur:     string | null;
  statut_compteur:   string | null;
  statut_scelle:     string | null;
  numero_scelle:     string | null;
  telephone:         string | null;
  disjoncteur:       string | null;
  photo_disjoncteur: string | null;
  photo_ensemble:    string | null;
  photo_index:       string | null;
}

// ── Voies d'accès ─────────────────────────────────────────────────────────────
export interface Voies {
  type:        string | null;
  largeur:     string | null;
  longueur:    string | null;
  surface:     string | null;
  observation: string | null;
}

// ── Bâtiment (génie civil) ────────────────────────────────────────────────────
export interface Batiment {
  toiture:              string | null;
  peinture_exterieur:   string | null;
  etat_peinture_ext:    string | null;
  portes:               string | null;
  degradation_portes:   string | null;
  structure_murs:       string | null;
  etat_murs:            string | null;
  bouches_ventilation:  string | null;
  nb_bouches:           string | null;
  etat_bouches:         string | null;
  type_degrade_bouches: string | null;
  peinture_interieur:   string | null;
  etat_peinture_int:    string | null;
  dalle_couverture:     string | null;
  revetement:           string | null;
  etat_revetement:      string | null;
  cloture:              string | null;
  ouvrage_drainage:     string | null;
  galeries_cables:      string | null;
  type_galeries:        string | null;
  etat_galeries:        string | null;
  acces:                string | null;
  type_acces:           string | null;
  etat_acces:           string | null;
}

// ── Équipements locaux (génie civil) ──────────────────────────────────────────
export interface EquipementsLocal {
  interrupteurs:  string | null;
  lampes:         string | null;
  etat_lampes:    string | null;
  extracteur_air: string | null;
  coffret:        string | null;
}

// ── Génie civil ───────────────────────────────────────────────────────────────
export interface GenieCivil {
  kobo_id:           number | null;
  submission_time:   string | null;
  submitted_by:      string | null;
  superficie_batie:  string | null;
  voies:             Voies;
  batiment:          Batiment;
  equipements_local: EquipementsLocal;
  photos:            Record<string, string>;
}

// ── Métadonnées ───────────────────────────────────────────────────────────────
export interface PosteMeta {
  kobo_id:         number | null;
  uuid:            string | null;
  submission_time: string | null;
  submitted_by:    string | null;
  version:         string | null;
}

// ── Photos principales ────────────────────────────────────────────────────────
export interface PostePhotos {
  photo_poste:        string | null;
  photo_appareillage: string | null;
}

// ── Détail complet d'un poste ─────────────────────────────────────────────────
export interface PosteDetail {
  substation_id:     string;
  substation_name:   string | null;
  latitude:          number | null;
  longitude:         number | null;

  // Identification
  feeder:            string | null;
  feeder_name:       string | null;
  type:              string | null;
  type_poste_H61:    string | null;
  exploitation:      string | null;
  regime:            string | null;
  regime_poste:      string | null;
  zone_type:         string | null;
  barcode_poste:     string | null;
  ID2:               string | null;

  // État
  statut_acces:      string | null;
  terre_neutre_bt:   string | null;
  terre_masse:       string | null;

  // Busbars
  busbars:           Busbar[];

  // Équipements
  support:           Support;
  armement:          Armement;
  appareillage:      Appareillage;
  transformateurs:   Transformateur[];
  cellules:          Cellule[];
  bt_boards:         BTBoard[];

  // Commercial
  client_commercial: ClientCommercial | null;

  // Photos
  photos:            PostePhotos;

  // Génie civil lié
  genie_civil:       GenieCivil | null;

  // Méta
  meta:              PosteMeta;
}

// ── Erreur API ────────────────────────────────────────────────────────────────
export interface ApiError {
  detail: string;
}



// ── Type pour le wire enrichi (avec toutes les photos) ────────────────────────
export interface WireEnriched extends WireDetail {
  _attachments?: Array<{
    download_url: string;
    question_xpath: string;
    mimetype: string;
  }>;
  _photos?: Record<string, string>;
}





// ─── Types Wire ───────────────────────────────────────────────────────────────

export interface WiresMapResponse {
  count:                number;
  count_without_coords: number;
  ids_without_coords:   number[];
  wires:                WireMapItem[];
}

/**
 * Un segment correspond à un tronçon du wire.
 * type  → "aerien" | "souterrain" | "remontee"
 * La carte trace chaque segment avec son propre style :
 *   - aérien/remontée : ligne pleine
 *   - souterrain      : ligne en tirets
 */
export interface WireSegment {
  type:        "aerien" | "souterrain" | "remontee";
  coordinates: [number, number][];   // [lng, lat] GeoJSON order
  waypoints:   WireWaypoint[];
}

export interface WireWaypoint {
  lat:           number;
  lng:           number;
  type:          string;   // "support" | "remontee" | "balise" | "marquage" | ...
  troncon_index: number;
  support_index?: number;
}

export interface WireMapItem {
  id:                  number;
  feeder_id:           string | null;
  feeder_name:         string | null;
  type:                string | null;   // "aerien" | "souterrain" | "mixte"
  tension_kv:          string | null;
  phase:               string | null;
  has_complete_coords: boolean;
  debut:               WirePoint;
  fin:                 WirePoint;
  /** Segments par tronçon — utiliser pour le tracé coloré */
  segments:            WireSegment[];
  /** Ligne complète (fallback si segments vides) */
  coordinates:         [number, number][];
  waypoints_count:     number;
  waypoints:           WireWaypoint[];
  submission_time:     string | null;
  submitted_by:        string | null;
}

export interface WirePoint {
  type:      string | null;
  code:      string | null;
  latitude:  number | null;
  longitude: number | null;
}

// ─── Détail Wire ─────────────────────────────────────────────────────────────

export interface WireDetail {
  id:     number;
  length_km?: number;
  uuid:   string | null;
  type:   string | null;   // "aerien" | "souterrain" | "mixte"
  feeder: {
    id:             string | null;
    name:           string | null;
    tension_kv:     string | null;
    tension_aerien?: string | null;
    phase:          string | null;
  };
  debut: {
    type:        string | null;
    code:        string | null;
    coordinates: WireCoords;
    details:     WireDebutDetails;
    photo:       string | null;
  };
  fin: {
    type:        string | null;
    coordinates: WireCoords;
    details:     WireFinDetails;
    photos:      WireFinPhotos | null;
  };
  troncons: WireTronconDetail[];
  photos: {
    debut: string | null;
    fin:   WireFinPhotos | null;
  };
  geometry: {
    has_complete_coords: boolean;
    segments:            WireSegment[];
    coordinates:         [number, number][];
    waypoints:           WireWaypoint[];
  };
  stats: {
    troncons_count:             number;
    supports_count:             number;
    total_waypoints:            number;
    total_photos:               number;
    points_remarquables_count:  number;
  };
  meta: {
    kobo_id:         number;
    submission_time: string | null;
    submitted_by:    string | null;
    version:         string | null;
    status:          string | null;
  };
}

export interface WireCoords {
  latitude:  number | null;
  longitude: number | null;
}

// Début — varie selon le type (poste / derivation / OCR)
export interface WireDebutDetails {
  // poste
  substation_id?:         string | null;
  substation_name?:       string | null;
  poste_name?:            string | null;
  type_poste?:            string | null;
  exploitation?:          string | null;
  regime?:                string | null;
  zone_type?:             string | null;
  bay?:                   string | null;
  bay_name?:              string | null;
  busbar?:                string | null;
  powertransformer?:      string | null;
  powertransformer_name?: string | null;
  ID2?:                   string | null;
  tension_kv?:            string | null;
  photo?:                 string | null;
  // derivation / OCR
  code?:                  string | null;
  ocr_value?:             string | null;
  [key: string]: unknown;
}

// Fin — varie selon le type (poste / derivation / OCR_fin)
export interface WireFinDetails {
  // poste
  substation_id?:         string | null;
  substation_name?:       string | null;
  code?:                  string | null;
  poste_name?:            string | null;
  type_poste?:            string | null;
  exploitation?:          string | null;
  regime?:                string | null;
  zone_type?:             string | null;
  bay?:                   string | null;
  bay_name?:              string | null;
  cellule?:               string | null;
  powertransformer?:      string | null;
  powertransformer_name?: string | null;
  ID2?:                   string | null;
  tension_kv?:            string | null;
  type_poste_fin?:        string | null;
  // derivation
  hauteur?:               string | null;
  etat?:                  string | null;
  type_support?:          string | null;
  forme_PBA?:             string | null;
  structure_PBA?:         string | null;
  effort_PBA?:            string | null;
  forme_metallique?:      string | null;
  structure_metallique?:  string | null;
  effort_metallique?:     string | null;
  structure_bois?:        string | null;
  type_armement?:         string | null;
  nombre_armement?:       string | null;
  etat_armement?:         string | null;
  atronconnement?:        string | null;
  avec_fusible?:          boolean | null;
  photo?:                 string | null;
  photo_armement?:        string | null;
  // OCR_fin
  ocr_value?:             string | null;
  ocr_name?:              string | null;
  fabricant?:             string | null;
  modele?:                string | null;
  etat_visuel?:           string | null;
  commentaire_etat?:      string | null;
  [key: string]: unknown;
}

export interface WireFinPhotos {
  photo:          string | null;
  photo_armement: string | null;
}

// ─── Tronçons ────────────────────────────────────────────────────────────────

export interface WireTronconDetail {
  index: number;
  type:  "aerien" | "souterrain" | "remontee";
  aerien?: {
    caracteristique?: string | null;
    avec_support?:    string | null;
    cable?: {
      nature?:  string | null;
      section?: string | null;
      isolant?: string | null;
      photo?:   string | null;
    };
  };
  supports?: WireSupportDetail[];
  souterrain?: {
    cable?: {
      nature?:     string | null;
      section?:    string | null;
      isolant?:    string | null;
      pose?:       string | null;
      profondeur?: string | null;
      photo?:      string | null;
    };
    points_remarquables?: WirePointRemarquable[];
  };
  remontee?: {
    support?: WireREASSupport;
    armement?: {
      type?:            string | null;
      nombre?:          string | null;
      etat?:            string | null;
      atronconnement?:  string | null;
      parafoudre?:      string | null;
      etat_parafoudre?: string | null;
      photo?:           string | null;
    };
    cable?: {
      nature?:  string | null;
      section?: string | null;
      isolant?: string | null;
      pose?:    string | null;
    };
  };
}

export interface WireSupportDetail {
  index:        number;
  hauteur?:     string | null;
  etat?:        string | null;
  type_support?: string | null;
  position?:    { latitude: number; longitude: number } | null;
  photo?:       string | null;
  armement?: {
    type?:           string | null;
    nombre?:         string | null;
    etat?:           string | null;
    atronconnement?: string | null;
    photo?:          string | null;
  };
  pba?: {
    forme?:     string | null;
    structure?: string | null;
    effort?:    string | null;
  };
  metallique?: {
    forme?:     string | null;
    structure?: string | null;
    effort?:    string | null;
  };
}

export interface WireREASSupport {
  barcode?:       string | null;
  sens?:          string | null;
  type_remontee?: string | null;
  hauteur?:       string | null;
  etat?:          string | null;
  etat_remontee?: string | null;
  type_support?:  string | null;
  accessoires?:   string | null;
  position?:      { latitude: number; longitude: number } | null;
  photo?:         string | null;
  photo_accessoires?: string | null;
  pba?: { forme?: string | null; structure?: string | null; effort?: string | null } | null;
  metallique?: { forme?: string | null; structure?: string | null; effort?: string | null } | null;
}

export interface WirePointRemarquable {
  index:     number;
  type?:     string | null;
  id_point?: string | null;
  etat?:     string | null;
  position?: { latitude: number; longitude: number } | null;
  altitude?: number | null;
  photo?:    string | null;
}


// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupportPosition {
  latitude:  number;
  longitude: number;
  altitude:  number | null;
  precision: number | null;
}

export interface SupportPBA {
  forme:     string | null;
  structure: string | null;
  effort:    string | null;
}

export interface SupportMetallique {
  forme:     string | null;
  structure: string | null;
  effort:    string | null;
}

export interface SupportBois {
  structure: string | null;
}

export interface SupportArmement {
  type:           string | null;
  nombre:         string | null;
  etat:           string | null;
  atronconnement: string | null;
  photo:          string | null;
}

// ── Réponse GET /map/wires/{wire_id}/support/{troncon_index}/{support_index} ──
export interface SupportDetail {
  wire_id:       number;
  troncon_index: number;
  support_index: number;
  type:          "support";

  wire: {
    feeder_id:   string | null;
    feeder_name: string | null;
    tension_kv:  string | null;
    phase:       string | null;
  };

  troncon: {
    index:          number;
    supports_total: number;
    cable: {
      nature:  string | null;
      section: string | null;
      isolant: string | null;
    } | null;
  };

  poteau: {
    hauteur:          string | null;
    etat:             string | null;
    type_support:     string | null;   // "1"=bois | "2"=PBA | "3"=métallique
    localisation_raw: string | null;
    position:         SupportPosition | null;
    photo:            string | null;
    bois?:            SupportBois;
    pba?:             SupportPBA;
    metallique?:      SupportMetallique;
  };

  armement: SupportArmement;

  photos: {
    support:  string | null;
    armement: string | null;
  };

  meta: {
    kobo_id:         number;
    submission_time: string | null;
    submitted_by:    string | null;
  };
}

// ── Réponse GET /map/wires/{wire_id}/reas/{troncon_index} ─────────────────────
export interface REASDetail {
  wire_id:       number;
  troncon_index: number;
  type:          "reas";

  wire: {
    feeder_id:   string | null;
    feeder_name: string | null;
    tension_kv:  string | null;
    phase:       string | null;
  };

  support: {
    barcode:          string | null;
    sens:             string | null;    // "sout_to_aero" | "aero_to_sout"
    type_remontee:    string | null;    // "directe" | ...
    hauteur:          string | null;
    etat:             string | null;
    etat_remontee:    string | null;
    type_support:     string | null;   // "1"=bois | "2"=PBA | "3"=métallique
    accessoires:      string | null;
    double:           string | null;
    localisation_raw: string | null;
    position:         SupportPosition | null;
    photo:            string | null;
    photo_accessoires: string | null;
    bois?:            SupportBois;
    pba?:             SupportPBA;
    metallique?:      SupportMetallique;
  };

  armement: {
    type:            string | null;
    nombre:          string | null;
    etat:            string | null;
    atronconnement:  string | null;
    parafoudre:      string | null;
    etat_parafoudre: string | null;
    eclateur:        string | null;
    etat_eclateur:   string | null;
    photo:           string | null;
  };

  cable: {
    nature:  string | null;
    section: string | null;
    isolant: string | null;
    pose:    string | null;
  };

  photos: {
    support:             string | null;
    support_accessoires: string | null;
    armement:            string | null;
  };

  meta: {
    kobo_id:         number;
    submission_time: string | null;
    submitted_by:    string | null;
  };
}

// ── Point remarquable souterrain ──────────────────────────────────────────────

export interface PointRemarquablePosition {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  precision: number | null;
}

export interface PointRemarquableAttachment {
  uid: string;
  mimetype: string;
  filename: string;
  basename: string;
  question_xpath: string;
}

export interface PointRemarquablePhotos {
  original: string | null;
  large: string | null;
  medium: string | null;
  small: string | null;
}

export interface PointRemarquableCable {
  nature: string | null;
  section: string | null;
  isolant: string | null;
  pose: string | null;
  profondeur: string | null;
}

export interface PointRemarquableDetail {
  wire_id: number;
  troncon_index: number;
  point_index: number;
  points_total: number;
  type: "point_remarquable";
  wire: {
    feeder_id: string | null;
    feeder_name: string | null;
    tension_kv: string | null;
    phase: string | null;
  };
  troncon: {
    index: number;
    type: "souterrain";
    cable: PointRemarquableCable;
  };
  point_remarquable: {
    type: string | null;
    id_point: string | null;
    etat: string | null;
    position_raw: string | null;
    position: PointRemarquablePosition | null;
  };
  photos: PointRemarquablePhotos;
  attachment: PointRemarquableAttachment | null;
  meta: {
    kobo_id: number;
    submission_time: string;
    submitted_by: string;
    xpath_photo: string;
  };
}