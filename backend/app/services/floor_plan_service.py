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
        
        # 构建用户提示，包含边界信息和描述
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
                "model": "anthropic/claude-3.7-sonnet",
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
        
        # 提取完整响应内容
        result_text = result["choices"][0]["message"]["content"]
        
        # 查找JSON内容 - 首先尝试找到```json和```之间的内容
        json_content = None
        if "```json" in result_text and "```" in result_text:
            # 查找第一个出现的```json后面的内容
            json_block = result_text.split("```json", 1)[1].split("```", 1)[0].strip()
            logger.info("从```json```块中提取JSON内容")
            json_content = json_block
        elif "```" in result_text:
            # 尝试从任何代码块中提取JSON
            blocks = result_text.split("```")
            for i in range(1, len(blocks), 2):
                # 只处理奇数索引的块(代码块内容)
                potential_json = blocks[i].strip()
                # 如果块以json开头，移除它
                if potential_json.startswith("json"):
                    potential_json = potential_json[4:].strip()
                
                try:
                    # 尝试解析为JSON
                    json.loads(potential_json)
                    json_content = potential_json
                    logger.info("从代码块中成功提取JSON内容")
                    break
                except:
                    continue
        
        # 如果没有找到有效的JSON内容，尝试提取全文中的{...}
        if not json_content:
            # 查找第一个{和最后一个}之间的内容
            open_brace = result_text.find("{")
            if open_brace != -1:
                # 寻找匹配的最后一个大括号
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
                    logger.info("从文本中提取了可能的JSON内容")
        
        # 验证JSON
        if json_content:
            try:
                json_obj = json.loads(json_content)
                formatted_json = json.dumps(json_obj, indent=2)
                logger.info("JSON验证成功")
                
                # 保存原始响应以便调试
                full_response = {
                    "thinking_steps": result_text,
                    "json_result": json_obj
                }
                
                # 返回格式化的JSON和完整响应
                return json.dumps(full_response, indent=2), True, "Successfully generated floor plan"
            except json.JSONDecodeError as json_error:
                logger.error(f"JSON解析失败: {str(json_error)}")
                logger.error(f"尝试解析的内容: {json_content[:500]}...")
        
        # 如果无法提取有效的JSON，返回原始文本
        logger.warning("无法提取有效的JSON，返回原始响应")
        return result_text, True, "Generated response without valid JSON structure"
        
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
        
        # 构建用户提示，包含边界信息和描述
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
            "model": "anthropic/claude-3.7-sonnet",
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
            json_content = None
            if "```json" in accumulated_text and "```" in accumulated_text:
                json_block = accumulated_text.split("```json", 1)[1].split("```", 1)[0].strip()
                logger.info("从```json```块中提取JSON内容")
                json_content = json_block
            elif "```" in accumulated_text:
                # 尝试从任何代码块中提取JSON
                blocks = accumulated_text.split("```")
                for i in range(1, len(blocks), 2):
                    # 只处理奇数索引的块(代码块内容)
                    potential_json = blocks[i].strip()
                    # 如果块以json开头，移除它
                    if potential_json.startswith("json"):
                        potential_json = potential_json[4:].strip()
                    
                    try:
                        # 尝试解析为JSON
                        json.loads(potential_json)
                        json_content = potential_json
                        logger.info("从代码块中成功提取JSON内容")
                        break
                    except:
                        continue
            
            # 如果没有找到有效的JSON内容，尝试提取全文中的{...}
            if not json_content:
                # 查找第一个{和最后一个}之间的内容
                open_brace = accumulated_text.find("{")
                if open_brace != -1:
                    # 寻找匹配的最后一个大括号
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
                        logger.info("从文本中提取了可能的JSON内容")
            
            # 验证JSON
            if json_content:
                try:
                    json_obj = json.loads(json_content)
                    formatted_json = json.dumps(json_obj, indent=2)
                    logger.info("JSON验证成功")
                    
                    # 发送最终结果
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
                    logger.error(f"JSON解析失败: {str(json_error)}")
                    logger.error(f"收到的内容: {accumulated_text[:500]}...")
                    yield json.dumps({
                        "type": "error",
                        "error": f"无法解析模型生成的JSON: {str(json_error)}"
                    })
            else:
                # 如果无法提取有效的JSON，返回原始文本
                logger.warning("无法提取有效的JSON，返回原始响应")
                yield json.dumps({
                    "type": "final",
                    "message": "Generated response without valid JSON structure",
                    "floor_plan": json.dumps({"raw_response": accumulated_text})
                })
    
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f"生成平面图时发生错误: {str(e)}\n{error_detail}")
        error_message = f"Error generating floor plan: {str(e)}"
        yield json.dumps({"error": error_message}) 