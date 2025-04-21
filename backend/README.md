# LLM Floor Plan Generator - Backend

这是LLM Floor Plan Generator应用的后端服务器。它使用Flask框架构建，用于接收前端传来的边界数据和描述，通过调用LLM生成平面图。

## 功能

- 接收前端传来的边界形状数据
- 处理用户的文本描述
- 通过OpenRouter API调用Claude模型生成平面图
- 返回结构化的平面图JSON数据

## 安装与设置

1. 创建并激活虚拟环境 (推荐使用conda或venv)

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

2. 安装依赖

```bash
pip install -r requirements.txt
```

3. 设置环境变量

复制`.env.example`文件并重命名为`.env`，然后填入你的OpenRouter API密钥：

```
OPENROUTER_API_KEY=your_key_here
```

## 运行服务器

开发模式下运行：

```bash
python main.py
```

或者使用Flask命令：

```bash
flask run
```

## API端点

### POST /api/generate-floor-plan

生成平面图的主要API端点。

**请求体格式**：

```json
{
  "boundary_data": [
    {
      "id": "shape-1",
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 400,
      "height": 300,
      "widthInUnits": 40,
      "heightInUnits": 30
    }
  ],
  "description": "我想要一个两室一厅的公寓，带有开放式厨房和一个阳台",
  "preferences": {
    "style": "modern",
    "prioritizeNaturalLight": true
  }
}
```

**响应格式**：

```json
{
  "message": "Successfully generated floor plan",
  "floor_plan": {
    "rooms": [
      {
        "id": "room-1",
        "name": "Living Room",
        "type": "living_room",
        "area": 15,
        "adjacent_rooms": ["room-2", "room-3"]
      },
      ...
    ],
    "walls": [...],
    "openings": [...]
  },
  "boundary_data": [...],
  "description": "我想要一个两室一厅的公寓，带有开放式厨房和一个阳台"
}
```

## 与前端集成

确保前端应用的API请求指向此后端服务器的地址。如果在本地运行，端点URL应为：`http://localhost:5000/api/generate-floor-plan`。 