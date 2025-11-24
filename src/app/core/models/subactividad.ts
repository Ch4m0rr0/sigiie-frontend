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
  fechaCreacion: string;
  fechaModificacion?: string;
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
}

