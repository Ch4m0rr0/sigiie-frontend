export interface Participacion {
  id: number;
  edicionId: number;
  estudianteId?: number;
  docenteId?: number;
  administrativoId?: number;
  categoriaParticipacionId: number;
  estadoParticipacionId: number;
  fechaParticipacion: Date;
}
