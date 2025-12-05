import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { PermisosService } from '../../core/services/permisos.service';

/**
 * Directiva estructural que muestra/oculta elementos según el rol del usuario
 * Uso: *hasRole="'Administrador del Sistema'" o *hasRole="['Administrador', 'Encargado']"
 */
@Directive({
  selector: '[hasRole]',
  standalone: true
})
export class HasRoleDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private permisosService = inject(PermisosService);

  private rolesRequeridos: string[] = [];
  private hasView = false;

  @Input() set hasRole(roles: string | string[]) {
    this.rolesRequeridos = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  constructor() {
    // Reaccionar a cambios en los roles del usuario
    effect(() => {
      this.permisosService.roles();
      this.updateView();
    });
  }

  private updateView(): void {
    const tieneRol = this.permisosService.tieneAlgunRol(this.rolesRequeridos);

    if (tieneRol && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!tieneRol && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

