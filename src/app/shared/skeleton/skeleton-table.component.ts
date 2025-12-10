import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';

@Component({
  standalone: true,
  selector: 'app-skeleton-table',
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      @if (showHeader) {
        <div class="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <div class="flex items-center gap-4">
            @for (i of getColumnsArray(); track i) {
              <app-skeleton [width]="getColumnWidth(i)" height="1rem" variant="default"></app-skeleton>
            }
          </div>
        </div>
      }
      
      <div class="divide-y divide-slate-100">
        @for (row of getRowsArray(); track row) {
          <div class="px-6 py-4">
            <div class="flex items-center gap-4">
              @for (i of getColumnsArray(); track i) {
                <app-skeleton [width]="getColumnWidth(i)" height="1rem" variant="default"></app-skeleton>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class SkeletonTableComponent {
  @Input() rows: number = 5;
  @Input() columns: number = 5;
  @Input() showHeader: boolean = true;

  getRowsArray(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }

  getColumnsArray(): number[] {
    return Array.from({ length: this.columns }, (_, i) => i + 1);
  }

  getColumnWidth(index: number): string {
    const widths = ['20%', '25%', '20%', '20%', '15%'];
    return widths[index - 1] || '20%';
  }
}

