import json
import Rhino.Geometry as rg
import scriptcontext as sc
import rhinoscriptsyntax as rs
import Rhino
import os
import random
import System.Drawing

def random_color():
    """Generate a random RGB color as a System.Drawing.Color"""
    r = random.randint(50, 255)
    g = random.randint(50, 255)
    b = random.randint(50, 255)
    return System.Drawing.Color.FromArgb(r, g, b)

def layout_from_split_structure(node, rect, depth=0, rooms=[]):
    if not node:
        return

    angle = node.get("angle", 0)
    is_vertical_split = abs(angle - 1.5708) < 0.1  # π/2 ≈ vertical split

    # If it's a final or leaf node, record and stop
    if node.get("final", False) or not node.get("children"):
        rooms.append({
            "name": node.get("name", "Unnamed"),
            "type": node.get("type", node.get("name", "room")),
            "area": node.get("area", 0),
            "rect": rect,
            "angle": angle
        })
        return

    children = node.get("children", [])
    for c in children:
        if "area" not in c:
            c["area"] = 100  # default area

    total_area = sum(c["area"] for c in children)
    offset = 0.0

    # Get parent rect dimensions
    bbox = rect.BoundingBox
    x = bbox.Min.X
    y = bbox.Min.Y
    width = bbox.Max.X - bbox.Min.X
    height = bbox.Max.Y - bbox.Min.Y

    for child in children:
        ratio = child["area"] / total_area

        if is_vertical_split:
            child_width = width * ratio
            child_rect = rg.Rectangle3d(
                rg.Plane.WorldXY,
                rg.Interval(x + offset, x + offset + child_width),
                rg.Interval(y, y + height)
            )
            offset += child_width
        else:
            child_height = height * ratio
            child_rect = rg.Rectangle3d(
                rg.Plane.WorldXY,
                rg.Interval(x, x + width),
                rg.Interval(y + offset, y + offset + child_height)
            )
            offset += child_height

        layout_from_split_structure(child, child_rect, depth + 1, rooms)

    return rooms


# Main execution block
if generate and file_path and boundary:
    try:
        if not os.path.isfile(file_path):
            raise Exception("File does not exist")
        with open(file_path, "r") as f:
            data = json.load(f)

        # Get bounding box of boundary curve
        bbox = boundary.GetBoundingBox(True)
        x = bbox.Min.X
        y = bbox.Min.Y
        width = bbox.Max.X - bbox.Min.X
        height = bbox.Max.Y - bbox.Min.Y

        root = data.get("split") or data.get("root") or data
        layout_rect = rg.Rectangle3d(
            rg.Plane.WorldXY,
            rg.Interval(x, x + width),
            rg.Interval(y, y + height)
        )

        rooms = []
        layout_from_split_structure(root, layout_rect, rooms=rooms)

        # Draw final room outlines and labels
        sc.doc = Rhino.RhinoDoc.ActiveDoc
        output_polys = []
        output_texts = []

        created_layers = {}

        for room in rooms:
            layer_name = room["type"].lower()
            if not rs.IsLayer(layer_name):
                color = random_color()
                rs.AddLayer(layer_name, color)
                created_layers[layer_name] = True

            rs.CurrentLayer(layer_name)

            success, poly = room["rect"].ToNurbsCurve().TryGetPolyline()
            if success:
                polyline = rs.AddPolyline(poly)
                output_polys.append(polyline)

                # Add text label in the center of the room
                center_pt = room["rect"].Center
                label = "{}\n{:.1f} sqm".format(room["name"], room["area"])
                text_dot = rs.AddTextDot(label, center_pt)
                output_texts.append(text_dot)

        sc.doc = ghdoc

        a = "✅ Finished"
        out = output_polys
        labels = output_texts

    except Exception as e:
        a = "❌ Error: " + str(e)
        out = []
        labels = []
else:
    a = "⏸️ Waiting for toggle..."
    out = []
    labels = []
