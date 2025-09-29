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
}
