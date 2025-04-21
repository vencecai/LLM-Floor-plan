"""
Grasshopper Python Component: Graph to Floor Plan Generator
This component takes a graph structure of rooms, connections, and openings and generates
a detailed floor plan with walls, doors, and windows.

Inputs:
    room_centers: List of points representing room centers
    room_names: List of room names corresponding to room_centers
    room_types: List of room types corresponding to room_centers
    connection_lines: List of lines representing room connections
    wall_lines: List of lines representing wall segments (optional)
    door_positions: List of points representing door positions (optional)
    window_positions: List of points representing window positions (optional)
    wall_thickness: Wall thickness in model units (default: 0.2)
    door_width: Standard door width in model units (default: 0.9)
    window_width: Standard window width in model units (default: 1.2)
    run: Boolean toggle to trigger the generation process

Outputs:
    wall_geometry: Brep geometries representing walls
    door_geometry: Brep geometries representing doors
    window_geometry: Brep geometries representing windows
    room_boundary_curves: Curves representing room boundaries
    room_labels: Text labels for rooms
    success: Boolean indicating if the generation was successful
    message: Status or error message
"""

import rhinoscriptsyntax as rs
import Rhino
import Rhino.Geometry as rg
import ghpythonlib.components as ghcomp
import System
from System import Array
import math

def generate_floor_plan(
    room_centers, 
    room_names, 
    room_types, 
    connection_lines, 
    wall_lines=None,
    door_positions=None, 
    window_positions=None,
    wall_thickness=0.2,
    door_width=0.9,
    window_width=1.2
):
    """Generate a detailed floor plan from graph components"""
    
    if not room_centers or len(room_centers) == 0:
        return None, None, None, None, None, False, "Missing room centers"
    
    try:
        # Initialize output collections
        wall_geometry = []
        door_geometry = []
        window_geometry = []
        room_boundary_curves = []
        room_labels = []
        
        # If wall lines are provided, use them directly
        if wall_lines and len(wall_lines) > 0:
            # Generate wall geometry from wall lines
            for wall_line in wall_lines:
                # Create wall geometry (extrude a rectangle along the wall line)
                wall_brep = create_wall_geometry(wall_line, wall_thickness)
                if wall_brep:
                    wall_geometry.append(wall_brep)
                    
            # Process doors
            if door_positions and len(door_positions) > 0:
                for door_pos in door_positions:
                    # Find the closest wall line to this door position
                    closest_wall = find_closest_wall(door_pos, wall_lines)
                    if closest_wall:
                        # Create door geometry
                        door_brep = create_door_geometry(door_pos, closest_wall, door_width, wall_thickness)
                        if door_brep:
                            door_geometry.append(door_brep)
                            
                            # Create opening in the wall for the door
                            updated_wall = create_wall_opening(closest_wall, door_pos, door_width, wall_thickness)
                            if updated_wall:
                                # Replace the original wall with the updated one with opening
                                index = wall_geometry.index(closest_wall)
                                wall_geometry[index] = updated_wall
            
            # Process windows
            if window_positions and len(window_positions) > 0:
                for window_pos in window_positions:
                    # Find the closest wall line to this window position
                    closest_wall = find_closest_wall(window_pos, wall_lines)
                    if closest_wall:
                        # Create window geometry
                        window_brep = create_window_geometry(window_pos, closest_wall, window_width, wall_thickness)
                        if window_brep:
                            window_geometry.append(window_brep)
                            
                            # Create opening in the wall for the window
                            updated_wall = create_wall_opening(closest_wall, window_pos, window_width, wall_thickness)
                            if updated_wall:
                                # Replace the original wall with the updated one with opening
                                index = wall_geometry.index(closest_wall)
                                wall_geometry[index] = updated_wall
        
        # If no wall lines are provided, generate simplified room boundaries based on room centers
        else:
            # Generate room boundary curves
            for i, center in enumerate(room_centers):
                # Create a simple rectangle around each room center
                room_type = room_types[i] if i < len(room_types) else "unknown"
                room_size = get_room_size_by_type(room_type)
                
                # Create a rectangle centered on the room center
                rectangle = rg.Rectangle3d(
                    rg.Plane(center, rg.Vector3d.ZAxis),
                    room_size[0],
                    room_size[1]
                )
                
                room_boundary_curves.append(rectangle.ToNurbsCurve())
            
            # Generate wall geometry from room boundaries
            wall_geometry = create_walls_from_boundaries(room_boundary_curves, wall_thickness)
        
        # Create room labels at room centers
        for i, center in enumerate(room_centers):
            if i < len(room_names):
                room_name = room_names[i]
                # In Grasshopper, we'll just output the centers and names
                # The actual text display will be handled by Grasshopper Text components
                room_labels.append(f"{room_name}")
        
        return (
            wall_geometry,
            door_geometry,
            window_geometry,
            room_boundary_curves,
            room_labels,
            True,
            "Successfully generated floor plan"
        )
        
    except Exception as e:
        error_message = f"Error generating floor plan: {str(e)}"
        return None, None, None, None, None, False, error_message

def create_wall_geometry(wall_line, thickness):
    """Create a wall brep from a line and thickness"""
    try:
        # Get the direction vector of the wall line
        direction = wall_line.Direction
        direction.Unitize()
        
        # Create a perpendicular vector
        perpendicular = rg.Vector3d(-direction.Y, direction.X, 0)
        perpendicular.Unitize()
        
        # Create the four corners of the wall rectangle
        half_thickness = thickness / 2.0
        
        p1 = rg.Point3d(
            wall_line.From.X + perpendicular.X * half_thickness,
            wall_line.From.Y + perpendicular.Y * half_thickness,
            0
        )
        
        p2 = rg.Point3d(
            wall_line.From.X - perpendicular.X * half_thickness,
            wall_line.From.Y - perpendicular.Y * half_thickness,
            0
        )
        
        p3 = rg.Point3d(
            wall_line.To.X - perpendicular.X * half_thickness,
            wall_line.To.Y - perpendicular.Y * half_thickness,
            0
        )
        
        p4 = rg.Point3d(
            wall_line.To.X + perpendicular.X * half_thickness,
            wall_line.To.Y + perpendicular.Y * half_thickness,
            0
        )
        
        # Create a polyline for the wall footprint
        polyline = rg.Polyline([p1, p2, p3, p4, p1])
        
        # Create a planar surface from the polyline
        curve = polyline.ToNurbsCurve()
        
        # Create a boundary representation (Brep) from the curve
        wall_surface = rg.Brep.CreatePlanarBreps(curve)[0]
        
        # Extrude the surface to create a 3D wall
        wall_height = 3.0  # Standard wall height, can be parameterized
        wall_brep = rg.Brep.CreateFromOffsetFace(
            wall_surface.Faces[0],
            wall_height,
            0.001,
            False,
            True
        )
        
        return wall_brep
        
    except Exception as e:
        print(f"Error creating wall geometry: {str(e)}")
        return None

def find_closest_wall(position, wall_lines):
    """Find the closest wall line to a given position"""
    closest_wall = None
    min_distance = float('inf')
    
    for wall_line in wall_lines:
        # Calculate the closest point on the wall line to the position
        closest_point = wall_line.ClosestPoint(position, True)
        
        # Calculate the distance
        distance = position.DistanceTo(closest_point)
        
        if distance < min_distance:
            min_distance = distance
            closest_wall = wall_line
    
    return closest_wall

def create_door_geometry(position, wall_line, door_width, wall_thickness):
    """Create door geometry at the specified position on the wall"""
    try:
        # Door height (standard)
        door_height = 2.1
        
        # Find the closest point on the wall line
        closest_point = wall_line.ClosestPoint(position, True)
        
        # Get the wall direction vector
        wall_direction = wall_line.Direction
        wall_direction.Unitize()
        
        # Get perpendicular direction (for door thickness)
        perpendicular = rg.Vector3d(-wall_direction.Y, wall_direction.X, 0)
        perpendicular.Unitize()
        
        # Create door corners
        half_door_width = door_width / 2.0
        
        p1 = rg.Point3d(
            closest_point.X - wall_direction.X * half_door_width,
            closest_point.Y - wall_direction.Y * half_door_width,
            0
        )
        
        p2 = rg.Point3d(
            closest_point.X + wall_direction.X * half_door_width,
            closest_point.Y + wall_direction.Y * half_door_width,
            0
        )
        
        # Create a line for the door
        door_line = rg.Line(p1, p2)
        
        # Create door geometry similar to wall geometry but with door height
        door_brep = create_wall_geometry(door_line, wall_thickness * 0.2)  # Thinner than the wall
        
        return door_brep
        
    except Exception as e:
        print(f"Error creating door geometry: {str(e)}")
        return None

def create_window_geometry(position, wall_line, window_width, wall_thickness):
    """Create window geometry at the specified position on the wall"""
    try:
        # Window height and elevation
        window_height = 1.2
        window_sill_height = 0.9
        
        # Find the closest point on the wall line
        closest_point = wall_line.ClosestPoint(position, True)
        
        # Get the wall direction vector
        wall_direction = wall_line.Direction
        wall_direction.Unitize()
        
        # Get perpendicular direction (for window thickness)
        perpendicular = rg.Vector3d(-wall_direction.Y, wall_direction.X, 0)
        perpendicular.Unitize()
        
        # Create window corners
        half_window_width = window_width / 2.0
        
        p1 = rg.Point3d(
            closest_point.X - wall_direction.X * half_window_width,
            closest_point.Y - wall_direction.Y * half_window_width,
            window_sill_height
        )
        
        p2 = rg.Point3d(
            closest_point.X + wall_direction.X * half_window_width,
            closest_point.Y + wall_direction.Y * half_window_width,
            window_sill_height
        )
        
        # Create a line for the window base
        window_line = rg.Line(p1, p2)
        
        # Create a planar surface for the window
        rectangle = rg.Rectangle3d(
            rg.Plane(p1, wall_direction, rg.Vector3d.ZAxis),
            window_width,
            window_height
        )
        
        window_curve = rectangle.ToNurbsCurve()
        window_surface = rg.Brep.CreatePlanarBreps(window_curve)[0]
        
        return window_surface
        
    except Exception as e:
        print(f"Error creating window geometry: {str(e)}")
        return None

def create_wall_opening(wall_brep, position, opening_width, wall_thickness):
    """Create an opening in a wall for a door or window"""
    # This is a placeholder - in a real implementation, we would
    # subtract the door/window volume from the wall brep using Boolean operations
    # This requires more complex geometry operations that would depend on specific
    # Rhino/Grasshopper functionality
    
    # For now, we'll just return the original wall brep
    return wall_brep

def create_walls_from_boundaries(room_boundaries, wall_thickness):
    """Create wall geometry from room boundary curves"""
    wall_geometry = []
    
    for boundary in room_boundaries:
        # Convert the boundary curve to a polyline
        polyline = boundary.ToPolyline()
        
        # Create walls for each segment of the polyline
        for i in range(polyline.Count - 1):
            start_point = polyline[i]
            end_point = polyline[i + 1]
            
            # Create a line segment for this wall
            wall_line = rg.Line(start_point, end_point)
            
            # Create wall geometry
            wall_brep = create_wall_geometry(wall_line, wall_thickness)
            if wall_brep:
                wall_geometry.append(wall_brep)
    
    return wall_geometry

def get_room_size_by_type(room_type):
    """Return default room size based on room type"""
    # Default sizes for different room types
    sizes = {
        "bedroom": (4.0, 3.5),
        "master_bedroom": (5.0, 4.0),
        "bathroom": (2.5, 2.0),
        "kitchen": (4.0, 3.0),
        "living_room": (6.0, 5.0),
        "dining_room": (4.5, 3.5),
        "hallway": (3.0, 1.5),
        "office": (3.5, 3.0),
        "closet": (2.0, 1.5)
    }
    
    # Convert room type to lowercase for case-insensitive matching
    room_type_lower = room_type.lower() if room_type else "unknown"
    
    # Return the size for the given room type or a default size
    return sizes.get(room_type_lower, (4.0, 4.0))  # Default size if type not found

# Main execution for Grasshopper component
if run:
    # Convert inputs to appropriate types if needed
    wall_thickness = 0.2 if wall_thickness is None else wall_thickness
    door_width = 0.9 if door_width is None else door_width
    window_width = 1.2 if window_width is None else window_width
    
    (
        wall_geometry,
        door_geometry,
        window_geometry,
        room_boundary_curves,
        room_labels,
        success,
        message
    ) = generate_floor_plan(
        room_centers,
        room_names,
        room_types,
        connection_lines,
        wall_lines,
        door_positions,
        window_positions,
        wall_thickness,
        door_width,
        window_width
    )
else:
    wall_geometry = None
    door_geometry = None
    window_geometry = None
    room_boundary_curves = None
    room_labels = None
    success = False
    message = "Set 'run' to True to generate the floor plan" 