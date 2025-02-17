import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private mostrarModalSubject = new BehaviorSubject<boolean>(false); // ✅ Asegurar que empieza en `false`
  mostrarModal$ = this.mostrarModalSubject.asObservable();

  private isModalVisibleSubject = new BehaviorSubject<boolean>(false); // ✅ También en `false`
  isModalVisible$ = this.isModalVisibleSubject.asObservable();

  constructor() {}

  abrirModal(time: number): void {
    this.mostrarModalSubject.next(true);
    setTimeout(() => {
      this.isModalVisibleSubject.next(true);
    }, time);
  }

  cerrarModal(time: number): void {
    this.isModalVisibleSubject.next(false);
    setTimeout(() => {
      this.mostrarModalSubject.next(false);
    }, time); // ✅ Asegurar que el cierre respete la animación
  }
}
