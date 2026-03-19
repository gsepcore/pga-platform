/**
 * Scripts de narración en español para las 20 escenas.
 * Cada escena tiene un texto combinado para generación TTS,
 * con pausas naturales entre líneas usando "..."
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026 — v0.9.0
 */

export interface SceneNarration {
  id: string;
  title: string;
  durationSec: number;
  text: string;
}

export const narrations: SceneNarration[] = [
  {
    id: "S01",
    title: "Gancho",
    durationSec: 25,
    text: `¿Y si tu agente de IA pudiera evolucionar su propia inteligencia?
... GSEP transforma prompts estáticos en sistemas vivos que aprenden solos.
... Mira cómo se adapta, mejora y se auto-repara automáticamente.
... Solo tres líneas de código. Sin reentrenamiento. Sin fine-tuning.`,
  },
  {
    id: "S02",
    title: "Propuesta Principal",
    durationSec: 30,
    text: `GSEP es una mejora directa para cualquier agente de IA.
... Sin reentrenamiento costoso. Sin fine-tuning complejo.
... Solo tres líneas de código, y tu agente empieza a aprender.
... Compatible con Claude, GPT-4, Gemini y más.`,
  },
  {
    id: "S03",
    title: "El Problema",
    durationSec: 25,
    text: `Los agentes de IA tradicionales sufren cuatro problemas críticos.
... Prompts estáticos. Ajuste manual. Degradación invisible. Conocimiento aislado.
... Cada problema se acumula, haciendo los agentes poco fiables a escala.
... GSEP resuelve los cuatro, automáticamente.`,
  },
  {
    id: "S04",
    title: "Cromosomas",
    durationSec: 60,
    text: `GSEP usa una arquitectura de cinco cromosomas.
... C-cero es el ADN inmutable, con protección SHA-256.
Define la identidad principal, la ética y las reglas de seguridad que nunca cambian.
... C-uno contiene genes operativos que evolucionan lentamente mediante validación.
El uso de herramientas, patrones de código y estrategias de razonamiento mejoran con el tiempo.
... C-dos se adapta rápidamente a las preferencias de cada usuario.
El estilo de comunicación, formato y comportamiento se ajustan por usuario, a diario.
... C-tres es el firewall de contenido, con 53 patrones de seguridad.
Defiende contra inyección de prompts, secuestro de roles y exfiltración de datos.
... C-cuatro es el sistema inmune conductual. Seis verificaciones deterministas detectan si la propia respuesta del agente fue manipulada, con cuarentena automática y auto-reparación.
... Juntos, crean un sistema inteligente por capas.`,
  },
  {
    id: "S05",
    title: "Ciclo de Evolución",
    durationSec: 75,
    text: `GSEP sigue un ciclo de evolución de cuatro fases.
... Primero, transcripción. Cada interacción se registra con métricas de calidad.
Tasa de éxito, eficiencia de tokens, latencia y satisfacción del usuario se rastrean.
... Luego, variación. El sistema genera mutaciones usando ocho operadores.
Desde reemplazo de sinónimos y reformulación de instrucciones, hasta expansión y compresión de prompts.
... Después, simulación. Los candidatos se prueban en un entorno sandbox.
Cada mutación se ejecuta contra escenarios históricos para medir la mejora.
... Finalmente, selección. Solo las mejoras que pasan las cuatro puertas se despliegan.
Significancia estadística, verificaciones de seguridad, capacidad de rollback y ganancia de fitness.
... El despliegue canario distribuye los cambios gradualmente, con rollback automático si el rendimiento baja.`,
  },
  {
    id: "S06",
    title: "Fitness 6D",
    durationSec: 50,
    text: `El sistema de fitness evalúa el rendimiento del agente en seis dimensiones.
... Calidad mide la coherencia y corrección del output.
Tasa de éxito rastrea las tareas completadas exitosamente.
Eficiencia de tokens mide la compresión cognitiva.
Latencia rastrea el tiempo de respuesta en milisegundos.
Costo por éxito mide la eficiencia económica.
Y la tasa de intervención rastrea las correcciones manuales necesarias.
... Estas métricas se combinan en una puntuación compuesta con importancia ponderada.
... La confianza escala con el tamaño de muestra, alcanzando el 95% con 200 o más muestras.`,
  },
  {
    id: "S07",
    title: "Detección de Drift",
    durationSec: 55,
    text: `La detección de drift permite monitoreo proactivo del rendimiento.
... El sistema rastrea métricas a lo largo del tiempo para identificar patrones de degradación.
Cuando se detecta drift, el sistema alerta y se prepara para reparar.
... Se monitorean cinco tipos de drift: tasa de éxito, eficiencia, latencia, costo e intervención.
... La severidad se categoriza de menor a crítica, activando respuestas apropiadas.
... El drift crítico activa rollback de emergencia y auto-reparación.
Sin intervención manual necesaria. Tu agente se recupera solo.`,
  },
  {
    id: "S08",
    title: "Agente Vivo — 10 Capas Cognitivas",
    durationSec: 90,
    text: `El Agente Vivo integra diez capas cognitivas para una genuina auto-conciencia.
... El Self-Model permite al agente conocer sus propias fortalezas y debilidades.
... La Metacognición proporciona introspección antes y después de cada respuesta.
Antes de cada respuesta, el agente evalúa su nivel de confianza.
... El Modelo Emocional detecta las emociones del usuario y adapta el tono de comunicación.
... La Autonomía Calibrada aprende cuándo actuar independientemente versus pedir orientación.
... La Memoria de Patrones recuerda patrones de interacción exitosos.
... La Narrativa Personal rastrea el historial de relación con cada usuario.
... La Memoria Analítica mantiene un grafo de conocimiento de entidades y relaciones.
... El Self-Model Mejorado rastrea la alineación de propósito y capacidades en evolución.
... La Supervivencia de Propósito implementa una máquina de estados de próspero a crítico.
Cuando la alineación de propósito baja, el agente entra en modo supervivencia.
... La Autonomía Estratégica permite la toma de decisiones estratégicas basadas en objetivos.
... Juntas, estas capas crean un agente genuinamente auto-consciente.`,
  },
  {
    id: "S09",
    title: "Firewall de Contenido C3",
    durationSec: 45,
    text: `C-tres, el Firewall de Contenido, protege contra siete categorías de ataques.
... La inyección de prompts intenta anular las instrucciones del sistema.
El secuestro de roles intenta cambiar la identidad del agente.
La exfiltración de datos intenta robar datos de la conversación.
La evasión por codificación usa trucos como Base64 para eludir la detección.
La escalación de privilegios intenta obtener acceso no autorizado.
La anulación de instrucciones intenta inyectar nuevos mensajes de sistema.
Y el contrabando de contenido oculta contenido malicioso en escenarios hipotéticos.
... Tres mecanismos de defensa trabajan juntos: etiquetado de contenido, detección de patrones y registro de confianza.
... El sistema soporta cinco idiomas principales para protección global.
Sin dependencias externas. Máxima seguridad.`,
  },
  {
    id: "S10",
    title: "Banco de Genes + Marketplace",
    durationSec: 60,
    text: `El Banco de Genes almacena genes localmente probados con puntuaciones de fitness altas.
Cada gen ha sido validado mediante rendimiento real.
... El Marketplace de GSEP es como npm para comportamientos de IA.
Los desarrolladores publican genes probados, otros los adoptan.
... Siete tipos de genes están disponibles: uso de herramientas, razonamiento, comunicación, recuperación de errores, gestión de contexto, flujos de trabajo y experiencia de dominio.
... La adopción sigue un proceso de seguridad de tres pasos.
Primero, verificación de compatibilidad. Luego, prueba sandbox. Finalmente, integración segura.
... Los niveles de calidad aseguran que solo genes probados estén disponibles.
Desde experimental hasta élite certificada.`,
  },
  {
    id: "S11",
    title: "Integración en 3 Pasos",
    durationSec: 45,
    text: `Integrar GSEP toma solo tres pasos.
... Primero, instala el paquete core y tu adaptador LLM.
Soportamos Claude, GPT-4, Gemini, Ollama y Perplexity.
... Segundo, inicializa PGA con tu LLM y almacenamiento elegidos.
Crea un genoma para tu agente. Es tu contenedor evolutivo.
... Tercero, reemplaza tu llamada LLM existente con genome punto chat.
Es literalmente un cambio de una línea.
... Eso es todo. Tu agente ahora evoluciona.`,
  },
  {
    id: "S12",
    title: "Configuración",
    durationSec: 50,
    text: `La configuración te da control sobre el comportamiento evolutivo.
... Empieza con una configuración mínima.
Activa la evolución continua, establece la frecuencia, y auto-muta al detectar drift.
... O ve al agente vivo completo.
Activa self-model, metacognición y modelado emocional.
Agrega autonomía calibrada, narrativa personal y memoria analítica.
Desbloquea self-model mejorado, supervivencia de propósito y autonomía estratégica.
... Empieza simple. Mejora cuando veas valor.`,
  },
  {
    id: "S13",
    title: "Prueba de Valor",
    durationSec: 70,
    text: `No te fíes de nuestra palabra. Demuéstralo tú mismo.
... Ejecuta el script de prueba de valor.
Cinco ciclos. Diez interacciones cada uno.
... Veredicto: mejora demostrada. Más dieciséis por ciento de calidad.
... Observa cómo la calidad sube de cero punto cinco a cero punto cinco ocho.
El uso de tokens aumenta conforme el agente aprende a ser más riguroso.
... El gráfico de líneas muestra la trayectoria evolutiva.
... Datos duros, no promesas. Demuestra el ROI a tu equipo.`,
  },
  {
    id: "S14",
    title: "Ejemplos Reales",
    durationSec: 60,
    text: `GSEP funciona donde sea que viva tu agente.
... ¿API con Express? Reemplazo de una línea.
Pasa el mensaje del usuario y el ID. La evolución ocurre automáticamente.
... ¿Bot de Discord? Mismo patrón.
Intercepta el mensaje, llama genome-chat, responde.
... ¿LangChain? Reemplaza tu llamada LLM dentro de cualquier cadena.
... GSEP es middleware. Se ubica entre tu agente y el LLM.
Cero refactorización. Máxima evolución.`,
  },
  {
    id: "S15",
    title: "Soporte Multi-Modelo",
    durationSec: 40,
    text: `GSEP es agnóstico al modelo. Usa cualquier LLM.
... Anthropic Claude. Haiku, Sonnet, Opus.
OpenAI. GPT-4, GPT-4-Turbo.
Google Gemini. Pro y Flash.
Ollama para modelos locales. Llama, Mistral, CodeLlama.
Perplexity para generación aumentada con búsqueda web.
... ¿Quieres agregar tu propio modelo?
Implementa un método. Eso es todo.`,
  },
  {
    id: "S16",
    title: "Tres Pilares de la Vida",
    durationSec: 60,
    text: `La versión cero punto siete introduce los tres pilares de la vida.
... Pilar uno: Self-Model Mejorado. ¿Quién soy?
Alineación de propósito, seguimiento de capacidades, trayectoria evolutiva.
El agente rastrea su salud integrada en todas las dimensiones.
... Pilar dos: Supervivencia de Propósito. ¿Estoy en peligro?
Una máquina de estados con cinco modos: próspero, estable, estresado, supervivencia, crítico.
... Pilar tres: Autonomía Estratégica. ¿Qué debo hacer?
Priorización evolutiva, mutación adaptativa, rechazo de tareas cuando está sobrecargado.
... No es consciencia. Es auto-conciencia genuina.`,
  },
  {
    id: "S17",
    title: "Benchmarks",
    durationSec: 50,
    text: `¿Cuál es el impacto en rendimiento?
... Satisfacción del usuario: sube veinticinco por ciento.
Tasa de éxito de tareas: sube dieciocho por ciento.
Eficiencia de tokens: sube doce por ciento.
Retención de usuarios: sube treinta y cuatro por ciento.
Intervenciones manuales: bajan cuarenta y cinco por ciento.
... Medido con nuestra suite de benchmarks estándar en más de veinte configuraciones.`,
  },
  {
    id: "S18",
    title: "Licenciamiento",
    durationSec: 40,
    text: `GSEP es open source y sostenible.
... El motor core, adaptadores y CLI tienen licencia MIT. Gratis para siempre. Úsalo donde quieras.
... Gene Registry tiene Business Source License.
Gratis para usar. Se convierte a Apache 2.0 en 2029.
... GSEP Cloud y las funciones Enterprise son propietarias.
... Desarrolladores individuales y equipos pequeños: cien por ciento gratis.
Empresas a escala: contribuyan.`,
  },
  {
    id: "S19",
    title: "Empieza Ya",
    durationSec: 45,
    text: `¿Listo para empezar?
... Lee la documentación en gsepcore punto com slash docs.
Danos una estrella en GitHub.
Únete a nuestra comunidad en Discord.
O instala ahora con npm install arroba pga-ai slash core.
... Tu agente, pero vivo. Empieza ahora.`,
  },
  {
    id: "S20",
    title: "Cierre",
    durationSec: 30,
    text: `Tu agente... pero vivo.
... Genomic Self-Evolving Prompts. Versión cero punto nueve.
Patentado. Licencia MIT. Listo para producción.
... Creado por Luis Alfredo Velasquez Duran.
... Deja que tu agente evolucione.`,
  },
];
