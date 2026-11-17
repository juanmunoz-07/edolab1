/* EDO LAB · motor matemático (EDO lineales de coef. constantes, orden 1-2, con condiciones iniciales; numérico RK4 para el resto) */
(function () {
const M = math, T = (c, n = 0, k = 0, w = 0, s = 0) => ({ c, n, k, w, s });
const nice = x => { if (Math.abs(x) < 1e-10) return '0'; for (let d = 1; d <= 12; d++) { const v = x * d; if (Math.abs(v - Math.round(v)) < 1e-9) return d === 1 ? String(Math.round(v)) : `${Math.round(v)}/${d}`; } return String(+x.toFixed(4)); };
const polyStr = ts => { let o = ''; for (const [c, v] of ts) { if (Math.abs(c) < 1e-10) continue; const a = Math.abs(c), body = (v && Math.abs(a - 1) < 1e-9) ? v : nice(a) + v; o += o ? (c < 0 ? ' − ' : ' + ') + body : (c < 0 ? '−' : '') + body; } return o || '0'; };
const mn = s => s.replace(/-/g, '−');
const FUNCS = new Set(['sin', 'cos', 'tan', 'exp', 'log', 'sqrt', 'abs', 'atan', 'sinh', 'cosh', 'tanh']);
// Normaliza símbolos Unicode y nombres en español (sen, ln, √, ², −, ×, ·, ÷)
const norm = s => String(s).replace(/[−–—]/g, '-').replace(/[·×]/g, '*').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3').replace(/√/g, 'sqrt').replace(/\bsen\b/gi, 'sin').replace(/\bln\b/gi, 'log').replace(/\barctan\b/gi, 'atan').replace(/[′’]/g, "'").replace(/″/g, "''");
// Inserta '*' en productos implícitos con variables/paréntesis (t y, (t+1)(t-1), t sin(t)); no toca llamadas a funciones
const implicit = s => { const tk = s.match(/\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+|[A-Za-z_]\w*|\S/g) || []; let o = '';
  tk.forEach((t, i) => { const p = tk[i - 1]; if (p) { const pI = /^[A-Za-z_]/.test(p) && !FUNCS.has(p), pP = p === ')', nI = /^[A-Za-z_]/.test(t), nN = /^[\d.]/.test(t), nP = t === '('; if ((pI || pP) && (nI || nP || nN)) o += '*'; } o += t + ' '; }); return o.trim(); };
const compileExpr = src => { const c = M.compile(implicit(norm(src).replace(/(\d)\s*e(?=\^|\s|\(|$)/g, '$1*e'))); return v => c.evaluate(v); };
const hasT = n => { let f = false; n.traverse(x => { if (x.isSymbolNode && x.name === 't') f = true; }); return f; };
const mul = (A, B) => { if (!A || !B) return null; const o = []; for (const a of A) for (const b of B) { if (a.s && b.s) return null; o.push(T(a.c * b.c, a.n + b.n, a.k + b.k, a.s ? a.w : b.w, a.s || b.s)); } return o; };
const cat = (A, B) => A && B ? A.concat(B) : null;
const sc = (A, f) => A && A.map(a => T(a.c * f, a.n, a.k, a.w, a.s));
const lin = n => { const f0 = n.evaluate({ t: 0 }), f1 = n.evaluate({ t: 1 }), f2 = n.evaluate({ t: 2 }); return Math.abs(f2 - 2 * f1 + f0) < 1e-9 ? { k: f1 - f0, b: f0 } : null; };
function dec(n) { // descompone en términos c·t^n·e^(kt)·cos/sin(wt)
  if (!hasT(n)) return [T(n.evaluate({}))];
  if (n.isParenthesisNode) return dec(n.content);
  if (n.isSymbolNode) return [T(1, 1)];
  if (n.isOperatorNode) { const [a, b] = n.args; switch (n.fn) {
    case 'unaryMinus': return sc(dec(a), -1); case 'unaryPlus': return dec(a);
    case 'add': return cat(dec(a), dec(b)); case 'subtract': return cat(dec(a), sc(dec(b), -1));
    case 'multiply': return mul(dec(a), dec(b));
    case 'divide': return hasT(b) ? null : sc(dec(a), 1 / b.evaluate({}));
    case 'pow': { if (!hasT(b)) { const e = b.evaluate({}); return a.isSymbolNode && a.name === 't' && Number.isInteger(e) && e >= 0 ? [T(1, e)] : null; }
      if (a.isSymbolNode && a.name === 'e') { const l = lin(b); return l && [T(Math.exp(l.b), 0, l.k)]; } return null; } }
    return null; }
  if (n.isFunctionNode) { const nm = n.fn.name, l = n.args[0] && lin(n.args[0]); if (!l) return null;
    if (nm === 'exp') return [T(Math.exp(l.b), 0, l.k)];
    if (nm === 'sin' || nm === 'cos') { let w = l.k, p = l.b; if (Math.abs(w) < 1e-12) return [T(nm === 'sin' ? Math.sin(p) : Math.cos(p))];
      let sg = 1; if (w < 0) { w = -w; p = -p; if (nm === 'sin') sg = -1; }
      return nm === 'sin' ? [T(sg * Math.cos(p), 0, 0, w, 2), T(sg * Math.sin(p), 0, 0, w, 1)] : [T(Math.cos(p), 0, 0, w, 1), T(-Math.sin(p), 0, 0, w, 2)]; } }
  return null;
}
const ev = (L, t) => L.reduce((s, a) => s + a.c * Math.pow(t, a.n) * Math.exp(a.k * t) * (a.s === 1 ? Math.cos(a.w * t) : a.s === 2 ? Math.sin(a.w * t) : 1), 0);
const dv = L => { const o = []; for (const a of L) { if (a.n) o.push(T(a.c * a.n, a.n - 1, a.k, a.w, a.s)); if (a.k) o.push(T(a.c * a.k, a.n, a.k, a.w, a.s)); if (a.s === 1) o.push(T(-a.c * a.w, a.n, a.k, a.w, 2)); if (a.s === 2) o.push(T(a.c * a.w, a.n, a.k, a.w, 1)); } return o; };
const comb = L => { const m = {}; for (const a of L) { const key = [a.n, +a.k.toFixed(9), +a.w.toFixed(9), a.s].join('|'); if (m[key]) m[key].c += a.c; else m[key] = T(a.c, a.n, a.k, a.w, a.s); } return Object.values(m).filter(a => Math.abs(a.c) > 1e-10); };
function ft(a, x) { const c = Math.abs(a.c), f = [];
  if (a.n) f.push(a.n === 1 ? x : `${x}<sup>${a.n}</sup>`);
  if (a.k) { const kr = +a.k.toFixed(6); let kk = kr === 1 ? '' : kr === -1 ? '−' : mn(String(+a.k.toFixed(4))); f.push(`e<sup>${kk}${x}</sup>`); }
  if (a.s) { let w = +a.w.toFixed(6) === 1 ? '' : String(+a.w.toFixed(4)); f.push(`${a.s === 1 ? 'cos' : 'sin'}(${w}${x})`); }
  let co = (!f.length || Math.abs(c - 1) > 1e-9) ? nice(c) : ''; if (f.length && co.includes('/')) co = `(${co})`; return co + f.join('·'); }
const fl = (L, x = 't') => { L = comb(L); return !L.length ? '0' : L.map((a, i) => i ? ` ${a.c < 0 ? '−' : '+'} ${ft(a, x)}` : (a.c < 0 ? '−' : '') + ft(a, x)).join(''); };

function parse(src) {
  try {
    let s = norm(src).replace(/d\d?([A-Za-z])\/d[tx]\d?/g, (m0, v) => v + (/d2|\^2|2$/.test(m0) ? "''" : "'")).replace(/(\d)\s*e(?=\^|\s|\(|$)/g, '$1*e').replace(/\s+/g, ' ').trim();
    const m = s.match(/([A-Za-z])'/), dep = m ? m[1] : 'y', x = dep === 'x' ? 't' : (/\bx\b/.test(s) ? 'x' : 't');
    const rep = u => { u = u.replace(new RegExp(dep + "''", 'g'), ' (D2) ').replace(new RegExp(dep + "'", 'g'), ' (D1) ').replace(new RegExp('(?<![A-Za-z_])' + dep + '(?![A-Za-z_(])', 'g'), ' (D0) '); return x === 'x' ? u.replace(/(?<![A-Za-z_])x(?![A-Za-z_(])/g, ' t ') : u; };
    const [l, r] = s.split('=');
    const node = M.parse(implicit(`(${rep(l)})-(${rep(r === undefined ? '0' : r)})`)), code = node.compile();
    let order = 0, any = false; node.traverse(n => { if (n.isSymbolNode && /^D[012]$/.test(n.name)) { any = true; order = Math.max(order, +n.name[1]); } });
    if (!any || order === 0) return null;
    return { dep, x, node, order, F: (t, a, b, c) => code.evaluate({ t, D0: a, D1: b, D2: c }) };
  } catch (e) { return null; }
}
function ivpParse(str, dep) { const o = {}; if (!str) return o; const s = norm(str), re = new RegExp(dep + "('*)\\(\\s*([^)]+?)\\s*\\)\\s*=\\s*([^,;]+)", 'g'); let m;
  while ((m = re.exec(s))) { try { o.t0 = M.evaluate(m[2]); o[m[1].length] = M.evaluate(m[3]); } catch (e) {} } return o; }

function analyze(p) {
  const F = p.F, ts = [0.3, 1.1, 2.2], rn = [[0.7, -1.3, 0.9], [1.9, 0.4, -2.1], [-0.8, 2.2, 1.4]], co = [[], [], []], g0 = []; let linear = true;
  for (const t of ts) { const f0 = F(t, 0, 0, 0); g0.push(f0); const a = [0, 1, 2].map(k => { const v = [0, 0, 0]; v[k] = 1; return F(t, ...v) - f0; }); a.forEach((v, k) => co[k].push(v));
    for (const r of rn) { const pr = f0 + r[0] * a[0] + r[1] * a[1] + r[2] * a[2]; if (!(Math.abs(F(t, ...r) - pr) <= 1e-7 * (1 + Math.abs(pr)))) linear = false; } }
  const constCoef = linear && co.every(c => c.every(v => Math.abs(v - c[0]) < 1e-9));
  const homog = g0.every(v => Math.abs(v) < 1e-9), auto = Math.abs(F(0.5, 1.2, 0.7, -0.4) - F(3, 1.2, 0.7, -0.4)) < 1e-9;
  let separable = false;
  if (p.order === 1) { const f = (t, y) => -F(t, y, 0, 0) / (F(t, y, 1, 0) - F(t, y, 0, 0)); const q = [[0.4, 1.1, 1.7, 0.6], [1.3, 0.5, 0.9, 1.6]]; separable = q.every(([t1, t2, y1, y2]) => { const A = f(t1, y1) * f(t2, y2), B = f(t1, y2) * f(t2, y1); return Math.abs(A - B) < 1e-7 * (1 + Math.abs(A)); }); }
  let degree = null; { const o = p.order, g = d => { const v = [0.9, 0.6, -0.4]; v[o] = d; return F(0.7, ...v); }, y = [0, 1, 2, 3, 4, 5, 6].map(g), sc = 1 + Math.max(...y.map(Math.abs)); let dd = y;
  for (let k = 1; k <= 6 && degree === null; k++) { dd = dd.slice(1).map((v, i) => v - dd[i]); if (dd.every(v => Math.abs(v) < 1e-8 * sc)) degree = k - 1; } if (degree === 0) degree = null; }
  return { linear, constCoef, homog, auto, separable, degree, a: [co[0][0], co[1][0], co[2][0]] };
}
function particular(a, b, c, tm) { // coeficientes indeterminados con exponentes complejos
  const lam = M.complex(tm.k, tm.s ? tm.w : 0), p0 = M.add(M.add(M.multiply(a, M.multiply(lam, lam)), M.multiply(b, lam)), c), q0 = p0, q1 = M.add(M.multiply(2 * a, lam), b), q2 = a, n = tm.n, ab = z => M.abs(z), u = Array(n + 3).fill(M.complex(0, 0)); let shift = 0;
  const rec = (A, B, Cc, sh) => { // resuelve A·u + B·u' + C·u'' = t^n
    for (let j = n; j >= 0; j--) { const t1 = M.multiply(B, M.multiply(j + 1, u[j + 1] || 0)), t2 = M.multiply(Cc, M.multiply((j + 2) * (j + 1), u[j + 2] || 0)); u[j + sh] = M.divide(M.subtract(j === n ? 1 : 0, M.add(t1, t2)), A); } };
  if (ab(q0) > 1e-9) rec(q0, q1, q2, 0);
  else if (ab(q1) > 1e-9) { shift = 1; const v = Array(n + 3).fill(M.complex(0, 0)); for (let j = n; j >= 0; j--) { const t1 = M.multiply(q2, M.multiply(j + 1, v[j + 1])); v[j] = M.divide(M.subtract(j === n ? 1 : 0, t1), q1); } for (let j = 0; j <= n; j++) u[j + 1] = M.divide(v[j], j + 1); }
  else { shift = 2; u[n + 2] = M.divide(1, M.multiply(q2, (n + 1) * (n + 2))); }
  const out = [];
  u.forEach((z, j) => { const re = M.re(z) * tm.c, im = M.im(z) * tm.c; if (!tm.s) out.push(T(re, j, tm.k)); else if (tm.s === 1) { out.push(T(re, j, tm.k, tm.w, 1), T(-im, j, tm.k, tm.w, 2)); } else { out.push(T(im, j, tm.k, tm.w, 1), T(re, j, tm.k, tm.w, 2)); } });
  return { terms: out, shift };
}
function solveConst(p, an, iv) {
  const [c0, c1, c2] = an.a, order = p.order, x = p.x, dep = p.dep, steps = [];
  const g = (() => { const n0 = p.node.transform(n => n.isSymbolNode && /^D[012]$/.test(n.name) ? new M.ConstantNode(0) : n); try { return sc(dec(n0), -1); } catch (e) { return null; } })();
  if (!g) return null;
  const G = comb(g), eqChar = polyStr(order === 2 ? [[c2, 'r²'], [c1, 'r'], [c0, '']] : [[c1, 'r'], [c0, '']]) + ' = 0';
  let B = [], caso = '';
  if (order === 2) { const d = c1 * c1 - 4 * c2 * c0, al = -c1 / (2 * c2);
    if (d > 1e-9) { const r1 = (-c1 + Math.sqrt(d)) / (2 * c2), r2 = (-c1 - Math.sqrt(d)) / (2 * c2); B = [[T(1, 0, r1)], [T(1, 0, r2)]]; caso = `Discriminante Δ = ${nice(d)} > 0: dos raíces reales distintas r₁ = ${nice(r1)}, r₂ = ${nice(r2)}.`; }
    else if (Math.abs(d) <= 1e-9) { B = [[T(1, 0, al)], [T(1, 1, al)]]; caso = `Δ = 0: raíz real doble r = ${nice(al)}. Se usan e^(rt) y t·e^(rt).`; }
    else { const be = Math.sqrt(-d) / (2 * c2); B = [[T(1, 0, al, be, 1)], [T(1, 0, al, be, 2)]]; caso = `Δ < 0: raíces complejas conjugadas r = ${nice(al)} ± ${nice(be)}i. Se usan e^(αt)cos(βt) y e^(αt)sin(βt).`; } }
  else { const r = -c0 / c1; B = [[T(1, 0, r)]]; caso = `Raíz r = ${nice(r)}.`; }
  let yp = [], shiftMax = 0; if (G.length) for (const tm of G) { const r = particular(c2, c1, c0, tm); yp = yp.concat(r.terms); shiftMax = Math.max(shiftMax, r.shift); } yp = comb(yp);
  const Cs = B.map((_, i) => `C${'₁₂'[i]}`), cf = b => { const t = ft(b[0], x); return t === '1' ? '' : t; }, yh = B.map((b, i) => Cs[i] + cf(b)).join(' + ');
  const gen = yh + (yp.length ? ` + ${fl(yp, x)}` : '');
  let sol = B.map(b => b), consts = null, res = [...B.map((b, i) => b)], notes = '';
  const ivs = iv, t0 = ivs.t0 ?? 0;
  if (ivs[0] !== undefined && (order === 1 || ivs[1] !== undefined)) {
    const A = order === 1 ? [[ev(B[0], t0)]] : [[ev(B[0], t0), ev(B[1], t0)], [ev(dv(B[0]), t0), ev(dv(B[1]), t0)]];
    const rhs = order === 1 ? [ivs[0] - ev(yp, t0)] : [ivs[0] - ev(yp, t0), ivs[1] - ev(dv(yp), t0)];
    try { consts = M.lusolve(A, rhs).map(r => r[0]); } catch (e) { consts = null; } }
  let fin; if (consts) { fin = comb(B.flatMap((b, i) => sc(b, consts[i])).concat(yp)); } else fin = comb(B.map(b => b[0]).concat(yp));
  const formula = consts ? `${dep}(${x}) = ${fl(fin, x)}` : `${dep}(${x}) = ${gen}`;
  steps.push(['Identifica el tipo', `EDO lineal de orden ${order} con coeficientes constantes, ${an.homog ? 'homogénea' : 'no homogénea'}.`]);
  steps.push(['Ecuación característica', `Sustituye y = e<sup>rt</sup>: ${eqChar}`]);
  steps.push(['Raíces y caso', caso]);
  steps.push(['Solución homogénea', `${dep}<sub>h</sub>(${x}) = ${yh}`]);
  if (G.length) steps.push(['Solución particular', `Forzamiento g(${x}) = ${fl(G, x)}. Coeficientes indeterminados${shiftMax ? ` (hay resonancia: la forma se multiplica por ${x}<sup>${shiftMax}</sup>)` : ''}: ${dep}<sub>p</sub>(${x}) = ${fl(yp, x)}`]);
  steps.push(['Solución general', `${dep}(${x}) = ${gen}`]);
  if (consts) steps.push(['Condiciones iniciales', `Al imponerlas se obtiene ${Cs.map((c, i) => `${c} = ${nice(consts[i])}`).join(', ')}. Solución particular: ${dep}(${x}) = ${fl(fin, x)}`]);
  else steps.push(['Condiciones iniciales', 'Escribe condiciones como y(0)=1, y\'(0)=0 para obtener las constantes.']);
  // verificación
  const y1 = dv(fin), y2 = dv(y1); let mx = 0; for (const t of [0.2, 0.9, 1.7]) mx = Math.max(mx, Math.abs(p.F(t, ev(fin, t), ev(y1, t), ev(y2, t))));
  steps.push(['Verificación', `Al sustituir la solución en la ecuación el residuo máximo es ${mx.toExponential(1)} ${mx < 1e-6 ? '✓' : '(revisa)'}.`]);
  return { formula, steps, fn: t => ev(fin, t), kind: 'Solución analítica', consts: !!consts, t0 };
}
function rk4(p, iv) {
  const F = p.F, t0 = iv.t0 ?? 0, h = 0.01, N = 2000, o = p.order;
  const f = (t, s) => o === 1 ? [-F(t, s[0], 0, 0) / (F(t, s[0], 1, 0) - F(t, s[0], 0, 0))] : [s[1], -F(t, s[0], s[1], 0) / (F(t, s[0], s[1], 1) - F(t, s[0], s[1], 0))];
  let s = o === 1 ? [iv[0] ?? 1] : [iv[0] ?? 1, iv[1] ?? 0], t = t0; const Y = [s[0]];
  for (let i = 0; i < N; i++) { const k1 = f(t, s), k2 = f(t + h / 2, s.map((v, j) => v + h / 2 * k1[j])), k3 = f(t + h / 2, s.map((v, j) => v + h / 2 * k2[j])), k4 = f(t + h, s.map((v, j) => v + h * k3[j])); s = s.map((v, j) => v + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); t += h; if (!s.every(v => isFinite(v) && Math.abs(v) < 1e12)) break; Y.push(s[0]); }
  return tt => { const u = (tt - t0) / h; if (u < 0) return Y[0]; if (u > Y.length - 1 + 1e-9) return NaN; const i = Math.min(Y.length - 2, Math.floor(u)); return Y.length < 2 ? Y[0] : Y[i] + (Y[i + 1] - Y[i]) * (u - i); };
}
function trendOf(fn, t0 = 0) { let ch = 0, prev = 0, last = t0;
  for (let t = t0; t < t0 + 5; t += 0.05) { const a = fn(t), b = fn(t + 0.05); if (!isFinite(a) || !isFinite(b)) break; last = t + 0.05; const d = b - a; if (prev && Math.sign(d) !== Math.sign(prev) && Math.abs(d) > 1e-9) ch++; if (Math.abs(d) > 1e-9) prev = d; }
  if (last < t0 + 4.9) return 'Explota en tiempo finito';
  if (ch >= 2) return 'Oscilatoria'; const a = fn(t0), b = fn(t0 + 5); return Math.abs(b - a) < 1e-3 * (1 + Math.abs(a)) ? 'Constante' : b > a ? 'Creciente' : 'Decreciente'; }
function solveInner(src, ivStr) {
  if (/'{3,}|‴/.test(src)) return { ok: false, msg: 'El motor local resuelve ecuaciones de orden 1 y 2. Para esta ecuación usa el botón «Resolver con la IA ✧».' };
  const p = parse(src); if (!p) return { ok: false, msg: 'No pude interpretar la ecuación con el motor local. Revisa la escritura (ej. y\'\' + 3y\' + 2y = e^t) o usa el botón «Resolver con la IA ✧».' };
  if (p.order > 2) return { ok: false, msg: 'El motor local resuelve ecuaciones de orden 1 y 2. Para esta ecuación usa el botón «Resolver con la IA ✧».' };
  const an = analyze(p), iv = ivpParse(ivStr, p.dep), cl = [`ORDEN ${p.order}`, 'GRADO 1', an.linear ? 'LINEAL' : 'NO LINEAL'];
  if (an.linear) cl.push(an.homog ? 'HOMOGÉNEA' : 'NO HOMOGÉNEA'); if (an.constCoef) cl.push('COEF. CONSTANTES'); if (an.auto) cl.push('AUTÓNOMA'); if (an.separable) cl.push('SEPARABLE');
  cl[1] = an.degree ? 'GRADO ' + an.degree : 'GRADO NO DEFINIDO';
  let r = an.constCoef ? solveConst(p, an, iv) : null;
  if (r) return { ok: true, ...r, t0: iv.t0 ?? 0, classif: cl, order: p.order, trend: trendOf(r.fn, iv.t0 ?? 0), notice: r.consts ? 'Solución particular calculada y verificada por el motor.' : 'Solución general calculada. La gráfica usa C₁ = C₂ = 1 (agrega condiciones iniciales para la solución particular).', analytic: true };
  const fn = rk4(p, iv), sug = an.separable ? 'Variables separables: ∫dy/g(y) = ∫f(t)dt.' : (an.linear && p.order === 1 ? 'Lineal de 1.er orden: factor integrante μ = e<sup>∫p dt</sup>.' : 'No hay método cerrado estándar para esta forma.');
  const used = `${p.dep}(${iv.t0 ?? 0}) = ${iv[0] ?? 1}${p.order === 2 ? `, ${p.dep}'(${iv.t0 ?? 0}) = ${iv[1] ?? 0}` : ''}`;
  return { ok: true, analytic: false, formula: `Solución numérica (RK4) con ${used}`, steps: [['Clasificación', cl.join(' · ')], ['Método sugerido', sug], ['Resolución numérica', 'Se despeja la derivada de mayor orden y se integra con Runge–Kutta de 4.º orden (paso 0.01, hasta t₀ + 20).'], ['Condiciones usadas', used + (iv[0] === undefined ? ' (por defecto; escribe las tuyas en el campo de condiciones)' : '')]], fn, t0: iv.t0 ?? 0, classif: cl, order: p.order, trend: trendOf(fn, iv.t0 ?? 0), notice: 'Esta EDO se resolvió numéricamente; la gráfica es la solución aproximada del PVI.' };
}
const solve = (s, i) => { try { return solveInner(s, i); } catch (err) { return { ok: false, msg: 'No pude resolver esa expresión con el motor local (' + String(err.message).split('\n')[0] + '). Prueba con el botón «Resolver con la IA».' }; } };
window.EDO = { solve, parse, analyze, ivpParse, compile: compileExpr, norm, plain: h => h.replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<sub>(.*?)<\/sub>/g, '_$1').replace(/<[^>]+>/g, '') };
})();
