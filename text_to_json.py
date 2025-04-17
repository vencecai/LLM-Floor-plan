"""
Grasshopper Python Component: Text to JSON Floor Plan Converter
This component takes natural language descriptions and converts them to a structured JSON representation
of a floor plan using an LLM.

Inputs:
    text_input: Natural language description of the desired floor plan (string)
    run: Boolean toggle to trigger the conversion process

Outputs:
    json_output: JSON string representation of the floor plan
    success: Boolean indicating if the conversion was successful
    message: Status or error message
"""

# Use #r directive for Rhino 8+ to import packages
#r "nuget: OpenAI, 1.8.0"

import rhinoscriptsyntax as rs
import Rhino
import json
import ghpythonlib.components as ghcomp
import System

# Import OpenAI client for API access
from openai import OpenAI

# Your OpenRouter API key is directly embedded here for convenience
# This eliminates the need for a separate .env file when using in Grasshopper
OPENROUTER_API_KEY = "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"

def process_with_llm(text_input):
    """Process the text input with OpenRouter API to generate a JSON floor plan description"""
    if not text_input:
        return None, False, "Missing text input"
    
    try:
        # Configure the OpenAI client with OpenRouter settings
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
        
        # System prompt to guide the model
        system_prompt = """
        You are a floor plan design assistant. Convert the user's text description into a structured JSON 
        representation of a floor plan. The JSON should include:
        
        1. rooms: Array of room objects with:
           - id: unique identifier
           - name: room name
           - type: room type (bedroom, bathroom, kitchen, etc.)
           - area: approximate area in square meters
           - adjacent_rooms: array of room IDs that this room connects to
        
        2. walls: Array of wall objects with:
           - id: unique identifier
           - start_point: [x, y] coordinates 
           - end_point: [x, y] coordinates
           - room_ids: array of room IDs this wall belongs to
        
        3. openings: Array of door/window objects with:
           - id: unique identifier
           - type: "door" or "window"
           - wall_id: ID of the wall this opening belongs to
           - position: relative position along the wall (0.0 to 1.0)
           - width: width of the opening in meters
        
        Format the JSON precisely and ensure it's valid.
        """
        
        # Make the completion request
        response = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "https://rhino3d.com", # Site URL for rankings
                "X-Title": "Rhino Floor Plan Generator", # Site title for rankings
            },
            model="anthropic/claude-3.7-sonnet",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text_input}
            ],
            temperature=0.2, # Lower temperature for more deterministic output
        )
        
        # Extract and validate the JSON from the response
        result_text = response.choices[0].message.content
        # Find JSON content between triple backticks if present
        if "```json" in result_text and "```" in result_text:
            json_content = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            json_content = result_text.split("```")[1].split("```")[0].strip()
        else:
            json_content = result_text
            
        # Validate the JSON
        json_obj = json.loads(json_content)
        return json.dumps(json_obj, indent=2), True, "Successfully generated floor plan JSON"
        
    except Exception as e:
        error_message = f"Error processing with LLM: {str(e)}"
        return None, False, error_message

# Main execution for Grasshopper component
if run:
    json_output, success, message = process_with_llm(text_input)
else:
    json_output = None
    success = False
    message = "Set 'run' to True to process the input" 