import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
} from "react";
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Position,
    ReactFlowProvider,
    Handle,
    useReactFlow,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { LuFlagTriangleRight } from "react-icons/lu";

const controlsStyle = `
    .react-flow__controls {
        top: 16px !important;
        right: 16px !important;
        bottom: auto !important;
        left: auto !important;
        width: auto !important;
        display: flex !important;
        flex-direction: row !important;
        gap: 8px !important;
        margin: 0 !important;
        padding: 0 !important;
    }
    .react-flow__controls-button {
        width: 40px !important;
        height: 40px !important;
        min-width: 40px !important;
        min-height: 40px !important;
        max-width: 40px !important;
        max-height: 40px !important;
        padding: 0 !important;
        margin: 0 !important;
        border: 1px solid #e5e7eb !important;
        background: white !important;
        border-radius: 8px !important;
        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.2s ease !important;
    }
    .react-flow__controls-button:hover {
        background: #f9fafb !important;
        border-color: #d1d5db !important;
        box-shadow: 0 4px 6px 0 rgba(0, 0, 0, 0.15) !important;
    }
    .react-flow__controls-button:active {
        transform: scale(0.95) !important;
    }
    .react-flow__controls-button svg {
        width: 18px !important;
        height: 18px !important;
        stroke-width: 2 !important;
    }
`;

if (typeof document !== "undefined") {
    const styleElement = document.createElement("style");
    styleElement.textContent = controlsStyle;
    if (!document.head.querySelector("style[data-react-flow-controls]")) {
        styleElement.setAttribute("data-react-flow-controls", "true");
        document.head.appendChild(styleElement);
    }
}

const ObjectiveNode = ({
    data,
    sourcePosition,
    targetPosition,
    hasChildren,
    isExpanded,
    onToggleExpand,
    layoutDirection,
}) => {
    const getLevelColor = (level) => {
        const colors = {
            company: "bg-blue-500",
            unit: "bg-purple-500",
            team: "bg-green-500",
            person: "bg-yellow-500",
        };
        return colors[level] || "bg-gray-500";
    };

    const getLevelLabel = (level) => {
        const labels = {
            company: "Công ty",
            unit: "Đơn vị",
            team: "Nhóm",
            person: "Cá nhân",
        };
        return labels[level] || level || "";
    };

    const formatProgress = (progress) => {
        return typeof progress === "number"
            ? Math.round(progress * 10) / 10
            : 0;
    };

    return (
        <div className="bg-white rounded-lg border-2 border-gray-300 shadow-lg p-4 min-w-[280px] max-w-[320px] relative">
            <Handle
                type="source"
                position={sourcePosition || Position.Right}
                id="source"
                style={{
                    background: "transparent",
                    width: 12,
                    height: 12,
                    border: "none",
                    opacity: 0,
                }}
            />
            <Handle
                type="target"
                position={targetPosition || Position.Left}
                id="target"
                style={{
                    background: "transparent",
                    width: 12,
                    height: 12,
                    border: "none",
                    opacity: 0,
                }}
            />
            <div className="flex items-start gap-3 mb-3">
                <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getLevelColor(
                        data.level
                    )} relative`}
                >
                    <LuFlagTriangleRight
                        className="w-6 h-6 text-white flex-shrink-0"
                        style={{ transform: "translate(2px, 0)" }}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-600 uppercase">
                            Objective
                        </span>
                        {data.level && (
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                Cấp: {getLevelLabel(data.level)}
                            </span>
                        )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">
                        {data.obj_title}
                    </h3>
                    {data.department && (
                        <p className="text-xs text-gray-500">
                            {data.department.department_name ||
                                data.department.d_name}
                        </p>
                    )}
                </div>
            </div>

            <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">
                        Tiến độ
                    </span>
                    <span className="text-xs font-bold text-gray-900">
                        {formatProgress(data.progress_percent)}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${
                            (data.progress_percent || 0) >= 80
                                ? "bg-green-500"
                                : (data.progress_percent || 0) >= 50
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                        }`}
                        style={{
                            width: `${Math.min(
                                100,
                                Math.max(0, data.progress_percent || 0)
                            )}%`,
                        }}
                    />
                </div>
            </div>

            {hasChildren && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleExpand) onToggleExpand();
                    }}
                    className={`w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-blue-500 hover:shadow-lg hover:scale-110 transition-all duration-200 absolute z-10 group ${
                        layoutDirection === "horizontal"
                            ? "right-0 top-1/2 -translate-y-1/2 translate-x-1/2"
                            : "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
                    }`}
                    title={isExpanded ? "Thu gọn" : "Mở rộng"}
                >
                    {isExpanded ? (
                        <svg
                            className="w-3 h-3 text-gray-600 group-hover:text-white transition-colors"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M20 12H4"
                            />
                        </svg>
                    ) : (
                        <svg
                            className={`w-3 h-3 text-gray-600 group-hover:text-white transition-colors ${
                                layoutDirection === "horizontal"
                                    ? "rotate-90"
                                    : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
};

const KeyResultNode = ({
    data,
    sourcePosition,
    targetPosition,
    hasChildren,
    isExpanded,
    onToggleExpand,
    layoutDirection,
}) => {
    const formatProgress = (progress) => {
        return typeof progress === "number"
            ? Math.round(progress * 10) / 10
            : 0;
    };

    return (
        <div className="bg-white rounded-lg border-2 border-indigo-300 shadow-lg p-4 min-w-[280px] max-w-[320px] relative">
            <Handle
                type="source"
                position={sourcePosition || Position.Right}
                id="source"
                style={{
                    background: "transparent",
                    width: 12,
                    height: 12,
                    border: "none",
                    opacity: 0,
                }}
            />
            <Handle
                type="target"
                position={targetPosition || Position.Left}
                id="target"
                style={{
                    background: "transparent",
                    width: 12,
                    height: 12,
                    border: "none",
                    opacity: 0,
                }}
            />
            <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-indigo-500">
                    <svg
                        className="w-7 h-7 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-600 uppercase">
                            Key Result
                        </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">
                        {data.kr_title}
                    </h3>
                </div>
            </div>

            <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">
                        Tiến độ
                    </span>
                    <span className="text-xs font-bold text-gray-900">
                        {formatProgress(data.progress_percent)}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${
                            (data.progress_percent || 0) >= 80
                                ? "bg-green-500"
                                : (data.progress_percent || 0) >= 50
                                ? "bg-yellow-500"
                                : "bg-indigo-500"
                        }`}
                        style={{
                            width: `${Math.min(
                                100,
                                Math.max(0, data.progress_percent || 0)
                            )}%`,
                        }}
                    />
                </div>
            </div>

            {data.assigned_user && (
                <div className="text-xs text-gray-500">
                    Người phụ trách: {data.assigned_user.full_name}
                </div>
            )}

            {hasChildren && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleExpand) onToggleExpand();
                    }}
                    className={`w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-blue-500 hover:shadow-lg hover:scale-110 transition-all duration-200 absolute z-10 group ${
                        layoutDirection === "horizontal"
                            ? "right-0 top-1/2 -translate-y-1/2 translate-x-1/2"
                            : "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
                    }`}
                    title={isExpanded ? "Thu gọn" : "Mở rộng"}
                >
                    {isExpanded ? (
                        <svg
                            className="w-3 h-3 text-gray-600 group-hover:text-white transition-colors"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M20 12H4"
                            />
                        </svg>
                    ) : (
                        <svg
                            className={`w-3 h-3 text-gray-600 group-hover:text-white transition-colors ${
                                layoutDirection === "horizontal"
                                    ? "rotate-90"
                                    : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
};

function TreeFlow({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    nodeTypes,
    layoutDirection,
}) {
    const { fitView } = useReactFlow();

    useEffect(() => {
        if (nodes.length === 0) return;
        const timer = setTimeout(() => {
            fitView({
                padding: 0.2,
                includeHiddenNodes: false,
                maxZoom: 1.5,
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [nodes, layoutDirection, fitView]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{
                padding: 0.2,
                includeHiddenNodes: false,
                maxZoom: 1.5,
                minZoom: 0.3,
            }}
            minZoom={0.1}
            maxZoom={2}
            style={{ width: "100%", height: "100%" }}
        >
            <Controls />
            <MiniMap
                nodeColor={(node) =>
                    node.type === "key_result" ? "#6366f1" : "#3b82f6"
                }
                maskColor="rgba(0, 0, 0, 0.1)"
            />
            <Background color="#f1f5f9" gap={16} />
        </ReactFlow>
    );
}

const OkrTreeCanvas = ({
    data,
    loading = false,
    emptyMessage = "Không có dữ liệu để hiển thị",
    height = 540,
    initialLayout = "horizontal",
    layoutDirection: controlledLayout,
    onLayoutDirectionChange,
    showLayoutToggle = true,
    extraControls,
}) => {
    const [internalLayout, setInternalLayout] = useState(initialLayout);
    const layoutDirection = controlledLayout || internalLayout;
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [allNodes, setAllNodes] = useState([]);
    const [allEdges, setAllEdges] = useState([]);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const normalizedRoots = useMemo(() => {
        if (!data) return [];
        if (Array.isArray(data)) return data.filter(Boolean);
        return [data];
    }, [data]);

    const buildFlowData = useCallback((node, parentId = null) => {
        if (!node) return { nodes: [], edges: [] };

        const nodeId =
            node.id ||
            (node.objective_id
                ? `obj-${node.objective_id}`
                : node.kr_id
                ? `kr-${node.kr_id}`
                : `okr-node-${Math.random().toString(36).slice(2, 9)}`);

        const nodeType =
            node.type ||
            (node.kr_id || node.type === "key_result"
                ? "key_result"
                : "objective");
        const hasChildrenNodes =
            Array.isArray(node.children) && node.children.length > 0;

        const flowNode = {
            id: nodeId,
            type: nodeType,
            data: {
                ...node,
                hasChildren: hasChildrenNodes,
            },
        };

        const flowNodes = [flowNode];
        const flowEdges = [];

        if (parentId) {
            flowEdges.push({
                id: `${parentId}-${nodeId}`,
                source: parentId,
                target: nodeId,
                type: "smoothstep",
                animated: true,
                style: { stroke: "#94a3b8", strokeWidth: 2 },
            });
        }

        if (hasChildrenNodes) {
            node.children.forEach((child) => {
                const childData = buildFlowData(child, nodeId);
                flowNodes.push(...childData.nodes);
                flowEdges.push(...childData.edges);
            });
        }

        return { nodes: flowNodes, edges: flowEdges };
    }, []);

    useEffect(() => {
        if (!normalizedRoots.length) {
            setAllNodes([]);
            setAllEdges([]);
            setNodes([]);
            setEdges([]);
            setExpandedNodes(new Set());
            return;
        }

        const aggregate = normalizedRoots.reduce(
            (acc, root) => {
                const { nodes, edges } = buildFlowData(root);
                acc.nodes.push(...nodes);
                acc.edges.push(...edges);
                return acc;
            },
            { nodes: [], edges: [] }
        );

        setAllNodes(aggregate.nodes);
        setAllEdges(aggregate.edges);

        const rootIds = aggregate.nodes
            .filter(
                (node) =>
                    !aggregate.edges.some((edge) => edge.target === node.id)
            )
            .map((node) => node.id);
        setExpandedNodes(new Set(rootIds));
    }, [normalizedRoots, buildFlowData, setNodes, setEdges]);

    const getLayoutedElements = useCallback(
        (nodes, edges, direction = "TB") => {
            const dagreGraph = new dagre.graphlib.Graph();
            dagreGraph.setDefaultEdgeLabel(() => ({}));
            dagreGraph.setGraph({
                rankdir: direction,
                nodesep: 100,
                ranksep: 150,
                marginx: 50,
                marginy: 50,
            });

            const nodeWidth = 320;
            const nodeHeight = 220;

            nodes.forEach((node) => {
                dagreGraph.setNode(node.id, {
                    width: nodeWidth,
                    height: nodeHeight,
                });
            });

            edges.forEach((edge) => {
                dagreGraph.setEdge(edge.source, edge.target);
            });

            dagre.layout(dagreGraph);

            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;

            nodes.forEach((node) => {
                const nodeWithPosition = dagreGraph.node(node.id);
                const x = nodeWithPosition.x - nodeWidth / 2;
                const y = nodeWithPosition.y - nodeHeight / 2;

                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x + nodeWidth);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y + nodeHeight);
            });

            const graphCenterX = (minX + maxX) / 2;
            const graphCenterY = (minY + maxY) / 2;

            nodes.forEach((node) => {
                const nodeWithPosition = dagreGraph.node(node.id);
                node.targetPosition =
                    direction === "LR" ? Position.Left : Position.Top;
                node.sourcePosition =
                    direction === "LR" ? Position.Right : Position.Bottom;
                node.position = {
                    x: nodeWithPosition.x - nodeWidth / 2 - graphCenterX,
                    y: nodeWithPosition.y - nodeHeight / 2 - graphCenterY,
                };
            });

            return { nodes, edges };
        },
        []
    );

    const filterNodesAndEdges = useCallback(
        (allNodesList, allEdgesList, expandedSet) => {
            const visibleNodeIds = new Set();
            const visibleEdges = [];

            const rootNodes = allNodesList.filter(
                (node) =>
                    !allEdgesList.some((edge) => edge.target === node.id)
            );

            const queue = [...rootNodes.map((n) => n.id)];
            rootNodes.forEach((n) => visibleNodeIds.add(n.id));

            while (queue.length > 0) {
                const currentNodeId = queue.shift();

                if (expandedSet.has(currentNodeId)) {
                    const childEdges = allEdgesList.filter(
                        (edge) => edge.source === currentNodeId
                    );
                    childEdges.forEach((edge) => {
                        if (!visibleNodeIds.has(edge.target)) {
                            visibleNodeIds.add(edge.target);
                            queue.push(edge.target);
                        }
                        visibleEdges.push(edge);
                    });
                }
            }

            const visibleNodes = allNodesList.filter((node) =>
                visibleNodeIds.has(node.id)
            );

            return { nodes: visibleNodes, edges: visibleEdges };
        },
        []
    );

    useEffect(() => {
        if (allNodes.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const { nodes: visibleNodes, edges: visibleEdges } =
            filterNodesAndEdges(allNodes, allEdges, expandedNodes);

        const direction = layoutDirection === "horizontal" ? "LR" : "TB";
        const { nodes: layoutedNodes, edges: layoutedEdges } =
            getLayoutedElements(visibleNodes, visibleEdges, direction);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [
        allNodes,
        allEdges,
        expandedNodes,
        layoutDirection,
        filterNodesAndEdges,
        getLayoutedElements,
        setNodes,
        setEdges,
    ]);

    const handleToggleExpand = useCallback((nodeId) => {
        setExpandedNodes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) newSet.delete(nodeId);
            else newSet.add(nodeId);
            return newSet;
        });
    }, []);

    const nodeTypes = useMemo(
        () => ({
            objective: (props) => {
                const nodeData = props.data || {};
                return (
                    <ObjectiveNode
                        {...props}
                        hasChildren={nodeData.hasChildren || false}
                        isExpanded={expandedNodes.has(props.id)}
                        onToggleExpand={() => handleToggleExpand(props.id)}
                        layoutDirection={layoutDirection}
                    />
                );
            },
            key_result: (props) => {
                const nodeData = props.data || {};
                return (
                    <KeyResultNode
                        {...props}
                        hasChildren={nodeData.hasChildren || false}
                        isExpanded={expandedNodes.has(props.id)}
                        onToggleExpand={() => handleToggleExpand(props.id)}
                        layoutDirection={layoutDirection}
                    />
                );
            },
        }),
        [expandedNodes, handleToggleExpand, layoutDirection]
    );

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-full text-slate-500">
                    Đang tải Tree view...
                </div>
            );
        }

        if (!normalizedRoots.length) {
            return (
                <div className="flex items-center justify-center h-full text-slate-500">
                    {emptyMessage}
                </div>
            );
        }

        return (
            <ReactFlowProvider>
                <TreeFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    layoutDirection={layoutDirection}
                />
                {showLayoutToggle && (
                <button
                    onClick={() => {
                        const next =
                            layoutDirection === "horizontal"
                                ? "vertical"
                                : "horizontal";
                        if (onLayoutDirectionChange) {
                            onLayoutDirectionChange(next);
                        } else {
                            setInternalLayout(next);
                        }
                    }}
                        className="absolute top-3 right-3 z-20 flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        title={
                            layoutDirection === "horizontal"
                                ? "Chuyển sang dọc"
                                : "Chuyển sang ngang"
                        }
                    >
                        <svg
                            className="w-5 h-5 text-gray-700"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                            />
                        </svg>
                    </button>
                )}
                {typeof extraControls === "function" &&
                    extraControls({
                        layoutDirection,
                        setLayoutDirection: (next) => {
                            if (onLayoutDirectionChange) {
                                onLayoutDirectionChange(next);
                            } else {
                                setInternalLayout(next);
                            }
                        },
                    })}
            </ReactFlowProvider>
        );
    };

    return (
        <div
            className="relative w-full bg-white rounded-xl border border-slate-200 overflow-hidden"
            style={{ height }}
        >
            {renderContent()}
        </div>
    );
};

export default OkrTreeCanvas;

