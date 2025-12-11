export interface Subactividad {
  idSubactividad: number;
  idActividad: number;
  nombreActividad?: string; // Para mostrar
  nombre: string;
  nombreSubactividad?: string; // Alias para nombre
  descripcion?: string;
  idTipoSubactividad?: number | number[];
  nombreTipoSubactividad?: string;
  fechaInicio?: string;
  fechaFin?: string;
  horaRealizacion?: string;
  horaInicioPrevista?: string;
  departamentoResponsableId?: number | number[];
  idDepartamentosResponsables?: number[];
  departamentoId?: number;
  nombreDepartamentoResponsable?: string;
  ubicacion?: string;
  modalidad?: string;
  organizador?: string;
  responsableSubactividad?: string;
  activo: boolean;
  creadoPor: number;
  fechaCreacion: string;
  fechaModificacion?: string;
  idCapacidadInstalada?: number;
  idDocenteOrganizador?: number;
  idEstadoActividad?: number;
  semanaMes?: number;
  codigoSubactividad?: string;
  idIndicador?: number;
  idActividadAnual?: number | number[];
  idActividadMensualInst?: number | number[];
  idTipoProtagonista?: number | number[];
  idTiposProtagonistas?: number[];
  idTipoEvidencias?: number | number[];
  objetivo?: string;
  anio?: string;
  cantidadParticipantesProyectados?: number;
  cantidadParticipantesEstudiantesProyectados?: number;
  cantidadTotalParticipantesProtagonistas?: number;
  categoriaActividadId?: number;
  areaConocimientoId?: number;
  esPlanificada?: boolean;
}

export interface SubactividadCreate {
  idActividad: number;
  nombre: string;
  nombreSubactividad?: string; // Alias para nombre
  descripcion?: string;
  idTipoSubactividad?: number | number[];
  fechaInicio?: string;
  fechaFin?: string;
  horaRealizacion?: string;
  horaInicioPrevista?: string;
  departamentoResponsableId?: number | number[];
  idDepartamentosResponsables?: number[];
  departamentoId?: number;
  ubicacion?: string;
  modalidad?: string;
  organizador?: string;
  responsableSubactividad?: string;
  activo?: boolean;
  idCapacidadInstalada?: number;
  idDocenteOrganizador?: number;
  idEstadoActividad?: number;
  semanaMes?: number;
  codigoSubactividad?: string;
  idIndicador?: number;
  idActividadAnual?: number | number[];
  idActividadMensualInst?: number | number[];
  idTipoProtagonista?: number | number[];
  idTiposProtagonistas?: number[];
  idTipoEvidencias?: number | number[];
  objetivo?: string;
  anio?: string;
  cantidadParticipantesProyectados?: number;
  cantidadParticipantesEstudiantesProyectados?: number;
  cantidadTotalParticipantesProtagonistas?: number;
  categoriaActividadId?: number;
  areaConocimientoId?: number;
  esPlanificada?: boolean;
}

export interface SubactividadUpdate extends Partial<SubactividadCreate> {
  // Todos los campos son opcionales en Update
}

export interface SubactividadFilterDto {
  IdActividad?: number;
  IdTipoSubactividad?: number;
  DepartamentoResponsableId?: number;
  BusquedaTexto?: string;
  Nombre?: string;
  FechaInicioDesde?: string;
  FechaInicioHasta?: string;
  FechaFinDesde?: string;
  FechaFinHasta?: string;
  Activo?: boolean;
}

