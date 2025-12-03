export interface Estudiante {
  id: number;
  nombreCompleto: string;
  numeroCarnet: string; // Cambiado de matricula a numeroCarnet
  correo: string;
  idGenero: number; // Cambiado de generoId a idGenero
  idCarrera: number; // Obligatorio, cambiado de carrera (string) a idCarrera (number)
  idEstadoEstudiante: number; // Cambiado de estadoId a idEstadoEstudiante
  activo: boolean;
  numeroOrcid?: string; // Opcional
  cedula?: string; // Opcional
  numeroTelefono?: string; // Opcional, nuevo campo
  idCategoriaParticipacion?: number; // Opcional
  nivelFormacion?: string; // Opcional
  // Campos calculados del backend (no se envían en create/update)
  carrera?: string; // Nombre de la carrera (solo lectura)
  departamento?: string; // Nombre del departamento (solo lectura)
  genero?: string; // Nombre del género (solo lectura)
  estadoEstudiante?: string; // Nombre del estado (solo lectura)
  categoriaParticipacion?: string; // Nombre de la categoría (solo lectura)
}
