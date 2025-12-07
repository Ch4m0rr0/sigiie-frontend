export interface DocumentoDivulgado {
  id: number;
  nombreDocumento: string;
  idTipoDocumentoDivulgado?: number;
  nombreTipoDocumentoDivulgado?: string;
  cantidadEstudiantesParticipantes?: number;
  cantidadDocentesParticipantes?: number;
  cantidadAdministrativosParticipantes?: number;
  participantesDivulgacionCientifica?: number;
  cantidadProductos?: number;
  archivoRespaldoUrl?: string;
  linkAcceso?: string;
  departamentoId?: number;
  nombreDepartamento?: string;
  fechaCreacion?: string;
  fechaModificacion?: string;
}

export interface DocumentoDivulgadoCreate {
  nombreDocumento: string;
  idTipoDocumentoDivulgado?: number;
  cantidadEstudiantesParticipantes?: number;
  cantidadDocentesParticipantes?: number;
  cantidadAdministrativosParticipantes?: number;
  participantesDivulgacionCientifica?: number;
  cantidadProductos?: number;
  archivoRespaldo?: File;
  linkAcceso?: string;
  departamentoId?: number;
}

export interface DocumentoDivulgadoUpdate extends Partial<DocumentoDivulgadoCreate> {
  // Todos los campos son opcionales en Update
}

