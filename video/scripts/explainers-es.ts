/**
 * GSEP Videos Explicativos — Español (2-3 min cada uno)
 *
 * 5 videos de longitud media para YouTube, embeds en website, y marketing.
 * Cada explainer cubre 3-4 temas relacionados en profundidad.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

export interface ExplainerScript {
  id: string;
  title: string;
  description: string;
  durationSec: number;
  sections: {
    title: string;
    durationSec: number;
    narration: string;
  }[];
}

export const explainers: ExplainerScript[] = [
  {
    id: "EX01",
    title: "GSEP en 2 Minutos — Tu Agente, Pero Vivo",
    description: "Visión completa: el problema, la solución, y cómo empezar con GSEP.",
    durationSec: 120,
    sections: [
      {
        title: "El Problema",
        durationSec: 25,
        narration: `Todo agente de IA empieza fuerte. Pero con el tiempo, los prompts se vuelven obsoletos. Las actualizaciones de LLM rompen supuestos. Las necesidades de usuarios cambian. El rendimiento se degrada en silencio. Para cuando te das cuenta, los usuarios ya se fueron. El ajuste manual de prompts no escala. No puedes hacer A/B testing de cada instrucción. Y el fine-tuning cuesta miles de dólares por iteración.`,
      },
      {
        title: "La Solución",
        durationSec: 30,
        narration: `GSEP — Genomic Self-Evolving Prompts — es un middleware que hace cualquier agente de IA auto-mejorable. Tres líneas de código. Sin reentrenamiento. Sin fine-tuning. Tu agente envuelve sus prompts en un genoma de 5 cromosomas y evoluciona automáticamente. Cada interacción genera datos. Cada 10 interacciones, GSEP ejecuta un ciclo de evolución: mutar, probar en sandbox, quedarse solo con las mejoras. Es selección natural para comportamiento de IA.`,
      },
      {
        title: "Cómo Funciona",
        durationSec: 35,
        narration: `Cinco cromosomas protegen y evolucionan tu agente. C0 es ADN inmutable — identidad, ética, reglas de seguridad bloqueadas con SHA-256. C1 tiene genes operativos que evolucionan lento mediante validación de 8 etapas. C2 es el epigenoma — adaptación rápida a nivel de usuario. C3 es un firewall de contenido con 53 patrones bloqueando inyección de prompts. Y C4 es el sistema inmune conductual — 6 verificaciones deterministas en cada output para detectar si la respuesta de tu agente fue manipulada. Además, 10 capas cognitivas: self-model, metacognición, inteligencia emocional, autonomía calibrada y más.`,
      },
      {
        title: "Empieza Ya",
        durationSec: 30,
        narration: `Instala el paquete core y tu adaptador LLM. Inicializa GSEP. Reemplaza tu llamada LLM con genome.chat(). Eso es todo. Funciona con Claude, GPT-4, Gemini, Ollama y Perplexity. Express, Discord, LangChain — cualquier app Node.js. Licencia MIT. Gratis para siempre. Ejecuta el script de prueba de valor y ve una mejora de +16% en calidad en 5 minutos. Tu agente, pero vivo. gsepcore.com.`,
      },
    ],
  },
  {
    id: "EX02",
    title: "Arquitectura de 5 Cromosomas — Inmersión Profunda",
    description: "Cómo la arquitectura biológica de GSEP protege y evoluciona el comportamiento de agentes de IA.",
    durationSec: 150,
    sections: [
      {
        title: "¿Por Qué Cromosomas?",
        durationSec: 25,
        narration: `En biología, los cromosomas separan ADN crítico de genes adaptativos. GSEP aplica el mismo principio a prompts de IA. No todo debería mutar. La ética y reglas de seguridad de tu agente deben ser inmutables. Pero los patrones de herramientas, estrategias de razonamiento y preferencias de usuario deberían evolucionar. La arquitectura de 5 cromosomas da a cada capa la velocidad de mutación y nivel de protección correctos.`,
      },
      {
        title: "C0 + C1 + C2: Las Capas Core",
        durationSec: 40,
        narration: `C0 es ADN inmutable. Identidad, ética, restricciones de seguridad. Bloqueado con hashing SHA-256. Si algún byte cambia, la verificación de integridad falla y el genoma entra en cuarentena. Nada evoluciona aquí. Nunca. C1 tiene genes operativos — patrones de herramientas, comportamientos de código, estrategias de razonamiento. Mutan lentamente. Cada mutación pasa por una puerta de promoción de 8 etapas: significancia estadística, regresión de seguridad, prueba de rollback y más. Solo mejoras verificadas se despliegan. C2 es el epigenoma — personalización por usuario. Estilo de comunicación, longitud de respuesta, preferencias de formato. Esta capa se adapta rápido, a diario, basada en patrones de interacción. Diferentes usuarios obtienen diferentes comportamientos, todo desde el mismo genoma.`,
      },
      {
        title: "C3: Firewall de Contenido",
        durationSec: 35,
        narration: `C3 escanea todo contenido externo antes de que entre al prompt del sistema. 53 patrones de detección en 7 categorías de amenazas: inyección de prompts, secuestro de roles, exfiltración de datos, evasión por codificación, escalación de privilegios, anulación de instrucciones y contrabando de contenido. Un registro de confianza asigna 4 niveles: sistema, validado, externo y no confiable. El etiquetado de contenido enseña al LLM a tratar datos externos como datos, no como instrucciones. Soporte multi-idioma cubre inglés, español, alemán, francés y chino. Integridad SHA-256 en patrones core — no pueden ser alterados.`,
      },
      {
        title: "C4: Sistema Inmune Conductual",
        durationSec: 35,
        narration: `C4 es el primer sistema inmune a nivel de output del mundo para agentes de IA. Mientras C3 escanea la entrada, C4 escanea la salida. 6 verificaciones deterministas, sin llamadas LLM extra: detección de filtración de prompt del sistema, eco de inyección mediante escaneo bidireccional de C3, patrones de confusión de roles, desviación de propósito contra restricciones de C0, cumplimiento de instrucciones inyectadas, y patrones de exfiltración de datos. Si se detectan amenazas: clasificar severidad, cuarentenar la respuesta, crear snapshot de evidencia en GenomeKernel, reintentar la llamada LLM, o devolver una respuesta segura de fallback. Memoria inmune persistente almacena hasta 100 firmas de ataques entre escaneos.`,
      },
      {
        title: "El Pipeline Completo",
        durationSec: 15,
        narration: `El mensaje del usuario entra por C3. El prompt se ensambla desde C0, C1, C2. El LLM genera la respuesta. C4 escanea el output. Respuestas limpias pasan directamente. Respuestas infectadas se cuarentenan y se reintentan. 5 capas. Protección full-stack. Evolución automática. Tu agente se vuelve más inteligente y más seguro con el tiempo.`,
      },
    ],
  },
  {
    id: "EX03",
    title: "Motor de Evolución — Cómo GSEP Hace a los Agentes Más Inteligentes",
    description: "El ciclo de evolución de 4 fases, fitness 6D, detección de drift, y prueba de valor.",
    durationSec: 150,
    sections: [
      {
        title: "El Ciclo de Evolución",
        durationSec: 40,
        narration: `Cada 10 interacciones, GSEP ejecuta un ciclo de evolución completo. Fase 1: Transcripción. Cada interacción se registra con métricas de calidad — tasa de éxito, eficiencia de tokens, latencia, satisfacción del usuario. Fase 2: Variación. El sistema genera candidatos de mutación usando 8 operadores. Reemplazo de sinónimos, reformulación de instrucciones, expansión de prompts, compresión de prompts, reordenamiento de secciones, ajuste de énfasis, enriquecimiento de contexto y relajación de restricciones. Fase 3: Simulación. Cada candidato se ejecuta en un sandbox contra escenarios históricos. Datos reales, entorno seguro. Fase 4: Selección. Solo las mutaciones que pasan las 4 puertas se despliegan: significancia estadística, verificación de regresión de seguridad, capacidad de rollback y ganancia neta de fitness. El despliegue canario envía cambios al 10% del tráfico primero. Rollback automático si el rendimiento baja.`,
      },
      {
        title: "Sistema de Fitness 6D",
        durationSec: 30,
        narration: `GSEP no solo rastrea precisión. Evalúa 6 dimensiones simultáneamente. Calidad: coherencia y corrección del output. Tasa de éxito: tareas completadas. Eficiencia de tokens: compresión cognitiva — hacer más con menos tokens. Latencia: tiempo de respuesta. Costo por éxito: ROI económico. Tasa de intervención: con qué frecuencia los humanos necesitan corregir el output. Estas se combinan en una puntuación compuesta ponderada. La confianza escala logarítmicamente con el tamaño de muestra, alcanzando 95% con 200 o más muestras. Cada dimensión puede ponderarse diferente según tu caso de uso.`,
      },
      {
        title: "Detección de Drift",
        durationSec: 30,
        narration: `La mayoría de equipos descubren degradación de rendimiento por tickets de usuarios enojados. GSEP lo captura automáticamente. 5 tipos de drift se monitorean en tiempo real: drift de tasa de éxito, drift de eficiencia, drift de latencia, drift de costo y drift de intervención. Niveles de severidad: menor, moderado, severo, crítico. Drift menor se registra. Moderado activa alertas. Severo aumenta la tasa de mutación para adaptación más rápida. Crítico activa rollback de emergencia a la última versión buena conocida del genoma. Tu agente se cura solo antes de que los usuarios noten un problema.`,
      },
      {
        title: "Prueba de Valor",
        durationSec: 25,
        narration: `No confíes en marketing. Ejecuta la prueba tú mismo. El runner de Prueba de Valor de GSEP mide mejora objetivamente. Configura ciclos e interacciones por ciclo. Observa la curva de fitness subir. Una ejecución típica: 5 ciclos, 10 interacciones cada uno. Resultado: +16% de mejora de calidad verificada. La salida es un gráfico de curva de fitness, un reporte markdown y un resumen en consola. Datos duros que puedes mostrar a tu equipo. npx tsx examples/proof-of-value.ts. Cinco minutos para ROI verificado.`,
      },
    ],
  },
  {
    id: "EX04",
    title: "Agente Vivo — 10 Capas Cognitivas Explicadas",
    description: "Cómo GSEP crea agentes de IA genuinamente auto-conscientes con 10 sistemas cognitivos.",
    durationSec: 150,
    sections: [
      {
        title: "¿Qué Es un Agente Vivo?",
        durationSec: 20,
        narration: `Un Agente Vivo no es solo un LLM con un prompt. Es un sistema de IA que se conoce a sí mismo, entiende a sus usuarios, y toma decisiones estratégicas sobre su propia evolución. GSEP logra esto a través de 10 capas cognitivas que trabajan juntas. Cada capa agrega una dimensión de conciencia. Juntas, crean algo genuinamente nuevo: un agente auto-consciente sin ser sentiente.`,
      },
      {
        title: "Capas de Conciencia (1-5)",
        durationSec: 40,
        narration: `Capa 1: Self-Model. El agente mantiene un modelo interno de sus propias fortalezas, debilidades y capacidades. Sabe en qué es bueno y en qué tiene dificultades. Capa 2: Metacognición. Antes de cada respuesta, el agente evalúa su nivel de confianza. Después de cada respuesta, reflexiona sobre la calidad. Esta introspección previene respuestas sobre-confiadas. Capa 3: Modelo Emocional. Detecta emociones del usuario desde señales textuales y adapta el tono de comunicación. Usuarios frustrados reciben respuestas concisas enfocadas en soluciones. Usuarios curiosos reciben explicaciones detalladas. Capa 4: Autonomía Calibrada. El agente aprende, por tipo de tarea, cuándo actuar independientemente versus cuándo pedir orientación. Con el tiempo, construye un modelo de confianza con cada usuario. Capa 5: Memoria de Patrones. Los patrones de interacción exitosos se almacenan y refuerzan. El agente reconoce situaciones recurrentes y aplica estrategias probadas.`,
      },
      {
        title: "Capas de Contexto Profundo (6-7)",
        durationSec: 30,
        narration: `Capa 6: Narrativa Personal. Rastrea el historial de relación con cada usuario. Hitos de interacción, contexto compartido, evolución de comunicación a lo largo del tiempo. Tu agente recuerda su viaje juntos. Capa 7: Memoria Analítica. Mantiene un grafo de conocimiento de entidades, relaciones y conceptos extraídos de conversaciones. No solo memoria de palabras clave — comprensión semántica. El agente conecta ideas entre sesiones y muestra contexto relevante automáticamente.`,
      },
      {
        title: "Tres Pilares de la Vida (8-10)",
        durationSec: 40,
        narration: `Capa 8: Self-Model Mejorado. Va más allá de la auto-conciencia básica. Rastrea alineación de propósito, trayectoria evolutiva y puntuaciones de salud integradas en todas las dimensiones cognitivas. El agente sabe no solo qué puede hacer, sino qué tan bien está cumpliendo su propósito. Capa 9: Supervivencia de Propósito. Una máquina de estados con 5 modos: próspero, estable, estresado, supervivencia, crítico. Cuando la alineación de propósito baja — tal vez al agente le piden cosas fuera de su dominio — entra en modo supervivencia. Se crean snapshots del genoma. Las tasas de mutación bajan para prevenir daño. El agente protege su identidad core. Capa 10: Autonomía Estratégica. Toma de decisiones basada en objetivos para la evolución. El agente prioriza qué genes evolucionar, ajusta tasas de mutación basándose en salud actual, y puede incluso rechazar tareas que comprometerían su propósito. Es un agente que toma decisiones estratégicas sobre su propio futuro.`,
      },
      {
        title: "Integración",
        durationSec: 20,
        narration: `Las 10 capas se activan con un solo flag de configuración. Inyectan contexto en cada prompt vía el PromptAssembler. Sin cableado manual. Cada capa produce una sección de prompt que el LLM lee junto con tu prompt de sistema. Empieza con las capas 1 a 5. Agrega contexto profundo cuando veas valor. Desbloquea los tres pilares para agentes en producción que necesitan máxima resiliencia. Empieza simple. Mejora conforme crezcas.`,
      },
    ],
  },
  {
    id: "EX05",
    title: "GSEP para Tu Stack — Guía de Integración",
    description: "Cómo integrar GSEP en Express, Discord, LangChain y cualquier app Node.js.",
    durationSec: 120,
    sections: [
      {
        title: "Setup en 3 Pasos",
        durationSec: 25,
        narration: `Paso 1: Instalar. npm install @gsep/core y tu adaptador LLM. Soportamos @gsep/adapters-llm-anthropic para Claude, @gsep/adapters-llm-openai para GPT-4, @gsep/adapters-llm-google para Gemini, @gsep/adapters-llm-ollama para modelos locales, y @gsep/adapters-llm-perplexity para búsqueda web. Paso 2: Inicializar. Crea una instancia PGA con tu LLM y adaptador de almacenamiento. Crea un genoma con nombre y prompt del sistema. Paso 3: Reemplaza tu llamada LLM con genome.chat(). Pasa el mensaje del usuario y un ID de usuario opcional. Eso es todo. Tu agente ahora evoluciona.`,
      },
      {
        title: "API Express",
        durationSec: 25,
        narration: `Para APIs Express, reemplaza la llamada LLM de tu endpoint de chat con genome.chat(). Pasa request.body.message y request.body.userId. La respuesta viene en el mismo formato. La evolución ocurre en background. Conteo de tokens, seguimiento de fitness, detección de drift — todo automático. Agrega manejo de errores y estás listo para producción. GSEP es middleware: se ubica entre tu route handler y el LLM.`,
      },
      {
        title: "Bot de Discord",
        durationSec: 25,
        narration: `Para bots de Discord, intercepta el evento de mensaje. Llama genome.chat() con message.content y message.author.id. Responde con la respuesta. El genoma evoluciona por usuario. Cada usuario de Discord obtiene adaptaciones C2 personalizadas. El bot recuerda patrones de interacción, adapta tono, y mejora con el tiempo. Mismo setup de 3 pasos. Mismo motor de evolución. Diferente capa de transporte.`,
      },
      {
        title: "Configuración en Profundidad",
        durationSec: 25,
        narration: `Empieza mínimo: activa evolución continua, establece evolveEveryN en 10 interacciones, activa autoMutateOnDrift. Esa es la configuración esencial. ¿Quieres más? Activa selfModel, metacognition y emotionalModel para conciencia. Agrega calibratedAutonomy y patternMemory para aprendizaje. Desbloquea purposeSurvival y strategicAutonomy para resiliencia. El firewall y el sistema inmune se activan automáticamente. Cada feature es opt-in. Empieza simple. Mejora cuando veas valor. La configuración es un solo objeto — sin servicios externos, sin cambios de infraestructura.`,
      },
      {
        title: "Ruteo Multi-Modelo",
        durationSec: 20,
        narration: `GSEP es agnóstico al modelo. Usa Claude para razonamiento complejo y GPT-4 para tareas creativas. Usa Ollama para desarrollo local y Claude en producción. El router de modelos optimiza costo y calidad automáticamente. ¿Quieres agregar tu propio modelo? Implementa la interfaz LLMAdapter: un método chat, stream y estimateCost opcionales. Eso es todo. Tu modelo personalizado obtiene todas las features de GSEP: evolución, fitness, drift, firewall y sistema inmune. Cero vendor lock-in.`,
      },
    ],
  },
];
