from flask import Flask, send_from_directory
import os

app = Flask(__name__)

# 设置静态文件目录
@app.route('/html/<path:filename>')
def serve_html(filename):
    return send_from_directory('html', filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('js', filename)

# 主页重定向到游戏页面
@app.route('/')
def index():
    return send_from_directory('html', 'index.html')

if __name__ == '__main__':
    # 获取当前目录的绝对路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"游戏文件目录: {current_dir}")
    print("本地服务器启动成功！")
    print("访问地址: http://127.0.0.1:15000")
    print("按 Ctrl+C 停止服务器")
    app.run(debug=True, port=15000)
