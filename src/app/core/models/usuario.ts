export interface Usuario {
  id: number;
  nombreCompleto: string;
  correo: string;
  identificador: string;
  contrasena?: string; // Opcional para updates
  role: string;
  departamentoId?: number;
  activo: boolean;
  creadoPor?: number;
  fechaCreacion: Date;
}
