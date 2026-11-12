(function () {
    const canvas = document.getElementById('network-bg');
    const ctx = canvas.getContext('2d');

    const SPEED = 0.3;
    const NODE_COLOR = 'rgba(31, 150, 206,';
    const LINE_COLOR = 'rgba(31, 150, 206,';

    // Reference values calibrated at 1920x1080
    const REF_AREA = 1920 * 1080;
    const REF_NODES = 70;
    const REF_DIST = 230;

    let nodes = [];
    let maxDist = REF_DIST;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function initNodes() {
        const scale = (canvas.width * canvas.height) / REF_AREA;
        const count = Math.min(250, Math.max(70, Math.round(REF_NODES * scale)));
        maxDist = REF_DIST * Math.sqrt(scale);
        nodes = [];
        for (let i = 0; i < count; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * SPEED,
                vy: (Math.random() - 0.5) * SPEED,
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            for (let j = i + 1; j < nodes.length; j++) {
                const b = nodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.25;
                    ctx.beginPath();
                    ctx.strokeStyle = LINE_COLOR + alpha + ')';
                    ctx.lineWidth = 1;
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }

        for (const node of nodes) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = NODE_COLOR + '0.5)';
            ctx.fill();
        }
    }

    function update() {
        for (const node of nodes) {
            node.x += node.vx;
            node.y += node.vy;
            if (node.x < 0) { node.x = 0; node.vx = Math.abs(node.vx); }
            else if (node.x > canvas.width) { node.x = canvas.width; node.vx = -Math.abs(node.vx); }
            if (node.y < 0) { node.y = 0; node.vy = Math.abs(node.vy); }
            else if (node.y > canvas.height) { node.y = canvas.height; node.vy = -Math.abs(node.vy); }
        }
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    window.addEventListener('resize', () => {
        const prevWidth = canvas.width;
        resize();
        if (Math.abs(canvas.width - prevWidth) > 50) {
            initNodes();
        }
    });
    resize();
    initNodes();
    loop();
})();
