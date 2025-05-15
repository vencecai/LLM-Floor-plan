@echo off
echo 正在安装必要的依赖...
pip install requests

echo.
echo 正在测试Web Core API连接...
python test_web_core_api.py

echo.
echo 按任意键退出...
pause > nul 