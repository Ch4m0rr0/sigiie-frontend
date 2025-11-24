export interface Estudiante {
  id: number;
  nombreCompleto: string;
  matricula: string;
  correo: string;
  generoId: number;
  departamentoId: number;
  estadoId: number;
  fechaIngreso: Date;
  activo: boolean;
  numeroOrcid?: string; // Opcional
  cedula?: string; // Opcional
  carrera?: string; // Opcional
  idCategoriaParticipacion?: number; // Opcional
  nivelFormacion?: string; // Opcional
}
