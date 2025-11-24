export interface Docente {
  id: number;
  nombreCompleto: string;
  correo: string;
  departamentoId: number;
  activo: boolean;
  numeroOrcid?: string; // Opcional
}
