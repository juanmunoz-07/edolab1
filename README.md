# EDO LAB · Ecuaciones diferenciales interactivas

Universidad Simón Bolívar · Ingeniería de Sistemas · Grupo T-06

## Cómo ejecutarlo
**Con Node (recomendado, Node 18+):**
1. Copia `.env.example` a `.env` y pega tu `ANTHROPIC_API_KEY` (solo el tutor IA la necesita).
2. `node server.js` → abre http://localhost:3000

**Con XAMPP / PHP:** copia la carpeta a `htdocs`, define `ANTHROPIC_API_KEY` o edita `chat.php`.

Sin API key todo funciona (motor matemático, gráficas, práctica, simulador); solo el tutor IA responde con ayuda local.
Necesita Internet para cargar Chart.js y math.js (CDN con respaldo automático).

## Qué resuelve el motor local
- EDO lineales de orden 1 y 2 con coeficientes constantes y término forzante (polinomios, exponenciales, seno/coseno y productos): solución general, particular con condiciones iniciales, pasos y verificación automática.
- Cualquier otra EDO de orden 1–2: solución numérica RK4 con clasificación (orden, grado, linealidad, autónoma, separable).
- Escritura flexible: `y' = t y`, `dy/dt + 3y = 9`, `sen`, `ln`, `e^(−t)`, `−`, `·`, `y′`.

## Archivos
`index.html`, `styles.css`, `extra.css` (interfaz) · `script.js`, `extra.js` (interfaz y lógica) · `engine.js` (motor matemático) · `server.js` / `chat.php` (proxy seguro hacia la IA) · `prompt.txt` (instrucciones del tutor).
