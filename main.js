import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --------------------------------------------------
// Configuration
// --------------------------------------------------
const CONFIG = {
  // URL of the WebSocket server that streams live building updates
  WS_URL: (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws',
  // Base URL for static assets (models, textures, etc.)
  ASSET_BASE: '/assets/',
  // Default building model (GLTF) used when a specific model is not provided
  DEFAULT_BUILDING_MODEL: 'building.glb',
  // Camera settings
  CAMERA: {
    fov: 60,
    near: 0.1,
    far: 5000,
    position: new THREE.Vector3(0, 200, 400)
  },
  // Scene background color
  BACKGROUND_COLOR: 0x202030,
  // Light intensity
  AMBIENT_LIGHT_INTENSITY: 0.8,
  DIR_LIGHT_INTENSITY: 0.6,
  DIR_LIGHT_POSITION: new THREE.Vector3(300, 500, 200)
};

// --------------------------------------------------
// Global objects
// --------------------------------------------------
let scene, camera, renderer, controls;
let ambientLight, dirLight;
let loader;
const buildingMeshes = new Map(); // key: buildingId, value: THREE.Group
let socket;

// --------------------------------------------------
// Initialization
// --------------------------------------------------
function init() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(CONFIG.BACKGROUND_COLOR);
  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(
    CONFIG.CAMERA.fov,
    window.innerWidth / window.innerHeight,
    CONFIG.CAMERA.near,
    CONFIG.CAMERA.far
  );
  camera.position.copy(CONFIG.CAMERA.position);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 50;
  controls.maxDistance = 2000;

  // Lights
  ambientLight = new THREE.AmbientLight(0xffffff, CONFIG.AMBIENT_LIGHT_INTENSITY);
  scene.add(ambientLight);

  dirLight = new THREE.DirectionalLight(0xffffff, CONFIG.DIR_LIGHT_INTENSITY);
  dirLight.position.copy(CONFIG.DIR_LIGHT_POSITION);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Loaders
  loader = new GLTFLoader();

  // Event listeners
  window.addEventListener('resize', onWindowResize, false);

  // Connect to live data source
  initWebSocket();

  // Kick off the render loop
  animate();
}

// --------------------------------------------------
// Resize handling
// --------------------------------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --------------------------------------------------
// Animation loop
// --------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// --------------------------------------------------
// WebSocket handling
// --------------------------------------------------
function initWebSocket() {
  try {
    socket = new WebSocket(CONFIG.WS_URL);

    socket.addEventListener('open', () => {
      console.log('WebSocket connection established.');
      // Request initial snapshot of all buildings
      socket.send(JSON.stringify({ type: 'request_snapshot' }));
    });

    socket.addEventListener('message', event => {
      const payload = safeParseJSON(event.data);
      if (!payload) return;

      switch (payload.type) {
        case 'snapshot':
          handleSnapshot(payload.buildings);
          break;
        case 'building_added':
          handleBuildingAdded(payload.building);
          break;
        case 'building_updated':
          handleBuildingUpdated(payload.building);
          break;
        case 'building_removed':
          handleBuildingRemoved(payload.id);
          break;
        default:
          console.warn('Unknown WS message type:', payload.type);
      }
    });

    socket.addEventListener('close', () => {
      console.warn('WebSocket closed. Attempting reconnection in 5 seconds...');
      setTimeout(initWebSocket, 5000);
    });
  } catch (err) {
    console.error('Failed to initialize WebSocket:', err);
  }
}

// --------------------------------------------------
// Helper: safe JSON parse
// --------------------------------------------------
function safeParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    console.error('Failed to parse JSON:', str);
    return null;
  }
}

// --------------------------------------------------
// Building lifecycle handlers
// --------------------------------------------------
function handleSnapshot(buildings) {
  if (!Array.isArray(buildings)) return;
  buildings.forEach(b => addOrUpdateBuilding(b));
}

function handleBuildingAdded(building) {
  addOrUpdateBuilding(building);
}

function handleBuildingUpdated(building) {
  addOrUpdateBuilding(building);
}

function handleBuildingRemoved(buildingId) {
  const mesh = buildingMeshes.get(buildingId);
  if (mesh) {
    scene.remove(mesh);
    disposeNode(mesh);
    buildingMeshes.delete(buildingId);
  }
}

// --------------------------------------------------
// Core: Add or update a building
// --------------------------------------------------
function addOrUpdateBuilding(building) {
  const {
    id,
    position = { x: 0, y: 0, z: 0 },
    rotation = { x: 0, y: 0, z: 0 },
    scale = { x: 1, y: 1, z: 1 },
    model // optional relative path to a GLTF file
  } = building;

  // If the building already exists, just update its transform
  if (buildingMeshes.has(id)) {
    const existing = buildingMeshes.get(id);
    existing.position.set(position.x, position.y, position.z);
    existing.rotation.set(rotation.x, rotation.y, rotation.z);
    existing.scale.set(scale.x, scale.y, scale.z);
    return;
  }

  // Load model (or fallback to default)
  const modelPath = model ? `${CONFIG.ASSET_BASE}${model}` : `${CONFIG.ASSET_BASE}${CONFIG.DEFAULT_BUILDING_MODEL}`;

  loader.load(
    modelPath,
    gltf => {
      const group = new THREE.Group();
      group.add(gltf.scene);
      group.position.set(position.x, position.y, position.z);
      group.rotation.set(rotation.x, rotation.y, rotation.z);
      group.scale.set(scale.x, scale.y, scale.z);

      // Enable shadows for all meshes in the model
      gltf.scene.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      scene.add(group);
      buildingMeshes.set(id, group);
    },
    undefined,
    err => {
      console.error(`Failed to load model for building ${id} (${modelPath}):`, err);
    }
  );
}

// --------------------------------------------------
// Helper: dispose of a THREE.Object3D hierarchy
// --------------------------------------------------
function disposeNode(node) {
  if (!node) return;

  if (node.geometry) node.geometry.dispose();
  if (node.material) {
    if (Array.isArray(node.material)) {
      node.material.forEach(m => m.dispose());
    } else {
      node.material.dispose();
    }
  }
  if (node.texture) node.texture.dispose();

  if (node.children) {
    node.children.forEach(child => disposeNode(child));
  }
}

// --------------------------------------------------
// Start the application
// --------------------------------------------------
init();