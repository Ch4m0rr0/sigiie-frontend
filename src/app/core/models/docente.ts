export interface Docente {
  id: number;
  nombreCompleto: string;
  correo: string;
  idGenero: number; // Cambiado de generoId a idGenero
  departamentoId: number;
  activo: boolean;
  numeroOrcid?: string; // Opcional
  cedula?: string; // Opcional
  numeroTelefono?: string; // Opcional, nuevo campo
  idNivelAcademico?: number; // Opcional, cambiado de nivelAcademico (string) a idNivelAcademico (number)
  // Campos calculados del backend (no se envían en create/update)
  genero?: string; // Nombre del género (solo lectura)
  departamento?: string; // Nombre del departamento (solo lectura)
  nombreNivelAcademico?: string; // Nombre del nivel académico (solo lectura)
}
