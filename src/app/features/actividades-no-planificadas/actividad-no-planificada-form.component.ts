import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActividadesService } from '../../core/services/actividades.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { ActividadCreate } from '../../core/models/actividad';
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
import { forkJoin } from 'rxjs';

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
export class ActividadNoPlanificadaFormComponent implements OnInit {
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

  // Acordeones para secciones del formulario
  seccionPlanificacionExpandida = signal(false);
  seccionInformacionExpandida = signal(false);
  seccionEstadoExpandida = signal(false);
  seccionResponsablesExpandida = signal(false);

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

  // Validador personalizado para comparar fechas
  fechaFinValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.parent) {
      return null;
    }
    
    const fechaInicio = control.parent.get('fechaInicio')?.value;
    const fechaFin = control.value;
    
    if (!fechaInicio || !fechaFin) {
      return null; // Si alguna fecha está vacía, no validar (validación opcional)
    }
    
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    // Comparar solo las fechas (sin horas)
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    
    if (fin < inicio) {
      return { fechaFinAnterior: true };
    }
    
    return null;
  }

  initializeForm(): void {
    const currentYear = new Date().getFullYear();
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      nombreActividad: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      departamentoId: [null],
      departamentoResponsableId: [[]],
      fechaInicio: [''],
      fechaFin: ['', [this.fechaFinValidator.bind(this)]],
      horaRealizacion: [''], // Campo oculto que se actualiza desde los selects
      horaRealizacionHora: [''],
      horaRealizacionMinuto: [''],
      horaRealizacionAmPm: [''],
      soporteDocumentoUrl: [null],
      idEstadoActividad: [null],
      modalidad: [''],
      idCapacidadInstalada: [null],
      semanaMes: [null],
      idActividadMensualInst: [[]],
      esPlanificada: [false], // Siempre false para actividades no planificadas
      idIndicador: [null],
      idActividadAnual: [[]],
      objetivo: [''],
      cantidadParticipantesProyectados: [null, Validators.required],
      cantidadParticipantesEstudiantesProyectados: [null],
      anio: [String(currentYear)],
      horaInicioPrevista: [''],
      idTipoProtagonista: [[]],
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
        
        const departamentoResponsableIdArray = Array.isArray(data.departamentoResponsableId) 
          ? data.departamentoResponsableId 
          : (data.departamentoResponsableId ? [data.departamentoResponsableId] : []);
        
        const idActividadAnualArray = Array.isArray(data.idActividadAnual) 
          ? data.idActividadAnual 
          : (data.idActividadAnual ? [data.idActividadAnual] : []);
        
        const idTipoProtagonistaArray = Array.isArray(data.idTipoProtagonista) 
          ? data.idTipoProtagonista 
          : (data.idTipoProtagonista ? [data.idTipoProtagonista] : []);
        
        this.form.patchValue({
          nombre: nombreActividad,
          nombreActividad: nombreActividad,
          descripcion: data.descripcion || '',
          departamentoId: data.departamentoId || null,
          departamentoResponsableId: departamentoResponsableIdArray,
          fechaInicio: data.fechaInicio || '',
          fechaFin: data.fechaFin || '',
          idEstadoActividad: data.idEstadoActividad || null,
          modalidad: data.modalidad || '',
          idCapacidadInstalada: data.idCapacidadInstalada || null,
          semanaMes: data.semanaMes || null,
          idActividadMensualInst: Array.isArray(data.idActividadMensualInst) ? data.idActividadMensualInst : (data.idActividadMensualInst ? [data.idActividadMensualInst] : []),
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
          idTipoProtagonista: idTipoProtagonistaArray,
          categoriaActividadId: data.categoriaActividadId || null,
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
            }
          } else {
            this.indicadorSeleccionado.set(null);
          }
        }, 100);

        // Inicializar local seleccionado si hay capacidad instalada
        if (data.idCapacidadInstalada) {
          const capacidad = this.capacidadesInstaladas().find(c => c.id === data.idCapacidadInstalada);
          if (capacidad) {
            this.localSeleccionado.set(capacidad);
          }
        }

        if (this.isEditMode()) {
          this.form.get('idIndicador')?.disable({ emitEvent: false });
        }

        if (data.idIndicador) {
          this.cargarActividadesPorIndicador(data.idIndicador, true);
        } else {
          this.actividadesAnualesFiltradas.set([]);
          this.actividadesMensualesFiltradas.set([]);
          this.cargandoRelaciones = false;
          this.loading.set(false);
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

    // Validar que haya al menos un responsable
    if (!this.tieneAlMenosUnResponsable()) {
      this.error.set('Debe agregar al menos una persona válida como responsable.');
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      const formValue = this.form.getRawValue();
      
      let fechaInicio: string | undefined = undefined;
      let fechaFin: string | undefined = undefined;
      
      if (formValue.fechaInicio) {
        const fecha = new Date(formValue.fechaInicio);
        if (!isNaN(fecha.getTime())) {
          fechaInicio = fecha.toISOString().split('T')[0];
        }
      }
      
      if (formValue.fechaFin) {
        const fecha = new Date(formValue.fechaFin);
        if (!isNaN(fecha.getTime())) {
          fechaFin = fecha.toISOString().split('T')[0];
        }
      }

      let horaRealizacion: string | undefined = undefined;
      if (formValue.horaRealizacion) {
        // horaRealizacion ya está en formato 24h desde actualizarHoraRealizacion
        const hora = String(formValue.horaRealizacion).trim();
        horaRealizacion = hora.includes(':') ? (hora.split(':').length === 2 ? hora + ':00' : hora) : hora;
      }

      // Limpiar el objeto data para no enviar campos undefined o vacíos que puedan causar problemas
      const data: ActividadCreate = {
        nombreActividad: formValue.nombreActividad || formValue.nombre,
        nombre: formValue.nombreActividad || formValue.nombre
      };

      // Solo agregar campos si tienen valores válidos
      if (formValue.descripcion) data.descripcion = formValue.descripcion;
      if (formValue.departamentoId) data.departamentoId = formValue.departamentoId;
      if (Array.isArray(formValue.departamentoResponsableId) && formValue.departamentoResponsableId.length > 0) {
        data.departamentoResponsableId = formValue.departamentoResponsableId;
      }
      if (fechaInicio) data.fechaInicio = fechaInicio;
      if (fechaFin) data.fechaFin = fechaFin;
      if (formValue.idEstadoActividad) data.idEstadoActividad = formValue.idEstadoActividad;
      if (formValue.modalidad) data.modalidad = formValue.modalidad;
      if (formValue.idCapacidadInstalada) data.idCapacidadInstalada = formValue.idCapacidadInstalada;
      if (formValue.semanaMes) data.semanaMes = formValue.semanaMes;
      if (Array.isArray(formValue.idActividadMensualInst) && formValue.idActividadMensualInst.length > 0) {
        data.idActividadMensualInst = formValue.idActividadMensualInst;
      }
      data.esPlanificada = false; // Siempre false para actividades no planificadas
      if (formValue.idIndicador) data.idIndicador = Number(formValue.idIndicador);
      if (Array.isArray(formValue.idActividadAnual) && formValue.idActividadAnual.length > 0) {
        data.idActividadAnual = formValue.idActividadAnual;
      }
      if (formValue.objetivo) data.objetivo = formValue.objetivo;
      if (formValue.anio) data.anio = String(formValue.anio);
      if (horaRealizacion) data.horaRealizacion = horaRealizacion;
      if (formValue.cantidadParticipantesProyectados) data.cantidadParticipantesProyectados = formValue.cantidadParticipantesProyectados;
      if (formValue.cantidadParticipantesEstudiantesProyectados) data.cantidadParticipantesEstudiantesProyectados = formValue.cantidadParticipantesEstudiantesProyectados;
      if (Array.isArray(formValue.idTipoProtagonista) && formValue.idTipoProtagonista.length > 0) {
        data.idTipoProtagonista = formValue.idTipoProtagonista;
      }
      if (formValue.categoriaActividadId) data.categoriaActividadId = formValue.categoriaActividadId;
      if (formValue.idArea || formValue.areaConocimientoId) {
        data.areaConocimientoId = formValue.idArea || formValue.areaConocimientoId;
      }
      if (formValue.ubicacion) data.ubicacion = formValue.ubicacion;

      console.log('📤 Datos a enviar al backend:', JSON.stringify(data, null, 2));

      if (this.isEditMode()) {
        this.actividadesService.update(this.actividadId()!, data).subscribe({
          next: () => {
            if (this.actividadId()) {
              this.crearResponsablesParaActividad(this.actividadId()!);
            } else {
              this.mostrarAlertaExito();
            }
          },
          error: (err: any) => {
            console.error('Error saving actividad:', err);
            console.error('Error details:', err.error);
            console.error('Error status:', err.status);
            this.error.set(err.error?.message || err.error?.title || 'Error al guardar la actividad');
            this.loading.set(false);
          }
        });
      } else {
        this.actividadesService.create(data).subscribe({
          next: (actividadCreada) => {
            const indicadorId = this.indicadorIdFromQuery();
            
            if (indicadorId && actividadCreada.id) {
              this.actividadesService.agregarIndicador(actividadCreada.id, indicadorId).subscribe({
                next: () => {
                  if (actividadCreada.id) {
                    this.crearResponsablesParaActividad(actividadCreada.id);
                  } else {
                    this.mostrarAlertaExito();
                  }
                },
                error: (errIndicador) => {
                  console.error('Error al asociar indicador:', errIndicador);
                  if (actividadCreada.id) {
                    this.crearResponsablesParaActividad(actividadCreada.id);
                  } else {
                    this.mostrarAlertaExito();
                  }
                }
              });
            } else {
              if (actividadCreada.id) {
                this.crearResponsablesParaActividad(actividadCreada.id);
              } else {
                this.mostrarAlertaExito();
              }
            }
          },
          error: (err: any) => {
            console.error('Error saving actividad:', err);
            console.error('Error details:', err.error);
            console.error('Error status:', err.status);
            this.error.set(err.error?.message || err.error?.title || 'Error al guardar la actividad');
            this.loading.set(false);
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
      this.mostrarDropdownActividadAnual.set(false);
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
      if (newValue.length === 0) {
        this.mostrarDropdownActividadAnual.set(true);
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
    
    if (this.isEditMode()) {
      // Mensaje para actividad actualizada
      this.alertService.success(
        '¡Actividad actualizada!',
        `La actividad "${nombreActividad}" ha sido actualizada correctamente.`
      ).then(() => {
        this.router.navigate(['/actividades']);
      });
    } else {
      // Mensaje para actividad creada
      this.alertService.success(
        '¡Actividad creada exitosamente!',
        `La actividad "${nombreActividad}" ha sido creada correctamente.`
      ).then(() => {
        this.router.navigate(['/actividades']);
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
    return this.fb.group({
      idUsuario: [null, Validators.required]
    });
  }

  crearPersonaFormGroup(tipo: 'docente' | 'estudiante' | 'administrativo'): FormGroup {
    const idRolResponsableValidators = tipo === 'estudiante' ? [Validators.required] : [];
    
    return this.fb.group({
      idPersona: [null, Validators.required],
      idRolResponsable: [null, idRolResponsableValidators]
    });
  }

  crearResponsableExternoFormGroup(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required]],
      institucion: ['', [Validators.required]],
      cargo: [''],
      telefono: [''],
      correo: [''],
      idRolResponsable: [null, Validators.required]
    });
  }

  agregarPersona(tipo: 'usuario' | 'docente' | 'estudiante' | 'administrativo'): void {
    if (tipo === 'usuario') {
      this.usuariosArray.push(this.crearUsuarioFormGroup());
    } else {
      const array = tipo === 'docente' ? this.docentesArray : 
                    tipo === 'estudiante' ? this.estudiantesArray : 
                    this.administrativosArray;
      array.push(this.crearPersonaFormGroup(tipo));
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
    this.responsablesExternosArray.push(this.crearResponsableExternoFormGroup());
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
    
    this.catalogosService.getRolesResponsable().subscribe({
      next: (data) => this.rolesResponsable.set(data || []),
      error: (err) => {
        console.warn('⚠️ No se pudo cargar roles de responsable:', err);
        this.rolesResponsable.set([]);
      }
    });
  }

  toggleTipoResponsable(tipo: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    const current = this.tiposResponsableSeleccionados();
    
    if (checked) {
      this.tiposResponsableSeleccionados.set([...current, tipo]);
    } else {
      this.tiposResponsableSeleccionados.set(current.filter(t => t !== tipo));
      this.limpiarResponsablesPorTipo(tipo);
    }
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

  getNombreRolResponsable(idRolResponsable: number): string | undefined {
    const rol = this.rolesResponsable().find(r => (r.id || r.idRolResponsable) === idRolResponsable);
    return rol?.nombre || undefined;
  }

  crearResponsablesParaActividad(idActividad: number): void {
    const responsables: ActividadResponsableCreate[] = [];
    const formValue = this.formResponsable.value;
    const fechaAsignacion = formValue.fechaAsignacion || new Date().toISOString().split('T')[0];

    console.log('🔄 Creando responsables para actividad:', idActividad);
    console.log('📋 FormResponsable value:', formValue);

    // Agregar usuarios
    this.usuariosArray.controls.forEach((control) => {
      const idUsuario = control.get('idUsuario')?.value;
      if (idUsuario) {
        responsables.push({
          idActividad,
          idUsuario,
          idTipoResponsable: 1,
          fechaAsignacion: fechaAsignacion
        });
        console.log('✅ Usuario agregado a responsables:', idUsuario);
      }
    });

    // Agregar docentes
    this.docentesArray.controls.forEach((control) => {
      const idDocente = control.get('idPersona')?.value;
      const idRolResponsable = control.get('idRolResponsable')?.value;
      if (idDocente) {
        responsables.push({
          idActividad,
          idDocente,
          idTipoResponsable: 2,
          rolResponsable: idRolResponsable ? this.getNombreRolResponsable(idRolResponsable) : undefined,
          fechaAsignacion: fechaAsignacion
        });
        console.log('✅ Docente agregado a responsables:', idDocente, 'Rol:', idRolResponsable);
      }
    });

    // Agregar estudiantes
    this.estudiantesArray.controls.forEach((control) => {
      const idDocente = control.get('idPersona')?.value;
      const idRolResponsable = control.get('idRolResponsable')?.value;
      if (idDocente && idRolResponsable) {
        responsables.push({
          idActividad,
          idDocente,
          idTipoResponsable: 3,
          rolResponsable: this.getNombreRolResponsable(idRolResponsable),
          fechaAsignacion: fechaAsignacion
        });
        console.log('✅ Estudiante agregado a responsables:', idDocente, 'Rol:', idRolResponsable);
      }
    });

    // Agregar administrativos
    this.administrativosArray.controls.forEach((control) => {
      const idAdmin = control.get('idPersona')?.value;
      const idRolResponsable = control.get('idRolResponsable')?.value;
      if (idAdmin) {
        responsables.push({
          idActividad,
          idAdmin,
          idTipoResponsable: 4,
          rolResponsable: idRolResponsable ? this.getNombreRolResponsable(idRolResponsable) : undefined,
          fechaAsignacion: fechaAsignacion
        });
        console.log('✅ Administrativo agregado a responsables:', idAdmin, 'Rol:', idRolResponsable);
      }
    });

    // Crear todos los responsables en paralelo
    console.log('📊 Total de responsables a crear:', responsables.length);
    console.log('📋 Responsables a crear:', JSON.stringify(responsables, null, 2));
    
    if (responsables.length > 0) {
      forkJoin(
        responsables.map(responsable => this.responsableService.create(responsable))
      ).subscribe({
        next: (responsablesCreados) => {
          console.log('✅ Responsables creados exitosamente:', responsablesCreados);
          console.log('📊 Total de responsables creados:', responsablesCreados.length);
          this.mostrarAlertaExito();
        },
        error: (err) => {
          console.error('❌ Error creando responsables:', err);
          console.error('❌ Error details:', err.error);
          console.error('❌ Error status:', err.status);
          // Continuar aunque haya error con responsables
          this.mostrarAlertaExito();
        }
      });
    } else {
      console.warn('⚠️ No hay responsables para crear');
      this.mostrarAlertaExito();
    }
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
   * Confirma la cancelación y navega a la lista de actividades
   */
  private confirmarCancelacion(): void {
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
    
    // Navegar a la lista de actividades
    this.router.navigate(['/actividades']);
  }

  // Métodos para el dropdown de indicador
  mostrarDropdownIndicadorFunc(): void {
    this.mostrarDropdownIndicador.set(!this.mostrarDropdownIndicador());
  }

  toggleIndicador(idIndicador: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.form.patchValue({ idIndicador: idIndicador });
      const indicador = this.indicadores().find(ind => ind.idIndicador === idIndicador);
      this.indicadorSeleccionado.set(indicador || null);
      this.mostrarDropdownIndicador.set(false);
    }
  }

  isIndicadorSelected(idIndicador: number): boolean {
    return this.form.get('idIndicador')?.value === idIndicador;
  }

  tieneIndicadorSeleccionado(): boolean {
    return !!this.indicadorSeleccionado();
  }

  eliminarIndicador(): void {
    this.form.patchValue({ idIndicador: null });
    this.indicadorSeleccionado.set(null);
  }

  getIndicadoresFiltrados(): Indicador[] {
    return this.indicadores();
  }
}

