export interface EstadoActividad {
  id: number;
  idEstadoActividad?: number; // Alias para compatibilidad
  nombre: string;
  descripcion?: string;
  color?: string; // Color del estado (hex)
}

export interface EstadoActividadCreate {
  nombre: string;
  descripcion?: string;
}

export interface EstadoActividadUpdate {
  nombre: string;
  descripcion?: string;
}

