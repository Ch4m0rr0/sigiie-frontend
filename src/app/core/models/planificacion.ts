export interface Planificacion {
  idPlanificacion: number;
  nombre: string;
  descripcion?: string;
  idTipoPlanificacion: number;
  nombreTipoPlanificacion?: string;
  periodoInicio?: string; // DateOnly en formato "yyyy-MM-dd"
  periodoFin?: string; // DateOnly en formato "yyyy-MM-dd"
  idPlanificacionPadre?: number;
  nombrePadre?: string;
  anio: number;
  activo: boolean;
  creadoPor: number;
  fechaCreacion: string; // DateTime
  fechaModificacion?: string; // DateTime
  hijasCount: number;
}

export interface PlanificacionCreate {
  nombre: string;
  descripcion?: string;
  idTipoPlanificacion: number;
  idPlanificacionPadre?: number;
  periodoInicio?: string; // DateOnly en formato "yyyy-MM-dd"
  periodoFin?: string; // DateOnly en formato "yyyy-MM-dd"
  anio: number;
  activo?: boolean; // Default: true
}

export interface PlanificacionUpdate {
  nombre: string;
  descripcion?: string;
  idTipoPlanificacion: number;
  idPlanificacionPadre?: number;
  periodoInicio?: string; // DateOnly en formato "yyyy-MM-dd"
  periodoFin?: string; // DateOnly en formato "yyyy-MM-dd"
  anio: number;
  activo: boolean; // Default: true
}

export interface PlanificacionFilterDto {
  TipoId?: number;
  Anio?: number;
  PadreId?: number;
  IncluirInactivos?: boolean; // Default: false
  PeriodoInicio?: string; // DateOnly en formato "yyyy-MM-dd"
  PeriodoFin?: string; // DateOnly en formato "yyyy-MM-dd"
  Profundidad?: number;
  Page?: number;
  PageSize?: number;
  IncluirActividades?: boolean; // Default: false
  IncluirReportes?: boolean; // Default: false
}

export interface PlanificacionArbol {
  idPlanificacion: number;
  nombre: string;
  idPlanificacionPadre?: number;
  idTipoPlanificacion: number;
  nombreTipoPlanificacion?: string;
  periodoInicio?: string; // DateOnly en formato "yyyy-MM-dd"
  periodoFin?: string; // DateOnly en formato "yyyy-MM-dd"
  anio: number;
  activo: boolean;
  hijas: PlanificacionArbol[];
}

export interface PlanificacionResumen {
  idPlanificacion: number;
  nombre: string;
  descripcion?: string;
  idTipoPlanificacion: number;
  nombreTipoPlanificacion?: string;
  periodoInicio?: string; // DateOnly en formato "yyyy-MM-dd"
  periodoFin?: string; // DateOnly en formato "yyyy-MM-dd"
  anio: number;
  activo: boolean;
  totalHijas: number;
  totalActividades: number;
  totalProyectosRelacionados: number;
  totalReportesGenerados: number;
  fechaConsulta: string; // DateTime
  actividadesResumen?: any[];
  reportesResumen?: any[];
}

// Relación entre Planificación y Actividad (tabla Planificacion_Actividad_Instancia)
export interface PlanificacionActividad {
  idPlanificacionActividad: number;
  idPlanificacion: number;
  idActividad: number;
  anio: number;
  asignadoPor: number;
  fechaAsignacion: string; // DateTime
  activo: boolean;
  // Campos adicionales que pueden venir del join
  nombreActividad?: string;
  nombrePlanificacion?: string;
}

export interface PlanificacionActividadCreate {
  idPlanificacion: number;
  idActividad: number;
  anio?: number; // Si no se proporciona, usar el año de la planificación
  activo?: boolean; // Default: true
}

