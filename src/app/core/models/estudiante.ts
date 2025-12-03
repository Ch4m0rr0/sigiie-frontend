export interface Estudiante {
  id: number;
  nombreCompleto: string;
  matricula: string;
  correo: string;
  generoId?: number; // Opcional - no necesario para actividades
  departamentoId?: number; // Opcional - no necesario para actividades, se obtiene desde carrera si se necesita
  estadoId?: number; // Opcional - no necesario para actividades
  fechaIngreso?: Date; // Opcional
  activo?: boolean; // Opcional
  numeroOrcid?: string; // Opcional
  cedula?: string; // Opcional
  carrera?: string; // Opcional - no necesario para actividades
  idCarrera?: number; // Opcional - columna real en la BD
  idCategoriaParticipacion?: number; // Opcional
  nivelFormacion?: string; // Opcional
}
