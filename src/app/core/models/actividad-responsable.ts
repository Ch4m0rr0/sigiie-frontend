export interface ActividadResponsable {
  idActividadResponsable: number;
  idActividad: number;
  idUsuario?: number;
  idDocente?: number;
  idAdmin?: number;
  nombrePersona?: string;
  idTipoResponsable: number;
  nombreTipoResponsable?: string;
  departamentoId?: number;
  nombreDepartamento?: string;
  fechaAsignacion?: string; // DateOnly o DateTime del backend
  rolResponsable?: string;
  rolResponsableDetalle?: string;
  nombreDocente?: string;
  nombreUsuario?: string;
  nombreAdmin?: string;
  nombreActividad?: string;
}

