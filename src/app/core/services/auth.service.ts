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
    map(res => ({
      token: res.token,
      user: {
        id: 0,
        nombreCompleto: res.nombre,
        correo: res.correo,
        role: res.rol,
        departamentoId: undefined
      }
    })),
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
