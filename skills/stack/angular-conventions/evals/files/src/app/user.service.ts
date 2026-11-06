import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'

export interface User {
  id: string
  name: string
}

@Injectable({ providedIn: 'root' })
export class UserService {
  load(_id: string): Observable<User> {
    throw new Error('Not implemented')
  }

  watch(_id: string): Observable<User> {
    throw new Error('Not implemented')
  }
}
