import { Component, inject, signal } from '@angular/core'; // 1. Importar signal
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { AuthService } from '../../core/services/auth.service';
import { PermisosService } from '../../core/services/permisos.service';
import { HasPermissionDirective } from '../directives/has-permission.directive';

// Spartan UI brain components
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [
    CommonModule, 
    RouterLink, 
    RouterLinkActive, 
    IconComponent, 
    ...BrnButtonImports,
    HasPermissionDirective
  ],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private permisosService = inject(PermisosService);
  private router = inject(Router);

  // 2. Definir la señal de estado (False = Abierto por defecto)
  isCollapsed = signal(false);

  // Exponer el usuario para el template
  user = this.authService.user;

  // Obtener el nombre completo del usuario (concatenado)
  getNombreCompleto(): string {
    const usuario = this.user();
    if (!usuario) return 'Usuario';
    
    // Si ya tiene nombreCompleto, usarlo
    if (usuario.nombreCompleto) {
      return usuario.nombreCompleto.trim();
    }
    
    return 'Usuario';
  }

  // Obtener las iniciales del nombre para el avatar
  getIniciales(): string {
    const nombre = this.getNombreCompleto();
    if (!nombre || nombre === 'Usuario') return 'U';
    
    // Dividir el nombre en palabras
    const palabras = nombre.trim().split(/\s+/);
    
    if (palabras.length === 0) return 'U';
    
    // Si hay una sola palabra, tomar las primeras 2 letras
    if (palabras.length === 1) {
      return palabras[0].substring(0, 2).toUpperCase();
    }
    
    // Si hay múltiples palabras, tomar la primera letra de las primeras 2 palabras
    const primeraLetra = palabras[0].charAt(0).toUpperCase();
    const segundaLetra = palabras[1].charAt(0).toUpperCase();
    
    return primeraLetra + segundaLetra;
  }

  // 3. Método para cambiar el estado (llamado por el botón de la flecha)
  toggleSidebar() {
    this.isCollapsed.update((val) => !val);
  }

  logout() {
    console.log('🔴 Botón de logout presionado');

    // Limpiar datos de autenticación
    this.authService.logout();
    console.log('🔴 Datos de autenticación limpiados');

    // Redirigir al login
    this.router.navigate(['/']);
    console.log('🔴 Redirigiendo al login');
  }

  // Verificar si el usuario puede ver el menú de usuarios (solo admin o usuarios con todos los permisos)
  puedeVerUsuarios(): boolean {
    // Solo mostrar si es admin o tiene todos los permisos
    return this.permisosService.tieneTodosLosPermisosDeAdmin();
  }
}