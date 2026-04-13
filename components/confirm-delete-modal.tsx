"use client";

type ConfirmDeleteModalProps = {
  title: string;
  description: string;
  confirmLabel: string;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDeleteModal({
  title,
  description,
  confirmLabel,
  isDeleting = false,
  onCancel,
  onConfirm
}: ConfirmDeleteModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-card modal-card--danger"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header">
          <div>
            <p className="eyebrow">Delete</p>
            <h3 id="confirm-delete-title">{title}</h3>
          </div>

          <button type="button" className="icon-button" onClick={onCancel} aria-label="Close delete confirmation">
            x
          </button>
        </div>

        <p className="confirm-delete-copy">{description}</p>

        <div className="modal-form__actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" className="danger-button" onClick={() => void onConfirm()} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
