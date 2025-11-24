import { Component, inject, OnInit, signal, HostListener, ElementRef } from '@angular/core';
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
import type { TipoActividadJerarquica } from '../../core/models/tipo-actividad-jerarquica';
import type { NivelActividad } from '../../core/models/catalogos-nuevos';
import type { Indicador } from '../../core/models/indicador';

// Spartan UI
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

type CatalogoType = 'departamentos' | 'generos' | 'estadoestudiantes' | 'estadoparticipaciones' | 'categoriaparticipaciones' | 'categoriaactividades' | 'tiposunidad' | 'tiposiniciativas' | 'tiposinvestigaciones' | 'tiposdocumentos' | 'tiposdocumentosdivulgados' | 'areasconocimiento' | 'estadosactividad' | 'tiposactividadjerarquica' | 'nivelesactividad' | 'indicadorespadre' | 'indicadoreshijo';

interface CatalogoItem {
  id: number;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
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
export class ListCatalogosComponent implements OnInit {
  private catalogosService = inject(CatalogosService);
  private indicadorService = inject(IndicadorService);
  private elementRef = inject(ElementRef);

  selectedCatalogo: CatalogoType = 'departamentos';
  showForm = false;
  isEditing = false;
  editingId: number | null = null;
  isDropdownOpen = false;

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
  });

  // Signals for reactive data
  departamentos = signal<Departamento[]>([]);
  generos = signal<Genero[]>([]);
  estadoestudiantes = signal<EstadoEstudiante[]>([]);
  estadoparticipaciones = signal<EstadoParticipacion[]>([]);
  categoriaparticipaciones = signal<CategoriaParticipacion[]>([]);
  categoriaactividades = signal<CategoriaActividad[]>([]);
  tiposunidad = signal<TipoUnidad[]>([]);
  tiposiniciativas = signal<TipoIniciativa[]>([]);
  tiposinvestigaciones = signal<TipoInvestigacion[]>([]);
  tiposdocumentos = signal<TipoDocumento[]>([]);
  tiposdocumentosdivulgados = signal<TipoDocumentoDivulgado[]>([]);
  areasconocimiento = signal<AreaConocimiento[]>([]);
  estadosactividad = signal<EstadoActividad[]>([]);
  tiposactividadjerarquica = signal<TipoActividadJerarquica[]>([]);
  nivelesactividad = signal<NivelActividad[]>([]);
  indicadorespadre = signal<Indicador[]>([]);
  indicadoreshijo = signal<Indicador[]>([]);
  
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
  }

  updateFormValidation() {
    if (this.selectedCatalogo === 'generos') {
      this.form.get('codigo')?.setValidators([Validators.required, Validators.minLength(1)]);
      this.form.get('nombre')?.clearValidators();
    } else if (this.selectedCatalogo === 'indicadorespadre' || this.selectedCatalogo === 'indicadoreshijo') {
      // Para indicadores, tanto codigo como nombre son requeridos
      this.form.get('codigo')?.setValidators([Validators.required, Validators.minLength(1)]);
      this.form.get('nombre')?.setValidators([Validators.required, Validators.minLength(3)]);
    } else {
      this.form.get('nombre')?.setValidators([Validators.required, Validators.minLength(1)]);
      this.form.get('codigo')?.clearValidators();
    }
    this.form.get('codigo')?.updateValueAndValidity();
    this.form.get('nombre')?.updateValueAndValidity();
  }

  getCatalogoName(): string {
    const names: Record<CatalogoType, string> = {
      departamentos: 'Departamentos',
      generos: 'Géneros',
      estadoestudiantes: 'Estado Estudiante',
      estadoparticipaciones: 'Estado Participación',
      categoriaparticipaciones: 'Categoría Participación',
      categoriaactividades: 'Categoría Actividad',
      tiposunidad: 'Tipo Unidad',
      tiposiniciativas: 'Tipo Iniciativa',
      tiposinvestigaciones: 'Tipo Investigación',
      tiposdocumentos: 'Tipo Documento',
      tiposdocumentosdivulgados: 'Tipo Documento Divulgado',
      areasconocimiento: 'Área Conocimiento',
      estadosactividad: 'Estado Actividad',
      tiposactividadjerarquica: 'Tipo Actividad Jerárquica',
      nivelesactividad: 'Nivel Actividad',
      indicadorespadre: 'Indicador Padre',
      indicadoreshijo: 'Indicador Hijo',
    };
    return names[this.selectedCatalogo];
  }

  getCatalogoOptions(): Array<{value: CatalogoType, label: string}> {
    return [
      { value: 'departamentos', label: 'Departamentos' },
      { value: 'generos', label: 'Géneros' },
      { value: 'estadoestudiantes', label: 'Estado Estudiante' },
      { value: 'estadoparticipaciones', label: 'Estado Participación' },
      { value: 'categoriaparticipaciones', label: 'Categoría Participación' },
      { value: 'categoriaactividades', label: 'Categoría Actividad' },
      { value: 'tiposunidad', label: 'Tipo Unidad' },
      { value: 'tiposiniciativas', label: 'Tipo Iniciativa' },
      { value: 'tiposinvestigaciones', label: 'Tipo Investigación' },
      { value: 'tiposdocumentos', label: 'Tipo Documento' },
      { value: 'tiposdocumentosdivulgados', label: 'Tipo Documento Divulgado' },
      { value: 'areasconocimiento', label: 'Área Conocimiento' },
      { value: 'estadosactividad', label: 'Estado Actividad' },
      { value: 'tiposactividadjerarquica', label: 'Tipo Actividad Jerárquica' },
      { value: 'nivelesactividad', label: 'Nivel Actividad' },
      { value: 'indicadorespadre', label: 'Indicador Padre' },
      { value: 'indicadoreshijo', label: 'Indicador Hijo' },
    ];
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown() {
    this.isDropdownOpen = false;
  }

  selectCatalogo(value: CatalogoType) {
    this.selectedCatalogo = value;
    this.closeDropdown();
    this.onCatalogoChange();
  }

  currentItems(): any[] {
    switch (this.selectedCatalogo) {
      case 'departamentos': return this.departamentos().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'generos': return this.generos().map(({id, codigo, descripcion}) => ({id, codigo, descripcion}));
      case 'estadoestudiantes': return this.estadoestudiantes().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'estadoparticipaciones': return this.estadoparticipaciones().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'categoriaparticipaciones': return this.categoriaparticipaciones().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'categoriaactividades': return this.categoriaactividades().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'tiposunidad': return this.tiposunidad().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'tiposiniciativas': return this.tiposiniciativas().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'tiposinvestigaciones': return this.tiposinvestigaciones().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'tiposdocumentos': return this.tiposdocumentos().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'tiposdocumentosdivulgados': return this.tiposdocumentosdivulgados().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'areasconocimiento': return this.areasconocimiento().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'estadosactividad': return this.estadosactividad().map(item => ({
        id: item.id,
        nombre: item.nombre || (item as any).NombreEstado || '',
        descripcion: item.descripcion || ''
      }));
      case 'tiposactividadjerarquica': return this.tiposactividadjerarquica().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'nivelesactividad': return this.nivelesactividad().map(({idNivel, nombre, descripcion}) => ({id: idNivel, nombre, descripcion}));
      case 'indicadorespadre': return this.indicadorespadre().map(({idIndicador, codigo, nombre, descripcion}) => ({id: idIndicador, codigo, nombre, descripcion}));
      case 'indicadoreshijo': return this.indicadoreshijo().map(({idIndicador, codigo, nombre, descripcion}) => ({id: idIndicador, codigo, nombre, descripcion}));
      default: return [];
    }
  }

  getItemDisplayValue(item: any): string {
    if (this.selectedCatalogo === 'generos') {
      return item.codigo || item.Codigo || '';
    }
    // Para indicadores, mostrar código y nombre
    if (this.selectedCatalogo === 'indicadorespadre' || this.selectedCatalogo === 'indicadoreshijo') {
      const codigo = item.codigo || item.Codigo || '';
      const nombre = item.nombre || item.Nombre || '';
      return codigo && nombre ? `${codigo} - ${nombre}` : (codigo || nombre);
    }
    // Para estadosactividad, también buscar NombreEstado
    if (this.selectedCatalogo === 'estadosactividad') {
      return item.nombre || item.Nombre || item.NombreEstado || '';
    }
    return item.nombre || item.Nombre || '';
  }

  getItemId(item: any): number | undefined {
    if (this.selectedCatalogo === 'indicadorespadre' || this.selectedCatalogo === 'indicadoreshijo') {
      return item.id || (item as any).idIndicador;
    }
    if (this.selectedCatalogo === 'nivelesactividad') {
      return item.id || (item as any).idNivel;
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
    
    this.catalogosService.getCategoriasParticipacion().subscribe({
      next: data => this.categoriaparticipaciones.set(data),
      error: error => console.error('Error loading categorias participacion:', error)
    });
    
    this.catalogosService.getCategoriasActividad().subscribe({
      next: data => this.categoriaactividades.set(data),
      error: error => console.error('Error loading categorias actividad:', error)
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
    
    this.catalogosService.getTiposActividadJerarquica().subscribe({
      next: data => {
        this.tiposactividadjerarquica.set(data);
      },
      error: error => {
        console.error('Error loading tipos actividad jerarquica:', error);
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

    // Cargar indicadores padre (sin padre)
    this.indicadorService.getPadres().subscribe({
      next: data => {
        console.log('✅ LOAD ALL CATALOGOS - Indicadores padre cargados:', data);
        this.indicadorespadre.set(data);
        this.isLoading.set(false);
      },
      error: error => {
        console.error('❌ LOAD ALL CATALOGOS - Error cargando indicadores padre:', error);
        this.isLoading.set(false);
      }
    });

    // Cargar indicadores hijo (con padre)
    this.indicadorService.getAll().subscribe({
      next: data => {
        // Filtrar solo los que tienen padre
        const hijos = data.filter(ind => ind.idIndicadorPadre);
        console.log('✅ LOAD ALL CATALOGOS - Indicadores hijo cargados:', hijos);
        this.indicadoreshijo.set(hijos);
      },
      error: error => {
        console.error('❌ LOAD ALL CATALOGOS - Error cargando indicadores hijo:', error);
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
    // Para nivelesactividad, el id puede venir como idNivel
    // Para indicadores, el id viene como idIndicador
    if (this.selectedCatalogo === 'indicadorespadre' || this.selectedCatalogo === 'indicadoreshijo') {
      this.editingId = item.id || (item as any).idIndicador;
    } else if (this.selectedCatalogo === 'nivelesactividad') {
      this.editingId = item.id || (item as any).idNivel;
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
      descripcion: item.descripcion || '' 
    });
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
      case 'categoriaparticipaciones': obs = this.catalogosService.deleteCategoriaParticipacion(id); break;
      case 'categoriaactividades': obs = this.catalogosService.deleteCategoriaActividad(id); break;
      case 'tiposunidad': obs = this.catalogosService.deleteTipoUnidad(id); break;
      case 'tiposiniciativas': obs = this.catalogosService.deleteTipoIniciativa(id); break;
      case 'tiposinvestigaciones': obs = this.catalogosService.deleteTipoInvestigacion(id); break;
      case 'tiposdocumentos': obs = this.catalogosService.deleteTipoDocumento(id); break;
      case 'tiposdocumentosdivulgados': obs = this.catalogosService.deleteTipoDocumentoDivulgado(id); break;
      case 'areasconocimiento': obs = this.catalogosService.deleteAreaConocimiento(id); break;
      case 'estadosactividad': obs = this.catalogosService.deleteEstadoActividad(id); break;
      case 'tiposactividadjerarquica': obs = this.catalogosService.deleteTipoActividadJerarquica(id); break;
      case 'nivelesactividad': obs = this.catalogosService.deleteNivelActividad(id); break;
      case 'indicadorespadre':
      case 'indicadoreshijo': obs = this.indicadorService.delete(id); break;
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

  onSubmit() {
    if (this.form.invalid) {
      console.log('Form is invalid:', this.form.errors);
      console.log('Form controls:', this.form.controls);
      return;
    }

    const codigo = this.form.value.codigo as string;
    const nombre = this.form.value.nombre as string;
    const descripcion = this.form.value.descripcion as string;
    
    console.log('Form values:', { codigo, nombre, descripcion });
    console.log('Selected catalog:', this.selectedCatalogo);
    
    let data: any;
    if (this.selectedCatalogo === 'generos') {
      data = { codigo, descripcion };
    } else if (this.selectedCatalogo === 'indicadorespadre' || this.selectedCatalogo === 'indicadoreshijo') {
      // Para indicadores, necesitamos tanto codigo como nombre
      data = { codigo, nombre, descripcion };
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

  createItem(data: { nombre?: string, codigo?: string, descripcion?: string }) {
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
        obs = this.catalogosService.createDepartamento({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
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
        
      case 'tiposactividadjerarquica': 
        if (!data.nombre) {
          console.error('Invalid data for tipo actividad jerarquica:', data);
          return;
        }
        obs = this.catalogosService.createTipoActividadJerarquica({ nombre: data.nombre, descripcion: data.descripcion || '' }); 
        break;
        
      case 'nivelesactividad': 
        if (!data.nombre) {
          console.error('Invalid data for nivel actividad:', data);
          return;
        }
        obs = this.catalogosService.createNivelActividad({ nombre: data.nombre, descripcion: data.descripcion || '', activo: true }); 
        break;
        
      case 'indicadorespadre':
        if (!data.codigo || !data.nombre) {
          console.error('Invalid data for indicador padre:', data);
          return;
        }
        obs = this.indicadorService.create({ 
          codigo: data.codigo.trim(), 
          nombre: data.nombre.trim(), 
          descripcion: data.descripcion?.trim() || undefined,
          activo: true
          // No incluir idIndicadorPadre para crear un indicador padre
        });
        break;
        
      case 'indicadoreshijo':
        if (!data.codigo || !data.nombre) {
          console.error('Invalid data for indicador hijo:', data);
          return;
        }
        // Para indicadores hijo, necesitamos un padre, pero por ahora lo dejamos sin padre
        // El usuario debería seleccionar el padre en un formulario más completo
        obs = this.indicadorService.create({ 
          codigo: data.codigo.trim(), 
          nombre: data.nombre.trim(), 
          descripcion: data.descripcion?.trim() || undefined,
          activo: true
          // Nota: idIndicadorPadre debería venir del formulario, pero por ahora no lo incluimos
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

  updateItem(id: number, data: { nombre?: string, codigo?: string, descripcion?: string }) {
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
        obs = this.catalogosService.updateDepartamento(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
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
        
      case 'tiposactividadjerarquica': 
        if (!data.nombre) {
          console.error('Invalid data for tipo actividad jerarquica:', data);
          return;
        }
        obs = this.catalogosService.updateTipoActividadJerarquica(id, { nombre: data.nombre, descripcion: data.descripcion || '' }); 
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
        
      case 'indicadorespadre':
      case 'indicadoreshijo':
        if (!data.codigo || !data.nombre) {
          console.error('Invalid data for indicador:', data);
          return;
        }
        // Obtener el indicador actual para mantener el estado activo y otros campos
        const indicadorActual = (this.selectedCatalogo === 'indicadorespadre' 
          ? this.indicadorespadre() 
          : this.indicadoreshijo()).find(ind => ind.idIndicador === id);
        obs = this.indicadorService.update(id, {
          codigo: data.codigo.trim(),
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || undefined,
          activo: indicadorActual?.activo !== undefined ? indicadorActual.activo : true
        });
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


}
