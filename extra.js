/* ---------- Asistente IA ---------- */

const KB = [
  [/separab/i, "Variables separables: si y' = f(t)·g(y), escribe \\(\\frac{dy}{g(y)}=f(t)dt\\) e integra ambos lados. Despeja y y usa la condición inicial para encontrar C."],
  [/factor integrante|lineal.*primer|primer.*lineal/i, "Para \\(y' + p(t)y=q(t)\\): el factor integrante es \\(\\mu(t)=e^{\\int p(t)dt}\\). Multiplica toda la ecuación por \\(\\mu\\), integra y despeja y."],
  [/caracter/i, "Para \\(ay''+by'+cy=0\\), plantea la ecuación característica \\(ar^2+br+c=0\\). Según sus raíces, construye la solución general."],
  [/resonan/i, "Hay resonancia cuando el forzamiento tiene la misma forma que una solución de la homogénea. En ese caso, multiplica la propuesta particular por t (o por una potencia mayor si es necesario)."],
  [/indetermin/i, "En coeficientes indeterminados, propone una solución particular con la misma forma que el término independiente y calcula sus coeficientes sustituyendo en la ecuación."],
  [/orden|grado/i, "El orden es la derivada de mayor orden que aparece. El grado es el exponente de esa derivada, siempre que la ecuación sea polinómica en las derivadas."],
  [/laplace/i, "La transformada de Laplace convierte la EDO en una ecuación algebraica. Por ejemplo: \\(\\mathcal{L}\\{y'\\}=sY(s)-y(0)\\). Luego despeja Y(s) y aplica la transformada inversa."],
  [/exact/i, "La ecuación \\(M(x,y)dx+N(x,y)dy=0\\) es exacta si \\(\\frac{\\partial M}{\\partial y}=\\frac{\\partial N}{\\partial x}\\). La solución se expresa como \\(F(x,y)=C\\)."]
];

let warned = false;
const chat = [];

// Renderizar las expresiones matemáticas con MathJax (espera a que cargue).
async function renderMath(element) {
  if (!element) return;

  try {
    // Si la IA devolvió las barras dobladas (\\[ en vez de \[), las corrige
    if (/\\\\[\[\(\]\)]/.test(element.textContent)) {
      element.textContent = element.textContent
        .replace(/\\\\\[/g, '\\[').replace(/\\\\\]/g, '\\]')
        .replace(/\\\\\(/g, '\\(').replace(/\\\\\)/g, '\\)');
    }

    // Si la página no incluye el script de MathJax, se agrega desde aquí
    if (!document.querySelector('script[src*="mathjax"]')) {
      window.MathJax = {
        tex: {
          inlineMath: [['\\(', '\\)']],
          displayMath: [['\\[', '\\]'], ['$$', '$$']]
        },
        options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] }
      };
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      document.head.appendChild(s);
    }

    // Espera hasta 15 s a que MathJax termine de cargar
    for (let i = 0; i < 150 && !(window.MathJax && window.MathJax.typesetPromise); i++) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (!(window.MathJax && window.MathJax.typesetPromise)) {
      console.warn('MathJax no cargó: revisa tu conexión a Internet.');
      return;
    }

    if (window.MathJax.startup && window.MathJax.startup.promise) {
      await window.MathJax.startup.promise;
    }
    window.MathJax.typesetClear([element]);
    await window.MathJax.typesetPromise([element]);
  } catch (error) {
    console.error('Error al renderizar las ecuaciones:', error);
  }
}

// Agregar mensajes al chat.
const addMsg = (text, who) => {
  const element = document.createElement('div');
  element.className = 'msg ' + who;
  element.textContent = text;

  $('chatLog').appendChild(element);
  $('chatLog').scrollTop = $('chatLog').scrollHeight;

  renderMath(element);

  return element;
};

// Respuestas locales del laboratorio.
function localAnswer(q) {
  if (
    q.length < 90 &&
    /^\s*(dame|ponme|genera|quiero|otro|nuevo|un)\b.*(ejercicio|practic)|^\s*(ejercicio|practicar)/i.test(q) &&
    !/['′=]/.test(q)
  ) {
    $('pLevel').value = /segundo|2\.?º|orden 2/i.test(q)
      ? '3'
      : /fuerza|forz|resonan|difícil/i.test(q)
        ? '4'
        : /constante|fuente/i.test(q)
          ? '2'
          : String(rint(1, 3));

    genEx();

    return {
      exercise: true,
      text: `Ejercicio para practicar:\n${cur.eq}\ncon ${cur.iv}\n\nPista: ${cur.hint}\n\nYa quedó cargado en la sección Práctica.`
    };
  }

  if (/^\s*(hola|buenas|hey|q puedo hacer|qué puedo hacer|ayuda|help)\b/i.test(q)) {
    return {
      text: `Hola. Soy el asistente de EDO LAB.

Puedo ayudarte a:
1. Resolver ecuaciones diferenciales paso a paso.
2. Explicar métodos de solución.
3. Generar ejercicios de práctica.
4. Resolver problemas con condiciones iniciales.
5. Explicar Laplace, ecuaciones exactas, separables y otros métodos.

Ejemplo:
\\[y''+3y'+2y=0\\]
Con condiciones:
\\[y(0)=1,\\quad y'(0)=0\\]`
    };
  }

  if (/['′]|=/.test(q)) {
    const dep = (q.match(/([A-Za-z])'/) || [, 'y'])[1];

    const iv = (
      q.match(new RegExp(dep + "'\\([^)]*\\)\\s*=\\s*[^,;]+", 'g')) || []
    ).join(', ');

    const eq = q
      .replace(new RegExp(dep + "'\\([^)]*\\)\\s*=\\s*[^,;]+[,;]?", 'g'), '')
      .replace(/^(resuelve|resolver|resuelva|calcula|halla|encuentra)\s*(la ecuación|el pvi|el problema)?\s*:?\s*/i, '')
      .replace(/\s*(,|;|\bcon\b|\by\b|\bsujeta a\b|\btal que\b)\s*$/i, '')
      .replace(/[,;.\s]+$/, '')
      .trim();

    try {
      const result = EDO.solve(eq, iv);

      if (result.ok) {
        const verified =
          `${EDO.plain(result.formula)}\n` +
          result.steps.map((step, index) =>
            `${index + 1}. ${step[0]}: ${EDO.plain(step[1])}`
          ).join('\n');

        return {
          text: 'Resuelto con el motor del laboratorio:\n' + verified,
          verified
        };
      }
    } catch (error) {
      console.warn('El motor local no pudo resolver la ecuación:', error);
    }
  }

  const match = KB.find(item => item[0].test(q));

  return {
    text: match
      ? match[1]
      : `Escribe una ecuación, por ejemplo:

\\[y''+3y'+2y=0\\]

Con condiciones iniciales:

\\[y(0)=1,\\quad y'(0)=0\\]

También puedes preguntarme por ecuaciones separables, factor integrante, ecuación característica, resonancia, coeficientes indeterminados, Laplace, exactas, orden y grado.`
  };
}

let busy = false;

// Enviar pregunta a la IA.
async function ask(q) {
  if (busy) return;

  addMsg(q, 'user');

  const local = localAnswer(q);

  if (local.exercise) {
    addMsg(local.text, 'bot');
    return;
  }

  busy = true;
  $('chatSend').disabled = true;

  const waiting = addMsg('Resolviendo…', 'bot');

  chat.push({
    role: 'user',
    content: q + (
      local.verified
        ? `\n\n[Resultado verificado por el motor del laboratorio]\n${local.verified}`
        : ''
    )
  });

  try {
    const response = await fetch('chat.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chat.slice(-10) })
    });

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error('chat.php no devolvió una respuesta JSON válida.');
    }

    if (!response.ok) {
      throw new Error(data.error || `Error HTTP ${response.status}`);
    }

    if (!data || typeof data.text !== 'string' || !data.text.trim()) {
      throw new Error(data?.error || 'El servidor no devolvió una solución.');
    }

    chat.push({ role: 'assistant', content: data.text });

    waiting.textContent = data.text;
    await renderMath(waiting);

  } catch (error) {
    chat.pop();

    waiting.textContent =
      local.text +
      (warned
        ? ''
        : `\n\n⚠ La IA no respondió: ${error.message}. Verifica que estés abriendo EDO LAB desde XAMPP y que chat.php tenga configurada la API key de Groq.`);

    warned = true;

    await renderMath(waiting);
    console.error('Error del asistente:', error);

  } finally {
    busy = false;
    $('chatSend').disabled = false;
    $('chatLog').scrollTop = $('chatLog').scrollHeight;
  }
}

// Resolver desde el botón de la ecuación.
$('askAI').onclick = () => {
  const equation = $('equationInput').value.trim();

  if (!equation) {
    return notice('Escribe una ecuación primero.', 1);
  }

  $('asistente').scrollIntoView({ behavior: 'smooth' });

  ask(`Resuelve paso a paso: ${equation} ${$('ivpInput').value}`);
};

// Enviar desde el formulario del chat (botón Enviar o tecla Enter).
$('chatForm').addEventListener('submit', event => {
  event.preventDefault();

  const input = $('chatInput');
  const question = input.value.trim();

  if (!question || busy) return;

  input.value = '';
  ask(question);
  input.focus();
});

// Mensaje inicial.
addMsg(
  'Hola, soy el asistente de EDO LAB. Escríbeme cualquier ejercicio y lo resolveré paso a paso.',
  'bot'
);

try {
  solveEngine();
} catch (error) {
  console.error(error);
}