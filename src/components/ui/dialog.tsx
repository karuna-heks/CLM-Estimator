import React from "react";

export function Dialog({ open, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      {children}
    </div>
  );
}

export function DialogContent({ children, className = "" }: any) {
  return (
    <div className={`bg-white rounded-lg p-4 shadow-xl ${className}`}>
      {children}
    </div>
  );
}

export function DialogHeader({ children }: any) {
  return <div className="mb-2">{children}</div>;
}

export function DialogTitle({ children }: any) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function DialogFooter({ children }: any) {
  return <div className="mt-4 text-right">{children}</div>;
}
