export interface Subactividad {
  idSubactividad: number;
  idActividad: number;
  nombreActividad?: string; // Para mostrar
  nombre: string;
  descripcion?: string;
  idTipoSubactividad?: number;
  nombreTipoSubactividad?: string;
  fechaInicio?: string;
  fechaFin?: string;
  departamentoResponsableId?: number;
  nombreDepartamentoResponsable?: string;
  ubicacion?: string;
  modalidad?: string;
  organizador?: string;
  activo: boolean;
  creadoPor: number;
  fechaCreacion: string;
  fechaModificacion?: string;
  idCapacidadInstalada?: number;
  idDocenteOrganizador?: number;
}

export interface SubactividadCreate {
  idActividad: number;
  nombre: string;
  descripcion?: string;
  idTipoSubactividad?: number;
  fechaInicio?: string;
  fechaFin?: string;
  departamentoResponsableId?: number;
  ubicacion?: string;
  modalidad?: string;
  organizador?: string;
  activo?: boolean;
  idCapacidadInstalada?: number;
  idDocenteOrganizador?: number;
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

