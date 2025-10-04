import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { AuthService } from '../../core/services/auth.service';

// Spartan UI brain components
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent, ...BrnButtonImports],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

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
