import os
import json
import logging
from dotenv import load_dotenv, find_dotenv
import re
import traceback
import requests  # 使用requests库替代OpenAI

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 尝试多种方式获取API密钥
def get_api_key():
    # 1. 首先检查环境变量
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if api_key:
        logger.info("从环境变量中获取到API密钥")
        return api_key
        
    # 2. 尝试从.env文件读取
    try:
        env_path = find_dotenv()
        logger.info(f"尝试从.env文件读取密钥: {env_path}")
        if env_path:
            with open(env_path, 'r') as f:
                content = f.read()
                match = re.search(r'OPENROUTER_API_KEY=([^\s]+)', content)
                if match:
                    api_key = match.group(1).strip()
                    logger.info("从.env文件中成功读取API密钥")
                    # 设置到环境变量中
                    os.environ["OPENROUTER_API_KEY"] = api_key
                    return api_key
    except Exception as e:
        logger.error(f"读取.env文件失败: {str(e)}")
        
    # 3. 尝试从预定路径读取
    try:
        current_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        env_path = os.path.join(current_dir, '.env')
        logger.info(f"尝试从指定路径读取密钥: {env_path}")
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                content = f.read()
                match = re.search(r'OPENROUTER_API_KEY=([^\s]+)', content)
                if match:
                    api_key = match.group(1).strip()
                    logger.info("从指定路径成功读取API密钥")
                    # 设置到环境变量中
                    os.environ["OPENROUTER_API_KEY"] = api_key
                    return api_key
    except Exception as e:
        logger.error(f"从指定路径读取.env文件失败: {str(e)}")
    
    return None

# 获取API密钥
OPENROUTER_API_KEY = get_api_key()
logger.info(f"API密钥加载状态: {'成功' if OPENROUTER_API_KEY else '失败'}")

if not OPENROUTER_API_KEY:
    logger.error("OPENROUTER_API_KEY未设置，将在运行时再次尝试获取")

def process_boundary_data(boundary_data):
    """
    处理边界数据，提取有用信息用于模型提示
    """
    # 计算总面积和边界框
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
    根据边界数据和描述生成平面图
    
    参数:
    - boundary_data: 边界形状数据数组
    - description: 平面图文本描述
    - preferences: 可选的偏好设置
    
    返回:
    - floor_plan_json: 生成的平面图JSON
    - success: 是否成功
    - message: 状态或错误消息
    """
    if not description:
        return None, False, "Missing text description"
    
    if not boundary_data or len(boundary_data) == 0:
        return None, False, "Missing boundary data"
    
    try:
        # 检查API密钥，可能在初始化时未获取到
        api_key = get_api_key()
        if not api_key:
            return None, False, "无法获取API密钥，请检查.env文件或环境变量"
        
        # 处理边界数据
        processed_boundary = process_boundary_data(boundary_data)
        logger.info(f"处理后的边界数据: 总面积={processed_boundary['total_area']}平方米, 形状数量={processed_boundary['shapes_count']}")
        
        # 构建系统提示
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
        
        # 构建用户提示，包含边界信息和描述
        user_prompt = f"""
        Please create a floor plan based on the following description and boundary constraints:
        
        Description: {description}
        
        Boundary Information:
        - Total area: {processed_boundary['total_area']} square meters
        - Number of shapes: {processed_boundary['shapes_count']}
        - Shape details: {json.dumps(processed_boundary['shapes'], indent=2)}
        
        Additional preferences: {json.dumps(preferences, indent=2) if preferences else 'None'}
        
        Please ensure the floor plan fits within the given boundaries and addresses all requirements in the description.
        """
        
        # 发送API请求
        logger.info("使用requests库发送API请求至OpenRouter")
        try:
            # 构建请求头
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "https://floorplan-generator.com",
                "X-Title": "LLM Floor Plan Generator"
            }
            
            # 构建请求体
            payload = {
                "model": "anthropic/claude-3-sonnet-20240229",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 4000,  # 增加token数量以确保生成完整的JSON
                "stream": False  # 默认非流式响应
            }
            
            # 发送请求
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60  # 设置60秒超时
            )
            
            # 检查响应状态
            if response.status_code != 200:
                error_msg = f"API请求失败，状态码: {response.status_code}, 响应: {response.text}"
                logger.error(error_msg)
                return None, False, error_msg
                
            # 处理响应
            result = response.json()
            logger.info("成功收到API响应")
        except Exception as api_error:
            logger.error(f"API调用失败: {str(api_error)}\n{traceback.format_exc()}")
            return None, False, f"API调用失败: {str(api_error)}"
        
        # 提取并验证JSON
        logger.info("开始解析API响应")
        result_text = result["choices"][0]["message"]["content"]
        
        # 查找三个反引号之间的JSON内容
        if "```json" in result_text and "```" in result_text:
            json_content = result_text.split("```json")[1].split("```")[0].strip()
            logger.info("从```json```块中提取JSON内容")
        elif "```" in result_text:
            json_content = result_text.split("```")[1].split("```")[0].strip()
            logger.info("从```块中提取JSON内容")
        else:
            json_content = result_text
            logger.info("使用完整响应作为JSON内容")
            
        # 验证JSON
        try:
            json_obj = json.loads(json_content)
            formatted_json = json.dumps(json_obj, indent=2)
            logger.info("JSON验证成功")
            return formatted_json, True, "Successfully generated floor plan"
        except json.JSONDecodeError as json_error:
            logger.error(f"JSON解析失败: {str(json_error)}")
            logger.error(f"收到的内容: {result_text[:500]}...")
            return None, False, f"无法解析模型生成的JSON: {str(json_error)}"
        
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"生成平面图时发生错误: {str(e)}\n{error_detail}")
        error_message = f"Error generating floor plan: {str(e)}"
        return None, False, error_message


def generate_floor_plan_stream(boundary_data, description, preferences=None):
    """
    使用流式响应生成平面图
    
    参数:
    - boundary_data: 边界形状数据数组
    - description: 平面图文本描述
    - preferences: 可选的偏好设置
    
    返回:
    - 生成器对象，可迭代获取每个响应片段
    """
    if not description:
        yield json.dumps({"error": "Missing text description"})
        return
    
    if not boundary_data or len(boundary_data) == 0:
        yield json.dumps({"error": "Missing boundary data"})
        return
    
    try:
        # 检查API密钥，可能在初始化时未获取到
        api_key = get_api_key()
        if not api_key:
            yield json.dumps({"error": "无法获取API密钥，请检查.env文件或环境变量"})
            return
        
        # 处理边界数据
        processed_boundary = process_boundary_data(boundary_data)
        logger.info(f"处理后的边界数据: 总面积={processed_boundary['total_area']}平方米, 形状数量={processed_boundary['shapes_count']}")
        
        # 构建系统提示
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
        
        # 构建用户提示，包含边界信息和描述
        user_prompt = f"""
        Please create a floor plan based on the following description and boundary constraints:
        
        Description: {description}
        
        Boundary Information:
        - Total area: {processed_boundary['total_area']} square meters
        - Number of shapes: {processed_boundary['shapes_count']}
        - Shape details: {json.dumps(processed_boundary['shapes'], indent=2)}
        
        Additional preferences: {json.dumps(preferences, indent=2) if preferences else 'None'}
        
        Please ensure the floor plan fits within the given boundaries and addresses all requirements in the description.
        """
        
        # 发送API请求
        logger.info("使用流式请求发送API请求至OpenRouter")
        
        # 构建请求头
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://floorplan-generator.com",
            "X-Title": "LLM Floor Plan Generator"
        }
        
        # 构建请求体
        payload = {
            "model": "anthropic/claude-3-sonnet-20240229",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 4000,  # 增加token数量以确保生成完整的JSON
            "stream": True  # 流式响应
        }
        
        # 发送流式请求
        with requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60,  # 设置60秒超时
            stream=True  # 启用流式传输
        ) as response:
            # 检查响应状态
            if response.status_code != 200:
                error_msg = f"API请求失败，状态码: {response.status_code}, 响应: {response.text}"
                logger.error(error_msg)
                yield json.dumps({"error": error_msg})
                return
            
            # 处理流式响应
            accumulated_text = ""
            for line in response.iter_lines():
                if line:
                    # 移除SSE前缀 "data: "
                    line_text = line.decode('utf-8')
                    if line_text.startswith("data: "):
                        line_data = line_text[6:]  # 去除 "data: " 前缀
                        
                        # 处理结束标志
                        if line_data == "[DONE]":
                            break
                            
                        try:
                            json_data = json.loads(line_data)
                            chunk = json_data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if chunk:
                                accumulated_text += chunk
                                # 发送增量更新
                                yield json.dumps({
                                    "type": "chunk", 
                                    "content": chunk,
                                    "accumulated": accumulated_text
                                })
                        except json.JSONDecodeError:
                            logger.error(f"解析流式响应行失败: {line_data}")
                        except Exception as e:
                            logger.error(f"处理流式响应行时出错: {str(e)}")
            
            # 处理完整响应
            logger.info("流式响应接收完成，解析JSON")
            
            # 提取JSON内容
            if "```json" in accumulated_text and "```" in accumulated_text:
                json_content = accumulated_text.split("```json")[1].split("```")[0].strip()
                logger.info("从```json```块中提取JSON内容")
            elif "```" in accumulated_text:
                json_content = accumulated_text.split("```")[1].split("```")[0].strip()
                logger.info("从```块中提取JSON内容")
            else:
                json_content = accumulated_text
                logger.info("使用完整响应作为JSON内容")
                
            # 验证JSON
            try:
                json_obj = json.loads(json_content)
                formatted_json = json.dumps(json_obj, indent=2)
                logger.info("JSON验证成功")
                
                # 发送最终结果
                yield json.dumps({
                    "type": "final",
                    "message": "Successfully generated floor plan",
                    "floor_plan": formatted_json
                })
            except json.JSONDecodeError as json_error:
                logger.error(f"JSON解析失败: {str(json_error)}")
                logger.error(f"收到的内容: {accumulated_text[:500]}...")
                yield json.dumps({
                    "type": "error",
                    "error": f"无法解析模型生成的JSON: {str(json_error)}"
                })
    
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"生成平面图时发生错误: {str(e)}\n{error_detail}")
        error_message = f"Error generating floor plan: {str(e)}"
        yield json.dumps({"error": error_message}) 