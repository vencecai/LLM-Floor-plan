"""
JSON Utility Functions for LLM Floor Plan Generator
This module provides helper functions for JSON processing in the floor plan generation system.
"""

import json
import re

def validate_floor_plan_json(json_str):
    """
    Validates the JSON string to ensure it has the required structure for floor plan generation.
    
    Args:
        json_str (str): JSON string to validate
    
    Returns:
        tuple: (is_valid, message, json_obj)
            - is_valid (bool): Whether the JSON is valid
            - message (str): Success or error message
            - json_obj (dict): Parsed JSON object if valid, None otherwise
    """
    if not json_str:
        return False, "Empty JSON string", None
    
    try:
        # Try to parse the JSON
        json_obj = json.loads(json_str)
        
        # Check for required sections
        if "rooms" not in json_obj or not isinstance(json_obj["rooms"], list):
            return False, "Missing or invalid 'rooms' array", None
        
        # Validate room objects
        for i, room in enumerate(json_obj["rooms"]):
            if "id" not in room:
                return False, f"Room at index {i} is missing an 'id'", None
            
            if "name" not in room or not isinstance(room["name"], str):
                return False, f"Room '{room.get('id', i)}' is missing a valid 'name'", None
            
            if "type" not in room or not isinstance(room["type"], str):
                return False, f"Room '{room.get('id', i)}' is missing a valid 'type'", None
            
            if "adjacent_rooms" in room and not isinstance(room["adjacent_rooms"], list):
                return False, f"Room '{room.get('id', i)}' has invalid 'adjacent_rooms'", None
        
        # Check if walls section exists (optional but should be a list if present)
        if "walls" in json_obj and not isinstance(json_obj["walls"], list):
            return False, "'walls' should be an array", None
        
        # Check if openings section exists (optional but should be a list if present)
        if "openings" in json_obj and not isinstance(json_obj["openings"], list):
            return False, "'openings' should be an array", None
        
        # If we made it here, the JSON is valid for our purposes
        return True, "JSON is valid", json_obj
        
    except json.JSONDecodeError as e:
        return False, f"Invalid JSON: {str(e)}", None

def extract_json_from_llm_response(text):
    """
    Extracts JSON content from an LLM response, which might include markdown code blocks or extra text.
    
    Args:
        text (str): The raw text response from the LLM
    
    Returns:
        str: Extracted JSON string or the original text if no JSON block found
    """
    # Check for JSON inside code blocks (```json ... ```)
    json_code_block = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if json_code_block:
        return json_code_block.group(1).strip()
    
    # If no code block, check for content that looks like JSON (starting with { and ending with })
    json_content = re.search(r'(\{[\s\S]*\})', text)
    if json_content:
        return json_content.group(1).strip()
    
    # If no obvious JSON pattern found, return the original text
    return text

def normalize_floor_plan_json(json_obj):
    """
    Normalizes a floor plan JSON object to ensure consistent structure and required fields.
    Fills in missing fields with default values.
    
    Args:
        json_obj (dict): The parsed JSON object to normalize
    
    Returns:
        dict: Normalized JSON object
    """
    if not json_obj:
        return {
            "rooms": [],
            "walls": [],
            "openings": []
        }
    
    # Make sure we have the basic structure
    normalized = {
        "rooms": json_obj.get("rooms", []),
        "walls": json_obj.get("walls", []),
        "openings": json_obj.get("openings", [])
    }
    
    # Normalize room objects
    for i, room in enumerate(normalized["rooms"]):
        # Ensure each room has the required fields
        if "id" not in room:
            room["id"] = f"room_{i+1}"
        
        if "name" not in room:
            room["name"] = f"Room {i+1}"
        
        if "type" not in room:
            room["type"] = "unknown"
        
        if "area" not in room:
            # Assign a default area based on room type
            room_type = room["type"].lower()
            if "bedroom" in room_type:
                room["area"] = 12.0
            elif "bathroom" in room_type:
                room["area"] = 5.0
            elif "kitchen" in room_type:
                room["area"] = 10.0
            elif "living" in room_type:
                room["area"] = 20.0
            else:
                room["area"] = 15.0
        
        if "adjacent_rooms" not in room:
            room["adjacent_rooms"] = []
    
    # Normalize wall objects
    for i, wall in enumerate(normalized["walls"]):
        if "id" not in wall:
            wall["id"] = f"wall_{i+1}"
        
        # Make sure start_point and end_point are present
        if "start_point" not in wall or "end_point" not in wall:
            # We can't really guess these coordinates, so just add placeholders
            # In real use, these would need to be determined by a layout algorithm
            if "start_point" not in wall:
                wall["start_point"] = [0, i]
            
            if "end_point" not in wall:
                wall["end_point"] = [5, i]
        
        if "room_ids" not in wall:
            wall["room_ids"] = []
    
    # Normalize opening objects
    for i, opening in enumerate(normalized["openings"]):
        if "id" not in opening:
            opening["id"] = f"opening_{i+1}"
        
        if "type" not in opening:
            opening["type"] = "door"  # Default to door
        
        if "wall_id" not in opening:
            # We need a wall_id, so assign to the first wall if possible
            if normalized["walls"]:
                opening["wall_id"] = normalized["walls"][0]["id"]
            else:
                opening["wall_id"] = "unknown_wall"
        
        if "position" not in opening:
            opening["position"] = 0.5  # Default to middle of wall
        
        if "width" not in opening:
            # Set default width based on type
            opening["width"] = 0.9 if opening["type"] == "door" else 1.2
    
    return normalized 