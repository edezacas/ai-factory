import { Component, EventEmitter, Input, Output } from '@angular/core'
import { UserService } from './user.service'

@Component({
  selector: 'app-legacy-list',
  standalone: true,
  template: `<li *ngFor="let item of items" (click)="selected.emit(item)">{{ item }}</li>`,
})
export class LegacyListComponent {
  @Input() items: string[] = []
  @Output() selected = new EventEmitter<string>()

  constructor(private readonly users: UserService) {}
}
