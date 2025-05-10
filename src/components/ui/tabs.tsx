import React, { createContext, useContext, useState } from "react";

const TabsContext = createContext<{
  value: string;
  setValue: (v: string) => void;
} | null>(null);

export function Tabs({
  defaultValue,
  children,
  className,
}: {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="flex">{children}</div>;
}

export function TabsTrigger({
  value: triggerValue,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within <Tabs>");

  const isActive = ctx.value === triggerValue;
  return (
    <button
      className={`px-4 py-2 ${
        isActive ? "bg-blue-600 text-white" : "bg-gray-100"
      }`}
      onClick={() => ctx.setValue(triggerValue)}
    >
      {children}
    </button>
  );
}


export function TabsContent({
  value: contentValue,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within <Tabs>");

  const isActive = ctx.value === contentValue;

  return (
    <div
      className={className}
      style={
        isActive
          ? {}
          : {
              position: "absolute",
              visibility: "hidden",
              pointerEvents: "none",
              height: 0,
              overflow: "hidden",
            }
      }
    >
      {children}
    </div>
  );
}
