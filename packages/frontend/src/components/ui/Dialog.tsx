import type { ReactNode } from 'react';
import { useEffect } from 'react';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Dialog({ open, onClose, children }: DialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg">{children}</div>
    </div>
  );
}

export function DialogContent({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl shadow-2xl ${className}`}>
      <div className="p-6">{children}</div>
    </div>
  );
}

export function DialogTitle({ className = '', children }: { className?: string; children: ReactNode }) {
  return <h2 className={`text-2xl font-bold text-gray-100 mb-4 ${className}`}>{children}</h2>;
}
