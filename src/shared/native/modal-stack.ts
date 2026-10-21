/**
 * Pila centralizada de modales y diálogos activos.
 * Permite que el botón Atrás nativo de Android cierre primero el modal en pantalla
 * antes de retroceder en el historial de rutas.
 */

type ModalCloseHandler = () => void;

class ModalStack {
  private stack: ModalCloseHandler[] = [];

  /**
   * Registra un modal abierto. Devuelve una función para desregistrarlo cuando se cierre naturalmente.
   */
  public push(closeHandler: ModalCloseHandler): () => void {
    this.stack.push(closeHandler);
    let removed = false;

    return () => {
      if (removed) return;
      removed = true;
      const index = this.stack.lastIndexOf(closeHandler);
      if (index !== -1) {
        this.stack.splice(index, 1);
      }
    };
  }

  /**
   * Si hay modales en la pila, cierra el último modal activo y devuelve true.
   * Si no hay modales, devuelve false.
   */
  public popAndClose(): boolean {
    const handler = this.stack.pop();
    if (handler) {
      try {
        handler();
      } catch {
        /* prevenir errores en callback */
      }
      return true;
    }
    return false;
  }

  /**
   * Indica si hay al menos un modal abierto actualmente.
   */
  public hasOpenModals(): boolean {
    return this.stack.length > 0;
  }
}

export const modalStack = new ModalStack();

import { useEffect } from 'react';

/**
 * Hook de conveniencia para registrar automáticamente un modal en la pila nativa mientras esté abierto.
 */
export function useModalRegistration(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (isOpen) {
      return modalStack.push(onClose);
    }
  }, [isOpen, onClose]);
}
