import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { PermisosService } from '../../core/services/permisos.service';

/**
 * Directiva estructural que muestra/oculta elementos según el permiso del usuario
 * Uso: *hasPermission="'proyectos.crear'" o *hasPermission="['proyectos.crear', 'proyectos.editar']"
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private permisosService = inject(PermisosService);

  private permisosRequeridos: string[] = [];
  private requireAll = false;
  private hasView = false;

  @Input() set hasPermission(permisos: string | string[]) {
    this.permisosRequeridos = Array.isArray(permisos) ? permisos : [permisos];
    this.updateView();
  }

  @Input() set hasPermissionAll(requireAll: boolean) {
    this.requireAll = requireAll;
    this.updateView();
  }

  constructor() {
    // Reaccionar a cambios en los permisos del usuario
    effect(() => {
      this.permisosService.permisos();
      this.updateView();
    });
  }

  private updateView(): void {
    const tienePermiso = this.requireAll
      ? this.permisosService.tieneTodosLosPermisos(this.permisosRequeridos)
      : this.permisosService.tieneAlgunPermiso(this.permisosRequeridos);

    if (tienePermiso && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!tienePermiso && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

