export interface Evidencia {
  idEvidencia: number;
  id?: number; // Alias para compatibilidad
  idProyecto?: number;
  nombreProyecto?: string;
  idActividad?: number;
  nombreActividad?: string;
  idSubactividad?: number;
  nombreSubactividad?: string;
  idTipoEvidencia?: number;
  nombreTipoEvidencia?: string;
  fechaEvidencia?: string; // DateOnly del backend
  seleccionadaParaReporte?: boolean;
  tipo?: string; // Extensión del archivo
  rutaArchivo?: string;
  descripcion?: string;
  fechaSubida?: string; // DateTime del backend
  subidoPor?: number;
  nombreSubidoPor?: string;
}

export interface EvidenciaCreate {
  idProyecto?: number;
  idActividad?: number;
  idSubactividad?: number;
  idTipoEvidencia: number; // REQUERIDO
  fechaEvidencia?: string;
  seleccionadaParaReporte?: boolean;
  tipo?: string;
  rutaArchivo?: string;
  descripcion?: string;
}

