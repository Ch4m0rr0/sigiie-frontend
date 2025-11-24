import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PersonasService } from '../../core/services/personas.service';
import type { Estudiante } from '../../core/models/estudiante';
import type { Docente } from '../../core/models/docente';
import type { Administrativo } from '../../core/models/administrativo';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-list-personas',
  imports: [CommonModule, FormsModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './personas.component.html',
})
export class ListPersonasComponent implements OnInit {
  private personasService = inject(PersonasService);
  private router = inject(Router);
  private searchTimeout: any;

  selectedTipo = signal<'estudiantes' | 'docentes' | 'administrativos'>('estudiantes');
  busqueda = signal<string>('');
  busquedaDebounced = signal<string>(''); // Inicializado vacío, se actualiza con debounce
  
  estudiantes = signal<Estudiante[]>([]);
  docentes = signal<Docente[]>([]);
  administrativos = signal<Administrativo[]>([]);
  
  loadingEstudiantes = signal(false);
  loadingDocentes = signal(false);
  loadingAdministrativos = signal(false);
  deletingId = signal<number | null>(null);
  
  error = signal<string | null>(null);
  lastLoadTime = signal<Date | null>(null);

  // Computed para filtrar según búsqueda (con debounce)
  estudiantesFiltrados = computed(() => {
    const estudiantes = this.estudiantes();
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    
    // Log para debugging
    console.log('🔄 estudiantesFiltrados - Total estudiantes:', estudiantes.length);
    console.log('🔄 estudiantesFiltrados - Búsqueda:', busqueda);
    if (estudiantes.length > 0) {
      console.log('🔄 estudiantesFiltrados - Primer estudiante:', estudiantes[0]);
    }
    
    if (!busqueda) return estudiantes;
    const filtrados = estudiantes.filter(e => 
      e.nombreCompleto?.toLowerCase().includes(busqueda) ||
      e.matricula?.toLowerCase().includes(busqueda) ||
      e.correo?.toLowerCase().includes(busqueda)
    );
    console.log('🔄 estudiantesFiltrados - Filtrados:', filtrados.length);
    return filtrados;
  });

  docentesFiltrados = computed(() => {
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    if (!busqueda) return this.docentes();
    return this.docentes().filter(d => 
      d.nombreCompleto?.toLowerCase().includes(busqueda) ||
      d.correo?.toLowerCase().includes(busqueda)
    );
  });

  administrativosFiltrados = computed(() => {
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    if (!busqueda) return this.administrativos();
    return this.administrativos().filter(a => 
      a.nombreCompleto?.toLowerCase().includes(busqueda) ||
      a.correo?.toLowerCase().includes(busqueda)
    );
  });

  // Estadísticas
  estadisticas = computed(() => ({
    totalEstudiantes: this.estudiantes().length,
    activosEstudiantes: this.estudiantes().filter(e => e.activo).length,
    totalDocentes: this.docentes().length,
    activosDocentes: this.docentes().filter(d => d.activo).length,
    totalAdministrativos: this.administrativos().length,
    activosAdministrativos: this.administrativos().filter(a => a.activo !== false).length, // Si no tiene activo, se considera activo
  }));

  isLoading = computed(() => 
    this.loadingEstudiantes() || this.loadingDocentes() || this.loadingAdministrativos()
  );

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.error.set(null);
    this.lastLoadTime.set(new Date());
    
    // Establecer estados de carga
    this.loadingEstudiantes.set(true);
    this.loadingDocentes.set(true);
    this.loadingAdministrativos.set(true);
    
    console.log('🔄 ListPersonasComponent - Iniciando carga de todas las personas...');
    
    // Cargar todos en paralelo
    forkJoin({
      estudiantes: this.personasService.listEstudiantes().pipe(
        catchError(err => {
          console.error('❌ Error cargando estudiantes:', err);
          console.error('❌ Error status:', err.status);
          console.error('❌ Error message:', err.message);
          return of([]);
        })
      ),
      docentes: this.personasService.listDocentes().pipe(
        catchError(err => {
          console.error('❌ Error cargando docentes:', err);
          return of([]);
        })
      ),
      administrativos: this.personasService.listAdministrativos().pipe(
        catchError(err => {
          console.error('❌ Error cargando administrativos:', err);
          return of([]);
        })
      )
    }).pipe(
      finalize(() => {
        this.loadingEstudiantes.set(false);
        this.loadingDocentes.set(false);
        this.loadingAdministrativos.set(false);
      })
    ).subscribe({
      next: (data) => {
        console.log('✅ ListPersonasComponent - Datos recibidos:', {
          estudiantes: data.estudiantes.length,
          docentes: data.docentes.length,
          administrativos: data.administrativos.length
        });
        console.log('✅ ListPersonasComponent - Primer estudiante (si existe):', data.estudiantes[0]);
        
        this.estudiantes.set(data.estudiantes);
        this.docentes.set(data.docentes);
        this.administrativos.set(data.administrativos);
        
        console.log('✅ ListPersonasComponent - Signals actualizados:', {
          estudiantes: this.estudiantes().length,
          docentes: this.docentes().length,
          administrativos: this.administrativos().length
        });
      },
      error: (err) => {
        console.error('❌ ListPersonasComponent - Error cargando personas:', err);
        this.error.set('Error al cargar los datos. Intenta recargar la página.');
      }
    });
  }

  reloadCurrent() {
    const tipo = this.selectedTipo();
    if (tipo === 'estudiantes') {
      this.loadingEstudiantes.set(true);
      this.personasService.listEstudiantes().pipe(
        catchError(err => {
          console.warn('⚠️ Error recargando estudiantes:', err);
          return of([]);
        }),
        finalize(() => this.loadingEstudiantes.set(false))
      ).subscribe(data => this.estudiantes.set(data));
    } else if (tipo === 'docentes') {
      this.loadingDocentes.set(true);
      this.personasService.listDocentes().pipe(
        catchError(err => {
          console.warn('⚠️ Error recargando docentes:', err);
          return of([]);
        }),
        finalize(() => this.loadingDocentes.set(false))
      ).subscribe(data => this.docentes.set(data));
    } else {
      this.loadingAdministrativos.set(true);
      this.personasService.listAdministrativos().pipe(
        catchError(err => {
          console.warn('⚠️ Error recargando administrativos:', err);
          return of([]);
        }),
        finalize(() => this.loadingAdministrativos.set(false))
      ).subscribe(data => this.administrativos.set(data));
    }
  }

  onTipoChange(tipo: 'estudiantes' | 'docentes' | 'administrativos') {
    this.selectedTipo.set(tipo);
    this.busqueda.set(''); // Limpiar búsqueda al cambiar de tipo
    this.busquedaDebounced.set(''); // Limpiar también el debounced
  }

  onAddNew() {
    const tipo = this.selectedTipo();
    this.router.navigate([`/personas/${tipo}/nuevo`]);
  }

  onEdit(id: number) {
    // Validar que el ID sea válido
    if (!id || id <= 0 || isNaN(id)) {
      console.error('❌ ID inválido para editar:', id);
      return;
    }
    const tipo = this.selectedTipo();
    this.router.navigate([`/personas/${tipo}/${id}/editar`]);
  }

  getTipoLabel(): string {
    const tipo = this.selectedTipo();
    if (tipo === 'estudiantes') return 'Estudiante';
    if (tipo === 'docentes') return 'Docente';
    return 'Administrativo';
  }

  onBusquedaChange(value: string) {
    this.busqueda.set(value);
    // Debounce para búsqueda
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.busquedaDebounced.set(value);
    }, 300);
  }

  onDeleteEstudiante(id: number) {
    if (!confirm('¿Está seguro de que desea eliminar este estudiante? Esta acción no se puede deshacer.')) return;
    
    this.deletingId.set(id);
    this.personasService.deleteEstudiante(id).subscribe({
      next: () => {
        this.estudiantes.set(this.estudiantes().filter(e => e.id !== id));
        this.deletingId.set(null);
      },
      error: (err) => {
        console.error('Error deleting estudiante:', err);
        this.deletingId.set(null);
        const mensaje = err.status === 404 
          ? 'El estudiante no fue encontrado'
          : err.status === 403
          ? 'No tiene permisos para eliminar estudiantes'
          : 'Error al eliminar el estudiante. Intente nuevamente.';
        alert(mensaje);
      }
    });
  }

  onDeleteDocente(id: number) {
    if (!confirm('¿Está seguro de que desea eliminar este docente? Esta acción no se puede deshacer.')) return;
    
    this.deletingId.set(id);
    this.personasService.deleteDocente(id).subscribe({
      next: () => {
        this.docentes.set(this.docentes().filter(d => d.id !== id));
        this.deletingId.set(null);
      },
      error: (err) => {
        console.error('Error deleting docente:', err);
        this.deletingId.set(null);
        const mensaje = err.status === 404 
          ? 'El docente no fue encontrado'
          : err.status === 403
          ? 'No tiene permisos para eliminar docentes'
          : 'Error al eliminar el docente. Intente nuevamente.';
        alert(mensaje);
      }
    });
  }

  onDeleteAdministrativo(id: number) {
    if (!confirm('¿Está seguro de que desea eliminar este administrativo? Esta acción no se puede deshacer.')) return;
    
    this.deletingId.set(id);
    this.personasService.deleteAdministrativo(id).subscribe({
      next: () => {
        this.administrativos.set(this.administrativos().filter(a => a.id !== id));
        this.deletingId.set(null);
      },
      error: (err) => {
        console.error('Error deleting administrativo:', err);
        this.deletingId.set(null);
        const mensaje = err.status === 404 
          ? 'El administrativo no fue encontrado'
          : err.status === 403
          ? 'No tiene permisos para eliminar administrativos'
          : 'Error al eliminar el administrativo. Intente nuevamente.';
        alert(mensaje);
      }
    });
  }

  getCurrentItems() {
    const tipo = this.selectedTipo();
    if (tipo === 'estudiantes') return this.estudiantesFiltrados();
    if (tipo === 'docentes') return this.docentesFiltrados();
    return this.administrativosFiltrados();
  }

  getTotalCount() {
    const tipo = this.selectedTipo();
    if (tipo === 'estudiantes') return this.estudiantes().length;
    if (tipo === 'docentes') return this.docentes().length;
    return this.administrativos().length;
  }

  getFilteredCount() {
    return this.getCurrentItems().length;
  }

  isDeleting(id: number): boolean {
    return this.deletingId() === id;
  }

  getLastLoadTime(): string {
    const time = this.lastLoadTime();
    if (!time) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);
    if (diff < 60) return `hace ${diff} segundos`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
    return `hace ${Math.floor(diff / 3600)} horas`;
  }
}
