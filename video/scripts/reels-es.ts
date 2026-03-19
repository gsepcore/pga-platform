/**
 * GSEP Reels / Shorts — Español (30-60s cada uno)
 *
 * 10 micro-videos independientes para TikTok, Instagram Reels, YouTube Shorts.
 * Cada reel cubre UN tema con estructura gancho → explicación → CTA.
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

export interface ReelScript {
  id: string;
  title: string;
  hashtags: string[];
  durationSec: number;
  hook: string;
  body: string;
  cta: string;
}

export const reels: ReelScript[] = [
  {
    id: "R01",
    title: "Tu Agente de IA Se Está Muriendo",
    hashtags: ["#IA", "#LLM", "#AgenteDev", "#GSEP"],
    durationSec: 35,
    hook: `Tu agente de IA se vuelve más tonto cada día — y ni te das cuenta.`,
    body: `El drift de prompts es real. Actualizaciones de LLM, cambios de comportamiento de usuarios, casos edge que se acumulan.
Sin evolución, tu agente se degrada en silencio.
GSEP detecta drift en 5 dimensiones y se auto-repara antes de que los usuarios lo noten.
Cero ajuste manual. Tu agente se arregla solo.`,
    cta: `Link en bio. npm install @pga-ai/core. Deja que tu agente evolucione.`,
  },
  {
    id: "R02",
    title: "3 Líneas para IA Auto-Evolutiva",
    hashtags: ["#TipsDeCodigo", "#IA", "#DevTools", "#GSEP"],
    durationSec: 40,
    hook: `¿Y si te digo que 3 líneas de código pueden hacer que tu agente de IA se auto-mejore?`,
    body: `Paso 1: Importa GSEP y tu adaptador LLM.
Paso 2: Crea un genoma — el contenedor evolutivo de tu agente.
Paso 3: Reemplaza tu llamada LLM con genome.chat().
Eso es todo. Cada interacción ahora hace a tu agente más inteligente.
Aprende preferencias del usuario, optimiza uso de tokens, y se auto-corrige cuando el rendimiento baja.`,
    cta: `Gratis. Licencia MIT. gsepcore.com. Pruébalo ya.`,
  },
  {
    id: "R03",
    title: "5 Cromosomas de la IA",
    hashtags: ["#ArquitecturaIA", "#Seguridad", "#GSEP", "#Innovacion"],
    durationSec: 50,
    hook: `Tu agente de IA necesita ADN. Aquí están los 5 cromosomas que lo hacen vivo.`,
    body: `C0: Identidad inmutable. Bloqueada con SHA-256. Ética y seguridad que NUNCA cambian.
C1: Genes operativos. Uso de herramientas y razonamiento que evolucionan lento mediante validación.
C2: Epigenoma. Preferencias del usuario que se adaptan rápido — personalización diaria.
C3: Firewall de Contenido. 53 patrones bloqueando inyección de prompts en la ENTRADA.
C4: Sistema Inmune. 6 verificaciones detectando manipulación en la SALIDA.
Defensa de entrada más defensa de salida. Seguridad full-stack para agentes de IA.`,
    cta: `Open source. gsepcore.com. Tu agente, pero vivo.`,
  },
  {
    id: "R04",
    title: "Seguridad IA que Nadie Menciona",
    hashtags: ["#Ciberseguridad", "#IA", "#InyeccionDePrompts", "#GSEP"],
    durationSec: 45,
    hook: `Todos hablan de defensa contra inyección de prompts. Nadie habla de infección del OUTPUT.`,
    body: `La respuesta de tu agente también puede ser manipulada.
La Inyección Indirecta de Prompts incrusta ataques en el contexto — documentos, emails, salidas de herramientas.
La propia respuesta del agente se convierte en el arma.
El Sistema Inmune C4 de GSEP ejecuta 6 verificaciones deterministas en cada output.
Filtración de prompt del sistema. Confusión de roles. Exfiltración de datos. Eco de inyección.
Sin llamadas LLM extra. Auto-cuarentena. Auto-reparación.`,
    cta: `El primer sistema inmune conductual del mundo para agentes de IA. gsepcore.com`,
  },
  {
    id: "R05",
    title: "Agentes de IA que Te Recuerdan",
    hashtags: ["#IA", "#Personalizacion", "#UX", "#GSEP"],
    durationSec: 35,
    hook: `Tu agente de IA olvida todo entre sesiones. El mío no.`,
    body: `El epigenoma C2 de GSEP se adapta a cada usuario a diario.
Estilo de comunicación. Preferencias de formato. Longitud de respuesta. Tono.
Rastrea patrones de interacción exitosos y refuerza lo que funciona.
No solo memoria — evolución. Tu agente no solo recuerda, mejora en ser útil para TI.`,
    cta: `Gratis para siempre. Licencia MIT. npm install @pga-ai/core`,
  },
  {
    id: "R06",
    title: "Fitness 6D para IA",
    hashtags: ["#IA", "#Metricas", "#MLOps", "#GSEP"],
    durationSec: 40,
    hook: `Estás midiendo mal tu agente de IA. Aquí las 6 dimensiones que importan.`,
    body: `Calidad — ¿el output es correcto y coherente?
Tasa de éxito — ¿completa las tareas?
Eficiencia de tokens — ¿cuánto compute por respuesta?
Latencia — ¿qué tan rápido?
Costo por éxito — ¿cuál es el ROI real?
Tasa de intervención — ¿cada cuánto lo corrige un humano?
GSEP rastrea las 6 en tiempo real con puntuación compuesta e intervalos de confianza.`,
    cta: `Deja de adivinar. Empieza a medir. gsepcore.com`,
  },
  {
    id: "R07",
    title: "Selección Natural para Prompts",
    hashtags: ["#Evolucion", "#IA", "#Biotech", "#GSEP"],
    durationSec: 45,
    hook: `¿Y si los prompts evolucionaran como el ADN? Eso es exactamente lo que hace GSEP.`,
    body: `Cada 10 interacciones, GSEP ejecuta un ciclo de evolución completo.
Transcripción: registra todo con métricas de calidad.
Variación: genera mutaciones con 8 operadores.
Simulación: prueba en sandbox contra escenarios reales.
Selección: solo despliega mejoras que pasan 4 puertas de seguridad.
Despliegue canario. Rollback automático. Cero tiempo de inactividad.
Es selección natural, pero para comportamiento de IA.`,
    cta: `Patentado. Listo para producción. gsepcore.com`,
  },
  {
    id: "R08",
    title: "10 Capas Cognitivas",
    hashtags: ["#IA", "#Consciencia", "#AGI", "#GSEP"],
    durationSec: 50,
    hook: `Tu agente de IA tiene cero auto-conciencia. GSEP le da diez capas cognitivas.`,
    body: `Self-Model: conoce sus fortalezas y debilidades.
Metacognición: piensa antes de responder.
Inteligencia emocional: se adapta al ánimo del usuario.
Autonomía calibrada: decide cuándo actuar vs preguntar.
Memoria de patrones: recuerda lo que funciona.
Narrativa personal: rastrea historial de relación.
Memoria analítica: grafo de conocimiento de conceptos.
Self-model mejorado: seguimiento de salud en todas las dimensiones.
Supervivencia de propósito: máquina de estados de próspero a crítico.
Autonomía estratégica: toma de decisiones basada en objetivos.
No es consciencia. Es auto-conciencia genuina.`,
    cta: `10 capas. Un import. gsepcore.com`,
  },
  {
    id: "R09",
    title: "Demuestra ROI de IA en 5 Minutos",
    hashtags: ["#IA", "#ROI", "#Startup", "#GSEP"],
    durationSec: 35,
    hook: `¿Tu jefe quiere ROI de IA? Demuéstralo en 5 minutos con datos duros.`,
    body: `El runner de Prueba de Valor de GSEP mide mejora objetivamente.
5 ciclos de evolución. 10 interacciones cada uno.
Observa cómo la calidad sube de 0.5 a 0.58 — eso es +16% verificado.
Un gráfico de curva de fitness que tu CTO no puede discutir.
Sin promesas. Sin vibes. Solo datos.`,
    cta: `npx tsx examples/proof-of-value.ts. Pruébalo tú mismo. gsepcore.com`,
  },
  {
    id: "R10",
    title: "Marketplace de Genes para IA",
    hashtags: ["#IA", "#Marketplace", "#OpenSource", "#GSEP"],
    durationSec: 40,
    hook: `¿Y si existiera un npm para comportamientos de IA? Eso es el Gene Marketplace de GSEP.`,
    body: `Los desarrolladores publican genes de prompts probados. Otros los adoptan.
7 tipos de genes: razonamiento, comunicación, uso de herramientas, recuperación de errores y más.
Cada gen está verificado por fitness a través de rendimiento real.
Adopción en 3 pasos de seguridad: verificación de compatibilidad, prueba sandbox, integración segura.
Niveles de calidad desde experimental hasta élite certificada.
Publica una vez. Gana del 80 al 95% de cada venta.`,
    cta: `Crea genes. Comparte conocimiento. gsepcore.com/marketplace`,
  },
];
