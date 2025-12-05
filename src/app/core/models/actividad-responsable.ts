export interface ActividadResponsable {
  idActividadResponsable: number;
  idActividad: number;
  idUsuario?: number;
  idDocente?: number;
  idAdmin?: number;
  idEstudiante?: number; // ID de estudiante si el backend lo diferencia
  idResponsableExterno?: number; // ID de responsable externo si el backend lo diferencia
  nombrePersona?: string;
  idTipoResponsable: number;
  nombreTipoResponsable?: string;
  departamentoId?: number;
  nombreDepartamento?: string;
  fechaAsignacion?: string; // DateOnly o DateTime del backend
  rolResponsable?: string;
  rolResponsableDetalle?: string;
  idRolResponsable?: number; // ID del rol responsable
  nombreRolResponsable?: string; // Nombre del rol responsable
  nombreDocente?: string;
  nombreUsuario?: string;
  nombreAdmin?: string;
  nombreEstudiante?: string; // Nombre de estudiante si el backend lo diferencia
  nombreResponsableExterno?: string; // Nombre de responsable externo
  nombreActividad?: string;
  cargo?: string; // Tipo de responsable: "Docente", "Estudiante", "Administrativo", etc.
  institucionResponsableExterno?: string; // Institución del responsable externo
  cargoResponsableExterno?: string; // Cargo del responsable externo
  telefonoResponsableExterno?: string; // Teléfono del responsable externo
  correoResponsableExterno?: string; // Correo del responsable externo
}

