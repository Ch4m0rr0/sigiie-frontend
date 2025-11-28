export interface Docente {
  id: number;
  nombreCompleto: string;
  correo: string;
  generoId: number; // Requerido según DocenteCreateDto
  departamentoId: number;
  activo: boolean;
  numeroOrcid?: string; // Opcional
  cedula?: string; // Opcional según DocenteDto
  nivelAcademico?: string; // Opcional según DocenteDto
}
