// ================= 配置区域 =================
const CONFIG = {
    speed: 5, 
    shadowGain: 0.3,   
    shadowLoss: 0.5,   
    
    // 【关键】在这里定义每个阶段有多少帧动画
    // 假设你准备了 4 张图：name_1.png 到 name_4.png
    animFrames: 4, 
    animSpeed: 15, // 数字越小切换越快 (8 表示每 8 帧换一次图)

    stages: [
        { 
            scoreLimit: 2500, 
            charBaseName: 'baby', // 对应 baby_1.png, baby_2.png...
            bgImg: 'assets/bg/spring.jpg', 
            seasonName: "春·萌芽",
            type: 'crawl',
            story: [
                { img: 'assets/stories/spring_1.jpg', text: "第一声啼哭，世界充满了光。" },
                { img: 'assets/stories/spring_2.jpg', text: "嫩芽破土，好奇地打量着四周。" },
                { img: 'assets/stories/spring_3.jpg', text: "母亲的怀抱，是最初的港湾。" },
                { img: 'assets/stories/spring_4.jpg', text: "春天，是生命的开始。" }
            ]
        },
        { 
            scoreLimit: 2500, 
            charBaseName: 'child', // 对应 child_1.png...
            bgImg: 'assets/bg/summer.jpg', 
            seasonName: "夏·成长",
            type: 'walk',
            story: [
                { img: 'assets/stories/summer_1.jpg', text: "阳光炽热，我们在草地上奔跑。" },
                { img: 'assets/stories/summer_2.jpg', text: "汗水浸湿了衣背，却笑得最开心。" },
                { img: 'assets/stories/summer_3.jpg', text: "第一次跌倒，学会了坚强。" },
                { img: 'assets/stories/summer_4.jpg', text: "夏天，是热烈的成长。" }
            ]
        },
        { 
            scoreLimit: 2500, 
            charBaseName: 'teen', // 对应 teen_1.png...
            bgImg: 'assets/bg/autumn.jpg', 
            seasonName: "秋·思索",
            type: 'walk',
            story: [
                { img: 'assets/stories/autumn_1.jpg', text: "落叶纷飞，脚步变得沉稳。" },
                { img: 'assets/stories/autumn_2.jpg', text: "开始思考未来的方向，有些迷茫。" },
                { img: 'assets/stories/autumn_3.jpg', text: "但心中的火种，从未熄灭。" },
                { img: 'assets/stories/autumn_4.jpg', text: "秋天，是沉淀与思索。" }
            ]
        },
        { 
            scoreLimit: 999999, 
            charBaseName: 'teen', 
            bgImg: 'assets/bg/winter.jpg', 
            seasonName: "冬·沉淀",
            type: 'walk',
            story: [
                { img: 'assets/stories/winter_1.jpg', text: "世界安静下来，雪花覆盖了一切。" },
                { img: 'assets/stories/winter_2.jpg', text: "回首来路，每一步都算数。" },
                { img: 'assets/stories/winter_3.jpg', text: "等待下一个春天。" }
            ]
        }
    ]
};

// ================= 变量初始化 =================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 450;

let state = {
    isRunning: false,
    currentStageIndex: 0,
    distanceInStage: 0,
    
    // 动画状态
    animFrameIndex: 0,      // 当前显示第几帧 (0 ~ 3)
    animTimer: 0,           // 动画计时器
    verticalOffset: 0,      // 极微小的垂直浮动 (模拟重心)
    
    mode: 'running', 
    shadowLevel: 0.0,   
    facingRight: true,  
    gameOverTriggered: false,

    storyMode: {
        active: false,
        currentIndex: 0,
        phase: 'enter',
        scale: 0.5,
        opacity: 0,
        timer: 0
    }
};

const keys = { d: false, a: false };
let endGameStory = null; 

// 缓存所有动画帧图片
// 结构：charImages['baby'] = [img1, img2, img3, img4]
const charImages = {}; 
const bgImages = [];
const allStoryImages = {}; 

// 初始化加载图片
function initImages() {
    CONFIG.stages.forEach((s, index) => {
        // 1. 加载背景
        const bg = new Image();
        bg.src = s.bgImg;
        bgImages.push(bg);
        
        // 2. 加载故事图
        allStoryImages[index] = [];
        s.story.forEach((scene) => {
            const img = new Image();
            img.src = scene.img;
            allStoryImages[index].push(img);
        });

        // 3. 加载角色动画帧 (核心修改)
        if (!charImages[s.charBaseName]) {
            charImages[s.charBaseName] = [];
            for (let i = 1; i <= CONFIG.animFrames; i++) {
                const img = new Image();
                // 假设图片命名为 assets/chars/baby_1.png, baby_2.png ...
                img.src = `assets/chars/${s.charBaseName}_${i}.png`;
                charImages[s.charBaseName].push(img);
            }
        }
    });
    
    const endImg = new Image();
    endImg.src = 'assets/stories/winter_3.jpg';
    window.endImgGlobal = endImg; // 临时挂载
}
initImages();

// ================= 输入监听 =================
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD') {
        keys.d = true;
        state.facingRight = true;
        if (state.mode === 'running') state.isRunning = true;
    }
    if (e.code === 'KeyA') {
        keys.a = true;
        state.facingRight = false;
        if (state.mode === 'running') state.isRunning = true;
    }
    if (e.code === 'Space') {
        if (state.mode === 'story') nextStorySlide();
        else if (state.mode === 'gameover') resetGame();
    }
});

canvas.addEventListener('click', () => {
    if (state.mode === 'story') nextStorySlide();
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyD') {
        keys.d = false;
        if (!keys.a) state.isRunning = false;
    }
    if (e.code === 'KeyA') {
        keys.a = false;
        if (!keys.d) state.isRunning = false;
    }
});

// ================= 核心逻辑 =================

function startStoryMode() {
    state.mode = 'story';
    state.isRunning = false;
    state.storyMode.active = true;
    state.storyMode.currentIndex = 0;
    state.storyMode.phase = 'enter';
    state.storyMode.scale = 0.5;
    state.storyMode.opacity = 0;
}

function nextStorySlide() {
    const currentStageStories = CONFIG.stages[state.currentStageIndex].story;
    if (state.storyMode.phase === 'exit') return;

    if (state.storyMode.currentIndex < currentStageStories.length - 1) {
        state.storyMode.currentIndex++;
        state.storyMode.phase = 'hold';
        state.storyMode.scale = 0.95;
        setTimeout(() => { state.storyMode.scale = 0.9; }, 50);
    } else {
        state.storyMode.phase = 'exit';
    }
}

function finishStoryMode() {
    state.storyMode.active = false;
    state.storyMode.phase = 'enter';
    
    if (state.currentStageIndex < CONFIG.stages.length - 1) {
        state.currentStageIndex++;
        state.distanceInStage = 0;
        state.mode = 'running';
        state.isRunning = false;
        // 重置动画帧
        state.animFrameIndex = 0;
        state.animTimer = 0;
    } else {
        state.distanceInStage = 0;
        state.mode = 'running';
        state.isRunning = false;
        state.animFrameIndex = 0;
    }
}

function triggerGameOver() {
    if (state.gameOverTriggered) return;
    state.gameOverTriggered = true;
    state.mode = 'gameover';
    state.isRunning = false;
    endGameStory = {
        img: window.endImgGlobal,
        text: "阴影吞噬了一切。或许，回头才是出路。\\n(按空格键重新开始)",
        phase: 'enter',
        scale: 0.6,
        opacity: 0
    };
}

function resetGame() {
    state.shadowLevel = 0;
    state.distanceInStage = 0;
    state.currentStageIndex = 0;
    state.mode = 'running';
    state.gameOverTriggered = false;
    endGameStory = null;
    state.animFrameIndex = 0;
}

function update() {
    if (state.mode === 'running') {
        if (state.isRunning) {
            // 移动与阴影逻辑
            if (state.facingRight) {
                state.distanceInStage += CONFIG.speed;
                state.shadowLevel += CONFIG.shadowGain / 100;
            } else {
                state.distanceInStage -= (CONFIG.speed * 0.5);
                if(state.distanceInStage < 0) state.distanceInStage = 0;
                state.shadowLevel -= CONFIG.shadowLoss / 100;
            }
            
            if (state.shadowLevel > 1.0) { state.shadowLevel = 1.0; triggerGameOver(); }
            if (state.shadowLevel < 0.0) state.shadowLevel = 0.0;

            // 【核心】动画帧更新逻辑
            state.animTimer++;
            if (state.animTimer >= CONFIG.animSpeed) {
                state.animTimer = 0;
                state.animFrameIndex = (state.animFrameIndex + 1) % CONFIG.animFrames;
            }

            // 模拟真实重心的微小浮动 (不再是夸张的跳跃)
            // 爬行时浮动更小，走路时稍大
            const stageType = CONFIG.stages[state.currentStageIndex].type;
            const floatAmp = stageType === 'crawl' ? 3 : 6; 
            // 使用 sin 波，但幅度很小，主要靠换图来体现动作
            state.verticalOffset = Math.sin(state.animFrameIndex / CONFIG.animFrames * Math.PI * 2) * floatAmp;

            checkStageEnd();
        } else {
            // 站立不动时，重置到第一帧或保持静止
            // 这里选择保持最后一帧，或者慢慢回到第 0 帧
            state.verticalOffset = 0;
        }
        
    } else if (state.mode === 'story') {
        updateStoryAnimation();
    } else if (state.mode === 'gameover') {
        if (endGameStory) updateGenericAnim(endGameStory);
    }
}

function checkStageEnd() {
    const currentStage = CONFIG.stages[state.currentStageIndex];
    if (state.distanceInStage >= currentStage.scoreLimit) {
        startStoryMode();
    }
}

function updateStoryAnimation() {
    const sm = state.storyMode;
    if (sm.phase === 'enter') {
        sm.scale += 0.03; sm.opacity += 0.03;
        if (sm.scale >= 0.9) { sm.scale = 0.9; sm.phase = 'hold'; }
    } else if (sm.phase === 'exit') {
        sm.scale -= 0.03; sm.opacity -= 0.03;
        if (sm.opacity <= 0) finishStoryMode();
    }
}

function updateGenericAnim(anim) {
    if (anim.phase === 'enter') {
        anim.scale += 0.02; anim.opacity += 0.02;
        if (anim.scale >= 0.9) { anim.scale = 0.9; anim.phase = 'hold'; }
    }
}

// ================= 绘制函数 =================
function draw() {
    drawBackground();
    if (state.mode !== 'gameover' && state.mode !== 'story') {
        drawCharacter();
    }
    if (state.mode === 'story') drawStorySlider();
    if (state.mode === 'gameover') drawGenericStory(endGameStory);
    if (state.mode === 'running') drawUI();
}

function drawBackground() {
    const img = bgImages[state.currentStageIndex];
    if (!img || !img.complete) {
        ctx.fillStyle = "#333"; ctx.fillRect(0,0,canvas.width, canvas.height); return;
    }
    const w = img.width, h = img.height;
    let offset = state.distanceInStage % w;
    
    ctx.save();
    const brightness = 1 - (state.shadowLevel * 0.7); 
    const grayscale = state.shadowLevel * 0.8;        
    ctx.filter = `brightness(${brightness}) grayscale(${grayscale}) blur(${state.shadowLevel * 2}px)`;
    ctx.drawImage(img, -offset, 0, w, h);
    ctx.drawImage(img, w - offset, 0, w, h);
    ctx.restore();
    
    if (state.mode === 'running') {
        const limit = CONFIG.stages[state.currentStageIndex].scoreLimit;
        const pct = Math.min(1, state.distanceInStage / limit);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(50, canvas.height - 15, (canvas.width - 100) * pct, 4);
    }
}

function drawCharacter() {
    const x = 150;
    const baseY = canvas.height * 0.75;
    // 应用微小的重心浮动
    const y = baseY + state.verticalOffset;
    
    const stageType = CONFIG.stages[state.currentStageIndex].type;
    const charBaseName = CONFIG.stages[state.currentStageIndex].charBaseName;
    const frames = charImages[charBaseName];
    
    // 获取当前应该显示的帧图片
    let currentFrameImg = null;
    if (frames && frames[state.animFrameIndex] && frames[state.animFrameIndex].complete) {
        currentFrameImg = frames[state.animFrameIndex];
    }

    ctx.save();
    ctx.translate(x, y);

    if (!state.facingRight) ctx.scale(-1, 1);

    // 光影滤镜
    if (state.shadowLevel > 0.8) {
        ctx.filter = `brightness(${1 - state.shadowLevel * 0.5}) grayscale(1)`;
    } else if (state.shadowLevel < 0.2 && state.isRunning) {
        ctx.shadowColor = "rgba(255, 255, 200, 0.6)";
        ctx.shadowBlur = 15;
    }

    if (currentFrameImg) {
        // 【完美模式】绘制序列帧
        // 根据爬行/走路调整绘制尺寸和位置
        if (stageType === 'crawl') {
            // 爬行：贴地，宽一点
            ctx.drawImage(currentFrameImg, -45, -30, 90, 60);
        } else {
            // 走路：直立
            ctx.drawImage(currentFrameImg, -40, -80, 80, 80);
        }
    } else {
        // 【降级模式】如果没有准备好多张图，就画一个平滑移动的圆/椭圆，不再抽搐
        ctx.fillStyle = state.shadowLevel > 0.5 ? "#555" : "#FFD700";
        ctx.beginPath();
        if (stageType === 'crawl') {
            // 平滑蠕动
            const stretch = 1 + Math.sin(Date.now()/200)*0.1;
            ctx.ellipse(0, 0, 40 * stretch, 20, 0, 0, Math.PI*2);
        } else {
            // 平滑呼吸
            const breathe = 1 + Math.sin(Date.now()/200)*0.05;
            ctx.arc(0, -40, 30 * breathe, 0, Math.PI*2);
        }
        ctx.fill();
        // 提示开发者去准备图片
        if (state.isRunning && Date.now() % 60 < 30) {
            ctx.fillStyle = "red";
            ctx.font = "10px Arial";
            ctx.fillText("请准备 _1.png 等序列帧", -40, -60);
        }
    }
    
    ctx.restore();
}

function drawStorySlider() {
    const sm = state.storyMode;
    const stageIndex = state.currentStageIndex;
    const stories = CONFIG.stages[stageIndex].story;
    const currentScene = stories[sm.currentIndex];
    const imgObj = allStoryImages[stageIndex][sm.currentIndex];
    if (!currentScene) return;

    ctx.save();
    const centerX = canvas.width / 2, centerY = canvas.height / 2;
    const baseW = 500, baseH = 350;
    const w = baseW * sm.scale, h = baseH * sm.scale;
    
    ctx.globalAlpha = Math.max(0, sm.opacity);
    ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 20;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(centerX - w/2 - 5, centerY - h/2 - 5, w + 10, h + 50, 10);
    else ctx.rect(centerX - w/2 - 5, centerY - h/2 - 5, w + 10, h + 50);
    ctx.fill();
    
    if (imgObj && imgObj.complete) {
        ctx.save();
        ctx.beginPath();
        if(ctx.roundRect) ctx.roundRect(centerX - w/2, centerY - h/2, w, h * 0.75, 10);
        else ctx.rect(centerX - w/2, centerY - h/2, w, h * 0.75);
        ctx.clip();
        const imgRatio = imgObj.width / imgObj.height;
        const boxRatio = w / (h * 0.75);
        let drawW, drawH, drawX, drawY;
        if (imgRatio > boxRatio) {
            drawH = h * 0.75; drawW = drawH * imgRatio;
            drawX = centerX - drawW / 2; drawY = centerY - h/2;
        } else {
            drawW = w; drawH = drawW / imgRatio;
            drawX = centerX - w/2; drawY = centerY - h/2 + (h*0.75 - drawH)/2;
        }
        ctx.drawImage(imgObj, drawX, drawY, drawW, drawH);
        ctx.restore();
    }
    
    ctx.shadowColor = "transparent"; ctx.fillStyle = "#333";
    ctx.font = "bold 20px 'Microsoft YaHei'"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const textY = centerY + h * 0.5;
    const paragraphs = currentScene.text.split('\\n');
    let currentY = textY - ((paragraphs.length - 1) * 28) / 2;
    paragraphs.forEach(para => {
        const words = para.split(''); let line = ''; let lines = [];
        for(let n=0; n<words.length; n++) {
            let test = line + words[n];
            if(ctx.measureText(test).width > w - 40) { lines.push(line); line = words[n]; }
            else { line = test; }
        }
        lines.push(line);
        lines.forEach((l, i) => { ctx.font = "18px 'Microsoft YaHei'"; ctx.fillText(l, centerX, currentY + i * 24); });
        currentY += (lines.length) * 24 + 10;
    });

    ctx.fillStyle = "#888"; ctx.font = "14px Arial"; ctx.textAlign = "right";
    ctx.fillText(`${sm.currentIndex + 1} / ${stories.length}`, centerX + w/2 - 10, centerY + h/2 + 35);
    ctx.textAlign = "center"; ctx.fillStyle = "#666";
    ctx.fillText(sm.phase === 'exit' ? "即将继续..." : "按 [空格] 或 [点击] 下一页", centerX, centerY + h/2 + 15);
    ctx.restore();
}

function drawGenericStory(anim) {
    if (!anim) return;
    ctx.save();
    const centerX = canvas.width / 2, centerY = canvas.height / 2;
    const w = 500 * anim.scale, h = 350 * anim.scale;
    ctx.globalAlpha = Math.max(0, anim.opacity);
    ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 20;
    ctx.fillRect(centerX - w/2, centerY - h/2, w, h);
    if (anim.img && anim.img.complete) ctx.drawImage(anim.img, centerX - w/2, centerY - h/2, w, h * 0.7);
    ctx.fillStyle = "#333"; ctx.font = "18px Arial"; ctx.textAlign = "center";
    ctx.fillText(anim.text.replace('\\n', ' '), centerX, centerY + h * 0.6);
    ctx.restore();
}

function drawUI() {
    const stageName = CONFIG.stages[state.currentStageIndex].seasonName;
    const barWidth = 300, barHeight = 20, barX = (canvas.width - barWidth) / 2, barY = 20;
    ctx.fillStyle = "#222"; ctx.fillRect(barX, barY, barWidth, barHeight);
    const grad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    grad.addColorStop(0, "#00ff00"); grad.addColorStop(0.5, "#ffff00"); grad.addColorStop(1, "#ff0000");
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barWidth * state.shadowLevel, barHeight);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = "#fff"; ctx.font = "bold 16px Arial"; ctx.textAlign = "center";
    ctx.fillText(`阴影浓度：${Math.floor(state.shadowLevel * 100)}%`, barX + barWidth/2, barY + 14);
    ctx.fillStyle = "#aaa"; ctx.font = "14px Arial";
    ctx.fillText(stageName, barX + barWidth/2, barY - 10);
    let hint = state.facingRight ? "→ [D] 前行 (阴影增加)" : "← [A] 回头 (阴影消退)";
    ctx.fillStyle = "#fff"; ctx.textAlign = "right"; ctx.fillText(hint, canvas.width - 20, 40);
}

if (!ctx.roundRect) {
    ctx.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
        this.beginPath(); this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath(); return this;
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();
// ================= 移动端触摸支持 =================

// 获取按钮元素
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnAction = document.getElementById('btn-action');

// 通用触摸处理函数
function addTouchListeners(element, keyCode) {
    if (!element) return;

    // 触摸开始
    element.addEventListener('touchstart', (e) => {
        e.preventDefault(); // 防止默认行为（如滚动）
        simulateKeyDown(keyCode);
        element.style.background = "rgba(255, 255, 255, 0.5)";
    }, { passive: false });

    // 触摸结束
    element.addEventListener('touchend', (e) => {
        e.preventDefault();
        simulateKeyUp(keyCode);
        element.style.background = ""; // 恢复原色
    }, { passive: false });
    
    // 鼠标兼容（方便在电脑上测试按钮）
    element.addEventListener('mousedown', () => simulateKeyDown(keyCode));
    element.addEventListener('mouseup', () => simulateKeyUp(keyCode));
    element.addEventListener('mouseleave', () => simulateKeyUp(keyCode));
}

// 模拟键盘按下
function simulateKeyDown(code) {
    if (code === 'KeyA') {
        keys.a = true;
        state.facingRight = false;
        if (state.mode === 'running') state.isRunning = true;
        // 手动触发一次keydown事件（如果其他逻辑依赖事件）
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    } else if (code === 'KeyD') {
        keys.d = true;
        state.facingRight = true;
        if (state.mode === 'running') state.isRunning = true;
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    } else if (code === 'Space') {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    }
}

// 模拟键盘抬起
function simulateKeyUp(code) {
    if (code === 'KeyA') {
        keys.a = false;
        if (!keys.d) state.isRunning = false;
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
    } else if (code === 'KeyD') {
        keys.d = false;
        if (!keys.a) state.isRunning = false;
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
    }
}

// 绑定按钮
addTouchListeners(btnLeft, 'KeyA');
addTouchListeners(btnRight, 'KeyD');
addTouchListeners(btnAction, 'Space');

// 禁止手机浏览器默认的缩放和滚动行为（重要！）
document.addEventListener('touchmove', function(e) {
    e.preventDefault();
}, { passive: false });

// 自适应画布大小 (让游戏填满手机屏幕，但保持比例)
function resizeCanvas() {
    const canvas = document.getElementById('gameCanvas');
    const targetWidth = 800;
    const targetHeight = 450;
    
    let scale = Math.min(
        window.innerWidth / targetWidth,
        window.innerHeight / targetHeight
    );
    
    // 在手机上稍微留点边距，不要完全贴边
    if (window.innerWidth <= 800) {
        scale *= 0.95; 
    }

    canvas.style.width = (targetWidth * scale) + 'px';
    canvas.style.height = (targetHeight * scale) + 'px';
}

window.addEventListener('resize', resizeCanvas);
// 初始化时执行一次
resizeCanvas();