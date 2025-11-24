import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProyectosService } from '../../core/services/proyectos.service';
import type { Proyecto } from '../../core/models/proyecto';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-proyecto-detail',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './proyecto-detail.component.html',
})
export class ProyectoDetailComponent implements OnInit {
  private proyectosService = inject(ProyectosService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  proyecto = signal<Proyecto | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProyecto(+id);
    }
  }

  loadProyecto(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.proyectosService.getById(id).subscribe({
      next: (proyecto) => {
        if (proyecto) {
          this.proyecto.set(proyecto);
        } else {
          this.error.set('Proyecto no encontrado');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading proyecto:', err);
        this.error.set('Error al cargar el proyecto. Por favor, intenta nuevamente.');
        this.loading.set(false);
      }
    });
  }

  navigateToEdit(): void {
    const id = this.proyecto()?.id;
    if (id) {
      this.router.navigate(['/proyectos', id, 'editar']);
    }
  }

  deleteProyecto(): void {
    const id = this.proyecto()?.id;
    if (!id) return;

    if (confirm('¿Estás seguro de que deseas eliminar este proyecto?')) {
      this.proyectosService.delete(id).subscribe({
        next: (success) => {
          if (success) {
            this.router.navigate(['/proyectos']);
          } else {
            this.error.set('Error al eliminar el proyecto');
          }
        },
        error: (err) => {
          console.error('Error deleting proyecto:', err);
          this.error.set('Error al eliminar el proyecto. Por favor, intenta nuevamente.');
        }
      });
    }
  }
}

