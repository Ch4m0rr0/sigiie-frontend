import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProyectosService } from '../../core/services/proyectos.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Proyecto } from '../../core/models/proyecto';
import { IconComponent } from '../../shared/icon/icon.component';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-list-proyectos',
  imports: [CommonModule, RouterModule, IconComponent, HasPermissionDirective, ...BrnButtonImports],
  templateUrl: './proyectos.component.html',
})
export class ListProyectosComponent implements OnInit {
  private proyectosService = inject(ProyectosService);
  private catalogosService = inject(CatalogosService);
  private router = inject(Router);

  proyectos = signal<Proyecto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filtros
  filtroBusqueda = signal<string>('');
  filtroEstado = signal<number | null>(null); // null = todos, number = ID del estado de proyecto

  // Estados de proyecto para el filtro
  estadosProyecto = signal<any[]>([]);

  // Dropdown de nuevo proyecto
  mostrarDropdownTipoProyecto = signal(false);

  // Modo de vista: 'cards' | 'lista'
  modoVista = signal<'cards' | 'lista'>('lista');

  ngOnInit(): void {
    this.loadEstadosProyecto();
    this.loadProyectos();
  }

  loadEstadosProyecto(): void {
    this.catalogosService.getEstadosProyecto().subscribe({
      next: (data) => {
        this.estadosProyecto.set(data);
      },
      error: (err) => {
        console.error('Error loading estados proyecto:', err);
        this.estadosProyecto.set([]);
      }
    });
  }

  loadProyectos(): void {
    this.loading.set(true);
    this.error.set(null);

    // Si hay filtro por estado, usar el endpoint /api/EstadoProyecto/{id}
    if (this.filtroEstado() !== null) {
      this.proyectosService.getByEstadoId(this.filtroEstado()!).subscribe({
        next: (data) => {
          // Aplicar filtro de búsqueda del lado del cliente
          let filtered = data;
          if (this.filtroBusqueda()) {
            const searchTerm = this.filtroBusqueda().toLowerCase();
            filtered = filtered.filter(p => {
              const nombre = (p.nombreProyecto || p.nombre || '').toLowerCase();
              const descripcion = (p.descripcion || '').toLowerCase();
              const responsable = (p.responsableNombre || '').toLowerCase();
              const departamento = (p.departamento || '').toLowerCase();
              return nombre.includes(searchTerm) ||
                     descripcion.includes(searchTerm) ||
                     responsable.includes(searchTerm) ||
                     departamento.includes(searchTerm);
            });
          }
          console.log('✅ Proyectos cargados por estado:', filtered.length);
          this.proyectos.set(filtered);
          this.loading.set(false);
        },
        error: (err) => {
          // Solo mostrar error al usuario si no es un 404 (endpoint no implementado)
          if (err.status !== 404) {
            console.error('❌ Error loading proyectos by estado:', err);
            this.error.set('Error al cargar los proyectos. Por favor, intenta nuevamente.');
          } else {
            // Si es 404, solo mostrar lista vacía sin error
            console.warn('⚠️ Endpoint de proyectos no disponible aún en el backend.');
          }
          this.loading.set(false);
        }
      });
    } else {
      // Usar GetAllAsync() - sin filtros del backend, filtramos en el cliente
      this.proyectosService.getAll().subscribe({
        next: (data) => {
          // Aplicar filtro de búsqueda del lado del cliente
          let filtered = data;
          if (this.filtroBusqueda()) {
            const searchTerm = this.filtroBusqueda().toLowerCase();
            filtered = filtered.filter(p => {
              const nombre = (p.nombreProyecto || p.nombre || '').toLowerCase();
              const descripcion = (p.descripcion || '').toLowerCase();
              const responsable = (p.responsableNombre || '').toLowerCase();
              const departamento = (p.departamento || '').toLowerCase();
              return nombre.includes(searchTerm) ||
                     descripcion.includes(searchTerm) ||
                     responsable.includes(searchTerm) ||
                     departamento.includes(searchTerm);
            });
          }
          console.log('✅ Proyectos cargados:', filtered.length);
          this.proyectos.set(filtered);
          this.loading.set(false);
        },
        error: (err) => {
          // Solo mostrar error al usuario si no es un 404 (endpoint no implementado)
          if (err.status !== 404) {
            console.error('❌ Error loading proyectos:', err);
            this.error.set('Error al cargar los proyectos. Por favor, intenta nuevamente.');
          } else {
            // Si es 404, solo mostrar lista vacía sin error
            console.warn('⚠️ Endpoint de proyectos no disponible aún en el backend.');
          }
          this.loading.set(false);
        }
      });
    }
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/proyectos', id]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/proyectos/nuevo']);
  }

  toggleDropdownTipoProyecto(): void {
    this.mostrarDropdownTipoProyecto.set(!this.mostrarDropdownTipoProyecto());
  }

  seleccionarTipoProyecto(tipo: 'actividad' | 'administrativo' | 'docente' | 'estudiante' | 'planificado' | 'no-planificado'): void {
    this.mostrarDropdownTipoProyecto.set(false);
    
    // Navegar a la ruta correspondiente según el tipo
    if (tipo === 'actividad') {
      this.router.navigate(['/proyectos-actividad/nuevo']);
    } else if (tipo === 'administrativo') {
      this.router.navigate(['/proyectos-administrativo/nuevo']);
    } else if (tipo === 'docente') {
      this.router.navigate(['/proyectos-docente/nuevo']);
    } else if (tipo === 'estudiante') {
      this.router.navigate(['/proyectos-estudiante/nuevo']);
    } else if (tipo === 'planificado' || tipo === 'no-planificado') {
      // Proyectos planificados y no planificados van al formulario de proyecto normal
      this.router.navigate(['/proyectos/nuevo'], { 
        queryParams: { tipo: tipo } 
      });
    } else {
      // Por ahora los demás tipos van al formulario de proyecto normal
      this.router.navigate(['/proyectos/nuevo'], { 
        queryParams: { tipo: tipo } 
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Verificar si el clic fue dentro del dropdown de proyectos
    const isInsideDropdown = target.closest('.dropdown-proyecto');
    
    // Si el clic fue fuera del dropdown, cerrarlo
    if (!isInsideDropdown) {
      this.mostrarDropdownTipoProyecto.set(false);
    }
  }

  onEstadoChange(value: string): void {
    if (value === '') {
      this.filtroEstado.set(null);
    } else {
      const estadoId = parseInt(value, 10);
      this.filtroEstado.set(isNaN(estadoId) ? null : estadoId);
    }
    this.onFiltroChange();
  }

  onFiltroChange(): void {
    this.loadProyectos();
  }

  clearFilters(): void {
    this.filtroBusqueda.set('');
    this.filtroEstado.set(null);
    this.loadProyectos();
  }

  cambiarModoVista(modo: 'cards' | 'lista'): void {
    this.modoVista.set(modo);
  }

  getEstadoBadgeClass(estado?: string): string {
    if (!estado) return 'bg-gray-100 text-gray-800';
    
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes('activo') || estadoLower.includes('en progreso')) {
      return 'bg-green-100 text-green-800';
    } else if (estadoLower.includes('pausado') || estadoLower.includes('pendiente')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (estadoLower.includes('completado') || estadoLower.includes('finalizado')) {
      return 'bg-blue-100 text-blue-800';
    } else if (estadoLower.includes('cancelado')) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  }
}
