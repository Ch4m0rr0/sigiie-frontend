import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReportesService, ReporteGenerado } from '../../core/services/reportes.service';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { ActividadesService } from '../../core/services/actividades.service';
import type { Planificacion } from '../../core/models/planificacion';
import type { Actividad } from '../../core/models/actividad';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-reportes-list',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './reportes-list.component.html',
})
export class ReportesListComponent implements OnInit {
  private reportesService = inject(ReportesService);
  private planificacionService = inject(PlanificacionService);
  private actividadesService = inject(ActividadesService);
  private router = inject(Router);

  reportes = signal<ReporteGenerado[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadReportes();
  }

  loadReportes(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reportesService.getAll().subscribe({
      next: (data) => {
        this.reportes.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading reportes:', err);
        const message =
          err?.message ||
          err?.error?.message ||
          'No se pudieron cargar los reportes. El servidor respondió con un error.';
        this.error.set(message);
        this.loading.set(false);
      }
    });
  }

  navigateToGenerar(): void {
    this.router.navigate(['/reportes/generar']);
  }

  descargarReporte(id: number): void {
    this.loading.set(true);
    this.reportesService.descargar(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Intentar obtener el nombre del reporte para el nombre del archivo
        const reporte = this.reportes().find(r => r.id === id);
        const nombreArchivo = reporte?.nombre || `reporte-${id}`;
        const extension = blob.type.includes('excel') || blob.type.includes('spreadsheet') ? 'xlsx' : 'pdf';
        a.download = `${nombreArchivo}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error downloading reporte:', err);
        this.error.set('Error al descargar el reporte');
        this.loading.set(false);
      }
    });
  }

  deleteReporte(id: number): void {
    if (confirm('¿Está seguro de que desea eliminar este reporte?')) {
      this.loading.set(true);
      this.reportesService.delete(id).subscribe({
        next: () => {
          this.loadReportes();
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error deleting reporte:', err);
          this.error.set('Error al eliminar el reporte');
          this.loading.set(false);
        }
      });
    }
  }
}

