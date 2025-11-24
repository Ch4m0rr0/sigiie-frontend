export interface CategoriaActividad {
  id: number;
  idCategoriaActividad?: number; // Alias para compatibilidad con backend
  nombre: string;
  descripcion?: string;
}

export interface CategoriaActividadCreate {
  nombre: string;
  descripcion?: string;
}

export interface CategoriaActividadUpdate {
  nombre: string;
  descripcion?: string;
}
