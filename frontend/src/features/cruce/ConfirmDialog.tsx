import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

// Styled confirmations instead of the browser's alert/confirm. Any component can
// `await confirm({ title, message })` and get true or false.
export interface ConfirmOptions { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean }
type Pending = ConfirmOptions & { resolve: (value: boolean) => void }

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false)

export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const dialog = useRef<HTMLDialogElement>(null), confirmButton = useRef<HTMLButtonElement>(null)
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => setPending({ ...options, resolve })), [])
  useEffect(() => {
    if (!pending || dialog.current?.open) return
    dialog.current?.showModal()
    confirmButton.current?.focus()
  }, [pending])
  function close(value: boolean) {
    pending?.resolve(value)
    dialog.current?.close()
    setPending(null)
  }
  return <ConfirmContext.Provider value={confirm}>
    {children}
    {pending && <dialog ref={dialog} className="confirm-dialog" aria-labelledby="confirm-title" aria-describedby={pending.message ? 'confirm-message' : undefined}
      onCancel={event => { event.preventDefault(); close(false) }} onClick={event => { if (event.target === dialog.current) close(false) }}>
      <h2 id="confirm-title">{pending.title}</h2>
      {pending.message && <p id="confirm-message">{pending.message}</p>}
      <div className="confirm-actions">
        <button className="text-button" onClick={() => close(false)}>{pending.cancelLabel ?? 'Cancelar'}</button>
        <button ref={confirmButton} className={pending.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{pending.confirmLabel ?? 'Aceptar'}</button>
      </div>
    </dialog>}
  </ConfirmContext.Provider>
}
