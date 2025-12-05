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
}