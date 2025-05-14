from flask import Blueprint, request, jsonify, Response, stream_with_context
from app.services import floor_plan_service
import traceback
import logging
import os
import json
import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/generate-floor-plan', methods=['POST'])
def generate_floor_plan():
    """
    Receive boundary data and description from frontend to generate a floor plan
    
    Request body should contain:
    - boundary_data: Boundary shape data array
    - description: Floor plan text description
    - preferences: Optional preference settings
    
    Returns:
    - Generated floor plan JSON data
    """
    try:
        data = request.get_json()
        logger.info(f"Received request data: {data}")
        
        if not data:
            return jsonify({'error': 'Missing request data'}), 400
            
        # Extract necessary inputs
        boundary_data = data.get('boundary_data')
        description = data.get('description')
        preferences = data.get('preferences', {})
        
        # Validate inputs
        if not boundary_data:
            return jsonify({'error': 'Missing boundary data'}), 400
            
        if not description:
            return jsonify({'error': 'Missing description text'}), 400
            
        # Call service to process request
        logger.info(f"Starting floor plan generation, description: {description[:50]}...")
        floor_plan_json, success, message = floor_plan_service.generate_floor_plan(
            boundary_data, 
            description,
            preferences
        )
        
        if not success:
            logger.error(f"Floor plan generation failed: {message}")
            return jsonify({'error': message}), 400
            
        # Return generated floor plan data
        logger.info("Floor plan generated successfully")
        return jsonify({
            'message': message,
            'floor_plan': floor_plan_json,
            'boundary_data': boundary_data,
            'description': description
        })
        
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"Error processing request: {str(e)}\n{error_detail}")
        return jsonify({'error': str(e), 'detail': error_detail}), 500


@api_bp.route('/generate-floor-plan-stream', methods=['POST'])
def generate_floor_plan_stream():
    """
    Stream floor plan generation
    
    Request body should contain:
    - boundary_data: Boundary shape data array
    - description: Floor plan text description
    - preferences: Optional preference settings
    
    Returns:
    - SSE (Server-Sent Events) formatted streaming response
    """
    try:
        data = request.get_json()
        logger.info(f"Received streaming request data: {data}")
        
        if not data:
            return jsonify({'error': 'Missing request data'}), 400
            
        # Extract necessary inputs
        boundary_data = data.get('boundary_data')
        description = data.get('description')
        preferences = data.get('preferences', {})
        
        # Validate inputs
        if not boundary_data:
            return jsonify({'error': 'Missing boundary data'}), 400
            
        if not description:
            return jsonify({'error': 'Missing description text'}), 400
        
        def generate():
            try:
                # Call streaming generation service
                logger.info(f"Starting streaming floor plan generation, description: {description[:50]}...")
                
                # Send initial status
                yield 'data: {"type": "start", "message": "Starting floor plan generation..."}\n\n'
                
                # Use streaming generation function
                for chunk in floor_plan_service.generate_floor_plan_stream(
                    boundary_data, 
                    description,
                    preferences
                ):
                    # Send each chunk as SSE format
                    yield f'data: {chunk}\n\n'
                    
                logger.info("Streaming floor plan generation completed")
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Error during streaming generation: {error_msg}")
                yield f'data: {{"type": "error", "error": "{error_msg}"}}\n\n'
        
        # Return streaming response
        return Response(
            stream_with_context(generate()), 
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',  # Prevent Nginx buffering
                'Connection': 'keep-alive'
            }
        )
        
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"Error processing streaming request: {str(e)}\n{error_detail}")
        return jsonify({'error': str(e), 'detail': error_detail}), 500

@api_bp.route('/save-local', methods=['POST'])
def save_floor_plan_to_local():
    """
    Save floor plan JSON data to local path
    
    Request body should contain:
    - data: Floor plan JSON data to save
    - path: Target path (default is Grasshopper Libraries folder)
    
    Returns:
    - Result of save operation
    """
    try:
        data = request.get_json()
        logger.info(f"Received save request data")
        
        if not data:
            return jsonify({'error': 'Missing request data'}), 400
            
        # Get data and path to save
        floor_plan_data = data.get('data')
        path = data.get('path', r'C:\Users\Kenne\AppData\Roaming\Grasshopper\Libraries')
        
        if not floor_plan_data:
            return jsonify({'error': 'Missing floor plan data'}), 400
        
        # Create filename (using timestamp)
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"floor_plan_{timestamp}.json"
        file_path = os.path.join(path, filename)
        
        # Ensure target directory exists
        os.makedirs(path, exist_ok=True)
        
        # Save JSON data to file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(floor_plan_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Floor plan data saved to: {file_path}")
        
        return jsonify({
            'success': True,
            'message': f'Floor plan saved to {file_path}',
            'file_path': file_path
        })
        
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"Error saving floor plan data: {str(e)}\n{error_detail}")
        return jsonify({'error': str(e), 'detail': error_detail}), 500 