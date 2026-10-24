export const EXAMPLE_JSON = {
  titulo: 'Historia Argentina - Parcial 1',
  descripcion: 'Preguntas de repaso sobre 1806-1820',
  preguntas: [
    {
      tipo: 'multiple_choice',
      consigna: '¿En qué año fue la Revolución de Mayo?',
      opciones: ['1806', '1810', '1816', '1820'],
      correctas: [1],
      explicacion: 'El 25 de mayo de 1810 se formó la Primera Junta.',
    },
    {
      tipo: 'seleccion_multiple',
      consigna: '¿Cuáles de estos fueron virreyes del Río de la Plata?',
      opciones: ['Santiago de Liniers', 'Manuel Belgrano', 'Baltasar Hidalgo de Cisneros', 'Mariano Moreno'],
      correctas: [0, 2],
    },
    {
      tipo: 'verdadero_falso',
      consigna: 'La Declaración de la Independencia se firmó en Tucumán en 1816.',
      respuesta: true,
    },
    {
      tipo: 'completar',
      consigna: 'La Primera Junta fue presidida por ___ y su secretario fue ___.',
      respuestas: [['Cornelio Saavedra', 'Saavedra'], ['Mariano Moreno', 'Moreno', 'Juan José Paso', 'Paso']],
    },
    {
      tipo: 'texto',
      consigna: '¿Quién creó la bandera argentina?',
      respuestas: ['Manuel Belgrano', 'Belgrano'],
    },
    {
      tipo: 'unir',
      consigna: 'Uní cada hecho con su año.',
      pares: [
        ['Primera invasión inglesa', '1806'],
        ['Revolución de Mayo', '1810'],
        ['Declaración de la Independencia', '1816'],
      ],
    },
    {
      tipo: 'ordenar',
      consigna: 'Ordená los hechos del más antiguo al más reciente.',
      pasos: ['Invasiones inglesas', 'Revolución de Mayo', 'Asamblea del Año XIII', 'Congreso de Tucumán'],
    },
  ],
}

export const AI_PROMPT = `Quiero que conviertas el material que te paso abajo en un banco de preguntas para estudiar, en formato JSON, para cargarlo en la página estud.ia.

Devolvé SOLO el JSON (sin texto antes ni después, sin comentarios), con esta estructura exacta:

{
  "titulo": "Nombre corto del test",
  "descripcion": "Descripción opcional",
  "preguntas": [ ... ]
}

Cada pregunta tiene "tipo", "consigna" y, opcionalmente, "explicacion" (se muestra después de responder). Los tipos posibles son:

1. "multiple_choice": una sola opción correcta.
   { "tipo": "multiple_choice", "consigna": "...", "opciones": ["A", "B", "C", "D"], "correctas": [1] }
   "correctas" tiene UN solo índice; los índices empiezan en 0 (la primera opción es 0).

2. "seleccion_multiple": una o más opciones correctas (el alumno tiene que marcar todas).
   { "tipo": "seleccion_multiple", "consigna": "...", "opciones": ["A", "B", "C", "D"], "correctas": [0, 2] }

3. "verdadero_falso":
   { "tipo": "verdadero_falso", "consigna": "Afirmación...", "respuesta": true }
   "respuesta" es true o false (booleano, sin comillas).

4. "completar": la consigna lleva uno o más huecos escritos como ___ (tres guiones bajos).
   { "tipo": "completar", "consigna": "La capital de Francia es ___.", "respuestas": [["París", "Paris"]] }
   "respuestas" tiene UNA lista por cada hueco, en orden, con todas las variantes aceptadas para ese hueco.

5. "texto": el alumno escribe la respuesta libremente (la corrige una IA comparándola con las respuestas correctas).
   { "tipo": "texto", "consigna": "...", "respuestas": ["Respuesta modelo", "Otra forma válida"] }

6. "unir": el alumno une con flechas cada elemento de la izquierda con su pareja de la derecha (de 2 a 10 pares).
   { "tipo": "unir", "consigna": "Uní cada país con su capital.", "pares": [["Francia", "París"], ["Italia", "Roma"], ["Japón", "Tokio"]] }
   Cada par es ["izquierda", "derecha"] y está correcto así: la página mezcla la columna derecha sola.

7. "ordenar": el alumno ordena pasos o hechos (de 2 a 12).
   { "tipo": "ordenar", "consigna": "Ordená las etapas de la mitosis.", "pasos": ["Profase", "Metafase", "Anafase", "Telofase"] }
   Escribí los "pasos" en el orden CORRECTO: la página los desordena sola.

Reglas:
- Usá comillas dobles, sin comas finales y sin comentarios: tiene que ser JSON válido.
- Mezclá los tipos de pregunta y cubrí todos los temas importantes del material.
- Las opciones incorrectas tienen que ser creíbles, no obvias.
- No repitas preguntas.
- Generá [CANTIDAD] preguntas.

Material:
[PEGÁ ACÁ TUS APUNTES, RESUMEN O TEMAS]`
