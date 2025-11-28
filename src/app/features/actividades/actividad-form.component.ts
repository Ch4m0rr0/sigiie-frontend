import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActividadesService } from '../../core/services/actividades.service';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { ActividadCreate } from '../../core/models/actividad';
import type { Planificacion, PlanificacionActividadCreate } from '../../core/models/planificacion';
import type { Departamento } from '../../core/models/departamento';
import type { CategoriaActividad } from '../../core/models/categoria-actividad';
import type { TipoUnidad } from '../../core/models/tipo-unidad';
import type { AreaConocimiento } from '../../core/models/area-conocimiento';
import type { TipoIniciativa } from '../../core/models/tipo-iniciativa';
import type { EstadoActividad } from '../../core/models/estado-actividad';
import type { TipoDocumento } from '../../core/models/tipo-documento';
import type { NivelActividad } from '../../core/models/catalogos-nuevos';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';
import { IndicadorService } from '../../core/services/indicador.service';
import type { Indicador } from '../../core/models/indicador';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-actividad-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './actividad-form.component.html',
})
export class ActividadFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private actividadesService = inject(ActividadesService);
  private planificacionService = inject(PlanificacionService);
  private catalogosService = inject(CatalogosService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private indicadorService = inject(IndicadorService);
  private actividadAnualService = inject(ActividadAnualService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  planificaciones = signal<Planificacion[]>([]);
  departamentos = signal<Departamento[]>([]);
  categoriasActividad = signal<CategoriaActividad[]>([]);
  tiposUnidad = signal<TipoUnidad[]>([]);
  areasConocimiento = signal<AreaConocimiento[]>([]);
  tiposIniciativa = signal<TipoIniciativa[]>([]);
  estadosActividad = signal<EstadoActividad[]>([]);
  tiposDocumento = signal<TipoDocumento[]>([]);
  nivelesActividad = signal<NivelActividad[]>([]);
  actividadesMensualesInst = signal<ActividadMensualInst[]>([]);
  indicadores = signal<Indicador[]>([]);
  actividadesAnuales = signal<ActividadAnual[]>([]);
  actividadesAnualesFiltradas = signal<ActividadAnual[]>([]);
  actividadesMensualesFiltradas = signal<ActividadMensualInst[]>([]);
  tiposProtagonista = signal<any[]>([]);
  capacidadesInstaladas = signal<any[]>([]);
  isEditMode = signal(false);
  actividadId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  private cargandoRelaciones = false;

  planificacionIdFromQuery = signal<number | null>(null);
  indicadorIdFromQuery = signal<number | null>(null);

  ngOnInit(): void {
    this.initializeForm();
    this.loadPlanificaciones();
    this.loadDepartamentos();
    this.loadCategoriasActividad();
    this.loadTiposUnidad();
    this.loadAreasConocimiento();
    this.loadTiposIniciativa();
    this.loadEstadosActividad();
    this.loadTiposDocumento();
    this.loadNivelesActividad();
    this.loadActividadesMensualesInst();
    this.loadIndicadores();
    this.loadActividadesAnuales();
    this.loadTiposProtagonista();
    this.loadCapacidadesInstaladas();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.actividadId.set(+id);
      this.loadActividad(+id);
    }

    // Leer planificacionId de query params (si viene desde el detalle de planificación)
    const planificacionId = this.route.snapshot.queryParams['planificacionId'];
    if (planificacionId) {
      this.planificacionIdFromQuery.set(+planificacionId);
      // Pre-seleccionar la planificación en el formulario si existe el campo
      if (this.form.get('idPlanificacion')) {
        this.form.patchValue({ idPlanificacion: +planificacionId });
      }
    }

    // Leer idIndicador de query params (si viene desde la vista de actividades)
    const idIndicador = this.route.snapshot.queryParams['idIndicador'];
    if (idIndicador) {
      this.indicadorIdFromQuery.set(+idIndicador);
    }
  }

  initializeForm(): void {
    const currentYear = new Date().getFullYear();
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      nombreActividad: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      departamentoId: [null],
      departamentoResponsableId: [null],
      idTipoIniciativa: [null],
      fechaInicio: [''],
      fechaFin: [''],
      fechaEvento: [''],
      soporteDocumentoUrl: [null], // Para archivo
      idEstadoActividad: [null],
      idTipoActividad: [null], // Reemplaza categoriaActividadId
      idArea: [null], // Reemplaza areaConocimientoId
      idTipoDocumento: [null],
      organizador: [''],
      modalidad: [''],
      idCapacidadInstalada: [null],
      idNivel: [null],
      nivelActividad: [1],
      semanaMes: [null],
      codigoActividad: [''],
      idActividadMensualInst: [null],
      esPlanificada: [true],
      idIndicador: [null],
      idActividadAnual: [null],
      objetivo: [''],
      cantidadMaximaParticipantesEstudiantes: [null],
      tipoResumenAccion: [''],
      metaAlcanzada: [null],
      metaCumplimiento: [null],
      valoracionIndicadorEstrategico: [''],
      brechaEstrategica: [''],
      anio: [currentYear],
      horaRealizacion: [''],
      cantidadParticipantesProyectados: [null],
      idTipoProtagonista: [null],
      // Campos legacy para compatibilidad (se mapearán en onSubmit)
      categoriaActividadId: [null],
      tipoUnidadId: [null],
      areaConocimientoId: [null],
      idPlanificacion: [null],
      ubicacion: [''], // Legacy - se mapeará a idCapacidadInstalada
      activo: [true]
    });

    // Sincronizar nombre y nombreActividad
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

    // Suscribirse a cambios en el indicador para filtrar actividades anuales
    this.form.get('idIndicador')?.valueChanges.subscribe(idIndicador => {
      if (this.cargandoRelaciones) return; // Evitar loops durante carga inicial
      
      if (idIndicador) {
        // Limpiar primero las actividades anuales para evitar mostrar actividades de otros indicadores
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({
          idActividadAnual: null,
          idActividadMensualInst: null
        }, { emitEvent: false });
        
        // Cargar solo las actividades anuales del indicador seleccionado
        this.cargarActividadesPorIndicador(idIndicador, false);
      } else {
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({
          idActividadAnual: null,
          idActividadMensualInst: null
        }, { emitEvent: false });
      }
    });

    // Suscribirse a cambios en la actividad anual para filtrar actividades mensuales
    this.form.get('idActividadAnual')?.valueChanges.subscribe(idActividadAnual => {
      if (this.cargandoRelaciones) return; // Evitar loops durante carga inicial
      
      if (idActividadAnual) {
        // Cargar actividades mensuales de la actividad anual
        this.cargarActividadesMensualesPorAnual(idActividadAnual, false);
      } else {
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({ idActividadMensualInst: null }, { emitEvent: false });
      }
    });
  }

  loadPlanificaciones(): void {
    this.planificacionService.getAll().subscribe({
      next: (data) => this.planificaciones.set(data),
      error: (err) => console.error('Error loading planificaciones:', err)
    });
  }


  loadDepartamentos(): void {
    this.catalogosService.getDepartamentos().subscribe({
      next: (data) => this.departamentos.set(data),
      error: (err) => console.error('Error loading departamentos:', err)
    });
  }

  loadCategoriasActividad(): void {
    this.catalogosService.getCategoriasActividad().subscribe({
      next: (data) => this.categoriasActividad.set(data),
      error: (err) => console.error('Error loading categorias actividad:', err)
    });
  }

  loadTiposUnidad(): void {
    this.catalogosService.getTiposUnidad().subscribe({
      next: (data) => this.tiposUnidad.set(data),
      error: (err) => console.error('Error loading tipos unidad:', err)
    });
  }

  loadAreasConocimiento(): void {
    this.catalogosService.getAreasConocimiento().subscribe({
      next: (data) => this.areasConocimiento.set(data),
      error: (err) => console.error('Error loading areas conocimiento:', err)
    });
  }

  loadTiposIniciativa(): void {
    this.catalogosService.getTiposIniciativa().subscribe({
      next: (data) => this.tiposIniciativa.set(data),
      error: (err) => console.error('Error loading tipos iniciativa:', err)
    });
  }

  loadEstadosActividad(): void {
    this.catalogosService.getEstadosActividad().subscribe({
      next: (data) => this.estadosActividad.set(data),
      error: (err) => console.error('Error loading estados actividad:', err)
    });
  }

  loadTiposDocumento(): void {
    this.catalogosService.getTiposDocumento().subscribe({
      next: (data) => this.tiposDocumento.set(data),
      error: (err) => console.error('Error loading tipos documento:', err)
    });
  }

  loadNivelesActividad(): void {
    this.catalogosService.getNivelesActividad().subscribe({
      next: (data) => this.nivelesActividad.set(data),
      error: (err) => console.error('Error loading niveles actividad:', err)
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
        // Si hay un indicador seleccionado, filtrar las actividades anuales
        const idIndicador = this.form.get('idIndicador')?.value;
        if (idIndicador) {
          this.cargarActividadesPorIndicador(idIndicador);
        }
      },
      error: (err) => console.error('Error loading actividades anuales:', err)
    });
  }

  cargarActividadesPorIndicador(idIndicador: number, skipCheck: boolean = false): void {
    // Solo bloquear si skipCheck es false y cargandoRelaciones está en true
    // Si skipCheck es true (carga inicial), siempre permitir la carga
    if (!skipCheck && this.cargandoRelaciones) return;
    
    this.cargandoRelaciones = true;
    
    // Guardar la actividad anual actual antes de limpiar (solo en modo skipCheck)
    const actividadAnualActual = skipCheck ? this.form.get('idActividadAnual')?.value : null;
    
    this.actividadAnualService.getByIndicador(idIndicador).subscribe({
      next: (actividadesAnuales) => {
        const actividadesFiltradas = (actividadesAnuales || []).filter(a => a.idIndicador === idIndicador);
        this.actividadesAnualesFiltradas.set(actividadesFiltradas);
        
        let actividadAnualValida: number | null = null;
        
        if (skipCheck && actividadAnualActual) {
          // En modo skipCheck (carga inicial), usar la actividad anual guardada si es válida
          if (actividadesFiltradas.find(a => a.idActividadAnual === actividadAnualActual)) {
            actividadAnualValida = actividadAnualActual;
          }
        }
        
        // Si no hay una actividad anual válida pero hay actividades disponibles, auto-seleccionar la primera
        if (!actividadAnualValida && actividadesFiltradas.length > 0) {
          const primeraAnual = actividadesFiltradas[0];
          actividadAnualValida = primeraAnual.idActividadAnual;
          this.form.patchValue({ idActividadAnual: actividadAnualValida }, { emitEvent: false });
        }
        
        // Si hay una actividad anual válida, cargar sus mensuales
        if (actividadAnualValida) {
          this.cargarActividadesMensualesPorAnual(actividadAnualValida, skipCheck);
        } else {
          // No hay actividades anuales disponibles
          this.actividadesMensualesFiltradas.set([]);
          this.cargandoRelaciones = false;
          // Si es carga inicial, actualizar el estado de loading
          if (skipCheck) {
            this.loading.set(false);
          }
        }
      },
      error: (err) => {
        console.error('Error cargando actividades anuales:', err);
        this.actividadesAnualesFiltradas.set([]);
        this.actividadesMensualesFiltradas.set([]);
        this.cargandoRelaciones = false;
        // Si es carga inicial, actualizar el estado de loading
        if (skipCheck) {
          this.loading.set(false);
        }
      }
    });
  }

  cargarActividadesMensualesPorAnual(idActividadAnual: number, skipCheck: boolean = false): void {
    this.actividadesMensualesFiltradas.set([]);
    
    // Guardar la actividad mensual actual antes de limpiar (solo en modo skipCheck)
    const actividadMensualActual = skipCheck ? this.form.get('idActividadMensualInst')?.value : null;
    
    this.actividadMensualInstService.getByActividadAnual(idActividadAnual).subscribe({
      next: (actividadesMensuales) => {
        const actividadesFiltradas = (actividadesMensuales || []).filter(m => m.idActividadAnual === idActividadAnual);
        this.actividadesMensualesFiltradas.set(actividadesFiltradas);
        
        let actividadMensualValida: number | null = null;
        
        if (skipCheck && actividadMensualActual) {
          // En modo skipCheck (carga inicial), usar la actividad mensual guardada si es válida
          if (actividadesFiltradas.find(m => m.idActividadMensualInst === actividadMensualActual)) {
            actividadMensualValida = actividadMensualActual;
          }
        }
        
        // Si no hay una actividad mensual válida pero hay actividades disponibles, auto-seleccionar la primera
        if (!actividadMensualValida && actividadesFiltradas.length > 0) {
          const primeraMensual = actividadesFiltradas[0];
          actividadMensualValida = primeraMensual.idActividadMensualInst;
          this.form.patchValue({ idActividadMensualInst: actividadMensualValida }, { emitEvent: false });
        }
        
        this.cargandoRelaciones = false;
        // Si es carga inicial, actualizar el estado de loading
        if (skipCheck) {
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error cargando actividades mensuales:', err);
        this.actividadesMensualesFiltradas.set([]);
        this.cargandoRelaciones = false;
        // Si es carga inicial, actualizar el estado de loading
        if (skipCheck) {
          this.loading.set(false);
        }
      }
    });
  }

  crearNuevaActividadAnual(): void {
    const indicadorId = this.form.get('idIndicador')?.value;
    if (!indicadorId) {
      this.error.set('Por favor, seleccione un indicador antes de crear una nueva actividad anual.');
      return;
    }
    
    this.router.navigate(['/actividades-anuales/nueva'], {
      queryParams: { idIndicador: indicadorId }
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
        // Formatear fechaEvento si existe
        let fechaEventoFormatted = '';
        if (data.fechaEvento) {
          const fechaEvento = new Date(data.fechaEvento);
          if (!isNaN(fechaEvento.getTime())) {
            fechaEventoFormatted = fechaEvento.toISOString().split('T')[0];
          }
        }

        // Formatear horaRealizacion si existe
        let horaRealizacionFormatted = '';
        if (data.horaRealizacion) {
          horaRealizacionFormatted = String(data.horaRealizacion).substring(0, 5); // HH:mm
        }

        const nombreActividad = data.nombreActividad || data.nombre || '';
        
        this.form.patchValue({
          nombre: nombreActividad,
          nombreActividad: nombreActividad,
          descripcion: data.descripcion || '',
          departamentoId: data.departamentoId || null,
          departamentoResponsableId: data.departamentoResponsableId || null,
          idTipoIniciativa: data.idTipoIniciativa || null,
          fechaInicio: data.fechaInicio || '',
          fechaFin: data.fechaFin || '',
          fechaEvento: fechaEventoFormatted,
          idEstadoActividad: data.idEstadoActividad || null,
          idTipoActividad: data.idTipoActividad || data.categoriaActividadId || null,
          idArea: data.idArea || data.areaConocimientoId || null,
          idTipoDocumento: data.idTipoDocumento || null,
          organizador: data.organizador || '',
          modalidad: data.modalidad || '',
          idCapacidadInstalada: data.idCapacidadInstalada || null,
          idNivel: data.idNivel || null,
          nivelActividad: data.nivelActividad ?? 1,
          semanaMes: data.semanaMes || null,
          codigoActividad: data.codigoActividad || '',
          idActividadMensualInst: data.idActividadMensualInst || null,
          esPlanificada: data.esPlanificada !== undefined ? data.esPlanificada : true,
          idIndicador: data.idIndicador || null,
          idActividadAnual: data.idActividadAnual || null,
          objetivo: data.objetivo || '',
          cantidadMaximaParticipantesEstudiantes: data.cantidadMaximaParticipantesEstudiantes || null,
          tipoResumenAccion: data.tipoResumenAccion || '',
          metaAlcanzada: data.metaAlcanzada || null,
          metaCumplimiento: data.metaCumplimiento || null,
          valoracionIndicadorEstrategico: data.valoracionIndicadorEstrategico || '',
          brechaEstrategica: data.brechaEstrategica || '',
          anio: data.anio || new Date().getFullYear(),
          horaRealizacion: horaRealizacionFormatted,
          cantidadParticipantesProyectados: data.cantidadParticipantesProyectados || null,
          idTipoProtagonista: data.idTipoProtagonista || null,
          // Campos legacy para compatibilidad
          categoriaActividadId: data.idTipoActividad || data.categoriaActividadId || null,
          areaConocimientoId: data.idArea || data.areaConocimientoId || null,
          ubicacion: data.ubicacion || '',
          activo: data.activo ?? true
        }, { emitEvent: false });

        // Deshabilitar el campo de indicador en modo edición
        if (this.isEditMode()) {
          this.form.get('idIndicador')?.disable({ emitEvent: false });
        }

        // Cargar actividades anuales y mensuales filtradas después de establecer los valores
        // Usar skipCheck=true para permitir la carga inicial sin bloqueo
        if (data.idIndicador) {
          // Cargar actividades anuales del indicador (skipCheck=true para carga inicial)
          // El método cargarActividadesPorIndicador ya maneja la carga de mensuales si hay una anual válida
          this.cargarActividadesPorIndicador(data.idIndicador, true);
          
          // El método cargarActividadesPorIndicador manejará la carga de mensuales y el estado de loading
          // Si no hay actividad anual, el método ya maneja el estado
        } else {
          // No hay indicador, limpiar las listas filtradas
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
    // Asegurar que nombreActividad tenga el valor de nombre si está vacío
    const nombreValue = this.form.get('nombreActividad')?.value || this.form.get('nombre')?.value;
    if (nombreValue && !this.form.get('nombreActividad')?.value) {
      this.form.patchValue({ nombreActividad: nombreValue });
    }
    if (nombreValue && !this.form.get('nombre')?.value) {
      this.form.patchValue({ nombre: nombreValue });
    }

    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      // Usar getRawValue() para incluir campos deshabilitados (como idIndicador en modo edición)
      const formValue = this.form.getRawValue();
      
      // Formatear fechas si están presentes
      let fechaInicio: string | undefined = undefined;
      let fechaFin: string | undefined = undefined;
      let fechaEvento: string | undefined = undefined;
      
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

      if (formValue.fechaEvento) {
        const fecha = new Date(formValue.fechaEvento);
        if (!isNaN(fecha.getTime())) {
          fechaEvento = fecha.toISOString().split('T')[0];
        }
      }

      // Formatear horaRealizacion (TimeOnly)
      let horaRealizacion: string | undefined = undefined;
      if (formValue.horaRealizacion) {
        // Si viene como "HH:mm", agregar ":00" para formato completo
        const hora = String(formValue.horaRealizacion);
        horaRealizacion = hora.includes(':') ? (hora.split(':').length === 2 ? hora + ':00' : hora) : hora;
      }

      const data: ActividadCreate = {
        nombreActividad: formValue.nombreActividad || formValue.nombre,
        nombre: formValue.nombreActividad || formValue.nombre, // Alias para compatibilidad
        descripcion: formValue.descripcion || undefined,
        departamentoId: formValue.departamentoId || undefined,
        departamentoResponsableId: formValue.departamentoResponsableId || undefined,
        idTipoIniciativa: formValue.idTipoIniciativa || undefined,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        fechaEvento: fechaEvento,
        idEstadoActividad: formValue.idEstadoActividad || undefined,
        idTipoActividad: formValue.idTipoActividad || formValue.categoriaActividadId || undefined,
        idArea: formValue.idArea || formValue.areaConocimientoId || undefined,
        idTipoDocumento: formValue.idTipoDocumento || undefined,
        organizador: formValue.organizador || undefined,
        modalidad: formValue.modalidad || undefined,
        idCapacidadInstalada: formValue.idCapacidadInstalada || undefined,
        idNivel: formValue.idNivel || undefined,
        nivelActividad: formValue.nivelActividad ?? 1,
        semanaMes: formValue.semanaMes || undefined,
        codigoActividad: formValue.codigoActividad || undefined,
        idActividadMensualInst: formValue.idActividadMensualInst || undefined,
        esPlanificada: formValue.esPlanificada !== undefined ? formValue.esPlanificada : true,
        idIndicador: formValue.idIndicador || undefined,
        idActividadAnual: formValue.idActividadAnual || undefined,
        objetivo: formValue.objetivo || undefined,
        cantidadMaximaParticipantesEstudiantes: formValue.cantidadMaximaParticipantesEstudiantes || undefined,
        tipoResumenAccion: formValue.tipoResumenAccion || undefined,
        metaAlcanzada: formValue.metaAlcanzada || undefined,
        metaCumplimiento: formValue.metaCumplimiento || undefined,
        valoracionIndicadorEstrategico: formValue.valoracionIndicadorEstrategico || undefined,
        brechaEstrategica: formValue.brechaEstrategica || undefined,
        anio: formValue.anio || undefined,
        horaRealizacion: horaRealizacion,
        cantidadParticipantesProyectados: formValue.cantidadParticipantesProyectados || undefined,
        idTipoProtagonista: formValue.idTipoProtagonista || undefined,
        // Campos legacy para compatibilidad
        categoriaActividadId: formValue.idTipoActividad || formValue.categoriaActividadId || undefined,
        areaConocimientoId: formValue.idArea || formValue.areaConocimientoId || undefined,
        ubicacion: formValue.ubicacion || undefined
      };

      // NOTA: El archivo de soporte (soporteDocumentoUrl) se manejará en el backend
      // cuando se implemente la funcionalidad de subida de archivos.
      // Por ahora, solo enviamos los datos del formulario.

      if (this.isEditMode()) {
        this.actividadesService.update(this.actividadId()!, data).subscribe({
          next: () => {
            this.router.navigate(['/actividades']);
          },
          error: (err: any) => {
            console.error('Error saving actividad:', err);
            this.error.set('Error al guardar la actividad');
            this.loading.set(false);
          }
        });
      } else {
        this.actividadesService.create(data).subscribe({
          next: (actividadCreada) => {
            const planificacionId = this.planificacionIdFromQuery();
            const indicadorId = this.indicadorIdFromQuery();
            
            // Si viene un indicador, asociarlo a la actividad
            if (indicadorId && actividadCreada.id) {
              console.log('🔄 Asociando indicador a actividad recién creada:', indicadorId);
              this.actividadesService.agregarIndicador(actividadCreada.id, indicadorId).subscribe({
                next: () => {
                  console.log('✅ Indicador asociado exitosamente a la actividad');
                  // Continuar con la lógica de planificación si existe
                  this.handlePlanificacionAsociacion(actividadCreada.id, planificacionId);
                },
                error: (errIndicador) => {
                  console.error('❌ Error al asociar indicador a actividad:', errIndicador);
                  // Continuar con la lógica de planificación aunque falle la asociación del indicador
                  this.handlePlanificacionAsociacion(actividadCreada.id, planificacionId);
                }
              });
            } else {
              // Si no viene indicador, solo manejar planificación
              this.handlePlanificacionAsociacion(actividadCreada.id, planificacionId);
            }
          },
          error: (err: any) => {
            console.error('Error saving actividad:', err);
            this.error.set('Error al guardar la actividad');
            this.loading.set(false);
          }
        });
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  private handlePlanificacionAsociacion(actividadId: number, planificacionId: number | null): void {
    // Si viene desde el detalle de planificación, asociar automáticamente
    if (planificacionId) {
      console.log('🔄 Asociando actividad recién creada a planificación:', planificacionId);
      const asociacionData = {
        idPlanificacion: planificacionId,
        idActividad: actividadId,
        anio: undefined, // Se usará el año de la planificación
        activo: true
      };

      this.planificacionService.asociarActividad(planificacionId, asociacionData).subscribe({
        next: () => {
          console.log('✅ Actividad asociada exitosamente a la planificación');
          // Redirigir a la lista de actividades
          this.router.navigate(['/actividades']);
        },
        error: (errAsociar) => {
          console.error('❌ Error al asociar actividad a planificación:', errAsociar);
          // Redirigir a la lista de actividades
          this.router.navigate(['/actividades']);
        }
      });
    } else {
      // Si no viene de planificación, redirigir a la lista de actividades
      this.router.navigate(['/actividades']);
    }
  }

  get nombre() { return this.form.get('nombre'); }
  get idPlanificacion() { return this.form.get('idPlanificacion'); }
  get departamentoResponsableId() { return this.form.get('departamentoResponsableId'); }
}

