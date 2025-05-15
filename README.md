# LLM Floor Plan Generator

This system enables the generation and manipulation of floor plans from natural language descriptions using LLM (Large Language Model) technology, offering a seamless workflow between Rhino/Grasshopper and a web-based interface.

## System Overview

The project provides an integrated workflow for floor plan generation and manipulation:

1. **Rhino/Grasshopper Integration:** Allows users to reference floor plan outlines from Rhino via screenshots.
2. **Web-Based Frontend Interface:** A React application enabling users to:
   - Reference floor plan screenshots from Rhino 
   - Draw boundaries using the built-in drawing tools
   - Generate room layouts using LLM-powered text prompts
   - Visualize and customize the generated floor plans
3. **Spatial OS Integration:** Connect to Spatial OS's web API to generate apartment objects for further processing.
4. **Bi-directional Grasshopper Connectivity:** Return generated floor plans back to Rhino/Grasshopper for further manipulation.

Regardless of the interface used, the core floor plan generation process follows a hierarchical top-down approach:

1. **Boundary Creation:** Draw floor plan boundaries in the frontend, referencing Rhino screenshots if needed.
2. **LLM-Powered Room Layout:** Use natural language to describe desired room layouts and specifications.
3. **Hierarchical Space Partitioning:** Recursively divides space into a tree-like structure of rooms based on requirements.
4. **Topological Graph Generation:** Creates a graph representation with rooms, connections, and spatial relationships.
5. **Physical Floor Plan Generation:** Generates the final floor plan geometry that can be visualized in the web interface or sent back to Rhino.
6. **Apartment Object Generation:** Connect to Spatial OS to transform 2D floor plans into apartment objects.

## Conceptual Approach (Core Logic)

Our system implements a "hierarchical space partitioning + topological graph generation" approach that follows a recursive top-down process:

### 1. Initial Boundary Definition
- The system begins with a total boundary:
    - **Rhino Reference:** Screenshots from Rhino used as visual reference.
    - **React Frontend:** Drawn by the user using the tldraw canvas with Rhino screenshots as a guide.
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

### 4. Spatial OS Integration
- The generated floor plan can be sent to Spatial OS's web API.
- This creates apartment objects that can be used for further processing.
- The integration enables advanced operations and enhancements beyond the initial 2D floor plan.

## Project Structure

```
LLM-Floor-plan/
├── frontend/                 # React Frontend Application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   │   ├── BoundaryCanvas.jsx # tldraw integration for boundary drawing
│   │   │   ├── TextInput.jsx      # Text input for LLM prompts
│   │   │   ├── RoomVisualizer.jsx # Visualization of generated rooms
│   │   │   ├── RoomStyler.jsx     # Styling options for rooms
│   │   │   └── DebugPanel.jsx     # Debugging information
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API interaction logic
│   │   ├── styles/           # Tailwind CSS base/config
│   │   ├── utils/            # Utility functions
│   │   ├── App.jsx           # Main application component
│   │   └── main.jsx          # Entry point
│   ├── index.html            # Main HTML file
│   ├── package.json
│   ├── vite.config.js        # Vite configuration
│   ├── tailwind.config.js
│   └── README.md             # Frontend specific details
├── grasshopper_components/   # Grasshopper components & related Python scripts
│   └── gh_convert.py         # Converts JSON layout to Rhino geometry
├── gh/                       # Grasshopper definition files
│   └── json_2_curve_update.gh # Updated Grasshopper definition
├── backend/                  # Backend server for API communication
│   ├── app/                  # Flask application code
│   ├── main.py               # Main entry point
│   ├── main_fixed.py         # Fixed main entry with direct env loading
│   ├── requirements.txt      # Python dependencies
│   └── README.md             # Backend specific details
├── .gitignore
└── README.md                 # Main project README (this file)
```

## Component Files & Interfaces

### 1. Rhino/Grasshopper Integration
- Allows referencing floor plan outlines from Rhino via screenshots
- Users draw boundaries in the web interface based on these screenshots
- Converts generated floor plans back to Rhino geometry
- Components:
  - `grasshopper_components/gh_convert.py`: Converts JSON layout data into Rhino geometry, including:
    - Transforms hierarchical room structure into physical boundaries
    - Creates layers based on room types
    - Generates labeled visualizations with area calculations
  - `gh/json_2_curve_update.gh`: Grasshopper definition that loads and processes the JSON output

### 2. React Frontend Interface (`frontend/`)
- **Technology Stack:** React, tldraw SDK, Tailwind CSS, Vite
- **Key Features:**
    - Upload and reference floor plan screenshots from Rhino
    - Draw boundaries using tldraw canvas
    - Generate room layouts using LLM-powered text prompts
    - Visualize and customize the generated floor plans
    - Connect to Spatial OS for apartment object generation
    - Export the floor plan back to Rhino/Grasshopper

### 3. Backend Server (`backend/`)
- **Technology Stack:** Flask, Python, OpenRouter API
- **Functionality:**
    - Processes floor plan boundaries and text descriptions
    - Communicates with LLM services via OpenRouter API
    - Handles connection to Spatial OS web API
    - Facilitates bidirectional communication with Grasshopper

### 4. Spatial OS Integration
- Connects the generated floor plans to Spatial OS's web API
- Creates apartment objects for further processing
- Enables advanced spatial operations beyond the initial 2D floor plan

## Setup Instructions

### Prerequisites
*   **For Rhino/Grasshopper:**
    *   Rhino 8 or newer
    *   Grasshopper
*   **For Frontend:**
    *   Node.js (v14 or newer)
    *   npm or yarn
*   **For Backend:**
    *   Python 3.7+
    *   pip
    *   Virtual environment (recommended)
*   **For Spatial OS Integration:**
    *   Spatial OS API key (obtain from Spatial OS website)

### Installation
*   **Grasshopper:**
    1.  Navigate to the `grasshopper_components/` directory.
    2.  Copy the Python scripts to your Grasshopper components as described in `example_setup.md`.
*   **Frontend:**
    1.  Navigate to the `frontend/` directory.
    2.  Run `npm install` (or `yarn install`).
*   **Backend:**
    1.  Navigate to the `backend/` directory.
    2.  Create and activate a virtual environment:
        ```bash
        python -m venv venv
        # On Windows
        venv\Scripts\activate
        # On macOS/Linux
        source venv/bin/activate
        ```
    3.  Install dependencies:
        ```bash
        pip install -r requirements.txt
        ```
    4.  Create `.env` file with your API keys:
        ```
        OPENROUTER_API_KEY=your-openrouter-api-key
        SPATIAL_OS_API_KEY=your-spatial-os-api-key
        FLASK_ENV=development
        FLASK_APP=main
        ```

## Usage Workflow

### 1. Referencing Floor Plans from Rhino
1. Open your floor plan in Rhino
2. Take a screenshot of the floor plan boundary
3. Save the screenshot for reference in the web interface

### 2. Using the Web Interface
1. Start the backend server:
   ```bash
   cd backend
   python main_fixed.py
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. In the web interface:
   - Upload the Rhino floor plan screenshot as reference
   - Draw the boundary using the tldraw canvas
   - Enter your room layout requirements in the text input
   - Click "Generate Floor Plan" to process your input
   - Customize the generated layout using the provided tools
   - Connect to Spatial OS for apartment object generation (if configured)
   - Export the floor plan back to Rhino/Grasshopper (if needed)

### 3. Importing Generated Floor Plans Back to Rhino
1. After generating a floor plan in the web interface, export the JSON layout file
2. In Rhino, open the `gh/json_2_curve_update.gh` Grasshopper definition
3. Set the file path to your exported JSON file
4. Draw or select a boundary curve to define the overall dimensions
5. Toggle the "Generate" parameter to create the Rhino geometry
6. The script will:
   - Create separate layers for each room type
   - Generate room outlines with appropriate dimensions
   - Add text labels showing room names and areas

### 4. Spatial OS Integration
1. Ensure your Spatial OS API key is configured in the `.env` file
2. After generating a floor plan, click the "Generate Apartment" button
3. The system will connect to Spatial OS and create an apartment object
4. View and manipulate the apartment object in the web interface
5. Export the apartment object for further processing if needed

## Troubleshooting
- If the API call fails, verify that your API keys are correctly set in the `.env` file.
- For Rhino/Grasshopper integration issues, check the Rhino command line for error messages.
- If the application cannot connect to the backend, ensure the Flask server is running on port 5000.
- For Spatial OS integration issues, check that your API key is valid and has the necessary permissions.

## Acknowledgments
- Built using Rhino and Grasshopper
- Uses OpenRouter to access Anthropic's Claude models for LLM processing
- Utilizes tldraw for the drawing interface
- Frontend built with React, Vite, and Tailwind CSS
- Apartment object capabilities powered by Spatial OS