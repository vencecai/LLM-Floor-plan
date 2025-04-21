try:
    import flask
    print(f"Flask version: {flask.__version__}")
except ImportError:
    print("Flask not installed")

try:
    import werkzeug
    print(f"Werkzeug version: {werkzeug.__version__}")
except ImportError:
    print("Werkzeug not installed")

try:
    import openai
    print(f"OpenAI version: {openai.__version__}")
except ImportError:
    print("OpenAI not installed")

try:
    from dotenv import load_dotenv
    print("python-dotenv installed")
except ImportError:
    print("python-dotenv not installed")

import os

print("\n测试环境变量:")
api_key = os.environ.get("OPENROUTER_API_KEY")
print(f"API Key in env: {'Yes' if api_key else 'No'}")
if api_key:
    print(f"API Key starts with: {api_key[:10]}...")

print("\n完成检查") 