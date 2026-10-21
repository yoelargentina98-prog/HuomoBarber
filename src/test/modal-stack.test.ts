import { describe, it, expect, vi } from 'vitest';
import { modalStack } from '../shared/native/modal-stack';

describe('modalStack registry', () => {
  it('registra modales, indica si hay abiertos y los cierra en orden LIFO', () => {
    expect(modalStack.hasOpenModals()).toBe(false);

    const closeFirst = vi.fn();
    const closeSecond = vi.fn();

    const unregisterFirst = modalStack.push(closeFirst);
    expect(modalStack.hasOpenModals()).toBe(true);

    const unregisterSecond = modalStack.push(closeSecond);
    expect(modalStack.hasOpenModals()).toBe(true);

    // popAndClose cierra el segundo modal (LIFO)
    const poppedSecond = modalStack.popAndClose();
    expect(poppedSecond).toBe(true);
    expect(closeSecond).toHaveBeenCalledTimes(1);
    expect(closeFirst).not.toHaveBeenCalled();

    // popAndClose cierra el primer modal
    const poppedFirst = modalStack.popAndClose();
    expect(poppedFirst).toBe(true);
    expect(closeFirst).toHaveBeenCalledTimes(1);

    // Pila vacía
    expect(modalStack.hasOpenModals()).toBe(false);
    expect(modalStack.popAndClose()).toBe(false);

    // Desregistrar manualmente no falla cuando ya fue cerrado
    unregisterFirst();
    unregisterSecond();
  });

  it('permite desregistrar un modal manualmente si el usuario lo cierra por UI', () => {
    const closeFn = vi.fn();
    const unregister = modalStack.push(closeFn);

    expect(modalStack.hasOpenModals()).toBe(true);
    unregister();
    expect(modalStack.hasOpenModals()).toBe(false);

    // Al haber sido desregistrado, popAndClose devuelve false
    expect(modalStack.popAndClose()).toBe(false);
    expect(closeFn).not.toHaveBeenCalled();
  });
});
