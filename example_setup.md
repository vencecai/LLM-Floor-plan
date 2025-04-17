# Example Setup in Grasshopper

This guide explains how to set up the LLM Floor Plan Generator components in Grasshopper.

## Step 1: Create the Python Script Components

1. Open Rhino and start a new Grasshopper definition
2. Create three Python Script components (Components > Programming > Python Script)
3. Rename them as follows:
   - "Text to JSON"
   - "JSON to Graph"
   - "Graph to Floor Plan"

## Step 2: Set Up the Components

### Text to JSON Component

1. Double-click on the "Text to JSON" component to open the Python editor
2. Delete any default code
3. Copy and paste the entire content of `text_to_json.py` into the editor
4. Click "OK" to save changes
5. Set up the inputs:
   - Create a Panel component (Params > Input > Panel) and connect it to the `text_input` input
   - Create a Boolean Toggle (Params > Input > Boolean Toggle) and connect it to the `run` input

### JSON to Graph Component

1. Double-click on the "JSON to Graph" component to open the Python editor
2. Delete any default code
3. Copy and paste the entire content of `json_to_graph.py` into the editor
4. Click "OK" to save changes
5. Set up the inputs:
   - Connect the `json_output` from the "Text to JSON" component to the `json_input` input
   - Create a Boolean Toggle and connect it to the `run` input

### Graph to Floor Plan Component

1. Double-click on the "Graph to Floor Plan" component to open the Python editor
2. Delete any default code
3. Copy and paste the entire content of `graph_to_floorplan.py` into the editor
4. Click "OK" to save changes
5. Set up the inputs:
   - Connect all outputs from the "JSON to Graph" component to their corresponding inputs
   - Create Number Sliders for `wall_thickness`, `door_width`, and `window_width`
   - Create a Boolean Toggle and connect it to the `run` input

## Step 3: Visualize the Results

1. Add Grasshopper preview components to visualize the outputs:

   - Connect `wall_geometry` to a Custom Preview component (Params > Geometry > Custom Preview)
   - Connect `door_geometry` to another Custom Preview component
   - Connect `window_geometry` to another Custom Preview component
   - Connect `room_outlines` to another Custom Preview component
   - Connect `room_labels` to Text Tag components (Display > Annotation > Text Tag)

2. For better visualization, set different colors for each preview:
   - Set wall previews to dark gray
   - Set door previews to brown
   - Set window previews to light blue
   - Set room outline previews to a translucent color with alpha channel

## Step 4: Generate a Floor Plan

1. Type your floor plan description in the Text Panel connected to the first component
2. Set all the run toggles to "True"
3. The system will process your text and generate a floor plan

## Example Description

Try using this example description:

```
Design a modern 800 square foot apartment with one bedroom and one bathroom.
Include an open kitchen and living area with a small dining space.
The apartment should have large windows in the living area and a balcony.
All spaces should be wheelchair accessible with wide doorways.
```

## Troubleshooting

If you encounter any issues:

1. Check the message outputs from each component for error information
2. Verify that all connections between components are correct
3. Ensure that your description is detailed enough for the system to generate a coherent floor plan
