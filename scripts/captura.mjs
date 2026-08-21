/**
 * Captura pantallas de la app a un ancho concreto, emulando un móvil de verdad.
 *
 *   node scripts/captura.mjs /login 360
 *   node scripts/captura.mjs /atletas 360 --sesion correo@ejemplo.com
 *
 * POR QUÉ NO BASTA CON `--window-size`: macOS impone un ancho mínimo de ventana
 * (unos 500 px), así que Chrome ignora anchos menores y calcula el layout a 500
 * aunque la imagen salga recortada a 360. El resultado engaña: parece que el
 * contenido se desborda cuando en realidad se está viendo un trozo de una página
 * más ancha. Hay que forzar las métricas del dispositivo por el protocolo de
 * depuración, que es lo que hace este script.
 *
 * La definición de terminado del proyecto exige que funcione a 360 px. Esto es
 * lo que lo comprueba.
 */
import { execFile, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PUERTO = 9444;
const BASE = process.env.APP_URL ?? "http://localhost:3100";

const [ruta = "/login", anchoTxt = "360"] = process.argv.slice(2);
const ancho = Number(anchoTxt);
const alto = Number(process.env.ALTO ?? 780);
const salida = process.env.SALIDA ?? "capturas";

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdp(ws, id, method, params = {}) {
  return new Promise((res, rej) => {
    const h = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== id) return;
      ws.removeEventListener("message", h);
      if (m.error) rej(new Error(m.error.message));
      else res(m.result);
    };
    ws.addEventListener("message", h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  mkdirSync(salida, { recursive: true });

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--remote-debugging-port=${PUERTO}`,
      `--user-data-dir=/tmp/gioslab-captura-${Date.now()}`,
      "about:blank",
    ],
    { stdio: "ignore", detached: false },
  );

  try {
    // Esperar a que el puerto de depuración responda.
    let lista;
    for (let i = 0; i < 30; i++) {
      try {
        lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json();
        if (lista.some((t) => t.type === "page")) break;
      } catch {
        /* todavía arrancando */
      }
      await espera(300);
    }

    const pagina = lista.find((t) => t.type === "page");
    const ws = new WebSocket(pagina.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));

    await cdp(ws, 1, "Page.enable");
    // Lo que de verdad emula el móvil: sin esto, el layout se calcula al ancho
    // mínimo de la ventana del sistema, no al pedido.
    await cdp(ws, 2, "Emulation.setDeviceMetricsOverride", {
      width: ancho,
      height: alto,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await cdp(ws, 3, "Emulation.setTouchEmulationEnabled", { enabled: true });
    // TEMA=claro para ver el otro. Por defecto se captura en oscuro, que es lo
    // que verá la mayoría: es el tema por defecto del producto.
    await cdp(ws, 31, "Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: process.env.TEMA ?? "dark" }],
    });

    // Sesión opcional: rellena el formulario de acceso como lo haría una
    // persona. Es más lento que inyectar el token, pero no depende de cómo
    // supabase-js nombre su clave de almacenamiento, que puede cambiar.
    const correo = process.env.SESION;
    if (correo) {
      await cdp(ws, 40, "Page.navigate", { url: `${BASE}/login` });
      await espera(2500);
      await cdp(ws, 41, "Runtime.evaluate", {
        expression: `(() => {
          const poner = (sel, v) => {
            const el = document.querySelector(sel);
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, "value").set;
            setter.call(el, v);
            el.dispatchEvent(new Event("input", { bubbles: true }));
          };
          poner('#email', ${JSON.stringify(correo)});
          poner('#password', ${JSON.stringify(process.env.CLAVE ?? "unaclavelarga")});
          document.querySelector('form').requestSubmit();
        })()`,
      });
      await espera(3500);
    }

    await cdp(ws, 4, "Page.navigate", { url: `${BASE}${ruta}` });
    await espera(2500); // hidratación y primera consulta a Supabase

    const medidas = await cdp(ws, 5, "Runtime.evaluate", {
      expression: `JSON.stringify({
        innerWidth: window.innerWidth,
        // Si Next muestra su superposición de error, todo lo demás que se mida
        // sería de la pantalla de error y no de la app: un falso "todo bien".
        errorDeCompilacion: Boolean(
          document.querySelector('nextjs-portal') &&
          /Build Error|Unhandled Runtime Error|Runtime Error/.test(document.body.innerText)
        ),
        scrollWidth: document.documentElement.scrollWidth,
        // Solo interesan los que desbordan LA PÁGINA. Un elemento que sobresale
        // dentro de un contenedor con scroll horizontal es intencionado —el
        // selector de espacios, por ejemplo— y marcarlo haría desconfiar de la
        // herramienta.
        desbordados: document.documentElement.scrollWidth <= window.innerWidth
          ? []
          : [...document.querySelectorAll('*')]
              .filter(e => e.getBoundingClientRect().right > window.innerWidth + 1)
              .slice(0, 5)
              .map(e => e.tagName + '.' + String(e.className || '').slice(0, 50)),
        // Se mide el área que el dedo puede tocar, no el elemento. Un radio o
        // una casilla dentro de una <label> alta se tocan por la etiqueta
        // entera; marcarlos haría desconfiar de la herramienta, que es peor
        // que no tenerla.
        tactilesPequenos: [...document.querySelectorAll('a,button,[role="button"],input,select')]
          .map(e => {
            const envoltura = e.closest('label,button,a');
            const objetivo = envoltura && envoltura !== e ? envoltura : e;
            return { e, alto: objetivo.getBoundingClientRect().height };
          })
          .filter(x => x.alto > 0 && x.alto < 44)
          .slice(0, 5)
          .map(x => x.e.tagName + ' ' + Math.round(x.alto) + 'px')
      })`,
      returnByValue: true,
    });

    const m = JSON.parse(medidas.result.value);
    console.log(`\n${ruta} a ${ancho}px`);
    if (m.errorDeCompilacion) {
      console.log("  ⚠️  LA APP MUESTRA UN ERROR — el resto de medidas no vale");
    }
    console.log(`  viewport real         ${m.innerWidth}px`);
    console.log(
      `  desborde horizontal   ${m.scrollWidth > m.innerWidth ? `SÍ (${m.scrollWidth}px) ⚠️` : "no ✓"}`,
    );
    if (m.desbordados.length) console.log(`  elementos fuera:      ${m.desbordados.join(", ")}`);
    console.log(
      `  objetivos < 44px      ${m.tactilesPequenos.length ? `${m.tactilesPequenos.join(", ")} ⚠️` : "ninguno ✓"}`,
    );

    const cap = await cdp(ws, 6, "Page.captureScreenshot", { format: "png" });
    const archivo = `${salida}/${ruta.replace(/\//g, "_") || "_raiz"}-${ancho}.png`;
    writeFileSync(archivo, Buffer.from(cap.data, "base64"));
    console.log(`  captura               ${archivo}\n`);

    ws.close();
    if (m.errorDeCompilacion) process.exitCode = 1;
  } finally {
    chrome.kill();
    await promisify(execFile)("pkill", ["-f", "gioslab-captura"]).catch(() => {});
  }
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
