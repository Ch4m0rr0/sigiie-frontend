import { Component, inject, OnInit, OnDestroy, signal, computed, effect, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActividadesService } from '../../core/services/actividades.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { ActividadCreate, ResponsableCreate } from '../../core/models/actividad';
import type { Departamento } from '../../core/models/departamento';
import type { EstadoActividad } from '../../core/models/estado-actividad';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';
import { IndicadorService } from '../../core/services/indicador.service';
import type { Indicador } from '../../core/models/indicador';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import { ActividadResponsableService, type ActividadResponsableCreate } from '../../core/services/actividad-responsable.service';
import { PersonasService } from '../../core/services/personas.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import type { Docente } from '../../core/models/docente';
import type { Estudiante } from '../../core/models/estudiante';
import type { Administrativo } from '../../core/models/administrativo';
import type { Usuario } from '../../core/models/usuario';
import { AlertService } from '../../core/services/alert.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-actividad-no-planificada-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './actividad-no-planificada-form.component.html',
})
export class ActividadNoPlanificadaFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private actividadesService = inject(ActividadesService);
  private catalogosService = inject(CatalogosService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private indicadorService = inject(IndicadorService);
  private actividadAnualService = inject(ActividadAnualService);
  private responsableService = inject(ActividadResponsableService);
  private personasService = inject(PersonasService);
  private usuariosService = inject(UsuariosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private alertService = inject(AlertService);

  form!: FormGroup;
  departamentos = signal<Departamento[]>([]);
  estadosActividad = signal<EstadoActividad[]>([]);
  
  // Estados filtrados para creación (excluye Suspendido, Cancelado y Finalizado)
  estadosActividadParaCreacion = computed(() => {
    // En modo edición, mostrar todos los estados
    if (this.isEditMode()) {
      return this.estadosActividad();
    }
    // En modo creación, filtrar Suspendido, Cancelado y Finalizado
    return this.estadosActividad().filter(estado => {
      const nombre = estado.nombre?.toLowerCase() || '';
      return !nombre.includes('suspendido') && 
             !nombre.includes('suspendida') &&
             !nombre.includes('cancelado') && 
             !nombre.includes('cancelada') &&
             !nombre.includes('finalizado') &&
             !nombre.includes('finalizada');
    });
  });
  
  actividadesMensualesInst = signal<ActividadMensualInst[]>([]);
  indicadores = signal<Indicador[]>([]);
  actividadesAnuales = signal<ActividadAnual[]>([]);
  actividadesAnualesFiltradas = signal<ActividadAnual[]>([]);

  // Arrays para selector de hora en formato 12 horas
  horas12: string[] = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  minutos: string[] = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  actividadesMensualesFiltradas = signal<ActividadMensualInst[]>([]);
  tiposProtagonista = signal<any[]>([]);
  capacidadesInstaladas = signal<any[]>([]);
  isEditMode = signal(false);
  actividadId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  private cargandoRelaciones = false;
  private actividadesAnualesAnteriores: number[] = [];
  private formStateKey = 'actividad-no-planificada-form-state';
  private formSubscription: any;
  private isCancelling = false; // Bandera para evitar guardar estado al cancelar

  indicadorIdFromQuery = signal<number | null>(null);

  // Signals para controlar dropdowns
  mostrarDropdownActividadAnual = signal(false);
  mostrarDropdownActividadMensual = signal(false);
  mostrarDropdownDepartamentos = signal(false);
  mostrarDropdownProtagonista = signal(false);
  mostrarDropdownEstadoActividad = signal(false);
  mostrarDropdownModalidad = signal(false);
  mostrarDropdownLocal = signal(false);
  mostrarDropdownIndicador = signal(false);
  terminoBusquedaIndicador = signal<string>('');
  mostrarDropdownTipoEvidencia = signal(true);

  // Acordeones para secciones del formulario
  seccionPlanificacionExpandida = signal(false);
  seccionInformacionExpandida = signal(false);
  seccionEstadoExpandida = signal(false);
  seccionResponsablesExpandida = signal(false);
  
  // Computed para verificar si hay un indicador
  tieneIndicador = computed(() => {
    return !!(this.form.get('idIndicador')?.value || this.indicadorSeleccionado());
  });
  
  // Computed para expandir automáticamente la sección de planificación si hay un indicador
  seccionPlanificacionExpandidaComputed = computed(() => {
    const tieneIndicador = this.tieneIndicador();
    const expandida = this.seccionPlanificacionExpandida();
    // Si hay indicador, siempre mostrar la sección expandida
    return tieneIndicador || expandida;
  });
  
  // Efecto para expandir automáticamente la sección cuando hay un indicador
  private expandirSeccionConIndicador = effect(() => {
    const tieneIndicador = this.tieneIndicador();
    if (tieneIndicador && !this.seccionPlanificacionExpandida()) {
      // Usar setTimeout para evitar cambios durante la detección de cambios
      setTimeout(() => {
        this.seccionPlanificacionExpandida.set(true);
        // No cerrar las otras secciones - permitir que todas estén abiertas simultáneamente
        this.cdr.detectChanges();
      }, 0);
    }
  });

  // Signal para local seleccionado
  localSeleccionado = signal<any>(null);
  indicadorSeleccionado = signal<Indicador | null>(null);

  // Formulario de responsables
  formResponsable!: FormGroup;
  usuarios = signal<Usuario[]>([]);
  docentes = signal<Docente[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  administrativos = signal<Administrativo[]>([]);
  rolesResponsable = signal<any[]>([]);
  tiposResponsableSeleccionados = signal<string[]>([]);
  ordenTiposResponsables = signal<string[]>([]); // Orden de selección (el más reciente primero)
  
  // Búsqueda para responsables
  terminoBusquedaUsuario = signal<{ [key: number]: string }>({});
  terminoBusquedaDocente = signal<{ [key: number]: string }>({});
  terminoBusquedaEstudiante = signal<{ [key: number]: string }>({});
  terminoBusquedaAdministrativo = signal<{ [key: number]: string }>({});
  terminoBusquedaExterno = signal<{ [key: number]: string }>({});
  
  // Dropdowns abiertos para responsables
  mostrarDropdownUsuario = signal<{ [key: number]: boolean }>({});
  mostrarDropdownDocente = signal<{ [key: number]: boolean }>({});
  mostrarDropdownEstudiante = signal<{ [key: number]: boolean }>({});
  mostrarDropdownAdministrativo = signal<{ [key: number]: boolean }>({});
  mostrarDropdownExterno = signal<{ [key: number]: boolean }>({});
  
  // Selección múltiple
  mostrarSeleccionMultiple = signal<{ [key: string]: boolean }>({});
  personasSeleccionadas = signal<{ [key: string]: number[] }>({});
  rolSeleccionadoMultiple = signal<{ [key: string]: number | null }>({});
  terminoBusquedaMultiple = signal<{ [key: string]: string }>({});
  
  // Tipos de evidencia
  tiposEvidencia = signal<any[]>([]);
  
  // Responsables externos existentes
  responsablesExternos = signal<any[]>([]);
  
  // Computed para obtener los tipos ordenados (más reciente primero)
  tiposResponsablesOrdenados = computed(() => {
    const orden = this.ordenTiposResponsables();
    const seleccionados = this.tiposResponsableSeleccionados();
    // Devolver en el orden de selección, con los más recientes primero
    return orden.filter(t => seleccionados.includes(t));
  });

  ngOnInit(): void {
    this.initializeForm();
    this.initializeFormResponsable();
    this.loadDepartamentos();
    this.loadEstadosActividad();
    this.loadActividadesMensualesInst();
    this.loadIndicadores();
    this.loadActividadesAnuales();
    this.loadTiposProtagonista();
    this.loadCapacidadesInstaladas();
    this.loadTiposEvidencia();
    this.loadTodasLasPersonas();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.actividadId.set(+id);
      this.loadActividad(+id);
    }

    const idIndicador = this.route.snapshot.queryParams['idIndicador'];
    if (idIndicador) {
      this.indicadorIdFromQuery.set(+idIndicador);
    }
  }

  ngOnDestroy(): void {
    // Guardar estado antes de destruir el componente (cuando el usuario navega)
    // Solo si no se está cancelando explícitamente
    if (!this.isEditMode() && this.form && !this.isCancelling) {
      this.saveFormState();
    }
    
    // Limpiar suscripción
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: BeforeUnloadEvent): void {
    // Guardar estado antes de cerrar la página
    if (!this.isEditMode() && this.form) {
      this.saveFormState();
    }
  }

  // Validador personalizado para comparar fechas
  fechaInicioValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Dejar que Validators.required maneje los campos vacíos
    }

    // Parsear la fecha sin problemas de zona horaria
    const fechaStr = control.value; // Formato: YYYY-MM-DD
    const partes = fechaStr.split('-');
    if (partes.length !== 3) {
      return null; // Formato inválido
    }
    
    const fechaYear = Number(partes[0]);
    const fechaMonth = Number(partes[1]); // 1-12
    const fechaDay = Number(partes[2]); // 1-31
    
    if (isNaN(fechaYear) || isNaN(fechaMonth) || isNaN(fechaDay)) {
      return null; // Valores inválidos
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // Convertir de 0-11 a 1-12
    const currentDay = now.getDate(); // 1-31

    // Validar año: no puede ser menor al año vigente
    if (fechaYear < currentYear) {
      return { 
        fechaInicioAnterior: true
      };
    }

    // Validar mes: si es el mismo año, el mes no puede ser anterior al mes vigente
    if (fechaYear === currentYear && fechaMonth < currentMonth) {
      return { 
        fechaInicioMesAnterior: true
      };
    }

    // Validar día: si es el mismo año y mes, el día no puede ser anterior al día vigente (advertencia)
    if (fechaYear === currentYear && fechaMonth === currentMonth && fechaDay < currentDay) {
      return { 
        fechaInicioDiaAnterior: true
      };
    }

    // Validar que la fecha de inicio no sea mayor que la fecha de fin
    if (control.parent) {
      const fechaFin = control.parent.get('fechaFin')?.value;
      if (fechaFin) {
        const [finYear, finMonth, finDay] = fechaFin.split('-').map(Number);
        
        // Validar año: la fecha de inicio no puede ser de un año mayor al de fin
        if (fechaYear > finYear) {
          return { 
            fechaInicioMayorFin: true,
            fechaInicioMayorFinAnio: true
          };
        }
        
        // Validar mes: si es el mismo año, el mes de inicio no puede ser mayor al mes de fin
        if (fechaYear === finYear && fechaMonth > finMonth) {
          return { 
            fechaInicioMayorFin: true,
            fechaInicioMayorFinMes: true
          };
        }
        
        // Validar día: si es el mismo año y mes, el día de inicio no puede ser mayor al día de fin
        if (fechaYear === finYear && fechaMonth === finMonth && fechaDay > finDay) {
          return { 
            fechaInicioMayorFin: true,
            fechaInicioMayorFinDia: true
          };
        }
      }
    }

    return null;
  }

  fechaFinValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.parent) {
      return null;
    }
    
    const fechaInicio = control.parent.get('fechaInicio')?.value;
    const fechaFin = control.value;
    
    if (!fechaInicio || !fechaFin) {
      return null; // Si alguna fecha está vacía, no validar (validación opcional)
    }
    
    // Parsear fechas sin problemas de zona horaria
    const [inicioYear, inicioMonth, inicioDay] = fechaInicio.split('-').map(Number);
    const [finYear, finMonth, finDay] = fechaFin.split('-').map(Number);
    
    if (isNaN(inicioYear) || isNaN(inicioMonth) || isNaN(inicioDay) || 
        isNaN(finYear) || isNaN(finMonth) || isNaN(finDay)) {
      return null; // Fechas inválidas serán manejadas por otros validadores
    }
    
    const inicio = new Date(inicioYear, inicioMonth - 1, inicioDay); // month - 1 porque Date usa 0-11
    const fin = new Date(finYear, finMonth - 1, finDay);
    
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return null; // Fechas inválidas serán manejadas por otros validadores
    }
    
    // Comparar solo las fechas (sin horas)
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    
    // Validar que la fecha de fin no sea anterior a la fecha de inicio
    if (fin < inicio) {
      return { fechaFinAnterior: true };
    }

    // Validar que la fecha de fin no sea de un año anterior al de inicio
    if (finYear < inicioYear) {
      return { fechaFinAnioAnterior: true };
    }

    // Validar mes: si es el mismo año que inicio, el mes no puede ser anterior
    if (finYear === inicioYear) {
      if (finMonth < inicioMonth) {
        return { fechaFinMesAnterior: true };
      }
      
      // Validar día: si es el mismo año y mes, el día de fin no puede ser anterior al día de inicio
      if (finMonth === inicioMonth && finDay < inicioDay) {
        return { fechaFinDiaAnterior: true };
      }
    }

    // Validar mes respecto al mes vigente (advertencia)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // Convertir de 0-11 a 1-12
    const currentDay = now.getDate();

    if (finYear === currentYear && finMonth < currentMonth) {
      return { fechaFinMesAnteriorVigente: true };
    }

    // Validar día: si es el mismo año y mes, el día no puede ser anterior al día vigente (advertencia)
    if (finYear === currentYear && finMonth === currentMonth && finDay < currentDay) {
      return { fechaFinDiaAnteriorVigente: true };
    }
    
    return null;
  }

  initializeForm(): void {
    this.form = this.fb.group({
      nombre: [''], // No requerido en el formulario principal, solo se usa en responsables
      nombreActividad: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      departamentoId: [null],
      departamentoResponsableId: [[], Validators.required],
      fechaInicio: ['', [Validators.required, this.fechaInicioValidator.bind(this)]],
      fechaFin: ['', [Validators.required, this.fechaFinValidator.bind(this)]],
      fechaEvento: [''],
      horaRealizacion: [''], // Campo oculto que se actualiza desde los selects
      horaRealizacionHora: ['', Validators.required],
      horaRealizacionMinuto: ['', Validators.required],
      horaRealizacionAmPm: ['', Validators.required],
      soporteDocumentoUrl: [null],
      idEstadoActividad: [null, Validators.required],
      idTipoActividad: [[]],
      idTipoIniciativa: [null],
      idArea: [null],
      idNivel: [null],
      idTipoDocumento: [null],
      organizador: [''],
      modalidad: ['', Validators.required],
      idCapacidadInstalada: [null, Validators.required],
      semanaMes: [null],
      codigoActividad: [''],
      idActividadMensualInst: [[]], // Array para múltiples selecciones - OPCIONAL
      esPlanificada: [false], // Siempre false para actividades no planificadas
      idIndicador: [null], // OPCIONAL para actividades no planificadas
      idActividadAnual: [[]], // OPCIONAL para actividades no planificadas
      objetivo: [''],
      cantidadParticipantesProyectados: [null, Validators.required],
      cantidadParticipantesEstudiantesProyectados: [null],
      cantidadTotalParticipantesProtagonistas: [null, Validators.required],
      idTipoEvidencias: [[]],
      anio: [''], // Campo oculto - se establece automáticamente desde la fecha de inicio o año actual
      horaInicioPrevista: [''],
      idTipoProtagonista: [[], Validators.required],
      responsableActividad: [''],
      categoriaActividadId: [null],
      tipoUnidadId: [null],
      areaConocimientoId: [null],
      ubicacion: [''],
      activo: [true]
    });

    this.form.get('nombreActividad')?.valueChanges.subscribe(value => {
      if (value && this.form.get('nombre')?.value !== value) {
        this.form.patchValue({ nombre: value }, { emitEvent: false });
      }
    });

    this.form.get('nombre')?.valueChanges.subscribe(value => {
      if (value && this.form.get('nombreActividad')?.value !== value) {
        this.form.patchValue({ nombreActividad: value }, { emitEvent: false });
      }
    });

    // Suscribirse a cambios en fechaInicio para revalidar fechaFin
    this.form.get('fechaInicio')?.valueChanges.subscribe(() => {
      this.form.get('fechaFin')?.updateValueAndValidity();
    });

    // Suscribirse a cambios en fechaFin para revalidar fechaInicio
    this.form.get('fechaFin')?.valueChanges.subscribe(() => {
      this.form.get('fechaInicio')?.updateValueAndValidity();
    });

    // Sincronizar selectores de hora con el campo horaRealizacion
    this.form.get('horaRealizacionHora')?.valueChanges.subscribe(() => {
      this.actualizarHoraRealizacion();
    });
    this.form.get('horaRealizacionMinuto')?.valueChanges.subscribe(() => {
      this.actualizarHoraRealizacion();
    });
    this.form.get('horaRealizacionAmPm')?.valueChanges.subscribe(() => {
      this.actualizarHoraRealizacion();
    });

    this.form.get('idIndicador')?.valueChanges.subscribe(idIndicador => {
      if (this.cargandoRelaciones) return;
      
      // Actualizar el indicador seleccionado
      if (idIndicador) {
        const indicador = this.indicadores().find(ind => ind.idIndicador === idIndicador);
        this.indicadorSeleccionado.set(indicador || null);
      } else {
        this.indicadorSeleccionado.set(null);
      }
      
      if (idIndicador) {
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({
          idActividadAnual: [],
          idActividadMensualInst: []
        }, { emitEvent: false });
        
        this.cargarActividadesPorIndicador(idIndicador, false);
      } else {
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({
          idActividadAnual: [],
          idActividadMensualInst: []
        }, { emitEvent: false });
      }
    });

    this.form.get('idActividadAnual')?.valueChanges.subscribe(idActividadAnual => {
      if (this.cargandoRelaciones) return;
      
      const actividadesAnuales = Array.isArray(idActividadAnual) ? idActividadAnual : (idActividadAnual ? [idActividadAnual] : []);
      
      // Detectar qué actividad anual se agregó o eliminó
      const actividadesAgregadas = actividadesAnuales.filter(id => !this.actividadesAnualesAnteriores.includes(id));
      const actividadesEliminadas = this.actividadesAnualesAnteriores.filter(id => !actividadesAnuales.includes(id));
      
      // Si se agregó una actividad anual, cargar solo sus actividades mensuales
      if (actividadesAgregadas.length > 0) {
        actividadesAgregadas.forEach(idAnual => {
          this.actividadMensualInstService.getByActividadAnual(idAnual).subscribe({
            next: (actividadesMensuales) => {
              const actividadesFiltradas = (actividadesMensuales || []).filter(m => m.idActividadAnual === idAnual);
              // Agregar las nuevas actividades mensuales a la lista existente
              const mensualesActuales = this.actividadesMensualesFiltradas();
              const todasLasMensuales = [...mensualesActuales, ...actividadesFiltradas];
              // Eliminar duplicados
              const mensualesUnicas = todasLasMensuales.filter((mensual, index, self) =>
                index === self.findIndex(m => m.idActividadMensualInst === mensual.idActividadMensualInst)
              );
              this.actividadesMensualesFiltradas.set(mensualesUnicas);
            },
            error: (err) => {
              console.error('Error cargando actividades mensuales:', err);
            }
          });
        });
      }
      
      // Si se eliminó una actividad anual, eliminar sus actividades mensuales
      if (actividadesEliminadas.length > 0) {
        const mensualesActuales = this.actividadesMensualesFiltradas();
        const mensualesFiltradas = mensualesActuales.filter(m => 
          !actividadesEliminadas.includes(m.idActividadAnual)
        );
        this.actividadesMensualesFiltradas.set(mensualesFiltradas);
        
        // Limpiar selecciones de actividades mensuales que ya no están disponibles
        const idMensualesActuales = this.form.get('idActividadMensualInst')?.value || [];
        if (Array.isArray(idMensualesActuales) && idMensualesActuales.length > 0) {
          const idMensualesValidos = idMensualesActuales.filter(id => 
            mensualesFiltradas.find(m => m.idActividadMensualInst === id)
          );
          this.form.patchValue({ idActividadMensualInst: idMensualesValidos }, { emitEvent: false });
        }
      }
      
      // Si no hay actividades anuales seleccionadas, limpiar todo
      if (actividadesAnuales.length === 0) {
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({ idActividadMensualInst: [] }, { emitEvent: false });
      }
      
      // Actualizar el valor anterior
      this.actividadesAnualesAnteriores = [...actividadesAnuales];
    });
  }

  loadDepartamentos(): void {
    this.catalogosService.getDepartamentos().subscribe({
      next: (data) => this.departamentos.set(data),
      error: (err) => console.error('Error loading departamentos:', err)
    });
  }


  loadEstadosActividad(): void {
    this.catalogosService.getEstadosActividad().subscribe({
      next: (data) => this.estadosActividad.set(data),
      error: (err) => console.error('Error loading estados actividad:', err)
    });
  }

  loadActividadesMensualesInst(): void {
    this.actividadMensualInstService.getAll().subscribe({
      next: (data) => this.actividadesMensualesInst.set(data),
      error: (err) => console.error('Error loading actividades mensuales inst:', err)
    });
  }

  loadIndicadores(): void {
    this.indicadorService.getAll().subscribe({
      next: (data) => this.indicadores.set(data),
      error: (err) => console.error('Error loading indicadores:', err)
    });
  }

  loadActividadesAnuales(): void {
    this.actividadAnualService.getAll().subscribe({
      next: (data) => {
        this.actividadesAnuales.set(data);
        const idIndicador = this.form.get('idIndicador')?.value;
        if (idIndicador) {
          this.cargarActividadesPorIndicador(idIndicador);
        }
      },
      error: (err) => console.error('Error loading actividades anuales:', err)
    });
  }

  cargarActividadesPorIndicador(idIndicador: number, skipCheck: boolean = false): void {
    if (!skipCheck && this.cargandoRelaciones) return;
    
    this.cargandoRelaciones = true;
    const actividadAnualActual = skipCheck ? this.form.get('idActividadAnual')?.value : null;
    
    this.actividadAnualService.getByIndicador(idIndicador).subscribe({
      next: (actividadesAnuales) => {
        // getByIndicador debería devolver solo las actividades anuales para este indicador
        // Pero si el backend no filtra, hacemos el filtro en el frontend
        const actividadesFiltradas = (actividadesAnuales || []).filter(a => {
          // Convertir ambos a número para comparar correctamente
          const idIndicadorNum = Number(idIndicador);
          const aIdIndicadorNum = Number(a.idIndicador);
          return aIdIndicadorNum === idIndicadorNum;
        });
        this.actividadesAnualesFiltradas.set(actividadesFiltradas);
        
        if (skipCheck && actividadAnualActual) {
          const actividadesAnualesArray = Array.isArray(actividadAnualActual) ? actividadAnualActual : [actividadAnualActual];
          const actividadesValidas = actividadesAnualesArray.filter(id => 
            actividadesFiltradas.find(a => a.idActividadAnual === id)
          );
          
          if (actividadesValidas.length > 0) {
            this.form.patchValue({ idActividadAnual: actividadesValidas }, { emitEvent: false });
            this.cargarActividadesMensualesPorAnual(actividadesValidas[0], skipCheck);
          } else {
            this.form.patchValue({ idActividadAnual: [] }, { emitEvent: false });
            this.actividadesMensualesFiltradas.set([]);
            this.cargandoRelaciones = false;
            if (skipCheck) {
              this.loading.set(false);
            }
          }
        } else if (!skipCheck) {
          // Solo cargar las actividades anuales, sin seleccionarlas automáticamente
          // El usuario puede seleccionarlas manualmente
          this.actividadesMensualesFiltradas.set([]);
          this.cargandoRelaciones = false;
        } else {
          this.actividadesMensualesFiltradas.set([]);
          this.cargandoRelaciones = false;
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error cargando actividades anuales:', err);
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.cargandoRelaciones = false;
        if (skipCheck) {
          this.loading.set(false);
        }
      }
    });
  }

  cargarActividadesMensualesPorAnual(idActividadAnual: number, skipCheck: boolean = false): void {
    this.actividadesMensualesFiltradas.set([]);
    const actividadMensualActual = skipCheck ? this.form.get('idActividadMensualInst')?.value : null;
    
    this.actividadMensualInstService.getByActividadAnual(idActividadAnual).subscribe({
      next: (actividadesMensuales) => {
        const actividadesFiltradas = (actividadesMensuales || []).filter(m => m.idActividadAnual === idActividadAnual);
        this.actividadesMensualesFiltradas.set(actividadesFiltradas);
        
        if (skipCheck && actividadMensualActual) {
          const actividadesMensualesArray = Array.isArray(actividadMensualActual) ? actividadMensualActual : [actividadMensualActual];
          const actividadesValidas = actividadesMensualesArray.filter(id => 
            actividadesFiltradas.find(m => m.idActividadMensualInst === id)
          );
          if (actividadesValidas.length > 0) {
            this.form.patchValue({ idActividadMensualInst: actividadesValidas }, { emitEvent: false });
          } else {
            this.form.patchValue({ idActividadMensualInst: [] }, { emitEvent: false });
          }
        }
        
        this.cargandoRelaciones = false;
        if (skipCheck) {
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error cargando actividades mensuales:', err);
        this.actividadesMensualesFiltradas.set([]);
        this.cargandoRelaciones = false;
        if (skipCheck) {
          this.loading.set(false);
        }
      }
    });
  }


  loadTiposProtagonista(): void {
    this.catalogosService.getTiposProtagonista().subscribe({
      next: (data) => this.tiposProtagonista.set(data.filter(t => t.activo !== false)),
      error: (err) => console.error('Error loading tipos protagonista:', err)
    });
  }

  loadCapacidadesInstaladas(): void {
    this.catalogosService.getCapacidadesInstaladas().subscribe({
      next: (data) => this.capacidadesInstaladas.set(data),
      error: (err) => console.error('Error loading capacidades instaladas:', err)
    });
  }

  loadActividad(id: number): void {
    this.loading.set(true);
    this.actividadesService.get(id).subscribe({
      next: (data) => {
        // Convertir hora de 24h a 12h para los selectores
        let horaRealizacionHora = '';
        let horaRealizacionMinuto = '';
        let horaRealizacionAmPm = '';
        if (data.horaRealizacion) {
          const hora12h = this.convertir24hA12hParaSelectores(String(data.horaRealizacion).substring(0, 5));
          if (hora12h) {
            horaRealizacionHora = hora12h.hora;
            horaRealizacionMinuto = hora12h.minuto;
            horaRealizacionAmPm = hora12h.amPm;
          }
        }

        const nombreActividad = data.nombreActividad || data.nombre || '';
        
        // Usar los arrays correctos que vienen del backend (mapeados por el servicio)
        const departamentoResponsableIdArray = Array.isArray(data.idDepartamentosResponsables) 
          ? data.idDepartamentosResponsables 
          : (data.departamentoResponsableId 
              ? (Array.isArray(data.departamentoResponsableId) ? data.departamentoResponsableId : [data.departamentoResponsableId])
              : []);
        
        const idActividadAnualArray = Array.isArray(data.idActividadesAnuales) 
          ? data.idActividadesAnuales 
          : (data.idActividadAnual 
              ? (Array.isArray(data.idActividadAnual) ? data.idActividadAnual : [data.idActividadAnual])
              : []);
        
        const idTipoProtagonistaArray = Array.isArray(data.idTiposProtagonistas) 
          ? data.idTiposProtagonistas 
          : (data.idTipoProtagonista 
              ? (Array.isArray(data.idTipoProtagonista) ? data.idTipoProtagonista : [data.idTipoProtagonista])
              : []);
        
        const idTipoActividadArray = Array.isArray(data.idTipoActividad) 
          ? data.idTipoActividad 
          : (data.idTipoActividad ? [data.idTipoActividad] : (data.categoriaActividadId ? [data.categoriaActividadId] : []));
        
        const idActividadMensualInstArray = Array.isArray(data.idActividadesMensualesInst) 
          ? data.idActividadesMensualesInst 
          : (data.idActividadMensualInst 
              ? (Array.isArray(data.idActividadMensualInst) ? data.idActividadMensualInst : [data.idActividadMensualInst])
              : []);
        
        const idTipoEvidenciasArray = Array.isArray(data.idTipoEvidencias) 
          ? data.idTipoEvidencias 
          : (data.idTipoEvidencias ? [data.idTipoEvidencias] : []);
        
        this.form.patchValue({
          nombre: nombreActividad,
          nombreActividad: nombreActividad,
          descripcion: data.descripcion || '',
          departamentoId: data.departamentoId || null,
          departamentoResponsableId: departamentoResponsableIdArray,
          fechaInicio: data.fechaInicio || '',
          fechaFin: data.fechaFin || '',
          fechaEvento: data.fechaEvento || '',
          idEstadoActividad: data.idEstadoActividad || null,
          idTipoActividad: idTipoActividadArray,
          idTipoIniciativa: data.idTipoIniciativa || null,
          idArea: data.idArea || null,
          idNivel: data.idNivel || null,
          idTipoDocumento: data.idTipoDocumento || null,
          organizador: data.organizador || '',
          soporteDocumentoUrl: data.soporteDocumentoUrl || null,
          modalidad: data.modalidad || '',
          idCapacidadInstalada: data.idCapacidadInstalada || null,
          semanaMes: data.semanaMes || null,
          codigoActividad: data.codigoActividad || '',
          idActividadMensualInst: idActividadMensualInstArray,
          esPlanificada: false, // Siempre false para actividades no planificadas
          idIndicador: data.idIndicador || null,
          idActividadAnual: idActividadAnualArray,
          objetivo: data.objetivo || '',
          anio: data.anio ? String(data.anio) : String(new Date().getFullYear()),
          horaRealizacion: data.horaRealizacion || '',
          horaRealizacionHora: horaRealizacionHora,
          horaRealizacionMinuto: horaRealizacionMinuto,
          horaRealizacionAmPm: horaRealizacionAmPm,
          cantidadParticipantesProyectados: data.cantidadParticipantesProyectados || null,
          cantidadParticipantesEstudiantesProyectados: data.cantidadParticipantesEstudiantesProyectados || null,
          cantidadTotalParticipantesProtagonistas: data.cantidadTotalParticipantesProtagonistas || null,
          idTipoProtagonista: idTipoProtagonistaArray,
          idTipoEvidencias: idTipoEvidenciasArray,
          responsableActividad: data.responsableActividad || '',
          categoriaActividadId: data.idTipoActividad || data.categoriaActividadId || null,
          areaConocimientoId: data.idArea || data.areaConocimientoId || null,
          ubicacion: data.ubicacion || '',
          activo: data.activo ?? true
        }, { emitEvent: false });

        // Actualizar signal del indicador seleccionado
        setTimeout(() => {
          if (data.idIndicador) {
            const indicador = this.indicadores().find(ind => ind.idIndicador === data.idIndicador);
            if (indicador) {
              this.indicadorSeleccionado.set(indicador);
              console.log('✅ Indicador seleccionado actualizado:', indicador);
            }
            // Asegurar que la sección de planificación esté expandida si hay indicador
            if (!this.seccionPlanificacionExpandida()) {
              console.log('🔄 Forzando expansión de sección de planificación...');
              this.seccionPlanificacionExpandida.set(true);
              // No cerrar las otras secciones - permitir que todas estén abiertas simultáneamente
              this.cdr.detectChanges();
            }
          } else {
            // Si no hay indicador, limpiar y colapsar la sección
            console.log('📊 No hay indicador, limpiando y colapsando sección de planificación...');
            this.indicadorSeleccionado.set(null);
            this.seccionPlanificacionExpandida.set(false);
            this.actividadesAnualesFiltradas.set([]);
            this.actividadesMensualesFiltradas.set([]);
            console.log('✅ Indicador limpiado y sección colapsada');
          }
        }, 100);

        // Inicializar local seleccionado si hay capacidad instalada
        if (data.idCapacidadInstalada) {
          const capacidad = this.capacidadesInstaladas().find(c => c.id === data.idCapacidadInstalada);
          if (capacidad) {
            this.localSeleccionado.set(capacidad);
          }
        }

        // Permitir cambiar el indicador en modo edición
        // if (this.isEditMode()) {
        //   this.form.get('idIndicador')?.disable({ emitEvent: false });
        // }

        if (data.idIndicador) {
          console.log('📊 Actividad tiene indicador:', data.idIndicador);
          // Expandir inmediatamente la sección de planificación si hay un indicador asignado
          this.seccionPlanificacionExpandida.set(true);
          console.log('✅ Sección de planificación expandida:', this.seccionPlanificacionExpandida());
          // No cerrar las otras secciones - permitir que todas estén abiertas simultáneamente
          
          // Cargar actividades anuales y mensuales para este indicador
          this.cargarActividadesPorIndicador(data.idIndicador, true);
          
          // Forzar detección de cambios después de un breve delay para asegurar que la UI se actualice
          setTimeout(() => {
            this.seccionPlanificacionExpandida.set(true); // Asegurar que esté expandida
            this.cdr.detectChanges();
            console.log('✅ Detección de cambios forzada, sección expandida:', this.seccionPlanificacionExpandida());
          }, 200);
          
          // Asegurar que la sección siga expandida después de cargar las actividades
          setTimeout(() => {
            if (!this.seccionPlanificacionExpandida()) {
              console.log('⚠️ Sección se cerró, reabriendo...');
              this.seccionPlanificacionExpandida.set(true);
              this.cdr.detectChanges();
            }
          }, 1000);
        } else {
          // No hay indicador - limpiar todo y colapsar la sección de planificación
          console.log('📊 Actividad NO tiene indicador, limpiando planificación...');
          this.indicadorSeleccionado.set(null);
          this.actividadesAnualesFiltradas.set([]);
          this.actividadesMensualesFiltradas.set([]);
          this.seccionPlanificacionExpandida.set(false);
          this.cargandoRelaciones = false;
          this.loading.set(false);
          console.log('✅ Planificación limpiada, sección colapsada');
        }

        // Cargar responsables si estamos en modo edición
        // Usar setTimeout para asegurar que la carga de la actividad principal termine primero
        if (this.isEditMode() && id) {
          setTimeout(() => {
            this.loadResponsablesDeActividad(id);
          }, 500); // Esperar 500ms para asegurar que todo esté listo
        }
      },
      error: (err) => {
        console.error('Error loading actividad:', err);
        this.error.set('Error al cargar la actividad');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    const nombreValue = this.form.get('nombreActividad')?.value || this.form.get('nombre')?.value;
    if (nombreValue && !this.form.get('nombreActividad')?.value) {
      this.form.patchValue({ nombreActividad: nombreValue });
    }
    if (nombreValue && !this.form.get('nombre')?.value) {
      this.form.patchValue({ nombre: nombreValue });
    }

    // Validar que haya al menos un responsable completo
    if (!this.tieneAlMenosUnResponsable()) {
      this.alertService.error(
        'Responsables requeridos',
        'Debe asignar al menos un responsable con todos sus datos completos. Si elimina todos los responsables, debe agregar al menos uno nuevo.'
      );
      this.form.markAllAsTouched();
      this.seccionResponsablesExpandida.set(true); // Expandir sección de responsables para que el usuario vea el error
      return;
    }

    // Para actividades no planificadas, indicador y actividades anuales/mensuales son OPCIONALES
    // Pero si se agregan, deben estar completos
    const formValue = this.form.getRawValue();
    if (formValue.idIndicador) {
      // Si hay indicador, validar que haya actividades anuales y mensuales
      const idActividadesAnuales = Array.isArray(formValue.idActividadAnual) ? formValue.idActividadAnual : (formValue.idActividadAnual ? [formValue.idActividadAnual] : []);
      if (idActividadesAnuales.length === 0) {
        this.alertService.warning(
          'Actividades anuales recomendadas',
          'Ha seleccionado un indicador. Se recomienda asociar al menos una actividad anual relacionada.'
        );
        // No bloqueamos, solo advertimos
      }

      const idActividadesMensuales = Array.isArray(formValue.idActividadMensualInst) ? formValue.idActividadMensualInst : (formValue.idActividadMensualInst ? [formValue.idActividadMensualInst] : []);
      if (idActividadesMensuales.length === 0) {
        this.alertService.warning(
          'Actividades mensuales recomendadas',
          'Ha seleccionado un indicador y actividades anuales. Se recomienda asociar al menos una actividad mensual relacionada.'
        );
        // No bloqueamos, solo advertimos
      }
    }

    // Validar campos del formulario antes de continuar
    if (!this.form.valid) {
      // Marcar todos los campos como tocados para mostrar errores
      this.form.markAllAsTouched();
      
      // Obtener el primer campo inválido para mostrar un mensaje específico
      const camposInvalidos: string[] = [];
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        if (control && control.invalid) {
          camposInvalidos.push(key);
        }
      });
      
      if (camposInvalidos.length > 0) {
        const primerCampo = camposInvalidos[0];
        let mensajeError = 'Por favor, complete todos los campos requeridos.';
        
        // Mensajes específicos según el campo
        if (primerCampo === 'nombreActividad') {
          mensajeError = 'El nombre de la actividad es requerido y debe tener al menos 3 caracteres.';
        } else if (primerCampo === 'departamentoResponsableId') {
          mensajeError = 'Debe seleccionar al menos un departamento responsable.';
        } else if (primerCampo === 'fechaInicio') {
          mensajeError = 'La fecha de inicio es requerida y debe ser válida.';
        } else if (primerCampo === 'fechaFin') {
          mensajeError = 'La fecha de fin es requerida y debe ser válida.';
        } else if (primerCampo === 'idEstadoActividad') {
          mensajeError = 'Debe seleccionar un estado de actividad.';
        } else if (primerCampo === 'modalidad') {
          mensajeError = 'Debe seleccionar una modalidad.';
        } else if (primerCampo === 'idCapacidadInstalada') {
          mensajeError = 'Debe seleccionar un local/capacidad instalada.';
        } else if (primerCampo === 'cantidadParticipantesProyectados') {
          mensajeError = 'Debe especificar la cantidad de participantes proyectados.';
        } else if (primerCampo === 'cantidadTotalParticipantesProtagonistas') {
          mensajeError = 'Debe especificar la cantidad total de participantes protagonistas.';
        } else if (primerCampo === 'idTipoProtagonista') {
          mensajeError = 'Debe seleccionar al menos un tipo de protagonista.';
        } else if (primerCampo === 'horaRealizacionHora' || primerCampo === 'horaRealizacionMinuto' || primerCampo === 'horaRealizacionAmPm') {
          mensajeError = 'Debe especificar la hora de realización completa (hora, minuto y AM/PM).';
        } else if (primerCampo === 'anio') {
          mensajeError = 'Debe especificar el año de la actividad.';
        }
        
        this.alertService.error('Campos requeridos', mensajeError);
        this.error.set(mensajeError);
      }
      return;
    }

    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      const formValue = this.form.getRawValue();
      
      let fechaInicio: string | undefined = undefined;
      let fechaFin: string | undefined = undefined;
      
      if (formValue.fechaInicio) {
        // El valor ya viene en formato YYYY-MM-DD del input type="date"
        // No necesitamos convertir con Date para evitar problemas de zona horaria
        fechaInicio = formValue.fechaInicio;
      }
      
      if (formValue.fechaFin) {
        // El valor ya viene en formato YYYY-MM-DD del input type="date"
        // No necesitamos convertir con Date para evitar problemas de zona horaria
        fechaFin = formValue.fechaFin;
      }

      let horaRealizacion: string | undefined = undefined;
      if (formValue.horaRealizacion) {
        // horaRealizacion ya está en formato 24h desde actualizarHoraRealizacion
        const hora = String(formValue.horaRealizacion).trim();
        horaRealizacion = hora.includes(':') ? (hora.split(':').length === 2 ? hora + ':00' : hora) : hora;
      }

      // Construir el array de responsables antes de crear la actividad
      const responsables = this.construirResponsables(formValue);
      
      // Para actividades no planificadas, los campos de planificación son opcionales
      // Solo se incluyen si tienen valor válido (no null, no undefined, no arrays vacíos)
      const tieneIndicador = formValue.idIndicador !== null && formValue.idIndicador !== undefined && Number(formValue.idIndicador) > 0;
      const tieneActividadesAnuales = Array.isArray(formValue.idActividadAnual) && formValue.idActividadAnual.length > 0;
      const tieneActividadesMensuales = Array.isArray(formValue.idActividadMensualInst) && formValue.idActividadMensualInst.length > 0;
      
      // En modo edición, si idIndicador es null explícitamente, debemos enviarlo como null para eliminarlo
      // En modo creación, si no hay indicador, se envía undefined
      const idIndicadorValue = this.isEditMode() 
        ? (formValue.idIndicador === null ? null : (tieneIndicador ? formValue.idIndicador : null))
        : (tieneIndicador ? formValue.idIndicador : undefined);
      
      console.log('🔍 [onSubmit] idIndicador en formulario:', formValue.idIndicador);
      console.log('🔍 [onSubmit] tieneIndicador:', tieneIndicador);
      console.log('🔍 [onSubmit] idIndicadorValue a enviar:', idIndicadorValue);
      console.log('🔍 [onSubmit] Modo edición:', this.isEditMode());

      const data: ActividadCreate = {
        nombreActividad: formValue.nombreActividad || formValue.nombre,
        nombre: formValue.nombreActividad || formValue.nombre,
        descripcion: formValue.descripcion || undefined,
        departamentoId: formValue.departamentoId || undefined,
        // Cambiar a idDepartamentosResponsables (plural) como espera el backend
        idDepartamentosResponsables: Array.isArray(formValue.departamentoResponsableId) && formValue.departamentoResponsableId.length > 0 ? formValue.departamentoResponsableId : undefined,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        idEstadoActividad: formValue.idEstadoActividad !== null && formValue.idEstadoActividad !== undefined ? Number(formValue.idEstadoActividad) : undefined,
        idTipoActividad: Array.isArray(formValue.idTipoActividad) && formValue.idTipoActividad.length > 0 ? formValue.idTipoActividad : (formValue.categoriaActividadId ? [formValue.categoriaActividadId] : undefined),
        modalidad: formValue.modalidad || undefined,
        idCapacidadInstalada: formValue.idCapacidadInstalada || undefined,
        semanaMes: formValue.semanaMes || undefined,
        codigoActividad: formValue.codigoActividad || undefined,
        // El backend espera List<int>? (array) - usar idActividadesMensualesInst (plural) - OPCIONAL
        // En modo edición: enviar array vacío [] si se eliminó el indicador, para limpiar las actividades mensuales
        // En modo creación: enviar undefined si no hay actividades mensuales
        idActividadesMensualesInst: this.isEditMode()
          ? (tieneIndicador && tieneActividadesMensuales ? formValue.idActividadMensualInst : (formValue.idIndicador === null ? [] : undefined))
          : (tieneActividadesMensuales ? formValue.idActividadMensualInst : undefined),
        esPlanificada: false, // Siempre false para actividades no planificadas
        // Campos de planificación opcionales
        // En modo edición: enviar null explícitamente si se eliminó el indicador
        // En modo creación: enviar undefined si no hay indicador
        idIndicador: idIndicadorValue,
        // El backend espera List<int>? (array) - usar idActividadesAnuales (plural) - OPCIONAL
        // En modo edición: enviar array vacío [] si se eliminó el indicador, para limpiar las actividades anuales
        // En modo creación: enviar undefined si no hay actividades anuales
        idActividadesAnuales: this.isEditMode()
          ? (tieneIndicador && tieneActividadesAnuales ? formValue.idActividadAnual : (formValue.idIndicador === null ? [] : undefined))
          : (tieneActividadesAnuales ? formValue.idActividadAnual : undefined),
        objetivo: formValue.objetivo || undefined,
        // Si no se proporciona año, usar el año de la fecha de inicio o el año actual
        anio: formValue.anio ? String(formValue.anio) : (formValue.fechaInicio ? String(new Date(formValue.fechaInicio).getFullYear()) : String(this.getAnioVigente())),
        horaRealizacion: horaRealizacion,
        cantidadParticipantesProyectados: formValue.cantidadParticipantesProyectados || undefined,
        cantidadParticipantesEstudiantesProyectados: formValue.cantidadParticipantesEstudiantesProyectados || undefined,
        cantidadTotalParticipantesProtagonistas: formValue.cantidadTotalParticipantesProtagonistas !== null && formValue.cantidadTotalParticipantesProtagonistas !== undefined && formValue.cantidadTotalParticipantesProtagonistas !== '' ? Number(formValue.cantidadTotalParticipantesProtagonistas) : undefined,
        // Cambiar a idTiposProtagonistas (plural) como espera el backend
        idTiposProtagonistas: Array.isArray(formValue.idTipoProtagonista) && formValue.idTipoProtagonista.length > 0 ? formValue.idTipoProtagonista : undefined,
        // idTipoEvidencias puede ser null/vacío - permitir arrays vacíos o null
        idTipoEvidencias: Array.isArray(formValue.idTipoEvidencias) && formValue.idTipoEvidencias.length > 0 ? formValue.idTipoEvidencias : (formValue.idTipoEvidencias === null ? null : undefined),
        responsableActividad: formValue.responsableActividad || undefined,
        categoriaActividadId: Array.isArray(formValue.idTipoActividad) && formValue.idTipoActividad.length > 0 ? formValue.idTipoActividad[0] : (formValue.categoriaActividadId || undefined),
        areaConocimientoId: formValue.idArea || formValue.areaConocimientoId || undefined,
        ubicacion: formValue.ubicacion || undefined,
        activo: formValue.activo !== undefined ? formValue.activo : true,
        // Incluir responsables en el payload SOLO en modo creación
        // En modo edición, los responsables se eliminan y recrean después
        responsables: this.isEditMode() ? undefined : (responsables.length > 0 ? responsables : undefined)
      };

      if (this.isEditMode()) {
        // Modo edición: actualizar actividad existente
        // Primero eliminar responsables existentes y luego crear los nuevos
        const actividadId = this.actividadId()!;
        
        // Obtener responsables existentes para eliminarlos
        this.responsableService.getByActividad(actividadId).subscribe({
          next: (responsablesExistentes) => {
            // Eliminar todos los responsables existentes
            if (responsablesExistentes && responsablesExistentes.length > 0) {
              const deleteRequests = responsablesExistentes.map(resp => 
                this.responsableService.delete(resp.idActividadResponsable)
              );
              
              // Usar forkJoin con manejo de errores individuales para asegurar que todos se eliminen
              forkJoin(
                deleteRequests.map(req => req.pipe(
                  catchError(err => {
                    console.warn('⚠️ Error eliminando un responsable (continuando):', err);
                    return of(null); // Continuar aunque haya error
                  })
                ))
              ).subscribe({
                next: (results) => {
                  const exitosos = results.filter(r => r !== null).length;
                  const fallidos = results.filter(r => r === null).length;
                  console.log(`✅ Responsables eliminados: ${exitosos} exitosos, ${fallidos} fallidos`);
                  
                  // Actualizar la actividad inmediatamente (sin delay innecesario)
                  this.actividadesService.update(actividadId, data).subscribe({
                      next: () => {
                        console.log('✅ Actividad actualizada, ahora creando nuevos responsables...');
                        // Crear los nuevos responsables y mostrar alerta después
                        this.crearResponsablesParaActividad(actividadId, () => {
                          // Resetear el flag de carga
                          this.cargandoResponsables = false;
                          this.ultimaActividadCargada = null;
                          this.loading.set(false);
                          const nombreActividad = formValue.nombreActividad || formValue.nombre || 'la actividad';
                          // Mostrar alerta con backdrop que bloquea la vista
                          this.alertService.success(
                            '¡Actividad actualizada!',
                            `La actividad "${nombreActividad}" ha sido actualizada correctamente.`
                          ).then(() => {
                            this.clearFormState();
                            this.router.navigate(['/actividades', actividadId]);
                          });
                        });
                      },
                      error: (err: any) => {
                        console.error('❌ Error actualizando actividad:', err);
                        const errorMsg = err.error?.message || err.error?.details || err.message || 'Error desconocido al actualizar la actividad';
                        this.alertService.error('Error al actualizar la actividad', errorMsg);
                        this.error.set('Error al guardar la actividad');
                        this.loading.set(false);
                      }
                    });
                },
                error: (err) => {
                  console.error('Error eliminando responsables existentes:', err);
                  // Continuar con la actualización aunque haya error al eliminar
                  this.actividadesService.update(actividadId, data).subscribe({
                    next: () => {
                      this.crearResponsablesParaActividad(actividadId, () => {
                        // Resetear el flag de carga
                        this.cargandoResponsables = false;
                        this.ultimaActividadCargada = null;
                        this.loading.set(false);
                        const nombreActividad = formValue.nombreActividad || formValue.nombre || 'la actividad';
                        // Mostrar alerta con backdrop que bloquea la vista
                        this.alertService.success(
                          '¡Actividad actualizada!',
                          `La actividad "${nombreActividad}" ha sido actualizada correctamente.`
                        ).then(() => {
                          this.clearFormState();
                          this.router.navigate(['/actividades', actividadId]);
                        });
                      });
                    },
                    error: (err: any) => {
                      console.error('❌ Error updating actividad:', err);
                      this.loading.set(false);
                      
                      let errorMsg = 'Error al actualizar la actividad';
                      if (err.error) {
                        if (typeof err.error === 'string') {
                          errorMsg = err.error;
                        } else if (err.error.message) {
                          errorMsg = err.error.message;
                        }
                      }
                      
                      this.alertService.error('Error al actualizar la actividad', errorMsg);
                      this.error.set(errorMsg);
                    }
                  });
                }
              });
            } else {
              // No hay responsables existentes, solo actualizar la actividad
              this.actividadesService.update(actividadId, data).subscribe({
                next: () => {
                  this.crearResponsablesParaActividad(actividadId, () => {
                    this.loading.set(false);
                    const nombreActividad = formValue.nombreActividad || formValue.nombre || 'la actividad';
                    this.alertService.success(
                      '¡Actividad actualizada!',
                      `La actividad "${nombreActividad}" ha sido actualizada correctamente.`
                    ).then(() => {
                      this.clearFormState();
                      this.router.navigate(['/actividades', actividadId]);
                    });
                  });
                },
                error: (err: any) => {
                  console.error('❌ Error updating actividad:', err);
                  this.loading.set(false);
                  
                  let errorMsg = 'Error al actualizar la actividad';
                  if (err.error) {
                    if (typeof err.error === 'string') {
                      errorMsg = err.error;
                    } else if (err.error.message) {
                      errorMsg = err.error.message;
                    }
                  }
                  
                  this.alertService.error('Error al actualizar la actividad', errorMsg);
                  this.error.set(errorMsg);
                }
              });
            }
          },
          error: (err) => {
            console.error('Error obteniendo responsables existentes:', err);
            // Continuar con la actualización aunque haya error
            this.actividadesService.update(actividadId, data).subscribe({
              next: () => {
                this.crearResponsablesParaActividad(actividadId, () => {
                  this.loading.set(false);
                  const nombreActividad = formValue.nombreActividad || formValue.nombre || 'la actividad';
                  this.alertService.success(
                    '¡Actividad actualizada!',
                    `La actividad "${nombreActividad}" ha sido actualizada correctamente.`
                  ).then(() => {
                    this.clearFormState();
                    this.router.navigate(['/actividades', actividadId]);
                  });
                });
              },
              error: (err: any) => {
                console.error('❌ Error updating actividad:', err);
                this.loading.set(false);
                
                let errorMsg = 'Error al actualizar la actividad';
                if (err.error) {
                  if (typeof err.error === 'string') {
                    errorMsg = err.error;
                  } else if (err.error.message) {
                    errorMsg = err.error.message;
                  }
                }
                
                this.alertService.error('Error al actualizar la actividad', errorMsg);
                this.error.set(errorMsg);
              }
            });
          }
        });
      } else {
        // Modo creación: crear nueva actividad
        // Log solo en desarrollo para no ralentizar en producción
        if (!environment.production) {
          console.log('📤 Enviando datos al backend:', JSON.stringify(data, null, 2));
        }
        
        // Agregar timeout para evitar que se quede cargando indefinidamente
        let timeoutId: any = setTimeout(() => {
          if (this.loading()) {
            this.loading.set(false);
            this.alertService.warning(
              '⏱️ La operación está tardando más de lo esperado',
              'La creación de la actividad está tomando más tiempo del normal. Por favor, espere un momento más o verifique su conexión.'
            );
          }
        }, 60000); // 60 segundos de timeout
        
        this.actividadesService.create(data).subscribe({
          next: (actividadCreada) => {
            clearTimeout(timeoutId); // Limpiar timeout si la operación fue exitosa
            const indicadorId = this.indicadorIdFromQuery();
            const nombreActividad = formValue.nombreActividad || formValue.nombre || 'la actividad';
            
            // Crear responsables para la actividad recién creada
            if (actividadCreada.id) {
              console.log('🔄 Actividad creada, ahora creando responsables...', actividadCreada.id);
              this.loading.set(false); // Detener el loading
              // Guardar el ID de la actividad creada para usarlo en mostrarAlertaExito
              (this as any).actividadIdCreada = actividadCreada.id;
              this.crearResponsablesParaActividad(actividadCreada.id);
              // No mostrar alerta aquí, se mostrará en crearResponsablesParaActividad
              
              // Si hay un indicador adicional desde query params, asociarlo en segundo plano
              if (indicadorId) {
                this.actividadesService.agregarIndicador(actividadCreada.id, indicadorId).subscribe({
                  next: () => {
                    console.log('✅ Indicador asociado correctamente');
                  },
                  error: (errIndicador) => {
                    console.error('Error al asociar indicador:', errIndicador);
                  }
                });
              }
              return; // Salir temprano, la alerta se mostrará después en crearResponsablesParaActividad
            }
            
            // Si no hay ID de actividad, mostrar alerta y redirigir
            this.loading.set(false);
            const idActividadCreada = actividadCreada.id || actividadCreada.idActividad || (actividadCreada as any).Id || (actividadCreada as any).IdActividad;
            this.alertService.success(
              '¡Actividad creada exitosamente!',
              `La actividad "${nombreActividad}" ha sido creada correctamente.`
            ).then(() => {
              // Redirigir a la vista de detalles de la actividad creada
              this.clearFormState();
              if (idActividadCreada) {
                this.router.navigate(['/actividades', idActividadCreada]);
              } else {
                this.router.navigate(['/actividades']);
              }
            });
          },
          error: (err: any) => {
            clearTimeout(timeoutId); // Limpiar timeout en caso de error
            console.error('❌ Error saving actividad:', err);
            console.error('📋 Error details:', err.error);
            console.error('📤 Payload enviado:', JSON.stringify(data, null, 2));
            
            this.loading.set(false);
            
            // Detectar error de timeout
            const errorMessage = err.error?.message || err.error?.details || err.error || err.message || '';
            const errorText = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
            const isTimeoutError = errorText.includes('Execution Timeout Expired') || 
                                 errorText.includes('timeout period elapsed') ||
                                 errorText.includes('timeout period ela') ||
                                 errorText.includes('SqlException') ||
                                 (err.status === 400 && errorText.includes('timeout'));
            
            // Detectar error de nombre duplicado
            const isDuplicateNameError = errorText.includes('UQ_Actividades_Nombre') || 
                                        errorText.includes('duplicate key') ||
                                        errorText.includes('Cannot insert duplicate key');
            
            if (isTimeoutError) {
              // Timeout: la actividad puede haberse creado pero el backend no pudo responder a tiempo
              const nombreActividad = formValue.nombreActividad || formValue.nombre || 'la actividad';
              this.alertService.warning(
                '⏱️ Timeout en la creación de la actividad',
                `La operación tardó demasiado tiempo. Es posible que la actividad "${nombreActividad}" se haya creado correctamente, pero el servidor no pudo responder a tiempo.\n\n` +
                `Por favor, verifica en la lista de actividades si la actividad fue creada. Si no aparece, intenta crearla nuevamente.`
              ).then(() => {
                // Redirigir a la vista de actividades para que el usuario pueda verificar
                this.clearFormState();
                this.router.navigate(['/actividades']);
              });
              this.error.set('Timeout: La actividad puede haberse creado. Verifica en la lista de actividades.');
            } else if (isDuplicateNameError) {
              // Solo mostrar alerta de que ya existe la actividad
              const nombreOriginal = formValue.nombreActividad || formValue.nombre;
              const currentYear = new Date().getFullYear();
              this.alertService.warning(
                `Ya existe una actividad con el nombre "${nombreOriginal}" en el año ${currentYear}. ` +
                `Por favor, cambia el nombre de la actividad.`
              );
              this.error.set(`Ya existe una actividad con este nombre en el año ${currentYear}`);
            } else {
              // Otro tipo de error
              let errorMsg = 'Error al guardar la actividad';
              if (err.error) {
                if (typeof err.error === 'string') {
                  errorMsg = err.error;
                } else if (err.error.message) {
                  errorMsg = err.error.message;
                } else if (err.error.errors) {
                  // Si hay errores de validación, mostrar el primero
                  const firstError = Object.values(err.error.errors)[0];
                  if (Array.isArray(firstError) && firstError.length > 0) {
                    errorMsg = String(firstError[0]);
                  }
                }
              }
              
              this.alertService.error('Error al guardar la actividad', errorMsg);
              this.error.set(errorMsg);
            }
          }
        });
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  toggleProtagonista(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idTipoProtagonista')?.value || [];
    let newValue: number[];
    
    if (checked) {
      if (!currentValue.includes(id)) {
        newValue = [...currentValue, id];
      } else {
        newValue = currentValue;
      }
      this.mostrarDropdownProtagonista.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownProtagonista.set(true);
      }
    }
    
    this.form.patchValue({ idTipoProtagonista: newValue });
  }

  isProtagonistaSelected(id: number): boolean {
    const currentValue = this.form.get('idTipoProtagonista')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  toggleDepartamentoResponsable(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('departamentoResponsableId')?.value || [];
    let newValue: number[];
    
    if (checked) {
      if (!currentValue.includes(id)) {
        newValue = [...currentValue, id];
      } else {
        newValue = currentValue;
      }
      this.mostrarDropdownDepartamentos.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownDepartamentos.set(true);
      }
    }
    
    this.form.patchValue({ departamentoResponsableId: newValue });
  }

  isDepartamentoResponsableSelected(id: number): boolean {
    const currentValue = this.form.get('departamentoResponsableId')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  toggleActividadAnual(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idActividadAnual')?.value || [];
    let newValue: number[];
    
    if (checked) {
      if (!currentValue.includes(id)) {
        newValue = [...currentValue, id];
      } else {
        newValue = currentValue;
      }
      // Cerrar el dropdown de anuales después de seleccionar
      this.mostrarDropdownActividadAnual.set(false);
      
      // Cargar actividades mensuales para las actividades anuales seleccionadas y abrir el dropdown automáticamente
      this.cargarActividadesMensualesPorMultiplesAnuales(newValue, false);
      // Abrir el dropdown de actividades mensuales automáticamente cuando se carguen los datos
      setTimeout(() => {
        this.mostrarDropdownActividadMensual.set(true);
      }, 300);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownActividadAnual.set(true);
        // Si no hay actividades anuales seleccionadas, limpiar las mensuales
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({ idActividadMensualInst: [] }, { emitEvent: false });
        this.mostrarDropdownActividadMensual.set(false);
      } else {
        // Recargar actividades mensuales con las actividades anuales restantes
        this.cargarActividadesMensualesPorMultiplesAnuales(newValue, false);
        setTimeout(() => {
          this.mostrarDropdownActividadMensual.set(true);
        }, 300);
      }
    }
    
    this.form.patchValue({ idActividadAnual: newValue });
  }

  isActividadAnualSelected(id: number): boolean {
    const currentValue = this.form.get('idActividadAnual')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }


  // Métodos helper para manejar dropdowns
  mostrarDropdownAnual(): void {
    this.mostrarDropdownActividadAnual.set(true);
  }

  mostrarDropdownMensual(): void {
    this.mostrarDropdownActividadMensual.set(true);
  }

  mostrarDropdownDepartamentosFunc(): void {
    this.mostrarDropdownDepartamentos.set(true);
  }


  mostrarDropdownProtagonistaFunc(): void {
    this.mostrarDropdownProtagonista.set(true);
  }

  mostrarDropdownEstadoActividadFunc(): void {
    this.mostrarDropdownEstadoActividad.set(true);
  }

  mostrarDropdownModalidadFunc(): void {
    this.mostrarDropdownModalidad.set(true);
  }

  mostrarDropdownLocalFunc(): void {
    this.mostrarDropdownLocal.set(true);
  }

  // Métodos para obtener selecciones como objetos
  getActividadesAnualesSeleccionadas(): ActividadAnual[] {
    const ids = this.form.get('idActividadAnual')?.value || [];
    return this.actividadesAnuales().filter(a => Array.isArray(ids) && ids.includes(a.idActividadAnual));
  }

  getActividadesMensualesSeleccionadas(): ActividadMensualInst[] {
    const ids = this.form.get('idActividadMensualInst')?.value || [];
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return this.actividadesMensualesFiltradas().filter(m => Array.isArray(ids) && ids.includes(m.idActividadMensualInst));
  }

  getDepartamentosSeleccionados(): Departamento[] {
    const ids = this.form.get('departamentoResponsableId')?.value || [];
    return this.departamentos().filter(d => Array.isArray(ids) && ids.includes(d.id));
  }


  getProtagonistasSeleccionados(): any[] {
    const ids = this.form.get('idTipoProtagonista')?.value || [];
    return this.tiposProtagonista().filter(t => Array.isArray(ids) && ids.includes(t.id));
  }

  getEstadoActividadSeleccionado(): EstadoActividad | null {
    const id = this.form.get('idEstadoActividad')?.value;
    if (!id) return null;
    return this.estadosActividad().find(e => (e.idEstadoActividad || e.id) === id) || null;
  }

  getModalidadSeleccionada(): string {
    return this.form.get('modalidad')?.value || '';
  }

  // Métodos para verificar si hay selecciones
  tieneActividadesAnualesSeleccionadas(): boolean {
    return this.getActividadesAnualesSeleccionadas().length > 0;
  }

  tieneActividadesMensualesSeleccionadas(): boolean {
    return this.getActividadesMensualesSeleccionadas().length > 0;
  }

  tieneDepartamentosSeleccionados(): boolean {
    return this.getDepartamentosSeleccionados().length > 0;
  }


  tieneProtagonistasSeleccionados(): boolean {
    return this.getProtagonistasSeleccionados().length > 0;
  }

  tieneEstadoActividadSeleccionado(): boolean {
    return this.getEstadoActividadSeleccionado() !== null;
  }

  tieneModalidadSeleccionada(): boolean {
    return !!this.getModalidadSeleccionada();
  }

  tieneLocalSeleccionado(): boolean {
    return this.localSeleccionado() !== null;
  }

  // Métodos para eliminar selecciones
  eliminarActividadAnual(id: number): void {
    const currentValue = this.form.get('idActividadAnual')?.value || [];
    const newValue = Array.isArray(currentValue) ? currentValue.filter((item: number) => item !== id) : [];
    this.form.patchValue({ idActividadAnual: newValue });
    
    if (newValue.length === 0) {
      this.mostrarDropdownActividadAnual.set(true);
    }
  }

  eliminarActividadMensual(id: number): void {
    const currentValue = this.form.get('idActividadMensualInst')?.value || [];
    const newValue = Array.isArray(currentValue) ? currentValue.filter((item: number) => item !== id) : [];
    this.form.patchValue({ idActividadMensualInst: newValue });
    
    if (newValue.length === 0) {
      this.mostrarDropdownActividadMensual.set(true);
    }
  }

  toggleActividadMensual(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idActividadMensualInst')?.value || [];
    let newValue: number[];
    
    if (checked) {
      if (!currentValue.includes(id)) {
        newValue = [...currentValue, id];
      } else {
        newValue = currentValue;
      }
      // Cerrar el dropdown de mensuales después de seleccionar
      this.mostrarDropdownActividadMensual.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownActividadMensual.set(true);
      }
    }
    
    this.form.patchValue({ idActividadMensualInst: newValue });
  }

  toggleActividadMensualOld(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idActividadMensualInst')?.value || [];
    let newValue: number[];
    
    if (checked) {
      if (!currentValue.includes(id)) {
        newValue = [...currentValue, id];
      } else {
        newValue = currentValue;
      }
      // Ocultar el dropdown cuando se selecciona una actividad mensual
      this.mostrarDropdownActividadMensual.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownActividadMensual.set(true);
      }
    }
    
    this.form.patchValue({ idActividadMensualInst: newValue });
  }

  isActividadMensualSelected(id: number): boolean {
    const currentValue = this.form.get('idActividadMensualInst')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  eliminarDepartamento(id: number): void {
    const currentValue = this.form.get('departamentoResponsableId')?.value || [];
    const newValue = Array.isArray(currentValue) ? currentValue.filter((item: number) => item !== id) : [];
    this.form.patchValue({ departamentoResponsableId: newValue });
  }


  eliminarProtagonista(id: number): void {
    const currentValue = this.form.get('idTipoProtagonista')?.value || [];
    const newValue = Array.isArray(currentValue) ? currentValue.filter((item: number) => item !== id) : [];
    this.form.patchValue({ idTipoProtagonista: newValue });
  }

  eliminarEstadoActividad(): void {
    this.form.patchValue({ idEstadoActividad: null });
    this.mostrarDropdownEstadoActividad.set(true);
  }

  eliminarModalidad(): void {
    this.form.patchValue({ modalidad: '' });
    this.mostrarDropdownModalidad.set(true);
  }

  eliminarLocal(): void {
    this.form.patchValue({ idCapacidadInstalada: null });
    this.localSeleccionado.set(null);
    this.mostrarDropdownLocal.set(true);
  }

  // Métodos para toggle con actualización de signals
  toggleLocal(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idCapacidadInstalada')?.value;
    
    if (checked) {
      const idNumero = Number(id);
      const capacidades = this.capacidadesInstaladas();
      const local = capacidades.find(c => Number(c.id) === idNumero);
      
      this.form.patchValue({ idCapacidadInstalada: idNumero });
      this.localSeleccionado.set(local || null);
      this.mostrarDropdownLocal.set(false);
    } else {
      if (Number(currentValue) === Number(id)) {
        this.eliminarLocal();
      }
    }
  }

  isLocalSelected(id: number): boolean {
    return this.form.get('idCapacidadInstalada')?.value === id;
  }

  toggleModalidad(modalidad: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.form.patchValue({ modalidad });
      this.mostrarDropdownModalidad.set(false);
    } else {
      this.form.patchValue({ modalidad: '' });
      this.mostrarDropdownModalidad.set(true);
    }
  }

  isModalidadSelected(modalidad: string): boolean {
    return this.form.get('modalidad')?.value === modalidad;
  }

  getOpcionesModalidad(): string[] {
    return ['Presencial', 'Virtual', 'Híbrida'];
  }

  toggleEstadoActividad(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idEstadoActividad')?.value;
    
    if (checked) {
      this.form.patchValue({ idEstadoActividad: Number(id) });
      this.mostrarDropdownEstadoActividad.set(false);
    } else {
      if (Number(currentValue) === Number(id)) {
        this.form.patchValue({ idEstadoActividad: null });
        this.mostrarDropdownEstadoActividad.set(true);
      }
    }
  }

  isEstadoActividadSelected(id: number): boolean {
    return this.form.get('idEstadoActividad')?.value === id;
  }

  crearNuevaActividadAnual(): void {
    const idIndicador = this.form.get('idIndicador')?.value;
    if (idIndicador) {
      this.router.navigate(['/actividades-anuales/nueva'], { queryParams: { idIndicador } });
    } else {
      this.router.navigate(['/actividades-anuales/nueva']);
    }
  }

  // Actualizar horaRealizacion desde los selectores de 12h
  actualizarHoraRealizacion(): void {
    const hora = this.form.get('horaRealizacionHora')?.value;
    const minuto = this.form.get('horaRealizacionMinuto')?.value;
    const amPm = this.form.get('horaRealizacionAmPm')?.value;
    
    if (!hora || !minuto || !amPm) {
      this.form.patchValue({ horaRealizacion: '' }, { emitEvent: false });
      return;
    }
    
    // Convertir de 12h a 24h
    let horas24 = parseInt(hora, 10);
    
    if (amPm === 'PM' && horas24 !== 12) {
      horas24 = horas24 + 12;
    } else if (amPm === 'AM' && horas24 === 12) {
      horas24 = 0;
    }
    
    const hora24h = `${horas24.toString().padStart(2, '0')}:${minuto}`;
    this.form.patchValue({ horaRealizacion: hora24h }, { emitEvent: false });
  }

  // Convertir hora de 24h a 12h para los selectores
  convertir24hA12hParaSelectores(hora24h: string): { hora: string; minuto: string; amPm: string } | null {
    if (!hora24h || !hora24h.includes(':')) return null;
    
    const [horas, minutos] = hora24h.split(':');
    const horasNum = parseInt(horas, 10);
    
    if (isNaN(horasNum)) return null;
    
    let horas12 = horasNum;
    let amPm = 'AM';
    
    if (horasNum === 0) {
      horas12 = 12;
    } else if (horasNum === 12) {
      amPm = 'PM';
    } else if (horasNum > 12) {
      horas12 = horasNum - 12;
      amPm = 'PM';
    }
    
    return {
      hora: horas12.toString().padStart(2, '0'),
      minuto: minutos,
      amPm: amPm
    };
  }

  private convertir24hA12h(hora24h: string): string {
    if (!hora24h || !hora24h.includes(':')) return hora24h;
    
    const [horas, minutos] = hora24h.split(':');
    const horasNum = parseInt(horas, 10);
    
    if (isNaN(horasNum)) return hora24h;
    
    let horas12 = horasNum;
    const ampm = horasNum >= 12 ? 'PM' : 'AM';
    
    if (horasNum === 0) {
      horas12 = 12;
    } else if (horasNum > 12) {
      horas12 = horasNum - 12;
    }
    
    return `${horas12.toString().padStart(2, '0')}:${minutos} ${ampm}`;
  }

  private convertir12hA24h(hora12h: string): string | null {
    if (!hora12h) return null;
    
    const hora = hora12h.trim().toUpperCase();
    const tieneAM = hora.includes('AM');
    const tienePM = hora.includes('PM');
    
    if (!tieneAM && !tienePM) {
      return hora;
    }
    
    const horaSinAmPm = hora.replace(/AM|PM/g, '').trim();
    
    if (!horaSinAmPm.includes(':')) return null;
    
    const [horasStr, minutos] = horaSinAmPm.split(':');
    const horas = parseInt(horasStr, 10);
    
    if (isNaN(horas) || isNaN(parseInt(minutos, 10))) return null;
    
    let horas24 = horas;
    
    if (tienePM && horas !== 12) {
      horas24 = horas + 12;
    } else if (tieneAM && horas === 12) {
      horas24 = 0;
    }
    
    return `${horas24.toString().padStart(2, '0')}:${minutos}`;
  }

  private crearResponsable(idActividad: number, nombreResponsable: string): void {
    this.responsableService.getByActividad(idActividad).subscribe({
      next: (responsablesExistentes) => {
        if (responsablesExistentes && responsablesExistentes.length > 0) {
          const responsableExistente = responsablesExistentes[0];
          const updateData: any = {
            rolResponsable: nombreResponsable
          };
          this.responsableService.update(responsableExistente.idActividadResponsable, updateData).subscribe({
            next: () => {
              this.mostrarAlertaExito();
            },
            error: (err) => {
              console.error('Error actualizando responsable:', err);
              this.mostrarAlertaExito();
            }
          });
        } else {
          const responsableData: ActividadResponsableCreate = {
            idActividad: idActividad,
            idTipoResponsable: 1,
            rolResponsable: nombreResponsable,
            fechaAsignacion: new Date().toISOString().split('T')[0]
          };
          
          this.responsableService.create(responsableData).subscribe({
            next: () => {
              this.mostrarAlertaExito();
            },
            error: (err) => {
              console.error('Error creando responsable:', err);
              this.mostrarAlertaExito();
            }
          });
        }
      },
      error: (err) => {
        const responsableData: ActividadResponsableCreate = {
          idActividad: idActividad,
          idTipoResponsable: 1,
          rolResponsable: nombreResponsable,
          fechaAsignacion: new Date().toISOString().split('T')[0]
        };
        
        this.responsableService.create(responsableData).subscribe({
          next: () => {
            this.mostrarAlertaExito();
          },
          error: (createErr) => {
            console.error('Error creando responsable:', createErr);
            this.mostrarAlertaExito();
          }
        });
      }
    });
  }

  private actualizarResponsable(idActividad: number, nombreResponsable: string): void {
    this.responsableService.getByActividad(idActividad).subscribe({
      next: (responsablesExistentes) => {
        if (responsablesExistentes && responsablesExistentes.length > 0) {
          const responsableExistente = responsablesExistentes[0];
          const updateData: any = {
            idActividad: responsableExistente.idActividad,
            idTipoResponsable: responsableExistente.idTipoResponsable || 1,
            rolResponsable: nombreResponsable
          };
          this.responsableService.update(responsableExistente.idActividadResponsable, updateData).subscribe({
            next: () => {
              this.mostrarAlertaExito();
            },
            error: (err) => {
              console.error('Error actualizando responsable:', err);
              this.mostrarAlertaExito();
            }
          });
        } else {
          this.crearResponsable(idActividad, nombreResponsable);
        }
      },
      error: (err) => {
        this.crearResponsable(idActividad, nombreResponsable);
      }
    });
  }

  private mostrarAlertaExito(): void {
    const nombreActividad = this.form.get('nombreActividad')?.value || 'la actividad';
    
    // Detener el loading antes de mostrar la alerta
    this.loading.set(false);
    
    if (this.isEditMode()) {
      // Mensaje para actividad actualizada - navegar a vista de detalle
      const actividadId = this.actividadId();
      this.alertService.success(
        '¡Actividad actualizada!',
        `La actividad "${nombreActividad}" ha sido actualizada correctamente.`
      ).then(() => {
        this.clearFormState();
        if (actividadId) {
          this.router.navigate(['/actividades', actividadId]);
        } else {
          this.router.navigate(['/actividades']);
        }
      });
    } else {
      // Mensaje para actividad creada - necesitamos obtener el ID de la actividad creada
      // Buscar el ID desde el formulario o desde una variable de instancia
      const actividadId = (this as any).actividadIdCreada || null;
      this.alertService.success(
        '¡Actividad creada exitosamente!',
        `La actividad "${nombreActividad}" ha sido creada correctamente.`
      ).then(() => {
        this.clearFormState();
        if (actividadId) {
          this.router.navigate(['/actividades', actividadId]);
        } else {
          this.router.navigate(['/actividades']);
        }
      });
    }
  }

  // Métodos para responsables
  initializeFormResponsable(): void {
    this.formResponsable = this.fb.group({
      usuarios: this.fb.array([]),
      docentes: this.fb.array([]),
      estudiantes: this.fb.array([]),
      administrativos: this.fb.array([]),
      responsablesExternos: this.fb.array([])
    });
  }

  get usuariosArray(): FormArray {
    return this.formResponsable.get('usuarios') as FormArray;
  }

  get docentesArray(): FormArray {
    return this.formResponsable.get('docentes') as FormArray;
  }

  get estudiantesArray(): FormArray {
    return this.formResponsable.get('estudiantes') as FormArray;
  }

  get administrativosArray(): FormArray {
    return this.formResponsable.get('administrativos') as FormArray;
  }

  get responsablesExternosArray(): FormArray {
    return this.formResponsable.get('responsablesExternos') as FormArray;
  }

  crearUsuarioFormGroup(): FormGroup {
    const formGroup = this.fb.group({
      idUsuario: [null, Validators.required],
      idRolResponsable: [null, Validators.required]
    });
    // Forzar reset para asegurar que esté completamente limpio
    formGroup.reset({ 
      idUsuario: null, 
      idRolResponsable: null 
    }, { emitEvent: false });
    return formGroup;
  }

  crearPersonaFormGroup(tipo: 'docente' | 'estudiante' | 'administrativo'): FormGroup {
    const idRolResponsableValidators = tipo === 'estudiante' ? [Validators.required] : [];
    
    return this.fb.group({
      idPersona: [null, Validators.required],
      idRolResponsable: [null, idRolResponsableValidators]
    });
  }

  crearResponsableExternoFormGroup(): FormGroup {
    const formGroup = this.fb.group({
      idResponsableExterno: [null], // Para seleccionar existente
      esNuevo: [true], // Indica si es nuevo o existente
      nombre: ['', [Validators.required]],
      institucion: ['', [Validators.required]],
      cargo: [''],
      telefono: [''],
      correo: [''],
      idRolResponsable: [null, Validators.required]
    }, {
      validators: this.validarContactoExterno.bind(this)
    });
    // Forzar reset para asegurar que esté completamente limpio
    formGroup.reset({ 
      idResponsableExterno: null,
      esNuevo: true,
      nombre: '', 
      institucion: '', 
      cargo: '', 
      telefono: '', 
      correo: '', 
      idRolResponsable: null 
    }, { emitEvent: false });
    return formGroup;
  }

  // Validador personalizado: al menos teléfono o correo debe estar presente si es nuevo
  validarContactoExterno(formGroup: FormGroup): ValidationErrors | null {
    const esNuevo = formGroup.get('esNuevo')?.value;
    if (!esNuevo) {
      // Si es existente, no validar contacto
      return null;
    }
    
    const telefono = formGroup.get('telefono')?.value;
    const correo = formGroup.get('correo')?.value;
    
    if (!telefono && !correo) {
      return { contactoRequerido: true };
    }
    
    return null;
  }

  agregarPersona(tipo: 'usuario' | 'docente' | 'estudiante' | 'administrativo'): void {
    if (tipo === 'usuario') {
      // Agregar al inicio para que aparezca arriba
      this.usuariosArray.insert(0, this.crearUsuarioFormGroup());
    } else {
      const array = tipo === 'docente' ? this.docentesArray : 
                    tipo === 'estudiante' ? this.estudiantesArray : 
                    this.administrativosArray;
      // Agregar al inicio para que aparezca arriba
      array.insert(0, this.crearPersonaFormGroup(tipo));
    }
  }

  eliminarPersona(tipo: 'usuario' | 'docente' | 'estudiante' | 'administrativo', index: number): void {
    if (tipo === 'usuario') {
      this.usuariosArray.removeAt(index);
    } else {
      const array = tipo === 'docente' ? this.docentesArray : 
                    tipo === 'estudiante' ? this.estudiantesArray : 
                    this.administrativosArray;
      array.removeAt(index);
    }
  }

  agregarResponsableExterno(): void {
    // Agregar al principio del array para que aparezca arriba
    const formGroup = this.crearResponsableExternoFormGroup();
    this.responsablesExternosArray.insert(0, formGroup);
    
    // Hacer scroll a la sección después de un pequeño delay
    setTimeout(() => {
      this.scrollToSeccionResponsable('externo');
      setTimeout(() => {
        const elemento = document.getElementById('seccion-externos');
        if (elemento) {
          const primerFormulario = elemento.querySelector('[formGroupName="0"]') as HTMLElement;
          if (primerFormulario) {
            primerFormulario.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 50);
    }, 100);
  }

  eliminarResponsableExterno(index: number): void {
    this.responsablesExternosArray.removeAt(index);
  }

  getPersonasDisponiblesPorTipo(tipo: 'usuario' | 'docente' | 'estudiante' | 'administrativo'): any[] {
    if (tipo === 'usuario') {
      return this.usuarios();
    } else if (tipo === 'docente') {
      return this.docentes();
    } else if (tipo === 'estudiante') {
      return this.estudiantes();
    } else {
      return this.administrativos();
    }
  }

  getNombrePersona(persona: any): string {
    return persona.nombreCompleto || persona.nombre || 'Sin nombre';
  }

  loadTodasLasPersonas(): void {
    this.usuariosService.getAll().subscribe({
      next: (data) => this.usuarios.set(data),
      error: (err) => {
        console.error('Error loading usuarios:', err);
        this.usuarios.set([]);
      }
    });
    
    this.personasService.listDocentes().subscribe({
      next: (data) => this.docentes.set(data),
      error: (err) => {
        console.error('Error loading docentes:', err);
        this.docentes.set([]);
      }
    });
    
    this.personasService.listEstudiantes().subscribe({
      next: (data) => this.estudiantes.set(data),
      error: (err) => {
        // El error 500 indica un problema en el backend (columnas faltantes en BD)
        // El formulario puede continuar funcionando sin estudiantes
        if (err.status === 500) {
          console.warn('⚠️ No se pudieron cargar estudiantes debido a un error en el backend. El formulario continuará funcionando.');
        } else {
          console.error('Error loading estudiantes:', err);
        }
        this.estudiantes.set([]);
      }
    });
    
    this.personasService.listAdministrativos().subscribe({
      next: (data) => this.administrativos.set(data),
      error: (err) => {
        console.error('Error loading administrativos:', err);
        this.administrativos.set([]);
      }
    });
    
    this.personasService.listResponsablesExternos().subscribe({
      next: (data) => this.responsablesExternos.set(data),
      error: (err) => {
        console.error('Error loading responsables externos:', err);
        this.responsablesExternos.set([]);
      }
    });
    
    this.catalogosService.getRolesResponsable().subscribe({
      next: (data) => this.rolesResponsable.set(data || []),
      error: (err) => {
        console.warn('⚠️ No se pudo cargar roles de responsable:', err);
        this.rolesResponsable.set([]);
      }
    });
  }

  loadResponsablesExternos(): void {
    this.personasService.listResponsablesExternos().subscribe({
      next: (data) => this.responsablesExternos.set(data),
      error: (err) => {
        console.error('Error loading responsables externos:', err);
        this.responsablesExternos.set([]);
      }
    });
  }

  toggleTipoResponsable(tipo: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    const current = this.tiposResponsableSeleccionados();
    const ordenActual = this.ordenTiposResponsables();
    
    if (checked) {
      // Agregar el tipo a la lista de seleccionados
      this.tiposResponsableSeleccionados.set([...current, tipo]);
      
      // Mover el tipo al principio del orden (más reciente primero)
      const nuevoOrden = [tipo, ...ordenActual.filter(t => t !== tipo)];
      this.ordenTiposResponsables.set(nuevoOrden);
      
      // Hacer scroll a la sección del tipo seleccionado después de un pequeño delay para que el DOM se actualice
      setTimeout(() => {
        this.scrollToSeccionResponsable(tipo);
      }, 150);
    } else {
      this.tiposResponsableSeleccionados.set(current.filter(t => t !== tipo));
      this.ordenTiposResponsables.set(ordenActual.filter(t => t !== tipo));
      this.limpiarResponsablesPorTipo(tipo);
    }
  }

  scrollToSeccionResponsable(tipo: string): void {
    const seccionId = `seccion-${tipo}`;
    const elemento = document.getElementById(seccionId);
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Métodos para fechas
  getAnioVigente(): number {
    return new Date().getFullYear();
  }

  getMesVigente(): number {
    return new Date().getMonth(); // 0-11
  }

  getDiaVigente(): number {
    return new Date().getDate(); // 1-31
  }

  getNombreMes(mes: number): string {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return meses[mes] || '';
  }

  getAnioFechaInicio(): number | null {
    const fechaInicio = this.form.get('fechaInicio')?.value;
    if (!fechaInicio) return null;
    const [year] = fechaInicio.split('-').map(Number);
    return year || null;
  }

  getMesFechaInicio(): number | null {
    const fechaInicio = this.form.get('fechaInicio')?.value;
    if (!fechaInicio) return null;
    const [, month] = fechaInicio.split('-').map(Number);
    return month ? month - 1 : null; // Convertir de 1-12 a 0-11 para getNombreMes
  }

  getMesFechaInicioNumero(): number | null {
    const fechaInicio = this.form.get('fechaInicio')?.value;
    if (!fechaInicio) return null;
    const [, month] = fechaInicio.split('-').map(Number);
    return month || null; // Devolver en formato 1-12
  }

  getDiaFechaInicio(): number | null {
    const fechaInicio = this.form.get('fechaInicio')?.value;
    if (!fechaInicio) return null;
    const [, , day] = fechaInicio.split('-').map(Number);
    return day || null;
  }

  getAnioFechaFin(): number | null {
    const fechaFin = this.form.get('fechaFin')?.value;
    if (!fechaFin) return null;
    const [year] = fechaFin.split('-').map(Number);
    return year || null;
  }

  getMesFechaFin(): number | null {
    const fechaFin = this.form.get('fechaFin')?.value;
    if (!fechaFin) return null;
    const [, month] = fechaFin.split('-').map(Number);
    return month ? month - 1 : null; // Convertir de 1-12 a 0-11 para getNombreMes
  }

  getMesFechaFinNumero(): number | null {
    const fechaFin = this.form.get('fechaFin')?.value;
    if (!fechaFin) return null;
    const [, month] = fechaFin.split('-').map(Number);
    return month || null; // Devolver en formato 1-12
  }

  getDiaFechaFin(): number | null {
    const fechaFin = this.form.get('fechaFin')?.value;
    if (!fechaFin) return null;
    const [, , day] = fechaFin.split('-').map(Number);
    return day || null;
  }

  // Métodos para indicador
  tieneIndicadorSeleccionado(): boolean {
    return !!this.indicadorSeleccionado();
  }

  eliminarIndicador(): void {
    console.log('🗑️ Eliminando indicador y limpiando actividades relacionadas...');
    // Limpiar el indicador del formulario
    this.form.patchValue({ 
      idIndicador: null,
      idActividadAnual: [],
      idActividadMensualInst: []
    });
    // Limpiar el indicador seleccionado
    this.indicadorSeleccionado.set(null);
    // Limpiar los arrays de actividades filtradas
    this.actividadesAnualesFiltradas.set([]);
    this.actividadesMensualesFiltradas.set([]);
    // Limpiar la búsqueda
    this.terminoBusquedaIndicador.set('');
    // Colapsar la sección de planificación si no hay indicador
    this.seccionPlanificacionExpandida.set(false);
    console.log('✅ Indicador eliminado y actividades relacionadas limpiadas');
  }

  actualizarBusquedaIndicador(valor: string): void {
    this.terminoBusquedaIndicador.set(valor);
  }

  limpiarBusquedaIndicador(): void {
    this.terminoBusquedaIndicador.set('');
  }

  getIndicadoresFiltrados(): Indicador[] {
    const termino = this.terminoBusquedaIndicador().toLowerCase().trim();
    if (!termino) {
      return this.indicadores();
    }
    return this.indicadores().filter(indicador => {
      const codigo = (indicador.codigo || '').toLowerCase();
      const nombre = (indicador.nombre || '').toLowerCase();
      return codigo.includes(termino) || nombre.includes(termino);
    });
  }

  toggleIndicador(idIndicador: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.form.patchValue({ idIndicador: idIndicador });
      const indicador = this.indicadores().find(ind => ind.idIndicador === idIndicador);
      this.indicadorSeleccionado.set(indicador || null);
      this.mostrarDropdownIndicador.set(false);
      
      console.log('📊 Indicador seleccionado:', idIndicador);
      // Expandir automáticamente la sección de planificación cuando se selecciona un indicador
      this.seccionPlanificacionExpandida.set(true);
      console.log('✅ Sección de planificación expandida:', this.seccionPlanificacionExpandida());
      // No cerrar las otras secciones - permitir que todas estén abiertas simultáneamente
      
      // Forzar detección de cambios para asegurar que la UI se actualice
      this.cdr.detectChanges();
      
      // Cargar actividades anuales para este indicador y abrir el dropdown automáticamente
      this.cargarActividadesPorIndicador(idIndicador, false);
      // Abrir el dropdown de actividades anuales automáticamente cuando se carguen los datos
      setTimeout(() => {
        this.mostrarDropdownActividadAnual.set(true);
        // Asegurar que la sección siga expandida
        if (!this.seccionPlanificacionExpandida()) {
          console.log('⚠️ Sección se cerró después de cargar, reabriendo...');
          this.seccionPlanificacionExpandida.set(true);
        }
        // Forzar detección de cambios nuevamente después de cargar
        this.cdr.detectChanges();
      }, 500);
    }
  }

  // Métodos para tipos de evidencia
  toggleTipoEvidencia(id: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    const currentValue = this.form.get('idTipoEvidencias')?.value || [];
    let newValue: number[];
    
    if (checked) {
      newValue = [...currentValue, id];
      this.mostrarDropdownTipoEvidencia.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownTipoEvidencia.set(true);
      }
    }
    
    this.form.patchValue({ idTipoEvidencias: newValue });
  }

  eliminarTipoEvidencia(id: number): void {
    const currentValue = this.form.get('idTipoEvidencias')?.value || [];
    const newValue = currentValue.filter((item: number) => item !== id);
    this.form.patchValue({ idTipoEvidencias: newValue });
    
    if (newValue.length === 0) {
      this.mostrarDropdownTipoEvidencia.set(true);
    }
  }

  getTiposEvidenciaSeleccionados(): any[] {
    const idsSeleccionados = this.form.get('idTipoEvidencias')?.value || [];
    return this.tiposEvidencia().filter(tipo => idsSeleccionados.includes(tipo.idTipoEvidencia || tipo.id));
  }

  abrirDropdownTipoEvidencia(): void {
    this.mostrarDropdownTipoEvidencia.set(true);
  }

  isTipoEvidenciaSelected(id: number): boolean {
    const currentValue = this.form.get('idTipoEvidencias')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  loadTiposEvidencia(): void {
    this.catalogosService.getTiposEvidencia().subscribe({
      next: (data) => this.tiposEvidencia.set(data),
      error: (err) => console.error('Error loading tipos evidencia:', err)
    });
  }

  // Métodos para responsables - filtrado
  getUsuariosFiltrados(index: number): Usuario[] {
    const termino = (this.terminoBusquedaUsuario()[index] || '').toLowerCase();
    if (!termino) return this.usuarios();
    return this.usuarios().filter(u => {
      const nombre = (u.nombreCompleto || '').toLowerCase();
      return nombre.includes(termino);
    });
  }

  getDocentesFiltrados(index: number): Docente[] {
    const termino = (this.terminoBusquedaDocente()[index] || '').toLowerCase();
    if (!termino) return this.docentes();
    return this.docentes().filter(d => {
      const nombre = this.getNombrePersona(d).toLowerCase();
      return nombre.includes(termino);
    });
  }

  getEstudiantesFiltrados(index: number): Estudiante[] {
    const termino = (this.terminoBusquedaEstudiante()[index] || '').toLowerCase();
    if (!termino) return this.estudiantes();
    return this.estudiantes().filter(e => {
      const nombre = this.getNombrePersona(e).toLowerCase();
      return nombre.includes(termino);
    });
  }

  getAdministrativosFiltrados(index: number): Administrativo[] {
    const termino = (this.terminoBusquedaAdministrativo()[index] || '').toLowerCase();
    if (!termino) return this.administrativos();
    return this.administrativos().filter(a => {
      const nombre = this.getNombrePersona(a).toLowerCase();
      return nombre.includes(termino);
    });
  }

  getResponsablesExternosFiltrados(index: number): any[] {
    const termino = (this.terminoBusquedaExterno()[index] || '').toLowerCase();
    if (!termino) return this.responsablesExternos();
    return this.responsablesExternos().filter(r => {
      const nombre = (r.nombre || '').toLowerCase();
      const institucion = (r.institucion || '').toLowerCase();
      return nombre.includes(termino) || institucion.includes(termino);
    });
  }

  // Métodos para responsables externos
  seleccionarResponsableExternoExistente(control: AbstractControl, id: number): void {
    const formGroup = control as FormGroup;
    const responsable = this.responsablesExternos().find(r => r.id === id);
    if (responsable) {
      formGroup.patchValue({
        idResponsableExterno: responsable.id,
        esNuevo: false,
        nombre: responsable.nombre,
        institucion: responsable.institucion,
        cargo: responsable.cargo || '',
        telefono: responsable.telefono || '',
        correo: responsable.correo || ''
      });
      const index = this.responsablesExternosArray.controls.indexOf(control);
      this.mostrarDropdownExterno.set({ ...this.mostrarDropdownExterno(), [index]: false });
    }
  }

  cambiarANuevoResponsableExterno(control: AbstractControl): void {
    const formGroup = control as FormGroup;
    formGroup.patchValue({
      idResponsableExterno: null,
      esNuevo: true,
      nombre: '',
      institucion: '',
      cargo: '',
      telefono: '',
      correo: ''
    }, { emitEvent: false });
  }

  esResponsableExternoNuevo(control: AbstractControl): boolean {
    const formGroup = control as FormGroup;
    return formGroup.get('esNuevo')?.value === true;
  }

  // Métodos para selección múltiple
  toggleSeleccionMultiple(tipo: string): void {
    const current = this.mostrarSeleccionMultiple();
    this.mostrarSeleccionMultiple.set({ ...current, [tipo]: !current[tipo] });
    if (!current[tipo]) {
      // Al abrir, limpiar selecciones anteriores
      this.personasSeleccionadas.set({ ...this.personasSeleccionadas(), [tipo]: [] });
      this.rolSeleccionadoMultiple.set({ ...this.rolSeleccionadoMultiple(), [tipo]: null });
      this.terminoBusquedaMultiple.set({ ...this.terminoBusquedaMultiple(), [tipo]: '' });
    }
  }

  getPersonasDisponiblesParaSeleccionMultiple(tipo: string): any[] {
    const termino = (this.terminoBusquedaMultiple()[tipo] || '').toLowerCase();
    let personas: any[] = [];
    
    if (tipo === 'usuario') {
      personas = this.usuarios();
    } else if (tipo === 'docente') {
      personas = this.docentes();
    } else if (tipo === 'estudiante') {
      personas = this.estudiantes();
    } else if (tipo === 'administrativo') {
      personas = this.administrativos();
    }
    
    if (!termino) return personas;
    
    return personas.filter(p => {
      const nombre = this.getNombrePersona(p).toLowerCase();
      return nombre.includes(termino);
    });
  }

  togglePersonaSeleccionada(tipo: string, id: number): void {
    const current = this.personasSeleccionadas();
    const seleccionadas = current[tipo] || [];
    const index = seleccionadas.indexOf(id);
    
    if (index > -1) {
      // Deseleccionar
      seleccionadas.splice(index, 1);
    } else {
      // Seleccionar
      seleccionadas.push(id);
    }
    
    this.personasSeleccionadas.set({ ...current, [tipo]: seleccionadas });
  }

  isPersonaSeleccionada(tipo: string, id: number): boolean {
    const seleccionadas = this.personasSeleccionadas()[tipo] || [];
    return seleccionadas.includes(id);
  }

  agregarPersonasSeleccionadas(tipo: string): void {
    const seleccionadas = this.personasSeleccionadas()[tipo] || [];
    const rolId = this.rolSeleccionadoMultiple()[tipo];
    
    if (seleccionadas.length === 0) {
      this.alertService.warning('Por favor selecciona al menos una persona');
      return;
    }
    
    if (tipo === 'estudiante' && !rolId) {
      this.alertService.warning('Por favor selecciona un rol para los estudiantes');
      return;
    }
    
    // Agregar todas las personas seleccionadas
    seleccionadas.forEach(id => {
      if (tipo === 'usuario') {
        const formGroup = this.crearUsuarioFormGroup();
        formGroup.patchValue({ idUsuario: id, idRolResponsable: rolId });
        this.usuariosArray.insert(0, formGroup);
      } else {
        const formGroup = this.crearPersonaFormGroup(tipo as 'docente' | 'estudiante' | 'administrativo');
        formGroup.patchValue({ idPersona: id, idRolResponsable: rolId });
        const array = tipo === 'docente' ? this.docentesArray : 
                      tipo === 'estudiante' ? this.estudiantesArray : 
                      this.administrativosArray;
        array.insert(0, formGroup);
      }
    });
    
    // Cerrar la vista de selección múltiple y limpiar
    this.mostrarSeleccionMultiple.set({ ...this.mostrarSeleccionMultiple(), [tipo]: false });
    this.personasSeleccionadas.set({ ...this.personasSeleccionadas(), [tipo]: [] });
    this.rolSeleccionadoMultiple.set({ ...this.rolSeleccionadoMultiple(), [tipo]: null });
    this.terminoBusquedaMultiple.set({ ...this.terminoBusquedaMultiple(), [tipo]: '' });
    
    // Hacer scroll a la sección
    setTimeout(() => {
      this.scrollToSeccionResponsable(tipo);
    }, 100);
  }

  actualizarBusquedaMultiple(tipo: string, valor: string): void {
    this.terminoBusquedaMultiple.set({ ...this.terminoBusquedaMultiple(), [tipo]: valor });
  }

  limpiarBusquedaMultiple(tipo: string): void {
    this.terminoBusquedaMultiple.set({ ...this.terminoBusquedaMultiple(), [tipo]: '' });
  }

  getCantidadSeleccionadas(tipo: string): number {
    return (this.personasSeleccionadas()[tipo] || []).length;
  }

  actualizarRolSeleccionadoMultiple(tipo: string, valor: string): void {
    const rolId = valor ? +valor : null;
    this.rolSeleccionadoMultiple.set({ ...this.rolSeleccionadoMultiple(), [tipo]: rolId });
  }

  // Métodos para dropdowns de responsables
  toggleDropdownUsuario(index: number): void {
    const current = this.mostrarDropdownUsuario();
    this.mostrarDropdownUsuario.set({ ...current, [index]: !current[index] });
  }

  toggleDropdownDocente(index: number): void {
    const current = this.mostrarDropdownDocente();
    this.mostrarDropdownDocente.set({ ...current, [index]: !current[index] });
  }

  toggleDropdownEstudiante(index: number): void {
    const current = this.mostrarDropdownEstudiante();
    this.mostrarDropdownEstudiante.set({ ...current, [index]: !current[index] });
  }

  toggleDropdownAdministrativo(index: number): void {
    const current = this.mostrarDropdownAdministrativo();
    this.mostrarDropdownAdministrativo.set({ ...current, [index]: !current[index] });
  }

  toggleDropdownExterno(index: number): void {
    const current = this.mostrarDropdownExterno();
    this.mostrarDropdownExterno.set({ ...current, [index]: !current[index] });
  }

  seleccionarUsuario(control: AbstractControl, id: number | string): void {
    const formGroup = control as FormGroup;
    formGroup.patchValue({ idUsuario: id });
    const index = this.usuariosArray.controls.indexOf(control);
    this.mostrarDropdownUsuario.set({ ...this.mostrarDropdownUsuario(), [index]: false });
  }

  seleccionarPersona(control: AbstractControl, tipo: 'docente' | 'estudiante' | 'administrativo', id: number): void {
    const formGroup = control as FormGroup;
    formGroup.patchValue({ idPersona: id });
    let index = -1;
    if (tipo === 'docente') {
      index = this.docentesArray.controls.indexOf(control);
      this.mostrarDropdownDocente.set({ ...this.mostrarDropdownDocente(), [index]: false });
    } else if (tipo === 'estudiante') {
      index = this.estudiantesArray.controls.indexOf(control);
      this.mostrarDropdownEstudiante.set({ ...this.mostrarDropdownEstudiante(), [index]: false });
    } else {
      index = this.administrativosArray.controls.indexOf(control);
      this.mostrarDropdownAdministrativo.set({ ...this.mostrarDropdownAdministrativo(), [index]: false });
    }
  }

  getUsuarioSeleccionado(control: AbstractControl): Usuario | null {
    const formGroup = control as FormGroup;
    const id = formGroup.get('idUsuario')?.value;
    if (!id) return null;
    return this.usuarios().find(u => (u.id || u.idUsuario) === id) || null;
  }

  getPersonaSeleccionada(control: AbstractControl, tipo: 'docente' | 'estudiante' | 'administrativo'): any {
    const formGroup = control as FormGroup;
    const id = formGroup.get('idPersona')?.value;
    if (!id) return null;
    if (tipo === 'docente') {
      return this.docentes().find(d => d.id === id) || null;
    } else if (tipo === 'estudiante') {
      return this.estudiantes().find(e => e.id === id) || null;
    } else {
      return this.administrativos().find(a => a.id === id) || null;
    }
  }

  getResponsableExternoSeleccionado(control: AbstractControl): any {
    const formGroup = control as FormGroup;
    const id = formGroup.get('idResponsableExterno')?.value;
    if (!id) return null;
    return this.responsablesExternos().find(r => r.id === id) || null;
  }

  actualizarBusquedaUsuario(index: number, valor: string): void {
    this.terminoBusquedaUsuario.set({ ...this.terminoBusquedaUsuario(), [index]: valor });
  }

  limpiarBusquedaUsuario(index: number): void {
    this.terminoBusquedaUsuario.set({ ...this.terminoBusquedaUsuario(), [index]: '' });
  }

  actualizarBusquedaDocente(index: number, valor: string): void {
    this.terminoBusquedaDocente.set({ ...this.terminoBusquedaDocente(), [index]: valor });
  }

  limpiarBusquedaDocente(index: number): void {
    this.terminoBusquedaDocente.set({ ...this.terminoBusquedaDocente(), [index]: '' });
  }

  actualizarBusquedaEstudiante(index: number, valor: string): void {
    this.terminoBusquedaEstudiante.set({ ...this.terminoBusquedaEstudiante(), [index]: valor });
  }

  limpiarBusquedaEstudiante(index: number): void {
    this.terminoBusquedaEstudiante.set({ ...this.terminoBusquedaEstudiante(), [index]: '' });
  }

  actualizarBusquedaAdministrativo(index: number, valor: string): void {
    this.terminoBusquedaAdministrativo.set({ ...this.terminoBusquedaAdministrativo(), [index]: valor });
  }

  limpiarBusquedaAdministrativo(index: number): void {
    this.terminoBusquedaAdministrativo.set({ ...this.terminoBusquedaAdministrativo(), [index]: '' });
  }

  actualizarBusquedaExterno(index: number, valor: string): void {
    this.terminoBusquedaExterno.set({ ...this.terminoBusquedaExterno(), [index]: valor });
  }

  limpiarBusquedaExterno(index: number): void {
    this.terminoBusquedaExterno.set({ ...this.terminoBusquedaExterno(), [index]: '' });
  }

  isTipoResponsableSeleccionado(tipo: string): boolean {
    return this.tiposResponsableSeleccionados().includes(tipo);
  }

  limpiarResponsablesPorTipo(tipo: string): void {
    if (tipo === 'usuario') {
      while (this.usuariosArray.length > 0) {
        this.usuariosArray.removeAt(0);
      }
    } else if (tipo === 'docente') {
      while (this.docentesArray.length > 0) {
        this.docentesArray.removeAt(0);
      }
    } else if (tipo === 'estudiante') {
      while (this.estudiantesArray.length > 0) {
        this.estudiantesArray.removeAt(0);
      }
    } else if (tipo === 'administrativo') {
      while (this.administrativosArray.length > 0) {
        this.administrativosArray.removeAt(0);
      }
    } else if (tipo === 'externo') {
      while (this.responsablesExternosArray.length > 0) {
        this.responsablesExternosArray.removeAt(0);
      }
    }
  }

  tieneAlMenosUnTipoResponsable(): boolean {
    return this.tiposResponsableSeleccionados().length > 0;
  }

  tieneAlMenosUnResponsable(): boolean {
    const tiposSeleccionados = this.tiposResponsableSeleccionados();
    if (tiposSeleccionados.length === 0) return false;

    for (const tipo of tiposSeleccionados) {
      if (tipo === 'usuario') {
        if (this.usuariosArray.length === 0) return false;
        for (let i = 0; i < this.usuariosArray.length; i++) {
          const control = this.usuariosArray.at(i);
          if (!control.get('idUsuario')?.value) return false;
        }
      } else if (tipo === 'docente') {
        if (this.docentesArray.length === 0) return false;
        for (let i = 0; i < this.docentesArray.length; i++) {
          const control = this.docentesArray.at(i);
          if (!control.get('idPersona')?.value) return false;
        }
      } else if (tipo === 'estudiante') {
        if (this.estudiantesArray.length === 0) return false;
        for (let i = 0; i < this.estudiantesArray.length; i++) {
          const control = this.estudiantesArray.at(i);
          if (!control.get('idPersona')?.value || !control.get('idRolResponsable')?.value) return false;
        }
      } else if (tipo === 'administrativo') {
        if (this.administrativosArray.length === 0) return false;
        for (let i = 0; i < this.administrativosArray.length; i++) {
          const control = this.administrativosArray.at(i);
          if (!control.get('idPersona')?.value) return false;
        }
      } else if (tipo === 'externo') {
        if (this.responsablesExternosArray.length === 0) return false;
        for (let i = 0; i < this.responsablesExternosArray.length; i++) {
          const control = this.responsablesExternosArray.at(i);
          if (!control.get('nombre')?.value || !control.get('institucion')?.value || !control.get('idRolResponsable')?.value) return false;
        }
      }
    }
    return true;
  }

  /**
   * Construye el array de responsables en el formato que espera el backend
   * El backend espera un array de objetos con idUsuario, idDocente, idEstudiante, idAdmin, idRolResponsable, etc.
   */
  private construirResponsables(formValue: any): ResponsableCreate[] {
    const responsables: ResponsableCreate[] = [];

    // Agregar usuarios
    this.usuariosArray.controls.forEach((control) => {
      const idUsuario = control.get('idUsuario')?.value;
      const idRolResponsable = control.get('idRolResponsable')?.value;
      if (idUsuario) {
        responsables.push({
          idUsuario: Number(idUsuario),
          idRolResponsable: idRolResponsable ? Number(idRolResponsable) : undefined
        });
      }
    });

    // Agregar docentes
    this.docentesArray.controls.forEach((control) => {
      const idDocente = control.get('idPersona')?.value;
      const idRolResponsable = control.get('idRolResponsable')?.value;
      if (idDocente) {
        responsables.push({
          idDocente: Number(idDocente),
          idRolResponsable: idRolResponsable ? Number(idRolResponsable) : undefined
        });
      }
    });

    // Agregar estudiantes
    this.estudiantesArray.controls.forEach((control) => {
      const idEstudiante = control.get('idPersona')?.value;
      const idRolResponsable = control.get('idRolResponsable')?.value;
      if (idEstudiante && idRolResponsable) {
        responsables.push({
          idEstudiante: Number(idEstudiante),
          idRolResponsable: Number(idRolResponsable)
        });
      }
    });

    // Agregar administrativos
    this.administrativosArray.controls.forEach((control) => {
      const idAdmin = control.get('idPersona')?.value;
      const idRolResponsable = control.get('idRolResponsable')?.value;
      if (idAdmin) {
        responsables.push({
          idAdmin: Number(idAdmin),
          idRolResponsable: idRolResponsable ? Number(idRolResponsable) : undefined
        });
      }
    });

    // Agregar responsables externos
    this.responsablesExternosArray.controls.forEach((control) => {
      const esNuevo = control.get('esNuevo')?.value;
      const idResponsableExterno = control.get('idResponsableExterno')?.value;
      const idRolResponsable = control.get('idRolResponsable')?.value;
      
      if (esNuevo) {
        // Responsable externo nuevo
        const nombre = control.get('nombre')?.value;
        const institucion = control.get('institucion')?.value;
        const cargo = control.get('cargo')?.value;
        const telefono = control.get('telefono')?.value;
        const correo = control.get('correo')?.value;
        
        if (nombre && institucion && idRolResponsable) {
          responsables.push({
            responsableExterno: {
              nombre: String(nombre),
              institucion: String(institucion),
              cargo: cargo ? String(cargo) : undefined,
              telefono: telefono ? String(telefono) : undefined,
              correo: correo ? String(correo) : undefined
            },
            idRolResponsable: Number(idRolResponsable)
          });
        }
      } else if (idResponsableExterno && idRolResponsable) {
        // Responsable externo existente
        responsables.push({
          idResponsableExterno: Number(idResponsableExterno),
          idRolResponsable: Number(idRolResponsable)
        });
      }
    });

    return responsables;
  }

  getNombreRolResponsable(idRolResponsable: number): string | undefined {
    const rol = this.rolesResponsable().find(r => (r.id || r.idRolResponsable) === idRolResponsable);
    return rol?.nombre || undefined;
  }

  private cargandoResponsables = false;
  private ultimaActividadCargada: number | null = null;

  loadResponsablesDeActividad(idActividad: number): void {
    // Evitar cargar múltiples veces la misma actividad
    if (this.cargandoResponsables && this.ultimaActividadCargada === idActividad) {
      console.log('⏭️ Ya se están cargando responsables para esta actividad, omitiendo...');
      return;
    }

    console.log('🔄 Cargando responsables de la actividad:', idActividad);
    this.cargandoResponsables = true;
    this.ultimaActividadCargada = idActividad;
    
    // Limpiar arrays existentes PRIMERO, antes de hacer la petición
    while (this.usuariosArray.length > 0) this.usuariosArray.removeAt(0);
    while (this.docentesArray.length > 0) this.docentesArray.removeAt(0);
    while (this.estudiantesArray.length > 0) this.estudiantesArray.removeAt(0);
    while (this.administrativosArray.length > 0) this.administrativosArray.removeAt(0);
    while (this.responsablesExternosArray.length > 0) this.responsablesExternosArray.removeAt(0);
    this.tiposResponsableSeleccionados.set([]);
    this.ordenTiposResponsables.set([]);
    
    this.responsableService.getByActividad(idActividad).subscribe({
      next: (responsables) => {
        console.log('👥 Responsables recibidos del backend:', responsables);
        if (responsables && responsables.length > 0) {
          // Esperar un momento para asegurar que las listas de personas estén cargadas
          setTimeout(() => {
            // Verificar nuevamente que los arrays estén limpios antes de agregar
            if (this.usuariosArray.length > 0 || this.docentesArray.length > 0 || 
                this.estudiantesArray.length > 0 || this.administrativosArray.length > 0 || 
                this.responsablesExternosArray.length > 0) {
              console.warn('⚠️ Los arrays no están limpios, limpiando nuevamente...');
              while (this.usuariosArray.length > 0) this.usuariosArray.removeAt(0);
              while (this.docentesArray.length > 0) this.docentesArray.removeAt(0);
              while (this.estudiantesArray.length > 0) this.estudiantesArray.removeAt(0);
              while (this.administrativosArray.length > 0) this.administrativosArray.removeAt(0);
              while (this.responsablesExternosArray.length > 0) this.responsablesExternosArray.removeAt(0);
            }

            // Agrupar responsables por tipo para evitar duplicados
            const usuariosUnicos = new Set<number>();
            const docentesUnicos = new Set<number>();
            const estudiantesUnicos = new Set<number>();
            const administrativosUnicos = new Set<number>();
            const externosUnicos = new Set<number>();

            responsables.forEach((responsable) => {
              console.log('👤 Procesando responsable:', responsable);
              console.log('🔍 Campos del responsable:', {
                idUsuario: responsable.idUsuario,
                idDocente: responsable.idDocente,
                idEstudiante: responsable.idEstudiante,
                idAdmin: responsable.idAdmin,
                idRolResponsable: responsable.idRolResponsable,
                nombreRolResponsable: responsable.nombreRolResponsable,
                rolResponsable: responsable.rolResponsable
              });
              
              if (responsable.idUsuario) {
                // Es un usuario - verificar que no esté duplicado
                if (usuariosUnicos.has(responsable.idUsuario)) {
                  console.warn('⚠️ Usuario duplicado detectado, omitiendo:', responsable.idUsuario);
                  return;
                }
                usuariosUnicos.add(responsable.idUsuario);
                
                if (!this.tiposResponsableSeleccionados().includes('usuario')) {
                  this.tiposResponsableSeleccionados.set([...this.tiposResponsableSeleccionados(), 'usuario']);
                  this.ordenTiposResponsables.set([...this.ordenTiposResponsables(), 'usuario']);
                }
                // Crear el FormGroup directamente en lugar de usar agregarPersona para evitar problemas de índice
                const usuarioFormGroup = this.crearUsuarioFormGroup();
                
                // Asegurar que idRolResponsable se mapee correctamente
                // Verificar múltiples campos posibles del backend
                let idRolResponsable: number | null = null;
                if (responsable.idRolResponsable !== undefined && responsable.idRolResponsable !== null) {
                  idRolResponsable = Number(responsable.idRolResponsable);
                } else if (responsable.nombreRolResponsable) {
                  // Si solo tenemos el nombre, intentar encontrar el ID en la lista de roles
                  const rolEncontrado = this.rolesResponsable().find(r => 
                    r.nombre?.toLowerCase() === responsable.nombreRolResponsable?.toLowerCase() ||
                    r.nombre === responsable.nombreRolResponsable
                  );
                  if (rolEncontrado) {
                    idRolResponsable = rolEncontrado.id || rolEncontrado.idRolResponsable || null;
                  }
                }
                
                console.log('🔍 [Usuario] Mapeo de rol:', {
                  idRolResponsableOriginal: responsable.idRolResponsable,
                  nombreRolResponsable: responsable.nombreRolResponsable,
                  rolResponsable: responsable.rolResponsable,
                  idRolResponsableFinal: idRolResponsable
                });
                
                usuarioFormGroup.patchValue({
                  idUsuario: responsable.idUsuario,
                  idRolResponsable: idRolResponsable
                }, { emitEvent: false });
                this.usuariosArray.push(usuarioFormGroup);
                console.log('✅ Usuario agregado:', responsable.idUsuario, 'Rol ID:', idRolResponsable, 'Rol Nombre:', responsable.nombreRolResponsable || responsable.rolResponsable);
              } else if (responsable.idDocente) {
                // Es un docente - verificar que no esté duplicado
                if (docentesUnicos.has(responsable.idDocente)) {
                  console.warn('⚠️ Docente duplicado detectado, omitiendo:', responsable.idDocente);
                  return;
                }
                docentesUnicos.add(responsable.idDocente);
                
                if (!this.tiposResponsableSeleccionados().includes('docente')) {
                  this.tiposResponsableSeleccionados.set([...this.tiposResponsableSeleccionados(), 'docente']);
                  this.ordenTiposResponsables.set([...this.ordenTiposResponsables(), 'docente']);
                }
                // Crear el FormGroup directamente en lugar de usar agregarPersona para evitar problemas de índice
                const docenteFormGroup = this.crearPersonaFormGroup('docente');
                
                // Asegurar que idRolResponsable se mapee correctamente
                let idRolResponsable: number | null = null;
                if (responsable.idRolResponsable !== undefined && responsable.idRolResponsable !== null) {
                  idRolResponsable = Number(responsable.idRolResponsable);
                } else if (responsable.nombreRolResponsable) {
                  const rolEncontrado = this.rolesResponsable().find(r => 
                    r.nombre?.toLowerCase() === responsable.nombreRolResponsable?.toLowerCase() ||
                    r.nombre === responsable.nombreRolResponsable
                  );
                  if (rolEncontrado) {
                    idRolResponsable = rolEncontrado.id || rolEncontrado.idRolResponsable || null;
                  }
                }
                
                docenteFormGroup.patchValue({
                  idPersona: responsable.idDocente,
                  idRolResponsable: idRolResponsable
                }, { emitEvent: false });
                this.docentesArray.push(docenteFormGroup);
                console.log('✅ Docente agregado:', responsable.idDocente, 'Rol ID:', idRolResponsable, 'Rol Nombre:', responsable.nombreRolResponsable || responsable.rolResponsable);
              } else if (responsable.idEstudiante) {
                // Es un estudiante - verificar que no esté duplicado
                if (estudiantesUnicos.has(responsable.idEstudiante)) {
                  console.warn('⚠️ Estudiante duplicado detectado, omitiendo:', responsable.idEstudiante);
                  return;
                }
                estudiantesUnicos.add(responsable.idEstudiante);
                
                if (!this.tiposResponsableSeleccionados().includes('estudiante')) {
                  this.tiposResponsableSeleccionados.set([...this.tiposResponsableSeleccionados(), 'estudiante']);
                  this.ordenTiposResponsables.set([...this.ordenTiposResponsables(), 'estudiante']);
                }
                // Crear el FormGroup directamente en lugar de usar agregarPersona para evitar problemas de índice
                const estudianteFormGroup = this.crearPersonaFormGroup('estudiante');
                
                // Asegurar que idRolResponsable se mapee correctamente
                let idRolResponsable: number | null = null;
                if (responsable.idRolResponsable !== undefined && responsable.idRolResponsable !== null) {
                  idRolResponsable = Number(responsable.idRolResponsable);
                } else if (responsable.nombreRolResponsable) {
                  const rolEncontrado = this.rolesResponsable().find(r => 
                    r.nombre?.toLowerCase() === responsable.nombreRolResponsable?.toLowerCase() ||
                    r.nombre === responsable.nombreRolResponsable
                  );
                  if (rolEncontrado) {
                    idRolResponsable = rolEncontrado.id || rolEncontrado.idRolResponsable || null;
                  }
                }
                
                estudianteFormGroup.patchValue({
                  idPersona: responsable.idEstudiante,
                  idRolResponsable: idRolResponsable
                }, { emitEvent: false });
                this.estudiantesArray.push(estudianteFormGroup);
                console.log('✅ Estudiante agregado:', responsable.idEstudiante, 'Rol ID:', idRolResponsable, 'Rol Nombre:', responsable.nombreRolResponsable || responsable.rolResponsable);
              } else if (responsable.idAdmin) {
                // Es un administrativo - verificar que no esté duplicado
                if (administrativosUnicos.has(responsable.idAdmin)) {
                  console.warn('⚠️ Administrativo duplicado detectado, omitiendo:', responsable.idAdmin);
                  return;
                }
                administrativosUnicos.add(responsable.idAdmin);
                
                if (!this.tiposResponsableSeleccionados().includes('administrativo')) {
                  this.tiposResponsableSeleccionados.set([...this.tiposResponsableSeleccionados(), 'administrativo']);
                  this.ordenTiposResponsables.set([...this.ordenTiposResponsables(), 'administrativo']);
                }
                // Crear el FormGroup directamente en lugar de usar agregarPersona para evitar problemas de índice
                const adminFormGroup = this.crearPersonaFormGroup('administrativo');
                
                // Asegurar que idRolResponsable se mapee correctamente
                let idRolResponsable: number | null = null;
                if (responsable.idRolResponsable !== undefined && responsable.idRolResponsable !== null) {
                  idRolResponsable = Number(responsable.idRolResponsable);
                } else if (responsable.nombreRolResponsable) {
                  const rolEncontrado = this.rolesResponsable().find(r => 
                    r.nombre?.toLowerCase() === responsable.nombreRolResponsable?.toLowerCase() ||
                    r.nombre === responsable.nombreRolResponsable
                  );
                  if (rolEncontrado) {
                    idRolResponsable = rolEncontrado.id || rolEncontrado.idRolResponsable || null;
                  }
                }
                
                adminFormGroup.patchValue({
                  idPersona: responsable.idAdmin,
                  idRolResponsable: idRolResponsable
                }, { emitEvent: false });
                this.administrativosArray.push(adminFormGroup);
                console.log('✅ Administrativo agregado:', responsable.idAdmin, 'Rol ID:', idRolResponsable, 'Rol Nombre:', responsable.nombreRolResponsable || responsable.rolResponsable);
              } else if (responsable.idResponsableExterno) {
                // Es un responsable externo - verificar que no esté duplicado
                if (externosUnicos.has(responsable.idResponsableExterno)) {
                  console.warn('⚠️ Responsable externo duplicado detectado, omitiendo:', responsable.idResponsableExterno);
                  return;
                }
                externosUnicos.add(responsable.idResponsableExterno);
                
                if (!this.tiposResponsableSeleccionados().includes('externo')) {
                  this.tiposResponsableSeleccionados.set([...this.tiposResponsableSeleccionados(), 'externo']);
                  this.ordenTiposResponsables.set([...this.ordenTiposResponsables(), 'externo']);
                }
                this.agregarResponsableExterno();
                const externoIndex = this.responsablesExternosArray.length - 1;
                setTimeout(() => {
                  if (this.responsablesExternosArray.at(externoIndex)) {
                    this.responsablesExternosArray.at(externoIndex).patchValue({
                      idResponsableExterno: responsable.idResponsableExterno,
                      esNuevo: false,
                      nombre: responsable.nombreResponsableExterno || '',
                      institucion: responsable.institucionResponsableExterno || '',
                      cargo: responsable.cargoResponsableExterno || '',
                      telefono: responsable.telefonoResponsableExterno || '',
                      correo: responsable.correoResponsableExterno || '',
                      idRolResponsable: responsable.idRolResponsable || null
                    }, { emitEvent: false });
                  }
                }, 100);
                console.log('✅ Responsable externo agregado:', responsable.idResponsableExterno, 'Rol:', responsable.idRolResponsable);
              }
            });
            
            console.log('✅ Total de responsables cargados:', responsables.length);
            this.cargandoResponsables = false;
            setTimeout(() => {
              this.cdr.markForCheck(); // Marcar para detección de cambios después de un delay
            }, 300);
          }, 300); // Esperar 300ms para que las listas de personas estén cargadas
        } else {
          console.log('ℹ️ No hay responsables para esta actividad');
          this.cargandoResponsables = false;
        }
      },
      error: (err) => {
        console.error('❌ Error cargando responsables:', err);
        this.cargandoResponsables = false;
      }
    });
  }

  crearResponsablesParaActividad(idActividad: number, onComplete?: () => void): void {
    const responsables: ActividadResponsableCreate[] = [];
    const formValue = this.formResponsable.value;
    const fechaAsignacion = formValue.fechaAsignacion || new Date().toISOString().split('T')[0];

    console.log('🔄 Creando responsables para actividad:', idActividad);
    console.log('📋 FormResponsable value:', formValue);
    console.log('📊 Arrays de responsables en formulario:');
    console.log('  - Usuarios:', this.usuariosArray.length);
    console.log('  - Docentes:', this.docentesArray.length);
    console.log('  - Estudiantes:', this.estudiantesArray.length);
    console.log('  - Administrativos:', this.administrativosArray.length);
    console.log('  - Responsables Externos:', this.responsablesExternosArray.length);

    // Agregar usuarios - solo los que tienen idUsuario válido
    this.usuariosArray.controls.forEach((control, index) => {
      const idUsuario = control.get('idUsuario')?.value;
      const idRolResponsableRaw = control.get('idRolResponsable')?.value;
      
      // Validar que el control tenga idUsuario válido antes de procesar
      if (!idUsuario || idUsuario === null || idUsuario === undefined || Number(idUsuario) <= 0) {
        console.warn(`⚠️ [Usuario ${index}] Omitido porque no tiene idUsuario válido`);
        return; // Continuar con el siguiente
      }
      
      console.log(`🔍 [Usuario ${index}] Valores del formulario:`, {
        idUsuario,
        idRolResponsableRaw,
        tipoIdRolResponsable: typeof idRolResponsableRaw,
        controlValido: control.valid,
        errores: control.errors
      });
      
      // Convertir idRolResponsable a número, manejando strings vacíos y null
      let idRolResponsable: number | undefined = undefined;
      if (idRolResponsableRaw !== null && idRolResponsableRaw !== undefined && idRolResponsableRaw !== '') {
        const numValue = Number(idRolResponsableRaw);
        if (!isNaN(numValue) && numValue > 0) {
          idRolResponsable = numValue;
        }
      }
      
      const nombreRol = idRolResponsable ? this.getNombreRolResponsable(idRolResponsable) : undefined;
      
      const responsableData = {
        idActividad,
        idUsuario: Number(idUsuario),
        idTipoResponsable: 1,
        idRolResponsable,
        rolResponsable: nombreRol,
        fechaAsignacion: fechaAsignacion
      };
      
      console.log(`✅ [Usuario ${index}] Agregado a responsables:`, {
        idUsuario,
        idRolResponsable,
        rolResponsable: nombreRol,
        responsableData: JSON.stringify(responsableData, null, 2)
      });
      
      responsables.push(responsableData);
    });

    // Agregar docentes - solo los que tienen idPersona válido
    this.docentesArray.controls.forEach((control) => {
      const idDocente = control.get('idPersona')?.value;
      const idRolResponsableRaw = control.get('idRolResponsable')?.value;
      
      // Validar que el control tenga idDocente válido antes de procesar
      if (!idDocente || idDocente === null || idDocente === undefined || Number(idDocente) <= 0) {
        console.warn('⚠️ Docente omitido porque no tiene idPersona válido');
        return; // Continuar con el siguiente
      }
      
      // Convertir idRolResponsable a número
      let idRolResponsable: number | undefined = undefined;
      if (idRolResponsableRaw !== null && idRolResponsableRaw !== undefined && idRolResponsableRaw !== '') {
        const numValue = Number(idRolResponsableRaw);
        if (!isNaN(numValue) && numValue > 0) {
          idRolResponsable = numValue;
        }
      }
      
      responsables.push({
        idActividad,
        idDocente: Number(idDocente),
        idTipoResponsable: 2,
        idRolResponsable,
        rolResponsable: idRolResponsable ? this.getNombreRolResponsable(idRolResponsable) : undefined,
        fechaAsignacion: fechaAsignacion
      });
      console.log('✅ Docente agregado a responsables:', idDocente, 'Rol ID:', idRolResponsable, 'Rol Nombre:', idRolResponsable ? this.getNombreRolResponsable(idRolResponsable) : 'Sin rol');
    });

    // Agregar estudiantes - solo los que tienen idPersona e idRolResponsable válidos
    this.estudiantesArray.controls.forEach((control) => {
      const idDocente = control.get('idPersona')?.value;
      const idRolResponsableRaw = control.get('idRolResponsable')?.value;
      
      // Validar que el control tenga idDocente válido antes de procesar
      if (!idDocente || idDocente === null || idDocente === undefined || Number(idDocente) <= 0) {
        console.warn('⚠️ Estudiante omitido porque no tiene idPersona válido');
        return; // Continuar con el siguiente
      }
      
      // Convertir idRolResponsable a número
      let idRolResponsable: number | undefined = undefined;
      if (idRolResponsableRaw !== null && idRolResponsableRaw !== undefined && idRolResponsableRaw !== '') {
        const numValue = Number(idRolResponsableRaw);
        if (!isNaN(numValue) && numValue > 0) {
          idRolResponsable = numValue;
        }
      }
      
      // Validar que tenga idRolResponsable válido (requerido para estudiantes)
      if (!idRolResponsable || idRolResponsable <= 0) {
        console.warn('⚠️ Estudiante omitido porque no tiene idRolResponsable válido');
        return; // Continuar con el siguiente
      }
      
      responsables.push({
        idActividad,
        idEstudiante: Number(idDocente), // El backend espera idEstudiante para estudiantes
        idTipoResponsable: 3,
        idRolResponsable,
        rolResponsable: this.getNombreRolResponsable(idRolResponsable),
        fechaAsignacion: fechaAsignacion
      });
      console.log('✅ Estudiante agregado a responsables:', idDocente, 'Rol ID:', idRolResponsable, 'Rol Nombre:', this.getNombreRolResponsable(idRolResponsable));
    });

    // Agregar administrativos - solo los que tienen idPersona válido
    this.administrativosArray.controls.forEach((control) => {
      const idAdmin = control.get('idPersona')?.value;
      const idRolResponsableRaw = control.get('idRolResponsable')?.value;
      
      // Validar que el control tenga idAdmin válido antes de procesar
      if (!idAdmin || idAdmin === null || idAdmin === undefined || Number(idAdmin) <= 0) {
        console.warn('⚠️ Administrativo omitido porque no tiene idPersona válido');
        return; // Continuar con el siguiente
      }
      
      // Convertir idRolResponsable a número
      let idRolResponsable: number | undefined = undefined;
      if (idRolResponsableRaw !== null && idRolResponsableRaw !== undefined && idRolResponsableRaw !== '') {
        const numValue = Number(idRolResponsableRaw);
        if (!isNaN(numValue) && numValue > 0) {
          idRolResponsable = numValue;
        }
      }
      
      responsables.push({
        idActividad,
        idAdmin: Number(idAdmin),
        idTipoResponsable: 4,
        idRolResponsable,
        rolResponsable: idRolResponsable ? this.getNombreRolResponsable(idRolResponsable) : undefined,
        fechaAsignacion: fechaAsignacion
      });
      console.log('✅ Administrativo agregado a responsables:', idAdmin, 'Rol ID:', idRolResponsable, 'Rol Nombre:', idRolResponsable ? this.getNombreRolResponsable(idRolResponsable) : 'Sin rol');
    });

    // Agregar responsables externos
    this.responsablesExternosArray.controls.forEach((control, index) => {
      const esNuevo = control.get('esNuevo')?.value;
      const idResponsableExterno = control.get('idResponsableExterno')?.value;
      const idRolResponsableRaw = control.get('idRolResponsable')?.value;
      
      // Convertir idRolResponsable a número
      let idRolResponsable: number | undefined = undefined;
      if (idRolResponsableRaw !== null && idRolResponsableRaw !== undefined && idRolResponsableRaw !== '') {
        const numValue = Number(idRolResponsableRaw);
        if (!isNaN(numValue) && numValue > 0) {
          idRolResponsable = numValue;
        }
      }
      
      if (esNuevo) {
        // Responsable externo nuevo - debe tener nombre, institucion y rol
        const nombre = control.get('nombre')?.value;
        const institucion = control.get('institucion')?.value;
        const cargo = control.get('cargo')?.value;
        const telefono = control.get('telefono')?.value;
        const correo = control.get('correo')?.value;
        
        // Validar que tenga todos los campos requeridos
        if (nombre && institucion && idRolResponsable) {
          responsables.push({
            idActividad,
            idTipoResponsable: 5, // Tipo responsable externo
            idRolResponsable: idRolResponsable,
            responsableExterno: {
              nombre: String(nombre),
              institucion: String(institucion),
              cargo: cargo ? String(cargo) : undefined,
              telefono: telefono ? String(telefono) : undefined,
              correo: correo ? String(correo) : undefined
            },
            fechaAsignacion: fechaAsignacion
          } as any);
          console.log(`✅ [Responsable Externo ${index}] Agregado (nuevo):`, nombre, 'Rol:', idRolResponsable);
        } else {
          console.warn(`⚠️ [Responsable Externo ${index}] Omitido porque le faltan campos requeridos (nombre, institucion o idRolResponsable)`);
        }
      } else if (idResponsableExterno && idRolResponsable) {
        // Responsable externo existente - debe tener ambos IDs
        responsables.push({
          idActividad,
          idTipoResponsable: 5, // Tipo responsable externo
          idResponsableExterno: Number(idResponsableExterno),
          idRolResponsable: idRolResponsable,
          fechaAsignacion: fechaAsignacion
        } as any);
        console.log(`✅ [Responsable Externo ${index}] Agregado (existente):`, idResponsableExterno, 'Rol:', idRolResponsable);
      } else {
        console.warn(`⚠️ [Responsable Externo ${index}] Omitido porque le falta idResponsableExterno o idRolResponsable`);
      }
    });

    // Crear todos los responsables en paralelo
    console.log('📊 Total de responsables a crear:', responsables.length);
    console.log('📋 Responsables a crear:', JSON.stringify(responsables, null, 2));
    
    if (responsables.length > 0) {
      // Validar que todos los responsables tengan al menos un ID de persona
      const responsablesInvalidos = responsables.filter(r => {
        const tieneId = r.idUsuario || r.idDocente || r.idEstudiante || r.idAdmin || (r as any).idResponsableExterno || (r as any).responsableExterno;
        if (!tieneId) {
          console.error('❌ Responsable inválido encontrado (sin ID de persona):', r);
        }
        return !tieneId;
      });
      
      if (responsablesInvalidos.length > 0) {
        console.error('❌ Se encontraron responsables inválidos. No se crearán responsables.');
        this.alertService.error(
          'Error al crear responsables',
          'Algunos responsables no tienen información válida. Por favor, verifica que todos los responsables tengan una persona asignada.'
        );
        this.loading.set(false);
        if (onComplete) {
          onComplete();
        }
        return;
      }
      
      // Crear responsables con manejo de errores individuales
      forkJoin(
        responsables.map(responsable => 
          this.responsableService.create(responsable).pipe(
            catchError(err => {
              console.error('❌ Error creando un responsable individual:', err);
              console.error('❌ Responsable que falló:', responsable);
              // Continuar con los demás aunque uno falle
              return of(null);
            })
          )
        )
      ).subscribe({
        next: (responsablesCreados) => {
          const exitosos = responsablesCreados.filter(r => r !== null).length;
          const fallidos = responsablesCreados.filter(r => r === null).length;
          console.log(`✅ Responsables creados: ${exitosos} exitosos, ${fallidos} fallidos`);
          console.log('📊 Total de responsables creados:', exitosos);
          this.loading.set(false);
          // Ejecutar callback si se proporciona, sino mostrar alerta
          if (onComplete) {
            onComplete();
          } else {
            this.mostrarAlertaExito();
          }
        },
        error: (err) => {
          console.error('❌ Error crítico creando responsables:', err);
          this.loading.set(false);
          // Ejecutar callback incluso si hay error
          if (onComplete) {
            onComplete();
          } else {
            // Continuar aunque haya error con responsables
            this.mostrarAlertaExito();
          }
        }
      });
    } else {
      console.warn('⚠️ No hay responsables para crear');
      this.loading.set(false);
      // Ejecutar callback si se proporciona, sino mostrar alerta
      if (onComplete) {
        onComplete();
      } else {
        this.mostrarAlertaExito();
      }
    }
  }

  private clearFormState(): void {
    try {
      sessionStorage.removeItem(this.formStateKey);
      console.log('🗑️ Estado del formulario limpiado');
    } catch (error) {
      console.warn('Error limpiando estado del formulario:', error);
    }
  }

  private saveFormState(): void {
    if (!this.form || this.isEditMode() || this.isCancelling) {
      return; // No guardar en modo edición o cuando se está cancelando
    }
    // Implementación básica - puede expandirse si se necesita guardar estado
  }

  /**
   * Verifica si el formulario tiene cambios sin guardar
   */
  private tieneCambiosSinGuardar(): boolean {
    if (!this.form) return false;
    
    // Si está en modo edición, verificar si hay cambios
    if (this.isEditMode()) {
      return this.form.dirty;
    }
    
    // En modo creación, verificar si hay datos ingresados
    const formValue = this.form.value;
    const tieneDatos = !!(
      formValue.nombreActividad?.trim() ||
      formValue.descripcion?.trim() ||
      formValue.fechaInicio ||
      formValue.fechaFin ||
      formValue.horaRealizacion ||
      formValue.idIndicador ||
      (formValue.idActividadAnual && formValue.idActividadAnual.length > 0) ||
      (formValue.idActividadMensualInst && formValue.idActividadMensualInst.length > 0) ||
      formValue.departamentoResponsableId ||
      formValue.idTipoProtagonista ||
      formValue.modalidad ||
      formValue.idCapacidadInstalada ||
      formValue.cantidadParticipantesProyectados ||
      formValue.objetivo?.trim() ||
      formValue.ubicacion?.trim()
    );
    
    return tieneDatos;
  }

  /**
   * Maneja el clic en el botón de cancelar
   * Muestra alertas de confirmación antes de cancelar
   */
  async onCancel(): Promise<void> {
    // Verificar si hay cambios sin guardar
    const tieneCambios = this.tieneCambiosSinGuardar();
    
    if (tieneCambios) {
      // Si hay cambios, mostrar alerta con opción de guardar
      const result = await this.alertService.confirm(
        '¿Desea cancelar la actividad?',
        'Tiene cambios sin guardar. ¿Desea guardar la actividad para más tarde o descartar los cambios?',
        'Guardar para más tarde',
        'Descartar cambios',
        {
          showDenyButton: true,
          denyButtonText: 'Continuar editando',
          denyButtonColor: '#6b7280'
        }
      );
      
      if (result.isConfirmed) {
        // Usuario eligió "Guardar para más tarde"
        // Aquí podrías implementar lógica para guardar en localStorage o similar
        this.confirmarCancelacion();
      } else if (result.isDenied) {
        // Usuario eligió "Continuar editando"
        return; // No hacer nada, quedarse en el formulario
      } else {
        // Usuario eligió "Descartar cambios" o cerró el diálogo
        this.confirmarCancelacion();
      }
    } else {
      // Si no hay cambios, mostrar alerta simple de confirmación
      const result = await this.alertService.confirm(
        '¿Desea cancelar?',
        '¿Está seguro de que desea salir?',
        'Sí, cancelar',
        'No, continuar'
      );
      
      if (result.isConfirmed) {
        this.confirmarCancelacion();
      }
      // Si no confirma, no hacer nada
    }
  }

  /**
   * Confirma la cancelación y navega a la lista de actividades o a la vista de detalle
   */
  private confirmarCancelacion(): void {
    // Marcar que se está cancelando para evitar guardar en ngOnDestroy
    this.isCancelling = true;
    
    // Limpiar el estado guardado del formulario
    this.clearFormState();
    
    // Limpiar el formulario actual
    if (this.form) {
      this.form.reset();
      // Restablecer valores por defecto
      this.form.patchValue({
        esPlanificada: false,
        activo: true
      });
    }
    
    // Resetear estado visual
    this.localSeleccionado.set(null);
    
    // Si estamos en modo edición, navegar a la vista de detalle de la actividad
    // Si estamos en modo creación, navegar a la lista de actividades
    if (this.isEditMode() && this.actividadId()) {
      this.router.navigate(['/actividades', this.actividadId()]);
    } else {
      this.router.navigate(['/actividades']);
    }
  }

  toggleSeccionPlanificacion(): void {
    const nuevoEstado = !this.seccionPlanificacionExpandida();
    this.seccionPlanificacionExpandida.set(nuevoEstado);
    // Permitir que todas las secciones estén abiertas simultáneamente
  }

  toggleSeccionInformacion(): void {
    const nuevoEstado = !this.seccionInformacionExpandida();
    this.seccionInformacionExpandida.set(nuevoEstado);
    // Permitir que todas las secciones estén abiertas simultáneamente
  }

  toggleSeccionResponsables(): void {
    const nuevoEstado = !this.seccionResponsablesExpandida();
    this.seccionResponsablesExpandida.set(nuevoEstado);
    // Permitir que todas las secciones estén abiertas simultáneamente
  }

  // Métodos para el dropdown de indicador
  mostrarDropdownIndicadorFunc(): void {
    this.mostrarDropdownIndicador.set(!this.mostrarDropdownIndicador());
  }

  isIndicadorSelected(idIndicador: number): boolean {
    return this.form.get('idIndicador')?.value === idIndicador;
  }

  cargarActividadesMensualesPorMultiplesAnuales(idActividadesAnuales: number[], skipCheck: boolean = false): void {
    if (idActividadesAnuales.length === 0) {
      this.actividadesMensualesFiltradas.set([]);
      this.form.patchValue({ idActividadMensualInst: [] }, { emitEvent: false });
      this.cargandoRelaciones = false;
      if (skipCheck) {
        this.loading.set(false);
      }
      return;
    }

    // Cargar actividades mensuales para todas las actividades anuales
    const requests = idActividadesAnuales.map(idAnual => 
      this.actividadMensualInstService.getByActividadAnual(idAnual)
    );

    // Combinar todas las peticiones usando forkJoin
    forkJoin(requests).subscribe({
      next: (results) => {
        const todasLasMensuales: ActividadMensualInst[] = [];
        results.forEach((actividadesMensuales, index) => {
          const idAnual = idActividadesAnuales[index];
          const actividadesFiltradas = (actividadesMensuales || []).filter(m => m.idActividadAnual === idAnual);
          todasLasMensuales.push(...actividadesFiltradas);
        });

        // Eliminar duplicados por idActividadMensualInst
        const mensualesUnicas = todasLasMensuales.filter((mensual, index, self) =>
          index === self.findIndex(m => m.idActividadMensualInst === mensual.idActividadMensualInst)
        );

        this.actividadesMensualesFiltradas.set(mensualesUnicas);
        
        // Si hay actividades mensuales disponibles y no estamos en modo skipCheck, abrir el dropdown automáticamente
        if (!skipCheck && mensualesUnicas.length > 0) {
          this.mostrarDropdownActividadMensual.set(true);
        }

        if (skipCheck) {
          const actividadMensualActual = this.form.get('idActividadMensualInst')?.value;
          const actividadesMensualesArray = Array.isArray(actividadMensualActual) ? actividadMensualActual : (actividadMensualActual ? [actividadMensualActual] : []);
          const actividadesValidas = actividadesMensualesArray.filter(id => 
            mensualesUnicas.find(m => m.idActividadMensualInst === id)
          );
          if (actividadesValidas.length > 0) {
            this.form.patchValue({ idActividadMensualInst: actividadesValidas }, { emitEvent: false });
          } else {
            this.form.patchValue({ idActividadMensualInst: [] }, { emitEvent: false });
          }
        } else {
          // No seleccionar automáticamente las actividades mensuales
          // El usuario puede seleccionarlas manualmente
          this.form.patchValue({ idActividadMensualInst: [] }, { emitEvent: false });
        }

        this.cargandoRelaciones = false;
        if (skipCheck) {
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error cargando actividades mensuales:', err);
        this.actividadesMensualesFiltradas.set([]);
        this.cargandoRelaciones = false;
        if (skipCheck) {
          this.loading.set(false);
        }
      }
    });
  }
}

