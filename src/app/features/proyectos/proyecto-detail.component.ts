import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProyectosService } from '../../core/services/proyectos.service';
import { ProyectoActividadService } from '../../core/services/proyecto-actividad.service';
import { DocumentosDivulgadosService } from '../../core/services/documentos-divulgados.service';
import type { Proyecto } from '../../core/models/proyecto';
import type { Actividad } from '../../core/models/actividad';
import type { DocumentoDivulgado } from '../../core/models/documento-divulgado';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { DatePipe } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-proyecto-detail',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports, DatePipe],
  templateUrl: './proyecto-detail.component.html',
})
export class ProyectoDetailComponent implements OnInit {
  private proyectosService = inject(ProyectosService);
  private proyectoActividadService = inject(ProyectoActividadService);
  private documentosDivulgadosService = inject(DocumentosDivulgadosService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  proyecto = signal<Proyecto | null>(null);
  actividades = signal<Actividad[]>([]);
  documentosDivulgados = signal<DocumentoDivulgado[]>([]);
  loading = signal(false);
  loadingActividades = signal(false);
  loadingDocumentos = signal(false);
  error = signal<string | null>(null);
  mostrarActividades = signal(true);
  mostrarDocumentos = signal(true);

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
          this.loadActividades(id);
          this.loadDocumentosDivulgados(id);
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

  loadActividades(idProyecto: number): void {
    this.loadingActividades.set(true);
    this.proyectoActividadService.getActividadesByProyecto(idProyecto).subscribe({
      next: (actividades) => {
        this.actividades.set(actividades);
        this.loadingActividades.set(false);
      },
      error: (err) => {
        console.error('Error loading actividades:', err);
        this.actividades.set([]);
        this.loadingActividades.set(false);
      }
    });
  }

  navigateToActividad(id: number): void {
    this.router.navigate(['/actividades', id]);
  }

  navigateToNuevaActividad(): void {
    const proyectoId = this.proyecto()?.id;
    if (proyectoId) {
      this.router.navigate(['/actividades-planificadas/nueva'], { 
        queryParams: { idProyecto: proyectoId } 
      });
    } else {
      this.router.navigate(['/actividades-planificadas/nueva']);
    }
  }

  desasociarActividad(idActividad: number): void {
    const proyectoId = this.proyecto()?.id;
    if (!proyectoId) return;

    if (confirm('¿Estás seguro de que deseas desasociar esta actividad del proyecto?')) {
      this.proyectoActividadService.delete(proyectoId, idActividad).subscribe({
        next: (success) => {
          if (success) {
            this.loadActividades(proyectoId);
          } else {
            this.error.set('Error al desasociar la actividad');
          }
        },
        error: (err) => {
          console.error('Error desasociando actividad:', err);
          this.error.set('Error al desasociar la actividad. Por favor, intenta nuevamente.');
        }
      });
    }
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

  loadDocumentosDivulgados(idProyecto: number): void {
    this.loadingDocumentos.set(true);
    // Por ahora cargamos todos los documentos, más adelante se puede agregar un endpoint específico por proyecto
    this.documentosDivulgadosService.getAll().subscribe({
      next: (documentos) => {
        // Filtrar por proyecto si hay un campo idProyecto en el modelo
        // Por ahora mostramos todos, se puede ajustar cuando el backend tenga el endpoint
        this.documentosDivulgados.set(documentos);
        this.loadingDocumentos.set(false);
      },
      error: (err) => {
        console.error('Error loading documentos divulgados:', err);
        this.documentosDivulgados.set([]);
        this.loadingDocumentos.set(false);
      }
    });
  }

  navigateToNuevoDocumentoDivulgado(): void {
    const proyectoId = this.proyecto()?.id;
    if (proyectoId) {
      this.router.navigate(['/documentos-divulgados/nuevo'], { 
        queryParams: { proyectoId: proyectoId } 
      });
    } else {
      this.router.navigate(['/documentos-divulgados/nuevo']);
    }
  }

  navigateToDocumentoDivulgado(id: number): void {
    this.router.navigate(['/documentos-divulgados', id, 'editar']);
  }

  eliminarDocumentoDivulgado(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este documento divulgado?')) {
      this.documentosDivulgadosService.delete(id).subscribe({
        next: (success) => {
          if (success) {
            const proyectoId = this.proyecto()?.id;
            if (proyectoId) {
              this.loadDocumentosDivulgados(proyectoId);
            }
          } else {
            this.error.set('Error al eliminar el documento divulgado');
          }
        },
        error: (err) => {
          console.error('Error eliminando documento divulgado:', err);
          this.error.set('Error al eliminar el documento divulgado. Por favor, intenta nuevamente.');
        }
      });
    }
  }
}

