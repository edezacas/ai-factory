import { ChangeDetectionStrategy, Component, input } from '@angular/core'

@Component({
  selector: 'app-user-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>User {{ userId() }}</p>`,
})
export class UserDetailComponent {
  readonly userId = input.required<string>()
}
