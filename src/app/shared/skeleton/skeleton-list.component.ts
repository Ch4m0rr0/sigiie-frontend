import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';

@Component({
  standalone: true,
  selector: 'app-skeleton-list',
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="space-y-4">
      @for (item of getItemsArray(); track item) {
        <div class="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200">
          @if (showAvatar) {
            <app-skeleton width="3rem" height="3rem" variant="circular"></app-skeleton>
          }
          
          <div class="flex-1 space-y-2">
            <app-skeleton width="60%" height="1rem" variant="default"></app-skeleton>
            <app-skeleton width="40%" height="0.875rem" variant="default"></app-skeleton>
          </div>
          
          @if (showActions) {
            <div class="flex gap-2">
              <app-skeleton width="2rem" height="2rem" variant="default"></app-skeleton>
              <app-skeleton width="2rem" height="2rem" variant="default"></app-skeleton>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class SkeletonListComponent {
  @Input() items: number = 5;
  @Input() showAvatar: boolean = true;
  @Input() showActions: boolean = true;

  getItemsArray(): number[] {
    return Array.from({ length: this.items }, (_, i) => i);
  }
}

