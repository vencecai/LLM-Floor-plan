import os
import sys
from pathlib import Path
from dotenv import load_dotenv, find_dotenv
import re

# 打印当前工作目录
print(f"当前工作目录: {os.getcwd()}")

# 构建.env文件的绝对路径
env_path = Path(os.getcwd()) / '.env'
print(f"尝试加载的.env文件路径: {env_path}")
print(f".env文件是否存在: {env_path.exists()}")

# 使用find_dotenv尝试定位.env文件
dotenv_path = find_dotenv()
print(f"find_dotenv找到的.env文件路径: {dotenv_path}")

# 如果文件存在，打印其内容
if env_path.exists():
    print("\n.env文件内容:")
    with open(env_path, 'r') as f:
        content = f.read()
        print(content)
        
        # 检查文件编码和特殊字符
        if '\ufeff' in content:
            print("警告: 文件包含BOM标记")
        
        # 检查行尾
        if '\r\n' in content:
            print("文件使用Windows行尾(CRLF)")
        elif '\n' in content:
            print("文件使用Unix行尾(LF)")
        
        # 检查API密钥格式
        api_key_match = re.search(r'OPENROUTER_API_KEY=(.+)', content)
        if api_key_match:
            api_key = api_key_match.group(1).strip()
            print(f"从文件内容解析的API密钥: {api_key[:10]}...{api_key[-4:]}")
            # 检查是否有不可见字符
            if not api_key.isprintable():
                print("警告: API密钥包含不可见字符")

# 尝试加载.env文件
print("\n方法1: 使用load_dotenv直接加载...")
load_dotenv(dotenv_path=env_path)

# 检查环境变量是否被成功加载
api_key = os.environ.get("OPENROUTER_API_KEY")
print(f"OPENROUTER_API_KEY环境变量值: {api_key[:10] + '...' + api_key[-4:] if api_key else '未设置'}")

# 检查其他环境变量
flask_env = os.environ.get("FLASK_ENV")
flask_app = os.environ.get("FLASK_APP")
print(f"FLASK_ENV环境变量值: {flask_env if flask_env else '未设置'}")
print(f"FLASK_APP环境变量值: {flask_app if flask_app else '未设置'}")

# 方法2: 手动解析和设置
print("\n方法2: 手动解析和设置环境变量...")
if env_path.exists():
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key, value = line.split('=', 1)
                print(f"设置环境变量: {key}={value[:5]}... (如果值太长)")
                os.environ[key] = value

# 再次检查环境变量
api_key = os.environ.get("OPENROUTER_API_KEY")
print(f"\n手动设置后OPENROUTER_API_KEY环境变量值: {api_key[:10] + '...' + api_key[-4:] if api_key else '未设置'}")

# 列出所有环境变量
print("\n所有以OPENROUTER开头的环境变量:")
for key, value in os.environ.items():
    if key.startswith("OPENROUTER"):
        print(f"{key}: {value[:10]}...{value[-4:] if len(value) > 14 else value}")

print("\n完成环境变量测试。") 