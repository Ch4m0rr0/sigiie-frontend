export interface Administrativo {
  id: number;
  nombreCompleto: string;
  correo: string;
  generoId: number; // Requerido según AdministrativoCreateDto
  departamentoId: number;
  activo: boolean;
  cedula?: string; // Opcional según AdministrativoDto
  numeroOrcid?: string; // Opcional según AdministrativoDto
  puesto?: string; // Opcional según AdministrativoDto
}
