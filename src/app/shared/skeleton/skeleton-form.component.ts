import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';

@Component({
  standalone: true,
  selector: 'app-skeleton-form',
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      @for (section of getSectionsArray(); track section) {
        <div class="space-y-4">
          @if (showSectionTitle) {
            <app-skeleton width="30%" height="1.5rem" variant="default"></app-skeleton>
          }
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (field of [1,2]; track field) {
              <div class="space-y-2">
                <app-skeleton width="40%" height="0.875rem" variant="default"></app-skeleton>
                <app-skeleton width="100%" height="2.5rem" variant="default"></app-skeleton>
              </div>
            }
          </div>
          
          @if (showTextArea) {
            <div class="space-y-2">
              <app-skeleton width="40%" height="0.875rem" variant="default"></app-skeleton>
              <app-skeleton width="100%" height="6rem" variant="default"></app-skeleton>
            </div>
          }
        </div>
      }
      
      @if (showActions) {
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <app-skeleton width="8rem" height="2.5rem" variant="default"></app-skeleton>
          <app-skeleton width="8rem" height="2.5rem" variant="default"></app-skeleton>
        </div>
      }
    </div>
  `
})
export class SkeletonFormComponent {
  @Input() sections: number = 2;
  @Input() showSectionTitle: boolean = true;
  @Input() showTextArea: boolean = true;
  @Input() showActions: boolean = true;

  getSectionsArray(): number[] {
    return Array.from({ length: this.sections }, (_, i) => i);
  }
}

