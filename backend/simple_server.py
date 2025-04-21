from flask import Flask, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 加载环境变量
logger.info("加载环境变量...")
load_dotenv()

# 检查API密钥
api_key = os.environ.get("OPENROUTER_API_KEY")
logger.info(f"API密钥: {'已设置' if api_key else '未设置'}")
if api_key:
    logger.info(f"API密钥前10位: {api_key[:10]}...")

app = Flask(__name__)
CORS(app)

@app.route('/api/env-test', methods=['GET'])
def env_test():
    """测试环境变量是否在API请求中可用"""
    try:
        env_vars = {
            "OPENROUTER_API_KEY": os.environ.get("OPENROUTER_API_KEY", "未设置"),
            "FLASK_ENV": os.environ.get("FLASK_ENV", "未设置"),
            "FLASK_APP": os.environ.get("FLASK_APP", "未设置"),
        }
        
        # 只显示API密钥的一部分
        if env_vars["OPENROUTER_API_KEY"] != "未设置":
            api_key = env_vars["OPENROUTER_API_KEY"]
            env_vars["OPENROUTER_API_KEY"] = f"{api_key[:10]}...{api_key[-4:]}"
        
        return jsonify({
            "message": "环境变量状态",
            "environment": env_vars,
            "has_api_key": os.environ.get("OPENROUTER_API_KEY") is not None
        })
        
    except Exception as e:
        logger.error(f"处理请求时发生错误: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-mock', methods=['GET'])
def generate_mock():
    """返回模拟数据的API端点"""
    try:
        # 检查API密钥是否存在
        api_key = os.environ.get("OPENROUTER_API_KEY")
        has_api_key = api_key is not None
        
        return jsonify({
            "message": "模拟数据生成成功",
            "has_api_key": has_api_key,
            "api_key_prefix": api_key[:10] + "..." if has_api_key else None,
            "mock_data": {
                "example": "这是模拟数据"
            }
        })
        
    except Exception as e:
        logger.error(f"处理请求时发生错误: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("启动简单测试服务器在 http://127.0.0.1:5000")
    print("- 访问 /api/env-test 查看环境变量")
    print("- 访问 /api/generate-mock 测试模拟数据生成")
    app.run(host='0.0.0.0', port=5000, debug=True) 