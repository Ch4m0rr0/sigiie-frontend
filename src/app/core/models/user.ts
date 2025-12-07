export interface User {
    id: number;
    nombreCompleto: string;
    correo: string;
    role: string; // 'Encargado' | 'Sub_Encargado' | ...
    roles?: string[]; // Array de nombres de roles
    permisos?: string[]; // Array de nombres de permisos
    departamentoId?: number;
  }
  