#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import json
import sys

# Web Core API 地址
API_URL = "http://localhost:5294"
API_ENDPOINT = "/api/apartment"  # 固定使用apartment端点

# 示例JSON数据
sample_data = {
  "id": "apartment-1747263344225",
  "database": "default",
  "country": "US",
  "city": "Berkeley",
  "name": "Test Apartment",
  "split": {
    "name": "root",
    "area": 999.6231,
    "angle": 0,
    "final": False,
    "children": [
      {
        "name": "livingSpace",
        "area": 599.77,
        "angle": 0,
        "final": True,
        "children": []
      },
      {
        "name": "kitchenBathroom",
        "area": 399.85,
        "angle": 1.5708,
        "final": False,
        "children": [
          {
            "name": "kitchen",
            "area": 249.91,
            "angle": 1.5708,
            "final": True,
            "children": []
          },
          {
            "name": "bathroom",
            "area": 149.94,
            "angle": 1.5708,
            "final": True,
            "children": []
          }
        ]
      }
    ]
  }
}

def send_apartment_data():
    """向API发送apartment数据并返回结果"""
    full_url = f"{API_URL}{API_ENDPOINT}"
    print(f"发送POST请求到: {full_url}")
    
    # 准备请求头
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    try:
        # 发送POST请求
        response = requests.post(
            full_url, 
            data=json.dumps(sample_data), 
            headers=headers,
            timeout=10
        )
        
        print(f"状态码: {response.status_code}")
        
        # 检查响应状态
        if response.status_code >= 400:
            print(f"错误: 请求失败，状态码 {response.status_code}")
            print(f"错误详情: {response.text}")
            return None
        
        # 尝试解析JSON响应
        try:
            response_json = response.json()
            return response_json
        except json.JSONDecodeError:
            print(f"警告: 响应不是有效的JSON格式")
            print(f"响应内容: {response.text}")
            return response.text
        
    except requests.exceptions.RequestException as e:
        print(f"错误: {e}")
        return None

def main():
    # 允许从命令行指定不同的API URL
    global API_URL
    if len(sys.argv) > 1:
        API_URL = sys.argv[1]
    
    print("=== Web Core API 测试 ===")
    print(f"API URL: {API_URL}{API_ENDPOINT}")
    
    # 发送请求并获取响应
    print("\n正在发送apartment数据...")
    response = send_apartment_data()
    
    # 打印完整响应
    if response:
        print("\n=== API 响应 ===")
        if isinstance(response, dict):
            print(json.dumps(response, indent=2, ensure_ascii=False))
        else:
            print(response)
        
        # 如果响应包含数据字段，额外打印一些摘要信息
        if isinstance(response, dict) and 'data' in response and isinstance(response['data'], dict):
            apartment = response['data']
            print("\n=== Apartment 摘要 ===")
            print(f"ID: {apartment.get('id', 'unknown')}")
            print(f"名称: {apartment.get('name', 'unknown')}")
            
            if 'rooms' in apartment:
                print(f"\n房间数量: {len(apartment['rooms'])}")
                for i, room in enumerate(apartment['rooms']):
                    print(f"  {i+1}. {room.get('id', 'unnamed')}: {room.get('type', 'unknown')} ({room.get('area', 0)} 平方单位)")

if __name__ == "__main__":
    main() 