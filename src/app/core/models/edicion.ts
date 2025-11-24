export interface Edicion {
  id: number;
  idEdicion: number; // Alias para compatibilidad
  idActividad: number;
  actividadId?: number; // Alias legacy
  nombreActividad?: string;
  anio: number;
  año?: number; // Alias legacy
  fechaInicio: string; // DateOnly del backend
  fechaFin: string; // DateOnly del backend
  cupos?: number;
  idCategoriaActividad?: number;
  categoria?: string;
  lugar?: string;
  creadoPor?: number;
  fechaCreacion?: string; // DateTime del backend
  fechaModificacion?: string; // DateTime del backend
}
