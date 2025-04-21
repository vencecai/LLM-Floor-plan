import os
import re
import json
from openai import OpenAI

def read_api_key_from_file():
    """直接从.env文件读取API密钥"""
    env_path = os.path.join(os.getcwd(), '.env')
    print(f"尝试读取API密钥从: {env_path}")
    
    try:
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                content = f.read()
                match = re.search(r'OPENROUTER_API_KEY=([^\s]+)', content)
                if match:
                    api_key = match.group(1).strip()
                    print(f"成功读取API密钥: {api_key[:10]}...")
                    return api_key
                else:
                    print("未在.env文件中找到API密钥")
    except Exception as e:
        print(f"读取.env文件失败: {str(e)}")
    
    return None

def test_openrouter_api():
    """测试OpenRouter API连接是否正常工作"""
    # 获取API密钥
    api_key = read_api_key_from_file()
    if not api_key:
        print("无法获取API密钥，请确保.env文件中包含OPENROUTER_API_KEY=xxx")
        return
    
    try:
        # 直接使用requests库调用API
        import requests
        
        print("使用requests库发送测试请求...")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://floorplan-generator.com", 
            "X-Title": "API Test"
        }
        
        payload = {
            "model": "anthropic/claude-3-sonnet-20240229",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that provides short answers."},
                {"role": "user", "content": "Hello, this is a test. Please reply with a very brief greeting."}
            ],
            "temperature": 0.2,
            "max_tokens": 50
        }
        
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload
        )
        
        # 输出响应
        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            print("\n成功获得API响应:")
            print(f"模型回复: \"{content}\"")
            print("\nAPI连接测试成功!")
        else:
            print(f"\nAPI请求失败，状态码: {response.status_code}")
            print(f"响应内容: {response.text}")
        
    except Exception as e:
        print(f"\nAPI测试失败: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    print("=== OpenRouter API 连接测试 ===")
    test_openrouter_api() 