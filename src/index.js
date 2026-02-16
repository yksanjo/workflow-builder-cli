#!/usr/bin/env node

import blessed from 'blessed';
import inquirer from 'inquirer';

// Node type definitions
const NODE_TYPES = {
  agent: {
    label: 'Agent Node',
    color: 'cyan',
    description: 'Single agent invocation',
  },
  groupchat: {
    label: 'Group Chat',
    color: 'magenta',
    description: 'Multi-agent conversation',
  },
  sequential: {
    label: 'Sequential',
    color: 'red',
    description: 'Ordered execution',
  },
  parallel: {
    label: 'Parallel',
    color: 'yellow',
    description: 'Concurrent execution',
  },
};

// Application state
let nodes = [];
let connections = [];
let selectedNode = null;

// Create screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Agent Workflow Builder - CLI',
});

// Header
const header = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: ' Agent Workflow Builder - Terminal Edition ',
  style: {
    fg: 'white',
    bg: 'black',
    bold: true,
  },
});

// Main box
const mainBox = blessed.box({
  top: 3,
  left: 0,
  width: '100%',
  height: '70%',
  border: { type: 'line' },
  style: {
    border: { fg: 'blue' },
  },
});

// Node list
const nodeList = blessed.list({
  top: 0,
  left: 0,
  width: '30%',
  height: '100%',
  border: { type: 'line', fg: 'cyan' },
  style: {
    selected: { bg: 'blue', fg: 'white' },
  },
  items: [],
});

// Canvas view
const canvas = blessed.box({
  top: 0,
  left: '30%',
  width: '70%',
  height: '100%',
  content: '\n\n  ┌─────────────┐\n  │ Agent Node  │──▶\n  └─────────────┘      ┌───────────────┐\n                       │  Group Chat   │\n                       └───────────────┘\n\nDrag nodes from palette or press a/i/s/p to add',
  tags: true,
  scrollable: true,
});

// Properties panel
const propertiesPanel = blessed.box({
  top: '70%',
  left: 0,
  width: '100%',
  height: '30%',
  border: { type: 'line', fg: 'green' },
  style: {
    border: { fg: 'green' },
  },
  content: ' Select a node to edit its properties ',
});

// Help bar
const helpBar = blessed.box({
  bottom: 0,
  left: 0,
  width: '100%',
  height: 1,
  content: ' [a] Agent | [i] GroupChat | [s] Sequential | [p] Parallel | [d] Delete | [c] Connect | [g] Generate | [q] Quit ',
  style: {
    fg: 'white',
    bg: 'black',
  },
});

// Add elements to screen
screen.append(header);
screen.append(mainBox);
mainBox.append(nodeList);
mainBox.append(canvas);
screen.append(propertiesPanel);
screen.append(helpBar);

// Render functions
function renderNodes() {
  const items = nodes.map((n, i) => {
    const type = NODE_TYPES[n.type];
    return `{${type.color}}${type.label}{/}: ${n.name}`;
  });
  nodeList.setItems(items || ['No nodes yet. Press a/i/s/p to add.']);
  
  // Update canvas view
  let canvasContent = '\n';
  nodes.forEach((node, i) => {
    const type = NODE_TYPES[node.type];
    canvasContent += `  {${type.color}}●{/} ${node.name} [${type.label}]\n`;
  });
  
  if (connections.length > 0) {
    canvasContent += '\n  Connections:\n';
    connections.forEach(conn => {
      const from = nodes.find(n => n.id === conn.from);
      const to = nodes.find(n => n.id === conn.to);
      if (from && to) {
        canvasContent += `  ${from.name} → ${to.name}\n`;
      }
    });
  }
  
  if (nodes.length === 0) {
    canvasContent += '\n  {grey}No nodes yet. Press a/i/s/p to add a node.{/}\n';
  }
  
  canvas.setContent(canvasContent);
  screen.render();
}

function renderProperties() {
  if (!selectedNode) {
    propertiesPanel.setContent(' Select a node to edit its properties ');
    return;
  }
  
  const node = nodes.find(n => n.id === selectedNode);
  if (!node) {
    propertiesPanel.setContent(' Node not found ');
    return;
  }
  
  const type = NODE_TYPES[node.type];
  propertiesPanel.setContent(
    ` Selected: {bold}${node.name}{/}\n` +
    ` Type: {${type.color}}${type.label}{/}\n` +
    ` Description: ${type.description}\n\n` +
    ` [Enter] Edit name | [d] Delete | [Esc] Deselect `
  );
}

// Node operations
function addNode(type) {
  const id = `node_${Date.now()}`;
  nodes.push({
    id,
    type,
    name: `new_${type}_${nodes.length + 1}`,
  });
  renderNodes();
}

function deleteNode() {
  if (!selectedNode) return;
  nodes = nodes.filter(n => n.id !== selectedNode);
  connections = connections.filter(c => c.from !== selectedNode && c.to !== selectedNode);
  selectedNode = null;
  renderNodes();
  renderProperties();
}

function generateCode() {
  const workflow = {
    schema_version: '2.0',
    workflow_id: `workflow-${Date.now()}`,
    agents: nodes
      .filter(n => n.type === 'agent')
      .map(n => ({
        name: n.name,
        class: 'AssistantAgent',
        system_message: '',
        llm_config: { model: 'gpt-4', temperature: 0.3 },
        tools: [],
      })),
    orchestration: {
      type: 'Sequential',
      agents: nodes.map(n => n.name),
    },
  };
  
  console.log('\n' + JSON.stringify(workflow, null, 2));
  screen.render();
}

// Event handlers
nodeList.on('select', (item, index) => {
  if (nodes[index]) {
    selectedNode = nodes[index].id;
    renderProperties();
  }
});

screen.key(['a', 'A'], () => addNode('agent'));
screen.key(['i', 'I'], () => addNode('groupchat'));
screen.key(['s', 'S'], () => addNode('sequential'));
screen.key(['p', 'P'], () => addNode('parallel'));
screen.key(['d', 'D'], () => deleteNode());
screen.key(['g', 'G'], () => generateCode());
screen.key(['q', 'Q', 'C-c'], () => {
  process.exit(0);
});

// Initial render
renderNodes();
renderProperties();
screen.render();

console.log('\n{cyan}Agent Workflow Builder - CLI Edition{/}\n');
console.log('Use arrow keys to navigate, keys below to add nodes:');
console.log('  a - Agent Node');
console.log('  i - Group Chat');
console.log('  s - Sequential');
console.log('  p - Parallel');
console.log('  d - Delete selected');
console.log('  g - Generate JSON\n');
