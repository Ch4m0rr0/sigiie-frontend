export interface EstadoActividad {
  id: number;
  idEstadoActividad?: number; // Alias para compatibilidad
  nombre: string;
  descripcion?: string;
}

export interface EstadoActividadCreate {
  nombre: string;
  descripcion?: string;
}

export interface EstadoActividadUpdate {
  nombre: string;
  descripcion?: string;
}

