export interface Permiso {
  id: number;
  idPermiso?: number; // Alias para compatibilidad con backend
  nombre: string;
  descripcion?: string;
  modulo?: string;
  activo?: boolean;
}
