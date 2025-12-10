import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, map } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { User } from '../models/user';

interface AuthResponse { 
  token: string; 
  user: User; 
}

interface BackendAuthResponse {
  token: string;
  nombre: string;
  correo: string;
  rol: string;
  permisos?: string[]; // Permisos que vienen directamente en la respuesta
}

interface LoginRequest {
  Identificador: string;
  Contrasena: string;
}


@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  
  user = signal<User | null>(this.getStoredUser());
  token = signal<string | null>(this.getStoredToken());

  private getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('siggie_token');
    }
    return null;
  }

  private getStoredUser(): User | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('siggie_user');
      if (userStr && userStr !== 'undefined') {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  login(dto: LoginRequest): Observable<AuthResponse> {
  return this.http.post<BackendAuthResponse>(`${this.baseUrl}/Auth/login`, dto, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }).pipe(
    map(res => {
      console.log('📥 [AUTH] Respuesta del backend en login:', res);
      
      // Priorizar permisos de la respuesta directa, luego del JWT
      let permisos: string[] = [];
      let roles: string[] = [];
      
      // Si vienen permisos directamente en la respuesta, usarlos
      if (res.permisos && res.permisos.length > 0) {
        // Los permisos pueden venir como strings o como objetos con 'nombre'
        permisos = res.permisos.map((p: any) => {
          if (typeof p === 'string') {
            return p;
          } else if (p && typeof p === 'object' && p.nombre) {
            return p.nombre;
          }
          return String(p);
        }).filter(Boolean);
        console.log('✅ [AUTH] Permisos extraídos de la respuesta:', permisos);
      } else {
        // Si no, intentar decodificar el token JWT
        try {
          const tokenPayload = JSON.parse(atob(res.token.split('.')[1]));
          console.log('🔍 [AUTH] Payload del token JWT:', tokenPayload);
          permisos = tokenPayload.permisos || tokenPayload.permissions || [];
          if (permisos.length > 0) {
            console.log('✅ [AUTH] Permisos extraídos del token JWT:', permisos);
          }
        } catch (e) {
          console.warn('⚠️ [AUTH] No se pudieron extraer permisos del token JWT:', e);
        }
      }

      // Mapear el rol
      roles = [res.rol].filter(Boolean);
      console.log('✅ [AUTH] Roles extraídos:', roles);

      const userData = {
        id: 0,
        nombreCompleto: res.nombre,
        correo: res.correo,
        role: res.rol,
        roles: roles,
        permisos: permisos,
        departamentoId: undefined
      };
      
      console.log('✅ [AUTH] Datos del usuario creados:', userData);

      return {
        token: res.token,
        user: userData
      };
    }),
    tap(authRes => {
      this.token.set(authRes.token);
      this.user.set(authRes.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('siggie_token', authRes.token);
        localStorage.setItem('siggie_user', JSON.stringify(authRes.user));
      }
    }),
   catchError(error => {
  console.error('🔴 Error completo en login:', error); // <-- log detallado

  let message = 'Error inesperado al iniciar sesión';

  if (error.status === 0) {
    message = 'No se puede conectar al servidor. Verifica que el backend esté ejecutándose.';
  } else if (error.status === 400) {
    message = 'Datos inválidos. Verifica tu correo y contraseña.';
  } else if (error.status === 401) {
    message = 'Credenciales inválidas.';
  } else if (error.status === 404) {
    message = 'Endpoint no encontrado: /Auth/login.';
  } else if (error.status === 500) {
    message = 'Error interno del servidor.';
  } else if (typeof error.error === 'string' && error.error.includes('<!DOCTYPE')) {
    message = 'El servidor devolvió HTML en lugar de JSON. Verifica la configuración del proxy.';
  } else if (error.error && error.error.message) {
    message = error.error.message;
  } else if (error.message && error.message.includes('Unexpected token')) {
    message = 'El servidor devolvió una respuesta inválida. Verifica la configuración del backend.';
  }

  return throwError(() => new Error(message));
})
  );
}



  logout() {
    this.token.set(null);
    this.user.set(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('siggie_token');
      localStorage.removeItem('siggie_user');
    }
  }

  isAuthenticated(): boolean {
    return !!this.token() && !!this.user();
  }
}
