# agent-city-live

**Live 3D Skyline of Every Agent Building Tools**  

[![GitHub license](https://img.shields.io/github/license/yourusername/agent-city-live)](https://github.com/yourusername/agent-city-live/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/yourusername/agent-city-live?style=social)](https://github.com/yourusername/agent-city-live/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/yourusername/agent-city-live?style=social)](https://github.com/yourusername/agent-city-live/network)

---

## Table of Contents

- [Overview](#overview)
- [Demo](#demo)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [Adding New Agent Tools](#adding-new-agent-tools)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Overview

**Agent City Live** is an interactive, real‑time 3D visualization platform that renders a dynamic skyline where each building represents an autonomous *agent* (e.g., AI bots, micro‑services, IoT devices). Each building’s height, color, and animation reflect the state, performance, and communication patterns of its associated agent.

The project combines:

- **Python** (FastAPI) for the back‑end agent orchestration, data collection, and WebSocket broadcasting.
- **Node.js / React** for the front‑end UI.
- **Three.js** (via react‑three‑fiber) for the live 3D cityscape.
- **Docker** for reproducible local development and optional cloud deployment.

---

## Demo

![Agent City Live Demo](https://raw.githubusercontent.com/yourusername/agent-city-live/main/docs/demo.gif)

> *Click the video above to see a full walkthrough of the live skyline, agent interaction, and custom building tool integration.*

---

## Features

- **Real‑time 3D skyline** – Rendered via WebGL; updates at 60 fps.
- **Agent‑driven building metrics** – Height = CPU usage, color = health status, animated textures = network traffic.
- **WebSocket streaming** – Low‑latency updates from the back‑end.
- **Modular agent tooling** – Drop‑in Python modules to define new agent behaviours.
- **Custom building tools** – Add new visual elements (e.g., antennas, billboards) through a simple plugin API.
- **Docker‑compose setup** – One‑command start for both backend and frontend.
- **Extensive API** – REST endpoints for agent management and a GraphQL schema for advanced queries.
- **Theming & accessibility** – Dark / light modes, keyboard navigation, and screen‑reader support.

---

## Architecture

```
├─ backend/
│   ├─ app/
│   │   ├─ api/               # FastAPI routes (REST + WebSocket)
│   │   ├─ agents/            # Core agent abstraction + plugins
│   │   ├─ models/            # Pydantic schemas
│   │   ├─ services/          # Data collectors, stats aggregators
│   │   └─ main.py            # FastAPI entry point
│   ├─ tests/
│   └─ requirements.txt
│
├─ frontend/
│   ├─ src/
│   │   ├─ components/        # React components (Canvas, UI panels)
│   │   ├─ hooks/             # Custom hooks (WebSocket, agent state)
│   │   ├─ three/             # react‑three‑fiber scenes & helpers
│   │   └─ App.jsx
│   ├─ public/
│   ├─ tests/
│   └─ package.json
│
├─ docker/
│   ├─ backend.Dockerfile
│   ├─ frontend.Dockerfile
│   └─ docker-compose.yml
│
├─ docs/
│   └─ (design docs, API spec, demo assets)
│
├─ .github/
│   └─ workflows/ci.yml
│
├─ .gitignore
├─ README.md
└─ LICENSE
```

- **Backend** (`backend/app`) runs a FastAPI server that:
  1. Registers agents based on discovered Python plugin modules.
  2. Periodically polls each agent for metrics (CPU, memory, network, custom stats).
  3. Publishes a JSON payload via a WebSocket channel (`/ws/city`) to all connected clients.
- **Frontend** (`frontend/src`) uses **react‑three‑fiber** to build a Three.js scene where each building is a Three.js mesh generated from the real‑time payload.
- **Agents** are simple Python classes that implement a `collect_metrics()` coroutine; they can be hot‑reloaded without server restarts.

---

## Prerequisites

| Tool | Minimum Version | Installation |
|------|----------------|--------------|
| **Python** | 3.10 | `pyenv install 3.10` |
| **Node.js** | 20.x | `nvm install 20` |
| **Docker** | 24.x | [Docker Desktop](https://www.docker.com/products/docker-desktop) |
| **Git** | 2.30 | `brew install git` (macOS) / `apt install git` (Linux) |

---

## Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/agent-city-live.git
cd agent-city-live
```

### 2️⃣ Backend Setup (Python)

```bash
# Create a virtual environment
python -m venv .venv
source .venv/bin/activate   # on Windows: .venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### 3️⃣ Frontend Setup (Node)

```bash
cd frontend
npm install   # installs React, Three.js, react-three-fiber, etc.
```

### 4️⃣ Docker (Optional – recommended for production)

```bash
cd ..
docker compose up --build
```

The Docker compose file builds two containers:

- `backend` – runs the FastAPI app on `http://localhost:8000`
- `frontend` – serves the React app on `http://localhost:3000`

---

## Configuration

Configuration is handled via environment variables. Create a `.env` file at the repository root (or in `backend/` if you run the back‑end alone):

```dotenv
# ==== Backend ====
API_HOST=0.0.0.0
API_PORT=8000
AGENT_POLL_INTERVAL=2          # seconds between metric collections
METRIC_BUFFER_SIZE=30          # keep last 30 points per metric

# ==== Frontend ====
REACT_APP_WS_URL=ws://localhost:8000/ws/city
REACT_APP_THEME=dark           # options: dark, light, system

# ==== Docker (optional) ====
POSTGRES_USER=agentcity
POSTGRES_PASSWORD=strongpassword
POSTGRES_DB=agentcity_db
```

The back‑end also respects a `agents/` directory where you can drop custom Python modules. See the **Adding New Agent Tools** section below.

---

## Running the Project

### Development (Hot‑Reload)

**Backend**

```bash
cd backend
uvicorn app.main:app --host $API_HOST --port $API_PORT --reload
```

**Frontend**

```bash
cd frontend
npm start
```

Open your browser at `http://localhost:3000`. The city will start populating as the backend discovers agents.

### Production (Docker)

```bash
docker compose up -d
```

The containers will automatically restart on failure and expose ports `8000` (API) and `3000` (frontend).

---

## Adding New Agent Tools

1. **Create a Python module** under `backend/app/agents/`.  
   Example: `my_cool_agent.py`

```python
from .base import BaseAgent
import asyncio
import random

class MyCoolAgent(BaseAgent):
    name = "cool-agent"

    async def collect_metrics(self) -> dict:
        # Simulate some work
        await asyncio.sleep(0.1)
        return {
            "cpu": random.uniform(0, 100),
            "memory": random.uniform(0, 16),   # GB
            "network_tx": random.randint(0, 1000),  # MB/s
            "custom:temperature": random.uniform(20, 80)  # °C
        }
```

2. **Register the agent** (optional; the system auto‑discovers any subclass of `BaseAgent`).

```python
# backend/app/agents/__init__.py
from .my_cool_agent import MyCoolAgent   # noqa: F401
```

3. **Restart the backend** (or let the hot‑reload detect the new file). The new agent appears automatically in the skyline.

### Custom Building Tools (Front‑end)

If you want a building to display a custom visual element (e.g., an antenna), create a React component under `frontend/src/components/buildings/`.

```tsx
// Antenna.tsx
import { Mesh } from '@react-three/fiber';

export const Antenna = ({ position }: { position: [number, number, number] }) => (
  <mesh position={position}>
    <cylinderBufferGeometry args={[0.1, 0.1, 2, 8]} />
    <meshStandardMaterial color="gold" />
  </mesh>
);
```

Then extend `BuildingFactory.tsx` to include the component based on a metric flag.

```tsx
if (metrics.custom?.hasAntenna) {
  return <Antenna position={roofPosition} />;
}
```

Deploy the change with `npm run build` (or during development, the hot‑module reload will show it instantly).

---

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/agents` | List all registered agents and their current metrics. |
| `POST` | `/agents/{agent_id}/command` | Send a command to a specific agent (e.g., `reload`, `shutdown`). |
| `GET` | `/metrics/{agent_id}` | Retrieve historical metric series for a given agent (query params: `type`, `range`). |
| `GET` | `/health` | Liveness/readiness check (returns `200 OK`). |

### WebSocket

- **URL**: `ws://{host}:{port}/ws/city`
- **Message Shape** (JSON):

```json
{
  "timestamp": "2026-07-03T12:34:56.789Z",
  "agents": [
    {
      "id": "cool-agent",
      "metrics": {
        "cpu": 78.5,
        "memory": 5.2,
        "network_tx": 312,
        "custom:temperature": 42
      }
    }
    // … more agents
  ]
}
```

The frontend consumes this stream to update the city in near‑real time.

Full OpenAPI schema is available at `http://localhost:8000/openapi.json`.

---

## Testing

### Backend Tests (pytest)

```bash
cd backend
pytest
```

### Frontend Tests (Jest + React Testing Library)

```bash
cd frontend
npm test
```

CI is configured via GitHub Actions (`.github/workflows/ci.yml`) to run both test suites on every push.

---

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository** and clone your fork.
2. **Create a feature branch** (`git checkout -b feature/awesome-tool`).
3. **Write tests** for any new functionality.
4. **Run the full test suite** (`docker compose -f docker-compose.yml run backend pytest && cd frontend && npm test`).
5. **Submit a Pull Request** with a clear description, linking any relevant issue.

See `CONTRIBUTING.md` for detailed guidelines on coding style, commit messages, and release process.

---

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this conduct. See `CODE_OF_CONDUCT.md` for details.

---

## License

`agent-city-live` is released under the **MIT License**. See the `LICENSE` file for the full text.

---

## Acknowledgements

- **Three.js** – powerful 3D rendering engine.
- **react-three-fiber** – the React renderer for Three.js.
- **FastAPI** – high‑performance API framework.
- **Docker** – for containerized development environments.
- All contributors who helped shape the project.

---