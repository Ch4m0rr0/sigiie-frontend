export interface Usuario {
  idUsuario: number;
  id: number; // Alias para compatibilidad, siempre presente
  nombreCompleto: string;
  correo: string;
  rolNombre: string;
  permisos: string[]; // Permisos del rol (nombres como strings)
  permisosPersonalizados?: Array<{ // Permisos adicionales asignados directamente al usuario
    idPermiso: number;
    nombre: string;
    descripcion?: string | null;
    modulo?: string | null;
    activo: boolean;
  }>;
  activo: boolean;
  departamentoId?: number;
}

export interface PermisoBackend {
  idPermiso: number;
  nombre: string | null;
  descripcion: string | null;
  modulo: string | null;
  activo: boolean;
}

export interface UsuarioCreate {
  nombreCompleto: string;
  correo: string;
  contraseña: string;
  idRol: number;
  departamentoId?: number;
  permisos?: number[] | PermisoBackend[]; // IDs o objetos completos de permisos
}

export interface UsuarioUpdate {
  nombreCompleto: string;
  correo: string;
  idRol: number;
  activo: boolean;
  departamentoId?: number;
  permisos?: number[] | PermisoBackend[]; // IDs o objetos completos de permisos
}
