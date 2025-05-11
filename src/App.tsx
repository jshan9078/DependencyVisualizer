import React, { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Panel,
  MiniMap,
  MarkerType,
} from "@xyflow/react";
import { FileNode, FileEdge } from "./types";
import "@xyflow/react/dist/style.css";
import { parseGithubRepo, isValidGithubUrl } from "./services/directoryParser";
import {
  createNodesAndEdges,
  findFunctionDependencies,
} from "./utils/fileParser";

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FileNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FileEdge>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [isUrlValid, setIsUrlValid] = useState(true);
  const [currentParsing, setCurrentlyParsing] = useState<string | null>();
  const [groupByDirectories, setGroupByDirectories] = useState(false); // Group By Directories state
  const [functionView, setFunctionView] = useState(false); // Function View state
  const [functionCalls, setFunctionCalls] = useState<any[]>([]);
  const [functionNodes, setFunctionNodes] = useState<any[]>([]);
  const [functionEdges, setFunctionEdges] = useState<any[]>([]);

  const handleRepoSubmit = useCallback(async () => {
    if (!isValidGithubUrl(repoUrl)) {
      setIsUrlValid(false);
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsUrlValid(true);

      // Parse the GitHub repository
      const result = await parseGithubRepo(repoUrl, setCurrentlyParsing);
      const files = result[0];
      const { nodes: fileNodesArray, edges: fileEdgeArray } =
        generateReactFlowElements(result[1]);
      setFunctionNodes(fileNodesArray);
      setFunctionEdges(fileEdgeArray);

      // Pass groupByDirectories and functionView to the createNodesAndEdges function
      const { nodes: newNodes, edges: newEdges } = createNodesAndEdges(
        files,
        groupByDirectories
        // functionView
      );

      const dependencies = findFunctionDependencies(files);

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to parse repository");
      }
    } finally {
      setIsLoading(false);
    }
  }, [repoUrl, setNodes, setEdges, groupByDirectories, functionView]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge({ ...params, type: "smoothstep", animated: true }, eds)
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: FileNode) => {
    setSelectedNode(node.id);
  }, []);

  const addNewNode = useCallback(() => {
    if (!selectedNode) return;

    const selectedNodeData = nodes.find((n) => n.id === selectedNode);
    if (!selectedNodeData) return;

    const newNodeId = `file-${nodes.length + 1}`;
    let position;

    // Fallback to random position
    position = { x: Math.random() * 500, y: Math.random() * 500 };

    const newNode: FileNode = {
      id: newNodeId,
      type: "default",
      position,
      data: {
        label: `New File ${nodes.length + 1}`,
        filePath: `file${nodes.length + 1}.ts`,
        imports: [],
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: `e${selectedNode}-${newNodeId}`,
        source: selectedNode,
        target: newNodeId,
        type: "smoothstep",
        animated: true,
        data: { type: "import" },
      },
    ]);
  }, [selectedNode, nodes, setNodes, setEdges]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1,
          display: "flex",
          gap: "10px",
          alignItems: "center",
          background: "white",
          padding: "10px",
          borderRadius: "4px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => {
            setRepoUrl(e.target.value);
            setIsUrlValid(true);
            setError(null);
          }}
          placeholder="Enter GitHub repository URL"
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            border: `1px solid ${isUrlValid ? "#ccc" : "#ff4444"}`,
            width: "300px",
          }}
        />
        <button
          onClick={handleRepoSubmit}
          disabled={isLoading}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "none",
            background: "#4CAF50",
            color: "white",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? "Loading..." : "Analyze Repository"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            position: "absolute",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "red",
            background: "white",
            padding: "10px",
            borderRadius: "4px",
            zIndex: 1,
          }}
        >
          {error}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "green",
            background: "white",
            padding: "10px",
            borderRadius: "4px",
            zIndex: 1,
          }}
        >
          {currentParsing && currentParsing !== "Parsing Complete"
            ? `Currently parsing ${currentParsing}`
            : ""}
          {currentParsing === "Parsing Complete" ? `${currentParsing}` : ""}
        </div>
      )}
      {functionView ? (
        <div style={{ height: "100vh" }}>
          <ReactFlow
            className="react-flow-subflows-example"
            nodes={functionNodes}
            fitView
            edges={functionEdges}
            style={{ width: "100%", height: "100%" }}
          >
            <MiniMap />
            <Controls />
            <Background />
            {/* Group By Directories Toggle */}
            <div
              style={{
                position: "absolute",
                bottom: "120px", // Adjusted for better placement
                left: "20px",
                // transform: "translateX(-50%)",
                zIndex: 99,
                background: "white",
                padding: "10px",
                borderRadius: "4px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              <label>
                <input
                  type="checkbox"
                  checked={groupByDirectories}
                  onChange={() => setGroupByDirectories((prev) => !prev)}
                />
                Group By Directories
              </label>

              {/* Function View Toggle */}
              <label>
                <input
                  type="checkbox"
                  checked={functionView}
                  onChange={() => setFunctionView((prev) => !prev)}
                />
                Function View
              </label>
            </div>
          </ReactFlow>
        </div>
      ) : (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          <ReactFlow
            style={{ backgroundColor: "#F7F9FB" }}
            className="react-flow-subflows-example"
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
          >
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} />
            <Controls />
            <Panel position="bottom-right">
              <div
                style={{
                  background: "white",
                  padding: "10px",
                  borderRadius: "4px",
                }}
              >
                {nodes.length} files, {edges.length} dependencies
              </div>
            </Panel>

            {/* Group By Directories Toggle */}
            <div
              style={{
                position: "absolute",
                bottom: "120px", // Adjusted for better placement
                left: "20px",
                // transform: "translateX(-50%)",
                zIndex: 99,
                background: "white",
                padding: "10px",
                borderRadius: "4px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              <label>
                <input
                  type="checkbox"
                  checked={groupByDirectories}
                  onChange={() => setGroupByDirectories((prev) => !prev)}
                />
                Group By Directories
              </label>

              {/* Function View Toggle */}
              <label>
                <input
                  type="checkbox"
                  checked={functionView}
                  onChange={() => setFunctionView((prev) => !prev)}
                />
                Function View
              </label>
            </div>
          </ReactFlow>
        </div>
      )}

      {selectedNode && (
        <button
          onClick={addNewNode}
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Add Dependent File
        </button>
      )}
    </div>
  );
}
const generateReactFlowElements = (functionCalls: any) => {
  // Create a Set of unique nodes
  const nodesSet = new Set();
  const edgesSet = new Set();

  // Collect nodes from function calls
  functionCalls.forEach((call: any) => {
    // Add caller node
    nodesSet.add(call.caller);

    // Add name node if it has a source or is part of a known function
    if (call.source || call.resolved === "imported") {
      nodesSet.add(call.name);
    }
  });

  // Convert nodes to an array for positioning
  const nodesArray = Array.from(nodesSet);

  // Generate nodes with more spread-out positioning
  const nodes = nodesArray.map((nodeName, index) => ({
    id: nodeName as string,
    data: { label: nodeName },
    position: {
      x: 300 * (index % 3), // Spread horizontally
      y: 200 * Math.floor(index / 3), // Create rows
    },
    style: {
      background: "#D1E8FF",
      color: "#333",
      border: "1px solid #4A90E2",
      borderRadius: "5px",
      padding: "10px",
      width: 150,
      textAlign: "center",
    },
  }));

  // Generate edges with arrow markers
  const edges = functionCalls.map((call: any, index: number) => ({
    id: `edge-${index}`,
    source: call.caller,
    target: call.name,
    type: "smoothstep",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: call.resolved === "imported" ? "#4CAF50" : "#FF5722",
    },
    style: {
      stroke: call.resolved === "imported" ? "#4CAF50" : "#FF5722",
      strokeWidth: 2,
    },
    animated: call.resolved === "imported",
  }));

  return { nodes, edges };
};

export default App;
