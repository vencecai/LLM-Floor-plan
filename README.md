# LLM Floor Plan Generator for Rhino & Grasshopper

This system enables the generation of floor plans from natural language descriptions using LLM (Large Language Model) technology integrated with Rhino and Grasshopper.

## System Overview

The floor plan generation process is broken down into three main steps:

1. **Text to JSON:** Interprets natural language descriptions to create a structured JSON representation of the floor plan.
2. **JSON to Graph:** Converts the JSON structure into a graph representation with rooms, connections, walls, doors, and windows.
3. **Graph to Floor Plan:** Generates the final floor plan geometry with walls, doors, and windows.

## Component Files

- `text_to_json.py`: First component that processes text input and generates JSON using an LLM
- `json_to_graph.py`: Second component that converts JSON to a graph structure
- `graph_to_floorplan.py`: Final component that generates the detailed floor plan

## Setup Instructions

### Prerequisites

- Rhino 8 or newer (recommended for #r directive support)
- Grasshopper
- Python for Rhino/Grasshopper

### Installation

1. Create a new Grasshopper definition (.gh file)
2. Add three Python Script components to your canvas
3. Copy the code from each Python file into its respective component
4. Connect the components according to the data flow described below

### API Configuration

The OpenRouter API key is directly embedded in the `text_to_json.py` component, making it easier to copy and paste into Grasshopper without needing a separate .env file. The component is configured to use Anthropic's Claude 3.7 Sonnet model through OpenRouter.

### Package Dependencies

The system uses Rhino 8's `#r` directive to automatically load the required NuGet packages:

```python
#r "nuget: OpenAI, 1.8.0"
```

This eliminates the need to manually install packages via pip. The script will automatically download and reference the OpenAI package directly from NuGet.

> **Note for Rhino 7 users:** If you're using Rhino 7, you'll need to modify the code to use traditional package imports with pip installations instead of the #r directive.

## Usage

### Creating the Grasshopper Definition

Create three Python Script components in Grasshopper and set them up as follows:

1. **Text to JSON Component**

   - Inputs:
     - `text_input`: String (natural language description)
     - `run`: Boolean toggle
   - Outputs:
     - `json_output`: String (JSON representation)
     - `success`: Boolean
     - `message`: String (status or error message)

2. **JSON to Graph Component**

   - Inputs:
     - `json_input`: String (from previous component)
     - `run`: Boolean toggle
   - Outputs:
     - `room_centers`: Points (intelligently calculated based on wall positions)
     - `room_names`: Text
     - `room_types`: Text
     - `connection_lines`: Lines
     - `wall_lines`: Lines
     - `door_positions`: Points
     - `window_positions`: Points
     - `success`: Boolean
     - `message`: String

3. **Graph to Floor Plan Component**
   - Inputs:
     - `room_centers`: Points (from previous component)
     - `room_names`: Text
     - `room_types`: Text
     - `connection_lines`: Lines
     - `wall_lines`: Lines
     - `door_positions`: Points
     - `window_positions`: Points
     - `wall_thickness`: Number (default: 0.2)
     - `door_width`: Number (default: 0.9)
     - `window_width`: Number (default: 1.2)
     - `run`: Boolean toggle
   - Outputs:
     - `wall_geometry`: Breps
     - `door_geometry`: Breps
     - `window_geometry`: Breps
     - `room_boundary_curves`: Curves
     - `room_outlines`: Breps (filled surfaces representing room boundaries)
     - `room_labels`: Text
     - `success`: Boolean
     - `message`: String

### Example Input

Here's an example of a natural language description you could use:

```
Design a modern two-bedroom apartment with an open kitchen and living area.
Include a master bedroom with en-suite bathroom, a second smaller bedroom,
and a shared bathroom. The apartment should have large windows in the living
area and a balcony accessible from the living room.
```

### Room Positioning

The system uses a sophisticated approach to determine room positioning:

1. Room centers are calculated based on the average position of wall endpoints and midpoints associated with each room
2. If wall data is not available, it uses explicit position and dimension data if present in the JSON
3. As a last resort, it falls back to a grid pattern for room placement

This ensures rooms are positioned accurately within their physical boundaries, resulting in more realistic floor plans.

### Tips for Best Results

1. Be specific in your descriptions about room types, adjacencies, and special features
2. Include information about doors and windows where possible
3. Specify approximate sizes or proportions if important
4. Mention any specific requirements for room layouts or connections

## Customization

You can customize various aspects of the generated floor plans:

- Edit the `get_room_size_by_type` function to change default room sizes
- Modify the wall height in the `create_wall_geometry` function
- Adjust door and window parameters in their respective functions
- Enhance the system prompt in the LLM call to specify additional requirements
- If needed, replace the API key in the `text_to_json.py` file with your own

## Troubleshooting

- If the API call fails, verify that the embedded API key is correct
- If the geometry generation fails, review the generated JSON to ensure it's properly structured
- Check the `message` output from each component for specific error information
- If you encounter NuGet package loading issues, verify you're using Rhino 8 or later for the #r directive

## License

This project is provided as open-source software. Feel free to modify and extend it for your own projects.

## Acknowledgments

- Built using Rhino and Grasshopper
- Uses OpenRouter to access Anthropic's Claude 3.7 Sonnet for natural language processing
- Utilizes Rhino's geometry libraries for floor plan generation
- Takes advantage of Rhino 8's #r directive for seamless package management
