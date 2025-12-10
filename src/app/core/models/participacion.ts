export interface Participacion {
  id: number;
  idParticipacion?: number; // Alias para compatibilidad
  edicionId?: number;
  // NUEVOS CAMPOS
  idSubactividad?: number;
  nombreSubactividad?: string;
  grupoNumero?: number;
  idRolEquipo?: number;
  nombreRolEquipo?: string;
  idTutor?: number;
  nombreTutor?: string;
  // FIN NUEVOS CAMPOS
  estudianteId?: number;
  docenteId?: number;
  administrativoId?: number;
  idEstudiante?: number; // Alias
  idDocente?: number; // Alias
  idAdmin?: number; // Alias
  nombreEstudiante?: string;
  nombreDocente?: string;
  nombreAdmin?: string;
  categoriaParticipacionId: number;
  estadoParticipacionId: number;
  idEstadoParticipacion?: number; // Alias
  fechaParticipacion: Date;
}

export interface ParticipacionCreate {
  edicionId?: number;
  idActividad?: number; // ID de actividad (requerido si no hay idSubactividad)
  idSubactividad?: number; // ID de subactividad (requerido si no hay idActividad)
  grupoNumero?: number;
  idRolEquipo?: number;
  idTutor?: number;
  estudianteId?: number;
  docenteId?: number;
  administrativoId?: number;
  categoriaParticipacionId: number;
  estadoParticipacionId: number;
  fechaParticipacion: Date | string; // Acepta Date o string ISO
}

export interface ParticipacionUpdate extends Partial<ParticipacionCreate> {
  // Todos los campos son opcionales en Update
}
