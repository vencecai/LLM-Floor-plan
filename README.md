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
├── grasshopper_components/   # Grasshopper components & related Python scripts
│   ├── text_to_json.py
│   ├── json_to_graph.py
│   └── graph_to_floorplan.py
├── backend/                  # Backend server for API communication
│   ├── app/                  # Flask application
│   │   ├── __init__.py       # App initialization
│   │   ├── routes.py         # API routes
│   │   └── services/         # Business logic
│   │       └── floor_plan_service.py # Core floor plan generation service
│   ├── .env                  # Environment variables (API keys)
│   ├── .env.example          # Example environment configuration
│   ├── main.py               # Main entry point
│   ├── main_fixed.py         # Fixed main entry with direct env loading
│   ├── requirements.txt      # Python dependencies
│   └── README.md             # Backend specific details
├── .gitignore
└── README.md                 # Main project README (this file)
```

## Component Files & Interfaces

### 1. Rhino/Grasshopper Interface (`grasshopper_components/`)
- `text_to_json.py`: Processes text input and generates JSON using an LLM.
- `json_to_graph.py`: Converts JSON to a graph structure.
- `graph_to_floorplan.py`: Generates the detailed floor plan geometry in Rhino.

### 2. React Frontend Interface (`frontend/`)
- **Technology Stack:** React, tldraw SDK, Tailwind CSS, Vite.
- **Functionality:**
    - Provides a canvas (`BoundaryCanvas.jsx` using tldraw) for users to draw the initial site or building boundary.
    - Includes a text area (`TextInput.jsx`) for natural language descriptions.
    - Sends boundary data (e.g., coordinates of the polygon) and text description to the backend API service.
    - Dynamically adjusts UI based on result state (hides example prompts after generation).
- **Interaction:** Communicates with the backend Flask service via the `generateFloorPlan` function in `App.jsx`, which handles API requests to the `/api/generate-floor-plan` endpoint.

### 3. Backend Server (`backend/`)
- **Technology Stack:** Flask, Python, OpenRouter API
- **Functionality:**
    - Exposes API endpoints for generating floor plans
    - Communicates with the LLM via OpenRouter API
    - Processes boundary data and text descriptions
    - Returns structured JSON floor plan data
- **Configuration:** Uses environment variables loaded from a `.env` file for API keys

## Setup Instructions

### Prerequisites
*   **For Grasshopper:**
    *   Rhino 8 or newer
    *   Grasshopper
*   **For Frontend:**
    *   Node.js (v14 or newer)
    *   npm or yarn
*   **For Backend:**
    *   Python 3.7+
    *   pip
    *   Virtual environment (recommended)

### Installation
*   **Grasshopper:**
    1.  Navigate to the `grasshopper_components/` directory.
    2.  Follow the setup instructions within that directory's README (or adapt the instructions below).
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
    4.  Copy `.env.example` to `.env` and add your OpenRouter API key:
        ```
        OPENROUTER_API_KEY=your-api-key-here
        FLASK_ENV=development
        FLASK_APP=main
        ```

### API Configuration
The OpenRouter API key needs to be configured:
*   **Grasshopper:** Currently embedded in `text_to_json.py` or via a `.env` file loaded by Python.
*   **Backend:** Configure in the `.env` file in the `backend/` directory.

## Environment Variables
Create a `.env` file in the `backend/` directory:
```
OPENROUTER_API_KEY="your-api-key-here"
FLASK_ENV=development
FLASK_APP=main
```
Ensure `.env` is in `.gitignore`.

## Usage

### 1. Grasshopper Interface
*   Create three Python Script components in Grasshopper.
*   Load the code from the `.py` files in the `grasshopper_components/` directory.
*   Connect inputs/outputs as previously described (Text Input -> JSON -> Graph -> Floor Plan Geometry).

### 2. React Frontend & Backend Interface
1.  **Starting the Backend Server:**
    ```bash
    # Navigate to the backend directory
    cd backend
    
    # Activate the virtual environment (if not already active)
    # On Windows
    venv\Scripts\activate
    # On macOS/Linux
    source venv/bin/activate
    
    # Start the Flask server
    python main_fixed.py
    ```
    The server will start on `http://localhost:5000`.

2.  **Starting the Frontend Development Server:**
    ```bash
    # Navigate to the frontend directory
    cd frontend
    
    # Install dependencies (if not done already)
    npm install
    
    # Start the development server
    npm run dev
    ```
    The application will automatically open in your default browser.

3.  **Using the Application:**
    - Use the canvas to draw the desired boundary.
    - Enter the floor plan description in the text area or select one of the example prompts.
    - Click the "Generate Floor Plan" button to process your input.
    - After generation, the example prompts will be hidden and the input area will be more compact.

4.  **Building for Production:**
    ```bash
    # Create a production build
    npm run build
    
    # Preview the production build locally
    npm run preview
    ```

5.  **Troubleshooting Frontend Issues:**
    - If you encounter connection issues, check that the backend server is running on port 5000.
    - Check your browser's console (F12) for any errors.
    - Verify the API URL in the frontend code is correctly pointing to your backend server.

## Customization
You can customize various aspects of the generated floor plans:
- Edit the prompts in the LLM service to change floor plan generation parameters
- Modify the example prompts in `frontend/src/components/TextInput.jsx`
- Customize the UI behavior in `frontend/src/styles/App.css`
- Adjust the API endpoints in `backend/app/routes.py`

## Troubleshooting
- If the API call fails, verify that your OpenRouter API key is correctly set in the `.env` file.
- If the application cannot connect to the backend, ensure the Flask server is running on port 5000.
- For API errors, check the Flask server logs for detailed error messages.
- If you encounter OpenRouter API issues, try using the `direct_test.py` script in the backend directory to test the connection.
- For frontend issues, check the browser's developer console (F12) for error messages.

## License
This project is provided as open-source software. Feel free to modify and extend it for your own projects.

## Acknowledgments
- Built using Rhino and Grasshopper
- Uses OpenRouter to access Anthropic's Claude models for natural language processing
- Utilizes Flask for the backend API service
- Frontend utilizes React, tldraw, Vite, and Tailwind CSS