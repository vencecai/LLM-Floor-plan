#!/bin/bash
# 后端服务启动脚本

# 检测操作系统类型
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows系统
    echo "检测到Windows系统"
    
    # 检查虚拟环境是否存在，否则创建
    if [ ! -d "venv" ]; then
        echo "创建虚拟环境..."
        python -m venv venv
    fi
    
    # 激活虚拟环境
    echo "激活虚拟环境..."
    source venv/Scripts/activate
    
    # 安装依赖
    echo "安装依赖..."
    pip install -r requirements.txt
    
    # 启动服务器
    echo "启动Flask服务器..."
    python main.py
else
    # Unix系统(Linux/macOS)
    echo "检测到Unix系统"
    
    # 检查虚拟环境是否存在，否则创建
    if [ ! -d "venv" ]; then
        echo "创建虚拟环境..."
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    echo "激活虚拟环境..."
    source venv/bin/activate
    
    # 安装依赖
    echo "安装依赖..."
    pip install -r requirements.txt
    
    # 启动服务器
    echo "启动Flask服务器..."
    python main.py
fi 