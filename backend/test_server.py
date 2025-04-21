from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

@app.route('/api/generate-floor-plan', methods=['POST'])
def generate_floor_plan():
    """简化版API，返回模拟数据，不调用真实的LLM"""
    try:
        logger.info("收到生成平面图请求")
        data = request.get_json()
        
        if not data:
            logger.error("请求中没有数据")
            return jsonify({'error': 'Missing request data'}), 400
            
        # 提取输入
        boundary_data = data.get('boundary_data')
        description = data.get('description')
        
        if not boundary_data:
            logger.error("缺少边界数据")
            return jsonify({'error': 'Missing boundary data'}), 400
            
        if not description:
            logger.error("缺少描述文本")
            return jsonify({'error': 'Missing description text'}), 400
        
        logger.info(f"收到有效请求: 描述=\"{description[:30]}...\", 边界数据={len(boundary_data)}个形状")
        
        # 生成模拟的平面图数据
        mock_floor_plan = {
            "rooms": [
                {
                    "id": "room-1",
                    "name": "Living Room",
                    "type": "living_room",
                    "area": 25,
                    "adjacent_rooms": ["room-2", "room-3"]
                },
                {
                    "id": "room-2",
                    "name": "Kitchen",
                    "type": "kitchen",
                    "area": 15,
                    "adjacent_rooms": ["room-1"]
                },
                {
                    "id": "room-3",
                    "name": "Bedroom",
                    "type": "bedroom",
                    "area": 18,
                    "adjacent_rooms": ["room-1", "room-4"]
                },
                {
                    "id": "room-4",
                    "name": "Bathroom",
                    "type": "bathroom",
                    "area": 8,
                    "adjacent_rooms": ["room-3"]
                }
            ],
            "walls": [
                {
                    "id": "wall-1",
                    "start_point": [0, 0],
                    "end_point": [8, 0],
                    "room_ids": ["room-1", "room-3"]
                },
                {
                    "id": "wall-2",
                    "start_point": [8, 0],
                    "end_point": [8, 6],
                    "room_ids": ["room-2", "room-3"]
                },
                {
                    "id": "wall-3",
                    "start_point": [8, 6],
                    "end_point": [0, 6],
                    "room_ids": ["room-1", "room-4"]
                },
                {
                    "id": "wall-4",
                    "start_point": [0, 6],
                    "end_point": [0, 0],
                    "room_ids": ["room-1", "room-2"]
                }
            ],
            "openings": [
                {
                    "id": "opening-1",
                    "type": "door",
                    "wall_id": "wall-1",
                    "position": 0.5,
                    "width": 1.0
                },
                {
                    "id": "opening-2",
                    "type": "window",
                    "wall_id": "wall-2",
                    "position": 0.3,
                    "width": 1.5
                }
            ]
        }
        
        # 响应包含模拟数据
        mock_response = {
            "message": "Successfully generated floor plan",
            "floor_plan": json.dumps(mock_floor_plan),
            "boundary_data": boundary_data,
            "description": description
        }
        
        logger.info("成功生成模拟平面图数据")
        return jsonify(mock_response)
        
    except Exception as e:
        logger.error(f"处理请求时发生错误: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("启动测试服务器在 http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True) 