import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActividadesService } from '../../core/services/actividades.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { ActividadCreate } from '../../core/models/actividad';
import type { Departamento } from '../../core/models/departamento';
import type { CategoriaActividad } from '../../core/models/categoria-actividad';
import type { TipoUnidad } from '../../core/models/tipo-unidad';
import type { TipoIniciativa } from '../../core/models/tipo-iniciativa';
import type { EstadoActividad } from '../../core/models/estado-actividad';
import type { TipoDocumento } from '../../core/models/tipo-documento';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';
import { IndicadorService } from '../../core/services/indicador.service';
import type { Indicador } from '../../core/models/indicador';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import { ActividadResponsableService, type ActividadResponsableCreate } from '../../core/services/actividad-responsable.service';
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
  private catalogosService = inject(CatalogosService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private indicadorService = inject(IndicadorService);
  private actividadAnualService = inject(ActividadAnualService);
  private responsableService = inject(ActividadResponsableService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  departamentos = signal<Departamento[]>([]);
  categoriasActividad = signal<CategoriaActividad[]>([]);
  tiposUnidad = signal<TipoUnidad[]>([]);
  tiposIniciativa = signal<TipoIniciativa[]>([]);
  estadosActividad = signal<EstadoActividad[]>([]);
  tiposDocumento = signal<TipoDocumento[]>([]);
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

  indicadorIdFromQuery = signal<number | null>(null);

  ngOnInit(): void {
    this.initializeForm();
    this.loadDepartamentos();
    this.loadCategoriasActividad();
    this.loadTiposUnidad();
    this.loadTiposIniciativa();
    this.loadEstadosActividad();
    this.loadTiposDocumento();
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
      departamentoResponsableId: [[]], // Array para múltiples selecciones
      fechaInicio: [''],
      fechaFin: [''],
      soporteDocumentoUrl: [null], // Para archivo
      idEstadoActividad: [null],
      idTipoActividad: [[]], // Array para múltiples selecciones
      modalidad: [''],
      idCapacidadInstalada: [null],
      semanaMes: [null],
      codigoActividad: [''],
      idActividadMensualInst: [null],
      esPlanificada: [true],
      idIndicador: [null],
      idActividadAnual: [[]], // Array para múltiples selecciones
      objetivo: [''],
      cantidadParticipantesProyectados: [null, Validators.required], // Obligatorio
      cantidadParticipantesEstudiantesProyectados: [null], // Campo local, no obligatorio
      anio: [currentYear],
      horaInicioPrevista: [''], // Campo local, no se envía al backend
      horaRealizacion: [''],
      idTipoProtagonista: [[]], // Array para múltiples selecciones
      responsableActividad: [''],
      // Campos legacy para compatibilidad (se mapearán en onSubmit)
      categoriaActividadId: [null],
      tipoUnidadId: [null],
      areaConocimientoId: [null],
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
      
      // Manejar array de actividades anuales
      const actividadesAnuales = Array.isArray(idActividadAnual) ? idActividadAnual : (idActividadAnual ? [idActividadAnual] : []);
      
      if (actividadesAnuales.length > 0) {
        // Cargar actividades mensuales de la primera actividad anual seleccionada
        this.cargarActividadesMensualesPorAnual(actividadesAnuales[0], false);
      } else {
        this.actividadesMensualesFiltradas.set([]);
        this.form.patchValue({ idActividadMensualInst: null }, { emitEvent: false });
      }
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
        
        // En modo skipCheck (carga inicial/edición), preservar las selecciones existentes
        if (skipCheck && actividadAnualActual) {
          // Verificar si las actividades anuales seleccionadas son válidas
          const actividadesAnualesArray = Array.isArray(actividadAnualActual) ? actividadAnualActual : [actividadAnualActual];
          const actividadesValidas = actividadesAnualesArray.filter(id => 
            actividadesFiltradas.find(a => a.idActividadAnual === id)
          );
          
          if (actividadesValidas.length > 0) {
            // Preservar las selecciones válidas
            this.form.patchValue({ idActividadAnual: actividadesValidas }, { emitEvent: false });
            // Cargar actividades mensuales de la primera actividad anual válida
            this.cargarActividadesMensualesPorAnual(actividadesValidas[0], skipCheck);
          } else {
            // No hay actividades anuales válidas, limpiar
            this.form.patchValue({ idActividadAnual: [] }, { emitEvent: false });
            this.actividadesMensualesFiltradas.set([]);
            this.cargandoRelaciones = false;
            if (skipCheck) {
              this.loading.set(false);
            }
          }
        } else if (!skipCheck) {
          // Modo normal (no es carga inicial), auto-seleccionar la primera si no hay selección
          const actividadAnualActualNormal = this.form.get('idActividadAnual')?.value;
          if (!actividadAnualActualNormal || (Array.isArray(actividadAnualActualNormal) && actividadAnualActualNormal.length === 0)) {
            if (actividadesFiltradas.length > 0) {
              const primeraAnual = actividadesFiltradas[0];
              this.form.patchValue({ idActividadAnual: [primeraAnual.idActividadAnual] }, { emitEvent: false });
              this.cargarActividadesMensualesPorAnual(primeraAnual.idActividadAnual, skipCheck);
            } else {
              this.actividadesMensualesFiltradas.set([]);
              this.cargandoRelaciones = false;
            }
          } else {
            // Ya hay una selección, solo cargar las mensuales
            const actividadesAnualesArray = Array.isArray(actividadAnualActualNormal) ? actividadAnualActualNormal : [actividadAnualActualNormal];
            if (actividadesAnualesArray.length > 0) {
              this.cargarActividadesMensualesPorAnual(actividadesAnualesArray[0], skipCheck);
            } else {
              this.actividadesMensualesFiltradas.set([]);
              this.cargandoRelaciones = false;
            }
          }
        } else {
          // skipCheck es true pero no hay actividadAnualActual
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
        
        // En modo skipCheck (carga inicial/edición), preservar la selección existente si es válida
        if (skipCheck && actividadMensualActual) {
          const actividadMensualValida = actividadesFiltradas.find(m => m.idActividadMensualInst === actividadMensualActual);
          if (actividadMensualValida) {
            // Preservar la selección existente
            this.form.patchValue({ idActividadMensualInst: actividadMensualActual }, { emitEvent: false });
          } else {
            // La selección no es válida, limpiar
            this.form.patchValue({ idActividadMensualInst: null }, { emitEvent: false });
          }
        } else if (!skipCheck) {
          // Modo normal (no es carga inicial), solo auto-seleccionar si no hay selección
          const actividadMensualActualNormal = this.form.get('idActividadMensualInst')?.value;
          if (!actividadMensualActualNormal && actividadesFiltradas.length > 0) {
            const primeraMensual = actividadesFiltradas[0];
            this.form.patchValue({ idActividadMensualInst: primeraMensual.idActividadMensualInst }, { emitEvent: false });
          }
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
        // Formatear horaRealizacion si existe (convertir de 24h a 12h con AM/PM)
        let horaRealizacionFormatted = '';
        if (data.horaRealizacion) {
          horaRealizacionFormatted = this.convertir24hA12h(String(data.horaRealizacion).substring(0, 5));
        }

        const nombreActividad = data.nombreActividad || data.nombre || '';
        
        // Preparar arrays para selecciones múltiples
        const departamentoResponsableIdArray = Array.isArray(data.departamentoResponsableId) 
          ? data.departamentoResponsableId 
          : (data.departamentoResponsableId ? [data.departamentoResponsableId] : []);
        
        const idActividadAnualArray = Array.isArray(data.idActividadAnual) 
          ? data.idActividadAnual 
          : (data.idActividadAnual ? [data.idActividadAnual] : []);
        
        const idTipoProtagonistaArray = Array.isArray(data.idTipoProtagonista) 
          ? data.idTipoProtagonista 
          : (data.idTipoProtagonista ? [data.idTipoProtagonista] : []);
        
        const idTipoActividadArray = Array.isArray(data.idTipoActividad) 
          ? data.idTipoActividad 
          : (data.idTipoActividad ? [data.idTipoActividad] : (data.categoriaActividadId ? [data.categoriaActividadId] : []));
        
        console.log('📋 Cargando actividad:', {
          departamentoResponsableId: departamentoResponsableIdArray,
          idActividadAnual: idActividadAnualArray,
          idTipoProtagonista: idTipoProtagonistaArray,
          idTipoActividad: idTipoActividadArray
        });
        
        this.form.patchValue({
          nombre: nombreActividad,
          nombreActividad: nombreActividad,
          descripcion: data.descripcion || '',
          departamentoId: data.departamentoId || null,
          departamentoResponsableId: departamentoResponsableIdArray,
          fechaInicio: data.fechaInicio || '',
          fechaFin: data.fechaFin || '',
          idEstadoActividad: data.idEstadoActividad || null,
          idTipoActividad: idTipoActividadArray,
          modalidad: data.modalidad || '',
          idCapacidadInstalada: data.idCapacidadInstalada || null,
          semanaMes: data.semanaMes || null,
          codigoActividad: data.codigoActividad || '',
          idActividadMensualInst: data.idActividadMensualInst || null,
          esPlanificada: data.esPlanificada !== undefined ? data.esPlanificada : true,
          idIndicador: data.idIndicador || null,
          idActividadAnual: idActividadAnualArray,
          objetivo: data.objetivo || '',
          anio: data.anio || new Date().getFullYear(),
          horaRealizacion: horaRealizacionFormatted,
          cantidadParticipantesProyectados: data.cantidadParticipantesProyectados || null,
          cantidadParticipantesEstudiantesProyectados: data.cantidadParticipantesEstudiantesProyectados || null,
          idTipoProtagonista: idTipoProtagonistaArray,
          responsableActividad: data.responsableActividad || '',
          // Campos legacy para compatibilidad
          categoriaActividadId: data.idTipoActividad || data.categoriaActividadId || null,
          areaConocimientoId: data.idArea || data.areaConocimientoId || null,
          ubicacion: data.ubicacion || '',
          activo: data.activo ?? true
        }, { emitEvent: false });
        
        console.log('✅ Valores del formulario después de patchValue:', {
          departamentoResponsableId: this.form.get('departamentoResponsableId')?.value,
          idActividadAnual: this.form.get('idActividadAnual')?.value,
          idTipoProtagonista: this.form.get('idTipoProtagonista')?.value
        });

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

      // Formatear horaRealizacion (convertir de 12h con AM/PM a 24h)
      let horaRealizacion: string | undefined = undefined;
      if (formValue.horaRealizacion) {
        const hora12h = String(formValue.horaRealizacion).trim();
        const hora24h = this.convertir12hA24h(hora12h);
        if (hora24h) {
          horaRealizacion = hora24h.includes(':') ? (hora24h.split(':').length === 2 ? hora24h + ':00' : hora24h) : hora24h;
        }
      }

      const data: ActividadCreate = {
        nombreActividad: formValue.nombreActividad || formValue.nombre,
        nombre: formValue.nombreActividad || formValue.nombre, // Alias para compatibilidad
        descripcion: formValue.descripcion || undefined,
        departamentoId: formValue.departamentoId || undefined,
        departamentoResponsableId: Array.isArray(formValue.departamentoResponsableId) && formValue.departamentoResponsableId.length > 0 ? formValue.departamentoResponsableId : undefined,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        idEstadoActividad: formValue.idEstadoActividad || undefined,
        idTipoActividad: Array.isArray(formValue.idTipoActividad) && formValue.idTipoActividad.length > 0 ? formValue.idTipoActividad : (formValue.categoriaActividadId ? [formValue.categoriaActividadId] : undefined),
        modalidad: formValue.modalidad || undefined,
        idCapacidadInstalada: formValue.idCapacidadInstalada || undefined,
        semanaMes: formValue.semanaMes || undefined,
        codigoActividad: formValue.codigoActividad || undefined,
        idActividadMensualInst: formValue.idActividadMensualInst || undefined,
        esPlanificada: formValue.esPlanificada !== undefined ? formValue.esPlanificada : true,
        idIndicador: formValue.idIndicador || undefined,
        idActividadAnual: Array.isArray(formValue.idActividadAnual) && formValue.idActividadAnual.length > 0 ? formValue.idActividadAnual : undefined,
        objetivo: formValue.objetivo || undefined,
        anio: formValue.anio || undefined,
        horaRealizacion: horaRealizacion,
        cantidadParticipantesProyectados: formValue.cantidadParticipantesProyectados || undefined,
        cantidadParticipantesEstudiantesProyectados: formValue.cantidadParticipantesEstudiantesProyectados || undefined,
        idTipoProtagonista: Array.isArray(formValue.idTipoProtagonista) && formValue.idTipoProtagonista.length > 0 ? formValue.idTipoProtagonista : undefined,
        responsableActividad: formValue.responsableActividad || undefined,
        // Campos legacy para compatibilidad
        categoriaActividadId: Array.isArray(formValue.idTipoActividad) && formValue.idTipoActividad.length > 0 ? formValue.idTipoActividad[0] : (formValue.categoriaActividadId || undefined),
        areaConocimientoId: formValue.idArea || formValue.areaConocimientoId || undefined,
        ubicacion: formValue.ubicacion || undefined
      };

      // NOTA: El archivo de soporte (soporteDocumentoUrl) se manejará en el backend
      // cuando se implemente la funcionalidad de subida de archivos.
      // Por ahora, solo enviamos los datos del formulario.

      if (this.isEditMode()) {
        this.actividadesService.update(this.actividadId()!, data).subscribe({
          next: () => {
            // Actualizar o crear responsable si se proporcionó responsableActividad
            const responsableActividad = formValue.responsableActividad?.trim();
            if (responsableActividad && this.actividadId()) {
              this.actualizarResponsable(this.actividadId()!, responsableActividad);
            } else {
              this.router.navigate(['/actividades']);
            }
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
            const indicadorId = this.indicadorIdFromQuery();
            const responsableActividad = formValue.responsableActividad?.trim();
            
            // Si viene un indicador, asociarlo a la actividad
            if (indicadorId && actividadCreada.id) {
              console.log('🔄 Asociando indicador a actividad recién creada:', indicadorId);
              this.actividadesService.agregarIndicador(actividadCreada.id, indicadorId).subscribe({
                next: () => {
                  console.log('✅ Indicador asociado exitosamente a la actividad');
                  // Crear responsable si se proporcionó
                  if (responsableActividad) {
                    this.crearResponsable(actividadCreada.id, responsableActividad);
                  } else {
                    this.router.navigate(['/actividades']);
                  }
                },
                error: (errIndicador) => {
                  console.error('❌ Error al asociar indicador a actividad:', errIndicador);
                  // Crear responsable si se proporcionó, incluso si falló el indicador
                  if (responsableActividad) {
                    this.crearResponsable(actividadCreada.id, responsableActividad);
                  } else {
                    this.router.navigate(['/actividades']);
                  }
                }
              });
            } else {
              // Crear responsable si se proporcionó
              if (responsableActividad && actividadCreada.id) {
                this.crearResponsable(actividadCreada.id, responsableActividad);
              } else {
                this.router.navigate(['/actividades']);
              }
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

  get nombre() { return this.form.get('nombre'); }
  get departamentoResponsableId() { return this.form.get('departamentoResponsableId'); }

  toggleProtagonista(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idTipoProtagonista')?.value || [];
    let newValue: number[];
    
    if (checked) {
      newValue = [...currentValue, id];
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
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
      newValue = [...currentValue, id];
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
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
      newValue = [...currentValue, id];
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
    }
    
    this.form.patchValue({ idActividadAnual: newValue });
  }

  isActividadAnualSelected(id: number): boolean {
    const currentValue = this.form.get('idActividadAnual')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  toggleTipoActividad(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentValue = this.form.get('idTipoActividad')?.value || [];
    let newValue: number[];
    
    if (checked) {
      newValue = [...currentValue, id];
    } else {
      newValue = currentValue.filter((item: number) => item !== id);
    }
    
    this.form.patchValue({ idTipoActividad: newValue });
  }

  isTipoActividadSelected(id: number): boolean {
    const currentValue = this.form.get('idTipoActividad')?.value || [];
    return Array.isArray(currentValue) && currentValue.includes(id);
  }

  /**
   * Convierte hora de formato 24h (HH:mm) a formato 12h con AM/PM
   * Ejemplo: "14:30" -> "02:30 PM"
   */
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

  /**
   * Convierte hora de formato 12h con AM/PM a formato 24h (HH:mm)
   * Ejemplo: "02:30 PM" -> "14:30"
   */
  /**
   * Crea un responsable para la actividad usando el nombre proporcionado
   */
  private crearResponsable(idActividad: number, nombreResponsable: string): void {
    // Obtener responsables existentes para verificar si ya existe uno
    this.responsableService.getByActividad(idActividad).subscribe({
      next: (responsablesExistentes) => {
        // Si ya existe un responsable, actualizarlo en lugar de crear uno nuevo
        if (responsablesExistentes && responsablesExistentes.length > 0) {
          const responsableExistente = responsablesExistentes[0];
          const updateData: any = {
            rolResponsable: nombreResponsable
          };
          this.responsableService.update(responsableExistente.idActividadResponsable, updateData).subscribe({
            next: () => {
              console.log('✅ Responsable actualizado correctamente');
              this.router.navigate(['/actividades']);
            },
            error: (err) => {
              console.error('Error actualizando responsable:', err);
              this.router.navigate(['/actividades']);
            }
          });
        } else {
          // Crear nuevo responsable
          // Usar idTipoResponsable = 1 como valor por defecto (debe ser configurable según el backend)
          const responsableData: ActividadResponsableCreate = {
            idActividad: idActividad,
            idTipoResponsable: 1, // Valor por defecto - debería obtenerse del catálogo
            rolResponsable: nombreResponsable,
            fechaAsignacion: new Date().toISOString().split('T')[0] // Fecha actual en formato YYYY-MM-DD
          };
          
          this.responsableService.create(responsableData).subscribe({
            next: () => {
              console.log('✅ Responsable creado correctamente');
              this.router.navigate(['/actividades']);
            },
            error: (err) => {
              console.error('Error creando responsable:', err);
              // Aún así navegar, el responsable se puede asignar después
              this.router.navigate(['/actividades']);
            }
          });
        }
      },
      error: (err) => {
        console.warn('Error obteniendo responsables existentes, intentando crear uno nuevo:', err);
        // Si falla obtener responsables, intentar crear uno nuevo
        const responsableData: ActividadResponsableCreate = {
          idActividad: idActividad,
          idTipoResponsable: 1,
          rolResponsable: nombreResponsable,
          fechaAsignacion: new Date().toISOString().split('T')[0]
        };
        
        this.responsableService.create(responsableData).subscribe({
          next: () => {
            console.log('✅ Responsable creado correctamente');
            this.router.navigate(['/actividades']);
          },
          error: (createErr) => {
            console.error('Error creando responsable:', createErr);
            this.router.navigate(['/actividades']);
          }
        });
      }
    });
  }

  /**
   * Actualiza o crea un responsable para la actividad en modo edición
   */
  private actualizarResponsable(idActividad: number, nombreResponsable: string): void {
    // Obtener responsables existentes
    this.responsableService.getByActividad(idActividad).subscribe({
      next: (responsablesExistentes) => {
        if (responsablesExistentes && responsablesExistentes.length > 0) {
          // Actualizar el primer responsable existente
          const responsableExistente = responsablesExistentes[0];
          const updateData: any = {
            idActividad: responsableExistente.idActividad, // El backend requiere IdActividad
            idTipoResponsable: responsableExistente.idTipoResponsable || 1, // Mantener el tipo de responsable existente
            rolResponsable: nombreResponsable
          };
          this.responsableService.update(responsableExistente.idActividadResponsable, updateData).subscribe({
            next: () => {
              console.log('✅ Responsable actualizado correctamente');
              this.router.navigate(['/actividades']);
            },
            error: (err) => {
              console.error('Error actualizando responsable:', err);
              this.router.navigate(['/actividades']);
            }
          });
        } else {
          // Si no existe, crear uno nuevo
          this.crearResponsable(idActividad, nombreResponsable);
        }
      },
      error: (err) => {
        console.warn('Error obteniendo responsables, intentando crear uno nuevo:', err);
        // Si falla, intentar crear uno nuevo
        this.crearResponsable(idActividad, nombreResponsable);
      }
    });
  }

  private convertir12hA24h(hora12h: string): string | null {
    if (!hora12h) return null;
    
    // Remover espacios y convertir a mayúsculas
    const hora = hora12h.trim().toUpperCase();
    
    // Buscar AM o PM
    const tieneAM = hora.includes('AM');
    const tienePM = hora.includes('PM');
    
    if (!tieneAM && !tienePM) {
      // Si no tiene AM/PM, asumir que ya está en formato 24h
      return hora;
    }
    
    // Extraer la parte de la hora (sin AM/PM)
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
}

