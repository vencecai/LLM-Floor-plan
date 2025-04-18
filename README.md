# LLM Floor Plan Generator

This system enables the generation of floor plans from natural language descriptions using LLM (Large Language Model) technology, offering interfaces for both Rhino/Grasshopper and a web-based frontend.

## System Overview

The project provides two primary interfaces for generating floor plans:

1.  **Rhino/Grasshopper Interface:** Utilizes Python components within Grasshopper for users working directly in a CAD environment.
2.  **Web-Based Frontend Interface:** A React application allowing users to draw initial boundaries and input text descriptions via a web browser.

Regardless of the interface used, the core floor plan generation process follows a hierarchical top-down approach:

1.  **Input Processing:** Gathers natural language descriptions and optional boundary information (either from Grasshopper inputs or the React frontend).
2.  **Text to JSON:** Interprets inputs to create a structured JSON representation of the floor plan requirements.
3.  **Hierarchical Space Partitioning:** Recursively divides space into a tree-like structure of rooms based on the JSON.
4.  **Topological Graph Generation:** Creates a graph representation with rooms, connections, and spatial relationships.
5.  **Physical Floor Plan Generation:** Generates the final floor plan geometry (either as Rhino geometry via Grasshopper or potentially visualized in the frontend/exported).

## Conceptual Approach (Core Logic)

Our system implements a "hierarchical space partitioning + topological graph generation" approach that follows a recursive top-down process:

### 1. Initial Boundary Definition
- The system begins with a total boundary:
    - **Grasshopper:** Defined via Rhino geometry or parameters.
    - **React Frontend:** Drawn by the user using the tldraw canvas.
    - **Fallback:** A default rectangular boundary (e.g., FloorPlan(width=20m, height=10m)).
- This boundary informs the initial root node (id: "root") with geometric coordinates and dimensions in a JSON/DSL format.

### 2. Recursive Partitioning
- The LLM decides how to partition the space (along X or Y axis) based on rules (binary partitioning, minimum room size, functional requirements from text input).
- For each sub-rectangle, the system determines if termination conditions are met (minimum dimensions, room count, functional labels).
- If not terminated, the partitioning continues recursively.
- Each partition creates two new child nodes connected by an "adjacency edge."

### 3. Topological Graph Generation
- The final result is a tree-like partitioning structure (each node with dimensions) and adjacency edges.
- This is converted to a standard graph where:
  - Nodes contain RoomType and center point coordinates.
  - Edges contain attributes like "shared wall" or "doorway."
- The system then calculates node centrality and extracts main circulation paths.

## Project Structure

```
LLM-Floor-plan/
├── frontend/                 # React Frontend Application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   │   ├── BoundaryCanvas.jsx # tldraw integration component
│   │   │   └── TextInput.jsx      # Text input component
│   │   ├── hooks/            # Custom React hooks (e.g., useBoundaryData)
│   │   ├── services/         # API interaction logic (e.g., llmService.js)
│   │   ├── styles/           # Tailwind CSS base/config
│   │   ├── App.jsx           # Main application component
│   │   └── main.jsx          # Entry point
│   ├── index.html            # Main HTML file
│   ├── package.json
│   ├── vite.config.js        # Vite configuration
│   ├── tailwind.config.js
│   └── README.md             # Frontend specific details
├── grasshopper/              # Grasshopper components & related Python scripts
│   ├── text_to_json.py
│   ├── json_to_graph.py
│   └── graph_to_floorplan.py
├── backend/                  # Optional: If a dedicated backend server is needed for React app
│   └── ...
├── .env                      # Environment variables (shared or specific)
├── .gitignore
└── README.md                 # Main project README (this file)
```

## Component Files & Interfaces

### 1. Rhino/Grasshopper Interface (`grasshopper/`)
- `text_to_json.py`: Processes text input and generates JSON using an LLM.
- `json_to_graph.py`: Converts JSON to a graph structure.
- `graph_to_floorplan.py`: Generates the detailed floor plan geometry in Rhino.

### 2. React Frontend Interface (`frontend/`)
- **Technology Stack:** React, tldraw SDK, Tailwind CSS, Vite.
- **Functionality:**
    - Provides a canvas (`BoundaryCanvas.jsx` using tldraw) for users to draw the initial site or building boundary.
    - Includes a text area (`TextInput.jsx`) for natural language descriptions.
    - Sends boundary data (e.g., coordinates of the polygon) and text description to the backend/LLM service.
- **Interaction:** Likely communicates with a backend service (potentially Python-based, like Flask or FastAPI, running separately or integrated) that hosts the LLM logic.

## Setup Instructions

### Prerequisites
*   **For Grasshopper:**
    *   Rhino 8 or newer
    *   Grasshopper
*   **For Frontend:**
    *   Node.js (v14 or newer)
    *   npm or yarn

### Installation
*   **Grasshopper:**
    1.  Navigate to the `grasshopper/` directory.
    2.  Follow the setup instructions within that directory's README (or adapt the instructions below).
*   **Frontend:**
    1.  Navigate to the `frontend/` directory.
    2.  Run `npm install` (or `yarn install`).

### API Configuration
The OpenRouter API key needs to be configured. This might be handled differently for each interface:
*   **Grasshopper:** Currently embedded in `text_to_json.py` or via a `.env` file loaded by Python.
*   **Frontend:** Likely requires a backend service to securely handle the API key. The frontend should **not** store the API key directly. Configuration via a `.env` file in the `backend/` or main project directory, accessed by the server.

### Package Dependencies (Grasshopper)
The Grasshopper Python components use Rhino 8's `#r` directive:
```python
#r "nuget: OpenAI, 1.8.0"
```
> **Note for Rhino 7 users:** Modify the code to use traditional pip installations.

## Environment Variables
Create a `.env` file in the root directory (or relevant sub-directory like `backend/`) for sensitive information:
```
OPENROUTER_API_KEY="your-api-key-here"
# Add other variables if needed (e.g., backend server port)
```
Ensure `.env` is in `.gitignore`.

## Usage

### 1. Grasshopper Interface
*   Create three Python Script components in Grasshopper.
*   Load the code from the `.py` files in the `grasshopper/` directory.
*   Connect inputs/outputs as previously described (Text Input -> JSON -> Graph -> Floor Plan Geometry).

### 2. React Frontend Interface
1.  **Starting the Development Server:**
    ```bash
    # Navigate to the frontend directory
    cd frontend
    
    # Install dependencies (if not done already)
    npm install
    
    # Start the development server
    npm run dev
    ```
2.  The application will automatically open in your default browser at `http://localhost:3001` or `http://localhost:3002` (the exact port will be shown in the terminal).
3.  **Using the Application:**
    - Use the canvas to draw the desired boundary.
    - Enter the floor plan description in the text area or select one of the example prompts.
    - Click the "Generate Floor Plan" button to process your input.
4.  **Building for Production:**
    ```bash
    # Create a production build
    npm run build
    
    # Preview the production build locally
    npm run preview
    ```
5.  **Troubleshooting Frontend Issues:**
    - If you encounter connection issues with localhost, try using the IP address shown in the terminal (e.g., http://127.0.0.1:3001).
    - If port 3001 is already in use, the application will automatically use another port (visible in the terminal output).
    - Check your browser's console (F12) for any errors.

## Customization
You can customize various aspects of the generated floor plans:
- Edit the `get_room_size_by_type` function to change default room sizes
- Modify the wall height in the `create_wall_geometry` function
- Adjust door and window parameters in their respective functions
- Enhance the system prompt in the LLM call to specify additional requirements
- If needed, replace the API key in the `text_to_json.py` file with your own
- Modify the example prompts in `frontend/src/components/TextInput.jsx`
- Customize Tailwind styling in `frontend/tailwind.config.js`

## Troubleshooting
- If the API call fails, verify that the embedded API key is correct (or properly configured in the backend for the frontend).
- If the geometry generation fails, review the generated JSON to ensure it's properly structured.
- Check the `message` output from each component for specific error information.
- If you encounter NuGet package loading issues, verify you're using Rhino 8 or later for the #r directive.
- For frontend issues, check the browser's developer console (F12) for error messages.
- If the frontend doesn't load properly, ensure all dependencies are correctly installed with `npm install`.

## License
This project is provided as open-source software. Feel free to modify and extend it for your own projects.

## Acknowledgments
- Built using Rhino and Grasshopper
- Uses OpenRouter to access Anthropic's Claude 3.7 Sonnet for natural language processing
- Utilizes Rhino's geometry libraries for floor plan generation
- Takes advantage of Rhino 8's #r directive for seamless package management
- Frontend utilizes React, tldraw, Vite, and Tailwind CSS.