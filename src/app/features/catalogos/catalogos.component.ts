import { Component, inject, OnInit, signal, HostListener, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { CatalogosService } from '../../core/services/catalogos.service';
import { IndicadorService } from '../../core/services/indicador.service';
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

// Spartan UI
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

type CatalogoType = 'departamentos' | 'generos' | 'estadoestudiantes' | 'estadoparticipaciones' | 'estadosproyecto' | 'categoriaparticipaciones' | 'categoriaactividades' | 'tiposactividad' | 'tiposunidad' | 'tiposiniciativas' | 'tiposinvestigaciones' | 'tiposdocumentos' | 'tiposdocumentosdivulgados' | 'tiposevidencia' | 'tiposprotagonista' | 'areasconocimiento' | 'estadosactividad' | 'nivelesactividad' | 'nivelesacademico' | 'rolesequipo' | 'rolesresponsable' | 'roles' | 'indicadores';

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
  indicadores = signal<Indicador[]>([]);
  
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
    // Resetear filtros y paginación cuando se cambia de catálogo
    this.filtroAnioIndicadores.set(null);
    this.busquedaIndicadores.set('');
    this.paginaActualIndicadores.set(1);
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
      case 'departamentos': return this.departamentos().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'generos': return this.generos().map(({id, codigo, descripcion}) => ({id, codigo, descripcion}));
      case 'estadoestudiantes': return this.estadoestudiantes().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'estadoparticipaciones': return this.estadoparticipaciones().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'estadosproyecto': return this.estadosproyecto().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'categoriaparticipaciones': return this.categoriaparticipaciones().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'categoriaactividades': return this.categoriaactividades().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'tiposactividad': return this.tiposactividad().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'tiposunidad': return this.tiposunidad().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'tiposiniciativas': return this.tiposiniciativas().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'tiposinvestigaciones': return this.tiposinvestigaciones().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'tiposdocumentos': return this.tiposdocumentos().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'tiposdocumentosdivulgados': return this.tiposdocumentosdivulgados().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'tiposevidencia': return this.tiposevidencia().map(({idTipoEvidencia, nombre, descripcion}) => ({id: idTipoEvidencia, nombre, descripcion}));
      case 'tiposprotagonista': return this.tiposprotagonista().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'areasconocimiento': return this.areasconocimiento().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'estadosactividad': return this.estadosactividad().map(item => ({
        id: item.id,
        nombre: item.nombre || (item as any).NombreEstado || '',
        descripcion: item.descripcion || ''
      }));
      case 'nivelesactividad': return this.nivelesactividad().map(({idNivel, nombre, descripcion}) => ({id: idNivel, nombre, descripcion}));
      case 'nivelesacademico': return this.nivelesacademico().map(({id, nombre}) => ({id, nombre}));
      case 'rolesequipo': return this.rolesequipo().map(({idRolEquipo, nombre, descripcion}) => ({id: idRolEquipo, nombre, descripcion}));
      case 'rolesresponsable': return this.rolesresponsable().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'roles': return this.roles().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'indicadores': {
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
        
        // Aplicar paginación solo si no se está mostrando todos
        if (this.mostrarTodosIndicadores()) {
          return indicadores;
        }
        const paginaActual = this.paginaActualIndicadores();
        const inicio = (paginaActual - 1) * this.itemsPorPagina;
        const fin = inicio + this.itemsPorPagina;
        return indicadores.slice(inicio, fin);
      }
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
    return item.id;
  }

  hasDescriptionData(): boolean {
    // Verificar si hay al menos un item con descripción no vacía
    return this.currentItems().some(item => item.descripcion && item.descripcion.trim() !== '');
  }

  loadAllCatalogos() {
    console.log('🔄 LOAD ALL CATALOGOS - Iniciando carga de todos los catálogos');
    this.isLoading.set(true);
    
    this.catalogosService.getDepartamentos().subscribe({
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
    
    this.catalogosService.getCategoriasParticipacion().subscribe({
      next: data => this.categoriaparticipaciones.set(data),
      error: error => console.error('Error loading categorias participacion:', error)
    });
    
    this.catalogosService.getCategoriasActividad().subscribe({
      next: data => this.categoriaactividades.set(data),
      error: error => console.error('Error loading categorias actividad:', error)
    });
    
    this.catalogosService.getTiposActividad().subscribe({
      next: data => this.tiposactividad.set(data),
      error: error => console.error('Error loading tipos actividad:', error)
    });
    
    this.catalogosService.getTiposUnidad().subscribe({
      next: data => this.tiposunidad.set(data),
      error: error => console.error('Error loading tipos unidad:', error)
    });
    
    this.catalogosService.getTiposIniciativa().subscribe({
      next: data => this.tiposiniciativas.set(data),
      error: error => console.error('Error loading tipos iniciativa:', error)
    });
    
    this.catalogosService.getTiposInvestigacion().subscribe({
      next: data => this.tiposinvestigaciones.set(data),
      error: error => console.error('Error loading tipos investigacion:', error)
    });
    
    this.catalogosService.getTiposDocumento().subscribe({
      next: data => this.tiposdocumentos.set(data),
      error: error => console.error('Error loading tipos documento:', error)
    });
    
    this.catalogosService.getTiposDocumentoDivulgado().subscribe({
      next: data => this.tiposdocumentosdivulgados.set(data),
      error: error => console.error('Error loading tipos documento divulgado:', error)
    });
    
    this.catalogosService.getTiposEvidencia().subscribe({
      next: data => this.tiposevidencia.set(data),
      error: error => console.error('Error loading tipos evidencia:', error)
    });
    
    this.catalogosService.getTiposProtagonista().subscribe({
      next: data => this.tiposprotagonista.set(data),
      error: error => console.error('Error loading tipos protagonista:', error)
    });
    
    this.catalogosService.getAreasConocimiento().subscribe({
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
    
    
    this.catalogosService.getNivelesActividad().subscribe({
      next: data => {
        this.nivelesactividad.set(data);
      },
      error: error => {
        console.error('Error loading niveles actividad:', error);
      }
    });

    this.catalogosService.getNivelesAcademico().subscribe({
      next: data => {
        this.nivelesacademico.set(data);
      },
      error: error => {
        console.error('Error loading niveles academico:', error);
      }
    });

    this.catalogosService.getRolesEquipo().subscribe({
      next: data => {
        this.rolesequipo.set(data);
      },
      error: error => {
        console.error('Error loading roles equipo:', error);
      }
    });

    this.catalogosService.getRolesResponsable().subscribe({
      next: data => {
        this.rolesresponsable.set(data);
      },
      error: error => {
        console.error('Error loading roles responsable:', error);
      }
    });

    this.catalogosService.getRoles().subscribe({
      next: data => {
        this.roles.set(data);
      },
      error: error => {
        console.error('Error loading roles:', error);
      }
    });

    // Cargar indicadores
    this.indicadorService.getAll().subscribe({
      next: data => {
        console.log('✅ LOAD ALL CATALOGOS - Indicadores cargados:', data);
        this.indicadores.set(data);
        this.isLoading.set(false);
      },
      error: error => {
        console.error('❌ LOAD ALL CATALOGOS - Error cargando indicadores:', error);
        this.isLoading.set(false);
      }
    });
  }

  addNew() {
    this.showForm = true;
    this.isEditing = false;
    this.editingId = null;
    this.form.reset();
    this.updateFormValidation();
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
        this.form.patchValue({ 
          codigo: indicadorCompleto.codigo || '', 
          nombre: indicadorCompleto.nombre || '', 
          descripcion: indicadorCompleto.descripcion || '',
          anio: indicadorCompleto.anio !== undefined && indicadorCompleto.anio !== null ? indicadorCompleto.anio : null,
          meta: indicadorCompleto.meta !== undefined && indicadorCompleto.meta !== null ? indicadorCompleto.meta : null,
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
    } else {
      this.editingId = item.id;
    }
    this.updateFormValidation();
    
    // Para estadosactividad, también buscar NombreEstado
    const nombreValue = this.selectedCatalogo === 'estadosactividad' 
      ? (item.nombre || (item as any).NombreEstado || '')
      : item.nombre;
    
    this.form.patchValue({ 
      codigo: item.codigo || '', 
      nombre: nombreValue || '', 
      descripcion: item.descripcion || '',
      anio: (item as any).anio !== undefined ? (item as any).anio : ((item as any).Anio !== undefined ? (item as any).Anio : null),
      meta: (item as any).meta !== undefined ? (item as any).meta : ((item as any).Meta !== undefined ? (item as any).Meta : null)
    });
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
      return;
    }
    if (!confirm('¿Estás seguro de que quieres eliminar este elemento?')) return;

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
      default:
        console.error('Unknown catalog type for deletion:', this.selectedCatalogo);
        return;
    }
    obs.subscribe({
      next: () => this.loadAllCatalogos(),
      error: (err: any) => console.error('Error deleting item:', err)
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
      alert(`El año no puede ser menor al año actual (${anioActual}). Por favor, ingrese un año válido.`);
      this.form.patchValue({ anio: null });
      return;
    }
    
    if (anioIngresado > anioActual) {
      const confirmar = confirm(`¿Está seguro de que el año ${anioIngresado} es correcto? El año actual es ${anioActual}.`);
      if (!confirmar) {
        this.form.patchValue({ anio: null });
      }
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
    
    // Validar año antes de enviar
    if (this.selectedCatalogo === 'indicadores' && anio !== null && anio !== undefined) {
      const anioActual = new Date().getFullYear();
      const anioIngresado = Number(anio);
      
      if (anioIngresado < anioActual) {
        alert(`El año no puede ser menor al año actual (${anioActual}). Por favor, ingrese un año válido.`);
        return;
      }
    }
    
    console.log('Form values:', { codigo, nombre, descripcion, anio, meta });
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
        meta: meta !== null && meta !== undefined ? Number(meta) : undefined
      };
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
          descripcion: data.descripcion || ''
        }); 
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
        obs = this.catalogosService.createCategoriaParticipacion({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'categoriaactividades': 
        if (!data.nombre) {
          console.error('Invalid data for categoria actividad:', data);
          return;
        }
        obs = this.catalogosService.createCategoriaActividad({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposactividad': 
        if (!data.nombre) {
          console.error('Invalid data for tipo actividad:', data);
          return;
        }
        obs = this.catalogosService.createTipoActividad({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposunidad': 
        if (!data.nombre) {
          console.error('Invalid data for tipo unidad:', data);
          return;
        }
        obs = this.catalogosService.createTipoUnidad({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposiniciativas': 
        if (!data.nombre) {
          console.error('Invalid data for tipo iniciativa:', data);
          return;
        }
        obs = this.catalogosService.createTipoIniciativa({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposinvestigaciones': 
        if (!data.nombre) {
          console.error('Invalid data for tipo investigacion:', data);
          return;
        }
        obs = this.catalogosService.createTipoInvestigacion({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposdocumentos': 
        if (!data.nombre) {
          console.error('Invalid data for tipo documento:', data);
          return;
        }
        obs = this.catalogosService.createTipoDocumento({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposdocumentosdivulgados': 
        if (!data.nombre) {
          console.error('Invalid data for tipo documento divulgado:', data);
          return;
        }
        obs = this.catalogosService.createTipoDocumentoDivulgado({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
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
        obs = this.catalogosService.createAreaConocimiento({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'estadosactividad': 
        if (!data.nombre) {
          console.error('Invalid data for estado actividad:', data);
          return;
        }
        obs = this.catalogosService.createEstadoActividad({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
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
        obs = this.catalogosService.createNivelAcademico({ nombre: data.nombre }); 
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
        obs = this.catalogosService.createRole({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
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
        
      default:
        console.error('Unknown catalog type:', this.selectedCatalogo);
        return;
    }
    
    obs.subscribe({
      next: () => {
        // Recargar todos los catálogos
        this.loadAllCatalogos();
        this.cancelEdit();
      },
      error: (err: any) => {
        console.error('Error creating item:', err);
        console.error('Error details:', err.error);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Validation errors:', err.error?.errors);
        console.error('Full error object:', JSON.stringify(err, null, 2));
        // Mostrar mensaje de error al usuario
        alert('Error al crear el elemento: ' + (err.error?.message || err.message || 'Error desconocido'));
      }
    });
  }

  updateItem(id: number, data: { nombre?: string, codigo?: string, descripcion?: string, anio?: number, meta?: number, nombreJefe?: string, correoJefe?: string, telefonoJefe?: string }) {
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
          descripcion: data.descripcion || ''
        }); 
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
          alert('Datos inválidos para actualizar estado de estudiante');
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
        obs = this.catalogosService.updateCategoriaParticipacion(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'categoriaactividades': 
        if (!data.nombre) {
          console.error('Invalid data for categoria actividad:', data);
          return;
        }
        obs = this.catalogosService.updateCategoriaActividad(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposactividad': 
        if (!data.nombre) {
          console.error('Invalid data for tipo actividad:', data);
          return;
        }
        obs = this.catalogosService.updateTipoActividad(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposunidad': 
        if (!data.nombre) {
          console.error('Invalid data for tipo unidad:', data);
          return;
        }
        obs = this.catalogosService.updateTipoUnidad(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposiniciativas': 
        if (!data.nombre) {
          console.error('Invalid data for tipo iniciativa:', data);
          return;
        }
        obs = this.catalogosService.updateTipoIniciativa(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposinvestigaciones': 
        if (!data.nombre) {
          console.error('Invalid data for tipo investigacion:', data);
          return;
        }
        obs = this.catalogosService.updateTipoInvestigacion(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposdocumentos': 
        if (!data.nombre) {
          console.error('Invalid data for tipo documento:', data);
          return;
        }
        obs = this.catalogosService.updateTipoDocumento(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposdocumentosdivulgados': 
        if (!data.nombre) {
          console.error('Invalid data for tipo documento divulgado:', data);
          return;
        }
        obs = this.catalogosService.updateTipoDocumentoDivulgado(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'tiposevidencia': 
        if (!data.nombre) {
          console.error('Invalid data for tipo evidencia:', data);
          return;
        }
        const tipoEvidenciaActual = this.tiposevidencia().find(t => t.idTipoEvidencia === id);
        obs = this.catalogosService.updateTipoEvidencia(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '', 
          activo: tipoEvidenciaActual?.activo !== undefined ? tipoEvidenciaActual.activo : true 
        }); 
        break;
        
      case 'tiposprotagonista': 
        if (!data.nombre) {
          console.error('Invalid data for tipo protagonista:', data);
          return;
        }
        const tipoProtagonistaActual = this.tiposprotagonista().find(t => t.id === id);
        obs = this.catalogosService.updateTipoProtagonista(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '', 
          activo: tipoProtagonistaActual?.activo !== undefined ? tipoProtagonistaActual.activo : true 
        }); 
        break;
        
      case 'areasconocimiento': 
        if (!data.nombre) {
          console.error('Invalid data for area conocimiento:', data);
          return;
        }
        obs = this.catalogosService.updateAreaConocimiento(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'estadosactividad': 
        if (!data.nombre) {
          console.error('Invalid data for estado actividad:', data);
          return;
        }
        obs = this.catalogosService.updateEstadoActividad(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
        
      case 'nivelesactividad': 
        if (!data.nombre) {
          console.error('Invalid data for nivel actividad:', data);
          return;
        }
        // Obtener el nivel actual para mantener el estado activo
        const nivelActual = this.nivelesactividad().find(n => n.idNivel === id);
        obs = this.catalogosService.updateNivelActividad(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '', 
          activo: nivelActual?.activo !== undefined ? nivelActual.activo : true 
        }); 
        break;
        
      case 'nivelesacademico': 
        if (!data.nombre) {
          console.error('Invalid data for nivel academico:', data);
          return;
        }
        obs = this.catalogosService.updateNivelAcademico(id, { nombre: data.nombre }); 
        break;
        
      case 'rolesequipo': 
        if (!data.nombre) {
          console.error('Invalid data for rol equipo:', data);
          return;
        }
        const rolEquipoActual = this.rolesequipo().find(r => r.idRolEquipo === id);
        obs = this.catalogosService.updateRolEquipo(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '', 
          activo: rolEquipoActual?.activo !== undefined ? rolEquipoActual.activo : true 
        }); 
        break;
        
      case 'rolesresponsable': 
        if (!data.nombre) {
          console.error('Invalid data for rol responsable:', data);
          return;
        }
        const rolResponsableActual = this.rolesresponsable().find(r => r.id === id);
        obs = this.catalogosService.updateRolResponsable(id, { 
          nombre: data.nombre, 
          descripcion: data.descripcion || '', 
          activo: rolResponsableActual?.activo !== undefined ? rolResponsableActual.activo : true 
        }); 
        break;
        
      case 'roles': 
        if (!data.nombre) {
          console.error('Invalid data for role:', data);
          return;
        }
        obs = this.catalogosService.updateRole(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'indicadores':
        if (!data.codigo || !data.nombre) {
          console.error('Invalid data for indicador:', data);
          return;
        }
        // Obtener el indicador actual para mantener el estado activo y otros campos
        const indicadorActual = this.indicadores().find(ind => ind.idIndicador === id);
        
        // Preparar los datos para actualizar
        // El backend manejará la lógica: si mismo código y año -> actualizar, si mismo código pero año diferente -> crear nuevo
        const updateData: any = {
          codigo: data.codigo.trim(),
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || undefined,
          activo: indicadorActual?.activo !== undefined ? indicadorActual.activo : true
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
        console.log('🔄 UPDATE Indicador - Indicador actual:', indicadorActual);
        console.log('🔄 UPDATE Indicador - Año en datos:', data.anio);
        console.log('🔄 UPDATE Indicador - Año en updateData:', updateData.anio);
        
        obs = this.indicadorService.update(id, updateData);
        break;
        
      default:
        console.error('Unknown catalog type:', this.selectedCatalogo);
        return;
    }
    
    obs.subscribe({
      next: () => {
        this.loadAllCatalogos();
        this.cancelEdit();
      },
      error: (err: any) => {
        console.error('Error updating item:', err);
        console.error('Error details:', err.error);
        console.error('Error status:', err.status);
        
        let errorMessage = 'Error al actualizar el elemento';
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
        
        alert(errorMessage);
      }
    });
  }

  // Métodos para importar indicadores
  getAnioActual(): number {
    return new Date().getFullYear();
  }

  abrirDialogoImportar() {
    this.showImportDialog = true;
    this.showImportFromYear = false;
    this.showImportFromFile = false;
    // Año origen por defecto: año actual
    this.importAnioOrigen = this.getAnioActual();
    // Año destino por defecto: null (se mostrará el año actual con opacidad)
    this.importAnioDestino = null;
    this.importActualizarExistentes = false;
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

  importarDesdeExcel() {
    if (!this.importFile) {
      alert('Por favor, seleccione un archivo Excel.');
      return;
    }

    console.log('🔄 IMPORTAR EXCEL - Iniciando importación');
    console.log('🔄 IMPORTAR EXCEL - Archivo:', this.importFile.name);
    console.log('🔄 IMPORTAR EXCEL - Tamaño:', this.importFile.size);
    console.log('🔄 IMPORTAR EXCEL - Tipo:', this.importFile.type);

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
