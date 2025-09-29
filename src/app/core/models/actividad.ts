export interface Actividad {
  id: number;
  nombre: string;
  descripcion: string;
  categoriaActividadId: number;
  tipoUnidadId: number;
  areaConocimientoId: number;
  activo: boolean;
  fechaCreacion: Date;
}
