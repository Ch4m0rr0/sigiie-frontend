import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ParticipacionService } from '../../core/services/participacion.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { PersonasService } from '../../core/services/personas.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { EdicionService } from '../../core/services/edicion.service';
import { ReportesService } from '../../core/services/reportes.service';
import type { Participacion } from '../../core/models/participacion';
import type { Subactividad } from '../../core/models/subactividad';
import type { RolEquipo } from '../../core/models/catalogos-nuevos';
import type { Actividad } from '../../core/models/actividad';
import type { Estudiante } from '../../core/models/estudiante';
import type { Docente } from '../../core/models/docente';
import type { Administrativo } from '../../core/models/administrativo';
import type { Edicion } from '../../core/models/edicion';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { forkJoin, of, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-participaciones-list',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, IconComponent, ...BrnButtonImports],
  templateUrl: './participaciones-list.component.html',
})
export class ParticipacionesListComponent implements OnInit {
  private participacionService = inject(ParticipacionService);
  private subactividadService = inject(SubactividadService);
  private catalogosService = inject(CatalogosService);
  private personasService = inject(PersonasService);
  private actividadesService = inject(ActividadesService);
  private edicionService = inject(EdicionService);
  private reportesService = inject(ReportesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  // Vista principal: Cards de actividades/subactividades
  resumenParticipantes = signal<any[]>([]);
  loadingResumen = signal(false);
  busquedaParticipantes = signal<string>('');
  vistaGestion = signal<{ tipo: 'actividad' | 'subactividad', id: number, nombre: string } | null>(null);
  
  // Vista de gestión: Lista de participantes
  participantesLista = signal<Participacion[]>([]);
  participantesFiltrados = signal<Participacion[]>([]);
  loadingParticipantes = signal(false);
  errorParticipantes = signal<string | null>(null);
  
  // Filtros de participantes
  filtroTipoParticipante = signal<'todos' | 'estudiante' | 'docente' | 'administrativo'>('todos');
  busquedaNombreParticipante = signal<string>('');
  
  // Paginación
  paginaActual = signal<number>(1);
  itemsPorPagina = signal<number>(10);
  mostrarTodos = signal<boolean>(false);
  
  // Importar/Exportar
  loadingImportarParticipantes = signal(false);
  importFileParticipantes = signal<File | null>(null);
  
  // Formulario de agregar/editar
  mostrarFormParticipante = signal(false);
  participanteEditando = signal<Participacion | null>(null);
  formParticipante!: FormGroup;
  
  // Catálogos
  estudiantes = signal<Estudiante[]>([]);
  docentes = signal<Docente[]>([]);
  administrativos = signal<Administrativo[]>([]);
  categoriasParticipacion = signal<any[]>([]);
  estadosParticipacion = signal<any[]>([]);
  ediciones = signal<Edicion[]>([]);
  actividades = signal<Actividad[]>([]);
  subactividades = signal<Subactividad[]>([]);

  ngOnInit(): void {
    this.initializeFormParticipante();
    
    // Leer query params para filtrar por actividad si viene desde el detalle
    this.route.queryParams.subscribe(params => {
      if (params['idActividad']) {
        // Si viene con idActividad, abrir directamente la vista de gestión
        const actividadId = +params['idActividad'];
        this.actividadesService.getById(actividadId).subscribe({
          next: (actividad) => {
            if (actividad) {
              this.abrirGestionParticipantes('actividad', actividadId, actividad.nombre);
            } else {
              this.loadResumenParticipantes();
            }
          },
          error: () => {
            this.loadResumenParticipantes();
          }
        });
      } else {
        this.loadResumenParticipantes();
      }
    });
    
    this.loadCatalogos();
  }

  loadCatalogos(): void {
    forkJoin({
      estudiantes: this.personasService.listEstudiantes(),
      docentes: this.personasService.listDocentes(),
      administrativos: this.personasService.listAdministrativos(),
      categorias: this.catalogosService.getCategoriasParticipacion(),
      estados: this.catalogosService.getEstadosParticipacion(),
      ediciones: this.edicionService.getAll(),
      actividades: this.actividadesService.getAll(),
      subactividades: this.subactividadService.getAll()
    }).subscribe({
      next: (data) => {
        this.estudiantes.set(data.estudiantes);
        this.docentes.set(data.docentes);
        this.administrativos.set(data.administrativos);
        this.categoriasParticipacion.set(data.categorias);
        this.estadosParticipacion.set(data.estados);
        this.ediciones.set(data.ediciones);
        this.actividades.set(data.actividades);
        this.subactividades.set(data.subactividades);
      },
      error: (err) => {
        console.error('Error loading catalogos:', err);
        this.errorParticipantes.set('Error al cargar los catálogos');
      }
    });
  }


  // ========== MÉTODOS PARA NUEVA VISTA ==========
  
  // Cargar resumen de actividades/subactividades con participantes
  loadResumenParticipantes(): void {
    this.loadingResumen.set(true);
    this.errorParticipantes.set(null);

    // Verificar que las actividades y subactividades estén cargadas
    if (this.actividades().length === 0 && this.subactividades().length === 0) {
      console.log('⚠️ No hay actividades ni subactividades cargadas aún, esperando...');
      // Esperar un poco y reintentar si los catálogos aún no están cargados
      setTimeout(() => {
        if (this.actividades().length === 0 && this.subactividades().length === 0) {
          this.errorParticipantes.set('No hay actividades o subactividades disponibles');
          this.loadingResumen.set(false);
        } else {
          this.loadResumenParticipantes();
        }
      }, 1000);
      return;
    }

    // El backend requiere IdActividad o IdSubactividad, así que necesitamos obtener todas las actividades
    // y luego hacer llamadas al resumen para cada una
    const busqueda = this.busquedaParticipantes().trim().toLowerCase();
    
    console.log('🔍 Búsqueda:', busqueda);
    console.log('📊 Actividades disponibles:', this.actividades().length);
    console.log('📊 Subactividades disponibles:', this.subactividades().length);
    
    // Filtrar actividades y subactividades por búsqueda
    const actividadesFiltradas = busqueda 
      ? this.actividades().filter(a => a.nombre.toLowerCase().includes(busqueda))
      : this.actividades();
    
    const subactividadesFiltradas = busqueda
      ? this.subactividades().filter(s => s.nombre.toLowerCase().includes(busqueda))
      : this.subactividades();

    console.log('📊 Actividades filtradas:', actividadesFiltradas.length);
    console.log('📊 Subactividades filtradas:', subactividadesFiltradas.length);

    // Si no hay actividades ni subactividades, mostrar vacío
    if (actividadesFiltradas.length === 0 && subactividadesFiltradas.length === 0) {
      console.log('⚠️ No hay actividades ni subactividades que coincidan con la búsqueda');
      this.resumenParticipantes.set([]);
      this.loadingResumen.set(false);
      return;
    }

    // Crear array de observables para obtener el resumen de cada actividad y subactividad
    const resumenRequests: Observable<any>[] = [];

    // Agregar requests para actividades
    actividadesFiltradas.forEach(actividad => {
      resumenRequests.push(
        this.participacionService.getResumen({ idActividad: actividad.id }).pipe(
          map((resumen: any) => ({
            tipo: 'actividad',
            id: actividad.id,
            idActividad: actividad.id,
            nombre: actividad.nombre,
            nombreActividad: actividad.nombre,
            totalParticipantes: resumen?.totalParticipantes || resumen?.total || 0,
            total: resumen?.totalParticipantes || resumen?.total || 0
          })),
          catchError(() => of({
            tipo: 'actividad',
            id: actividad.id,
            idActividad: actividad.id,
            nombre: actividad.nombre,
            nombreActividad: actividad.nombre,
            totalParticipantes: 0,
            total: 0
          }))
        )
      );
    });

    // Agregar requests para subactividades
    subactividadesFiltradas.forEach(subactividad => {
      resumenRequests.push(
        this.participacionService.getResumen({ idSubactividad: subactividad.idSubactividad }).pipe(
          map((resumen: any) => ({
            tipo: 'subactividad',
            id: subactividad.idSubactividad,
            idSubactividad: subactividad.idSubactividad,
            nombre: subactividad.nombre,
            nombreSubactividad: subactividad.nombre,
            totalParticipantes: resumen?.totalParticipantes || resumen?.total || 0,
            total: resumen?.totalParticipantes || resumen?.total || 0
          })),
          catchError(() => of({
            tipo: 'subactividad',
            id: subactividad.idSubactividad,
            idSubactividad: subactividad.idSubactividad,
            nombre: subactividad.nombre,
            nombreSubactividad: subactividad.nombre,
            totalParticipantes: 0,
            total: 0
          }))
        )
      );
    });

    // Si no hay requests, mostrar vacío
    if (resumenRequests.length === 0) {
      this.resumenParticipantes.set([]);
      this.loadingResumen.set(false);
      return;
    }

    // Ejecutar todas las peticiones en paralelo
    forkJoin(resumenRequests).subscribe({
      next: (resultados: any[]) => {
        console.log('✅ Resultados del resumen:', resultados);
        // Mostrar todos los items, incluso si tienen 0 participantes
        // El usuario puede ver todas las actividades/subactividades disponibles
        this.resumenParticipantes.set(resultados);
        this.loadingResumen.set(false);
      },
      error: (err: any) => {
        console.error('❌ Error cargando resumen:', err);
        this.errorParticipantes.set('Error al cargar el resumen de participaciones');
        this.loadingResumen.set(false);
      }
    });
  }

  // Abrir vista de gestión para una actividad o subactividad
  abrirGestionParticipantes(tipo: 'actividad' | 'subactividad', id: number, nombre: string): void {
    this.vistaGestion.set({ tipo, id, nombre });
    this.loadParticipantesPorItem(tipo, id);
  }

  // Volver a la vista principal
  volverAVistaPrincipal(): void {
    this.vistaGestion.set(null);
    this.participantesLista.set([]);
    this.participantesFiltrados.set([]);
    this.participanteEditando.set(null);
    this.mostrarFormParticipante.set(false);
    // Resetear filtros y paginación
    this.filtroTipoParticipante.set('todos');
    this.busquedaNombreParticipante.set('');
    this.paginaActual.set(1);
    this.mostrarTodos.set(false);
    // Limpiar query params
    this.router.navigate(['/participaciones'], { replaceUrl: true });
  }

  // Cargar participantes de una actividad o subactividad
  loadParticipantesPorItem(tipo: 'actividad' | 'subactividad', id: number): void {
    this.loadingParticipantes.set(true);
    this.errorParticipantes.set(null);

    let observable: Observable<Participacion[]>;
    if (tipo === 'actividad') {
      observable = this.participacionService.getByActividad(id);
    } else {
      observable = this.participacionService.getPorSubactividad(id);
    }

    observable.subscribe({
      next: (data: Participacion[]) => {
        console.log('✅ Participantes cargados:', data);
        this.participantesLista.set(data);
        this.aplicarFiltros();
        this.loadingParticipantes.set(false);
      },
      error: (err: any) => {
        console.error('❌ Error cargando participantes:', err);
        this.errorParticipantes.set('Error al cargar los participantes');
        this.loadingParticipantes.set(false);
      }
    });
  }

  // Inicializar formulario de participante
  initializeFormParticipante(): void {
    this.formParticipante = this.fb.group({
      tipoParticipante: ['estudiante', Validators.required],
      estudianteId: [null],
      docenteId: [null],
      administrativoId: [null],
      categoriaParticipacionId: [null, Validators.required],
      estadoParticipacionId: [null, Validators.required],
      fechaParticipacion: [new Date().toISOString().split('T')[0], Validators.required],
      grupoNumero: [null],
      idRolEquipo: [null],
      idTutor: [null]
    });
  }

  // Abrir formulario para agregar participante
  abrirFormAgregarParticipante(): void {
    this.participanteEditando.set(null);
    this.initializeFormParticipante();
    this.mostrarFormParticipante.set(true);
  }

  // Abrir formulario para editar participante
  abrirFormEditarParticipante(participante: Participacion): void {
    this.participanteEditando.set(participante);
    const tipo = participante.estudianteId ? 'estudiante' : 
                 participante.docenteId ? 'docente' : 'administrativo';
    
    this.formParticipante = this.fb.group({
      tipoParticipante: [tipo, Validators.required],
      estudianteId: [participante.estudianteId || null],
      docenteId: [participante.docenteId || null],
      administrativoId: [participante.administrativoId || null],
      categoriaParticipacionId: [participante.categoriaParticipacionId, Validators.required],
      estadoParticipacionId: [participante.estadoParticipacionId, Validators.required],
      fechaParticipacion: [participante.fechaParticipacion ? new Date(participante.fechaParticipacion).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], Validators.required],
      grupoNumero: [participante.grupoNumero || null],
      idRolEquipo: [participante.idRolEquipo || null],
      idTutor: [participante.idTutor || null]
    });
    this.mostrarFormParticipante.set(true);
  }

  // Guardar participante (crear o actualizar)
  guardarParticipante(): void {
    if (!this.formParticipante.valid || !this.vistaGestion()) return;

    const formValue = this.formParticipante.value;
    const vista = this.vistaGestion()!;
    
    // Obtener edición actual (necesario para crear participación)
    const edicionActual = this.ediciones().find(e => e.anio === new Date().getFullYear());
    if (!edicionActual) {
      alert('No se encontró una edición para el año actual');
      return;
    }

    const participacionData: any = {
      edicionId: edicionActual.id,
      categoriaParticipacionId: formValue.categoriaParticipacionId,
      estadoParticipacionId: formValue.estadoParticipacionId,
      fechaParticipacion: formValue.fechaParticipacion
    };

    if (vista.tipo === 'subactividad') {
      participacionData.idSubactividad = vista.id;
    } else {
      // Para actividades, necesitamos obtener la subactividad asociada o usar el endpoint correcto
      // Por ahora, asumimos que viene desde una actividad específica
    }

    if (formValue.grupoNumero) {
      participacionData.grupoNumero = formValue.grupoNumero;
    }
    if (formValue.idRolEquipo) {
      participacionData.idRolEquipo = formValue.idRolEquipo;
    }
    if (formValue.idTutor) {
      participacionData.idTutor = formValue.idTutor;
    }

    if (formValue.tipoParticipante === 'estudiante') {
      participacionData.estudianteId = formValue.estudianteId;
    } else if (formValue.tipoParticipante === 'docente') {
      participacionData.docenteId = formValue.docenteId;
    } else {
      participacionData.administrativoId = formValue.administrativoId;
    }

    this.loadingParticipantes.set(true);

    if (this.participanteEditando()) {
      // Actualizar
      this.participacionService.updateIndividual(this.participanteEditando()!.id, participacionData).subscribe({
        next: () => {
          alert('Participante actualizado exitosamente');
          this.mostrarFormParticipante.set(false);
          this.participanteEditando.set(null);
          this.loadParticipantesPorItem(vista.tipo, vista.id);
          this.aplicarFiltros();
        },
        error: (err: any) => {
          console.error('Error actualizando participante:', err);
          alert('Error al actualizar el participante');
          this.loadingParticipantes.set(false);
        }
      });
    } else {
      // Crear - para actividades necesitamos usar el endpoint con idActividad
      if (vista.tipo === 'actividad') {
        participacionData.idActividad = vista.id;
        // Usar createPorActividad o similar
        this.participacionService.createIndividual(participacionData).subscribe({
          next: () => {
            alert('Participante agregado exitosamente');
            this.mostrarFormParticipante.set(false);
            this.loadParticipantesPorItem(vista.tipo, vista.id);
          },
          error: (err: any) => {
            console.error('Error creando participante:', err);
            alert('Error al agregar el participante');
            this.loadingParticipantes.set(false);
          }
        });
      } else {
        this.participacionService.createIndividual(participacionData).subscribe({
          next: () => {
            alert('Participante agregado exitosamente');
            this.mostrarFormParticipante.set(false);
            this.loadParticipantesPorItem(vista.tipo, vista.id);
          },
          error: (err: any) => {
            console.error('Error creando participante:', err);
            alert('Error al agregar el participante');
            this.loadingParticipantes.set(false);
          }
        });
      }
    }
  }

  // Eliminar participante
  eliminarParticipante(id: number): void {
    if (!confirm('¿Estás seguro de eliminar este participante?')) return;

    const vista = this.vistaGestion();
    if (!vista) return;

    this.loadingParticipantes.set(true);
    this.participacionService.delete(id).subscribe({
      next: () => {
        alert('Participante eliminado exitosamente');
        this.loadParticipantesPorItem(vista.tipo, vista.id);
        this.aplicarFiltros();
      },
      error: (err: any) => {
        console.error('Error eliminando participante:', err);
        alert('Error al eliminar el participante');
        this.loadingParticipantes.set(false);
      }
    });
  }

  // Importar participantes desde Excel
  onFileSelectedParticipantes(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.importFileParticipantes.set(file);
    }
  }

  removeFileParticipantes(): void {
    this.importFileParticipantes.set(null);
  }

  importarParticipantesDesdeExcel(): void {
    if (!this.importFileParticipantes() || !this.vistaGestion()) {
      alert('Por favor selecciona un archivo Excel');
      return;
    }

    this.loadingImportarParticipantes.set(true);
    const vista = this.vistaGestion()!;
    
    this.reportesService.importarParticipantesPorActividad(
      vista.tipo === 'actividad' ? vista.id : 0, // Necesitaríamos el idActividad para subactividades
      this.importFileParticipantes()!,
      new Date().getFullYear()
    ).subscribe({
      next: (response) => {
        console.log('✅ Participantes importados:', response);
        alert('Participantes importados exitosamente');
        this.importFileParticipantes.set(null);
        this.loadingImportarParticipantes.set(false);
        this.loadParticipantesPorItem(vista.tipo, vista.id);
        this.aplicarFiltros();
      },
      error: (err: any) => {
        console.error('❌ Error importando participantes:', err);
        let errorMessage = 'Error al importar participantes';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (typeof err.error === 'string') {
          errorMessage = err.error;
        }
        alert(errorMessage);
        this.loadingImportarParticipantes.set(false);
      }
    });
  }

  // Exportar plantilla para importar participantes
  exportarPlantillaParticipantes(): void {
    const headers = ['Tipo Participante', 'ID Estudiante', 'ID Docente', 'ID Administrativo', 
                     'Categoría Participación', 'Estado Participación', 'Fecha Participación',
                     'Grupo Número', 'ID Rol Equipo', 'ID Tutor'];
    
    const csvContent = headers.join(',') + '\n' +
      'Estudiante,12345,,,1,1,' + new Date().toISOString().split('T')[0] + ',,,\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_importar_participantes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filtrar resumen por búsqueda
  onBusquedaParticipantesChange(): void {
    this.loadResumenParticipantes();
  }

  // Calcular total de participantes
  getTotalParticipantes(): number {
    return this.resumenParticipantes().reduce((acc, item) => acc + (item.totalParticipantes || item.total || 0), 0);
  }

  // Aplicar filtros a la lista de participantes
  aplicarFiltros(): void {
    let filtrados = [...this.participantesLista()];
    
    // Filtrar por tipo
    if (this.filtroTipoParticipante() !== 'todos') {
      const tipo = this.filtroTipoParticipante();
      filtrados = filtrados.filter(p => {
        if (tipo === 'estudiante') return !!p.estudianteId;
        if (tipo === 'docente') return !!p.docenteId;
        if (tipo === 'administrativo') return !!p.administrativoId;
        return true;
      });
    }
    
    // Filtrar por búsqueda de nombre
    const busqueda = this.busquedaNombreParticipante().trim().toLowerCase();
    if (busqueda) {
      filtrados = filtrados.filter(p => {
        const nombre = (p.nombreEstudiante || p.nombreDocente || p.nombreAdmin || '').toLowerCase();
        return nombre.includes(busqueda);
      });
    }
    
    this.participantesFiltrados.set(filtrados);
    this.paginaActual.set(1); // Resetear a primera página cuando se aplican filtros
  }

  // Obtener participantes paginados
  getParticipantesPaginados(): Participacion[] {
    const filtrados = this.participantesFiltrados();
    if (this.mostrarTodos()) {
      return filtrados;
    }
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina();
    const fin = inicio + this.itemsPorPagina();
    return filtrados.slice(inicio, fin);
  }

  // Obtener total de páginas
  getTotalPaginas(): number {
    if (this.mostrarTodos()) return 1;
    return Math.ceil(this.participantesFiltrados().length / this.itemsPorPagina());
  }

  // Navegar a página anterior
  paginaAnterior(): void {
    if (this.paginaActual() > 1) {
      this.paginaActual.set(this.paginaActual() - 1);
    }
  }

  // Navegar a página siguiente
  paginaSiguiente(): void {
    if (this.paginaActual() < this.getTotalPaginas()) {
      this.paginaActual.set(this.paginaActual() + 1);
    }
  }

  // Cambiar mostrar todos
  toggleMostrarTodos(): void {
    this.mostrarTodos.set(!this.mostrarTodos());
  }

  // Exponer Math para usar en el template
  Math = Math;

  // Métodos de navegación
  navigateToDetail(id: number): void {
    this.router.navigate(['/participaciones', id]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/participaciones/nueva']);
  }
}

