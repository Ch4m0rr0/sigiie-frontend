import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
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
import { AlertService } from '../../core/services/alert.service';
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
  private alertService = inject(AlertService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  // Vista principal: Cards de actividades/subactividades
  resumenParticipantes = signal<any[]>([]);
  loadingResumen = signal(true); // Iniciar en true para mostrar loading inicial
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
  
  // Búsqueda en selectores de participantes
  busquedaEstudiante = signal<string>('');
  busquedaDocente = signal<string>('');
  busquedaAdministrativo = signal<string>('');
  
  // Estados para mostrar/ocultar dropdowns personalizados
  mostrarDropdownEstudiante = signal<boolean>(false);
  mostrarDropdownDocente = signal<boolean>(false);
  mostrarDropdownAdministrativo = signal<boolean>(false);
  
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
    
    // Primero cargar los catálogos, luego cargar el resumen
    this.loadCatalogos();
    
    // Leer query params para filtrar por actividad si viene desde el detalle
    this.route.queryParams.subscribe(params => {
      if (params['idActividad']) {
        // Si viene con idActividad, esperar a que los catálogos se carguen primero
        // y luego abrir la vista de gestión
        const actividadId = +params['idActividad'];
        // Esperar a que los catálogos estén cargados antes de abrir la vista
        const checkCatalogos = () => {
          if (this.actividades().length > 0 || this.subactividades().length > 0) {
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
            // Si aún no están cargados, esperar un poco más
            setTimeout(checkCatalogos, 200);
          }
        };
        checkCatalogos();
      } else {
        // Para la vista principal, esperar a que los catálogos se carguen
        const checkCatalogos = () => {
          if (this.actividades().length > 0 || this.subactividades().length > 0) {
            this.loadResumenParticipantes();
          } else {
            // Si aún no están cargados, esperar un poco más
            setTimeout(checkCatalogos, 200);
          }
        };
        checkCatalogos();
      }
    });
  }

  loadCatalogos(): void {
    console.log('📚 Cargando catálogos...');
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
        console.log('✅ Catálogos cargados:', {
          estudiantes: data.estudiantes.length,
          docentes: data.docentes.length,
          administrativos: data.administrativos.length,
          actividades: data.actividades.length,
          subactividades: data.subactividades.length
        });
        this.estudiantes.set(data.estudiantes);
        this.docentes.set(data.docentes);
        this.administrativos.set(data.administrativos);
        this.categoriasParticipacion.set(data.categorias);
        this.estadosParticipacion.set(data.estados);
        this.ediciones.set(data.ediciones);
        this.actividades.set(data.actividades);
        this.subactividades.set(data.subactividades);
        
        // Una vez que los catálogos están cargados, cargar el resumen si no hay vista de gestión activa
        if (!this.vistaGestion()) {
          this.loadResumenParticipantes();
        }
      },
      error: (err) => {
        console.error('Error loading catalogos:', err);
        this.errorParticipantes.set('Error al cargar los catálogos');
        this.loadingResumen.set(false);
      }
    });
  }


  // ========== MÉTODOS PARA NUEVA VISTA ==========
  
  // Cargar resumen de actividades/subactividades con participantes
  loadResumenParticipantes(): void {
    // No cargar si ya hay una vista de gestión activa
    if (this.vistaGestion()) {
      return;
    }
    
    this.loadingResumen.set(true);
    this.errorParticipantes.set(null);

    // Verificar que las actividades y subactividades estén cargadas
    if (this.actividades().length === 0 && this.subactividades().length === 0) {
      console.log('⚠️ No hay actividades ni subactividades cargadas aún, esperando...');
      // Mantener loading en true mientras esperamos
      // Esperar un poco y reintentar si los catálogos aún no están cargados
      let intentos = 0;
      const maxIntentos = 10; // Máximo 5 segundos (10 * 500ms)
      const checkAndRetry = () => {
        intentos++;
        if (this.actividades().length > 0 || this.subactividades().length > 0) {
          console.log('✅ Actividades/subactividades cargadas, cargando resumen...');
          // Llamar recursivamente para cargar el resumen ahora que hay datos
          this.loadResumenParticipantes();
        } else if (intentos < maxIntentos) {
          setTimeout(checkAndRetry, 500);
        } else {
          console.log('⚠️ No hay actividades ni subactividades después de varios intentos');
          this.errorParticipantes.set('No hay actividades o subactividades disponibles');
          this.loadingResumen.set(false);
        }
      };
      setTimeout(checkAndRetry, 500);
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
    console.log('🔓 Abriendo vista de gestión:', { tipo, id, nombre });
    this.vistaGestion.set({ tipo, id, nombre });
    // Limpiar datos anteriores
    this.participantesLista.set([]);
    this.participantesFiltrados.set([]);
    this.errorParticipantes.set(null);
    // Cargar participantes
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
    // Recargar el resumen para actualizar las cards
    this.loadResumenParticipantes();
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
      grupoNumero: [null],
      idRolEquipo: [null],
      idTutor: [null]
    });
    
    // Aplicar validación inicial para el tipo por defecto (estudiante)
    this.formParticipante.get('estudianteId')?.setValidators([Validators.required]);
    this.formParticipante.get('estudianteId')?.updateValueAndValidity({ emitEvent: false });
    
    // Agregar validación dinámica según el tipo de participante
    this.formParticipante.get('tipoParticipante')?.valueChanges.subscribe(tipo => {
      // Remover validadores de todos los campos
      this.formParticipante.get('estudianteId')?.clearValidators();
      this.formParticipante.get('docenteId')?.clearValidators();
      this.formParticipante.get('administrativoId')?.clearValidators();
      
      // Agregar validador requerido solo al campo correspondiente
      if (tipo === 'estudiante') {
        this.formParticipante.get('estudianteId')?.setValidators([Validators.required]);
      } else if (tipo === 'docente') {
        this.formParticipante.get('docenteId')?.setValidators([Validators.required]);
      } else if (tipo === 'administrativo') {
        this.formParticipante.get('administrativoId')?.setValidators([Validators.required]);
      }
      
      // Actualizar estado de validación
      this.formParticipante.get('estudianteId')?.updateValueAndValidity({ emitEvent: false });
      this.formParticipante.get('docenteId')?.updateValueAndValidity({ emitEvent: false });
      this.formParticipante.get('administrativoId')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  // Abrir formulario para agregar participante
  abrirFormAgregarParticipante(): void {
    this.participanteEditando.set(null);
    this.initializeFormParticipante();
    // Limpiar búsquedas y cerrar dropdowns
    this.busquedaEstudiante.set('');
    this.busquedaDocente.set('');
    this.busquedaAdministrativo.set('');
    this.mostrarDropdownEstudiante.set(false);
    this.mostrarDropdownDocente.set(false);
    this.mostrarDropdownAdministrativo.set(false);
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
      grupoNumero: [participante.grupoNumero || null],
      idRolEquipo: [participante.idRolEquipo || null],
      idTutor: [participante.idTutor || null]
    });
    
    // Aplicar validación según el tipo
    if (tipo === 'estudiante') {
      this.formParticipante.get('estudianteId')?.setValidators([Validators.required]);
    } else if (tipo === 'docente') {
      this.formParticipante.get('docenteId')?.setValidators([Validators.required]);
    } else if (tipo === 'administrativo') {
      this.formParticipante.get('administrativoId')?.setValidators([Validators.required]);
    }
    this.formParticipante.get('estudianteId')?.updateValueAndValidity({ emitEvent: false });
    this.formParticipante.get('docenteId')?.updateValueAndValidity({ emitEvent: false });
    this.formParticipante.get('administrativoId')?.updateValueAndValidity({ emitEvent: false });
    
    // Agregar validación dinámica cuando cambie el tipo
    this.formParticipante.get('tipoParticipante')?.valueChanges.subscribe(tipoCambiado => {
      // Remover validadores de todos los campos
      this.formParticipante.get('estudianteId')?.clearValidators();
      this.formParticipante.get('docenteId')?.clearValidators();
      this.formParticipante.get('administrativoId')?.clearValidators();
      
      // Agregar validador requerido solo al campo correspondiente
      if (tipoCambiado === 'estudiante') {
        this.formParticipante.get('estudianteId')?.setValidators([Validators.required]);
      } else if (tipoCambiado === 'docente') {
        this.formParticipante.get('docenteId')?.setValidators([Validators.required]);
      } else if (tipoCambiado === 'administrativo') {
        this.formParticipante.get('administrativoId')?.setValidators([Validators.required]);
      }
      
      // Actualizar estado de validación
      this.formParticipante.get('estudianteId')?.updateValueAndValidity({ emitEvent: false });
      this.formParticipante.get('docenteId')?.updateValueAndValidity({ emitEvent: false });
      this.formParticipante.get('administrativoId')?.updateValueAndValidity({ emitEvent: false });
    });
    
    // Limpiar búsquedas y cerrar dropdowns
    this.busquedaEstudiante.set('');
    this.busquedaDocente.set('');
    this.busquedaAdministrativo.set('');
    this.mostrarDropdownEstudiante.set(false);
    this.mostrarDropdownDocente.set(false);
    this.mostrarDropdownAdministrativo.set(false);
    this.mostrarFormParticipante.set(true);
  }
  
  // Filtrar estudiantes por búsqueda
  getEstudiantesFiltrados(): Estudiante[] {
    const busqueda = this.busquedaEstudiante().trim().toLowerCase();
    if (!busqueda) return this.estudiantes();
    return this.estudiantes().filter(est => 
      est.nombreCompleto?.toLowerCase().includes(busqueda)
    );
  }
  
  // Filtrar docentes por búsqueda
  getDocentesFiltrados(): Docente[] {
    const busqueda = this.busquedaDocente().trim().toLowerCase();
    if (!busqueda) return this.docentes();
    return this.docentes().filter(doc => 
      doc.nombreCompleto?.toLowerCase().includes(busqueda)
    );
  }
  
  // Filtrar administrativos por búsqueda
  getAdministrativosFiltrados(): Administrativo[] {
    const busqueda = this.busquedaAdministrativo().trim().toLowerCase();
    if (!busqueda) return this.administrativos();
    return this.administrativos().filter(admin => 
      admin.nombreCompleto?.toLowerCase().includes(busqueda)
    );
  }
  
  // Obtener nombre del estudiante seleccionado
  getNombreEstudianteSeleccionado(): string {
    const id = this.formParticipante?.get('estudianteId')?.value;
    if (!id) return 'Seleccionar estudiante...';
    const est = this.estudiantes().find(e => e.id === id);
    return est?.nombreCompleto || 'Seleccionar estudiante...';
  }
  
  // Obtener nombre del docente seleccionado
  getNombreDocenteSeleccionado(): string {
    const id = this.formParticipante?.get('docenteId')?.value;
    if (!id) return 'Seleccionar docente...';
    const doc = this.docentes().find(d => d.id === id);
    return doc?.nombreCompleto || 'Seleccionar docente...';
  }
  
  // Obtener nombre del administrativo seleccionado
  getNombreAdministrativoSeleccionado(): string {
    const id = this.formParticipante?.get('administrativoId')?.value;
    if (!id) return 'Seleccionar administrativo...';
    const admin = this.administrativos().find(a => a.id === id);
    return admin?.nombreCompleto || 'Seleccionar administrativo...';
  }
  
  // Seleccionar estudiante
  seleccionarEstudiante(estudiante: Estudiante): void {
    console.log('👤 Estudiante seleccionado:', estudiante);
    this.formParticipante.patchValue({ 
      estudianteId: estudiante.id,
      docenteId: null, // Limpiar otros campos
      administrativoId: null
    });
    this.formParticipante.get('estudianteId')?.updateValueAndValidity();
    console.log('✅ Formulario actualizado - estudianteId:', this.formParticipante.get('estudianteId')?.value);
    this.mostrarDropdownEstudiante.set(false);
    this.busquedaEstudiante.set('');
  }
  
  // Seleccionar docente
  seleccionarDocente(docente: Docente): void {
    console.log('👨‍🏫 Docente seleccionado:', docente);
    this.formParticipante.patchValue({ 
      docenteId: docente.id,
      estudianteId: null, // Limpiar otros campos
      administrativoId: null
    });
    this.formParticipante.get('docenteId')?.updateValueAndValidity();
    console.log('✅ Formulario actualizado - docenteId:', this.formParticipante.get('docenteId')?.value);
    this.mostrarDropdownDocente.set(false);
    this.busquedaDocente.set('');
  }
  
  // Seleccionar administrativo
  seleccionarAdministrativo(administrativo: Administrativo): void {
    console.log('👔 Administrativo seleccionado:', administrativo);
    this.formParticipante.patchValue({ 
      administrativoId: administrativo.id,
      estudianteId: null, // Limpiar otros campos
      docenteId: null
    });
    this.formParticipante.get('administrativoId')?.updateValueAndValidity();
    console.log('✅ Formulario actualizado - administrativoId:', this.formParticipante.get('administrativoId')?.value);
    this.mostrarDropdownAdministrativo.set(false);
    this.busquedaAdministrativo.set('');
  }
  
  // Cerrar dropdowns al hacer click fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.mostrarDropdownEstudiante.set(false);
      this.mostrarDropdownDocente.set(false);
      this.mostrarDropdownAdministrativo.set(false);
    }
  }

  // Guardar participante (crear o actualizar)
  guardarParticipante(): void {
    if (!this.formParticipante.valid || !this.vistaGestion()) return;

    const formValue = this.formParticipante.value;
    const vista = this.vistaGestion()!;
    
    // Obtener edición actual (necesario para crear participación)
    const edicionActual = this.ediciones().find(e => e.anio === new Date().getFullYear());
    if (!edicionActual) {
      this.alertService.error('Error', 'No se encontró una edición para el año actual');
      return;
    }

    const participacionData: any = {
      edicionId: edicionActual.id,
      categoriaParticipacionId: 1, // Valor por defecto
      estadoParticipacionId: 1, // Valor por defecto
      fechaParticipacion: new Date().toISOString().split('T')[0] // Fecha actual por defecto
    };

    // Asignar idActividad o idSubactividad según el tipo de vista (REQUERIDO)
    if (vista.tipo === 'subactividad') {
      participacionData.idSubactividad = vista.id;
      console.log('📝 Asignando idSubactividad:', vista.id);
    } else if (vista.tipo === 'actividad') {
      participacionData.idActividad = vista.id;
      console.log('📝 Asignando idActividad:', vista.id);
    } else {
      console.error('❌ Error: tipo de vista desconocido:', vista.tipo);
      this.alertService.error('Error', 'No se pudo determinar el tipo de actividad o subactividad');
      return;
    }
    
    console.log('📦 Datos de participación a enviar:', participacionData);

    if (formValue.grupoNumero) {
      participacionData.grupoNumero = formValue.grupoNumero;
    }
    if (formValue.idRolEquipo) {
      participacionData.idRolEquipo = formValue.idRolEquipo;
    }
    if (formValue.idTutor) {
      participacionData.idTutor = formValue.idTutor;
    }

    // Asignar ID del participante según el tipo
    if (formValue.tipoParticipante === 'estudiante') {
      participacionData.estudianteId = formValue.estudianteId;
      console.log('📝 Asignando estudianteId:', formValue.estudianteId);
      if (!formValue.estudianteId) {
        this.alertService.error('Error', 'Debe seleccionar un estudiante');
        this.loadingParticipantes.set(false);
        return;
      }
    } else if (formValue.tipoParticipante === 'docente') {
      participacionData.docenteId = formValue.docenteId;
      console.log('📝 Asignando docenteId:', formValue.docenteId);
      if (!formValue.docenteId) {
        this.alertService.error('Error', 'Debe seleccionar un docente');
        this.loadingParticipantes.set(false);
        return;
      }
    } else if (formValue.tipoParticipante === 'administrativo') {
      participacionData.administrativoId = formValue.administrativoId;
      console.log('📝 Asignando administrativoId:', formValue.administrativoId);
      if (!formValue.administrativoId) {
        this.alertService.error('Error', 'Debe seleccionar un administrativo');
        this.loadingParticipantes.set(false);
        return;
      }
    }

    this.loadingParticipantes.set(true);

    if (this.participanteEditando()) {
      // Actualizar
      this.participacionService.updateIndividual(this.participanteEditando()!.id, participacionData).subscribe({
        next: () => {
          this.alertService.success('Éxito', 'Participante actualizado exitosamente');
          this.mostrarFormParticipante.set(false);
          this.participanteEditando.set(null);
          this.loadParticipantesPorItem(vista.tipo, vista.id);
          this.aplicarFiltros();
          // Recargar resumen para actualizar las cards
          this.loadResumenParticipantes();
        },
        error: (err: any) => {
          console.error('Error actualizando participante:', err);
          let errorMessage = 'Error al actualizar el participante';
          if (err.error?.message) {
            errorMessage = err.error.message;
          } else if (err.error?.error) {
            errorMessage = err.error.error;
          }
          this.alertService.error('Error', errorMessage);
          this.loadingParticipantes.set(false);
        }
      });
    } else {
      // Crear participante
      // El idActividad o idSubactividad ya está asignado arriba según el tipo de vista
      this.participacionService.createIndividual(participacionData).subscribe({
        next: () => {
          this.alertService.success('Éxito', 'Participante agregado exitosamente');
          this.mostrarFormParticipante.set(false);
          this.loadParticipantesPorItem(vista.tipo, vista.id);
          // Recargar resumen para actualizar las cards
          this.loadResumenParticipantes();
        },
        error: (err: any) => {
          console.error('Error creando participante:', err);
          let errorMessage = 'Error al agregar el participante';
          if (err.error?.message) {
            errorMessage = err.error.message;
          } else if (err.error?.error) {
            errorMessage = err.error.error;
          }
          this.alertService.error('Error', errorMessage);
          this.loadingParticipantes.set(false);
        }
      });
    }
  }

  // Eliminar participante
  eliminarParticipante(id: number): void {
    const vista = this.vistaGestion();
    if (!vista) return;

    this.alertService.confirmDelete('participante', 'Esta acción no se puede deshacer.').then((result) => {
      if (result.isConfirmed) {
        this.loadingParticipantes.set(true);
        this.participacionService.delete(id).subscribe({
          next: () => {
            this.alertService.success('Éxito', 'Participante eliminado exitosamente');
            this.loadParticipantesPorItem(vista.tipo, vista.id);
            this.aplicarFiltros();
            // Recargar resumen para actualizar las cards
            this.loadResumenParticipantes();
          },
          error: (err: any) => {
            console.error('Error eliminando participante:', err);
            let errorMessage = 'Error al eliminar el participante';
            if (err.error?.message) {
              errorMessage = err.error.message;
            } else if (err.error?.error) {
              errorMessage = err.error.error;
            }
            this.alertService.error('Error', errorMessage);
            this.loadingParticipantes.set(false);
          }
        });
      }
    });
  }

  // Importar participantes desde Excel
  onFileSelectedParticipantes(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        this.alertService.error('Archivo inválido', 'Por favor selecciona un archivo Excel (.xlsx o .xls)');
        event.target.value = ''; // Limpiar el input
        return;
      }
      
      // Validar tamaño (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        this.alertService.error('Archivo muy grande', 'El archivo no debe exceder 10MB');
        event.target.value = ''; // Limpiar el input
        return;
      }
      
      this.importFileParticipantes.set(file);
    }
  }

  removeFileParticipantes(): void {
    this.importFileParticipantes.set(null);
  }

  importarParticipantesDesdeExcel(): void {
    if (!this.importFileParticipantes() || !this.vistaGestion()) {
      this.alertService.warning('Archivo requerido', 'Por favor selecciona un archivo Excel');
      return;
    }

    // Validar tipo de archivo antes de enviar
    const file = this.importFileParticipantes()!;
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      this.alertService.error('Archivo inválido', 'Por favor selecciona un archivo Excel (.xlsx o .xls)');
      this.importFileParticipantes.set(null);
      return;
    }

    this.loadingImportarParticipantes.set(true);
    const vista = this.vistaGestion()!;
    
    this.reportesService.importarParticipantesPorActividad(
      vista.tipo === 'actividad' ? vista.id : 0, // Necesitaríamos el idActividad para subactividades
      file,
      new Date().getFullYear()
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Participantes importados:', response);
        
        // Construir mensaje con los datos de la respuesta
        let mensaje = '';
        const data = response.data || response;
        
        // Validar si realmente se procesaron datos
        const totalProcesados = data.totalProcesados ?? 0;
        const totalCreados = data.totalCreados ?? 0;
        const totalActualizados = data.totalActualizados ?? 0;
        const totalOmitidos = data.totalOmitidos ?? 0;
        const totalErrores = data.totalErrores ?? 0;
        
        // Si no se procesó nada y no hay errores, el archivo probablemente no tenía datos válidos
        if (totalProcesados === 0 && totalCreados === 0 && totalActualizados === 0 && totalErrores === 0) {
          this.alertService.warning(
            'Archivo sin datos', 
            'El archivo Excel no contiene datos válidos de participantes o no se pudo procesar. Por favor verifica que el archivo tenga el formato correcto y contenga datos.'
          );
          this.importFileParticipantes.set(null);
          this.loadingImportarParticipantes.set(false);
          return;
        }
        
        // Si hay datos procesados, mostrar resumen
        if (totalProcesados > 0 || totalCreados > 0 || totalActualizados > 0) {
          mensaje = '<div style="text-align: left;">';
          mensaje += `<strong>Importación completada:</strong><br><br>`;
          
          if (data.totalProcesados !== undefined) {
            mensaje += `• Total procesados: <strong>${totalProcesados}</strong><br>`;
          }
          if (data.totalCreados !== undefined) {
            mensaje += `• Agregados: <strong>${totalCreados}</strong><br>`;
          }
          if (data.totalActualizados !== undefined) {
            mensaje += `• Actualizados: <strong>${totalActualizados}</strong><br>`;
          }
          if (totalOmitidos > 0) {
            mensaje += `• Omitidos: <strong>${totalOmitidos}</strong><br>`;
          }
          if (totalErrores > 0) {
            mensaje += `• Errores: <strong style="color: #ef4444;">${totalErrores}</strong><br>`;
          }
          if (data.mensaje) {
            mensaje += `<br>${data.mensaje}`;
          }
          mensaje += '</div>';
          
          // Mostrar alerta de éxito
          this.alertService.success('Importación completada', mensaje, {
            html: true
          });
        } else if (data.mensaje) {
          // Si hay un mensaje pero no datos procesados, mostrar advertencia
          this.alertService.warning('Importación sin resultados', data.mensaje);
        } else {
          // Caso por defecto
          this.alertService.warning(
            'Sin datos procesados', 
            'No se procesaron participantes del archivo. Verifica que el archivo tenga el formato correcto.'
          );
        }
        
        // Limpiar archivo
        this.importFileParticipantes.set(null);
        this.loadingImportarParticipantes.set(false);
        
        // Recargar participantes de la vista actual solo si se procesaron datos
        if (totalProcesados > 0 || totalCreados > 0 || totalActualizados > 0) {
          this.loadParticipantesPorItem(vista.tipo, vista.id);
          this.aplicarFiltros();
          // Recargar el resumen de participantes para actualizar las cards
          this.loadResumenParticipantes();
        }
      },
      error: (err: any) => {
        console.error('❌ Error importando participantes:', err);
        let errorMessage = 'Error al importar participantes';
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
        } else if (typeof err.error === 'string') {
          errorMessage = err.error;
        }
        this.alertService.error('Error en la importación', errorMessage);
        this.loadingImportarParticipantes.set(false);
        this.importFileParticipantes.set(null);
      }
    });
  }

  // Exportar plantilla para importar participantes
  exportarPlantillaParticipantes(): void {
    // Descargar la plantilla directamente del backend (incluye dropdowns y validaciones)
    this.reportesService.obtenerPlantillaParticipantesActividad().subscribe({
      next: (blob: Blob) => {
        console.log('✅ Plantilla descargada del backend, tamaño:', blob.size);
        
        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla_importar_participantes.xlsx'; // El backend devuelve Excel
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Liberar la URL del blob después de un tiempo
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
      },
      error: (err: any) => {
        console.error('❌ Error descargando plantilla:', err);
        this.alertService.error('Error', 'No se pudo descargar la plantilla. Por favor intenta nuevamente.');
      }
    });
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

