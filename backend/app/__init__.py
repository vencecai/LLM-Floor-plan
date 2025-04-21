from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)  # 启用跨域资源共享
    
    # 导入并注册蓝图
    from app.routes import api_bp
    app.register_blueprint(api_bp)
    
    return app 