import type { ActividadResponsable } from './actividad-responsable';
import type { Subactividad } from './subactividad';
import type { Evidencia } from './evidencia';
import type { Edicion } from './edicion';

export interface Actividad {
  id: number;
  idActividad: number; // Alias para compatibilidad
  nombre: string; // Alias para nombreActividad
  nombreActividad: string;
  descripcion?: string;
  
  // Departamentos
  departamentoId?: number;
  nombreDepartamento?: string;
  departamentoResponsableId?: number;
  nombreDepartamentoResponsable?: string;
  
  // Tipos e Iniciativas
  idTipoIniciativa?: number;
  nombreTipoIniciativa?: string;
  
  // Fechas
  fechaInicio?: string; // DateOnly del backend
  fechaFin?: string; // DateOnly del backend
  
  // Documentos
  soporteDocumentoUrl?: string;
  idTipoDocumento?: number;
  nombreTipoDocumento?: string;
  
  // Estado
  idEstadoActividad?: number;
  nombreEstadoActividad?: string;
  
  // Tipo de Actividad
  idTipoActividad?: number;
  nombreTipoActividad?: string;
  
  // Área de Conocimiento
  idArea?: number;
  nombreArea?: string;
  
  // Información adicional
  organizador?: string;
  modalidad?: string;
  ubicacion?: string;
  
  // Nivel
  idNivel?: number;
  nombreNivel?: string;
  nivelActividad: number; // Default: 1
  
  // Campos adicionales
  semanaMes?: number;
  codigoActividad?: string;
  idActividadMensualInst?: number;
  nombreActividadMensualInst?: string;
  codigoIndicador?: string;
  idTipoActividadJerarquica?: number;
  nombreTipoActividadJerarquica?: string;
  
  // Usuario creador
  creadoPor: number;
  nombreCreador?: string;
  fechaCreacion: string; // DateTime del backend
  fechaModificacion?: string; // DateTime del backend
  
  // Contadores
  totalSubactividades: number;
  totalEvidencias: number;
  totalResponsables: number;
  totalEdiciones: number;
  
  // Relaciones (pueden venir en GetById)
  subactividades?: Subactividad[];
  evidencias?: Evidencia[];
  responsables?: ActividadResponsable[];
  ediciones?: Edicion[];
  
  // Campos de compatibilidad (legacy)
  categoriaActividadId?: number; // Alias para idTipoActividad
  tipoUnidadId?: number; // No existe en backend actual
  areaConocimientoId?: number; // Alias para idArea
  idPlanificacion?: number; // No existe en backend actual
  nombrePlanificacion?: string; // No existe en backend actual
  departamento?: string; // Alias para nombreDepartamento
  creadoPorId?: number; // Alias para creadoPor
  creadoPorNombre?: string; // Alias para nombreCreador
  tipoIniciativa?: string; // Alias para nombreTipoIniciativa
  activo?: boolean; // No existe en backend, usar estado
}

export interface ActividadCreate {
  nombreActividad: string;
  descripcion?: string;
  departamentoId?: number;
  departamentoResponsableId?: number;
  idTipoIniciativa?: number;
  fechaInicio?: string; // DateOnly en formato string
  fechaFin?: string; // DateOnly en formato string
  idEstadoActividad?: number;
  idTipoActividad?: number;
  idArea?: number;
  idTipoDocumento?: number;
  organizador?: string;
  modalidad?: string;
  ubicacion?: string;
  idNivel?: number;
  nivelActividad?: number; // Default: 1
  semanaMes?: number;
  codigoActividad?: string;
  idActividadMensualInst?: number;
  idTipoActividadJerarquica?: number;
  
  // Campos legacy para compatibilidad
  nombre?: string; // Alias para nombreActividad
  categoriaActividadId?: number; // Alias para idTipoActividad
  tipoUnidadId?: number; // No se usa en backend
  areaConocimientoId?: number; // Alias para idArea
  idPlanificacion?: number; // No se usa en backend
  activo?: boolean; // No se usa en backend
}

export interface ActividadUpdate extends ActividadCreate {
  // Todos los campos son opcionales en Update
}
