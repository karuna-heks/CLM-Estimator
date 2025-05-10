/* ====================================================
 * GraphEditor.tsx — stable build
 * ----------------------------------------------------
 * ✔ Graph creation & editing (React Flow)
 * ✔ Drag‑drop, Ctrl+V images, rich node props
 * ✔ Estimate tab with editable rates and auto totals
 * ✔ 💾 Save / 📂 Load graph (nodes + edges + rates) as JSON
 * ==================================================== */

import React, {
  useCallback,
  useState,
  useRef,
  useMemo,
  useEffect,
  ChangeEvent,
} from "react";
import ReactFlow, { 
  EdgeProps, 
  getBezierPath, 
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
  Handle,
  Position,
  Connection,
  Edge,
  Node,
  NodeTypes,
  NodeChange,
  EdgeChange,
  ConnectionMode,
  useReactFlow,
  MarkerType,
} from "reactflow";
import { toPng } from "html-to-image";
import "reactflow/dist/style.css";
  
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table } from "@/components/ui/table";
  
/* ---------- Types ---------- */
export type Difficulty = "simple" | "medium" | "complex";
export type YesNo = "yes" | "no";
export type CreateType = "new" | "adapt";
  
export interface NodeData {
  label: string;
  comment: string;
  image: string | null;
  uploading: YesNo;
  designType: CreateType;
  designDifficulty: Difficulty;
  codingType: CreateType;
  codingDifficulty: Difficulty;
}

interface PersistEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: { comment?: string };
  label?: string;
}
  
interface PersistFile {
  nodes: Array<{ id: string; position: { x: number; y: number }; data: NodeData }>;
  edges: PersistEdge[];
  rates: Record<string, number>;
}
  
/* ---------- Constants ---------- */
const WORK_TYPES = [
  "Design-simple",
  "Design-medium",
  "Design-complex",
  "Coding-simple",
  "Coding-medium",
  "Coding-complex",
] as const;

const DEFAULT_RATES: Record<string, number> = {
  "Design-simple": 100,
  "Design-medium": 200,
  "Design-complex": 300,
  "Coding-simple": 150,
  "Coding-medium": 300,
  "Coding-complex": 450,
};

/* ---------- Helpers ---------- */
export const createChildNode = (
  parent: Node<NodeData>,
  id: string,
  offsetY = 150,
): Node<NodeData> => {
  const { x = 0, y = 0 } = parent.position ?? { x: 0, y: 0 };
  return {
    id,
    type: "graphNode",
    position: { x, y: y + offsetY },
    data: {
      label: `Node ${id}`,
      comment: "",
      image: null,
      uploading: "no",
      designType: "new",
      designDifficulty: "simple",
      codingType: "new",
      codingDifficulty: "simple",
    },
  } as Node<NodeData>;
};

/* ---------- Node card ---------- */
const GraphNode = ({ id, data, selected }: { id: string; data: NodeData; selected: boolean }) => (
  <Card className={`min-w-[220px] border-2 rounded-2xl p-2 text-center shadow transition-colors ${selected ? "border-blue-600" : "border-transparent"}`}>
    <Handle type="target" position={Position.Top} id={`${id}-in`} className="w-3 h-3 bg-blue-500" />
    {data.image ? (
      <img src={data.image} alt="node" className="w-full h-24 object-cover rounded-xl" />
    ) : (
      <div className="w-full h-24 flex items-center justify-center bg-gray-100 text-gray-400 rounded-xl">+</div>
    )}
    <div className="mt-1 font-medium truncate" title={data.label}>{data.label || "Unnamed"}</div>
    {data.uploading === "yes" ? (
      <div className="text-xs text-gray-600 mt-1">uploading: yes</div>
    ) : (
      <div className="text-xs text-gray-600 whitespace-pre leading-4 mt-1">
        Design: {data.designType} {data.designDifficulty}
        {"\n"}Coding: {data.codingType} {data.codingDifficulty}
      </div>
    )}
    <Handle type="source" position={Position.Bottom} id={`${id}-out`} className="w-3 h-3 bg-blue-500" />
  </Card>
);
const nodeTypes: NodeTypes = { graphNode: GraphNode };

/* ---------- Edge component ---------- */
const DefaultEdge = ({ id, sourceX, sourceY, targetX, targetY, data, label }: EdgeProps) => {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  return (
    <g>
      <path id={id} d={edgePath} stroke="#555" strokeWidth={2} fill="none" />
      {label && (
        <text>
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle" dominantBaseline="central" fill="#000" fontSize={12}>
            {label}
          </textPath>
        </text>
      )}
    </g>
  );
};

/* ---------- Estimate helpers ---------- */
interface SummaryRow { work: string; rate: number; qty: number; sum: number }
const buildSummary = (nodes: Node<NodeData>[], rates: Record<string, number>, filter: CreateType | null): SummaryRow[] => {
  const counts: Record<string, number> = Object.fromEntries(WORK_TYPES.map((k) => [k, 0]));
  nodes.forEach(({ data }) => {
    if (!filter || data.designType === filter) counts[`Design-${data.designDifficulty}`] += 1;
    if (!filter || data.codingType === filter) counts[`Coding-${data.codingDifficulty}`] += 1;
  });
  return WORK_TYPES.map((wt) => ({ work: wt, rate: rates[wt], qty: counts[wt], sum: counts[wt] * rates[wt] }));
};
const SummaryTable = ({ title, rows, onRateChange }: { title: string; rows: SummaryRow[]; onRateChange: (work: string, v: number) => void }) => {
  const total = rows.reduce((a, r) => a + r.sum, 0);
  return (
    <div className="mb-6 max-w-md">
      <h3 className="font-semibold mb-2">{title}</h3>
      <Table className="w-full text-sm border">
        <thead>
          <tr>
            <th className="p-2 text-left">Вид работ</th>
            <th className="p-2 text-left">Ставка</th>
            <th className="p-2 text-left">Кол-во</th>
            <th className="p-2 text-left">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.work} className="border-t">
              <td className="p-2">{r.work}</td>
              <td className="p-2">
                <input type="number" value={r.rate} onChange={(e) => onRateChange(r.work, Number(e.target.value))} className="w-20 border rounded px-1 text-left" />
              </td>
              <td className="p-2 text-left">{r.qty}</td>
              <td className="p-2 text-left">{r.sum}</td>
            </tr>
          ))}
          <tr className="border-t font-semibold">
            <td className="p-2" colSpan={3}>Итого</td>
            <td className="p-2 text-right">{total}</td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
};

/* ---------- Main Component ---------- */
export default function GraphEditor() {
  const [hideBackground, setHideBackground] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null); // ⬅️ Добавлен ref
  const [nodes, setNodes] = useState<Node<NodeData>[]>([
    createChildNode({ id: "root", position: { x: 250, y: 25 } } as Node<NodeData>, "1", 0),
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ ...DEFAULT_RATES });
  const [edgeComment, setEdgeComment] = useState<string>("");
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const idCounter = useRef(2);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formState, setFormState] = useState<NodeData>(createChildNode({ id: "tmp", position: { x: 0, y: 0 } } as Node<NodeData>, "tmp").data);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const newSummary = useMemo(() => buildSummary(nodes, rates, "new"), [nodes, rates]);
  const adaptSummary = useMemo(() => buildSummary(nodes, rates, "adapt"), [nodes, rates]);

  /* --- Effects --- */
  useEffect(() => { if (selectedNode) setFormState({ ...selectedNode.data }); }, [selectedNode]);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = reader.result as string;
        if (isDialogOpen) setFormState((s) => ({ ...s, image: img }));
        else if (selectedNodeId) setNodes((nds) => nds.map((n) => n.id === selectedNodeId ? { ...n, data: { ...n.data, image: img } } : n));
      };
      reader.readAsDataURL(file);
      e.preventDefault();
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [isDialogOpen, selectedNodeId]);

  const exportImage = async () => {
    setHideBackground(true);
    await new Promise((r) => setTimeout(r, 50));
  
    if (!reactFlowWrapper.current) return;
    const flowRoot = reactFlowWrapper.current.querySelector(
      ".react-flow"
    ) as HTMLElement;
    if (!flowRoot) return;
  
    /* 1️⃣ вычисляем реальные границы по узлам  */
    const b = nodes.reduce(
      (acc, n) => {
        const w = n.width ?? 250;
        const h = n.height ?? 150;
        return {
          minX: Math.min(acc.minX, n.position.x),
          minY: Math.min(acc.minY, n.position.y),
          maxX: Math.max(acc.maxX, n.position.x + w),
          maxY: Math.max(acc.maxY, n.position.y + h),
        };
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );
  
    /*  —  небольшой отступ  */
    const PAD = 64;
    const fullW = b.maxX - b.minX + PAD * 2;
    const fullH = b.maxY - b.minY + PAD * 2;
  
    /* 2️⃣  сохраняем исходные стили контейнера  */
    const css = {
      w: flowRoot.style.width,
      h: flowRoot.style.height,
      tf: flowRoot.style.transform,
    };
    const vp = flowRoot.querySelector(
      ".react-flow__viewport"
    ) as HTMLElement | null;
    const vpOrigTf = vp?.style.transform ?? null;
  
    /* 3️⃣  полностью убираем transform и задаём явный size  */
    flowRoot.style.width = `${fullW}px`;
    flowRoot.style.height = `${fullH}px`;
    flowRoot.style.transform = "translate(0,0)";
    if (vp) vp.style.transform = `translate(${-b.minX + PAD}px,${-b.minY + PAD}px) scale(1)`;
  
    /* 4️⃣  фон + слой рёбер  */
    const edgeLayer = flowRoot.querySelector(".react-flow__edges") as HTMLElement | null;
    if (edgeLayer) edgeLayer.style.transform = "none";
  
    /* 5️⃣  экспорт  */
    const png = await toPng(flowRoot, {
      width: fullW,
      height: fullH,
      backgroundColor: "white",
    });
  
    /* 6️⃣  откат всех стилей  */
    flowRoot.style.width = css.w;
    flowRoot.style.height = css.h;
    flowRoot.style.transform = css.tf;
    if (vp && vpOrigTf !== null) vp.style.transform = vpOrigTf;
    if (edgeLayer) edgeLayer.style.transform = "";
  
    setHideBackground(false);
  
    const a = document.createElement("a");
    a.href = png;
    a.download = "graph.png";
    a.click();
  };
  
  

  /* --- Graph events --- */
  const onNodeClick = (_: React.MouseEvent, node: Node) => {
  setSelectedNodeId(node.id);
};
const onNodeDoubleClick = (_: React.MouseEvent, node: Node) => {
  setSelectedNodeId(node.id);
  setDialogOpen(true);
};
  const addNode = () => {
    const parent = selectedNode ?? nodes[0];
    const newId = `${idCounter.current++}`;
    const newNode = createChildNode(parent as Node<NodeData>, newId);
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, {
      id: `e${parent.id}-${newId}`,
      source: parent.id,
      target: newId,
      type: "smoothstep", // SVG-friendly edge for export
    }]);
  };
  const onNodesChange = useCallback((c: NodeChange[]) => setNodes((nds) => applyNodeChanges(c, nds)), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(c, eds)), []);
  const onConnect = useCallback((p: Edge | Connection) => setEdges((eds) => addEdge(p, eds)), []);
  const onEdgeDoubleClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.id);
    setEdgeComment(edge.data?.comment || "");
  };

  /* --- Rates --- */
  const handleRateChange = (work: string, val: number) => setRates((prev) => ({ ...prev, [work]: val }));

  /* --- Save / Load --- */
  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    const payload: PersistFile = {
      nodes: nodes.map(({ id, position, data }) => ({ id, position, data })),
      edges: edges.map(({ id, source, target, type }) => ({ id, source, target, type })),
      rates,
    };
    downloadJSON(payload, "graph.json");
  };
  
  /* ---------- File loading ---------- */
  const handleLoadClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as PersistFile;
        console.log("Loaded graph file", data);
        const enrichedNodes = data.nodes.map(n => ({ type: "graphNode", ...n }));
        setNodes(enrichedNodes as any);
        const enrichedEdges = data.edges.map((e) => ({
          ...e,
          type: e.type ?? "smoothstep",
        }));
        setEdges(enrichedEdges as any);
        setRates(data.rates || DEFAULT_RATES);
        idCounter.current = data.nodes.length + 1;
      } catch (err) {
        console.error("Invalid file", err);
      }
    };
    reader.readAsText(file);
  };

  /* --- Node dialog --- */
  const saveNode = () => { if (!selectedNode) return; setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...formState } } : n)); setDialogOpen(false); };
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setFormState((s) => ({ ...s, image: r.result as string })); r.readAsDataURL(f);
  };

  /* --- Render --- */
  return (
    <ReactFlowProvider>
      <Tabs defaultValue="graph" className="w-full h-screen flex flex-col">
        <TabsList className="p-2 bg-gray-50 border-b">
          <TabsTrigger value="graph">Graph</TabsTrigger>
          <TabsTrigger value="estimate">Estimate</TabsTrigger>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleLoadClick}>Load</Button>
            <Button size="sm" variant="secondary" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="secondary" onClick={exportImage}>Export PNG</Button>
            <Button size="sm" onClick={addNode}>Add Node</Button>
          </div>
        </TabsList>

        <TabsContent value="graph" className="flex-1">
          <div ref={reactFlowWrapper} className="w-full h-full">
              <ReactFlow
                nodes={nodes}
                edgeTypes={{ default: DefaultEdge, smoothstep: DefaultEdge }}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                nodeTypes={nodeTypes}
                snapToGrid
                connectionMode={ConnectionMode.Loose}
                onEdgeDoubleClick={onEdgeDoubleClick}
                className="w-full h-full"
              >
                {!hideBackground && <Background gap={16} />}
                <Controls />
              </ReactFlow>
            </div>
        </TabsContent>

        <TabsContent value="estimate" className="flex-1 overflow-y-auto p-4">
          <SummaryTable title="Новая разработка" rows={newSummary} onRateChange={handleRateChange} />
          <SummaryTable title="Адаптация" rows={adaptSummary} onRateChange={handleRateChange} />
        </TabsContent>
      </Tabs>

      {/* Hidden file input */}
      <input type="file" accept="application/json" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Node</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={formState.label} onChange={(e) => setFormState((s) => ({ ...s, label: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Comment</label>
              <Textarea rows={3} value={formState.comment} onChange={(e) => setFormState((s) => ({ ...s, comment: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Image</label>
              <Input type="file" accept="image/*" onChange={handleImageUpload} />
              {formState.image && <img src={formState.image} alt="preview" className="mt-2 w-full h-32 object-cover rounded" />}
            </div>
            {/* Uploading */}
            <div>
              <label className="text-sm font-medium">Uploading</label>
              <Select value={formState.uploading} onValueChange={(v: YesNo) => setFormState((s) => ({ ...s, uploading: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
              </Select>
            </div>
            {/* Design / Coding props */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Design Type</label>
                <Select value={formState.designType} onValueChange={(v: CreateType) => setFormState((s) => ({ ...s, designType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="adapt">Adapt</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Design Difficulty</label>
                <Select value={formState.designDifficulty} onValueChange={(v: Difficulty) => setFormState((s) => ({ ...s, designDifficulty: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="simple">Simple</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="complex">Complex</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Coding Type</label>
                <Select value={formState.codingType} onValueChange={(v: CreateType) => setFormState((s) => ({ ...s, codingType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="adapt">Adapt</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Coding Difficulty</label>
                <Select value={formState.codingDifficulty} onValueChange={(v: Difficulty) => setFormState((s) => ({ ...s, codingDifficulty: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="simple">Simple</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="complex">Complex</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={saveNode}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedEdge !== null} onOpenChange={(open) => !open && setSelectedEdge(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edge Comment</DialogTitle></DialogHeader>
          <Textarea value={edgeComment} onChange={(e) => setEdgeComment(e.target.value)} rows={3} />
          <DialogFooter>
            <Button onClick={() => {
              setEdges((eds) => eds.map((e) => e.id === selectedEdge ? { ...e, data: { ...e.data, comment: edgeComment }, label: edgeComment } : e));
              setSelectedEdge(null);
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </ReactFlowProvider>
  );
}
