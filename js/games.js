/* ===== 游戏模块（贪吃蛇 / 2048 / 扫雷） =====
 * 该脚本通过 <script data-pjax src="/js/games.js"> 引入，
 * pjax 导航时会重新执行，因此需保证可重入（不重复绑定全局监听）。 */

(function () {
  var wrap = document.getElementById('game-wrap');
  if (!wrap) return;                                    // 非游戏页直接返回
  if (wrap.getAttribute('data-games-init') === '1') return; // 防重复初始化
  wrap.setAttribute('data-games-init', '1');

  var ctrl = { activeTab: 'snake' };

  /* ---------- 标签切换 ---------- */
  function initTabs() {
    var tabs = document.querySelectorAll('.game-tab');
    var panels = {
      snake: document.getElementById('panel-snake'),
      '2048': document.getElementById('panel-2048'),
      minesweeper: document.getElementById('panel-minesweeper')
    };
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var key = tab.getAttribute('data-game');
        tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
        Object.keys(panels).forEach(function (k) { panels[k].hidden = (k !== key); });
        ctrl.activeTab = key;
        if (key !== 'snake' && ctrl.snake) ctrl.snake.pause();
      });
    });
  }

  /* ---------- 贪吃蛇 ---------- */
  function initSnake() {
    var canvas = document.getElementById('snake-canvas');
    var scoreEl = document.getElementById('snake-score');
    var startBtn = document.getElementById('snake-start');
    var panel = document.getElementById('panel-snake');
    var ctx = canvas.getContext('2d');
    var GRID = 20;
    var CELL = canvas.width / GRID;
    var snake, dir, nextDir, food, score, timer, running, dead;

    function placeFood() {
      var free = [];
      for (var x = 0; x < GRID; x++) {
        for (var y = 0; y < GRID; y++) {
          if (!snake.some(function (s) { return s.x === x && s.y === y; })) free.push({ x: x, y: y });
        }
      }
      food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
    }

    function reset() {
      snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      score = 0;
      running = false;
      dead = false;
      scoreEl.textContent = '0';
      clearInterval(timer);
      placeFood();
      draw();
    }

    function draw() {
      ctx.fillStyle = '#1b1b1b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (food) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(food.x * CELL + 1, food.y * CELL + 1, CELL - 2, CELL - 2);
      }
      snake.forEach(function (s, i) {
        ctx.fillStyle = i === 0 ? '#8bc34a' : '#689f38';
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      });
      if (!running && !dead) {
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('点击「开始」或按方向键', canvas.width / 2, canvas.height / 2);
      }
    }

    function hitsSelf(head) {
      for (var i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) return true;
      }
      return false;
    }

    function step() {
      if (!document.body.contains(canvas)) { pause(); return; } // 页面已切换则停止
      dir = nextDir;
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) return gameOver();
      if (hitsSelf(head)) return gameOver();
      snake.unshift(head);
      if (food && head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = String(score);
        placeFood();
      } else {
        snake.pop();
      }
      draw();
    }

    function gameOver() {
      pause();
      dead = true;
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillRect(0, canvas.height / 2 - 22, canvas.width, 44);
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('游戏结束，得分 ' + score, canvas.width / 2, canvas.height / 2 + 5);
      startBtn.textContent = '开始';
    }

    function start() {
      if (running) return;
      if (dead) reset();
      running = true;
      clearInterval(timer);
      timer = setInterval(step, 150);
      draw();
    }

    function pause() {
      running = false;
      clearInterval(timer);
    }

    function setDir(x, y) {
      if (x === -dir.x && y === -dir.y) return; // 禁止反向
      nextDir = { x: x, y: y };
    }

    function key(e) {
      if (panel.hidden) return;
      var k = e.keyCode || e.which;
      var map = {
        37: [-1, 0], 65: [-1, 0],
        38: [0, -1], 87: [0, -1],
        39: [1, 0], 68: [1, 0],
        40: [0, 1], 83: [0, 1]
      };
      if (map[k]) {
        e.preventDefault();
        setDir(map[k][0], map[k][1]);
        if (!running) start();
      }
    }

    startBtn.addEventListener('click', function () {
      if (running) { pause(); startBtn.textContent = '开始'; }
      else { start(); startBtn.textContent = '暂停'; }
    });

    document.querySelectorAll('#panel-snake .dpad-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        var d = map[btn.getAttribute('data-dir')];
        setDir(d[0], d[1]);
        if (!running) { start(); startBtn.textContent = '暂停'; }
      });
    });

    reset();
    return { key: key, pause: pause };
  }

  /* ---------- 2048 ---------- */
  function init2048() {
    var boardEl = document.getElementById('board2048');
    var scoreEl = document.getElementById('tfe-score');
    var newBtn = document.getElementById('tfe-new');
    var panel = document.getElementById('panel-2048');
    var board, score, over, cells;

    function buildGrid() {
      boardEl.innerHTML = '';
      cells = [];
      for (var i = 0; i < 16; i++) {
        var c = document.createElement('div');
        c.className = 'cell2048';
        boardEl.appendChild(c);
        cells.push(c);
      }
    }

    function render() {
      board.forEach(function (v, i) {
        var el = cells[i];
        el.textContent = v === 0 ? '' : String(v);
        el.className = 'cell2048' + (v === 0 ? '' : ' t' + (v <= 2048 ? v : 'super'));
      });
      scoreEl.textContent = String(score);
      boardEl.classList.toggle('over', over);
    }

    function emptyCells() {
      var arr = [];
      board.forEach(function (v, i) { if (v === 0) arr.push(i); });
      return arr;
    }

    function spawn() {
      var empty = emptyCells();
      if (!empty.length) return;
      board[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
    }

    function reset() {
      board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      score = 0;
      over = false;
      spawn();
      spawn();
      render();
    }

    function moveLeft(arr) {
      var moved = false, gained = 0, out = [];
      for (var r = 0; r < 4; r++) {
        var row = [arr[r * 4], arr[r * 4 + 1], arr[r * 4 + 2], arr[r * 4 + 3]];
        var filtered = row.filter(function (v) { return v !== 0; });
        var merged = [];
        for (var i = 0; i < filtered.length; i++) {
          if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
            var val = filtered[i] * 2;
            merged.push(val);
            gained += val;
            i++;
          } else {
            merged.push(filtered[i]);
          }
        }
        while (merged.length < 4) merged.push(0);
        for (var c = 0; c < 4; c++) {
          out[r * 4 + c] = merged[c];
          if (merged[c] !== row[c]) moved = true;
        }
      }
      return { out: out, moved: moved, gained: gained };
    }

    function transpose(a) {
      var n = [];
      for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) n[c * 4 + r] = a[r * 4 + c];
      return n;
    }

    function reverseRows(a) {
      var n = [];
      for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) n[r * 4 + (3 - c)] = a[r * 4 + c];
      return n;
    }

    function move(dir) {
      var src = board.slice();
      if (dir === 'right') src = reverseRows(src);
      else if (dir === 'up') src = transpose(src);
      else if (dir === 'down') src = reverseRows(transpose(src));
      var res = moveLeft(src);
      if (!res.moved) return false;
      score += res.gained;
      var out = res.out;
      if (dir === 'right') out = reverseRows(out);
      else if (dir === 'up') out = transpose(out);
      else if (dir === 'down') out = transpose(reverseRows(out));
      board = out;
      spawn();
      render();
      checkOver();
      return true;
    }

    function checkOver() {
      if (emptyCells().length > 0) return;
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
          var v = board[r * 4 + c];
          if (c < 3 && board[r * 4 + c + 1] === v) return;
          if (r < 3 && board[(r + 1) * 4 + c] === v) return;
        }
      }
      over = true;
      render();
    }

    function key(e) {
      if (panel.hidden || over) return;
      var k = e.keyCode || e.which;
      var dir;
      if (k === 37 || k === 65) dir = 'left';
      else if (k === 38 || k === 87) dir = 'up';
      else if (k === 39 || k === 68) dir = 'right';
      else if (k === 40 || k === 83) dir = 'down';
      else return;
      e.preventDefault();
      move(dir);
    }

    var tsx = 0, tsy = 0;
    boardEl.addEventListener('touchstart', function (e) {
      tsx = e.touches[0].clientX;
      tsy = e.touches[0].clientY;
    }, { passive: true });
    boardEl.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - tsx;
      var dy = e.changedTouches[0].clientY - tsy;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      var dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      move(dir);
    }, { passive: true });

    newBtn.addEventListener('click', reset);

    buildGrid();
    reset();
    return { key: key };
  }

  /* ---------- 扫雷 ---------- */
  function initMinesweeper() {
    var boardEl = document.getElementById('ms-board');
    var minesEl = document.getElementById('ms-mines');
    var resetBtn = document.getElementById('ms-reset');
    var flagBtn = document.getElementById('ms-flag');
    var ROWS = 9, COLS = 9, MINES = 10;
    var data, flagMode, dead, cells;

    function idx(r, c) { return r * COLS + c; }

    function build() {
      boardEl.innerHTML = '';
      cells = [];
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var el = document.createElement('button');
          el.type = 'button';
          el.className = 'ms-cell';
          el.dataset.r = r;
          el.dataset.c = c;
          boardEl.appendChild(el);
          cells.push(el);
        }
      }
    }

    function setMinesText(txt) { minesEl.textContent = txt; }

    function updateMines() {
      var flags = data.filter(function (x) { return x.flagged; }).length;
      setMinesText(String(MINES - flags));
    }

    function render() {
      cells.forEach(function (el) {
        var r = +el.dataset.r, c = +el.dataset.c;
        var d = data[idx(r, c)];
        el.className = 'ms-cell';
        el.textContent = '';
        if (d.revealed) {
          el.classList.add('revealed');
          if (d.mine) { el.classList.add('mine-boom'); el.textContent = '💣'; }
          else if (d.adj > 0) { el.classList.add('n' + d.adj); el.textContent = String(d.adj); }
        } else if (d.flagged) {
          el.classList.add('flagged');
          el.textContent = '🚩';
        }
      });
    }

    function reset() {
      flagMode = false;
      dead = false;
      flagBtn.textContent = '插旗模式：关';
      flagBtn.dataset.on = '0';
      data = [];
      for (var i = 0; i < ROWS * COLS; i++) data.push({ mine: false, revealed: false, flagged: false, adj: 0 });
      var placed = 0;
      while (placed < MINES) {
        var p = Math.floor(Math.random() * ROWS * COLS);
        if (!data[p].mine) { data[p].mine = true; placed++; }
      }
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (data[idx(r, c)].mine) continue;
          var n = 0;
          for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              var nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && data[idx(nr, nc)].mine) n++;
            }
          }
          data[idx(r, c)].adj = n;
        }
      }
      render();
      updateMines();
    }

    function reveal(r, c) {
      if (dead) return;
      var d = data[idx(r, c)];
      if (d.revealed || d.flagged) return;
      d.revealed = true;
      if (d.mine) {
        dead = true;
        data.forEach(function (x) { if (x.mine) x.revealed = true; });
        render();
        setMinesText('💥 失败');
        return;
      }
      if (d.adj === 0) {
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            var nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) reveal(nr, nc);
          }
        }
      }
      render();
      var won = data.every(function (x) { return x.mine || x.revealed; });
      if (won) { dead = true; setMinesText('🎉 胜利'); }
      else updateMines();
    }

    function toggleFlag(r, c) {
      if (dead) return;
      var d = data[idx(r, c)];
      if (d.revealed) return;
      d.flagged = !d.flagged;
      render();
      updateMines();
    }

    build();

    cells.forEach(function (el) {
      el.addEventListener('click', function () {
        var r = +el.dataset.r, c = +el.dataset.c;
        if (flagMode) toggleFlag(r, c); else reveal(r, c);
      });
      el.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        toggleFlag(+el.dataset.r, +el.dataset.c);
      });
    });

    flagBtn.addEventListener('click', function () {
      flagMode = !flagMode;
      flagBtn.textContent = flagMode ? '插旗模式：开' : '插旗模式：关';
      flagBtn.dataset.on = flagMode ? '1' : '0';
    });

    resetBtn.addEventListener('click', reset);

    reset();
    return {};
  }

  ctrl.snake = initSnake();
  ctrl.tfe = init2048();
  ctrl.mine = initMinesweeper();
  initTabs();

  window.__gamesCtrl = ctrl;

  if (!window.__gamesKeyBound) {
    window.__gamesKeyBound = true;
    document.addEventListener('keydown', function (e) {
      var c = window.__gamesCtrl;
      if (!c || !document.getElementById('game-wrap')) return;
      if (c.activeTab === 'snake' && c.snake) c.snake.key(e);
      else if (c.activeTab === '2048' && c.tfe) c.tfe.key(e);
    });
  }
})();
