import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { PersonasService } from '../../core/services/personas.service';
import type { Estudiante } from '../../core/models/estudiante';
import type { Docente } from '../../core/models/docente';
import type { Administrativo } from '../../core/models/administrativo';
import type { ResponsableExterno } from '../../core/models/responsable-externo';
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
  private route = inject(ActivatedRoute);
  private searchTimeout: any;

  selectedTipo = signal<'estudiantes' | 'docentes' | 'administrativos' | 'responsables-externos'>('estudiantes');
  busqueda = signal<string>('');
  busquedaDebounced = signal<string>(''); // Inicializado vacío, se actualiza con debounce
  
  estudiantes = signal<Estudiante[]>([]);
  docentes = signal<Docente[]>([]);
  administrativos = signal<Administrativo[]>([]);
  responsablesExternos = signal<ResponsableExterno[]>([]);
  
  loadingEstudiantes = signal(false);
  loadingDocentes = signal(false);
  loadingAdministrativos = signal(false);
  loadingResponsablesExternos = signal(false);
  deletingId = signal<number | null>(null);
  
  error = signal<string | null>(null);
  lastLoadTime = signal<Date | null>(null);

  // Paginación para estudiantes
  paginaActualEstudiantes = signal<number>(1);
  mostrarTodosEstudiantes = signal<boolean>(false);
  
  // Paginación para docentes
  paginaActualDocentes = signal<number>(1);
  mostrarTodosDocentes = signal<boolean>(false);
  
  // Paginación para administrativos
  paginaActualAdministrativos = signal<number>(1);
  mostrarTodosAdministrativos = signal<boolean>(false);
  
  // Paginación para responsables externos
  paginaActualResponsablesExternos = signal<number>(1);
  mostrarTodosResponsablesExternos = signal<boolean>(false);
  
  itemsPorPagina = 10;

  // Computed para filtrar, ordenar y paginar estudiantes
  estudiantesFiltrados = computed(() => {
    const estudiantes = this.estudiantes();
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    
    // Filtrar por búsqueda
    let filtrados = estudiantes;
    if (busqueda) {
      filtrados = estudiantes.filter(e => 
        e.nombreCompleto?.toLowerCase().includes(busqueda) ||
        e.numeroCarnet?.toLowerCase().includes(busqueda) ||
        e.correo?.toLowerCase().includes(busqueda)
      );
    }
    
    // Ordenar alfabéticamente por nombre completo
    filtrados = [...filtrados].sort((a, b) => {
      const nombreA = (a.nombreCompleto || '').toLowerCase();
      const nombreB = (b.nombreCompleto || '').toLowerCase();
      return nombreA.localeCompare(nombreB);
    });
    
    // Aplicar paginación si no está en modo "mostrar todos"
    if (!this.mostrarTodosEstudiantes()) {
      const inicio = (this.paginaActualEstudiantes() - 1) * this.itemsPorPagina;
      const fin = inicio + this.itemsPorPagina;
      return filtrados.slice(inicio, fin);
    }
    
    return filtrados;
  });

  // Computed para obtener el total de estudiantes filtrados (sin paginación)
  estudiantesFiltradosTotal = computed(() => {
    const estudiantes = this.estudiantes();
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    
    if (!busqueda) return estudiantes.length;
    return estudiantes.filter(e => 
      e.nombreCompleto?.toLowerCase().includes(busqueda) ||
      e.numeroCarnet?.toLowerCase().includes(busqueda) ||
      e.correo?.toLowerCase().includes(busqueda)
    ).length;
  });

  // Computed para el total de páginas
  totalPaginasEstudiantes = computed(() => {
    const total = this.estudiantesFiltradosTotal();
    return Math.ceil(total / this.itemsPorPagina);
  });

  docentesFiltrados = computed(() => {
    const docentes = this.docentes();
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    
    // Filtrar por búsqueda
    let filtrados = docentes;
    if (busqueda) {
      filtrados = docentes.filter(d => 
        d.nombreCompleto?.toLowerCase().includes(busqueda) ||
        d.correo?.toLowerCase().includes(busqueda)
      );
    }
    
    // Ordenar alfabéticamente por nombre completo
    filtrados = [...filtrados].sort((a, b) => {
      const nombreA = (a.nombreCompleto || '').toLowerCase();
      const nombreB = (b.nombreCompleto || '').toLowerCase();
      return nombreA.localeCompare(nombreB);
    });
    
    // Aplicar paginación si no está en modo "mostrar todos"
    if (!this.mostrarTodosDocentes()) {
      const inicio = (this.paginaActualDocentes() - 1) * this.itemsPorPagina;
      const fin = inicio + this.itemsPorPagina;
      return filtrados.slice(inicio, fin);
    }
    
    return filtrados;
  });

  // Computed para obtener el total de docentes filtrados (sin paginación)
  docentesFiltradosTotal = computed(() => {
    const docentes = this.docentes();
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    
    if (!busqueda) return docentes.length;
    return docentes.filter(d => 
      d.nombreCompleto?.toLowerCase().includes(busqueda) ||
      d.correo?.toLowerCase().includes(busqueda)
    ).length;
  });

  // Computed para el total de páginas de docentes
  totalPaginasDocentes = computed(() => {
    const total = this.docentesFiltradosTotal();
    return Math.ceil(total / this.itemsPorPagina);
  });

  administrativosFiltrados = computed(() => {
    const administrativos = this.administrativos();
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    
    // Filtrar por búsqueda
    let filtrados = administrativos;
    if (busqueda) {
      filtrados = administrativos.filter(a => 
        a.nombreCompleto?.toLowerCase().includes(busqueda) ||
        a.correo?.toLowerCase().includes(busqueda)
      );
    }
    
    // Ordenar alfabéticamente por nombre completo
    filtrados = [...filtrados].sort((a, b) => {
      const nombreA = (a.nombreCompleto || '').toLowerCase();
      const nombreB = (b.nombreCompleto || '').toLowerCase();
      return nombreA.localeCompare(nombreB);
    });
    
    // Aplicar paginación si no está en modo "mostrar todos"
    if (!this.mostrarTodosAdministrativos()) {
      const inicio = (this.paginaActualAdministrativos() - 1) * this.itemsPorPagina;
      const fin = inicio + this.itemsPorPagina;
      return filtrados.slice(inicio, fin);
    }
    
    return filtrados;
  });

  // Computed para obtener el total de administrativos filtrados (sin paginación)
  administrativosFiltradosTotal = computed(() => {
    const administrativos = this.administrativos();
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    
    if (!busqueda) return administrativos.length;
    return administrativos.filter(a => 
      a.nombreCompleto?.toLowerCase().includes(busqueda) ||
      a.correo?.toLowerCase().includes(busqueda)
    ).length;
  });

  // Computed para el total de páginas de administrativos
  totalPaginasAdministrativos = computed(() => {
    const total = this.administrativosFiltradosTotal();
    return Math.ceil(total / this.itemsPorPagina);
  });

  responsablesExternosFiltrados = computed(() => {
    const responsables = this.responsablesExternos();
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    
    // Filtrar por búsqueda
    let filtrados = responsables;
    if (busqueda) {
      filtrados = responsables.filter(r => 
        r.nombre?.toLowerCase().includes(busqueda) ||
        r.institucion?.toLowerCase().includes(busqueda) ||
        r.correo?.toLowerCase().includes(busqueda) ||
        r.cargo?.toLowerCase().includes(busqueda)
      );
    }
    
    // Ordenar alfabéticamente por nombre
    filtrados = [...filtrados].sort((a, b) => {
      const nombreA = (a.nombre || '').toLowerCase();
      const nombreB = (b.nombre || '').toLowerCase();
      return nombreA.localeCompare(nombreB);
    });
    
    // Aplicar paginación si no está en modo "mostrar todos"
    if (!this.mostrarTodosResponsablesExternos()) {
      const inicio = (this.paginaActualResponsablesExternos() - 1) * this.itemsPorPagina;
      const fin = inicio + this.itemsPorPagina;
      return filtrados.slice(inicio, fin);
    }
    
    return filtrados;
  });

  // Computed para obtener el total de responsables externos filtrados (sin paginación)
  responsablesExternosFiltradosTotal = computed(() => {
    const responsables = this.responsablesExternos();
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    
    if (!busqueda) return responsables.length;
    return responsables.filter(r => 
      r.nombre?.toLowerCase().includes(busqueda) ||
      r.institucion?.toLowerCase().includes(busqueda) ||
      r.correo?.toLowerCase().includes(busqueda) ||
      r.cargo?.toLowerCase().includes(busqueda)
    ).length;
  });

  // Computed para el total de páginas de responsables externos
  totalPaginasResponsablesExternos = computed(() => {
    const total = this.responsablesExternosFiltradosTotal();
    return Math.ceil(total / this.itemsPorPagina);
  });

  // Estadísticas
  estadisticas = computed(() => ({
    totalEstudiantes: this.estudiantes().length,
    activosEstudiantes: this.estudiantes().filter(e => e.activo).length,
    totalDocentes: this.docentes().length,
    activosDocentes: this.docentes().filter(d => d.activo).length,
    totalAdministrativos: this.administrativos().length,
    activosAdministrativos: this.administrativos().filter(a => a.activo !== false).length, // Si no tiene activo, se considera activo
    totalResponsablesExternos: this.responsablesExternos().length,
    activosResponsablesExternos: this.responsablesExternos().filter(r => r.activo !== false).length,
  }));

  isLoading = computed(() => 
    this.loadingEstudiantes() || this.loadingDocentes() || this.loadingAdministrativos() || this.loadingResponsablesExternos()
  );

  ngOnInit() {
    // Leer query params para establecer el tipo
    this.route.queryParams.subscribe(params => {
      if (params['tipo'] && ['estudiantes', 'docentes', 'administrativos', 'responsables-externos'].includes(params['tipo'])) {
        this.selectedTipo.set(params['tipo'] as 'estudiantes' | 'docentes' | 'administrativos' | 'responsables-externos');
      }
    });
    
    this.loadAll();
  }

  loadAll() {
    this.error.set(null);
    this.lastLoadTime.set(new Date());
    
    // Establecer estados de carga
    this.loadingEstudiantes.set(true);
    this.loadingDocentes.set(true);
    this.loadingAdministrativos.set(true);
    this.loadingResponsablesExternos.set(true);
    
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
      ),
      responsablesExternos: this.personasService.listResponsablesExternos().pipe(
        catchError(err => {
          console.error('❌ Error cargando responsables externos:', err);
          return of([]);
        })
      )
    }).pipe(
      finalize(() => {
        this.loadingEstudiantes.set(false);
        this.loadingDocentes.set(false);
        this.loadingAdministrativos.set(false);
        this.loadingResponsablesExternos.set(false);
      })
    ).subscribe({
      next: (data) => {
        console.log('✅ ListPersonasComponent - Datos recibidos:', {
          estudiantes: data.estudiantes.length,
          docentes: data.docentes.length,
          administrativos: data.administrativos.length,
          responsablesExternos: data.responsablesExternos.length
        });
        console.log('✅ ListPersonasComponent - Primer estudiante (si existe):', data.estudiantes[0]);
        
        this.estudiantes.set(data.estudiantes);
        this.docentes.set(data.docentes);
        this.administrativos.set(data.administrativos);
        this.responsablesExternos.set(data.responsablesExternos);
        
        console.log('✅ ListPersonasComponent - Signals actualizados:', {
          estudiantes: this.estudiantes().length,
          docentes: this.docentes().length,
          administrativos: this.administrativos().length,
          responsablesExternos: this.responsablesExternos().length
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
    } else if (tipo === 'administrativos') {
      this.loadingAdministrativos.set(true);
      this.personasService.listAdministrativos().pipe(
        catchError(err => {
          console.warn('⚠️ Error recargando administrativos:', err);
          return of([]);
        }),
        finalize(() => this.loadingAdministrativos.set(false))
      ).subscribe(data => this.administrativos.set(data));
    } else if (tipo === 'responsables-externos') {
      this.loadingResponsablesExternos.set(true);
      this.personasService.listResponsablesExternos().pipe(
        catchError(err => {
          console.warn('⚠️ Error recargando responsables externos:', err);
          return of([]);
        }),
        finalize(() => this.loadingResponsablesExternos.set(false))
      ).subscribe(data => this.responsablesExternos.set(data));
    }
  }

  onTipoChange(tipo: 'estudiantes' | 'docentes' | 'administrativos' | 'responsables-externos') {
    this.selectedTipo.set(tipo);
    this.busqueda.set(''); // Limpiar búsqueda al cambiar de tipo
    this.busquedaDebounced.set(''); // Limpiar también el debounced
    // Resetear paginación
    this.paginaActualEstudiantes.set(1);
    this.mostrarTodosEstudiantes.set(false);
    this.paginaActualDocentes.set(1);
    this.mostrarTodosDocentes.set(false);
    this.paginaActualAdministrativos.set(1);
    this.mostrarTodosAdministrativos.set(false);
    this.paginaActualResponsablesExternos.set(1);
    this.mostrarTodosResponsablesExternos.set(false);
  }

  onAddNew() {
    const tipo = this.selectedTipo();
    this.router.navigate([`/personas/${tipo}/nuevo`]);
  }

  onEdit(id: number) {
    // Validar que el ID sea válido
    if (!id || id <= 0 || isNaN(id)) {
      console.error('❌ ID inválido para editar:', id);
      alert('No se puede editar este registro. El ID no es válido. Por favor, contacte al administrador.');
      return;
    }
    const tipo = this.selectedTipo();
    this.router.navigate([`/personas/${tipo}/${id}/editar`]);
  }

  getTipoLabel(): string {
    const tipo = this.selectedTipo();
    if (tipo === 'estudiantes') return 'Estudiante';
    if (tipo === 'docentes') return 'Docente';
    if (tipo === 'administrativos') return 'Administrativo';
    return 'Responsable Externo';
  }

  onBusquedaChange(value: string) {
    this.busqueda.set(value);
    // Debounce para búsqueda
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.busquedaDebounced.set(value);
      // Resetear a primera página al buscar
      if (this.selectedTipo() === 'estudiantes') {
        this.paginaActualEstudiantes.set(1);
      } else if (this.selectedTipo() === 'docentes') {
        this.paginaActualDocentes.set(1);
      } else if (this.selectedTipo() === 'administrativos') {
        this.paginaActualAdministrativos.set(1);
      } else if (this.selectedTipo() === 'responsables-externos') {
        this.paginaActualResponsablesExternos.set(1);
      }
    }, 300);
  }

  // Métodos de paginación para estudiantes
  paginaAnteriorEstudiantes() {
    if (this.paginaActualEstudiantes() > 1) {
      this.paginaActualEstudiantes.set(this.paginaActualEstudiantes() - 1);
    }
  }

  paginaSiguienteEstudiantes() {
    if (this.paginaActualEstudiantes() < this.totalPaginasEstudiantes()) {
      this.paginaActualEstudiantes.set(this.paginaActualEstudiantes() + 1);
    }
  }

  toggleMostrarTodosEstudiantes() {
    this.mostrarTodosEstudiantes.set(!this.mostrarTodosEstudiantes());
    this.paginaActualEstudiantes.set(1);
  }

  // Métodos de paginación para docentes
  paginaAnteriorDocentes() {
    if (this.paginaActualDocentes() > 1) {
      this.paginaActualDocentes.set(this.paginaActualDocentes() - 1);
    }
  }

  paginaSiguienteDocentes() {
    if (this.paginaActualDocentes() < this.totalPaginasDocentes()) {
      this.paginaActualDocentes.set(this.paginaActualDocentes() + 1);
    }
  }

  toggleMostrarTodosDocentes() {
    this.mostrarTodosDocentes.set(!this.mostrarTodosDocentes());
    this.paginaActualDocentes.set(1);
  }

  // Métodos de paginación para administrativos
  paginaAnteriorAdministrativos() {
    if (this.paginaActualAdministrativos() > 1) {
      this.paginaActualAdministrativos.set(this.paginaActualAdministrativos() - 1);
    }
  }

  paginaSiguienteAdministrativos() {
    if (this.paginaActualAdministrativos() < this.totalPaginasAdministrativos()) {
      this.paginaActualAdministrativos.set(this.paginaActualAdministrativos() + 1);
    }
  }

  toggleMostrarTodosAdministrativos() {
    this.mostrarTodosAdministrativos.set(!this.mostrarTodosAdministrativos());
    this.paginaActualAdministrativos.set(1);
  }

  // Métodos de paginación para responsables externos
  paginaAnteriorResponsablesExternos() {
    if (this.paginaActualResponsablesExternos() > 1) {
      this.paginaActualResponsablesExternos.set(this.paginaActualResponsablesExternos() - 1);
    }
  }

  paginaSiguienteResponsablesExternos() {
    if (this.paginaActualResponsablesExternos() < this.totalPaginasResponsablesExternos()) {
      this.paginaActualResponsablesExternos.set(this.paginaActualResponsablesExternos() + 1);
    }
  }

  toggleMostrarTodosResponsablesExternos() {
    this.mostrarTodosResponsablesExternos.set(!this.mostrarTodosResponsablesExternos());
    this.paginaActualResponsablesExternos.set(1);
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

  onDeleteResponsableExterno(id: number) {
    if (!confirm('¿Está seguro de que desea eliminar este responsable externo? Esta acción no se puede deshacer.')) return;
    
    this.deletingId.set(id);
    this.personasService.deleteResponsableExterno(id).subscribe({
      next: () => {
        this.responsablesExternos.set(this.responsablesExternos().filter(r => r.id !== id));
        this.deletingId.set(null);
      },
      error: (err) => {
        console.error('Error deleting responsable externo:', err);
        this.deletingId.set(null);
        const mensaje = err.status === 404 
          ? 'El responsable externo no fue encontrado'
          : err.status === 403
          ? 'No tiene permisos para eliminar responsables externos'
          : 'Error al eliminar el responsable externo. Intente nuevamente.';
        alert(mensaje);
      }
    });
  }

  getCurrentItems() {
    const tipo = this.selectedTipo();
    if (tipo === 'estudiantes') return this.estudiantesFiltrados();
    if (tipo === 'docentes') return this.docentesFiltrados();
    if (tipo === 'administrativos') return this.administrativosFiltrados();
    return this.responsablesExternosFiltrados();
  }

  getTotalCount() {
    const tipo = this.selectedTipo();
    if (tipo === 'estudiantes') return this.estudiantes().length;
    if (tipo === 'docentes') return this.docentes().length;
    if (tipo === 'administrativos') return this.administrativos().length;
    return this.responsablesExternos().length;
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

  // Métodos helper para el template
  getMath() {
    return Math;
  }

  getInicioPagina(): number {
    return (this.paginaActualEstudiantes() - 1) * this.itemsPorPagina + 1;
  }

  getFinPagina(): number {
    return Math.min(this.paginaActualEstudiantes() * this.itemsPorPagina, this.estudiantesFiltradosTotal());
  }
}
