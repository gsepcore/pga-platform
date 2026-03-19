#!/usr/bin/env node
/**
 * Generate TTS for the condensed GSEP demo in SPANISH (12 scenes, ~5:30)
 * Uses OpenAI TTS API with HD model
 *
 * Usage: OPENAI_API_KEY=sk-... node scripts/generate-tts-short-es.mjs
 */

import { writeFileSync, mkdirSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(__dirname, "../public/audio-es");
mkdirSync(outputDir, { recursive: true });

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Error: OPENAI_API_KEY required.");
  process.exit(1);
}

const VOICE = process.env.VOICE || "nova";
const MODEL = "tts-1-hd";
const SPEED = 0.95;

// Condensed narration scripts in Spanish — punchy, clear, developer-friendly
const scenes = [
  {
    id: "short-s01",
    title: "Gancho",
    text: `¿Y si tu agente de IA pudiera evolucionar su propia inteligencia? GSEP, Genomic Self-Evolving Prompts, es una mejora directa que transforma agentes estáticos en sistemas vivos que se auto-mejoran. Tres líneas de código. Sin reentrenamiento. Sin fine-tuning.`,
  },
  {
    id: "short-s02",
    title: "Propuesta Principal",
    text: `GSEP envuelve tus llamadas LLM existentes con una capa evolutiva. Tu agente aprende de cada interacción. Se adapta a cada usuario. Se auto-repara cuando el rendimiento baja. Funciona con Claude, GPT-4, Gemini, Ollama y cualquier LLM que elijas.`,
  },
  {
    id: "short-s03",
    title: "Problema",
    text: `Los agentes de IA actuales tienen cuatro problemas críticos. Prompts estáticos que nunca mejoran. Ajuste manual que no escala. Degradación invisible que no notas hasta que los usuarios se quejan. Y conocimiento aislado que muere con cada conversación. GSEP resuelve los cuatro automáticamente.`,
  },
  {
    id: "short-s04",
    title: "Arquitectura 5 Cromosomas",
    text: `En el corazón de GSEP hay una arquitectura de cinco cromosomas. C-cero es el ADN inmutable, protegido por SHA-256. Contiene identidad, ética y reglas de seguridad que nunca cambian. C-uno contiene genes operativos que evolucionan lentamente con validación: patrones de herramientas, estrategias de razonamiento, comportamientos de código. C-dos es el epigenoma, adaptándose rápido a las preferencias de cada usuario. Estilo de comunicación, formato, longitud de respuesta, todo personalizado a diario. C-tres es el firewall de contenido con 53 patrones de seguridad, defendiendo contra inyección de prompts, secuestro de roles y exfiltración de datos. Y C-cuatro es el sistema inmune conductual: seis verificaciones deterministas detectan si la propia respuesta del agente fue manipulada, con cuarentena automática y auto-reparación.`,
  },
  {
    id: "short-s05",
    title: "Ciclo Evolutivo",
    text: `La evolución ocurre en cuatro fases. La transcripción registra cada interacción con métricas de calidad. La variación genera mutaciones usando ocho operadores, desde reemplazo de sinónimos hasta compresión de prompts. La simulación prueba cada candidato en un sandbox contra escenarios históricos. Y la selección despliega solo mutaciones que pasan todas las puertas: significancia estadística, verificaciones de seguridad y ganancia de fitness. El despliegue canario distribuye cambios gradualmente con rollback automático.`,
  },
  {
    id: "short-s06",
    title: "Fitness + Drift",
    text: `El sistema de fitness rastrea seis dimensiones: calidad, tasa de éxito, eficiencia de tokens, latencia, costo por éxito y tasa de intervención. Cuando cualquier métrica se degrada, el detector de drift lo captura automáticamente. Se monitorean cinco tipos de drift con niveles de severidad de menor a crítico. El drift crítico activa rollback de emergencia. Sin intervención manual necesaria.`,
  },
  {
    id: "short-s07",
    title: "Agente Vivo",
    text: `El Agente Vivo agrega diez capas cognitivas a tu agente. Self-Model para conocer sus fortalezas. Metacognición para introspección antes y después de cada respuesta. Inteligencia emocional para adaptarse al estado de ánimo del usuario. Autonomía calibrada para decidir cuándo actuar versus preguntar. Memoria de patrones, narrativa personal y memoria analítica para conciencia contextual profunda. Más tres pilares avanzados: self-model mejorado para seguimiento de salud, supervivencia de propósito para auto-preservación, y autonomía estratégica para toma de decisiones basada en objetivos.`,
  },
  {
    id: "short-s08",
    title: "Firewall + Inmunidad",
    text: `El firewall C-tres defiende contra siete categorías de ataques. Inyección de prompts, secuestro de roles, exfiltración de datos, evasión por codificación, escalación de privilegios y más. 53 patrones de detección. Cinco idiomas soportados. Sin dependencias externas. Y C-cuatro, el sistema inmune, escanea el output del agente con seis verificaciones deterministas. Auto-cuarentena y auto-reparación. Defensa total, entrada y salida.`,
  },
  {
    id: "short-s09",
    title: "Integración",
    text: `La integración toma tres pasos. Instala el paquete core y tu adaptador LLM. Inicializa PGA con tu modelo elegido. Reemplaza tu llamada LLM con genome punto chat. Eso es todo. Un cambio de una línea. Funciona con Express, bots de Discord, LangChain, o cualquier app Node.js. Tu agente ahora evoluciona.`,
  },
  {
    id: "short-s10",
    title: "Benchmarks",
    text: `Los resultados hablan por sí mismos. Satisfacción del usuario sube 25 por ciento. Tasa de éxito de tareas sube 18 por ciento. Eficiencia de tokens sube 12 por ciento. E intervenciones manuales bajan 45 por ciento. Todo medido en más de 20 configuraciones con nuestra suite de benchmarks estándar.`,
  },
  {
    id: "short-s11",
    title: "Empieza Ya",
    text: `GSEP es open source. Core con licencia MIT, gratis para siempre. Ejecuta npm install arroba pga-ai slash core para empezar. Lee la documentación en gsepcore punto com. Danos estrella en GitHub. Únete al Discord. Tu agente, pero vivo. Empieza ahora.`,
  },
  {
    id: "short-s12",
    title: "Cierre",
    text: `Genomic Self-Evolving Prompts. Versión cero punto nueve. Patentado. Listo para producción. Deja que tu agente evolucione.`,
  },
];

async function generateTTS(scene) {
  const cleanText = scene.text.replace(/\s+/g, " ").trim();
  console.log(`  [${scene.id}] ${scene.title} (${cleanText.length} chars)...`);

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      voice: VOICE,
      input: cleanText,
      response_format: "mp3",
      speed: SPEED,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error (${response.status}): ${err}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const outPath = resolve(outputDir, `${scene.id}-es.mp3`);
  writeFileSync(outPath, buffer);
  const size = statSync(outPath).size;
  console.log(`    Saved: ${scene.id}-es.mp3 (${(size / 1024).toFixed(0)} KB)`);
  return size;
}

async function main() {
  console.log(`\nGSEP Demo Short — OpenAI TTS Generation (ESPAÑOL)`);
  console.log(`Voice: ${VOICE} | Model: ${MODEL} | Speed: ${SPEED}\n`);

  let totalSize = 0;
  for (const scene of scenes) {
    try {
      totalSize += await generateTTS(scene);
    } catch (err) {
      console.error(`    ERROR: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone! ${scenes.length} files, ${(totalSize / 1024 / 1024).toFixed(1)} MB total.\n`);
}

main();
