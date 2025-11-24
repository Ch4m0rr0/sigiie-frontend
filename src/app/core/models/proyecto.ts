export interface ProyectoParticipante {
  tipo: string;
  id: number;
  nombreCompleto: string;
  rolEnProyecto?: string;
}

export interface Proyecto {
  id: number;
  idProyecto: number; // Alias para compatibilidad
  nombre: string;
  nombreProyecto: string; // Alias para compatibilidad
  descripcion?: string;
  estado?: string;
  fechaInicio?: string;
  fechaFin?: string;
  soporteDocumentoUrl?: string;
  departamento?: string;
  departamentoId?: number;
  edicion?: string;
  idEdicion?: number;
  tipoIniciativa?: string;
  idTipoIniciativa?: number;
  tipoInvestigacion?: string;
  idTipoInvestigacion?: number;
  areaConocimiento?: string;
  idAreaConocimiento?: number;
  tipoDocumento?: string;
  idTipoDocumento?: number;
  tipoAutor?: string;
  idEstadoProyecto?: number;
  // Participantes
  docentes?: ProyectoParticipante[];
  estudiantes?: ProyectoParticipante[];
  administrativos?: ProyectoParticipante[];
  // Campos calculados/legacy
  responsableNombre?: string; // Primer participante o combinación
  progreso?: number; // Calculado si es necesario
  fechaCreacion?: string;
  fechaModificacion?: string;
}

export interface ProyectoParticipanteCreate {
  id: number;
  rolEnProyecto?: string;
}

export interface ProyectoCreate {
  nombreProyecto: string;
  descripcion?: string;
  fechaInicio?: string; // DateOnly en formato string
  fechaFin?: string; // DateOnly en formato string
  departamentoId?: number;
  idEstadoProyecto?: number;
  idEdicion?: number;
  idTipoIniciativa?: number;
  idTipoInvestigacion?: number;
  idAreaConocimiento?: number;
  idTipoDocumento?: number;
  tipoAutor?: string;
  archivoSoporte?: File;
  docentes?: ProyectoParticipanteCreate[];
  estudiantes?: ProyectoParticipanteCreate[];
  administrativos?: ProyectoParticipanteCreate[];
}

export interface ProyectoUpdate extends ProyectoCreate {
  // Todos los campos son opcionales en Update
}

