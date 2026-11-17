const $ = id => document.getElementById(id);
const examples = {
    decay: { equation: "y' + 2y = 0", formula: 'y(t) = Ce<sup>−2t</sup>', kind: 'Decrecimiento exponencial', order: 1, degree: 1, trend: 'Decreciente', fn: t => Math.exp(-2 * t), steps: [['Identifica el tipo', 'Es una EDO lineal, homogénea y de primer orden.'], ['Separa variables', 'dy/y = −2 dt'], ['Integra ambos lados', 'ln|y| = −2t + C₁'], ['Escribe la solución general', 'y(t) = Ce<sup>−2t</sup>']], classif: ['ORDEN 1', 'GRADO 1', 'LINEAL', 'HOMOGÉNEA'] },
    growth: { equation: "y' - 3y = 0", formula: 'y(t) = Ce<sup>3t</sup>', kind: 'Crecimiento exponencial', order: 1, degree: 1, trend: 'Creciente', fn: t => Math.exp(3 * t), steps: [['Identifica el tipo', 'Es una EDO lineal, homogénea y de primer orden.'], ['Separa variables', 'dy/y = 3 dt'], ['Integra ambos lados', 'ln|y| = 3t + C₁'], ['Escribe la solución general', 'y(t) = Ce<sup>3t</sup>']], classif: ['ORDEN 1', 'GRADO 1', 'LINEAL', 'HOMOGÉNEA'] },
    newton: { equation: "T' = -0.4(T - 22)", formula: 'T(t) = 22 + Ce<sup>−0.4t</sup>', kind: 'Enfriamiento hacia ambiente', order: 1, degree: 1, trend: 'Se acerca a 22', fn: t => 22 + 63 * Math.exp(-.4 * t), steps: [['Identifica el modelo', 'Es la ley de enfriamiento de Newton, una EDO lineal de primer orden.'], ['Separa la diferencia', 'dT/(T − 22) = −0.4 dt'], ['Integra', 'ln|T − 22| = −0.4t + C₁'], ['Solución general', 'T(t) = 22 + Ce<sup>−0.4t</sup>']], classif: ['ORDEN 1', 'GRADO 1', 'LINEAL', 'AUTÓNOMA'] },
    second: { equation: "y'' + 4y = 0", formula: 'y(t) = C₁ cos(2t) + C₂ sin(2t)', kind: 'Oscilación periódica', order: 2, degree: 1, trend: 'Oscilatoria', fn: t => Math.cos(2 * t), steps: [['Identifica el orden', 'La derivada de mayor orden es y″, por tanto es de segundo orden.'], ['Forma característica', 'r² + 4 = 0'], ['Calcula las raíces', 'r = ±2i, raíces complejas conjugadas.'], ['Solución general', 'y(t) = C₁ cos(2t) + C₂ sin(2t)']], classif: ['ORDEN 2', 'GRADO 1', 'LINEAL', 'HOMOGÉNEA'] }
}; let current = 'decay', chart = null, tMax = 5;

const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = v => !isFinite(v) ? '—' : Math.abs(v) >= 1e5 || (v !== 0 && Math.abs(v) < 1e-3) ? v.toExponential(2) : v.toFixed(2);
function drawChart(key) {
    const ex = examples[key], t0 = ex.t0 || 0, t1 = t0 + tMax, N = 400, points = [];
    for (let i = 0; i <= N; i++) { const t = t0 + (t1 - t0) * i / N; let y = ex.fn(t); if (!isFinite(y)) y = null; points.push({ x: t, y }); }
    if (chart) chart.destroy();
    const ctx = $('solutionChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: { datasets: [{ data: points, borderColor: '#7965d8', backgroundColor: 'rgba(153,134,231,.12)', borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 4, fill: true, tension: 0, spanGaps: false }] },
        options: {
            responsive: true, maintainAspectRatio: false, parsing: false, animation: { duration: 350 }, interaction: { mode: 'nearest', axis: 'x', intersect: false },
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#2f2b48', padding: 10, displayColors: false, callbacks: { title: c => 't = ' + c[0].parsed.x.toFixed(2), label: c => ' y(t) = ' + fmtNum(c.parsed.y) } } },
            scales: { x: { type: 'linear', min: t0, max: t1, grid: { color: '#f1f0f7', drawTicks: false }, border: { display: false }, ticks: { color: '#8c8aa0', font: { size: 11 }, maxTicksLimit: 8 }, title: { display: true, text: 'Tiempo (t)', color: '#8c8aa0', font: { size: 11 } } }, y: { grid: { color: '#f1f0f7', drawTicks: false }, border: { display: false }, ticks: { color: '#8c8aa0', font: { size: 11 }, maxTicksLimit: 6 }, title: { display: true, text: 'y(t)', color: '#8c8aa0', font: { size: 11 } } } }
        }
    });
    $('trendValue').textContent = ex.trend; $('initialValue').textContent = fmtNum(ex.fn(t0)); $('intervalValue').textContent = `${+t0.toFixed(2)} – ${+t1.toFixed(2)}`;
}
function render(key, note) {
    current = key; const ex = examples[key]; $('equationInput').value = ex.equation; if ($('exampleSelect').querySelector(`[value="${key}"]`)) $('exampleSelect').value = key;
    $('solutionFormula').innerHTML = ex.formula;
    $('solutionSteps').innerHTML = ex.steps.map((s, i) => `<div class="step"><span>${String(i + 1).padStart(2, '0')}</span><p><b>${s[0]}</b>${s[1]}</p></div>`).join('');
    $('classification').innerHTML = ex.classif.map(x => `<span>${x.replace(/ (\d)/, ' <b>$1</b>')}</span>`).join('');
    $('inputNotice').className = 'notice'; $('inputNotice').textContent = note || 'Modelo resuelto con su solución general y clasificación. La gráfica usa una constante ilustrativa C = 1.';
    $('chartNote').textContent = note || 'La gráfica usa la constante ilustrativa C = 1. Si defines condiciones iniciales, se dibuja la solución particular.';
    drawChart(key);
}
$('exampleSelect').addEventListener('change', e => loadExample(e.target.value));
$('solveBtn').addEventListener('click', () => solveEngine());
$('classifyBtn').addEventListener('click', () => classifyEngine());
$('clearEquation').addEventListener('click', () => { $('equationInput').value = ''; $('equationInput').focus(); });
$('resetChart').addEventListener('click', () => { $('tRange').value = '5'; tMax = 5; drawChart(current); });
$('tRange').addEventListener('change', e => { tMax = +e.target.value; drawChart(current); });
document.querySelectorAll('[data-example]').forEach(el => el.addEventListener('click', () => { $('ivpInput').value = ''; render(el.dataset.example); $('resolver').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));

/* ---- navegación: menú móvil, enlace activo y migas de pan ---- */
const sidebar = $('sidebar'), toggle = $('menuToggle'), overlay = $('overlay');
const setMenu = open => { sidebar.classList.toggle('open', open); overlay.classList.toggle('show', open); toggle.setAttribute('aria-expanded', open); };
toggle.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));
overlay.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));
const navLinks = [...document.querySelectorAll('.nav-item')];
const names = { overview: 'Panel general', resolver: 'Resolver ecuación', explorar: 'Explorador gráfico', biblioteca: 'Biblioteca de EDO', conceptos: 'Conceptos básicos', metodos: 'Métodos de solución', practica: 'Práctica', simulador: 'Simulador', asistente: 'Asistente IA' };
const setActive = id => { navLinks.forEach(n => n.classList.toggle('active', n.getAttribute('href') === '#' + id)); if (names[id]) $('crumbCurrent').textContent = names[id]; };
navLinks.forEach(a => a.addEventListener('click', () => { setMenu(false); setActive(a.getAttribute('href').slice(1)); }));
if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { const v = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setActive(v.target.id); }, { rootMargin: '-80px 0px -60% 0px' }); Object.keys(names).forEach(id => { const el = $(id); if (el) io.observe(el); }); }
render('decay');
