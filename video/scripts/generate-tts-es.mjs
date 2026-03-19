#!/usr/bin/env node
/**
 * Generate TTS voiceover audio files in SPANISH using OpenAI TTS API.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-tts-es.mjs
 *
 * Options:
 *   --voice=nova         Voice: alloy, echo, fable, onyx, nova, shimmer (default: nova)
 *   --model=tts-1-hd     Model: tts-1, tts-1-hd (default: tts-1-hd)
 *   --scene=S01          Generate only a specific scene (default: all)
 *   --speed=1.0          Speech speed 0.25-4.0 (default: 0.95)
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(__dirname, "../public/audio-es");

// --- Narration Scripts (Spanish) ---
const narrations = [
  {
    id: "S01",
    text: `¿Y si tu agente de IA pudiera evolucionar su propia inteligencia? ... GSEP transforma prompts estáticos en sistemas vivos que aprenden solos. ... Mira cómo se adapta, mejora y se auto-repara automáticamente. ... Solo tres líneas de código. Sin reentrenamiento. Sin fine-tuning.`,
  },
  {
    id: "S02",
    text: `GSEP es una mejora directa para cualquier agente de IA. ... Sin reentrenamiento costoso. Sin fine-tuning complejo. ... Solo tres líneas de código, y tu agente empieza a aprender. ... Compatible con Claude, GPT-4, Gemini y más.`,
  },
  {
    id: "S03",
    text: `Los agentes de IA tradicionales sufren cuatro problemas críticos. ... Prompts estáticos. Ajuste manual. Degradación invisible. Conocimiento aislado. ... Cada problema se acumula, haciendo los agentes poco fiables a escala. ... GSEP resuelve los cuatro, automáticamente.`,
  },
  {
    id: "S04",
    text: `GSEP usa una arquitectura de cinco cromosomas. ... C-cero es el ADN inmutable, con protección SHA-256. Define la identidad principal, la ética y las reglas de seguridad que nunca cambian. ... C-uno contiene genes operativos que evolucionan lentamente mediante validación. El uso de herramientas, patrones de código y estrategias de razonamiento mejoran con el tiempo. ... C-dos se adapta rápidamente a las preferencias de cada usuario. El estilo de comunicación, formato y comportamiento se ajustan por usuario, a diario. ... C-tres es el firewall de contenido, con 53 patrones de seguridad. Defiende contra inyección de prompts, secuestro de roles y exfiltración de datos. ... C-cuatro es el sistema inmune conductual. Seis verificaciones deterministas detectan si la propia respuesta del agente fue manipulada, con cuarentena automática y auto-reparación. ... Juntos, crean un sistema inteligente por capas.`,
  },
  {
    id: "S05",
    text: `GSEP sigue un ciclo de evolución de cuatro fases. ... Primero, transcripción. Cada interacción se registra con métricas de calidad. Tasa de éxito, eficiencia de tokens, latencia y satisfacción del usuario se rastrean. ... Luego, variación. El sistema genera mutaciones usando ocho operadores. Desde reemplazo de sinónimos y reformulación de instrucciones, hasta expansión y compresión de prompts. ... Después, simulación. Los candidatos se prueban en un entorno sandbox. Cada mutación se ejecuta contra escenarios históricos para medir la mejora. ... Finalmente, selección. Solo las mejoras que pasan las cuatro puertas se despliegan. Significancia estadística, verificaciones de seguridad, capacidad de rollback y ganancia de fitness. ... El despliegue canario distribuye los cambios gradualmente, con rollback automático si el rendimiento baja.`,
  },
  {
    id: "S06",
    text: `El sistema de fitness evalúa el rendimiento del agente en seis dimensiones. ... Calidad mide la coherencia y corrección del output. Tasa de éxito rastrea las tareas completadas exitosamente. Eficiencia de tokens mide la compresión cognitiva. Latencia rastrea el tiempo de respuesta en milisegundos. Costo por éxito mide la eficiencia económica. Y la tasa de intervención rastrea las correcciones manuales necesarias. ... Estas métricas se combinan en una puntuación compuesta con importancia ponderada. ... La confianza escala con el tamaño de muestra, alcanzando el 95% con 200 o más muestras.`,
  },
  {
    id: "S07",
    text: `La detección de drift permite monitoreo proactivo del rendimiento. ... El sistema rastrea métricas a lo largo del tiempo para identificar patrones de degradación. Cuando se detecta drift, el sistema alerta y se prepara para reparar. ... Se monitorean cinco tipos de drift: tasa de éxito, eficiencia, latencia, costo e intervención. ... La severidad se categoriza de menor a crítica, activando respuestas apropiadas. ... El drift crítico activa rollback de emergencia y auto-reparación. Sin intervención manual necesaria. Tu agente se recupera solo.`,
  },
  {
    id: "S08",
    text: `El Agente Vivo integra diez capas cognitivas para una genuina auto-conciencia. ... El Self-Model permite al agente conocer sus propias fortalezas y debilidades. ... La Metacognición proporciona introspección antes y después de cada respuesta. Antes de cada respuesta, el agente evalúa su nivel de confianza. ... El Modelo Emocional detecta las emociones del usuario y adapta el tono de comunicación. ... La Autonomía Calibrada aprende cuándo actuar independientemente versus pedir orientación. ... La Memoria de Patrones recuerda patrones de interacción exitosos. ... La Narrativa Personal rastrea el historial de relación con cada usuario. ... La Memoria Analítica mantiene un grafo de conocimiento de entidades y relaciones. ... El Self-Model Mejorado rastrea la alineación de propósito y capacidades en evolución. ... La Supervivencia de Propósito implementa una máquina de estados de próspero a crítico. Cuando la alineación de propósito baja, el agente entra en modo supervivencia. ... La Autonomía Estratégica permite la toma de decisiones estratégicas basadas en objetivos. ... Juntas, estas capas crean un agente genuinamente auto-consciente.`,
  },
  {
    id: "S09",
    text: `C-tres, el Firewall de Contenido, protege contra siete categorías de ataques. ... La inyección de prompts intenta anular las instrucciones del sistema. El secuestro de roles intenta cambiar la identidad del agente. La exfiltración de datos intenta robar datos de la conversación. La evasión por codificación usa trucos como Base64 para eludir la detección. La escalación de privilegios intenta obtener acceso no autorizado. La anulación de instrucciones intenta inyectar nuevos mensajes de sistema. Y el contrabando de contenido oculta contenido malicioso en escenarios hipotéticos. ... Tres mecanismos de defensa trabajan juntos: etiquetado de contenido, detección de patrones y registro de confianza. ... El sistema soporta cinco idiomas principales para protección global. Sin dependencias externas. Máxima seguridad.`,
  },
  {
    id: "S10",
    text: `El Banco de Genes almacena genes localmente probados con puntuaciones de fitness altas. Cada gen ha sido validado mediante rendimiento real. ... El Marketplace de GSEP es como npm para comportamientos de IA. Los desarrolladores publican genes probados, otros los adoptan. ... Siete tipos de genes están disponibles: uso de herramientas, razonamiento, comunicación, recuperación de errores, gestión de contexto, flujos de trabajo y experiencia de dominio. ... La adopción sigue un proceso de seguridad de tres pasos. Primero, verificación de compatibilidad. Luego, prueba sandbox. Finalmente, integración segura. ... Los niveles de calidad aseguran que solo genes probados estén disponibles. Desde experimental hasta élite certificada.`,
  },
  {
    id: "S11",
    text: `Integrar GSEP toma solo tres pasos. ... Primero, instala el paquete core y tu adaptador LLM. Soportamos Claude, GPT-4, Gemini, Ollama y Perplexity. ... Segundo, inicializa PGA con tu LLM y almacenamiento elegidos. Crea un genoma para tu agente. Es tu contenedor evolutivo. ... Tercero, reemplaza tu llamada LLM existente con genome punto chat. Es literalmente un cambio de una línea. ... Eso es todo. Tu agente ahora evoluciona.`,
  },
  {
    id: "S12",
    text: `La configuración te da control sobre el comportamiento evolutivo. ... Empieza con una configuración mínima. Activa la evolución continua, establece la frecuencia, y auto-muta al detectar drift. ... O ve al agente vivo completo. Activa self-model, metacognición y modelado emocional. Agrega autonomía calibrada, narrativa personal y memoria analítica. Desbloquea self-model mejorado, supervivencia de propósito y autonomía estratégica. ... Empieza simple. Mejora cuando veas valor.`,
  },
  {
    id: "S13",
    text: `No te fíes de nuestra palabra. Demuéstralo tú mismo. ... Ejecuta el script de prueba de valor. Cinco ciclos. Diez interacciones cada uno. ... Veredicto: mejora demostrada. Más dieciséis por ciento de calidad. ... Observa cómo la calidad sube de cero punto cinco a cero punto cinco ocho. El uso de tokens aumenta conforme el agente aprende a ser más riguroso. ... El gráfico de líneas muestra la trayectoria evolutiva. ... Datos duros, no promesas. Demuestra el ROI a tu equipo.`,
  },
  {
    id: "S14",
    text: `GSEP funciona donde sea que viva tu agente. ... ¿API con Express? Reemplazo de una línea. Pasa el mensaje del usuario y el ID. La evolución ocurre automáticamente. ... ¿Bot de Discord? Mismo patrón. Intercepta el mensaje, llama genome-chat, responde. ... ¿LangChain? Reemplaza tu llamada LLM dentro de cualquier cadena. ... GSEP es middleware. Se ubica entre tu agente y el LLM. Cero refactorización. Máxima evolución.`,
  },
  {
    id: "S15",
    text: `GSEP es agnóstico al modelo. Usa cualquier LLM. ... Anthropic Claude. Haiku, Sonnet, Opus. OpenAI. GPT-4, GPT-4-Turbo. Google Gemini. Pro y Flash. Ollama para modelos locales. Llama, Mistral, CodeLlama. Perplexity para generación aumentada con búsqueda web. ... ¿Quieres agregar tu propio modelo? Implementa un método. Eso es todo.`,
  },
  {
    id: "S16",
    text: `La versión cero punto siete introduce los tres pilares de la vida. ... Pilar uno: Self-Model Mejorado. ¿Quién soy? Alineación de propósito, seguimiento de capacidades, trayectoria evolutiva. El agente rastrea su salud integrada en todas las dimensiones. ... Pilar dos: Supervivencia de Propósito. ¿Estoy en peligro? Una máquina de estados con cinco modos: próspero, estable, estresado, supervivencia, crítico. ... Pilar tres: Autonomía Estratégica. ¿Qué debo hacer? Priorización evolutiva, mutación adaptativa, rechazo de tareas cuando está sobrecargado. ... No es consciencia. Es auto-conciencia genuina.`,
  },
  {
    id: "S17",
    text: `¿Cuál es el impacto en rendimiento? ... Satisfacción del usuario: sube veinticinco por ciento. Tasa de éxito de tareas: sube dieciocho por ciento. Eficiencia de tokens: sube doce por ciento. Retención de usuarios: sube treinta y cuatro por ciento. Intervenciones manuales: bajan cuarenta y cinco por ciento. ... Medido con nuestra suite de benchmarks estándar en más de veinte configuraciones.`,
  },
  {
    id: "S18",
    text: `GSEP es open source y sostenible. ... El motor core, adaptadores y CLI tienen licencia MIT. Gratis para siempre. Úsalo donde quieras. ... Gene Registry tiene Business Source License. Gratis para usar. Se convierte a Apache 2.0 en 2029. ... GSEP Cloud y las funciones Enterprise son propietarias. ... Desarrolladores individuales y equipos pequeños: cien por ciento gratis. Empresas a escala: contribuyan.`,
  },
  {
    id: "S19",
    text: `¿Listo para empezar? ... Lee la documentación en gsepcore punto com slash docs. Danos una estrella en GitHub. Únete a nuestra comunidad en Discord. O instala ahora con npm install arroba pga-ai slash core. ... Tu agente, pero vivo. Empieza ahora.`,
  },
  {
    id: "S20",
    text: `Tu agente... pero vivo. ... Genomic Self-Evolving Prompts. Versión cero punto nueve. Patentado. Licencia MIT. Listo para producción. ... Creado por Luis Alfredo Velasquez Duran. ... Deja que tu agente evolucione.`,
  },
];

// --- CLI Args ---
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  })
);

const VOICE = args.voice ?? "nova";
const MODEL = args.model ?? "tts-1-hd";
const SPEED = parseFloat(args.speed ?? "0.95");
const SCENE_FILTER = args.scene ?? null;
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error("Error: OPENAI_API_KEY environment variable is required.");
  console.error("Usage: OPENAI_API_KEY=sk-... node scripts/generate-tts-es.mjs");
  process.exit(1);
}

// Ensure output directory exists
mkdirSync(outputDir, { recursive: true });

async function generateTTS(sceneId, text) {
  // Clean up the text: replace "..." pauses with actual pauses via periods
  const cleanText = text
    .replace(/\.\.\./g, ".")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  console.log(`  Generating ${sceneId} (${cleanText.length} chars, voice: ${VOICE})...`);

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
    throw new Error(`OpenAI TTS API error (${response.status}): ${err}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const outPath = resolve(outputDir, `voiceover-${sceneId.toLowerCase()}-es.mp3`);
  writeFileSync(outPath, buffer);
  console.log(`  Saved: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  return outPath;
}

async function main() {
  console.log(`\nGSEP Demo Video — TTS Generation (ESPAÑOL)`);
  console.log(`Voice: ${VOICE} | Model: ${MODEL} | Speed: ${SPEED}`);
  console.log(`Output: ${outputDir}\n`);

  const scenes = SCENE_FILTER
    ? narrations.filter((n) => n.id === SCENE_FILTER)
    : narrations;

  if (scenes.length === 0) {
    console.error(`No scene found for filter: ${SCENE_FILTER}`);
    process.exit(1);
  }

  let totalSize = 0;
  for (const scene of scenes) {
    try {
      const path = await generateTTS(scene.id, scene.text);
      const stat = (await import("fs")).statSync(path);
      totalSize += stat.size;
    } catch (err) {
      console.error(`  ERROR generating ${scene.id}: ${err.message}`);
    }
    // Small delay to respect rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nDone! Generated ${scenes.length} audio files.`);
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`\nNext: run 'npm run dev' to preview with audio.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
