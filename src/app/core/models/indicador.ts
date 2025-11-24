export interface Indicador {
  idIndicador: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  lineaEstrategica?: string;
  objetivoEstrategico?: string;
  accionEstrategica?: string;
  unidadMedida?: string;
  activo: boolean;
  fechaCreacion: string;
  idIndicadorPadre?: number; // Nuevo campo
  nivel?: number; // Nuevo campo
}

export interface IndicadorCreate {
  codigo: string;
  nombre: string;
  descripcion?: string;
  lineaEstrategica?: string;
  objetivoEstrategico?: string;
  accionEstrategica?: string;
  unidadMedida?: string;
  activo?: boolean;
  idIndicadorPadre?: number; // Nuevo campo para crear indicadores hijos
}

// Relación Actividad-Indicador
export interface ActividadIndicador {
  idActividadIndicador: number;
  idActividad: number;
  idIndicador: number;
  nombreIndicador?: string;
  codigoIndicador?: string;
  metaAnual?: number;
  metaPeriodo?: number;
  metaAlcanzada?: number;
  porcentajeCumplimiento?: number;
  valoracionCualitativa?: string;
  brechas?: string;
  evidenciaResumen?: string;
}

