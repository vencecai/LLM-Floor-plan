"""
Grasshopper Python Component: JSON to Graph Structure Converter
This component takes a JSON representation of a floor plan and converts it to a graph structure
that can be visualized and manipulated in Grasshopper.

Inputs:
    json_input: JSON string representation of the floor plan
    run: Boolean toggle to trigger the conversion process

Outputs:
    room_centers: List of points representing room centers
    room_names: List of room names corresponding to room_centers
    room_types: List of room types corresponding to room_centers
    connection_lines: List of lines representing room connections
    wall_lines: List of lines representing walls
    door_positions: List of points representing door positions
    window_positions: List of points representing window positions
    success: Boolean indicating if the conversion was successful
    message: Status or error message
"""

import rhinoscriptsyntax as rs
import Rhino
import json
import ghpythonlib.components as ghcomp
import System
from System import Array
from Rhino.Geometry import Point3d, Line, Vector3d

def parse_json_to_graph(json_input):
    """Parse the JSON input into graph components for Grasshopper visualization"""
    if not json_input:
        return None, None, None, None, None, None, None, False, "Missing JSON input"
    
    try:
        # Parse the JSON string
        floor_plan = json.loads(json_input)
        
        # Initialize output collections
        room_centers = []
        room_names = []
        room_types = []
        connection_lines = []
        wall_lines = []
        door_positions = []
        window_positions = []
        
        # First, process walls if they exist in the JSON
        wall_data = {}  # Dictionary to track walls and their associated rooms
        for wall in floor_plan.get("walls", []):
            wall_id = wall.get("id")
            start_coords = wall.get("start_point")
            end_coords = wall.get("end_point")
            room_ids = wall.get("room_ids", [])
            
            if start_coords and end_coords:
                start_point = Point3d(start_coords[0], start_coords[1], 0)
                end_point = Point3d(end_coords[0], end_coords[1], 0)
                wall_line = Line(start_point, end_point)
                wall_lines.append(wall_line)
                
                # Store wall data with room associations
                wall_data[wall_id] = {
                    "line": wall_line,
                    "room_ids": room_ids,
                    "midpoint": wall_line.PointAt(0.5)
                }
        
        # Create a dictionary to store room positions
        room_positions = {}
        room_wall_points = {}  # Dictionary to collect wall points for each room
        
        # Initialize collections for wall points by room
        for room in floor_plan.get("rooms", []):
            room_id = room.get("id")
            room_wall_points[room_id] = []
        
        # Associate walls with rooms
        for wall_id, data in wall_data.items():
            for room_id in data["room_ids"]:
                if room_id in room_wall_points:
                    # Add both endpoints and midpoint of the wall
                    room_wall_points[room_id].append(data["line"].From)
                    room_wall_points[room_id].append(data["line"].To)
                    room_wall_points[room_id].append(data["midpoint"])
        
        # Process rooms
        for room in floor_plan.get("rooms", []):
            room_id = room.get("id")
            
            # Calculate room center based on wall information if available
            if room_id in room_wall_points and len(room_wall_points[room_id]) > 0:
                # Calculate the average position of all wall points associated with this room
                wall_points = room_wall_points[room_id]
                avg_x = sum(point.X for point in wall_points) / len(wall_points)
                avg_y = sum(point.Y for point in wall_points) / len(wall_points)
                center_point = Point3d(avg_x, avg_y, 0)
            elif "start_point" in room and "dimensions" in room:
                # If the JSON has position and dimension information
                x, y = room.get("start_point")
                width, height = room.get("dimensions")
                center_point = Point3d(x + width/2, y + height/2, 0)
            elif "start_point" in room:
                # If only position is available
                x, y = room.get("start_point")
                center_point = Point3d(x, y, 0)
            else:
                # Fallback to a grid layout if no wall or position information
                index = len(room_centers)
                row = index // 3
                col = index % 3
                center_point = Point3d(col * 10, row * 10, 0)
            
            room_positions[room_id] = center_point
            room_centers.append(center_point)
            room_names.append(room.get("name", f"Room {room_id}"))
            room_types.append(room.get("type", "unknown"))
        
        # Second pass: Create connection lines between adjacent rooms
        for room in floor_plan.get("rooms", []):
            room_id = room.get("id")
            adjacent_rooms = room.get("adjacent_rooms", [])
            
            for adj_room_id in adjacent_rooms:
                if adj_room_id in room_positions:
                    # Create a line connecting the two room centers
                    connection_line = Line(room_positions[room_id], room_positions[adj_room_id])
                    connection_lines.append(connection_line)
        
        # Process openings (doors and windows)
        for opening in floor_plan.get("openings", []):
            opening_type = opening.get("type")
            wall_id = opening.get("wall_id")
            position = opening.get("position", 0.5)  # Default to middle of wall
            
            # Find the corresponding wall
            for wall in floor_plan.get("walls", []):
                if wall.get("id") == wall_id:
                    start_coords = wall.get("start_point")
                    end_coords = wall.get("end_point")
                    
                    if start_coords and end_coords:
                        # Calculate the position along the wall
                        start_point = Point3d(start_coords[0], start_coords[1], 0)
                        end_point = Point3d(end_coords[0], end_coords[1], 0)
                        
                        # Linear interpolation to find the opening position
                        opening_x = start_coords[0] + position * (end_coords[0] - start_coords[0])
                        opening_y = start_coords[1] + position * (end_coords[1] - start_coords[1])
                        opening_point = Point3d(opening_x, opening_y, 0)
                        
                        if opening_type == "door":
                            door_positions.append(opening_point)
                        elif opening_type == "window":
                            window_positions.append(opening_point)
                    break
        
        # If no walls are defined in the JSON, generate placeholder walls based on room connections
        if not wall_lines and connection_lines:
            # This is a simplistic placeholder approach
            for line in connection_lines:
                # Create walls perpendicular to the connection line at both endpoints
                midpoint = line.PointAt(0.5)
                direction = line.Direction
                perpendicular = Vector3d(-direction.Y, direction.X, 0)
                perpendicular.Unitize()
                
                # Scale the perpendicular vector to create wall segments
                wall_length = 3.0  # Arbitrary wall length
                perpendicular *= wall_length / 2
                
                # Create walls at both endpoints
                for point in [line.From, line.To]:
                    start_wall = Point3d(
                        point.X + perpendicular.X,
                        point.Y + perpendicular.Y,
                        0
                    )
                    end_wall = Point3d(
                        point.X - perpendicular.X,
                        point.Y - perpendicular.Y,
                        0
                    )
                    wall_lines.append(Line(start_wall, end_wall))
        
        return (
            room_centers,
            room_names,
            room_types,
            connection_lines,
            wall_lines,
            door_positions,
            window_positions,
            True,
            "Successfully converted JSON to graph structure"
        )
        
    except Exception as e:
        error_message = f"Error converting JSON to graph: {str(e)}"
        return None, None, None, None, None, None, None, False, error_message

# Main execution for Grasshopper component
if run and json_input:
    (
        room_centers,
        room_names,
        room_types,
        connection_lines,
        wall_lines,
        door_positions,
        window_positions,
        success,
        message
    ) = parse_json_to_graph(json_input)
else:
    room_centers = None
    room_names = None
    room_types = None
    connection_lines = None
    wall_lines = None
    door_positions = None
    window_positions = None
    success = False
    message = "Set 'run' to True and provide valid JSON input" 