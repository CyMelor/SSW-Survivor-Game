// 游戏常量
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 720;
const PLAYER_RADIUS = 13;
const ENEMY_RADIUS = 8;
const BULLET_SIZE = 3;
const BULLET_SPEED = 10;
const PLAYER_SPEED = 5;
const ENEMY_SPEED = 1;
const SHOOTING_INTERVAL = 100;
const ENEMY_ATTACK_INTERVAL = 2000; // 2秒
const SPAWN_INTERVAL = 1000; // 1秒生成一个敌人

// 游戏状态常量
const GAME_STATE = {
    NOT_STARTED: 'not_started',
    RUNNING: 'running',
    PAUSED: 'paused'
};

// 获取画布和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 游戏状态
let player;
let enemies = [];
let bullets = [];
let score = 0;
let lastShotTime = 0;
let lastSpawnTime = 0;
let keys = {};
let gameState = GAME_STATE.NOT_STARTED;
let gameLoopId;
// 鼠标位置
let mouseX = CANVAS_WIDTH / 2;
let mouseY = CANVAS_HEIGHT / 2;

// 获取DOM元素
const scoreElement = document.getElementById('score');
const startButton = document.getElementById('startButton');
const gameStatusElement = document.getElementById('gameStatus');

// 玩家类
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = PLAYER_RADIUS;
        this.speed = PLAYER_SPEED;
    }

    update() {
        // 根据按键移动玩家
        if (keys['w'] || keys['W']) this.y = Math.max(this.radius, this.y - this.speed);
        if (keys['s'] || keys['S']) this.y = Math.min(CANVAS_HEIGHT - this.radius, this.y + this.speed);
        if (keys['a'] || keys['A']) this.x = Math.max(this.radius, this.x - this.speed);
        if (keys['d'] || keys['D']) this.x = Math.min(CANVAS_WIDTH - this.radius, this.x + this.speed);
    }

    draw() {
        ctx.fillStyle = '#32a9e0ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
    }

    shoot() {
        const now = Date.now();
        if (now - lastShotTime >= SHOOTING_INTERVAL) {
            lastShotTime = now;
            // 计算从玩家中心到鼠标中心的方向向量
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 归一化方向向量
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            
            // 向鼠标方向发射子弹
            bullets.push(new Bullet(this.x, this.y, normalizedDx, normalizedDy));
        }
    }
}

// 敌人类
class Enemy {
    constructor() {
        // 随机在画布边缘生成敌人
        const side = Math.floor(Math.random() * 4);
        if (side === 0) {
            this.x = Math.random() * CANVAS_WIDTH;
            this.y = -ENEMY_RADIUS;
        } else if (side === 1) {
            this.x = CANVAS_WIDTH + ENEMY_RADIUS;
            this.y = Math.random() * CANVAS_HEIGHT;
        } else if (side === 2) {
            this.x = Math.random() * CANVAS_WIDTH;
            this.y = CANVAS_HEIGHT + ENEMY_RADIUS;
        } else {
            this.x = -ENEMY_RADIUS;
            this.y = Math.random() * CANVAS_HEIGHT;
        }
        this.radius = ENEMY_RADIUS;
        this.speed = ENEMY_SPEED;
        this.lastAttackTime = Date.now();
    }

    update(player) {
        // 追踪玩家
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        // 攻击玩家
        const now = Date.now();
        if (now - this.lastAttackTime >= ENEMY_ATTACK_INTERVAL) {
            // 检查是否在攻击范围内（d = r1 + r2）
            const attackDistance = PLAYER_RADIUS + ENEMY_RADIUS;
            if (Math.abs(distance - attackDistance) < 5) { // 允许5像素误差
                this.lastAttackTime = now;
                score++;
                scoreElement.textContent = score;
            }
        }
    }

    draw() {
        ctx.fillStyle = '#d05555ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
    }
}

// 子弹类
class Bullet {
    constructor(x, y, dx, dy) {
        this.x = x;
        this.y = y;
        this.dx = dx * BULLET_SPEED;
        this.dy = dy * BULLET_SPEED;
        this.size = BULLET_SIZE;
        this.angle = Math.atan2(dy, dx);
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
    }

    draw() {
        ctx.fillStyle = '#ad5ebbff';
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
        ctx.restore();
    }

    isOutOfBounds() {
        return this.x < -this.size || this.x > CANVAS_WIDTH + this.size ||
               this.y < -this.size || this.y > CANVAS_HEIGHT + this.size;
    }
}

// 碰撞检测函数
function checkCollision(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < circle1.radius + circle2.radius;
}

// 初始化游戏
function init() {
    player = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    
    // 开始游戏循环
    if (!gameLoopId) {
        gameLoop();
    }
}

// 游戏循环
function gameLoop() {
    const now = Date.now();
    
    // 清除画布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 只有在游戏运行状态下才更新游戏逻辑
    if (gameState === GAME_STATE.RUNNING) {
        // 更新和绘制玩家
        player.update();
        player.draw();
        
        // 玩家自动射击
        player.shoot();
        
        // 生成新敌人
        if (now - lastSpawnTime >= SPAWN_INTERVAL) {
            lastSpawnTime = now;
            enemies.push(new Enemy());
        }
        
        // 更新和绘制敌人
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            enemy.update(player);
            enemy.draw();
        }
        
        // 更新和绘制子弹
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.update();
            bullet.draw();
            
            // 检查子弹是否超出边界
            if (bullet.isOutOfBounds()) {
                bullets.splice(i, 1);
                continue;
            }
            
            // 检查子弹是否击中敌人
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (checkCollision({x: bullet.x, y: bullet.y, radius: BULLET_SIZE}, enemy)) {
                    bullets.splice(i, 1);
                    enemies.splice(j, 1);
                    break;
                }
            }
        }
    } else {
        // 在非运行状态下，只绘制玩家和敌人，但不更新位置
        if (player) {
            player.draw();
        }
        
        for (const enemy of enemies) {
            enemy.draw();
        }
        
        for (const bullet of bullets) {
            bullet.draw();
        }
        
        // 显示游戏状态
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#00ffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (gameState === GAME_STATE.NOT_STARTED) {
            ctx.fillText('点击开始游戏', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        } else if (gameState === GAME_STATE.PAUSED) {
            ctx.fillText('游戏已暂停', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        }
    }
    
    // 继续游戏循环
    gameLoopId = requestAnimationFrame(gameLoop);
}

// 启动游戏
function startGame() {
    if (gameState === GAME_STATE.NOT_STARTED) {
        init();
    }
    gameState = GAME_STATE.RUNNING;
    updateGameStatus('游戏进行中');
    startButton.style.display = 'none';
}

// 暂停/继续游戏
function togglePause() {
    if (gameState === GAME_STATE.RUNNING) {
        gameState = GAME_STATE.PAUSED;
        updateGameStatus('游戏已暂停');
    } else if (gameState === GAME_STATE.PAUSED) {
        gameState = GAME_STATE.RUNNING;
        updateGameStatus('游戏进行中');
        // 更新时间戳，避免暂停后立即生成敌人或射击
        lastShotTime = Date.now();
        lastSpawnTime = Date.now();
    }
}

// 重启游戏
function restartGame() {
    // 停止当前游戏循环
    cancelAnimationFrame(gameLoopId);
    gameLoopId = null;
    
    // 重置游戏状态
    gameState = GAME_STATE.NOT_STARTED;
    score = 0;
    enemies = [];
    bullets = [];
    keys = {};
    lastShotTime = 0;
    lastSpawnTime = 0;
    
    // 更新DOM
    scoreElement.textContent = score;
    updateGameStatus('');
    startButton.style.display = 'block';
    startButton.textContent = '开始游戏';
    
    // 重新初始化玩家位置
    player = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    
    // 重新开始游戏循环
    gameLoop();
}

// 更新游戏状态显示
function updateGameStatus(status) {
    gameStatusElement.textContent = status;
}

// 页面加载完成后初始化游戏
window.addEventListener('load', () => {
    init();
    
    // 监听键盘事件
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        // 处理快捷键
        if (e.key === 'q' || e.key === 'Q') {
            togglePause();
        } else if (e.key === 'r' || e.key === 'R') {
            restartGame();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    // 监听鼠标移动事件
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });
    
    // 添加启动按钮事件监听
    startButton.addEventListener('click', startGame);
});
