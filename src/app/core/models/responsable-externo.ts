export interface ResponsableExterno {
  id: number;
  nombre: string; // Obligatorio
  institucion: string; // Obligatorio
  cargo?: string; // Opcional
  telefono?: string; // Opcional
  correo?: string; // Opcional
  activo: boolean;
  // Campos calculados del backend (no se envían en create/update)
  creadoPor?: number;
  nombreCreador?: string;
  fechaCreacion?: Date;
  fechaModificacion?: Date | null;
}





