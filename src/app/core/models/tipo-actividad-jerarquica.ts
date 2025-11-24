export interface TipoActividadJerarquica {
  id: number;
  idTipoActividadJerarquica?: number; // Alias para compatibilidad
  nombre: string;
  descripcion?: string;
}

export interface TipoActividadJerarquicaCreate {
  nombre: string;
  descripcion?: string;
}

export interface TipoActividadJerarquicaUpdate {
  nombre: string;
  descripcion?: string;
}

