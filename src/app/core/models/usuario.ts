export interface Usuario {
  idUsuario: number;
  id: number; // Alias para compatibilidad, siempre presente
  nombreCompleto: string;
  correo: string;
  rolNombre: string;
  permisos: string[];
  activo: boolean;
  departamentoId?: number;
}

export interface UsuarioCreate {
  nombreCompleto: string;
  correo: string;
  contraseña: string;
  idRol: number;
  departamentoId?: number;
}

export interface UsuarioUpdate {
  nombreCompleto: string;
  correo: string;
  idRol: number;
  activo: boolean;
  departamentoId?: number;
}
