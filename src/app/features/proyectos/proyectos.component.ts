import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProyectosService } from '../../core/services/proyectos.service';
import type { Proyecto } from '../../core/models/proyecto';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-list-proyectos',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './proyectos.component.html',
})
export class ListProyectosComponent implements OnInit {
  private proyectosService = inject(ProyectosService);
  private router = inject(Router);

  proyectos = signal<Proyecto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filtros
  filtroBusqueda = signal<string>('');
  filtroEstado = signal<boolean | null>(null); // null = todos, true = activos, false = inactivos

  ngOnInit(): void {
    this.loadProyectos();
  }

  loadProyectos(): void {
    this.loading.set(true);
    this.error.set(null);

    // Si hay filtro por estado, usar GetByEstadoAsync
    if (this.filtroEstado() !== null) {
      this.proyectosService.getByEstado(this.filtroEstado()!).subscribe({
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

  onFiltroChange(): void {
    this.loadProyectos();
  }

  clearFilters(): void {
    this.filtroBusqueda.set('');
    this.filtroEstado.set(null);
    this.loadProyectos();
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
