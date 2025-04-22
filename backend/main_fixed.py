import os
import logging
from flask import Flask
from flask_cors import CORS
import re

# 确保环境变量在导入应用之前被设置
def setup_env():
    """从.env文件加载环境变量"""
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    env_path = os.path.join(os.getcwd(), '.env')
    logger.info(f"尝试从以下路径加载.env文件: {env_path}")
    
    if os.path.exists(env_path):
        try:
            with open(env_path, 'r') as f:
                content = f.read()
                # 解析每一行的环境变量
                for line in content.split('\n'):
                    line = line.strip()
                    if line and not line.startswith('#'):
                        # 简单的环境变量解析
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip()
                        # 设置环境变量
                        logger.info(f"设置环境变量: {key}")
                        os.environ[key] = value
            
            # 验证API密钥是否正确加载
            api_key = os.environ.get("OPENROUTER_API_KEY")
            if api_key:
                logger.info(f"成功加载API密钥: {api_key[:10]}...")
            else:
                logger.warning("未能加载API密钥!")
                
            return True
        except Exception as e:
            logger.error(f"加载.env文件失败: {str(e)}")
            return False
    else:
        logger.warning(f"找不到.env文件: {env_path}")
        return False

# 在导入应用之前设置环境变量
setup_env()

# 现在导入应用
from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True) 