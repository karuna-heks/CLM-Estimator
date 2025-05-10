import React from "react";

export function Button({ children, onClick, size = "md", variant = "default", ...props }: any) {
  const sizeClasses = size === "sm" ? "px-3 py-1 text-sm" : "px-4 py-2";
  const variantClasses =
    variant === "secondary"
      ? "bg-gray-200 text-black hover:bg-gray-300"
      : "bg-blue-600 text-white hover:bg-blue-700";

  return (
    <button
      className={`rounded ${sizeClasses} ${variantClasses} transition`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
