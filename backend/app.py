from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route('/api/save-local', methods=['POST'])
def save_to_local():
    try:
        data = request.json
        if not data or 'data' not in data or 'path' not in data:
            return jsonify({
                'success': False,
                'message': 'Invalid request data'
            }), 400

        # 确保目标目录存在
        save_path = data['path']
        if not os.path.exists(save_path):
            os.makedirs(save_path)

        # 生成文件名（使用时间戳）
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'floor_plan_{timestamp}.json'
        file_path = os.path.join(save_path, filename)

        # 将数据保存为JSON文件
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data['data'], f, indent=2, ensure_ascii=False)

        return jsonify({
            'success': True,
            'message': 'File saved successfully',
            'filePath': file_path
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to save file',
            'error': str(e)
        }), 500 