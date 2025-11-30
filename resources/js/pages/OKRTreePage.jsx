import React, { useState, useEffect, useCallback, useMemo } from "react";
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Position,
    ReactFlowProvider,
    useReactFlow,
    Handle,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { CycleDropdown } from "../components/Dropdown";
import ToastNotification from "../components/ToastNotification";

// Custom CSS for ReactFlow Controls
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

// Inject custom CSS
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.textContent = controlsStyle;
    if (!document.head.querySelector('style[data-react-flow-controls]')) {
        styleElement.setAttribute('data-react-flow-controls', 'true');
        document.head.appendChild(styleElement);
    }
}

// Custom Node Component cho Objective
const ObjectiveNode = ({ data, sourcePosition, targetPosition, hasChildren, isExpanded, onToggleExpand, layoutDirection }) => {
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
        return typeof progress === 'number' ? Math.round(progress * 10) / 10 : 0;
    };

    return (
        <div className="bg-white rounded-lg border-2 border-gray-300 shadow-lg p-4 min-w-[280px] max-w-[320px] relative">
            {/* Source Handle - để kết nối đi ra (ẩn nhưng vẫn hoạt động) */}
            <Handle
                type="source"
                position={sourcePosition || Position.Right}
                id="source"
                style={{ background: 'transparent', width: 12, height: 12, border: 'none', opacity: 0 }}
            />
            {/* Target Handle - để kết nối đi vào (ẩn nhưng vẫn hoạt động) */}
            <Handle
                type="target"
                position={targetPosition || Position.Left}
                id="target"
                style={{ background: 'transparent', width: 12, height: 12, border: 'none', opacity: 0 }}
            />
            <div className="flex items-start gap-3 mb-3">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getLevelColor(data.level)}`}>
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-600 uppercase">Objective</span>
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
                            {data.department.department_name}
                        </p>
                    )}
                </div>
            </div>

            <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">Tiến độ</span>
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
                        style={{ width: `${Math.min(100, Math.max(0, data.progress_percent || 0))}%` }}
                    />
                </div>
            </div>

            {/* Chevron Button - vị trí thay đổi theo layout */}
            {hasChildren && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleExpand) onToggleExpand();
                    }}
                    className={`w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors absolute z-10 ${
                        layoutDirection === 'horizontal' 
                            ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2' 
                            : 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2'
                    }`}
                    title={isExpanded ? "Thu gọn" : "Mở rộng"}
                >
                    {isExpanded ? (
                        // Expanded: hiển thị dấu trừ (minus)
                        <svg
                            className="w-3 h-3 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                        </svg>
                    ) : (
                        // Collapsed: hiển thị chevron theo hướng layout
                        <svg
                            className={`w-3 h-3 text-gray-600 ${layoutDirection === 'horizontal' ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
};

// Custom Node Component cho Key Result
const KeyResultNode = ({ data, sourcePosition, targetPosition, hasChildren, isExpanded, onToggleExpand, layoutDirection }) => {
    const formatProgress = (progress) => {
        return typeof progress === 'number' ? Math.round(progress * 10) / 10 : 0;
    };

    return (
        <div className="bg-white rounded-lg border-2 border-indigo-300 shadow-lg p-4 min-w-[280px] max-w-[320px] relative">
            {/* Source Handle - để kết nối đi ra (ẩn nhưng vẫn hoạt động) */}
            <Handle
                type="source"
                position={sourcePosition || Position.Right}
                id="source"
                style={{ background: 'transparent', width: 12, height: 12, border: 'none', opacity: 0 }}
            />
            {/* Target Handle - để kết nối đi vào (ẩn nhưng vẫn hoạt động) */}
            <Handle
                type="target"
                position={targetPosition || Position.Left}
                id="target"
                style={{ background: 'transparent', width: 12, height: 12, border: 'none', opacity: 0 }}
            />
            <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-indigo-500">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-600 uppercase">Key Result</span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">
                        {data.kr_title}
                    </h3>
                </div>
            </div>

            <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">Tiến độ</span>
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
                        style={{ width: `${Math.min(100, Math.max(0, data.progress_percent || 0))}%` }}
                    />
                </div>
            </div>

            {data.assigned_user && (
                <div className="text-xs text-gray-500">
                    Người phụ trách: {data.assigned_user.full_name}
                </div>
            )}

            {/* Chevron Button - vị trí thay đổi theo layout */}
            {hasChildren && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleExpand) onToggleExpand();
                    }}
                    className={`w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors absolute z-10 ${
                        layoutDirection === 'horizontal' 
                            ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2' 
                            : 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2'
                    }`}
                    title={isExpanded ? "Thu gọn" : "Mở rộng"}
                >
                    {isExpanded ? (
                        // Expanded: hiển thị dấu trừ (minus)
                        <svg
                            className="w-3 h-3 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                        </svg>
                    ) : (
                        // Collapsed: hiển thị chevron theo hướng layout
                        <svg
                            className={`w-3 h-3 text-gray-600 ${layoutDirection === 'horizontal' ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
};

// Node types sẽ được tạo động với callback

// Inner component để sử dụng useReactFlow hook
function OKRTreeFlow({ 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    nodeTypes, 
    layoutDirection 
}) {
    const { fitView } = useReactFlow();

    // Auto fit view khi nodes hoặc layout direction thay đổi
    useEffect(() => {
        if (nodes.length === 0) return;
        
        const timer = setTimeout(() => {
            fitView({
                padding: 0.2,
                maxZoom: 1.5,
                duration: 300,
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
                minZoom: 0.3
            }}
            minZoom={0.1}
            maxZoom={2}
            style={{ width: '100%', height: '100%' }}
        >
            <Controls />
            <MiniMap 
                nodeColor={(node) => {
                    if (node.type === 'key_result') return '#6366f1';
                    return '#3b82f6';
                }}
                maskColor="rgba(0, 0, 0, 0.1)"
            />
            <Background color="#f1f5f9" gap={16} />
        </ReactFlow>
    );
}

export default function OKRTreePage() {
    const [treeData, setTreeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [cycleId, setCycleId] = useState(null);
    const [cyclesList, setCyclesList] = useState([]);
    const [companyObjectives, setCompanyObjectives] = useState([]);
    const [selectedObjectiveId, setSelectedObjectiveId] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [objectiveDropdownOpen, setObjectiveDropdownOpen] = useState(false);
    const [layoutDirection, setLayoutDirection] = useState('horizontal'); // 'horizontal' or 'vertical'
    const [expandedNodes, setExpandedNodes] = useState(new Set()); // Track expanded nodes
    const [allNodes, setAllNodes] = useState([]); // Store all nodes (before filtering)
    const [allEdges, setAllEdges] = useState([]); // Store all edges (before filtering)
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Load cycles
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/cycles", {
                    headers: { Accept: "application/json" },
                });
                const json = await res.json();
                if (Array.isArray(json.data) && json.data.length > 0) {
                    setCyclesList(json.data);
                    const today = new Date();
                    const currentCycle = json.data.find(c => {
                        if (c.start_date && c.end_date) {
                            const start = new Date(c.start_date);
                            const end = new Date(c.end_date);
                            return today >= start && today <= end;
                        }
                        return false;
                    });
                    if (currentCycle) {
                        setCycleId(currentCycle.cycle_id);
                    }
                }
            } catch (error) {
                console.error("Error loading cycles:", error);
            }
        })();
    }, []);

    // Load company objectives khi cycle thay đổi
    useEffect(() => {
        if (cycleId === null && cyclesList.length > 0) {
            return;
        }

        (async () => {
            try {
                const url = cycleId 
                    ? `/api/okr-tree/company-objectives?cycle_id=${cycleId}`
                    : '/api/okr-tree/company-objectives';
                const res = await fetch(url, {
                    headers: { Accept: "application/json" },
                });
                const json = await res.json();

                if (json.success) {
                    setCompanyObjectives(json.data || []);
                    if (json.data && json.data.length > 0) {
                        const currentSelected = json.data.find(obj => obj.objective_id === selectedObjectiveId);
                        if (!currentSelected) {
                            setSelectedObjectiveId(json.data[0].objective_id);
                        }
                    } else {
                        setSelectedObjectiveId(null);
                    }
                }
            } catch (error) {
                console.error("Error loading company objectives:", error);
            }
        })();
    }, [cycleId, cyclesList.length]);

    // Load tree data khi objective được chọn
    useEffect(() => {
        if (!selectedObjectiveId) {
            setTreeData(null);
            setNodes([]);
            setEdges([]);
            return;
        }

        setLoading(true);
        (async () => {
            try {
                const url = cycleId 
                    ? `/api/okr-tree?cycle_id=${cycleId}&objective_id=${selectedObjectiveId}`
                    : `/api/okr-tree?objective_id=${selectedObjectiveId}`;
                const res = await fetch(url, {
                    headers: { Accept: "application/json" },
                });
                const json = await res.json();

                if (json.success) {
                    setTreeData(json.data);
                } else {
                    setToast({
                        type: "error",
                        message: json.message || "Không thể tải dữ liệu tree view",
                    });
                }
            } catch (error) {
                setToast({
                    type: "error",
                    message: "Lỗi khi tải dữ liệu tree view",
                });
            } finally {
                setLoading(false);
            }
        })();
    }, [selectedObjectiveId, cycleId]);

    // Function to get layout using dagre
    const getLayoutedElements = useCallback((nodes, edges, direction = 'TB') => {
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));
        dagreGraph.setGraph({ 
            rankdir: direction,
            nodesep: 100, // Khoảng cách giữa các nodes cùng level
            ranksep: 150, // Khoảng cách giữa các levels
            align: 'UL',
            marginx: 50,
            marginy: 50,
        });

        // Kích thước node
        const nodeWidth = 320;
        const nodeHeight = 220;

        nodes.forEach((node) => {
            dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        // Tính toán bounding box
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

        // Tính center của graph
        const graphWidth = maxX - minX;
        const graphHeight = maxY - minY;
        const graphCenterX = (minX + maxX) / 2;
        const graphCenterY = (minY + maxY) / 2;
        
        // Offset để đưa graph về gốc tọa độ (0,0) làm center
        const offsetX = -graphCenterX;
        const offsetY = -graphCenterY;

        nodes.forEach((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            node.targetPosition = direction === 'LR' ? Position.Left : Position.Top;
            node.sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;
            node.position = {
                x: nodeWithPosition.x - nodeWidth / 2 + offsetX,
                y: nodeWithPosition.y - nodeHeight / 2 + offsetY,
            };
        });

        return { nodes, edges };
    }, []);

    // Helper function to check if a node has children
    const hasChildren = useCallback((nodeId, allNodes, allEdges) => {
        return allEdges.some(edge => edge.source === nodeId);
    }, []);

    // Helper function to get all descendant node IDs
    const getDescendantIds = useCallback((nodeId, allEdges) => {
        const descendants = new Set();
        const queue = [nodeId];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const children = allEdges
                .filter(edge => edge.source === current)
                .map(edge => edge.target);
            
            children.forEach(child => {
                if (!descendants.has(child)) {
                    descendants.add(child);
                    queue.push(child);
                }
            });
        }
        
        return descendants;
    }, []);

    // Filter nodes and edges based on expanded state
    const filterNodesAndEdges = useCallback((allNodesList, allEdgesList, expandedSet) => {
        const visibleNodeIds = new Set();
        const visibleEdges = [];
        
        // Start with root nodes (nodes without incoming edges)
        const rootNodes = allNodesList.filter(node => 
            !allEdgesList.some(edge => edge.target === node.id)
        );
        
        // BFS to find all visible nodes
        const queue = [...rootNodes.map(n => n.id)];
        rootNodes.forEach(n => visibleNodeIds.add(n.id));
        
        while (queue.length > 0) {
            const currentNodeId = queue.shift();
            
            // If node is expanded, add its children
            if (expandedSet.has(currentNodeId)) {
                const childEdges = allEdgesList.filter(edge => edge.source === currentNodeId);
                childEdges.forEach(edge => {
                    if (!visibleNodeIds.has(edge.target)) {
                        visibleNodeIds.add(edge.target);
                        queue.push(edge.target);
                    }
                    visibleEdges.push(edge);
                });
            }
        }
        
        const visibleNodes = allNodesList.filter(node => visibleNodeIds.has(node.id));
        
        return { nodes: visibleNodes, edges: visibleEdges };
    }, []);

    // Convert tree data to ReactFlow nodes and edges
    useEffect(() => {
        if (!treeData) {
            setAllNodes([]);
            setAllEdges([]);
            setNodes([]);
            setEdges([]);
            setExpandedNodes(new Set()); // Reset expanded nodes
            return;
        }

        const buildFlowData = (node, parentId = null) => {
            const nodeId = node.objective_id ? `obj-${node.objective_id}` : `kr-${node.kr_id}`;
            const nodeType = node.type === 'key_result' || node.kr_id ? 'key_result' : 'objective';
            
            const hasChildrenNodes = node.children && node.children.length > 0;
            
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

            // Add edge from parent
            if (parentId) {
                flowEdges.push({
                    id: `${parentId}-${nodeId}`,
                    source: parentId,
                    target: nodeId,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#94a3b8', strokeWidth: 2 },
                });
            }

            // Process children
            if (hasChildrenNodes) {
                node.children.forEach((child) => {
                    const childData = buildFlowData(child, nodeId);
                    flowNodes.push(...childData.nodes);
                    flowEdges.push(...childData.edges);
                });
            }

            return { nodes: flowNodes, edges: flowEdges };
        };

        const flowData = buildFlowData(treeData);
        
        // Store all nodes and edges
        setAllNodes(flowData.nodes);
        setAllEdges(flowData.edges);
        
        // Initialize: expand all root nodes by default
        const rootNodes = flowData.nodes.filter(node => 
            !flowData.edges.some(edge => edge.target === node.id)
        );
        
        if (rootNodes.length > 0) {
            setExpandedNodes(new Set(rootNodes.map(n => n.id)));
        } else {
            setExpandedNodes(new Set());
        }
    }, [treeData]);

    // Apply layout and filtering when nodes, edges, or expanded state changes
    useEffect(() => {
        if (allNodes.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        // Filter nodes and edges based on expanded state
        const { nodes: visibleNodes, edges: visibleEdges } = filterNodesAndEdges(
            allNodes,
            allEdges,
            expandedNodes
        );
        
        // Sử dụng dagre để tự động layout
        const direction = layoutDirection === 'horizontal' ? 'LR' : 'TB'; // LR = Left to Right, TB = Top to Bottom
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            visibleNodes,
            visibleEdges,
            direction
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
    }, [allNodes, allEdges, expandedNodes, layoutDirection, filterNodesAndEdges, getLayoutedElements, setNodes, setEdges]);

    // Handler to toggle expanded state
    const handleToggleExpand = useCallback((nodeId) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    }, []);

    // Create nodeTypes with callback
    const nodeTypes = useMemo(() => ({
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
    }), [expandedNodes, handleToggleExpand, layoutDirection]);


    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.relative')) {
                setObjectiveDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (loading && !treeData) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Đang tải dữ liệu...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-gray-50 overflow-hidden" style={{ height: 'calc(100vh - 95px)' }}>
            {!selectedObjectiveId ? (
                <div className="h-full flex items-center justify-center text-gray-500 bg-white overflow-hidden">
                    Vui lòng chọn Objective cấp công ty để xem tree view
                </div>
            ) : !treeData ? (
                <div className="h-full flex items-center justify-center text-gray-500 bg-white overflow-hidden">
                    Đang tải dữ liệu...
                </div>
            ) : (
                <div className="h-full w-full bg-white relative overflow-hidden">
                    <ReactFlowProvider>
                        <OKRTreeFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            nodeTypes={nodeTypes}
                            layoutDirection={layoutDirection}
                        />
                        {/* Controls - đặt ở góc trên bên trái trong ReactFlow view */}
                        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 flex-wrap">
                            {cyclesList && cyclesList.length > 0 && (
                                <CycleDropdown
                                    cyclesList={cyclesList}
                                    cycleFilter={cycleId}
                                    handleCycleChange={setCycleId}
                                    dropdownOpen={dropdownOpen}
                                    setDropdownOpen={setDropdownOpen}
                                />
                            )}
                            
                            {/* Company Objective Dropdown */}
                            {companyObjectives && companyObjectives.length > 0 && (
                                <div className="relative w-64">
                                    <button
                                        onClick={() => setObjectiveDropdownOpen((prev) => !prev)}
                                        className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                                    >
                                        <span className="flex items-center gap-2 truncate">
                                            {companyObjectives.find(
                                                (obj) => String(obj.objective_id) === String(selectedObjectiveId)
                                            )?.obj_title || "Chọn Objective công ty"}
                                        </span>
                                        <svg
                                            className={`w-4 h-4 transition-transform ${
                                                objectiveDropdownOpen ? "rotate-180" : ""
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
                                    </button>

                                    {objectiveDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-y-auto">
                                            {companyObjectives.map((obj) => (
                                                <label
                                                    key={obj.objective_id}
                                                    className={`flex items-center gap-3 px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${
                                                        String(selectedObjectiveId) === String(obj.objective_id)
                                                            ? "bg-blue-50 border-l-4 border-l-blue-500"
                                                            : ""
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="objective"
                                                        value={obj.objective_id}
                                                        checked={
                                                            String(selectedObjectiveId) === String(obj.objective_id)
                                                        }
                                                        onChange={(e) => {
                                                            setSelectedObjectiveId(Number(e.target.value));
                                                            setObjectiveDropdownOpen(false);
                                                        }}
                                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-slate-900">
                                                            {obj.obj_title}
                                                        </p>
                                                        {obj.cycle_name && (
                                                            <p className="text-xs text-gray-500">
                                                                {obj.cycle_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Layout Toggle Button - Icon Swap - cùng hàng với Controls, đặt bên trái Controls */}
                        <button
                            onClick={() => setLayoutDirection(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
                            className="absolute top-4 z-20 flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            style={{ right: '215px' }}
                            title={layoutDirection === 'horizontal' ? 'Chuyển sang dọc' : 'Chuyển sang ngang'}
                        >
                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </button>
                    </ReactFlowProvider>
                </div>
            )}

            {toast && (
                <ToastNotification
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
