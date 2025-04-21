from flask import Blueprint, request, jsonify, Response, stream_with_context
from app.services import floor_plan_service
import traceback
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/generate-floor-plan', methods=['POST'])
def generate_floor_plan():
    """
    接收前端发送的边界数据和描述，生成平面图
    
    请求体应包含:
    - boundary_data: 边界形状数据数组
    - description: 平面图文本描述
    - preferences: 可选的偏好设置
    
    返回:
    - 生成的平面图JSON数据
    """
    try:
        data = request.get_json()
        logger.info(f"接收到请求数据: {data}")
        
        if not data:
            return jsonify({'error': 'Missing request data'}), 400
            
        # 提取必要的输入
        boundary_data = data.get('boundary_data')
        description = data.get('description')
        preferences = data.get('preferences', {})
        
        # 验证输入
        if not boundary_data:
            return jsonify({'error': 'Missing boundary data'}), 400
            
        if not description:
            return jsonify({'error': 'Missing description text'}), 400
            
        # 调用服务处理请求
        logger.info(f"开始生成平面图，描述: {description[:50]}...")
        floor_plan_json, success, message = floor_plan_service.generate_floor_plan(
            boundary_data, 
            description,
            preferences
        )
        
        if not success:
            logger.error(f"生成平面图失败: {message}")
            return jsonify({'error': message}), 400
            
        # 返回生成的平面图数据
        logger.info("成功生成平面图")
        return jsonify({
            'message': message,
            'floor_plan': floor_plan_json,
            'boundary_data': boundary_data,
            'description': description
        })
        
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"处理请求时发生错误: {str(e)}\n{error_detail}")
        return jsonify({'error': str(e), 'detail': error_detail}), 500


@api_bp.route('/generate-floor-plan-stream', methods=['POST'])
def generate_floor_plan_stream():
    """
    流式生成平面图
    
    请求体应包含:
    - boundary_data: 边界形状数据数组
    - description: 平面图文本描述
    - preferences: 可选的偏好设置
    
    返回:
    - 采用SSE(Server-Sent Events)格式的流式响应
    """
    try:
        data = request.get_json()
        logger.info(f"接收到流式请求数据: {data}")
        
        if not data:
            return jsonify({'error': 'Missing request data'}), 400
            
        # 提取必要的输入
        boundary_data = data.get('boundary_data')
        description = data.get('description')
        preferences = data.get('preferences', {})
        
        # 验证输入
        if not boundary_data:
            return jsonify({'error': 'Missing boundary data'}), 400
            
        if not description:
            return jsonify({'error': 'Missing description text'}), 400
        
        def generate():
            try:
                # 调用流式生成服务
                logger.info(f"开始流式生成平面图，描述: {description[:50]}...")
                
                # 发送初始状态
                yield 'data: {"type": "start", "message": "开始生成平面图..."}\n\n'
                
                # 使用流式生成函数
                for chunk in floor_plan_service.generate_floor_plan_stream(
                    boundary_data, 
                    description,
                    preferences
                ):
                    # 每个块以SSE格式发送
                    yield f'data: {chunk}\n\n'
                    
                logger.info("流式生成平面图结束")
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"流式生成过程中发生错误: {error_msg}")
                yield f'data: {{"type": "error", "error": "{error_msg}"}}\n\n'
        
        # 返回流式响应
        return Response(
            stream_with_context(generate()), 
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',  # 防止Nginx缓冲
                'Connection': 'keep-alive'
            }
        )
        
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"处理流式请求时发生错误: {str(e)}\n{error_detail}")
        return jsonify({'error': str(e), 'detail': error_detail}), 500 