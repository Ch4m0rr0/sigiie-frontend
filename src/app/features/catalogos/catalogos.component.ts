import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { CatalogosService } from '../../core/services/catalogos.service';
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

// Spartan UI
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

type CatalogoType = 'departamentos' | 'generos' | 'estadoestudiantes' | 'estadoparticipaciones' | 'categoriaparticipaciones' | 'categoriaactividades' | 'tiposunidad' | 'tiposiniciativas' | 'tiposinvestigaciones' | 'tiposdocumentos' | 'tiposdocumentosdivulgados' | 'areasconocimiento';

interface CatalogoItem {
  id: number;
  nombre: string;
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
})
export class ListCatalogosComponent implements OnInit {
  private catalogosService = inject(CatalogosService);

  selectedCatalogo: CatalogoType = 'departamentos';
  showForm = false;
  isEditing = false;
  editingId: number | null = null;

  form = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
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

  ngOnInit() {
    this.loadAllCatalogos();
  }

  onCatalogoChange() {
    this.showForm = false;
    this.isEditing = false;
    this.editingId = null;
    this.form.reset();
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
    };
    return names[this.selectedCatalogo];
  }

  currentItems() {
    switch (this.selectedCatalogo) {
      case 'departamentos': return this.departamentos().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
      case 'generos': return this.generos().map(({id, nombre, descripcion}) => ({id, nombre, descripcion}));
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
      default: return [];
    }
  }

  loadAllCatalogos() {
    this.catalogosService.getDepartamentos().subscribe(data => this.departamentos.set(data));
    this.catalogosService.getGeneros().subscribe(data => this.generos.set(data));
    this.catalogosService.getEstadosEstudiante().subscribe(data => this.estadoestudiantes.set(data));
    this.catalogosService.getEstadosParticipacion().subscribe(data => this.estadoparticipaciones.set(data));
    this.catalogosService.getCategoriasParticipacion().subscribe(data => this.categoriaparticipaciones.set(data));
    this.catalogosService.getCategoriasActividad().subscribe(data => this.categoriaactividades.set(data));
    this.catalogosService.getTiposUnidad().subscribe(data => this.tiposunidad.set(data));
    this.catalogosService.getTiposIniciativa().subscribe(data => this.tiposiniciativas.set(data));
    this.catalogosService.getTiposInvestigacion().subscribe(data => this.tiposinvestigaciones.set(data));
    this.catalogosService.getTiposDocumento().subscribe(data => this.tiposdocumentos.set(data));
    this.catalogosService.getTiposDocumentoDivulgado().subscribe(data => this.tiposdocumentosdivulgados.set(data));
    this.catalogosService.getAreasConocimiento().subscribe(data => this.areasconocimiento.set(data));
  }

  addNew() {
    this.showForm = true;
    this.isEditing = false;
    this.editingId = null;
    this.form.reset();
  }

  editItem(item: CatalogoItem) {
    this.showForm = true;
    this.isEditing = true;
    this.editingId = item.id;
    this.form.patchValue({ nombre: item.nombre, descripcion: item.descripcion });
  }

  deleteItem(id: number | undefined) {
    if (!id) {
      console.error('Invalid id for deletion:', id);
      return;
    }
    if (!confirm('¿Estás seguro de que quieres eliminar este elemento?')) return;

    let obs;
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
      default:
        console.error('Unknown catalog type for deletion:', this.selectedCatalogo);
        return;
    }
    obs.subscribe({
      next: () => this.loadAllCatalogos(),
      error: (err) => console.error('Error deleting item:', err)
    });
  }

  cancelEdit() {
    this.showForm = false;
    this.isEditing = false;
    this.editingId = null;
    this.form.reset();
  }

  onSubmit() {
    if (this.form.invalid) return;

    const nombre = this.form.value.nombre as string;
    const descripcion = this.form.value.descripcion as string;
    const data = { nombre, descripcion };

    if (this.isEditing && this.editingId) {
      this.updateItem(this.editingId, data);
    } else {
      this.createItem(data);
    }
  }

  createItem(data: { nombre: string, descripcion?: string }) {
    let obs;
    switch (this.selectedCatalogo) {
      case 'departamentos': obs = this.catalogosService.createDepartamento(data); break;
      case 'generos': obs = this.catalogosService.createGenero(data); break;
      case 'estadoestudiantes': obs = this.catalogosService.createEstadoEstudiante(data); break;
      case 'estadoparticipaciones': obs = this.catalogosService.createEstadoParticipacion(data); break;
      case 'categoriaparticipaciones': obs = this.catalogosService.createCategoriaParticipacion(data); break;
      case 'categoriaactividades': obs = this.catalogosService.createCategoriaActividad(data); break;
      case 'tiposunidad': obs = this.catalogosService.createTipoUnidad(data); break;
      case 'tiposiniciativas': obs = this.catalogosService.createTipoIniciativa(data); break;
      case 'tiposinvestigaciones': obs = this.catalogosService.createTipoInvestigacion(data); break;
      case 'tiposdocumentos': obs = this.catalogosService.createTipoDocumento(data); break;
      case 'tiposdocumentosdivulgados': obs = this.catalogosService.createTipoDocumentoDivulgado(data); break;
      case 'areasconocimiento': obs = this.catalogosService.createAreaConocimiento(data); break;
    }
    obs.subscribe({
      next: () => {
        this.loadAllCatalogos();
        this.cancelEdit();
      },
      error: (err) => console.error('Error creating item:', err)
    });
  }

  updateItem(id: number, data: { nombre: string, descripcion?: string }) {
    let obs: Observable<any>;
    switch (this.selectedCatalogo) {
      case 'departamentos': obs = this.catalogosService.updateDepartamento(id, data); break;
      case 'generos': obs = this.catalogosService.updateGenero(id, data); break;
      case 'estadoestudiantes': obs = this.catalogosService.updateEstadoEstudiante(id, data); break;
      case 'estadoparticipaciones': obs = this.catalogosService.updateEstadoParticipacion(id, data); break;
      case 'categoriaparticipaciones': obs = this.catalogosService.updateCategoriaParticipacion(id, data); break;
      case 'categoriaactividades': obs = this.catalogosService.updateCategoriaActividad(id, data); break;
      case 'tiposunidad': obs = this.catalogosService.updateTipoUnidad(id, data); break;
      case 'tiposiniciativas': obs = this.catalogosService.updateTipoIniciativa(id, data); break;
      case 'tiposinvestigaciones': obs = this.catalogosService.updateTipoInvestigacion(id, data); break;
      case 'tiposdocumentos': obs = this.catalogosService.updateTipoDocumento(id, data); break;
      case 'tiposdocumentosdivulgados': obs = this.catalogosService.updateTipoDocumentoDivulgado(id, data); break;
      case 'areasconocimiento': obs = this.catalogosService.updateAreaConocimiento(id, data); break;
    }
    obs.subscribe({
      next: () => {
        this.loadAllCatalogos();
        this.cancelEdit();
      },
      error: (err) => console.error('Error updating item:', err)
    });
  }


}
