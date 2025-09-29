export interface User {
    id: number;
    nombreCompleto: string;
    correo: string;
    role: string; // 'Encargado' | 'Sub_Encargado' | ...
    departamentoId?: number;
  }
  