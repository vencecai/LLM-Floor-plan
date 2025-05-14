import os
import json
import logging
from dotenv import load_dotenv, find_dotenv
import re
import traceback
import requests  # Using requests library instead of OpenAI

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try multiple ways to get API key
def get_api_key():
    # 0. First force load .env file
    try:
        # Try to load .env file from current and parent directories
        dotenv_path = find_dotenv(usecwd=True)
        if dotenv_path:
            logger.info(f"Found .env file: {dotenv_path}")
            load_dotenv(dotenv_path)
        else:
            logger.warning("find_dotenv() couldn't find .env file")
            
            # Try to load from fixed path
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            env_path = os.path.join(backend_dir, '.env')
            logger.info(f"Trying to load .env file from fixed path: {env_path}")
            if os.path.exists(env_path):
                load_dotenv(env_path)
    except Exception as e:
        logger.error(f"Failed to load .env file: {str(e)}")
    
    # 1. Get from environment variables
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if api_key:
        # Check API key format
        if api_key.startswith("sk-or-"):
            logger.info("Valid API key obtained from environment variables")
            return api_key.strip()  # Ensure no whitespace
        else:
            logger.warning(f"API key in environment variables has incorrect format: {api_key[:10]}...")
        
    # 2. Try to read directly from .env file
    try:
        env_path = find_dotenv()
        logger.info(f"Trying to read key from .env file: {env_path}")
        if env_path and os.path.exists(env_path):
            with open(env_path, 'r') as f:
                content = f.read()
                match = re.search(r'OPENROUTER_API_KEY=([^\s]+)', content)
                if match:
                    api_key = match.group(1).strip()
                    if api_key.startswith("sk-or-"):
                        logger.info("Successfully read API key from .env file")
                        # Set to environment variable
                        os.environ["OPENROUTER_API_KEY"] = api_key
                        return api_key
                    else:
                        logger.warning(f"API key in .env file has incorrect format: {api_key[:10]}...")
    except Exception as e:
        logger.error(f"Failed to read .env file: {str(e)}")
        
    # 3. Try to read from predetermined path
    try:
        current_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        env_path = os.path.join(current_dir, '.env')
        logger.info(f"Trying to read key from specified path: {env_path}")
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                content = f.read()
                match = re.search(r'OPENROUTER_API_KEY=([^\s]+)', content)
                if match:
                    api_key = match.group(1).strip()
                    if api_key.startswith("sk-or-"):
                        logger.info("Successfully read API key from specified path")
                        # Set to environment variable
                        os.environ["OPENROUTER_API_KEY"] = api_key
                        return api_key
                    else:
                        logger.warning(f"API key in specified path has incorrect format: {api_key[:10]}...")
    except Exception as e:
        logger.error(f"Failed to read .env file from specified path: {str(e)}")
    
    return None

# Get API key
OPENROUTER_API_KEY = get_api_key()
logger.info(f"API key loading status: {'success' if OPENROUTER_API_KEY else 'failure'}")
if OPENROUTER_API_KEY:
    logger.info(f"API key first 10 chars: {OPENROUTER_API_KEY[:10]}...")
else:
    logger.error("OPENROUTER_API_KEY not set, will try to get it again at runtime")

def process_boundary_data(boundary_data):
    """
    Process boundary data, extract useful information for model prompt
    """
    # Calculate total area and boundary box
    total_area = 0
    shapes_info = []
    
    for shape in boundary_data:
        width_units = shape.get('widthInUnits', 0)
        height_units = shape.get('heightInUnits', 0)
        area = width_units * height_units
        total_area += area
        
        shape_info = {
            'type': shape.get('type', 'rectangle'),
            'width': width_units,
            'height': height_units,
            'area': area,
            'position': {
                'x': shape.get('x', 0),
                'y': shape.get('y', 0)
            }
        }
        shapes_info.append(shape_info)
    
    return {
        'total_area': total_area,
        'shapes_count': len(boundary_data),
        'shapes': shapes_info
    }

def generate_floor_plan(boundary_data, description, preferences=None):
    """
    Generate floor plan based on boundary data and description
    
    Parameters:
    - boundary_data: Array of boundary shape data
    - description: Text description of the floor plan
    - preferences: Optional preferences
    
    Returns:
    - floor_plan_json: Generated floor plan JSON
    - success: Whether the operation was successful
    - message: Status or error message
    """
    if not description:
        return None, False, "Missing text description"
    
    if not boundary_data or len(boundary_data) == 0:
        return None, False, "Missing boundary data"
    
    try:
        # Check API key, might not be obtained at initialization
        api_key = get_api_key()
        if not api_key:
            return None, False, "Cannot get API key, please check .env file or environment variable"
        
        # Check API key format
        if not api_key.startswith("sk-or-"):
            return None, False, f"API key format incorrect: {api_key[:10]}... should start with sk-or-"
            
        # Process boundary data
        processed_boundary = process_boundary_data(boundary_data)
        logger.info(f"Processed boundary data: Total area={processed_boundary['total_area']} square meters, shapes count={processed_boundary['shapes_count']}")
        
        # Build system prompt
        system_prompt = """
        You are a floor plan design assistant. Your task is to create a recursive binary space partitioning tree based on the room requirements provided by the user.

        First, analyze the description to identify room types and their relative sizes. Then, create a binary tree where each node represents a rectangular area, with the root node being the entire boundary.

        IMPORTANT: Output your response in TWO clearly separated parts:
        1. Thinking steps: Detailed explanation of your reasoning process
        2. Final JSON output: ONLY the binary partition tree structure

        For the thinking steps, walk through:
        0. Analysis of the description to list all room types and sizes you've identified
        1. Calculate the total area of the given boundary
        2. Validate if the sum of room areas matches the total area (adjust if needed)
        3. For each node, choose a split direction (horizontal/vertical) and create two child nodes
        4. Repeat recursively until each leaf node corresponds to a specific room

        For the JSON output, follow this structure:
        {
          "split": {
            "name": "root",
            "area": total_area,
            "angle": 0 or π/2 (0 for horizontal split, π/2 for vertical),
            "final": false,
            "children": [
              {
                "name": "rootL",
                "area": area_left,
                "angle": angle,
                "final": false/true,
                "children": [...]
              },
              {
                "name": "rootR",
                "area": area_right,
                "angle": angle,
                "final": false/true,
                "children": [...]
              }
            ]
          }
        }

        Keep your thinking steps clear and logical, and ensure the final JSON is valid and follows the specified format.
        """
        
        # Build user prompt, include boundary information and description
        user_prompt = f"""
        Please create a binary space partitioning tree for a floor plan based on the following description and boundary constraints:

        Description: {description}
        
        Boundary Information:
        - Total area: {processed_boundary['total_area']} units
        - Number of shapes: {processed_boundary['shapes_count']}
        - Shape details: {json.dumps(processed_boundary['shapes'], indent=2)}
        
        Additional preferences: {json.dumps(preferences, indent=2) if preferences else 'None'}
        
        Remember to:
        1. First output your THINKING STEPS in detail, showing how you analyze the room requirements and decide on partitioning
        2. Then output ONLY the final JSON with the binary partition tree structure
        3. Make sure each split divides the space efficiently according to the described room requirements
        4. Ensure leaf nodes correspond to specific rooms from the description
        5. Use meaningful names for nodes (e.g., "livingRoom", "kitchen", etc.)
        """
        
        # Send API request
        logger.info("Sending API request to OpenRouter using requests library")
        try:
            # Build request headers - ensure correct format
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key.strip()}",  # Ensure no whitespace
                "HTTP-Referer": "https://floorplan-generator.com",
                "X-Title": "LLM Floor Plan Generator"
            }
            
            logger.info(f"API request Authorization header: Bearer {api_key[:10]}...")
            
            # Build request body
            payload = {
                "model": "anthropic/claude-3.7-sonnet",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 4000,  # Increase token count to ensure complete JSON generation
                "stream": False  # Default non-streaming response
            }
            
            # Send request
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60  # Set 60 seconds timeout
            )
            
            # Check response status
            if response.status_code != 200:
                error_msg = f"API request failed, status code: {response.status_code}, response: {response.text}"
                logger.error(error_msg)
                return None, False, error_msg
                
            # Process response
            result = response.json()
            logger.info("Successfully received API response")
        except Exception as api_error:
            logger.error(f"API call failed: {str(api_error)}\n{traceback.format_exc()}")
            return None, False, f"API call failed: {str(api_error)}"
        
        # Extract full response content
        result_text = result["choices"][0]["message"]["content"]
        
        # Find JSON content - first try to find ```json and ``` between them
        json_content = None
        if "```json" in result_text and "```" in result_text:
            # Find first ```json following content
            json_block = result_text.split("```json", 1)[1].split("```", 1)[0].strip()
            logger.info("Extracting JSON content from ```json``` block")
            json_content = json_block
        elif "```" in result_text:
            # Try to extract JSON from any code block
            blocks = result_text.split("```")
            for i in range(1, len(blocks), 2):
                # Only process odd index blocks (code block content)
                potential_json = blocks[i].strip()
                # If block starts with json, remove it
                if potential_json.startswith("json"):
                    potential_json = potential_json[4:].strip()
                
                try:
                    # Try to parse as JSON
                    json.loads(potential_json)
                    json_content = potential_json
                    logger.info("Successfully extracted JSON content from code block")
                    break
                except:
                    continue
        
        # If no valid JSON content found, try to extract JSON from entire text
        if not json_content:
            # Find first { and last } between them
            open_brace = result_text.find("{")
            if open_brace != -1:
                # Find matching last brace
                depth = 0
                close_brace = -1
                for i in range(open_brace, len(result_text)):
                    if result_text[i] == '{':
                        depth += 1
                    elif result_text[i] == '}':
                        depth -= 1
                        if depth == 0:
                            close_brace = i
                            break
                
                if close_brace != -1:
                    json_content = result_text[open_brace:close_brace+1]
                    logger.info("Extracted possible JSON content from text")
        
        # Validate JSON
        if json_content:
            try:
                json_obj = json.loads(json_content)
                formatted_json = json.dumps(json_obj, indent=2)
                logger.info("JSON validation successful")
                
                # Save original response for debugging
                full_response = {
                    "thinking_steps": result_text,
                    "json_result": json_obj
                }
                
                # Return formatted JSON and full response
                return json.dumps(full_response, indent=2), True, "Successfully generated floor plan"
            except json.JSONDecodeError as json_error:
                logger.error(f"JSON parsing failed: {str(json_error)}")
                logger.error(f"Attempting to parse content: {json_content[:500]}...")
        
        # If no valid JSON could be extracted, return original text
        logger.warning("No valid JSON could be extracted, returning original response")
        return result_text, True, "Generated response without valid JSON structure"
        
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"Error generating floor plan: {str(e)}\n{error_detail}")
        error_message = f"Error generating floor plan: {str(e)}"
        return None, False, error_message


def generate_floor_plan_stream(boundary_data, description, preferences=None):
    """
    Generate floor plan using streaming response
    
    Parameters:
    - boundary_data: Array of boundary shape data
    - description: Text description of the floor plan
    - preferences: Optional preferences
    
    Returns:
    - Generator object, iterable to get each response fragment
    """
    if not description:
        yield json.dumps({"error": "Missing text description"})
        return
    
    if not boundary_data or len(boundary_data) == 0:
        yield json.dumps({"error": "Missing boundary data"})
        return
    
    try:
        # Check API key, might not be obtained at initialization
        api_key = get_api_key()
        if not api_key:
            yield json.dumps({"error": "Cannot get API key, please check .env file or environment variable"})
            return
            
        # Check API key format
        if not api_key.startswith("sk-or-"):
            yield json.dumps({"error": f"API key format incorrect: {api_key[:10]}... should start with sk-or-"})
            return
        
        # Process boundary data
        processed_boundary = process_boundary_data(boundary_data)
        logger.info(f"Processed boundary data: Total area={processed_boundary['total_area']} square meters, shapes count={processed_boundary['shapes_count']}")
        
        # Build system prompt
        system_prompt = """
        You are a floor plan design assistant. Your task is to create a recursive binary space partitioning tree based on the room requirements provided by the user.

        First, analyze the description to identify room types and their relative sizes. Then, create a binary tree where each node represents a rectangular area, with the root node being the entire boundary.

        IMPORTANT: Output your response in TWO clearly separated parts:
        1. Thinking steps: Detailed explanation of your reasoning process
        2. Final JSON output: ONLY the binary partition tree structure

        For the thinking steps, walk through:
        0. Analysis of the description to list all room types and sizes you've identified
        1. Calculate the total area of the given boundary
        2. Validate if the sum of room areas matches the total area (adjust if needed)
        3. For each node, choose a split direction (horizontal/vertical) and create two child nodes
        4. Repeat recursively until each leaf node corresponds to a specific room

        For the JSON output, follow this structure:
        {
          "split": {
            "name": "root",
            "area": total_area,
            "angle": 0 or π/2 (0 for horizontal split, π/2 for vertical),
            "final": false,
            "children": [
              {
                "name": "rootL",
                "area": area_left,
                "angle": angle,
                "final": false/true,
                "children": [...]
              },
              {
                "name": "rootR",
                "area": area_right,
                "angle": angle,
                "final": false/true,
                "children": [...]
              }
            ]
          }
        }

        Keep your thinking steps clear and logical, and ensure the final JSON is valid and follows the specified format.
        """
        
        # Build user prompt, include boundary information and description
        user_prompt = f"""
        Please create a binary space partitioning tree for a floor plan based on the following description and boundary constraints:

        Description: {description}
        
        Boundary Information:
        - Total area: {processed_boundary['total_area']} units
        - Number of shapes: {processed_boundary['shapes_count']}
        - Shape details: {json.dumps(processed_boundary['shapes'], indent=2)}
        
        Additional preferences: {json.dumps(preferences, indent=2) if preferences else 'None'}
        
        Remember to:
        1. First output your THINKING STEPS in detail, showing how you analyze the room requirements and decide on partitioning
        2. Then output ONLY the final JSON with the binary partition tree structure
        3. Make sure each split divides the space efficiently according to the described room requirements
        4. Ensure leaf nodes correspond to specific rooms from the description
        5. Use meaningful names for nodes (e.g., "livingRoom", "kitchen", etc.)
        """
        
        # Send API request
        logger.info("Sending streaming API request to OpenRouter")
        
        # Build request headers
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key.strip()}", # Ensure no whitespace
            "HTTP-Referer": "https://floorplan-generator.com",
            "X-Title": "LLM Floor Plan Generator"
        }
        
        logger.info(f"API request Authorization header: Bearer {api_key[:10]}...")
        
        # Build request body
        payload = {
            "model": "anthropic/claude-3.7-sonnet",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 4000,  # Increase token count to ensure complete JSON generation
            "stream": True  # Streaming response
        }
        
        # Send streaming request
        with requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60,  # Set 60 seconds timeout
            stream=True  # Enable streaming transmission
        ) as response:
            # Check response status
            if response.status_code != 200:
                error_msg = f"API request failed, status code: {response.status_code}, response: {response.text}"
                logger.error(error_msg)
                yield json.dumps({"error": error_msg})
                return
            
            # Process streaming response
            accumulated_text = ""
            for line in response.iter_lines():
                if line:
                    # Remove SSE prefix "data: "
                    line_text = line.decode('utf-8')
                    if line_text.startswith("data: "):
                        line_data = line_text[6:]  # Remove "data: " prefix
                        
                        # Process end marker
                        if line_data == "[DONE]":
                            break
                            
                        try:
                            json_data = json.loads(line_data)
                            chunk = json_data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if chunk:
                                accumulated_text += chunk
                                # Send incremental update
                                yield json.dumps({
                                    "type": "chunk", 
                                    "content": chunk,
                                    "accumulated": accumulated_text
                                })
                        except json.JSONDecodeError:
                            logger.error(f"Failed to parse streaming response line: {line_data}")
                        except Exception as e:
                            logger.error(f"Error processing streaming response line: {str(e)}")
            
            # Process full response
            logger.info("Streaming response received, parsing JSON")
            
            # Extract JSON content
            json_content = None
            if "```json" in accumulated_text and "```" in accumulated_text:
                json_block = accumulated_text.split("```json", 1)[1].split("```", 1)[0].strip()
                logger.info("Extracting JSON content from ```json``` block")
                json_content = json_block
            elif "```" in accumulated_text:
                # Try to extract JSON from any code block
                blocks = accumulated_text.split("```")
                for i in range(1, len(blocks), 2):
                    # Only process odd index blocks (code block content)
                    potential_json = blocks[i].strip()
                    # If block starts with json, remove it
                    if potential_json.startswith("json"):
                        potential_json = potential_json[4:].strip()
                    
                    try:
                        # Try to parse as JSON
                        json.loads(potential_json)
                        json_content = potential_json
                        logger.info("Successfully extracted JSON content from code block")
                        break
                    except:
                        continue
            
            # If no valid JSON content found, try to extract JSON from entire text
            if not json_content:
                # Find first { and last } between them
                open_brace = accumulated_text.find("{")
                if open_brace != -1:
                    # Find matching last brace
                    depth = 0
                    close_brace = -1
                    for i in range(open_brace, len(accumulated_text)):
                        if accumulated_text[i] == '{':
                            depth += 1
                        elif accumulated_text[i] == '}':
                            depth -= 1
                            if depth == 0:
                                close_brace = i
                                break
                    
                    if close_brace != -1:
                        json_content = accumulated_text[open_brace:close_brace+1]
                        logger.info("Extracted possible JSON content from text")
            
            # Validate JSON
            if json_content:
                try:
                    json_obj = json.loads(json_content)
                    formatted_json = json.dumps(json_obj, indent=2)
                    logger.info("JSON validation successful")
                    
                    # Send final result
                    full_response = {
                        "thinking_steps": accumulated_text,
                        "json_result": json_obj
                    }
                    
                    yield json.dumps({
                        "type": "final",
                        "message": "Successfully generated floor plan",
                        "floor_plan": json.dumps(full_response, indent=2)
                    })
                except json.JSONDecodeError as json_error:
                    logger.error(f"JSON parsing failed: {str(json_error)}")
                    logger.error(f"Received content: {accumulated_text[:500]}...")
                    yield json.dumps({
                        "type": "error",
                        "error": f"Cannot parse JSON generated by model: {str(json_error)}"
                    })
            else:
                # If no valid JSON could be extracted, return original text
                logger.warning("No valid JSON could be extracted, returning original response")
                yield json.dumps({
                    "type": "final",
                    "message": "Generated response without valid JSON structure",
                    "floor_plan": json.dumps({"raw_response": accumulated_text})
                })
    
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"Error generating floor plan: {str(e)}\n{error_detail}")
        error_message = f"Error generating floor plan: {str(e)}"
        yield json.dumps({"error": error_message}) 