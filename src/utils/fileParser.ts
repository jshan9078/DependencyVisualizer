import { FileNode, FileEdge, ProjectComponent } from "../types";
import { MarkerType } from "@xyflow/react";

const edgeStyle = {
  stroke: "#555",
  strokeWidth: 2,
};

function getDirectory(filePath: string): string {
  const lastSlashIndex = filePath.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    // No directory separator found, returning an empty string
    return "";
  }
  return filePath.substring(0, lastSlashIndex);
}

// Helper to get directory path from file path
function getDirectoryPath(filePath: string): string {
  return filePath.split("/").slice(0, -1).join("/");
}

// Helper to get base name from path
function getBaseName(path: string): string {
  const lastSlashIndex = path.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    return path;
  }
  return path.substring(lastSlashIndex + 1);
}

export function createNodesAndEdges(
  files: ProjectComponent[],
  groupNodes: boolean = true // Default to grouped layout
): {
  nodes: FileNode[];
  edges: FileEdge[];
} {
  // Create a map of all files for O(1) lookups
  const fileMap = new Map<string, ProjectComponent>();
  const relevantFiles = new Set<ProjectComponent>();
  console.log(files);

  // Collect all relevant files
  function processComponent(component: ProjectComponent) {
    if (component.type === "file") {
      fileMap.set(component.path, component);
      relevantFiles.add(component);
      if (component.imports && component.imports.length > 0) {
        component.imports.forEach((importId) => {
          const importedFile = fileMap.get(importId);
          if (importedFile) relevantFiles.add(importedFile);
        });
      }
    } else if (
      component.type === "dir" &&
      component.contents &&
      component.contents.length > 0
    ) {
      fileMap.set(component.path, component);
      relevantFiles.add(component);
      component.contents.forEach(processComponent);
    }
  }

  files.forEach(processComponent);

  // Group files by their parent directories
  const directoryChildren = new Map<string, ProjectComponent[]>();

  // Create nodes first
  const nodes: FileNode[] = [];
  const filesAsArray = Array.from(relevantFiles);

  // If we're grouping nodes, first create directory nodes (parents)
  if (groupNodes) {
    filesAsArray.forEach((file) => {
      if (file.type === "dir") {
        const dirName = getBaseName(file.path);
        nodes.push({
          id: file.path,
          type: "group",
          // Initial position will be updated later
          position: { x: 0, y: 0 },
          style: {
            backgroundColor: "rgba(240, 240, 240, 0.85)",
            padding: 20,
            borderRadius: 8,
            border: "1px dashed #aaa",
          },
          data: {
            label: dirName, // Use basename for directory label
            filePath: file.path,
            imports: file.imports || [],
          },
          // Directory nodes should be below file nodes
          zIndex: -1,
        });

        // Initialize the children array for this directory
        directoryChildren.set(file.path, []);
      }
    });
  }

  // Then create file nodes (children)
  filesAsArray.forEach((file) => {
    if (file.type === "file") {
      const parentDir = getDirectory(file.path);

      // Add to node array
      nodes.push({
        id: file.path,
        type: "default",
        // Initial position will be updated later
        position: { x: 0, y: 0 },
        data: {
          // Use basename to avoid long labels
          label: getBaseName(file.path),
          filePath: file.path,
          imports: file.imports || [],
        },
        // Only set parentId if we're grouping nodes
        parentId: groupNodes && parentDir ? parentDir : undefined,
        // Children should be above parents
        zIndex: 1,
        style: {
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "white",
          fontSize: "12px",
        },
      });

      // Add to the directory's children collection if grouping
      if (groupNodes && parentDir && directoryChildren.has(parentDir)) {
        const children = directoryChildren.get(parentDir) || [];
        children.push(file);
        directoryChildren.set(parentDir, children);
      }
    }
  });

  // Position nodes based on grouping preference
  if (groupNodes) {
    // Use hierarchical positioning with parents
    positionNodesHierarchically(nodes, directoryChildren);
  } else {
    // Use flat positioning without parents
    positionNodesFlat(nodes);
  }

  // Create edges with optimized routing
  const edges = createOptimizedEdges(nodes, fileMap);

  return {
    nodes,
    edges,
  };
}

function positionNodesHierarchically(
  nodes: FileNode[],
  directoryChildren: Map<string, ProjectComponent[]>
) {
  const NODE_WIDTH = 150;
  const NODE_HEIGHT = 50;
  const PADDING = 80;
  const LABEL_HEIGHT = 0;
  const MIN_DIR_WIDTH = 400;
  const MIN_DIR_HEIGHT = 300;

  // const srcNode = nodes.find((node) => node.id === "src");
  const componentsNode = nodes.find((node) => node.id === "src/components");
  const storeNode = nodes.find((node) => node.id === "src/store");

  const activitiesNode = nodes.find(
    (node) => node.id === "src/components/activities"
  );
  const coreNode = nodes.find((node) => node.id === "src/components/core");
  const notesNode = nodes.find((node) => node.id === "src/components/notes");
  const uiNode = nodes.find((node) => node.id === "src/components/ui");

  const typesNode = nodes.find((node) => node.id === "src/types");

  const appTsxNode = nodes.find((node) => node.id === "src/App.tsx");
  const mainTsxNode = nodes.find((node) => node.id === "src/main.tsx");

  const activityListNode = nodes.find(
    (node) => node.id === "src/components/activities/ActivityList.tsx"
  );
  const activityModalNode = nodes.find(
    (node) => node.id === "src/components/activities/ActivityModal.tsx"
  );
  const calendarNode = nodes.find(
    (node) => node.id === "src/components/core/Calendar.tsx"
  );
  const chatbotNode = nodes.find(
    (node) => node.id === "src/components/core/ChatBot.tsx"
  );
  const notelistNode = nodes.find(
    (node) => node.id === "src/components/notes/NoteList.tsx"
  );

  const noteModalNode = nodes.find(
    (node) => node.id === "src/components/notes/NoteModal.tsx"
  );

  const buttonNode = nodes.find(
    (node) => node.id === "src/components/ui/Button.tsx"
  );

  const inputNode = nodes.find(
    (node) => node.id === "src/components/ui/Input.tsx"
  );

  const useTripStoreNode = nodes.find(
    (node) => node.id === "src/store/useTripStore.ts"
  );
  const typesTsNode = nodes.find((node) => node.id === "src/types/trip.ts");

  const indexCSSNode = nodes.find((node) => node.id === "src/index.css");

  // if (srcNode) {
  //   srcNode.position = { x: 100, y: 100 };
  //   srcNode.style = { width: 1400, height: 1000 };
  // }

  if (componentsNode) {
    componentsNode.position = { x: 200, y: 125 + LABEL_HEIGHT };
    componentsNode.style = { width: 700, height: 800 };
  }

  if (storeNode) {
    storeNode.position = { x: 950, y: 375 + LABEL_HEIGHT };
    storeNode.style = { width: 200, height: 200 };
  }

  if (typesNode) {
    typesNode.position = { x: 1200, y: 250 + LABEL_HEIGHT };
    typesNode.style = { width: 200, height: 200 };
  }

  if (appTsxNode) {
    appTsxNode.position = { x: 130, y: 700 };
  }
  if (indexCSSNode) {
    indexCSSNode.position = { x: 330, y: 700 };
  }

  if (mainTsxNode) {
    mainTsxNode.position = { x: 225, y: 775 };
  }

  if (activitiesNode) {
    activitiesNode.position = { x: 250, y: 175 + LABEL_HEIGHT };
    activitiesNode.style = { width: 400, height: 200 };
  }
  if (coreNode) {
    coreNode.position = { x: 250, y: 175 + LABEL_HEIGHT };
    coreNode.style = { width: 400, height: 200 };
  }
  if (notesNode) {
    notesNode.position = { x: 250, y: 175 + LABEL_HEIGHT };
    notesNode.style = { width: 400, height: 200 };
  }

  if (uiNode) {
    uiNode.position = { x: 250, y: 585 + LABEL_HEIGHT };
    uiNode.style = { width: 300, height: 150 };
  }

  if (buttonNode) {
    buttonNode.position = { x: 125, y: 25 };
  }

  if (inputNode) {
    inputNode.position = { x: 125, y: 25 };
  }

  if (activityListNode) {
    activityListNode.position = { x: 125, y: 25 };
  }

  if (activityModalNode) {
    activityModalNode.position = { x: 25, y: 125 };
  }

  if (calendarNode) {
    calendarNode.position = { x: 25, y: 75 };
  }

  if (chatbotNode) {
    chatbotNode.position = { x: 25, y: 75 };
  }

  if (notelistNode) {
    notelistNode.position = { x: 25, y: 75 };
  }

  if (noteModalNode) {
    noteModalNode.position = { x: 25, y: 75 };
  }

  //top left
  if (useTripStoreNode) {
    useTripStoreNode.position = { x: 25, y: 75 };
  }

  if (typesTsNode) {
    typesTsNode.position = { x: 25, y: 75 };
  }
}

function createOptimizedEdges(
  nodes: FileNode[],
  fileMap: Map<string, ProjectComponent>
): FileEdge[] {
  const edges: FileEdge[] = [];

  // Helper to get absolute position of a node (accounting for parent positions)
  function getAbsolutePosition(nodeId: string): { x: number; y: number } {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    let x = node.position.x;
    let y = node.position.y;

    // If node has a parent, add parent's position
    if (node.parentId) {
      const parent = nodes.find((n) => n.id === node.parentId);
      if (parent) {
        x += parent.position.x;
        y += parent.position.y;
      }
    }

    return { x, y };
  }

  // Group nodes by common target to optimize edge bundling
  const edgeGroups = new Map<string, string[]>();

  nodes.forEach((node) => {
    const file = fileMap.get(node.id);
    if (file?.imports && file.imports.length > 0) {
      file.imports.forEach((importId) => {
        // Group by target
        if (!edgeGroups.has(node.id)) {
          edgeGroups.set(node.id, []);
        }
        edgeGroups.get(node.id)?.push(importId);
      });
    }
  });

  // Process each edge group
  edgeGroups.forEach((importIds, targetId) => {
    const targetPos = getAbsolutePosition(targetId);

    // Sort imports by absolute position to minimize crossings
    importIds.sort((a, b) => {
      const posA = getAbsolutePosition(a);
      const posB = getAbsolutePosition(b);

      // Calculate distances from source to target
      const distA = Math.hypot(targetPos.x - posA.x, targetPos.y - posA.y);
      const distB = Math.hypot(targetPos.x - posB.x, targetPos.y - posB.y);

      return distA - distB;
    });

    // Create edges with decreasing curvature
    importIds.forEach((importId, index) => {
      // Adjust edge type and curvature based on the distance and position
      let edgeType = "smoothstep";

      // For nodes within the same parent, use straight lines
      const sourceNode = nodes.find((n) => n.id === importId);
      const targetNode = nodes.find((n) => n.id === targetId);
      if (
        sourceNode &&
        targetNode &&
        sourceNode.parentId === targetNode.parentId
      ) {
        edgeType = "default"; // Straight line
      }

      edges.push({
        id: `e${importId}-${targetId}`,
        source: importId,
        target: targetId,
        type: "smoothstep",
        animated: true,
        style: {
          ...edgeStyle,
          // Adjust opacity based on distance to reduce visual clutter
          opacity: 0.7 + 0.3 * (index / importIds.length),
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: "#555",
        },
        data: { type: "import" },
      });
    });
  });

  return edges;
}

function positionNodesFlat(nodes: FileNode[]) {
  nodes = nodes.filter((node) => node.type !== "group");
  const NODE_WIDTH = 150;
  const NODE_HEIGHT = 50;
  const PADDING = 80;
  const LABEL_HEIGHT = 0;
  const MIN_DIR_WIDTH = 400;
  const MIN_DIR_HEIGHT = 300;

  const buttonsNode = nodes.find(
    (node) => node.id === "src/components/buttons"
  );
  const calculatorNode = nodes.find(
    (node) => node.id === "src/components/calculator"
  );
  const displayNode = nodes.find(
    (node) => node.id === "src/components/display"
  );

  const appTsxNode = nodes.find((node) => node.id === "src/App.tsx");
  const mainTsxNode = nodes.find((node) => node.id === "src/main.tsx");

  const buttonTsxNode = nodes.find(
    (node) => node.id === "src/components/buttons/Button.tsx"
  );
  const buttonGridTsxNode = nodes.find(
    (node) => node.id === "src/components/buttons/ButtonGrid.tsx"
  );
  const calculatorTsxNode = nodes.find(
    (node) => node.id === "src/components/calculator/Calculator.tsx"
  );
  const displayTsxNode = nodes.find(
    (node) => node.id === "src/components/display/Display.tsx"
  );

  const calculatorContextTsxNode = nodes.find(
    (node) => node.id === "src/context/CalculatorContext.tsx"
  );
  const calculatorReducerTsNode = nodes.find(
    (node) => node.id === "src/reducers/calculatorReducer.ts"
  );
  const calculatorTsNode = nodes.find(
    (node) => node.id === "src/types/calculator.ts"
  );
  const useCalculatorTsNode = nodes.find(
    (node) => node.id === "src/hooks/useCalculator.ts"
  );
  const calculationsTsNode = nodes.find(
    (node) => node.id === "src/utils/calculations.ts"
  );
  const validationTsNode = nodes.find(
    (node) => node.id === "src/utils/validation.ts"
  );
  const indexCSSNode = nodes.find((node) => node.id === "src/index.css");

  if (appTsxNode) {
    appTsxNode.position = { x: 130, y: 700 };
  }
  if (indexCSSNode) {
    indexCSSNode.position = { x: 330, y: 700 };
  }

  if (mainTsxNode) {
    mainTsxNode.position = { x: 225, y: 775 };
  }

  if (buttonsNode) {
    buttonsNode.position = { x: 250, y: 175 + LABEL_HEIGHT };
    buttonsNode.style = { width: 300, height: 200 };
  }

  if (calculatorNode) {
    calculatorNode.position = { x: 250, y: 585 + LABEL_HEIGHT };
    calculatorNode.style = { width: 300, height: 150 };
  }

  if (displayNode) {
    displayNode.position = { x: 250, y: 405 + LABEL_HEIGHT };
    displayNode.style = { width: 300, height: 150 };
  }

  if (buttonTsxNode) {
    buttonTsxNode.position = { x: 125, y: 50 };
  }

  if (buttonGridTsxNode) {
    buttonGridTsxNode.position = { x: 130, y: 200 };
  }

  if (calculatorTsxNode) {
    calculatorTsxNode.position = { x: 130, y: 600 };
  }

  if (displayTsxNode) {
    displayTsxNode.position = { x: 130, y: 400 };
  }

  //top left
  if (calculatorContextTsxNode) {
    calculatorContextTsxNode.position = { x: 700, y: 500 };
  }

  //bottom right
  if (calculatorReducerTsNode) {
    calculatorReducerTsNode.position = { x: 700, y: 125 };
  }

  //top right
  if (useCalculatorTsNode) {
    useCalculatorTsNode.position = { x: 475, y: 400 };
  }

  //bottom left
  if (calculationsTsNode) {
    calculationsTsNode.position = { x: 900, y: 200 };
  }

  if (validationTsNode) {
    validationTsNode.position = { x: 475, y: 25 };
  }

  if (calculatorTsNode) {
    calculatorTsNode.position = { x: 375, y: 215 };
  }
}

type FunctionDependency = {
  caller: string; // Function that calls another function
  callee: string; // Function being called
  file: string; // File where the caller function exists
};

export function findFunctionDependencies(
  project: ProjectComponent[]
): FunctionDependency[] {
  const dependencies: FunctionDependency[] = [];
  const functionMap = new Map<string, { file: string; id: string }>();

  // Step 1: Collect all function declarations
  for (const file of project) {
    if (file.type === "file" && file.ast) {
      for (const node of file.ast) {
        if (node.type === "FunctionDeclaration" && node.id?.name) {
          functionMap.set(node.id.name, { file: file.path, id: file.id });
        }
      }
    }
  }

  // Step 2: Find function calls
  for (const file of project) {
    if (file.type === "file" && file.ast) {
      for (const node of file.ast) {
        if (
          node.type === "ExpressionStatement" &&
          node.expression?.callee?.name
        ) {
          const callee = node.expression.callee.name;

          // Check if this function exists in the project
          if (functionMap.has(callee)) {
            dependencies.push({
              caller: node.expression.callee.name,
              callee,
              file: file.path,
            });
          }
        }
      }
    }
  }
  return dependencies;
}
