import { Component, inject, OnInit, signal, computed, HostListener, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { CatalogosService } from '../../core/services/catalogos.service';
import { IndicadorService } from '../../core/services/indicador.service';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import { AlertService } from '../../core/services/alert.service';
import type { Departamento } from '../../core/models/departamento';
import type { Genero } from '../../core/models/genero';
import type { EstadoEstudiante } from '../../core/models/estado-estudiante';
import type { EstadoParticipacion } from '../../core/models/estado-participacion';
import type { CategoriaParticipacion } from '../../core/models/categoria-participacion';
import type { CategoriaActividad } from '../../core/models/categoria-actividad';
import type { TipoUnidad } from '../../core/models/tipo-unidad';
import type { TipoIniciativa } from '../../core/models/tipo-iniciativa';
import type { TipoInvestigacion } from '../../core/models/tipo-investigacion';
import type { TipoDocumento } from '../../core/models/tipo-documento';
import type { TipoDocumentoDivulgado } from '../../core/models/tipo-documento-divulgado';
import type { AreaConocimiento } from '../../core/models/area-conocimiento';
import type { EstadoActividad } from '../../core/models/estado-actividad';
import type { NivelActividad, TipoEvidencia, RolEquipo } from '../../core/models/catalogos-nuevos';
import type { Indicador } from '../../core/models/indicador';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';

// Spartan UI
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

type CatalogoType = 'departamentos' | 'generos' | 'estadoestudiantes' | 'estadoparticipaciones' | 'estadosproyecto' | 'categoriaparticipaciones' | 'categoriaactividades' | 'tiposactividad' | 'tiposunidad' | 'tiposiniciativas' | 'tiposinvestigaciones' | 'tiposdocumentos' | 'tiposdocumentosdivulgados' | 'tiposevidencia' | 'tiposprotagonista' | 'areasconocimiento' | 'estadosactividad' | 'nivelesactividad' | 'nivelesacademico' | 'rolesequipo' | 'rolesresponsable' | 'roles' | 'indicadores' | 'carreras' | 'actividades-anuales' | 'actividades-mensuales' | 'capacidadesinstaladas';

interface CatalogoItem {
  id: number;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  nombreJefe?: string;
  correoJefe?: string;
  telefonoJefe?: string;
}

@Component({
  standalone: true,
  selector: 'app-list-catalogos',
  imports: [
    CommonModule,
    NgIf,
    FormsModule,
    ReactiveFormsModule,
    ...BrnButtonImports,
    ...BrnLabelImports,
  ],
  templateUrl: './catalogos.component.html',
  styleUrls: ['./catalogos.component.css'],
})
export class ListCatalogosComponent implements OnInit, AfterViewChecked {
  private catalogosService = inject(CatalogosService);
  private indicadorService = inject(IndicadorService);
  private actividadAnualService = inject(ActividadAnualService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private alertService = inject(AlertService);
  private elementRef = inject(ElementRef);

  @ViewChild('formContainer', { static: false }) formContainer!: ElementRef;
  private shouldScrollToForm = false;

  selectedCatalogo: CatalogoType = 'departamentos';
  showForm = false;
  isEditing = false;
  editingId: number | null = null;
  isDropdownOpen = false;
  searchCatalogo = signal<string>('');
  
  // Filtro de año para indicadores
  filtroAnioIndicadores = signal<number | null>(null);
  busquedaIndicadores = signal<string>('');
  paginaActualIndicadores = signal<number>(1);
  readonly itemsPorPagina = 10;
  mostrarTodosIndicadores = signal<boolean>(false);
  
  // Búsqueda y paginación para carreras
  busquedaCarreras = signal<string>('');
  paginaActualCarreras = signal<number>(1);
  mostrarTodosCarreras = signal<boolean>(false);
  
  // Filtro de año para actividades anuales
  filtroAnioActividadesAnuales = signal<number | null>(null);
  busquedaActividadesAnuales = signal<string>('');
  paginaActualActividadesAnuales = signal<number>(1);
  mostrarTodosActividadesAnuales = signal<boolean>(false);
  
  // Búsqueda y paginación para actividades mensuales
  busquedaActividadesMensuales = signal<string>('');
  paginaActualActividadesMensuales = signal<number>(1);
  mostrarTodosActividadesMensuales = signal<boolean>(false);
  
  // Dropdown de indicador en formulario de actividad anual
  mostrarDropdownIndicadorForm = signal<boolean>(false);
  terminoBusquedaIndicadorForm = signal<string>('');
  
  // Dropdown de actividad anual en formulario de actividad mensual
  mostrarDropdownActividadAnualForm = signal<boolean>(false);
  terminoBusquedaActividadAnualForm = signal<string>('');

  // Para importar indicadores
  showImportDialog = false;
  showImportFromYear = false;
  showImportFromFile = false;
  importAnioOrigen: number | null = null;
  importAnioDestino: number | null = null;
  importActualizarExistentes = false;
  importFile: File | null = null;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
      this.mostrarDropdownIndicadorForm.set(false);
      this.mostrarDropdownActividadAnualForm.set(false);
    }
  }

  form = new FormGroup({
    codigo: new FormControl(''),
    nombre: new FormControl(''),
    descripcion: new FormControl(''),
    anio: new FormControl<number | null>(null),
    meta: new FormControl<number | null>(null),
    nombreJefe: new FormControl(''),
    correoJefe: new FormControl(''),
    telefonoJefe: new FormControl(''),
    color: new FormControl('#3B82F6'), // Color por defecto (azul)
    departamentoId: new FormControl<number | null>(null), // Para carreras
    activo: new FormControl<boolean>(true), // Para carreras
    idIndicador: new FormControl<number | null>(null), // Para actividades anuales
    idActividadAnual: new FormControl<number | null>(null), // Para actividades mensuales
    mes: new FormControl<number | null>(null), // Para actividades mensuales
    tipoUnidadId: new FormControl<number | null>(null), // Para capacidades instaladas
    permisosIds: new FormControl<number[]>([]), // Para roles - array de IDs de permisos
  });

  // Signals for reactive data
  departamentos = signal<Departamento[]>([]);
  generos = signal<Genero[]>([]);
  estadoestudiantes = signal<EstadoEstudiante[]>([]);
  estadoparticipaciones = signal<EstadoParticipacion[]>([]);
  estadosproyecto = signal<any[]>([]);
  categoriaparticipaciones = signal<CategoriaParticipacion[]>([]);
  categoriaactividades = signal<CategoriaActividad[]>([]);
  tiposactividad = signal<any[]>([]);
  tiposunidad = signal<TipoUnidad[]>([]);
  tiposiniciativas = signal<TipoIniciativa[]>([]);
  tiposinvestigaciones = signal<TipoInvestigacion[]>([]);
  tiposdocumentos = signal<TipoDocumento[]>([]);
  tiposdocumentosdivulgados = signal<TipoDocumentoDivulgado[]>([]);
  tiposevidencia = signal<TipoEvidencia[]>([]);
  tiposprotagonista = signal<any[]>([]);
  areasconocimiento = signal<AreaConocimiento[]>([]);
  estadosactividad = signal<EstadoActividad[]>([]);
  nivelesactividad = signal<NivelActividad[]>([]);
  nivelesacademico = signal<any[]>([]);
  rolesequipo = signal<RolEquipo[]>([]);
  rolesresponsable = signal<any[]>([]);
  roles = signal<any[]>([]);
  permisos = signal<any[]>([]); // Permisos disponibles para asignar a roles
  
  // Mapeo de nombres de módulos técnicos a nombres amigables
  private nombresModulos: { [key: string]: string } = {
    'Usuarios': 'Usuarios',
    'Usuario': 'Usuarios',
    'Roles': 'Roles y Permisos',
    'Rol': 'Roles y Permisos',
    'Permisos': 'Roles y Permisos',
    'Permiso': 'Roles y Permisos',
    'Proyectos': 'Proyectos',
    'Proyecto': 'Proyectos',
    'Actividades': 'Actividades',
    'Actividad': 'Actividades',
    'Subactividades': 'Subactividades',
    'Subactividad': 'Subactividades',
    'Participaciones': 'Participaciones',
    'Participacion': 'Participaciones',
    'Catalogos': 'Catálogos',
    'Catalogo': 'Catálogos',
    'Indicadores': 'Indicadores',
    'Indicador': 'Indicadores',
    'Reportes': 'Reportes',
    'Reporte': 'Reportes',
    'Dashboard': 'Dashboard',
    'Documentos': 'Documentos',
    'Documento': 'Documentos',
    'Evidencias': 'Evidencias',
    'Evidencia': 'Evidencias',
    'Personas': 'Personas',
    'Persona': 'Personas',
    'Docentes': 'Docentes',
    'Docente': 'Docentes',
    'Estudiantes': 'Estudiantes',
    'Estudiante': 'Estudiantes',
    'Departamentos': 'Departamentos',
    'Departamento': 'Departamentos',
    'Otros': 'Otros'
  };
  
  // Permisos agrupados por módulo/sección
  permisosAgrupados = computed(() => {
    const permisosList = this.permisos();
    const agrupados: { [key: string]: any[] } = {};
    
    permisosList.forEach(permiso => {
      const modulo = permiso.modulo || 'Otros';
      const moduloAmigable = this.nombresModulos[modulo] || modulo;
      
      if (!agrupados[moduloAmigable]) {
        agrupados[moduloAmigable] = [];
      }
      agrupados[moduloAmigable].push(permiso);
    });
    
    // Ordenar los módulos y los permisos dentro de cada módulo
    const modulosOrdenados = Object.keys(agrupados).sort();
    const resultado: { modulo: string, permisos: any[] }[] = [];
    
    modulosOrdenados.forEach(modulo => {
      resultado.push({
        modulo,
        permisos: agrupados[modulo].sort((a, b) => 
          (a.nombre || '').localeCompare(b.nombre || '')
        )
      });
    });
    
    return resultado;
  });
  
  indicadores = signal<Indicador[]>([]);
  carreras = signal<any[]>([]);
  actividadesAnuales = signal<ActividadAnual[]>([]);
  actividadesMensuales = signal<ActividadMensualInst[]>([]);
  capacidadesinstaladas = signal<any[]>([]);
  
  // Indicadores filtrados para el formulario de actividad anual
  indicadoresFiltradosForm = computed(() => {
    const termino = this.terminoBusquedaIndicadorForm().toLowerCase().trim();
    if (!termino) {
      return this.indicadores();
    }
    return this.indicadores().filter(indicador => {
      const nombre = (indicador.nombre || '').toLowerCase();
      const codigo = (indicador.codigo || '').toLowerCase();
      return nombre.includes(termino) || codigo.includes(termino);
    });
  });
  
  // Actividades anuales filtradas para el formulario de actividad mensual
  actividadesAnualesFiltradasForm = computed(() => {
    const termino = this.terminoBusquedaActividadAnualForm().toLowerCase().trim();
    if (!termino) {
      return this.actividadesAnuales();
    }
    return this.actividadesAnuales().filter(anual => {
      const nombre = (anual.nombre || '').toLowerCase();
      const nombreIndicador = (anual.nombreIndicador || '').toLowerCase();
      const codigoIndicador = (anual.codigoIndicador || '').toLowerCase();
      const anio = (anual.anio || '').toString();
      return nombre.includes(termino) || 
             nombreIndicador.includes(termino) || 
             codigoIndicador.includes(termino) ||
             anio.includes(termino);
    });
  });
  
  // Loading state
  isLoading = signal<boolean>(false);

  ngOnInit() {
    this.loadAllCatalogos();
  }

  onCatalogoChange() {
    this.showForm = false;
    this.isEditing = false;
    this.editingId = null;
    this.form.reset();
    this.updateFormValidation();
    
    // Si se selecciona el catálogo de roles, asegurar que los permisos estén cargados
    if (this.selectedCatalogo === 'roles' && this.permisos().length === 0) {
      this.catalogosService.getPermisos().subscribe({
        next: data => {
          console.log('✅ Permisos cargados para roles:', data);
          this.permisos.set(data);
        },
        error: error => {
          console.error('❌ Error cargando permisos:', error);
          this.permisos.set([]);
        }
      });
    }
    // Resetear filtros y paginación cuando se cambia de catálogo
    this.filtroAnioIndicadores.set(null);
    this.busquedaIndicadores.set('');
    this.paginaActualIndicadores.set(1);
    this.mostrarTodosIndicadores.set(false);
    // Resetear dropdowns en formularios
    this.mostrarDropdownIndicadorForm.set(false);
    this.terminoBusquedaIndicadorForm.set('');
    this.mostrarDropdownActividadAnualForm.set(false);
    this.terminoBusquedaActividadAnualForm.set('');
    
    // Resetear filtros y paginación para actividades anuales
    this.filtroAnioActividadesAnuales.set(null);
    this.busquedaActividadesAnuales.set('');
    this.paginaActualActividadesAnuales.set(1);
    this.mostrarTodosActividadesAnuales.set(false);
    
    // Resetear filtros y paginación para actividades mensuales
    this.busquedaActividadesMensuales.set('');
    this.paginaActualActividadesMensuales.set(1);
    this.mostrarTodosActividadesMensuales.set(false);
  }

  updateFormValidation() {
    if (this.selectedCatalogo === 'generos') {
      this.form.get('codigo')?.setValidators([Validators.required, Validators.minLength(1)]);
      this.form.get('nombre')?.clearValidators();
      this.form.get('meta')?.clearValidators();
    } else if (this.selectedCatalogo === 'indicadores') {
      // Para indicadores, tanto codigo, nombre y meta son requeridos
      this.form.get('codigo')?.setValidators([Validators.required, Validators.minLength(1)]);
      this.form.get('nombre')?.setValidators([Validators.required, Validators.minLength(3)]);
      this.form.get('meta')?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      this.form.get('nombre')?.setValidators([Validators.required, Validators.minLength(1)]);
      this.form.get('codigo')?.clearValidators();
      this.form.get('meta')?.clearValidators();
    }
    this.form.get('codigo')?.updateValueAndValidity();
    this.form.get('nombre')?.updateValueAndValidity();
    this.form.get('meta')?.updateValueAndValidity();
  }

  getCatalogoName(): string {
    const names: Record<CatalogoType, string> = {
      departamentos: 'Departamentos',
      generos: 'Sexo',
      estadoestudiantes: 'Estado Estudiante',
      estadoparticipaciones: 'Estado Participación',
      estadosproyecto: 'Estado Proyecto',
      categoriaparticipaciones: 'Categoría Participación',
      categoriaactividades: 'Categoría Actividad',
      tiposactividad: 'Tipo Actividad',
      tiposunidad: 'Tipo Unidad',
      tiposiniciativas: 'Tipo Iniciativa',
      tiposinvestigaciones: 'Tipo Investigación',
      tiposdocumentos: 'Tipo Documento',
      tiposdocumentosdivulgados: 'Tipo Documento Divulgado',
      tiposevidencia: 'Tipo Evidencia',
      tiposprotagonista: 'Tipo Protagonista',
      areasconocimiento: 'Área Conocimiento',
      estadosactividad: 'Estado Actividad',
      nivelesactividad: 'Nivel Actividad',
      nivelesacademico: 'Nivel Académico',
      rolesequipo: 'Rol Equipo',
      rolesresponsable: 'Rol Responsable',
      roles: 'Rol en el Sistema',
      indicadores: 'Indicadores',
      carreras: 'Carreras',
      'actividades-anuales': 'Actividades Anuales',
      'actividades-mensuales': 'Actividades Mensuales',
      capacidadesinstaladas: 'Capacidades Instaladas',
    };
    return names[this.selectedCatalogo];
  }

  getCatalogoOptions(): Array<{value: CatalogoType, label: string}> {
    const allOptions: Array<{value: CatalogoType, label: string}> = [
      { value: 'departamentos', label: 'Departamentos' },
      { value: 'generos', label: 'Sexo' },
      { value: 'estadoestudiantes', label: 'Estado Estudiante' },
      { value: 'estadoparticipaciones', label: 'Estado Participación' },
      { value: 'estadosproyecto', label: 'Estado Proyecto' },
      { value: 'categoriaparticipaciones', label: 'Categoría Participación' },
      { value: 'categoriaactividades', label: 'Categoría Actividad' },
      { value: 'tiposactividad', label: 'Tipo Actividad' },
      { value: 'estadosactividad', label: 'Estado Actividad' },
      { value: 'tiposunidad', label: 'Tipo Unidad' },
      { value: 'tiposiniciativas', label: 'Tipo Iniciativa' },
      { value: 'tiposinvestigaciones', label: 'Tipo Investigación' },
      { value: 'tiposdocumentos', label: 'Tipo Documento' },
      { value: 'tiposdocumentosdivulgados', label: 'Tipo Documento Divulgado' },
      { value: 'tiposevidencia', label: 'Tipo Evidencia' },
      { value: 'tiposprotagonista', label: 'Tipo Protagonista' },
      { value: 'areasconocimiento', label: 'Área Conocimiento' },
      { value: 'nivelesactividad', label: 'Nivel Actividad' },
      { value: 'nivelesacademico', label: 'Nivel Académico' },
      { value: 'rolesequipo', label: 'Rol Equipo' },
      { value: 'rolesresponsable', label: 'Rol Responsable' },
      { value: 'roles', label: 'Rol en el Sistema' },
      { value: 'indicadores', label: 'Indicadores' },
      { value: 'carreras', label: 'Carreras' },
      { value: 'actividades-anuales', label: 'Actividades Anuales' },
      { value: 'actividades-mensuales', label: 'Actividades Mensuales' },
      { value: 'capacidadesinstaladas', label: 'Capacidades Instaladas' },
    ];
    
    const searchTerm = this.searchCatalogo().toLowerCase().trim();
    if (!searchTerm) {
      return allOptions;
    }
    
    return allOptions.filter(option => 
      option.label.toLowerCase().includes(searchTerm)
    );
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // Métodos para el dropdown de indicador en formulario de actividad anual
  toggleDropdownIndicadorForm(): void {
    this.mostrarDropdownIndicadorForm.set(!this.mostrarDropdownIndicadorForm());
    if (!this.mostrarDropdownIndicadorForm()) {
      this.terminoBusquedaIndicadorForm.set('');
    }
  }

  seleccionarIndicadorForm(idIndicador: number): void {
    this.form.patchValue({ idIndicador: idIndicador });
    this.mostrarDropdownIndicadorForm.set(false);
    this.terminoBusquedaIndicadorForm.set('');
  }

  getIndicadorSeleccionadoForm(): Indicador | null {
    const idIndicador = this.form.get('idIndicador')?.value;
    if (!idIndicador) return null;
    return this.indicadores().find(ind => ind.idIndicador === idIndicador) || null;
  }

  // Métodos para el dropdown de actividad anual en formulario de actividad mensual
  toggleDropdownActividadAnualForm(): void {
    const nuevoEstado = !this.mostrarDropdownActividadAnualForm();
    this.mostrarDropdownActividadAnualForm.set(nuevoEstado);
    if (!nuevoEstado) {
      this.terminoBusquedaActividadAnualForm.set('');
    }
  }

  seleccionarActividadAnualForm(idActividadAnual: number): void {
    this.form.patchValue({ idActividadAnual: idActividadAnual });
    this.mostrarDropdownActividadAnualForm.set(false);
    this.terminoBusquedaActividadAnualForm.set('');
  }

  getActividadAnualSeleccionadaForm(): ActividadAnual | null {
    const idActividadAnual = this.form.get('idActividadAnual')?.value;
    if (!idActividadAnual) return null;
    return this.actividadesAnuales().find(a => a.idActividadAnual === idActividadAnual) || null;
  }

  closeDropdown() {
    this.isDropdownOpen = false;
  }

  selectCatalogo(value: CatalogoType) {
    this.selectedCatalogo = value;
    this.searchCatalogo.set('');
    this.closeDropdown();
    this.onCatalogoChange();
  }

  currentItems(): any[] {
    switch (this.selectedCatalogo) {
      case 'departamentos': return this.departamentos().map((item: any) => {
        // Convertir activo de número (1/0) a booleano si es necesario
        let activoValue: boolean | undefined = undefined;
        if (item.activo !== undefined) {
          activoValue = item.activo === 1 || item.activo === true;
        }
        
        return {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          activo: activoValue
        };
      });
      case 'generos': return this.generos().map(({id, codigo, descripcion}) => ({id, codigo, descripcion}));
      case 'estadoestudiantes': return this.estadoestudiantes().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'estadoparticipaciones': return this.estadoparticipaciones().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'estadosproyecto': return this.estadosproyecto().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'categoriaparticipaciones': return this.categoriaparticipaciones().map((item: any) => {
        let activoValue: boolean | undefined = undefined;
        if (item.activo !== undefined) {
          activoValue = item.activo === 1 || item.activo === true;
        } else if (item.Activo !== undefined) {
          activoValue = item.Activo === 1 || item.Activo === true;
        }
        return {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          activo: activoValue
        };
      });
      case 'categoriaactividades': return this.categoriaactividades().map((item: any) => {
        let activoValue: boolean | undefined = undefined;
        if (item.activo !== undefined) {
          activoValue = item.activo === 1 || item.activo === true;
        } else if (item.Activo !== undefined) {
          activoValue = item.Activo === 1 || item.Activo === true;
        }
        return {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          activo: activoValue
        };
      });
      case 'tiposactividad': return this.tiposactividad().map((item: any) => {
        let activoValue: boolean | undefined = undefined;
        if (item.activo !== undefined) {
          activoValue = item.activo === 1 || item.activo === true;
        } else if (item.Activo !== undefined) {
          activoValue = item.Activo === 1 || item.Activo === true;
        }
        return {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          activo: activoValue
        };
      });
      case 'tiposunidad': return this.tiposunidad().map((item: any) => {
        let activoValue: boolean | undefined = undefined;
        if (item.activo !== undefined) {
          activoValue = item.activo === 1 || item.activo === true;
        } else if (item.Activo !== undefined) {
          activoValue = item.Activo === 1 || item.Activo === true;
        }
        return {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          activo: activoValue
        };
      });
      case 'tiposiniciativas': return this.tiposiniciativas().map((item: any) => {
        let activoValue: boolean | undefined = undefined;
        if (item.activo !== undefined) {
          activoValue = item.activo === 1 || item.activo === true;
        } else if (item.Activo !== undefined) {
          activoValue = item.Activo === 1 || item.Activo === true;
        }
        return {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          activo: activoValue
        };
      });
      case 'tiposinvestigaciones': return this.tiposinvestigaciones().map((item: any) => {
        let activoValue: boolean | undefined = undefined;
        if (item.activo !== undefined) {
          activoValue = item.activo === 1 || item.activo === true;
        } else if (item.Activo !== undefined) {
          activoValue = item.Activo === 1 || item.Activo === true;
        }
        return {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          activo: activoValue
        };
      });
      case 'tiposdocumentos': return this.tiposdocumentos().map((item: any) => {
        let activoValue: boolean | undefined = undefined;
        if (item.activo !== undefined) {
          activoValue = item.activo === 1 || item.activo === true;
        } else if (item.Activo !== undefined) {
          activoValue = item.Activo === 1 || item.Activo === true;
        }
        return {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          activo: activoValue
        };
      });
      case 'tiposdocumentosdivulgados': return this.tiposdocumentosdivulgados().map((item: any) => {
        let activoValue: boolean | undefined = undefined;
        if (item.activo !== undefined) {
          activoValue = item.activo === 1 || item.activo === true;
        } else if (item.Activo !== undefined) {
          activoValue = item.Activo === 1 || item.Activo === true;
        }
        return {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          activo: activoValue
        };
      });
      case 'tiposevidencia': return this.tiposevidencia().map((item: any) => ({
        id: item.idTipoEvidencia,
        nombre: item.nombre,
        descripcion: item.descripcion,
        activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : undefined)
      }));
      case 'tiposprotagonista': return this.tiposprotagonista().map((item: any) => ({
        id: item.id,
        nombre: item.nombre,
        descripcion: item.descripcion,
        activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : undefined)
      }));
      case 'areasconocimiento': return this.areasconocimiento().map((item: any) => {
        let activoValue: boolean | undefined = undefined;
        if (item.activo !== undefined) {
          activoValue = item.activo === 1 || item.activo === true;
        } else if (item.Activo !== undefined) {
          activoValue = item.Activo === 1 || item.Activo === true;
        }
        return {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          activo: activoValue
        };
      });
      case 'estadosactividad': return this.estadosactividad().map(item => ({
        id: item.id,
        nombre: item.nombre || (item as any).NombreEstado || '',
        descripcion: item.descripcion || '',
        color: (item as any).color || (item as any).Color || '#3B82F6'
      }));
      case 'nivelesactividad': return this.nivelesactividad().map(({idNivel, nombre, descripcion, activo}) => ({id: idNivel, nombre, descripcion, activo}));
      case 'nivelesacademico': return this.nivelesacademico().map((item: any) => ({
        id: item.id,
        nombre: item.nombre,
        activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : undefined)
      }));
      case 'rolesequipo': return this.rolesequipo().map((item: any) => ({
        id: item.idRolEquipo,
        nombre: item.nombre,
        descripcion: item.descripcion,
        activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : undefined)
      }));
      case 'rolesresponsable': return this.rolesresponsable().map((item: any) => ({
        id: item.id,
        nombre: item.nombre,
        descripcion: item.descripcion,
        activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : undefined)
      }));
      case 'roles': return this.roles().map((item: any) => {
        let activoValue: boolean | undefined = undefined;
        if (item.activo !== undefined) {
          activoValue = item.activo === 1 || item.activo === true;
        } else if (item.Activo !== undefined) {
          activoValue = item.Activo === 1 || item.Activo === true;
        }
        return {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          activo: activoValue
        };
      });
      case 'indicadores': {
        let indicadores = this.indicadores().map((item: any) => {
          let activoValue: boolean | undefined = undefined;
          if (item.activo !== undefined) {
            activoValue = item.activo === 1 || item.activo === true;
          } else if (item.Activo !== undefined) {
            activoValue = item.Activo === 1 || item.Activo === true;
          }
          return {
            id: item.idIndicador,
            codigo: item.codigo,
            nombre: item.nombre,
            descripcion: item.descripcion,
            anio: item.anio,
            meta: item.meta,
            activo: activoValue
          };
        });
        
        // Filtrar por año si hay un filtro activo
        const filtroAnio = this.filtroAnioIndicadores();
        if (filtroAnio !== null && filtroAnio !== undefined) {
          indicadores = indicadores.filter(ind => ind.anio === filtroAnio);
        }
        
        // Filtrar por búsqueda (nombre o código)
        const busqueda = this.busquedaIndicadores().trim().toLowerCase();
        if (busqueda) {
          indicadores = indicadores.filter(ind => 
            (ind.nombre && ind.nombre.toLowerCase().includes(busqueda)) ||
            (ind.codigo && ind.codigo.toLowerCase().includes(busqueda))
          );
        }
        
        // Aplicar paginación solo si no se está mostrando todos
        if (this.mostrarTodosIndicadores()) {
          return indicadores;
        }
        const paginaActual = this.paginaActualIndicadores();
        const inicio = (paginaActual - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return indicadores.slice(inicio, fin);
      }
      case 'carreras': {
        let carreras = this.carreras().map((item: any) => ({
          id: item.idCarrera,
          nombre: item.nombre,
          codigo: item.codigo,
          descripcion: item.descripcion,
          departamentoId: item.departamentoId,
          departamento: item.departamento,
          activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : undefined)
        }));
        
        // Filtrar por búsqueda (nombre o código)
        const busqueda = this.busquedaCarreras().trim().toLowerCase();
        if (busqueda) {
          carreras = carreras.filter(carr => 
            (carr.nombre && carr.nombre.toLowerCase().includes(busqueda)) ||
            (carr.codigo && carr.codigo.toLowerCase().includes(busqueda))
          );
        }
        
        // Aplicar paginación solo si no se está mostrando todos
        if (this.mostrarTodosCarreras()) {
          return carreras;
        }
        const paginaActual = this.paginaActualCarreras();
        const inicio = (paginaActual - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return carreras.slice(inicio, fin);
      }
      case 'actividades-anuales': {
        let actividades = this.actividadesAnuales().map((item: any) => ({
          id: item.idActividadAnual,
          nombre: item.nombre || item.nombreIndicador,
          descripcion: item.descripcion,
          anio: item.anio,
          idIndicador: item.idIndicador,
          codigoIndicador: item.codigoIndicador,
          nombreIndicador: item.nombreIndicador,
          activo: (() => {
            let activoValue: boolean | undefined = undefined;
            if (item.activo !== undefined) {
              activoValue = item.activo === 1 || item.activo === true;
            } else if (item.Activo !== undefined) {
              activoValue = item.Activo === 1 || item.Activo === true;
            }
            return activoValue;
          })()
        }));
        
        // Filtrar por año si hay un filtro activo
        const filtroAnio = this.filtroAnioActividadesAnuales();
        if (filtroAnio !== null && filtroAnio !== undefined) {
          actividades = actividades.filter(a => a.anio === filtroAnio);
        }
        
        // Filtrar por búsqueda (nombre o código indicador)
        const busqueda = this.busquedaActividadesAnuales().trim().toLowerCase();
        if (busqueda) {
          actividades = actividades.filter(a => 
            (a.nombre && a.nombre.toLowerCase().includes(busqueda)) ||
            (a.codigoIndicador && a.codigoIndicador.toLowerCase().includes(busqueda))
          );
        }
        
        // Aplicar paginación solo si no se está mostrando todos
        if (this.mostrarTodosActividadesAnuales()) {
          return actividades;
        }
        const paginaActual = this.paginaActualActividadesAnuales();
        const inicio = (paginaActual - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return actividades.slice(inicio, fin);
      }
      case 'actividades-mensuales': {
        let actividades = this.actividadesMensuales().map((item: any) => ({
          id: item.idActividadMensualInst,
          nombre: item.nombre || item.actividadAnual?.nombreIndicador,
          descripcion: item.descripcion,
          mes: item.mes,
          nombreMes: item.nombreMes,
          idActividadAnual: item.idActividadAnual,
          actividadAnual: item.actividadAnual,
          activo: (() => {
            let activoValue: boolean | undefined = undefined;
            if (item.activo !== undefined) {
              activoValue = item.activo === 1 || item.activo === true;
            } else if (item.Activo !== undefined) {
              activoValue = item.Activo === 1 || item.Activo === true;
            }
            return activoValue;
          })()
        }));
        
        // Filtrar por búsqueda (nombre)
        const busqueda = this.busquedaActividadesMensuales().trim().toLowerCase();
        if (busqueda) {
          actividades = actividades.filter(a => 
            (a.nombre && a.nombre.toLowerCase().includes(busqueda))
          );
        }
        
        // Aplicar paginación solo si no se está mostrando todos
        if (this.mostrarTodosActividadesMensuales()) {
          return actividades;
        }
        const paginaActual = this.paginaActualActividadesMensuales();
        const inicio = (paginaActual - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return actividades.slice(inicio, fin);
      }
      case 'capacidadesinstaladas': return this.capacidadesinstaladas().map((item: any) => {
        let activoValue: boolean | undefined = undefined;
        if (item.activo !== undefined) {
          activoValue = item.activo === 1 || item.activo === true;
        } else if (item.Activo !== undefined) {
          activoValue = item.Activo === 1 || item.Activo === true;
        }
        return {
          id: item.id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          departamentoId: item.departamentoId,
          tipoUnidadId: item.tipoUnidadId,
          activo: activoValue
        };
      });
      default: return [];
    }
  }

  getItemDisplayValue(item: any): string {
    if (this.selectedCatalogo === 'generos') {
      return item.codigo || item.Codigo || '';
    }
    // Para indicadores, mostrar código y nombre
    if (this.selectedCatalogo === 'indicadores') {
      const codigo = item.codigo || item.Codigo || '';
      const nombre = item.nombre || item.Nombre || '';
      return codigo && nombre ? `${codigo} - ${nombre}` : (codigo || nombre);
    }
    // Para estadosactividad, también buscar NombreEstado
    if (this.selectedCatalogo === 'estadosactividad') {
      return item.nombre || item.Nombre || item.NombreEstado || '';
    }
    // Para estadosproyecto, buscar nombreEstado
    if (this.selectedCatalogo === 'estadosproyecto') {
      return item.nombre || item.nombreEstado || item.Nombre || item.NombreEstado || '';
    }
    return item.nombre || item.Nombre || '';
  }

  getItemId(item: any): number | undefined {
    if (this.selectedCatalogo === 'indicadores') {
      return item.id || (item as any).idIndicador;
    }
    if (this.selectedCatalogo === 'nivelesactividad') {
      return item.id || (item as any).idNivel;
    }
    if (this.selectedCatalogo === 'tiposevidencia') {
      return item.id || (item as any).idTipoEvidencia;
    }
    if (this.selectedCatalogo === 'rolesequipo') {
      return item.id || (item as any).idRolEquipo;
    }
    if (this.selectedCatalogo === 'carreras') {
      return item.id || (item as any).idCarrera;
    }
    if (this.selectedCatalogo === 'actividades-anuales') {
      return item.id || (item as any).idActividadAnual;
    }
    if (this.selectedCatalogo === 'actividades-mensuales') {
      return item.id || (item as any).idActividadMensualInst;
    }
    return item.id;
  }

  hasDescriptionData(): boolean {
    // Verificar si hay al menos un item con descripción no vacía
    return this.currentItems().some(item => item.descripcion && item.descripcion.trim() !== '');
  }

  // Métodos para obtener solo los activos para dropdowns
  departamentosActivos(): Departamento[] {
    return this.departamentos().filter(d => {
      const activo = (d as any).activo;
      return activo === true || activo === 1;
    });
  }

  tiposUnidadActivos(): any[] {
    return this.tiposunidad().filter(t => {
      const activo = (t as any).activo;
      return activo === true || activo === 1;
    });
  }

  hasEstadoData(): boolean {
    // Catálogos que tienen campo activo según el usuario
    const catalogosConEstado: CatalogoType[] = [
      'capacidadesinstaladas',
      'actividades-mensuales',
      'actividades-anuales',
      'carreras',
      'indicadores',
      'roles',
      'rolesresponsable',
      'rolesequipo',
      'nivelesacademico',
      'nivelesactividad',
      'areasconocimiento',
      'tiposprotagonista',
      'tiposiniciativas',
      'tiposinvestigaciones',
      'tiposdocumentos',
      'tiposdocumentosdivulgados',
      'tiposevidencia',
      'categoriaparticipaciones',
      'categoriaactividades',
      'tiposactividad',
      'tiposunidad',
      'departamentos'
    ];
    return catalogosConEstado.includes(this.selectedCatalogo);
  }

  getEstadoDisplay(item: any): string {
    if (!this.hasEstadoData()) {
      return '';
    }
    // El campo activo puede venir como activo, Activo, o no estar definido
    // También puede venir como número (1/0) o booleano (true/false)
    const activoRaw = item.activo !== undefined ? item.activo : 
                   (item as any).Activo !== undefined ? (item as any).Activo :
                   (item as any).activo !== undefined ? (item as any).activo : undefined;
    
    if (activoRaw === undefined || activoRaw === null) {
      return 'N/A';
    }
    
    // Convertir número (1/0) a booleano si es necesario
    const activo = activoRaw === 1 || activoRaw === true || activoRaw === '1';
    return activo ? 'Activo' : 'Inactivo';
  }

  getEstadoClass(item: any): string {
    if (!this.hasEstadoData()) {
      return '';
    }
    // Intentar diferentes variantes del nombre del campo
    const activoRaw = item.activo !== undefined ? item.activo : 
                   (item as any).Activo !== undefined ? (item as any).Activo :
                   (item as any).activo !== undefined ? (item as any).activo : undefined;
    
    if (activoRaw === undefined || activoRaw === null) {
      return 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800';
    }
    
    // Convertir número (1/0) a booleano si es necesario
    const activo = activoRaw === 1 || activoRaw === true || activoRaw === '1';
    return activo 
      ? 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800'
      : 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800';
  }

  loadAllCatalogos() {
    console.log('🔄 LOAD ALL CATALOGOS - Iniciando carga de todos los catálogos');
    this.isLoading.set(true);
    
    // En catálogos, cargar todos (activos e inactivos) para poder editarlos
    this.catalogosService.getDepartamentos(false).subscribe({
      next: data => {
        console.log('✅ LOAD ALL CATALOGOS - Departamentos cargados:', data);
        console.log('✅ LOAD ALL CATALOGOS - Primer departamento (ejemplo):', data[0]);
        this.departamentos.set(data);
      },
      error: error => console.error('❌ LOAD ALL CATALOGOS - Error cargando departamentos:', error)
    });
    
    this.catalogosService.getGeneros().subscribe({
      next: data => {
        console.log('✅ LOAD ALL CATALOGOS - Géneros cargados:', data);
        this.generos.set(data);
      },
      error: error => console.error('❌ LOAD ALL CATALOGOS - Error cargando géneros:', error)
    });
    
    this.catalogosService.getEstadosEstudiante().subscribe({
      next: data => {
        console.log('✅ LOAD ALL CATALOGOS - Estados de estudiantes cargados:', data);
        this.estadoestudiantes.set(data);
      },
      error: error => console.error('❌ LOAD ALL CATALOGOS - Error cargando estados de estudiantes:', error)
    });
    
    this.catalogosService.getEstadosParticipacion().subscribe({
      next: data => this.estadoparticipaciones.set(data),
      error: error => console.error('Error loading estados participacion:', error)
    });
    
    this.catalogosService.getEstadosProyecto().subscribe({
      next: data => this.estadosproyecto.set(data),
      error: error => console.error('Error loading estados proyecto:', error)
    });
    
    // En catálogos, cargar todos (activos e inactivos) para poder editarlos
    this.catalogosService.getCategoriasParticipacion(false).subscribe({
      next: data => this.categoriaparticipaciones.set(data),
      error: error => console.error('Error loading categorias participacion:', error)
    });
    
    this.catalogosService.getCategoriasActividad(false).subscribe({
      next: data => this.categoriaactividades.set(data),
      error: error => console.error('Error loading categorias actividad:', error)
    });
    
    this.catalogosService.getTiposActividad(false).subscribe({
      next: data => this.tiposactividad.set(data),
      error: error => console.error('Error loading tipos actividad:', error)
    });
    
    this.catalogosService.getTiposUnidad(false).subscribe({
      next: data => this.tiposunidad.set(data),
      error: error => console.error('Error loading tipos unidad:', error)
    });
    
    this.catalogosService.getTiposIniciativa(false).subscribe({
      next: data => this.tiposiniciativas.set(data),
      error: error => console.error('Error loading tipos iniciativa:', error)
    });
    
    this.catalogosService.getTiposInvestigacion(false).subscribe({
      next: data => this.tiposinvestigaciones.set(data),
      error: error => console.error('Error loading tipos investigacion:', error)
    });
    
    this.catalogosService.getTiposDocumento(false).subscribe({
      next: data => this.tiposdocumentos.set(data),
      error: error => console.error('Error loading tipos documento:', error)
    });
    
    this.catalogosService.getTiposDocumentoDivulgado(false).subscribe({
      next: data => this.tiposdocumentosdivulgados.set(data),
      error: error => console.error('Error loading tipos documento divulgado:', error)
    });
    
    this.catalogosService.getTiposEvidencia(false).subscribe({
      next: data => this.tiposevidencia.set(data),
      error: error => console.error('Error loading tipos evidencia:', error)
    });
    
    this.catalogosService.getTiposProtagonista(false).subscribe({
      next: data => this.tiposprotagonista.set(data),
      error: error => console.error('Error loading tipos protagonista:', error)
    });
    
    this.catalogosService.getAreasConocimiento(false).subscribe({
      next: data => {
        this.areasconocimiento.set(data);
      },
      error: error => {
        console.error('Error loading areas conocimiento:', error);
      }
    });
    
    this.catalogosService.getEstadosActividad().subscribe({
      next: data => {
        this.estadosactividad.set(data);
      },
      error: error => {
        console.error('Error loading estados actividad:', error);
      }
    });
    
    
    // En catálogos, cargar todos (activos e inactivos) para poder editarlos
    this.catalogosService.getNivelesActividad(false).subscribe({
      next: data => {
        this.nivelesactividad.set(data);
      },
      error: error => {
        console.error('Error loading niveles actividad:', error);
      }
    });

    this.catalogosService.getNivelesAcademico(false).subscribe({
      next: data => {
        this.nivelesacademico.set(data);
      },
      error: error => {
        console.error('Error loading niveles academico:', error);
      }
    });

    this.catalogosService.getRolesEquipo(false).subscribe({
      next: data => {
        this.rolesequipo.set(data);
      },
      error: error => {
        console.error('Error loading roles equipo:', error);
      }
    });

    this.catalogosService.getRolesResponsable(false).subscribe({
      next: data => {
        this.rolesresponsable.set(data);
      },
      error: error => {
        console.error('Error loading roles responsable:', error);
      }
    });

    this.catalogosService.getRoles(false).subscribe({
      next: data => {
        this.roles.set(data);
      },
      error: error => {
        console.error('Error loading roles:', error);
      }
    });

    // Cargar permisos disponibles (necesarios para crear/editar roles)
    this.catalogosService.getPermisos().subscribe({
      next: data => {
        console.log('✅ Permisos cargados:', data);
        this.permisos.set(data);
      },
      error: error => {
        console.error('❌ Error cargando permisos:', error);
        this.permisos.set([]);
      }
    });

    // Cargar indicadores - todos para poder editarlos
    this.indicadorService.getAll(false).subscribe({
      next: data => {
        console.log('✅ LOAD ALL CATALOGOS - Indicadores cargados:', data);
        this.indicadores.set(data);
      },
      error: error => {
        console.error('❌ LOAD ALL CATALOGOS - Error cargando indicadores:', error);
      }
    });
    
    // Cargar carreras - todas para poder editarlas
    this.catalogosService.getCarreras(false).subscribe({
      next: data => {
        console.log('✅ LOAD ALL CATALOGOS - Carreras cargadas:', data);
        this.carreras.set(data);
      },
      error: error => {
        console.error('❌ LOAD ALL CATALOGOS - Error cargando carreras:', error);
      }
    });
    
    // Cargar actividades anuales - todas para poder editarlas
    this.actividadAnualService.getAll(undefined, false).subscribe({
      next: data => {
        console.log('✅ LOAD ALL CATALOGOS - Actividades anuales cargadas:', data);
        this.actividadesAnuales.set(data);
      },
      error: error => {
        console.error('❌ LOAD ALL CATALOGOS - Error cargando actividades anuales:', error);
      }
    });
    
    // Cargar actividades mensuales - todas para poder editarlas
    this.actividadMensualInstService.getAll(undefined, false).subscribe({
      next: data => {
        console.log('✅ LOAD ALL CATALOGOS - Actividades mensuales cargadas:', data);
        this.actividadesMensuales.set(data);
      },
      error: error => {
        console.error('❌ LOAD ALL CATALOGOS - Error cargando actividades mensuales:', error);
      }
    });
    
    // Cargar capacidades instaladas - todas para poder editarlas
    this.catalogosService.getCapacidadesInstaladas(false).subscribe({
      next: data => {
        console.log('✅ LOAD ALL CATALOGOS - Capacidades instaladas cargadas:', data);
        this.capacidadesinstaladas.set(data);
      },
      error: error => {
        console.error('❌ LOAD ALL CATALOGOS - Error cargando capacidades instaladas:', error);
      }
    });
    
    this.isLoading.set(false);
  }

  addNew() {
    this.showForm = true;
    this.isEditing = false;
    this.editingId = null;
    this.form.reset();
    this.updateFormValidation();
    // Activar scroll automático al formulario
    this.shouldScrollToForm = true;
  }

  editItem(item: CatalogoItem) {
    this.showForm = true;
    this.isEditing = true;
    this.shouldScrollToForm = true; // Activar scroll automático
    
    // Para nivelesactividad, el id puede venir como idNivel
    // Para indicadores, el id viene como idIndicador
    // Para tiposevidencia, el id viene como idTipoEvidencia
    // Para rolesequipo, el id viene como idRolEquipo
    if (this.selectedCatalogo === 'indicadores') {
      this.editingId = item.id || (item as any).idIndicador;
      // Obtener el indicador completo desde la lista para tener acceso a todos los campos
      const indicadorCompleto = this.indicadores().find(ind => ind.idIndicador === this.editingId);
      if (indicadorCompleto) {
        // Convertir activo de 1/0 a boolean correctamente
        let activoValue: boolean = true;
        const activoRaw = (indicadorCompleto as any).activo !== undefined ? (indicadorCompleto as any).activo : 
                         ((indicadorCompleto as any).Activo !== undefined ? (indicadorCompleto as any).Activo : undefined);
        if (activoRaw !== undefined) {
          // Manejar tanto boolean como number (1/0)
          if (typeof activoRaw === 'number') {
            activoValue = activoRaw === 1;
          } else {
            activoValue = activoRaw === true;
          }
        }
        this.form.patchValue({ 
          codigo: indicadorCompleto.codigo || '', 
          nombre: indicadorCompleto.nombre || '', 
          descripcion: indicadorCompleto.descripcion || '',
          anio: indicadorCompleto.anio !== undefined && indicadorCompleto.anio !== null ? indicadorCompleto.anio : null,
          meta: indicadorCompleto.meta !== undefined && indicadorCompleto.meta !== null ? indicadorCompleto.meta : null,
          activo: activoValue
        });
        this.updateFormValidation();
        return;
      }
    } else if (this.selectedCatalogo === 'nivelesactividad') {
      this.editingId = item.id || (item as any).idNivel;
    } else if (this.selectedCatalogo === 'tiposevidencia') {
      this.editingId = item.id || (item as any).idTipoEvidencia;
    } else if (this.selectedCatalogo === 'rolesequipo') {
      this.editingId = item.id || (item as any).idRolEquipo;
    } else if (this.selectedCatalogo === 'roles') {
      this.editingId = item.id || (item as any).idRol;
      // Obtener el rol completo desde el backend para asegurar que tenemos los permisos actualizados
      if (!this.editingId) {
        console.error('❌ [EDIT ROLE] ID inválido para editar rol');
        return;
      }
      
      // Mostrar indicador de carga
      this.isLoading.set(true);
      
      console.log('📋 [EDIT ROLE] Obteniendo rol completo desde el backend, ID:', this.editingId);
      this.catalogosService.getRoleById(this.editingId).subscribe({
        next: (rolCompleto) => {
          console.log('📋 [EDIT ROLE] Rol obtenido del backend (completo):', JSON.stringify(rolCompleto, null, 2));
          
          const activoValue = rolCompleto.activo !== undefined ? rolCompleto.activo : true;
          // Obtener permisosIds del rol - según documentación, viene directamente como array
          let permisosIds: number[] = [];
          
          // Prioridad 1: permisosIds directo (según documentación)
          if (rolCompleto.permisosIds && Array.isArray(rolCompleto.permisosIds)) {
            permisosIds = rolCompleto.permisosIds.filter((id: any) => typeof id === 'number' && id > 0);
            console.log('✅ [EDIT ROLE] PermisosIds encontrados directamente:', permisosIds);
          }
          // Prioridad 2: Extraer de array de objetos permisos
          else if (rolCompleto.permisos && Array.isArray(rolCompleto.permisos)) {
            permisosIds = rolCompleto.permisos
              .map((p: any) => p.idPermiso || p.IdPermiso || p.id || p.Id || 0)
              .filter((id: number) => id > 0);
            console.log('✅ [EDIT ROLE] PermisosIds extraídos de array permisos:', permisosIds);
          }
          
          console.log('📋 [EDIT ROLE] PermisosIds finales para el formulario:', permisosIds);
          console.log('📋 [EDIT ROLE] Valor actual de permisosIds en el form:', this.form.get('permisosIds')?.value);
          
          this.form.patchValue({
            nombre: rolCompleto.nombre || '',
            descripcion: rolCompleto.descripcion || '',
            activo: activoValue === true || activoValue === 1,
            permisosIds: permisosIds
          });
          
          // Forzar detección de cambios para actualizar los checkboxes
          setTimeout(() => {
            console.log('📋 [EDIT ROLE] Valor después de patchValue:', this.form.get('permisosIds')?.value);
            this.updateFormValidation();
            this.isLoading.set(false);
          }, 100);
        },
        error: (err) => {
          console.error('❌ [EDIT ROLE] Error obteniendo rol del backend:', err);
          console.error('❌ [EDIT ROLE] Error details:', {
            status: err.status,
            statusText: err.statusText,
            message: err.message,
            error: err.error
          });
          this.isLoading.set(false);
          
          // Fallback: usar el rol de la lista local
          const rolCompleto = this.roles().find(r => r.id === this.editingId);
          if (rolCompleto) {
            console.warn('⚠️ [EDIT ROLE] Usando rol de la lista local como fallback');
            const activoValue = (rolCompleto as any).activo !== undefined ? (rolCompleto as any).activo : true;
            let permisosIds: number[] = [];
            if ((rolCompleto as any).permisosIds && Array.isArray((rolCompleto as any).permisosIds)) {
              permisosIds = (rolCompleto as any).permisosIds.filter((id: number) => id > 0);
            } else if ((rolCompleto as any).permisos && Array.isArray((rolCompleto as any).permisos)) {
              permisosIds = (rolCompleto as any).permisos
                .map((p: any) => p.idPermiso || p.IdPermiso || p.id || p.Id || 0)
                .filter((id: number) => id > 0);
            }
            
            this.form.patchValue({
              nombre: rolCompleto.nombre || '',
              descripcion: rolCompleto.descripcion || '',
              activo: activoValue === true || activoValue === 1,
              permisosIds: permisosIds
            });
            this.updateFormValidation();
          }
        }
      });
      return;
    } else if (this.selectedCatalogo === 'carreras') {
      this.editingId = item.id || (item as any).idCarrera;
      // Obtener la carrera completa desde la lista para tener acceso a todos los campos
      const carreraCompleta = this.carreras().find(c => c.idCarrera === this.editingId);
      if (carreraCompleta) {
        this.form.patchValue({ 
          codigo: carreraCompleta.codigo || '', 
          nombre: carreraCompleta.nombre || '', 
          descripcion: carreraCompleta.descripcion || '',
          departamentoId: carreraCompleta.departamentoId || null,
          activo: carreraCompleta.activo !== undefined ? carreraCompleta.activo : true
        });
        this.updateFormValidation();
        return;
      }
    } else if (this.selectedCatalogo === 'actividades-anuales') {
      this.editingId = item.id || (item as any).idActividadAnual;
      const actividadCompleta = this.actividadesAnuales().find(a => a.idActividadAnual === this.editingId);
      if (actividadCompleta) {
        const activoValue = actividadCompleta.activo !== undefined ? actividadCompleta.activo : true;
        this.form.patchValue({
          nombre: actividadCompleta.nombre || '',
          descripcion: actividadCompleta.descripcion || '',
          idIndicador: actividadCompleta.idIndicador || null,
          activo: activoValue === true
          // No incluimos anio porque se maneja automáticamente
        });
        this.updateFormValidation();
        return;
      }
    } else if (this.selectedCatalogo === 'actividades-mensuales') {
      this.editingId = item.id || (item as any).idActividadMensualInst;
      const actividadCompleta = this.actividadesMensuales().find(a => a.idActividadMensualInst === this.editingId);
      if (actividadCompleta) {
        const activoValue = actividadCompleta.activo !== undefined ? actividadCompleta.activo : true;
        this.form.patchValue({
          nombre: actividadCompleta.nombre || '',
          descripcion: actividadCompleta.descripcion || '',
          idActividadAnual: actividadCompleta.idActividadAnual || null,
          activo: activoValue === true
          // No incluimos mes ni anio porque se manejan automáticamente
        });
        this.updateFormValidation();
        return;
      }
    } else if (this.selectedCatalogo === 'capacidadesinstaladas') {
      this.editingId = item.id;
      const capacidadCompleta = this.capacidadesinstaladas().find(c => c.id === this.editingId);
      if (capacidadCompleta) {
        const activoValue = (capacidadCompleta as any).activo !== undefined ? (capacidadCompleta as any).activo : true;
        this.form.patchValue({
          nombre: capacidadCompleta.nombre || '',
          descripcion: capacidadCompleta.descripcion || '',
          departamentoId: capacidadCompleta.departamentoId || null,
          tipoUnidadId: capacidadCompleta.tipoUnidadId || null,
          activo: activoValue === true
        });
        this.updateFormValidation();
        return;
      }
    } else {
      this.editingId = item.id;
    }
    this.updateFormValidation();
    
    // Para estadosactividad, también buscar NombreEstado
    const nombreValue = this.selectedCatalogo === 'estadosactividad' 
      ? (item.nombre || (item as any).NombreEstado || '')
      : item.nombre;
    
    // Obtener el valor de activo si el catálogo lo tiene
    let activoValue: boolean | undefined = undefined;
    if (this.hasEstadoData()) {
      const activo = (item as any).activo !== undefined ? (item as any).activo : undefined;
      if (activo !== undefined && activo !== null) {
        // Convertir número (1/0) a boolean si es necesario
        activoValue = activo === true || activo === 1;
      } else {
        activoValue = true; // Por defecto activo
      }
    }
    
    const patchValue: any = { 
      codigo: item.codigo || '', 
      nombre: nombreValue || '', 
      descripcion: item.descripcion || '',
      anio: (item as any).anio !== undefined ? (item as any).anio : ((item as any).Anio !== undefined ? (item as any).Anio : null),
      meta: (item as any).meta !== undefined ? (item as any).meta : ((item as any).Meta !== undefined ? (item as any).Meta : null),
      color: (item as any).color || (item as any).Color || '#3B82F6'
    };
    
    // Agregar activo solo si el catálogo lo tiene
    if (activoValue !== undefined) {
      patchValue.activo = activoValue;
    }
    
    this.form.patchValue(patchValue);
  }

  togglePermiso(permisoId: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const permisosIds = this.form.get('permisosIds')?.value || [];
    let nuevosPermisosIds: number[];
    
    if (checkbox.checked) {
      // Agregar el permiso si no está ya en la lista
      nuevosPermisosIds = [...permisosIds, permisoId];
    } else {
      // Remover el permiso de la lista
      nuevosPermisosIds = permisosIds.filter((id: number) => id !== permisoId);
    }
    
    this.form.patchValue({ permisosIds: nuevosPermisosIds });
  }

  toggleTodosPermisosSeccion(modulo: string, seleccionar: boolean): void {
    const grupo = this.permisosAgrupados().find(g => g.modulo === modulo);
    if (!grupo) return;
    
    const permisosIds = this.form.get('permisosIds')?.value || [];
    let nuevosPermisosIds: number[];
    
    if (seleccionar) {
      // Agregar todos los permisos de la sección que no estén ya seleccionados
      const idsSeccion = grupo.permisos.map(p => p.id);
      const idsNuevos = idsSeccion.filter(id => !permisosIds.includes(id));
      nuevosPermisosIds = [...permisosIds, ...idsNuevos];
    } else {
      // Remover todos los permisos de la sección
      const idsSeccion = grupo.permisos.map(p => p.id);
      nuevosPermisosIds = permisosIds.filter((id: number) => !idsSeccion.includes(id));
    }
    
    this.form.patchValue({ permisosIds: nuevosPermisosIds });
  }

  todosPermisosSeccionSeleccionados(modulo: string): boolean {
    const grupo = this.permisosAgrupados().find(g => g.modulo === modulo);
    if (!grupo || grupo.permisos.length === 0) return false;
    
    const permisosIds = this.form.get('permisosIds')?.value || [];
    return grupo.permisos.every(p => permisosIds.includes(p.id));
  }

  algunosPermisosSeccionSeleccionados(modulo: string): boolean {
    const grupo = this.permisosAgrupados().find(g => g.modulo === modulo);
    if (!grupo || grupo.permisos.length === 0) return false;
    
    const permisosIds = this.form.get('permisosIds')?.value || [];
    const seleccionados = grupo.permisos.filter(p => permisosIds.includes(p.id));
    return seleccionados.length > 0 && seleccionados.length < grupo.permisos.length;
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToForm && this.formContainer) {
      setTimeout(() => {
        this.formContainer.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.shouldScrollToForm = false;
      }, 100);
    }
  }

  deleteItem(id: number | undefined) {
    console.log('🔄 DELETE ITEM - Iniciando eliminación');
    console.log('🔄 DELETE ITEM - ID:', id);
    console.log('🔄 DELETE ITEM - Catálogo seleccionado:', this.selectedCatalogo);
    
    if (!id) {
      console.error('❌ DELETE ITEM - ID inválido:', id);
      this.alertService.error('Error', 'ID inválido para eliminar');
      return;
    }

    // Obtener el nombre del elemento antes de eliminarlo
    let nombreElemento = 'el elemento';
    try {
      switch (this.selectedCatalogo) {
        case 'departamentos': {
          const item = this.departamentos().find(d => d.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'generos': {
          const item = this.generos().find(g => g.id === id);
          nombreElemento = item?.codigo || item?.descripcion || nombreElemento;
          break;
        }
        case 'estadoestudiantes': {
          const item = this.estadoestudiantes().find(e => e.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'estadoparticipaciones': {
          const item = this.estadoparticipaciones().find(e => e.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'estadosproyecto': {
          const item = this.estadosproyecto().find(e => e.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'categoriaparticipaciones': {
          const item = this.categoriaparticipaciones().find(c => c.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'categoriaactividades': {
          const item = this.categoriaactividades().find(c => c.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'tiposactividad': {
          const item = this.tiposactividad().find(t => t.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'tiposunidad': {
          const item = this.tiposunidad().find(t => t.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'tiposiniciativas': {
          const item = this.tiposiniciativas().find(t => t.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'tiposinvestigaciones': {
          const item = this.tiposinvestigaciones().find(t => t.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'tiposdocumentos': {
          const item = this.tiposdocumentos().find(t => t.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'tiposdocumentosdivulgados': {
          const item = this.tiposdocumentosdivulgados().find(t => t.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'tiposevidencia': {
          const item = this.tiposevidencia().find(t => t.idTipoEvidencia === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'tiposprotagonista': {
          const item = this.tiposprotagonista().find(t => t.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'areasconocimiento': {
          const item = this.areasconocimiento().find(a => a.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'estadosactividad': {
          const item = this.estadosactividad().find(e => e.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'nivelesactividad': {
          const item = this.nivelesactividad().find(n => n.idNivel === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'nivelesacademico': {
          const item = this.nivelesacademico().find(n => n.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'rolesequipo': {
          const item = this.rolesequipo().find(r => r.idRolEquipo === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'rolesresponsable': {
          const item = this.rolesresponsable().find(r => r.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'roles': {
          const item = this.roles().find(r => r.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'indicadores': {
          const item = this.indicadores().find(i => i.idIndicador === id);
          nombreElemento = item?.codigo || item?.nombre || nombreElemento;
          break;
        }
        case 'carreras': {
          const item = this.carreras().find(c => c.idCarrera === id);
          nombreElemento = item?.nombre || item?.codigo || nombreElemento;
          break;
        }
        case 'actividades-anuales': {
          const item = this.actividadesAnuales().find(a => a.idActividadAnual === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'actividades-mensuales': {
          const item = this.actividadesMensuales().find(a => a.idActividadMensualInst === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
        case 'capacidadesinstaladas': {
          const item = this.capacidadesinstaladas().find(c => c.id === id);
          nombreElemento = item?.nombre || nombreElemento;
          break;
        }
      }
    } catch (error) {
      console.error('Error obteniendo nombre del elemento:', error);
    }

    // Mostrar confirmación
    this.alertService.confirmDelete(
      nombreElemento !== 'el elemento' ? nombreElemento : undefined,
      'Esta acción no se puede deshacer.'
    ).then((result) => {
      if (result.isConfirmed) {
        let obs: Observable<unknown>;
        switch (this.selectedCatalogo) {
          case 'departamentos': obs = this.catalogosService.deleteDepartamento(id); break;
          case 'generos': obs = this.catalogosService.deleteGenero(id); break;
          case 'estadoestudiantes': obs = this.catalogosService.deleteEstadoEstudiante(id); break;
          case 'estadoparticipaciones': obs = this.catalogosService.deleteEstadoParticipacion(id); break;
          case 'estadosproyecto': obs = this.catalogosService.deleteEstadoProyecto(id); break;
          case 'categoriaparticipaciones': obs = this.catalogosService.deleteCategoriaParticipacion(id); break;
          case 'categoriaactividades': obs = this.catalogosService.deleteCategoriaActividad(id); break;
          case 'tiposactividad': obs = this.catalogosService.deleteTipoActividad(id); break;
          case 'tiposunidad': obs = this.catalogosService.deleteTipoUnidad(id); break;
          case 'tiposiniciativas': obs = this.catalogosService.deleteTipoIniciativa(id); break;
          case 'tiposinvestigaciones': obs = this.catalogosService.deleteTipoInvestigacion(id); break;
          case 'tiposdocumentos': obs = this.catalogosService.deleteTipoDocumento(id); break;
          case 'tiposdocumentosdivulgados': obs = this.catalogosService.deleteTipoDocumentoDivulgado(id); break;
          case 'tiposevidencia': obs = this.catalogosService.deleteTipoEvidencia(id); break;
          case 'tiposprotagonista': obs = this.catalogosService.deleteTipoProtagonista(id); break;
          case 'areasconocimiento': obs = this.catalogosService.deleteAreaConocimiento(id); break;
          case 'estadosactividad': obs = this.catalogosService.deleteEstadoActividad(id); break;
          case 'nivelesactividad': obs = this.catalogosService.deleteNivelActividad(id); break;
          case 'nivelesacademico': obs = this.catalogosService.deleteNivelAcademico(id); break;
          case 'rolesequipo': obs = this.catalogosService.deleteRolEquipo(id); break;
          case 'rolesresponsable': obs = this.catalogosService.deleteRolResponsable(id); break;
          case 'roles': obs = this.catalogosService.deleteRole(id); break;
          case 'indicadores': obs = this.indicadorService.delete(id); break;
          case 'carreras': obs = this.catalogosService.deleteCarrera(id); break;
          case 'actividades-anuales': obs = this.actividadAnualService.delete(id); break;
          case 'actividades-mensuales': obs = this.actividadMensualInstService.delete(id); break;
          case 'capacidadesinstaladas': obs = this.catalogosService.deleteCapacidadInstalada(id); break;
          default:
            console.error('Unknown catalog type for deletion:', this.selectedCatalogo);
            this.alertService.error('Error', 'Tipo de catálogo desconocido');
            return;
        }
        
        obs.subscribe({
          next: () => {
            this.loadAllCatalogos();
            // Mostrar alerta de éxito
            this.alertService.success(
              '¡Elemento eliminado exitosamente!',
              `"${nombreElemento}" ha sido eliminado correctamente.`
            );
          },
          error: (err: any) => {
            console.error('Error deleting item:', err);
            let errorMessage = 'Error desconocido';
            if (err.error) {
              if (err.error.message) {
                errorMessage = err.error.message;
              } else if (typeof err.error === 'string') {
                errorMessage = err.error;
              }
            } else if (err.message) {
              errorMessage = err.message;
            }
            // Mostrar alerta de error
            this.alertService.error(
              'Error al eliminar el elemento',
              `No se pudo eliminar "${nombreElemento}". ${errorMessage}`
            );
          }
        });
      }
    });
  }

  cancelEdit() {
    this.showForm = false;
    this.isEditing = false;
    this.editingId = null;
    this.form.reset();
  }

  validarAnio(): void {
    if (this.selectedCatalogo !== 'indicadores') return;
    
    const anio = this.form.value.anio;
    if (anio === null || anio === undefined) return;
    
    const anioActual = new Date().getFullYear();
    const anioIngresado = Number(anio);
    
    if (anioIngresado < anioActual) {
      this.alertService.error(
        'Año inválido',
        `El año no puede ser menor al año actual (${anioActual}). Por favor, ingrese un año válido.`
      );
      this.form.patchValue({ anio: null });
      return;
    }
    
    if (anioIngresado > anioActual) {
      this.alertService.confirm(
        'Confirmar año',
        `¿Está seguro de que el año ${anioIngresado} es correcto? El año actual es ${anioActual}.`
      ).then((result) => {
        if (!result.isConfirmed) {
          this.form.patchValue({ anio: null });
        }
      });
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      console.log('Form is invalid:', this.form.errors);
      console.log('Form controls:', this.form.controls);
      return;
    }

    const codigo = this.form.value.codigo as string;
    const nombre = this.form.value.nombre as string;
    const descripcion = this.form.value.descripcion as string;
    const anio = this.form.value.anio;
    const meta = this.form.value.meta;
    const color = this.form.value.color as string;
    const activo = this.form.value.activo as boolean | undefined;
    
    // Validar año antes de enviar
    if (this.selectedCatalogo === 'indicadores' && anio !== null && anio !== undefined) {
      const anioActual = new Date().getFullYear();
      const anioIngresado = Number(anio);
      
      if (anioIngresado < anioActual) {
        alert(`El año no puede ser menor al año actual (${anioActual}). Por favor, ingrese un año válido.`);
        return;
      }
    }
    
    console.log('Form values:', { codigo, nombre, descripcion, anio, meta, color });
    console.log('Selected catalog:', this.selectedCatalogo);
    
    let data: any;
    if (this.selectedCatalogo === 'generos') {
      data = { codigo, descripcion };
    } else if (this.selectedCatalogo === 'indicadores') {
      // Para indicadores, necesitamos tanto codigo como nombre, y opcionalmente año y meta
      data = { 
        codigo, 
        nombre, 
        descripcion,
        anio: anio !== null && anio !== undefined ? Number(anio) : undefined,
        meta: meta !== null && meta !== undefined ? Number(meta) : undefined,
        activo: activo !== undefined ? activo : true
      };
    } else if (this.selectedCatalogo === 'estadosactividad') {
      // Para estadosactividad, incluir color
      data = { nombre, descripcion, color: color || '#3B82F6' };
    } else if (this.selectedCatalogo === 'carreras') {
      // Para carreras, incluir código y departamentoId
      const departamentoId = (this.form.get('departamentoId')?.value as number) || null;
      data = { nombre, codigo, descripcion, departamentoId, activo };
    } else if (this.selectedCatalogo === 'roles') {
      // Para roles, incluir permisosIds
      const permisosIds = (this.form.get('permisosIds')?.value as number[]) || [];
      data = { nombre, descripcion, activo, permisosIds };
    } else if (this.hasEstadoData()) {
      // Para catálogos con campo activo, incluir el valor
      data = { nombre, descripcion, activo };
    } else {
      data = { nombre, descripcion };
    }

    console.log('Data to send:', data);

    if (this.isEditing && this.editingId) {
      this.updateItem(this.editingId, data);
    } else {
      this.createItem(data);
    }
  }

  createItem(data: { nombre?: string, codigo?: string, descripcion?: string, anio?: number, meta?: number, nombreJefe?: string, correoJefe?: string, telefonoJefe?: string }) {
    console.log('🔄 CREATE ITEM - Iniciando creación');
    console.log('🔄 CREATE ITEM - Datos:', data);
    console.log('🔄 CREATE ITEM - Catálogo seleccionado:', this.selectedCatalogo);
    
    let obs: Observable<any>;
    
    switch (this.selectedCatalogo) {
      case 'departamentos': 
        if (!data.nombre) {
          console.error('Invalid data for departamento:', data);
          return;
        }
        obs = this.catalogosService.createDepartamento({ 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: true
        } as any); 
        break;
        
      case 'generos': 
        console.log('Creating genero with data:', data);
        console.log('Data type check - codigo:', typeof data.codigo, 'value:', data.codigo);
        console.log('Data type check - descripcion:', typeof data.descripcion, 'value:', data.descripcion);
        
        // Validar que los datos no estén vacíos
        if (!data.codigo || !data.descripcion) {
          console.error('Invalid data for genero:', data);
          return;
        }
        
        // Verificar que los datos no sean solo espacios en blanco
        if (data.codigo.trim() === '' || data.descripcion.trim() === '') {
          console.error('Empty data for genero:', data);
          return;
        }
        
        obs = this.catalogosService.createGenero({ codigo: data.codigo, descripcion: data.descripcion });
        break;
        
      case 'estadoestudiantes': 
        if (!data.nombre) {
          console.error('Invalid data for estado estudiante:', data);
          return;
        }
        obs = this.catalogosService.createEstadoEstudiante({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'estadoparticipaciones': 
        if (!data.nombre) {
          console.error('Invalid data for estado participacion:', data);
          return;
        }
        obs = this.catalogosService.createEstadoParticipacion({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'estadosproyecto': 
        if (!data.nombre) {
          console.error('Invalid data for estado proyecto:', data);
          return;
        }
        obs = this.catalogosService.createEstadoProyecto({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'categoriaparticipaciones': 
        if (!data.nombre) {
          console.error('Invalid data for categoria participacion:', data);
          return;
        }
        obs = this.catalogosService.createCategoriaParticipacion({ 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: true
        } as any); 
        break;
        
      case 'categoriaactividades': 
        if (!data.nombre) {
          console.error('Invalid data for categoria actividad:', data);
          return;
        }
        obs = this.catalogosService.createCategoriaActividad({ 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: true
        } as any); 
        break;
        
      case 'tiposactividad': 
        if (!data.nombre) {
          console.error('Invalid data for tipo actividad:', data);
          return;
        }
        obs = this.catalogosService.createTipoActividad({ 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: true
        } as any); 
        break;
        
      case 'tiposunidad': 
        if (!data.nombre) {
          console.error('Invalid data for tipo unidad:', data);
          return;
        }
        obs = this.catalogosService.createTipoUnidad({ 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: true
        } as any); 
        break;
        
      case 'tiposiniciativas': 
        if (!data.nombre) {
          console.error('Invalid data for tipo iniciativa:', data);
          return;
        }
        obs = this.catalogosService.createTipoIniciativa({ 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: true
        } as any); 
        break;
        
      case 'tiposinvestigaciones': 
        if (!data.nombre) {
          console.error('Invalid data for tipo investigacion:', data);
          return;
        }
        obs = this.catalogosService.createTipoInvestigacion({ 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: true
        } as any); 
        break;
        
      case 'tiposdocumentos': 
        if (!data.nombre) {
          console.error('Invalid data for tipo documento:', data);
          return;
        }
        obs = this.catalogosService.createTipoDocumento({ 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: true
        } as any); 
        break;
        
      case 'tiposdocumentosdivulgados': 
        if (!data.nombre) {
          console.error('Invalid data for tipo documento divulgado:', data);
          return;
        }
        obs = this.catalogosService.createTipoDocumentoDivulgado({ 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: true
        } as any); 
        break;
        
      case 'tiposevidencia': 
        if (!data.nombre) {
          console.error('Invalid data for tipo evidencia:', data);
          return;
        }
        obs = this.catalogosService.createTipoEvidencia({ nombre: data.nombre, descripcion: data.descripcion || '', activo: true }); 
        break;
        
      case 'tiposprotagonista': 
        if (!data.nombre) {
          console.error('Invalid data for tipo protagonista:', data);
          return;
        }
        obs = this.catalogosService.createTipoProtagonista({ nombre: data.nombre, descripcion: data.descripcion || '', activo: true }); 
        break;
        
      case 'areasconocimiento': 
        if (!data.nombre) {
          console.error('Invalid data for area conocimiento:', data);
          return;
        }
        obs = this.catalogosService.createAreaConocimiento({ 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: true
        } as any); 
        break;
        
      case 'estadosactividad': 
        if (!data.nombre) {
          console.error('Invalid data for estado actividad:', data);
          return;
        }
        const colorValue = (data as any).color || '#3B82F6';
        obs = this.catalogosService.createEstadoActividad({ 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          color: colorValue
        }); 
        break;
        
        
      case 'nivelesactividad': 
        if (!data.nombre) {
          console.error('Invalid data for nivel actividad:', data);
          return;
        }
        obs = this.catalogosService.createNivelActividad({ nombre: data.nombre, descripcion: data.descripcion || '', activo: true }); 
        break;
        
      case 'nivelesacademico': 
        if (!data.nombre) {
          console.error('Invalid data for nivel academico:', data);
          return;
        }
        obs = this.catalogosService.createNivelAcademico({ 
          nombre: data.nombre,
          activo: true
        } as any); 
        break;
        
      case 'rolesequipo': 
        if (!data.nombre) {
          console.error('Invalid data for rol equipo:', data);
          return;
        }
        obs = this.catalogosService.createRolEquipo({ nombre: data.nombre, descripcion: data.descripcion || '', activo: true }); 
        break;
        
      case 'rolesresponsable': 
        if (!data.nombre) {
          console.error('Invalid data for rol responsable:', data);
          return;
        }
        obs = this.catalogosService.createRolResponsable({ nombre: data.nombre, descripcion: data.descripcion || '', activo: true }); 
        break;
        
      case 'roles': 
        if (!data.nombre) {
          console.error('Invalid data for role:', data);
          return;
        }
        const permisosIds = Array.isArray((data as any).permisosIds) ? (data as any).permisosIds : [];
        // Asegurar que activo sea siempre un boolean
        let activoValue: boolean = true;
        if ((data as any).activo !== undefined && (data as any).activo !== null) {
          const activoRaw = (data as any).activo;
          if (typeof activoRaw === 'boolean') {
            activoValue = activoRaw;
          } else if (typeof activoRaw === 'string') {
            activoValue = activoRaw.toLowerCase() === 'true' || activoRaw === '1';
          } else if (typeof activoRaw === 'number') {
            activoValue = activoRaw === 1;
          } else {
            activoValue = Boolean(activoRaw);
          }
        }
        obs = this.catalogosService.createRole({ 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: activoValue, // Siempre boolean
          permisosIds: permisosIds.length > 0 ? permisosIds : undefined
        } as any); 
        break;
        
      case 'indicadores':
        if (!data.codigo || !data.nombre) {
          console.error('Invalid data for indicador:', data);
          return;
        }
        obs = this.indicadorService.create({ 
          codigo: data.codigo.trim(), 
          nombre: data.nombre.trim(), 
          descripcion: data.descripcion?.trim() || undefined,
          anio: data.anio,
          meta: data.meta,
          activo: true
        });
        break;
        
      case 'carreras':
        const departamentoId = (this.form.get('departamentoId')?.value as number) || null;
        if (!data.nombre || !departamentoId) {
          console.error('Invalid data for carrera:', data);
          this.alertService.error('Error de validación', 'El nombre y el departamento son requeridos');
          return;
        }
        obs = this.catalogosService.createCarrera({ 
          nombre: data.nombre.trim(), 
          codigo: data.codigo?.trim() || undefined,
          descripcion: data.descripcion?.trim() || undefined,
          departamentoId: departamentoId,
          activo: true
        } as any);
        break;
      case 'actividades-anuales':
        const idIndicador = (this.form.get('idIndicador')?.value as number) || null;
        if (!idIndicador || !data.nombre) {
          this.alertService.error('Error de validación', 'El indicador y el nombre son requeridos');
          return;
        }
        obs = this.actividadAnualService.create({
          idIndicador,
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || undefined,
          activo: true
          // anio se agrega automáticamente (año actual) en el servicio
        });
        break;
      case 'actividades-mensuales':
        const idActividadAnual = (this.form.get('idActividadAnual')?.value as number) || null;
        if (!idActividadAnual || !data.nombre) {
          this.alertService.error('Error de validación', 'La actividad anual y el nombre son requeridos');
          return;
        }
        obs = this.actividadMensualInstService.create({
          idActividadAnual,
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || undefined,
          activo: true
          // mes y anio se agregan automáticamente en el backend
        });
        break;
      case 'capacidadesinstaladas':
        if (!data.nombre) {
          this.alertService.error('Error de validación', 'El nombre de la instalación es requerido');
          return;
        }
        obs = this.catalogosService.createCapacidadInstalada({
          nombreInstalacion: data.nombre.trim(),
          descripcionFuncionalidad: data.descripcion?.trim() || undefined,
          departamentoId: (this.form.get('departamentoId')?.value as number) || undefined,
          tipoUnidadId: (this.form.get('tipoUnidadId')?.value as number) || undefined,
          activo: true
        } as any);
        break;
      default:
        console.error('Unknown catalog type:', this.selectedCatalogo);
        return;
    }
    
    // Obtener el nombre del elemento para la alerta
    const nombreElemento = data.nombre || data.codigo || 'el elemento';
    
    obs.subscribe({
      next: (createdItem) => {
        // Recargar todos los catálogos
        this.loadAllCatalogos();
        
        // Si es un rol, recargar específicamente ese rol para obtener los permisos
        if (this.selectedCatalogo === 'roles' && createdItem && createdItem.id) {
          setTimeout(() => {
            this.catalogosService.getRoleById(createdItem.id).subscribe({
              next: (rolCreado) => {
                // Actualizar el rol en la lista local
                const rolesActuales = this.roles();
                const index = rolesActuales.findIndex(r => r.id === rolCreado.id);
                if (index >= 0) {
                  rolesActuales[index] = rolCreado;
                  this.roles.set([...rolesActuales]);
                  console.log('✅ Rol creado actualizado en la lista local con permisos:', rolCreado);
                } else {
                  // Si no está en la lista, agregarlo
                  this.roles.set([...rolesActuales, rolCreado]);
                  console.log('✅ Rol creado agregado a la lista local con permisos:', rolCreado);
                }
              },
              error: (err) => {
                console.warn('⚠️ No se pudo recargar el rol creado, pero se recargaron todos los catálogos:', err);
              }
            });
          }, 500); // Esperar un poco para que el backend procese
        }
        
        this.cancelEdit();
        // Mostrar alerta de éxito
        this.alertService.success(
          '¡Elemento creado exitosamente!',
          `"${nombreElemento}" ha sido creado correctamente.`
        );
      },
      error: (err: any) => {
        console.error('Error creating item:', err);
        console.error('Error details:', err.error);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Validation errors:', err.error?.errors);
        console.error('Full error object:', JSON.stringify(err, null, 2));
        
        // Construir mensaje de error
        let errorMessage = 'Error desconocido';
        if (err.error) {
          if (err.error.errors) {
            const validationErrors = err.error.errors;
            const errorMessages = Object.keys(validationErrors).map(key => {
              const messages = Array.isArray(validationErrors[key])
                ? validationErrors[key].join(', ')
                : validationErrors[key];
              return `${key}: ${messages}`;
            });
            errorMessage = `Errores de validación:\n${errorMessages.join('\n')}`;
          } else if (err.error.message) {
            errorMessage = err.error.message;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        // Mostrar alerta de error
        this.alertService.error(
          'Error al crear el elemento',
          `No se pudo crear "${nombreElemento}". ${errorMessage}`
        );
      }
    });
  }

  updateItem(id: number, data: { nombre?: string, codigo?: string, descripcion?: string, anio?: number, meta?: number, nombreJefe?: string, correoJefe?: string, telefonoJefe?: string, activo?: boolean }) {
    console.log('🔄 UPDATE ITEM - Iniciando actualización');
    console.log('🔄 UPDATE ITEM - ID:', id);
    console.log('🔄 UPDATE ITEM - Datos:', data);
    console.log('🔄 UPDATE ITEM - Catálogo seleccionado:', this.selectedCatalogo);
    
    let obs: Observable<any>;
    
    switch (this.selectedCatalogo) {
      case 'departamentos': 
        if (!data.nombre) {
          console.error('Invalid data for departamento:', data);
          return;
        }
        obs = this.catalogosService.updateDepartamento(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: data.activo !== undefined ? data.activo : true
        } as any); 
        break;
        
      case 'generos': 
        if (!data.codigo || !data.descripcion) {
          console.error('Invalid data for genero:', data);
          return;
        }
        obs = this.catalogosService.updateGenero(id, { codigo: data.codigo, descripcion: data.descripcion }); 
        break;
        
      case 'estadoestudiantes': 
        if (!data.nombre || !id) {
          console.error('Invalid data for estado estudiante:', { data, id });
          this.alertService.error('Error de validación', 'Datos inválidos para actualizar estado de estudiante');
          return;
        }
        obs = this.catalogosService.updateEstadoEstudiante(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'estadoparticipaciones': 
        if (!data.nombre) {
          console.error('Invalid data for estado participacion:', data);
          return;
        }
        obs = this.catalogosService.updateEstadoParticipacion(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'estadosproyecto': 
        if (!data.nombre) {
          console.error('Invalid data for estado proyecto:', data);
          return;
        }
        obs = this.catalogosService.updateEstadoProyecto(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'categoriaparticipaciones': 
        if (!data.nombre) {
          console.error('Invalid data for categoria participacion:', data);
          return;
        }
        obs = this.catalogosService.updateCategoriaParticipacion(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: data.activo !== undefined ? data.activo : true
        } as any); 
        break;
        
      case 'categoriaactividades': 
        if (!data.nombre) {
          console.error('Invalid data for categoria actividad:', data);
          return;
        }
        obs = this.catalogosService.updateCategoriaActividad(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: data.activo !== undefined ? data.activo : true
        } as any); 
        break;
        
      case 'tiposactividad': 
        if (!data.nombre) {
          console.error('Invalid data for tipo actividad:', data);
          return;
        }
        obs = this.catalogosService.updateTipoActividad(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: data.activo !== undefined ? data.activo : true
        } as any); 
        break;
        
      case 'tiposunidad': 
        if (!data.nombre) {
          console.error('Invalid data for tipo unidad:', data);
          return;
        }
        obs = this.catalogosService.updateTipoUnidad(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: data.activo !== undefined ? data.activo : true
        } as any); 
        break;
        
      case 'tiposiniciativas': 
        if (!data.nombre) {
          console.error('Invalid data for tipo iniciativa:', data);
          return;
        }
        obs = this.catalogosService.updateTipoIniciativa(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: data.activo !== undefined ? data.activo : true
        } as any); 
        break;
        
      case 'tiposinvestigaciones': 
        if (!data.nombre) {
          console.error('Invalid data for tipo investigacion:', data);
          return;
        }
        obs = this.catalogosService.updateTipoInvestigacion(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: data.activo !== undefined ? data.activo : true
        } as any); 
        break;
        
      case 'tiposdocumentos': 
        if (!data.nombre) {
          console.error('Invalid data for tipo documento:', data);
          return;
        }
        obs = this.catalogosService.updateTipoDocumento(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: data.activo !== undefined ? data.activo : true
        } as any); 
        break;
        
      case 'tiposdocumentosdivulgados': 
        if (!data.nombre) {
          console.error('Invalid data for tipo documento divulgado:', data);
          return;
        }
        obs = this.catalogosService.updateTipoDocumentoDivulgado(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: data.activo !== undefined ? data.activo : true
        } as any); 
        break;
        
      case 'tiposevidencia': 
        if (!data.nombre) {
          console.error('Invalid data for tipo evidencia:', data);
          return;
        }
        obs = this.catalogosService.updateTipoEvidencia(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '', 
          activo: data.activo !== undefined ? data.activo : true
        }); 
        break;
        
      case 'tiposprotagonista': 
        if (!data.nombre) {
          console.error('Invalid data for tipo protagonista:', data);
          return;
        }
        obs = this.catalogosService.updateTipoProtagonista(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '', 
          activo: data.activo !== undefined ? data.activo : true
        }); 
        break;
        
      case 'areasconocimiento': 
        if (!data.nombre) {
          console.error('Invalid data for area conocimiento:', data);
          return;
        }
        obs = this.catalogosService.updateAreaConocimiento(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: data.activo !== undefined ? data.activo : true
        } as any); 
        break;
        
      case 'estadosactividad': 
        if (!data.nombre) {
          console.error('Invalid data for estado actividad:', data);
          return;
        }
        const updateColorValue = (data as any).color || '#3B82F6';
        obs = this.catalogosService.updateEstadoActividad(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          color: updateColorValue
        }); 
        break;
        
        
      case 'nivelesactividad': 
        if (!data.nombre) {
          console.error('Invalid data for nivel actividad:', data);
          return;
        }
        obs = this.catalogosService.updateNivelActividad(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '', 
          activo: data.activo !== undefined ? data.activo : true
        }); 
        break;
        
      case 'nivelesacademico': 
        if (!data.nombre) {
          console.error('Invalid data for nivel academico:', data);
          return;
        }
        obs = this.catalogosService.updateNivelAcademico(id, { 
          nombre: data.nombre,
          activo: data.activo !== undefined ? data.activo : true
        } as any); 
        break;
        
      case 'rolesequipo': 
        if (!data.nombre) {
          console.error('Invalid data for rol equipo:', data);
          return;
        }
        obs = this.catalogosService.updateRolEquipo(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '', 
          activo: data.activo !== undefined ? data.activo : true
        }); 
        break;
        
      case 'rolesresponsable': 
        if (!data.nombre) {
          console.error('Invalid data for rol responsable:', data);
          return;
        }
        obs = this.catalogosService.updateRolResponsable(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '', 
          activo: data.activo !== undefined ? data.activo : true
        }); 
        break;
        
      case 'roles': 
        if (!data.nombre) {
          console.error('Invalid data for role:', data);
          return;
        }
        const permisosIdsUpdate = Array.isArray((data as any).permisosIds) ? (data as any).permisosIds : [];
        console.log('📤 [UPDATE ROLE] Enviando actualización con permisosIds:', permisosIdsUpdate);
        obs = this.catalogosService.updateRole(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '',
          activo: (data as any).activo !== undefined ? (data as any).activo : true,
          permisosIds: permisosIdsUpdate
        } as any); 
        break;
        
      case 'indicadores':
        if (!data.codigo || !data.nombre) {
          console.error('Invalid data for indicador:', data);
          return;
        }
        // Preparar los datos para actualizar
        // El backend manejará la lógica: si mismo código y año -> actualizar, si mismo código pero año diferente -> crear nuevo
        const updateData: any = {
          codigo: data.codigo.trim(),
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || undefined,
          activo: data.activo !== undefined ? data.activo : true
        };
        
        // Incluir año si está presente (puede ser null/undefined para usar año actual por defecto)
        if (data.anio !== null && data.anio !== undefined) {
          updateData.anio = Number(data.anio);
        }
        
        // Incluir meta si está presente
        if (data.meta !== null && data.meta !== undefined) {
          updateData.meta = Number(data.meta);
        }
        
        console.log('🔄 UPDATE Indicador - Datos a enviar:', JSON.stringify(updateData, null, 2));
        console.log('🔄 UPDATE Indicador - ID:', id);
        console.log('🔄 UPDATE Indicador - Año en datos:', data.anio);
        console.log('🔄 UPDATE Indicador - Año en updateData:', updateData.anio);
        
        obs = this.indicadorService.update(id, updateData);
        break;
        
      case 'carreras':
        const departamentoIdUpdate = (this.form.get('departamentoId')?.value as number) || null;
        const activo = (this.form.get('activo')?.value as boolean) ?? true;
        if (!data.nombre || !departamentoIdUpdate) {
          console.error('Invalid data for carrera:', data);
          alert('El nombre y el departamento son requeridos');
          return;
        }
        obs = this.catalogosService.updateCarrera(id, { 
          nombre: data.nombre.trim(), 
          codigo: data.codigo?.trim() || undefined,
          descripcion: data.descripcion?.trim() || undefined,
          departamentoId: departamentoIdUpdate,
          activo: activo
        });
        break;
      case 'actividades-anuales':
        const idIndicadorUpdate = (this.form.get('idIndicador')?.value as number) || null;
        if (!idIndicadorUpdate || !data.nombre) {
          alert('El indicador y el nombre son requeridos');
          return;
        }
        obs = this.actividadAnualService.update(id, {
          idIndicador: idIndicadorUpdate,
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || undefined,
          activo: data.activo !== undefined ? data.activo : true
        });
        break;
      case 'actividades-mensuales':
        const idActividadAnualUpdate = (this.form.get('idActividadAnual')?.value as number) || null;
        if (!idActividadAnualUpdate || !data.nombre) {
          this.alertService.error('Error de validación', 'La actividad anual y el nombre son requeridos');
          return;
        }
        obs = this.actividadMensualInstService.update(id, {
          idActividadAnual: idActividadAnualUpdate,
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || undefined,
          activo: data.activo !== undefined ? data.activo : true
          // mes y anio se manejan automáticamente en el backend
        });
        break;
      case 'capacidadesinstaladas':
        if (!data.nombre) {
          this.alertService.error('Error de validación', 'El nombre de la instalación es requerido');
          return;
        }
        obs = this.catalogosService.updateCapacidadInstalada(id, {
          nombreInstalacion: data.nombre.trim(),
          descripcionFuncionalidad: data.descripcion?.trim() || undefined,
          departamentoId: (this.form.get('departamentoId')?.value as number) || undefined,
          tipoUnidadId: (this.form.get('tipoUnidadId')?.value as number) || undefined,
          activo: data.activo !== undefined ? data.activo : true
        } as any);
        break;
      default:
        console.error('Unknown catalog type:', this.selectedCatalogo);
        return;
    }
    
    // Obtener el nombre del elemento para la alerta
    const nombreElemento = data.nombre || data.codigo || 'el elemento';
    
    obs.subscribe({
      next: (updatedItem: any) => {
        // Actualizar el estado inmediatamente si se recibe el objeto actualizado
        if (updatedItem && this.selectedCatalogo === 'capacidadesinstaladas') {
          const currentItems = this.capacidadesinstaladas();
          const index = currentItems.findIndex((item: any) => item.id === id);
          if (index !== -1) {
            const updated = [...currentItems];
            updated[index] = {
              ...updated[index],
              ...updatedItem,
              nombre: updatedItem.nombre || updatedItem.nombreInstalacion || updated[index].nombre,
              descripcion: updatedItem.descripcion || updatedItem.descripcionFuncionalidad || updated[index].descripcion,
              activo: updatedItem.activo !== undefined ? updatedItem.activo : updated[index].activo
            };
            this.capacidadesinstaladas.set(updated);
          }
        } else if (updatedItem && this.selectedCatalogo === 'indicadores') {
          const currentItems = this.indicadores();
          const index = currentItems.findIndex((item: any) => item.idIndicador === id);
          if (index !== -1) {
            const updated = [...currentItems];
            updated[index] = {
              ...updated[index],
              ...updatedItem
            };
            this.indicadores.set(updated);
          }
        }
        
        // Recargar todos los catálogos para asegurar consistencia
        this.loadAllCatalogos();
        
        // Si es un rol, recargar específicamente ese rol para obtener los permisos actualizados
        if (this.selectedCatalogo === 'roles' && id) {
          console.log('🔄 [UPDATE ROLE] Recargando rol actualizado, ID:', id);
          setTimeout(() => {
            this.catalogosService.getRoleById(id).subscribe({
              next: (rolActualizado) => {
                console.log('✅ [UPDATE ROLE] Rol recargado con permisos:', JSON.stringify(rolActualizado, null, 2));
                // Actualizar el rol en la lista local
                const rolesActuales = this.roles();
                const index = rolesActuales.findIndex(r => r.id === id);
                if (index >= 0) {
                  rolesActuales[index] = rolActualizado;
                  this.roles.set([...rolesActuales]);
                  console.log('✅ [UPDATE ROLE] Rol actualizado en la lista local con permisos');
                } else {
                  console.warn('⚠️ [UPDATE ROLE] Rol no encontrado en la lista local para actualizar');
                }
              },
              error: (err) => {
                console.warn('⚠️ No se pudo recargar el rol individual, pero se recargaron todos los catálogos:', err);
              }
            });
          }, 500); // Esperar un poco para que el backend procese la actualización
        }
        
        this.cancelEdit();
        // Mostrar alerta de éxito
        this.alertService.success(
          '¡Elemento actualizado exitosamente!',
          `"${nombreElemento}" ha sido actualizado correctamente.`
        );
      },
      error: (err: any) => {
        console.error('Error updating item:', err);
        console.error('Error details:', err.error);
        console.error('Error status:', err.status);
        
        let errorMessage = 'Error desconocido';
        if (err.error) {
          if (err.error.errors) {
            const validationErrors = err.error.errors;
            const errorMessages = Object.keys(validationErrors).map(key => {
              const messages = Array.isArray(validationErrors[key])
                ? validationErrors[key].join(', ')
                : validationErrors[key];
              return `${key}: ${messages}`;
            });
            errorMessage = `Errores de validación:\n${errorMessages.join('\n')}`;
          } else if (err.error.message) {
            errorMessage = err.error.message;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        // Mostrar alerta de error
        this.alertService.error(
          'Error al actualizar el elemento',
          `No se pudo actualizar "${nombreElemento}". ${errorMessage}`
        );
      }
    });
  }

  // Métodos para importar indicadores
  getAnioActual(): number {
    return new Date().getFullYear();
  }

  abrirDialogoImportar() {
    this.showImportDialog = true;
    if (this.selectedCatalogo === 'indicadores') {
      this.showImportFromYear = false;
      this.showImportFromFile = false;
      // Año origen por defecto: año actual
      this.importAnioOrigen = this.getAnioActual();
      // Año destino por defecto: null (se mostrará el año actual con opacidad)
      this.importAnioDestino = null;
      this.importActualizarExistentes = false;
    } else if (this.selectedCatalogo === 'carreras') {
      this.showImportFromYear = false;
      this.showImportFromFile = false;
    }
    this.importFile = null;
  }

  onAnioDestinoChange(value: any) {
    if (value && value !== '' && value !== null && value !== undefined) {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        this.importAnioDestino = numValue;
      } else {
        this.importAnioDestino = null;
      }
    } else {
      this.importAnioDestino = null;
    }
  }

  onAnioDestinoFocus() {
    // Si el valor es el año actual, limpiar el input para que el usuario pueda escribir
    if (this.importAnioDestino === this.getAnioActual()) {
      this.importAnioDestino = null;
    }
  }

  onAnioDestinoBlur() {
    // Si el input está vacío, restaurar el año actual
    if (!this.importAnioDestino) {
      this.importAnioDestino = this.getAnioActual();
    }
  }

  cerrarDialogoImportar() {
    this.showImportDialog = false;
    this.showImportFromYear = false;
    this.showImportFromFile = false;
    this.importAnioOrigen = null;
    this.importAnioDestino = null;
    this.importActualizarExistentes = false;
    this.importFile = null;
  }

  descargarPlantillaIndicadores() {
    this.indicadorService.descargarPlantillaExcel().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla_indicadores.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        console.error('Error descargando plantilla:', err);
        alert('Error al descargar la plantilla: ' + (err.error?.message || err.message || 'Error desconocido'));
      }
    });
  }

  importarDesdeAnio() {
    // Año origen por defecto: año actual
    const anioOrigen = this.importAnioOrigen || this.getAnioActual();
    // Año destino por defecto: año actual si no se especifica
    const anioDestino = this.importAnioDestino || this.getAnioActual();

    this.indicadorService.importarDesdeAnio({
      anioOrigen: anioOrigen,
      anioDestino: anioDestino,
      actualizarExistentes: this.importActualizarExistentes
    }).subscribe({
      next: () => {
        alert('Indicadores importados exitosamente desde el año ' + anioOrigen + ' al año ' + anioDestino);
        this.cerrarDialogoImportar();
        this.loadAllCatalogos();
      },
      error: (err: any) => {
        console.error('Error importando desde año:', err);
        alert('Error al importar indicadores: ' + (err.error?.message || err.message || 'Error desconocido'));
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.importFile = input.files[0];
    }
  }

  removeFile() {
    this.importFile = null;
    // Limpiar el input de archivo
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getAniosDisponibles(): number[] {
    if (this.selectedCatalogo !== 'indicadores') {
      return [];
    }
    const anios = new Set<number>();
    this.indicadores().forEach(ind => {
      if (ind.anio !== undefined && ind.anio !== null) {
        anios.add(ind.anio);
      }
    });
    return Array.from(anios).sort((a, b) => b - a); // Ordenar de mayor a menor
  }

  onFiltroAnioChange(value: any) {
    if (value && value !== '' && value !== null && value !== undefined) {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        this.filtroAnioIndicadores.set(numValue);
      } else {
        this.filtroAnioIndicadores.set(null);
      }
    } else {
      this.filtroAnioIndicadores.set(null);
    }
    // Resetear a la primera página cuando cambia el filtro
    this.paginaActualIndicadores.set(1);
  }

  onBusquedaIndicadoresChange(termino: string) {
    this.busquedaIndicadores.set(termino);
    // Resetear a la primera página cuando cambia la búsqueda
    this.paginaActualIndicadores.set(1);
  }

  getTotalIndicadoresFiltrados(): number {
    if (this.selectedCatalogo !== 'indicadores') {
      return 0;
    }
    let indicadores = this.indicadores().map(({idIndicador, codigo, nombre, descripcion, anio, meta}) => ({id: idIndicador, codigo, nombre, descripcion, anio, meta}));
    
    // Filtrar por año si hay un filtro activo
    const filtroAnio = this.filtroAnioIndicadores();
    if (filtroAnio !== null && filtroAnio !== undefined) {
      indicadores = indicadores.filter(ind => ind.anio === filtroAnio);
    }
    
    // Filtrar por búsqueda (nombre o código)
    const busqueda = this.busquedaIndicadores().trim().toLowerCase();
    if (busqueda) {
      indicadores = indicadores.filter(ind => 
        (ind.nombre && ind.nombre.toLowerCase().includes(busqueda)) ||
        (ind.codigo && ind.codigo.toLowerCase().includes(busqueda))
      );
    }
    
    return indicadores.length;
  }

  getTotalPaginasIndicadores(): number {
    const total = this.getTotalIndicadoresFiltrados();
    return Math.ceil(total / this.itemsPorPagina);
  }

  irAPaginaIndicadores(pagina: number) {
    const totalPaginas = this.getTotalPaginasIndicadores();
    if (pagina >= 1 && pagina <= totalPaginas) {
      this.paginaActualIndicadores.set(pagina);
    }
  }

  paginaAnteriorIndicadores() {
    const paginaActual = this.paginaActualIndicadores();
    if (paginaActual > 1) {
      this.paginaActualIndicadores.set(paginaActual - 1);
    }
  }

  paginaSiguienteIndicadores() {
    const paginaActual = this.paginaActualIndicadores();
    const totalPaginas = this.getTotalPaginasIndicadores();
    if (paginaActual < totalPaginas) {
      this.paginaActualIndicadores.set(paginaActual + 1);
    }
  }

  getArrayPaginas(): number[] {
    const totalPaginas = this.getTotalPaginasIndicadores();
    const paginaActual = this.paginaActualIndicadores();
    const paginas: number[] = [];
    
    // Mostrar máximo 5 páginas a la vez
    const maxPaginas = 5;
    let inicio = Math.max(1, paginaActual - Math.floor(maxPaginas / 2));
    let fin = Math.min(totalPaginas, inicio + maxPaginas - 1);
    
    // Ajustar inicio si estamos cerca del final
    if (fin - inicio < maxPaginas - 1) {
      inicio = Math.max(1, fin - maxPaginas + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }

  getInicioPagina(): number {
    const total = this.getTotalIndicadoresFiltrados();
    if (total === 0) return 0;
    return (this.paginaActualIndicadores() - 1) * this.itemsPorPagina + 1;
  }

  getFinPagina(): number {
    const total = this.getTotalIndicadoresFiltrados();
    const fin = this.paginaActualIndicadores() * this.itemsPorPagina;
    return Math.min(fin, total);
  }

  // Métodos de búsqueda y paginación para carreras
  onBusquedaCarrerasChange(termino: string) {
    this.busquedaCarreras.set(termino);
    // Resetear a la primera página cuando cambia la búsqueda
    this.paginaActualCarreras.set(1);
  }

  // Métodos de búsqueda y paginación para actividades anuales
  onBusquedaActividadesAnualesChange(termino: string) {
    this.busquedaActividadesAnuales.set(termino);
    this.paginaActualActividadesAnuales.set(1);
  }

  onFiltroAnioActividadesAnualesChange(anio: number | null) {
    this.filtroAnioActividadesAnuales.set(anio);
    this.paginaActualActividadesAnuales.set(1);
  }

  getTotalActividadesAnualesFiltradas(): number {
    if (this.selectedCatalogo !== 'actividades-anuales') return 0;
    let actividades = this.actividadesAnuales().map(({idActividadAnual, nombre, descripcion, anio, idIndicador, nombreIndicador, codigoIndicador}) => ({
      id: idActividadAnual,
      nombre: nombre || nombreIndicador,
      descripcion,
      anio,
      idIndicador,
      codigoIndicador,
      nombreIndicador
    }));
    const filtroAnio = this.filtroAnioActividadesAnuales();
    if (filtroAnio !== null && filtroAnio !== undefined) {
      actividades = actividades.filter(a => a.anio === filtroAnio);
    }
    const busqueda = this.busquedaActividadesAnuales().trim().toLowerCase();
    if (busqueda) {
      actividades = actividades.filter(a => 
        (a.nombre && a.nombre.toLowerCase().includes(busqueda)) ||
        (a.codigoIndicador && a.codigoIndicador.toLowerCase().includes(busqueda))
      );
    }
    return actividades.length;
  }

  getTotalPaginasActividadesAnuales(): number {
    const total = this.getTotalActividadesAnualesFiltradas();
    return Math.ceil(total / this.itemsPorPagina);
  }

  paginaAnteriorActividadesAnuales() {
    const paginaActual = this.paginaActualActividadesAnuales();
    if (paginaActual > 1) {
      this.paginaActualActividadesAnuales.set(paginaActual - 1);
    }
  }

  paginaSiguienteActividadesAnuales() {
    const paginaActual = this.paginaActualActividadesAnuales();
    const totalPaginas = this.getTotalPaginasActividadesAnuales();
    if (paginaActual < totalPaginas) {
      this.paginaActualActividadesAnuales.set(paginaActual + 1);
    }
  }

  getInicioPaginaActividadesAnuales(): number {
    const total = this.getTotalActividadesAnualesFiltradas();
    if (total === 0) return 0;
    return (this.paginaActualActividadesAnuales() - 1) * this.itemsPorPagina + 1;
  }

  getFinPaginaActividadesAnuales(): number {
    const total = this.getTotalActividadesAnualesFiltradas();
    const fin = this.paginaActualActividadesAnuales() * this.itemsPorPagina;
    return Math.min(fin, total);
  }

  getAniosDisponiblesActividadesAnuales(): number[] {
    const anios = new Set<number>();
    this.actividadesAnuales().forEach(a => {
      if (a.anio) anios.add(a.anio);
    });
    return Array.from(anios).sort((a, b) => b - a);
  }

  // Métodos de búsqueda y paginación para actividades mensuales
  onBusquedaActividadesMensualesChange(termino: string) {
    this.busquedaActividadesMensuales.set(termino);
    this.paginaActualActividadesMensuales.set(1);
  }

  getTotalActividadesMensualesFiltradas(): number {
    if (this.selectedCatalogo !== 'actividades-mensuales') return 0;
    let actividades = this.actividadesMensuales().map(({idActividadMensualInst, nombre, descripcion, mes, nombreMes, idActividadAnual, actividadAnual}) => ({
      id: idActividadMensualInst,
      nombre: nombre || actividadAnual?.nombreIndicador,
      descripcion,
      mes,
      nombreMes,
      idActividadAnual,
      actividadAnual
    }));
    const busqueda = this.busquedaActividadesMensuales().trim().toLowerCase();
    if (busqueda) {
      actividades = actividades.filter(a => 
        (a.nombre && a.nombre.toLowerCase().includes(busqueda))
      );
    }
    return actividades.length;
  }

  getTotalPaginasActividadesMensuales(): number {
    const total = this.getTotalActividadesMensualesFiltradas();
    return Math.ceil(total / this.itemsPorPagina);
  }

  paginaAnteriorActividadesMensuales() {
    const paginaActual = this.paginaActualActividadesMensuales();
    if (paginaActual > 1) {
      this.paginaActualActividadesMensuales.set(paginaActual - 1);
    }
  }

  paginaSiguienteActividadesMensuales() {
    const paginaActual = this.paginaActualActividadesMensuales();
    const totalPaginas = this.getTotalPaginasActividadesMensuales();
    if (paginaActual < totalPaginas) {
      this.paginaActualActividadesMensuales.set(paginaActual + 1);
    }
  }

  getInicioPaginaActividadesMensuales(): number {
    const total = this.getTotalActividadesMensualesFiltradas();
    if (total === 0) return 0;
    return (this.paginaActualActividadesMensuales() - 1) * this.itemsPorPagina + 1;
  }

  getFinPaginaActividadesMensuales(): number {
    const total = this.getTotalActividadesMensualesFiltradas();
    const fin = this.paginaActualActividadesMensuales() * this.itemsPorPagina;
    return Math.min(fin, total);
  }

  // Métodos para importar y exportar
  descargarPlantillaActividadesAnuales() {
    this.actividadAnualService.obtenerPlantillaExcel().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla-actividades-anuales.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err) => {
        console.error('Error descargando plantilla:', err);
        alert('Error al descargar la plantilla');
      }
    });
  }

  descargarPlantillaActividadesMensuales() {
    this.actividadMensualInstService.obtenerPlantillaExcel().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla-actividades-mensuales.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err) => {
        console.error('Error descargando plantilla:', err);
        alert('Error al descargar la plantilla');
      }
    });
  }

  importarActividadesAnuales(file: File) {
    this.actividadAnualService.importarDesdeExcel(file).subscribe({
      next: (response) => {
        alert('Actividades anuales importadas exitosamente');
        this.loadAllCatalogos();
        this.showImportDialog = false;
        this.importFile = null;
      },
      error: (err) => {
        console.error('Error importando actividades anuales:', err);
        alert('Error al importar actividades anuales: ' + (err.error?.message || err.message || 'Error desconocido'));
      }
    });
  }

  importarActividadesMensuales(file: File) {
    this.actividadMensualInstService.importarDesdeExcel(file).subscribe({
      next: (response) => {
        alert('Actividades mensuales importadas exitosamente');
        this.loadAllCatalogos();
        this.showImportDialog = false;
        this.importFile = null;
      },
      error: (err) => {
        console.error('Error importando actividades mensuales:', err);
        alert('Error al importar actividades mensuales: ' + (err.error?.message || err.message || 'Error desconocido'));
      }
    });
  }

  importarSegunCatalogo() {
    if (this.selectedCatalogo === 'carreras') {
      this.importarCarrerasDesdeExcel();
    } else if (this.selectedCatalogo === 'actividades-anuales' && this.importFile) {
      this.importarActividadesAnuales(this.importFile);
    } else if (this.selectedCatalogo === 'actividades-mensuales' && this.importFile) {
      this.importarActividadesMensuales(this.importFile);
    } else {
      this.importarDesdeExcel();
    }
  }

  getTotalCarrerasFiltradas(): number {
    if (this.selectedCatalogo !== 'carreras') {
      return 0;
    }
    let carreras = this.carreras().map(({idCarrera, nombre, codigo, descripcion, departamentoId, departamento, activo}) => ({
      id: idCarrera,
      nombre,
      codigo,
      descripcion,
      departamentoId,
      departamento,
      activo
    }));
    
    // Filtrar por búsqueda (nombre o código)
    const busqueda = this.busquedaCarreras().trim().toLowerCase();
    if (busqueda) {
      carreras = carreras.filter(carr => 
        (carr.nombre && carr.nombre.toLowerCase().includes(busqueda)) ||
        (carr.codigo && carr.codigo.toLowerCase().includes(busqueda))
      );
    }
    
    return carreras.length;
  }

  getTotalPaginasCarreras(): number {
    const total = this.getTotalCarrerasFiltradas();
    return Math.ceil(total / this.itemsPorPagina);
  }

  irAPaginaCarreras(pagina: number) {
    const totalPaginas = this.getTotalPaginasCarreras();
    if (pagina >= 1 && pagina <= totalPaginas) {
      this.paginaActualCarreras.set(pagina);
    }
  }

  paginaAnteriorCarreras() {
    const paginaActual = this.paginaActualCarreras();
    if (paginaActual > 1) {
      this.paginaActualCarreras.set(paginaActual - 1);
    }
  }

  paginaSiguienteCarreras() {
    const paginaActual = this.paginaActualCarreras();
    const totalPaginas = this.getTotalPaginasCarreras();
    if (paginaActual < totalPaginas) {
      this.paginaActualCarreras.set(paginaActual + 1);
    }
  }

  getArrayPaginasCarreras(): number[] {
    const totalPaginas = this.getTotalPaginasCarreras();
    const paginaActual = this.paginaActualCarreras();
    const paginas: number[] = [];
    
    // Mostrar máximo 5 páginas a la vez
    const maxPaginas = 5;
    let inicio = Math.max(1, paginaActual - Math.floor(maxPaginas / 2));
    let fin = Math.min(totalPaginas, inicio + maxPaginas - 1);
    
    // Ajustar inicio si estamos cerca del final
    if (fin - inicio < maxPaginas - 1) {
      inicio = Math.max(1, fin - maxPaginas + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }

  getInicioPaginaCarreras(): number {
    const total = this.getTotalCarrerasFiltradas();
    if (total === 0) return 0;
    return (this.paginaActualCarreras() - 1) * this.itemsPorPagina + 1;
  }

  getFinPaginaCarreras(): number {
    const total = this.getTotalCarrerasFiltradas();
    const fin = this.paginaActualCarreras() * this.itemsPorPagina;
    return Math.min(fin, total);
  }

  descargarPlantillaCarreras() {
    this.catalogosService.descargarPlantillaCarreras().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Plantilla_Carreras_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        console.error('Error descargando plantilla de carreras:', err);
        alert('Error al descargar la plantilla: ' + (err.error?.message || err.message || 'Error desconocido'));
      }
    });
  }

  importarCarrerasDesdeExcel() {
    if (!this.importFile) {
      alert('Por favor selecciona un archivo Excel');
      return;
    }

    this.catalogosService.importarCarrerasDesdeExcel(this.importFile).subscribe({
      next: (resultado: any) => {
        console.log('✅ IMPORTAR CARRERAS EXCEL - Resultado:', resultado);
        let mensaje = `Importación completada:\n`;
        mensaje += `- Total procesados: ${resultado.totalProcesados || 0}\n`;
        mensaje += `- Creados: ${resultado.creados || 0}\n`;
        mensaje += `- Actualizados: ${resultado.actualizados || 0}\n`;
        mensaje += `- Omitidos: ${resultado.omitidos || 0}\n`;
        mensaje += `- Errores: ${resultado.totalErrores || 0}`;
        
        if (resultado.errores && resultado.errores.length > 0) {
          mensaje += `\n\nErrores encontrados:\n${resultado.errores.join('\n')}`;
        }
        
        alert(mensaje);
        this.cerrarDialogoImportar();
        this.loadAllCatalogos();
      },
      error: (err: any) => {
        console.error('❌ IMPORTAR CARRERAS EXCEL - Error completo:', err);
        console.error('❌ IMPORTAR CARRERAS EXCEL - Status:', err.status);
        console.error('❌ IMPORTAR CARRERAS EXCEL - Status Text:', err.statusText);
        console.error('❌ IMPORTAR CARRERAS EXCEL - Error body:', err.error);
        console.error('❌ IMPORTAR CARRERAS EXCEL - URL:', err.url);
        
        let errorMessage = 'Error al importar carreras desde Excel';
        if (err.error) {
          if (err.error.errors) {
            console.error('❌ IMPORTAR CARRERAS EXCEL - Errores de validación:', err.error.errors);
            const validationErrors = Object.keys(err.error.errors).map(key => {
              return `${key}: ${err.error.errors[key].join(', ')}`;
            }).join('\n');
            errorMessage += `\n\nErrores de validación:\n${validationErrors}`;
          } else if (err.error.message) {
            errorMessage += `: ${err.error.message}`;
          }
        } else if (err.message) {
          errorMessage += `: ${err.message}`;
        }
        
        alert(errorMessage);
      }
    });
  }

  importarDesdeExcel() {
    if (!this.importFile) {
      alert('Por favor, seleccione un archivo Excel.');
      return;
    }

    // Validar que el archivo sea válido
    if (!(this.importFile instanceof File)) {
      alert('Error: El archivo seleccionado no es válido.');
      return;
    }

    if (this.importFile.size === 0) {
      alert('Error: El archivo seleccionado está vacío.');
      return;
    }

    console.log('🔄 IMPORTAR EXCEL - Iniciando importación');
    console.log('🔄 IMPORTAR EXCEL - Archivo:', this.importFile.name);
    console.log('🔄 IMPORTAR EXCEL - Tamaño:', this.importFile.size);
    console.log('🔄 IMPORTAR EXCEL - Tipo:', this.importFile.type);
    console.log('🔄 IMPORTAR EXCEL - Archivo es instancia de File:', this.importFile instanceof File);

    // Obtener año destino (por defecto año actual si no se especifica)
    const anioDestino = this.importAnioDestino || this.getAnioActual();
    
    // Parámetros por defecto según el backend
    const estrategiaMatching = 'Ambos'; // Actualizar tanto código como descripción
    const actualizarExistentes = true;
    const crearNuevos = true;

    this.indicadorService.importarDesdeExcel(
      this.importFile,
      anioDestino,
      estrategiaMatching,
      actualizarExistentes,
      crearNuevos
    ).subscribe({
      next: (response) => {
        console.log('✅ IMPORTAR EXCEL - Respuesta:', response);
        
        // Mostrar resumen de la importación
        let mensaje = `Importación completada:\n`;
        mensaje += `- Total procesados: ${response.totalProcesados || 0}\n`;
        mensaje += `- Creados: ${response.totalCreados || 0}\n`;
        mensaje += `- Actualizados: ${response.totalActualizados || 0}\n`;
        mensaje += `- Omitidos: ${response.totalOmitidos || 0}\n`;
        if (response.totalErrores && response.totalErrores > 0) {
          mensaje += `- Errores: ${response.totalErrores}\n`;
        }
        
        alert(mensaje);
        this.cerrarDialogoImportar();
        this.loadAllCatalogos();
      },
      error: (err: any) => {
        console.error('❌ IMPORTAR EXCEL - Error completo:', err);
        console.error('❌ IMPORTAR EXCEL - Status:', err.status);
        console.error('❌ IMPORTAR EXCEL - Status Text:', err.statusText);
        console.error('❌ IMPORTAR EXCEL - Error body:', err.error);
        console.error('❌ IMPORTAR EXCEL - Error body (JSON):', JSON.stringify(err.error, null, 2));
        console.error('❌ IMPORTAR EXCEL - URL:', err.url);
        
        let errorMessage = 'Error al importar indicadores desde Excel.';
        
        if (err.error) {
          if (err.error.errors) {
            // Errores de validación del backend
            const validationErrors = err.error.errors;
            console.error('❌ IMPORTAR EXCEL - Errores de validación:', validationErrors);
            console.error('❌ IMPORTAR EXCEL - Keys de errores:', Object.keys(validationErrors));
            
            const errorMessages: string[] = [];
            Object.keys(validationErrors).forEach(key => {
              const messages = Array.isArray(validationErrors[key])
                ? validationErrors[key].join(', ')
                : validationErrors[key];
              errorMessages.push(`${key}: ${messages}`);
              console.error(`❌ IMPORTAR EXCEL - Error en ${key}:`, messages);
            });
            
            if (errorMessages.length > 0) {
              errorMessage = `Errores de validación:\n${errorMessages.join('\n')}`;
            } else {
              errorMessage = err.error.title || 'Error de validación en el servidor';
            }
          } else if (err.error.message) {
            errorMessage = err.error.message;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.title) {
            errorMessage = err.error.title;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        alert(errorMessage);
      }
    });
  }

}
