@echo off
echo LLM Floor Plan Generator - 后端服务启动脚本

REM 检查虚拟环境是否存在，否则创建
if not exist venv (
    echo 创建虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
echo 激活虚拟环境...
call venv\Scripts\activate.bat

REM 安装依赖
echo 安装依赖...
pip install -r requirements.txt

REM 启动服务器
echo 启动Flask服务器...
python main.py

pause 