import type { ActividadResponsable } from './actividad-responsable';
import type { Subactividad } from './subactividad';
import type { Evidencia } from './evidencia';
import type { Edicion } from './edicion';
import type { ActividadAnual } from './actividad-anual';
import type { ActividadMensualInst } from './actividad-mensual-inst';

export interface Actividad {
  id: number;
  idActividad: number; // Alias para compatibilidad
  nombre: string; // Alias para nombreActividad
  nombreActividad: string;
  descripcion?: string;
  
  // Departamentos
  departamentoId?: number;
  nombreDepartamento?: string;
  departamentoResponsableId?: number | number[]; // Puede ser un número o un array de números (legacy)
  idDepartamentosResponsables?: number[]; // Array de IDs de departamentos responsables (formato backend)
  nombreDepartamentoResponsable?: string;
  
  // Tipos e Iniciativas
  idTipoIniciativa?: number;
  nombreTipoIniciativa?: string;
  
  // Fechas
  fechaInicio?: string; // DateOnly del backend
  fechaFin?: string; // DateOnly del backend
  fechaEvento?: string; // DateOnly del backend
  
  // Documentos
  soporteDocumentoUrl?: string;
  idTipoDocumento?: number;
  nombreTipoDocumento?: string;
  
  // Estado
  idEstadoActividad?: number;
  nombreEstadoActividad?: string;
  
  // Tipo de Actividad
  idTipoActividad?: number | number[]; // Puede ser un número o un array de números
  nombreTipoActividad?: string;
  
  // Área de Conocimiento
  idArea?: number;
  nombreArea?: string;
  
  // Información adicional
  organizador?: string;
  modalidad?: string;
  idCapacidadInstalada?: number;
  ubicacion?: string; // Legacy
  
  // Nivel
  idNivel?: number;
  nombreNivel?: string;
  nivelActividad: number; // Default: 1
  
  // Campos adicionales
  semanaMes?: number;
  codigoActividad?: string;
  idActividadMensualInst?: number | number[]; // Puede ser un número o un array de números (legacy)
  idActividadesMensualesInst?: number[]; // Array de IDs de actividades mensuales (formato backend)
  nombreActividadMensualInst?: string;
  codigoIndicador?: string;
  
  // Planificación
  esPlanificada?: boolean;
  idIndicador?: number;
  nombreIndicador?: string;
  codigoIndicadorAsociado?: string;
  nombreIndicadorAsociado?: string;
  metaIndicador?: number;
  idActividadAnual?: number | number[]; // Puede ser un número o un array de números (legacy)
  idActividadesAnuales?: number[]; // Array de IDs de actividades anuales (formato backend)
  nombreActividadAnual?: string;
  
  // Objetivos y Metas
  objetivo?: string;
  cantidadMaximaParticipantesEstudiantes?: number;
  tipoResumenAccion?: string;
  metaAlcanzada?: number;
  metaCumplimiento?: number;
  valoracionIndicadorEstrategico?: string;
  brechaEstrategica?: string;
  anio?: string;
  horaRealizacion?: string; // TimeOnly del backend
  cantidadParticipantesProyectados?: number;
  cantidadParticipantesEstudiantesProyectados?: number;
  cantidadTotalParticipantesProtagonistas?: number;
  idTipoProtagonista?: number | number[]; // Puede ser un número o un array de números (legacy)
  idTiposProtagonistas?: number[]; // Array de IDs de tipos de protagonistas (formato backend)
  responsableActividad?: string;
  idTipoEvidencias?: number[]; // Lista de IDs de tipos de evidencias requeridas
  
  // Usuario creador
  creadoPor: number;
  nombreCreador?: string;
  fechaCreacion: string; // DateTime del backend
  fechaModificacion?: string; // DateTime del backend
  
  // Validación
  estadoValidacion?: string | null; // "Pendiente" | "Aprobada" | "Rechazada" | "Corregir" | null
  mensajeValidacion?: string | null; // Comentarios del validador
  validadoPor?: number | null; // ID del usuario que validó
  nombreValidador?: string | null; // Nombre del validador
  fechaValidacion?: string | null; // Fecha de validación (ISO 8601)
  
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
  actividadesAnuales?: ActividadAnual[]; // Array completo de actividades anuales con sus nombres
  actividadesMensualesInst?: ActividadMensualInst[]; // Array completo de actividades mensuales con sus nombres
  
  // Campos de compatibilidad (legacy)
  categoriaActividadId?: number; // Alias para idTipoActividad
  tipoUnidadId?: number; // No existe en backend actual
  areaConocimientoId?: number; // Alias para idArea
  departamento?: string; // Alias para nombreDepartamento
  creadoPorId?: number; // Alias para creadoPor
  creadoPorNombre?: string; // Alias para nombreCreador
  tipoIniciativa?: string; // Alias para nombreTipoIniciativa
  activo?: boolean; // No existe en backend, usar estado
}

export interface ResponsableExternoCreate {
  nombre: string;
  institucion: string;
  cargo?: string;
  telefono?: string;
  correo?: string;
}

export interface ResponsableCreate {
  idUsuario?: number;
  idDocente?: number;
  idEstudiante?: number;
  idAdmin?: number;
  idResponsableExterno?: number; // Para responsables externos existentes
  responsableExterno?: ResponsableExternoCreate; // Para responsables externos nuevos
  idRolResponsable?: number;
  rolResponsable?: string;
  fechaAsignacion?: string; // YYYY-MM-DD
}

export interface ActividadCreate {
  nombreActividad: string;
  descripcion?: string;
  departamentoId?: number;
  departamentoResponsableId?: number | number[]; // Legacy - usar idDepartamentosResponsables
  idDepartamentosResponsables?: number[]; // Campo que espera el backend (plural)
  idTipoIniciativa?: number;
  fechaInicio?: string; // DateOnly en formato string
  fechaFin?: string; // DateOnly en formato string
  fechaEvento?: string; // DateOnly en formato string
  idEstadoActividad?: number;
  idTipoActividad?: number | number[]; // Puede ser un número o un array de números
  idArea?: number;
  idTipoDocumento?: number;
  organizador?: string;
  modalidad?: string;
  idCapacidadInstalada?: number;
  ubicacion?: string; // Legacy - se mapeará a idCapacidadInstalada
  idNivel?: number;
  nivelActividad?: number; // Default: 1
  semanaMes?: number;
  codigoActividad?: string;
  idActividadMensualInst?: number | number[]; // Legacy - usar idActividadesMensualesInst
  idActividadesMensualesInst?: number[]; // Campo que espera el backend (plural, array)
  esPlanificada?: boolean;
  idIndicador?: number;
  idActividadAnual?: number | number[]; // Legacy - usar idActividadesAnuales
  idActividadesAnuales?: number[]; // Campo que espera el backend (plural, array)
  objetivo?: string;
  cantidadMaximaParticipantesEstudiantes?: number;
  cantidadTotalParticipantesProtagonistas?: number;
  tipoResumenAccion?: string;
  metaAlcanzada?: number;
  metaCumplimiento?: number;
  valoracionIndicadorEstrategico?: string;
  brechaEstrategica?: string;
  anio?: string;
  horaRealizacion?: string; // TimeOnly en formato string (HH:mm:ss)
  cantidadParticipantesProyectados?: number;
  cantidadParticipantesEstudiantesProyectados?: number;
  idTipoProtagonista?: number | number[]; // Legacy - usar idTiposProtagonistas
  idTiposProtagonistas?: number[]; // Campo que espera el backend (plural)
  responsableActividad?: string;
  idTipoEvidencias?: number[]; // Lista de IDs de tipos de evidencias requeridas
  responsables?: ResponsableCreate[]; // Lista de responsables de la actividad
  
  // Campos legacy para compatibilidad
  nombre?: string; // Alias para nombreActividad
  categoriaActividadId?: number; // Alias para idTipoActividad
  tipoUnidadId?: number; // No se usa en backend
  areaConocimientoId?: number; // Alias para idArea
  activo?: boolean; // No se usa en backend
}

export interface ActividadUpdate extends ActividadCreate {
  // Todos los campos son opcionales en Update
}
