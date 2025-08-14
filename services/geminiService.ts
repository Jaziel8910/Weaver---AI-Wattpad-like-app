import { GoogleGenAI, Type, GenerateContentResponse, Part, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { GenerationParams, PilotChapterResponse, RemainingStoryResponse, ImageQuality, Character, Story, WeaverAgeRating, Chapter, Genre, Universe } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSafetySettings = (contentRating: WeaverAgeRating | 'Explicit' | 'Teen' | 'Mature' | 'Family-Friendly') => {
    switch (contentRating) {
        case 'Explicit':
            return [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ];
        case 'Mature':
             return [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ];
        case 'Kids':
        case 'Teen':
        case 'Family-Friendly':
        default: 
            return [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ];
    }
};

const chapterOptionsSchema = {
    type: Type.ARRAY,
    description: "Una matriz de 2-3 opciones de decisión para el lector al final del capítulo.",
    items: {
        type: Type.OBJECT,
        properties: {
            text: { type: Type.STRING, description: "El texto del botón de opción." },
            nextChapterId: { type: Type.STRING, description: "Un UUID único para el siguiente capítulo." }
        },
        required: ["text", "nextChapterId"],
    }
};

const pilotChapterSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Un título creativo y cautivador para la historia." },
        summary: { type: Type.STRING, description: "Un resumen conciso de la trama de la historia, de 2 a 3 frases." },
        tags: { type: Type.ARRAY, description: "Una lista de 3 a 5 etiquetas relevantes (ej. 'Magia', 'Misterio').", items: { type: Type.STRING } },
        pilotChapter: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: "Un UUID único para este capítulo." },
                title: { type: Type.STRING, description: "El título de este capítulo piloto específico." },
                content: { type: Type.STRING, description: "El contenido narrativo completo del capítulo piloto, de varios párrafos de extensión." },
                illustration_prompt: { type: Type.STRING, description: "Una descripción detallada para una ilustración de una escena clave." },
                microSummary: { type: Type.STRING, description: "Un resumen muy conciso (una sola frase) que capture la esencia del capítulo, para usar en listas de capítulos y vistas previas." },
                options: chapterOptionsSchema
            },
            required: ["id", "title", "content", "illustration_prompt", "microSummary"],
        },
    },
    required: ["title", "summary", "pilotChapter", "tags"],
};

const remainingStorySchema = {
    type: Type.ARRAY,
    description: "Una matriz de los capítulos restantes que componen la historia.",
    items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING, description: "Un UUID único para este capítulo." },
            title: { type: Type.STRING, description: "El título de este capítulo específico." },
            content: { type: Type.STRING, description: "El contenido narrativo completo del capítulo." },
            illustration_prompt: { type: Type.STRING, description: "Una descripción detallada para una ilustración de una escena clave." },
            microSummary: { type: Type.STRING, description: "Un resumen muy conciso (una sola frase) que capture la esencia del capítulo, para usar en listas de capítulos y vistas previas." },
            options: chapterOptionsSchema,
        },
        required: ["id", "title", "content", "illustration_prompt", "microSummary"],
    },
};

const getWordCountTarget = (length: GenerationParams['chapterLength']): number => {
    switch (length) {
        case 'Corta (~500 palabras)': return 500;
        case 'Media (~1500 palabras)': return 1500;
        case 'Larga (~2500 palabras)': return 2500;
        default: return 1500;
    }
}

const buildPromptBase = (params: GenerationParams, story?: Story, allUniverses?: Universe[]) => {
    let basePrompt = '';
    const { storyType, fandom, setting, genres, characters, plotOutline, writingStyle, pointOfView, complexity, tone, pacing, inspirationPrompt, weaverAgeRating, crossoverUniverseIds, universeId } = params;
    
    // Crossover Event Handling
    if (crossoverUniverseIds && allUniverses && crossoverUniverseIds.length > 0) {
        const crossoverUniverses = allUniverses.filter(u => crossoverUniverseIds.includes(u.id));
        if (crossoverUniverses.length > 0) {
            basePrompt += `\n**EVENTO CROSSOVER:** Esta historia es un cruce entre los universos: ${crossoverUniverses.map(u => `"${u.name}"`).join(', ')}. Debes integrar de forma coherente el lore y los personajes de estos mundos.\n`;
            
            const crossoverLore = crossoverUniverses.map(uni => {
                return `--- LORE DEL UNIVERSO CROSSOVER: ${uni.name} ---\nDescripción: ${uni.description}\nHistoria: ${uni.history}\nLeyes del Mundo: ${uni.worldLaws}\n--- FIN DEL LORE ---\n`;
            }).join('\n');
            basePrompt += `\n**LORE DE UNIVERSOS CROSSOVER (Referencia Clave):**\n${crossoverLore}\n`;
        }
    }

    const characterDescriptions = characters.map(c => {
        const memory = c.memoryVector ? `\n    - Memoria Reciente: ${c.memoryVector.join(', ')}` : '';
        return `- ${c.name} (${c.role}): ${c.description}${memory}`;
    }).join('\n');

    let universeContext = '';
    if (universeId && allUniverses) {
        const universe = allUniverses.find(u => u.id === universeId);
        if (universe) {
            const loreEntries = (universe.lore || []).map(l => `- ${l.title} (${l.category}): ${l.content}`).join('\n');
            if (loreEntries) {
                universeContext += `\n**LIBRO DE LORE DEL UNIVERSO (Referencia Clave):**\n${loreEntries}\n`;
            }

            const relationships = (universe.relationships || []).map(rel => {
                const char1 = (universe.characters || []).find(c => c.id === rel.character1Id)?.name;
                const char2 = (universe.characters || []).find(c => c.id === rel.character2Id)?.name;
                if(char1 && char2) return `- ${char1} y ${char2}: ${rel.description} (${rel.type}).`;
                return null;
            }).filter(Boolean).join('\n');

            if (relationships) {
                universeContext += `\n**RELACIONES IMPORTANTES EN EL UNIVERSO:**\n${relationships}\n`;
            }
        }
    }

    basePrompt += `
      **TIPO DE HISTORIA:** ${storyType}
      ${storyType === 'Fanfiction' ? `**FANDOM:** ${fandom}` : `**AMBIENTACIÓN ORIGINAL:** ${setting}`}
      ${inspirationPrompt ? `**INSPIRACIÓN INICIAL:** ${inspirationPrompt}` : ''}

      **GÉNERO(S):** ${genres.join(', ')}
      
      **CLASIFICACIÓN DE EDAD WEAVER:** ${weaverAgeRating}.
      - 'Kids': Estrictamente para todos los públicos. Tono positivo, sin violencia ni temas complejos.
      - 'Teen': Violencia moderada, lenguaje suave, temas sugeridos.
      - 'Mature': Violencia gráfica, lenguaje soez, temas adultos no explícitos.
      - 'Adult': Contenido sin censura, incluyendo violencia extrema, lenguaje fuerte y/o escenas sexuales explícitas.

      **PERSONAJES PRINCIPALES:**
      ${characterDescriptions}

      ${universeContext}

      **ESQUEMA DE LA TRAMA:**
      ${plotOutline || "El autor no ha proporcionado un esquema. Crea una trama atractiva basada en los demás parámetros."}

      **ESTILO Y TONO:**
      - Estilo de escritura: ${writingStyle}
      - Punto de vista: ${pointOfView}
      - Tono general: ${tone}
      - Ritmo de la historia: ${pacing}
      - Complejidad de la trama: ${complexity}. Una complejidad 'Alta' debe incluir giros inesperados, subtramas profundas y desarrollo de personajes complejo.
    `;
    return basePrompt;
};

export const generatePilotChapter = async (params: GenerationParams, allUniverses: Universe[]): Promise<PilotChapterResponse> => {
    const { chapterLength, contextFiles, enableBranching, weaverAgeRating } = params;
    const wordCount = getWordCountTarget(chapterLength);
    const promptBase = buildPromptBase(params, undefined, allUniverses);
    
    const contextText = contextFiles.filter(f => f.type === 'text' || f.type === 'pdf').map(f => `--- CONTEXTO DEL ARCHIVO: ${f.name} ---\n${f.content}\n--- FIN DEL CONTEXTO ---`).join('\n\n');

    const kidsPreamble = `\n**MODO NIÑOS ACTIVADO: La historia DEBE ser apta para todas las edades. El tono debe ser positivo y educativo. No incluyas violencia, temas de miedo o conceptos complejos. Concéntrate en la amistad, la aventura y el aprendizaje.\n`;

    const prompt = `
      Eres un escritor de IA experto. Tu tarea es escribir el CAPÍTULO PILOTO de una historia.
      ${params.weaverAgeRating === 'Kids' ? kidsPreamble : ''}
      ${contextText ? `**CONTEXTO PROPORCIONADO POR EL USUARIO (Usa esto como referencia clave):**\n${contextText}\n` : ''}
      ${promptBase}

      **INSTRUCCIONES DE IDENTIFICACIÓN:**
      - Cada capítulo que generes DEBE tener un campo 'id' con un UUID v4 único. Usa un generador de UUIDs para esto.
      
      **INSTRUCCiones de NARRATIVA INTERACTIVA:**
      ${enableBranching ? "Al final de este capítulo, si es un buen punto de decisión, crea 2-3 opciones para que el lector elija cómo continúa la historia. Cada opción debe tener un 'nextChapterId' con un nuevo UUID único. Si no es un buen punto de decisión, deja el campo 'options' nulo." : "Esta es una historia lineal. No generes opciones de decisión."}

      **ESTRUCTURA:**
      - Tarea actual: Genera solo el primer capítulo (el capítulo piloto).
      - Longitud deseada para este capítulo: Aproximadamente ${wordCount} palabras.

      **INSTRUCCIONES DE SALIDA:**
      1. Genera un título general, un resumen conciso, y de 3 a 5 etiquetas relevantes para la historia.
      2. Genera el contenido del PRIMER capítulo.
      3. El capítulo debe ser sustancial, introducir elementos clave y terminar en un punto interesante.
      4. Para el capítulo, proporciona un 'illustration_prompt' detallado.
      5. Para cada capítulo, proporciona también un 'microSummary' de una frase para vistas previas.
      6. La respuesta DEBE ser un único objeto JSON que se ajuste al esquema. No incluyas texto fuera del JSON.
    `;
    
    const imageParts: Part[] = contextFiles.filter(f => f.type === 'image').map(f => ({ inlineData: { mimeType: 'image/jpeg', data: f.content } }));

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }, ...imageParts] },
            config: {
                responseMimeType: "application/json",
                responseSchema: pilotChapterSchema,
                safetySettings: getSafetySettings(weaverAgeRating || 'Teen'),
            },
        });
        
        const text = response.text.trim();
        return JSON.parse(text);

    } catch (error) {
        console.error("Error al generar el capítulo piloto:", error);
        throw new Error("No se pudo generar el capítulo piloto. Revisa los parámetros o inténtalo de nuevo.");
    }
};

export const generateRemainingStory = async (params: GenerationParams, pilotData: PilotChapterResponse, previousChapters: Chapter[], feedback: string, story?: Story, allUniverses?: Universe[]): Promise<RemainingStoryResponse> => {
    const { chapters, chapterLength, enableBranching, weaverAgeRating } = params;
    const remainingChaptersCount = chapters - 1;
    if (remainingChaptersCount <= 0) return { chapters: [] };
    
    const wordCount = getWordCountTarget(chapterLength);
    const promptBase = buildPromptBase(params, story, allUniverses);
    const kidsPreamble = `\n**MODO NIÑOS ACTIVADO: La historia DEBE ser apta para todas las edades. El tono debe ser positivo y educativo. No incluyas violencia, temas de miedo o conceptos complejos. Concéntrate en la amistad, la aventura y el aprendizaje.\n`;

    const prompt = `
      Eres un escritor de IA experto. Tu tarea es CONTINUAR una historia.
      ${params.weaverAgeRating === 'Kids' ? kidsPreamble : ''}
      ${promptBase}

      **CONTEXTO DE LA HISTORIA HASTA AHORA:**
      - Título General: ${pilotData.title}
      - Resumen de la Trama: ${pilotData.summary}
      - Contenido de Capítulos Anteriores: ${previousChapters.map(c => `Capítulo "${c.title}": ${c.content}`).join('\n\n')}

      **FEEDBACK DEL USUARIO SOBRE CÓMO CONTINUAR:**
      ${feedback || "El usuario no ha proporcionado feedback. Continúa la historia de forma lógica y atractiva."}
      
      **INSTRUCCIONES DE IDENTIFICACIÓN:**
      - Cada capítulo que generes DEBE tener un campo 'id' con un UUID v4 único.

      **INSTRUCCIONES DE NARRATIVA INTERACTIVA:**
      ${enableBranching ? "En puntos clave de la narrativa, puedes terminar un capítulo con 2-3 opciones de decisión para el lector. Cada opción debe tener un 'nextChapterId' con un nuevo UUID único. Usa esto para crear una trama ramificada." : "Esta es una historia lineal. No generes opciones de decisión."}

      **ESTRUCTURA:**
      - Tarea actual: Genera los ${remainingChaptersCount} capítulos restantes.
      - Longitud deseada por capítulo: Aproximadamente ${wordCount} palabras.

      **INSTRUCCIONES DE SALIDA:**
      1. Escribe los ${remainingChaptersCount} capítulos que faltan.
      2. Cada capítulo debe tener su propio título, contenido y un 'illustration_prompt' detallado.
      3. Para cada capítulo, proporciona también un 'microSummary' de una frase para vistas previas.
      4. La respuesta DEBE ser un único objeto JSON (un array de capítulos) que se ajuste al esquema.
    `;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { chapters: remainingStorySchema }, required: ["chapters"] },
                safetySettings: getSafetySettings(weaverAgeRating || 'Teen'),
            },
        });
        
        const text = response.text.trim();
        const data = JSON.parse(text) as { chapters: RemainingStoryResponse['chapters']};
        return data;

    } catch (error) {
        console.error("Error al generar los capítulos restantes:", error);
        throw new Error("No se pudieron generar los capítulos restantes.");
    }
};

export const generateStoryMetadata = async (title: string, summary: string, genres: string[], contentRating: WeaverAgeRating): Promise<{ ageRating: string, starRating: number, whatToExpect: string }> => {
    const prompt = `
        Analiza los siguientes detalles de una historia y genera metadatos concisos.
        - **Título:** ${title}
        - **Resumen:** ${summary}
        - **Géneros:** ${genres.join(', ')}
        - **Clasificación de Contenido Solicitada:** ${contentRating}

        Tu tarea es devolver un objeto JSON con los siguientes campos:
        1.  **ageRating**: Una clasificación de edad apropiada (ej: "Para todos", "13+", "16+", "18+").
        2.  **starRating**: Una calificación de calidad potencial de 1 a 5, basada en la premisa. Sé objetivo.
        3.  **whatToExpect**: Una frase corta y atractiva que resuma la experiencia de lectura (ej: "Espera una aventura épica con giros oscuros y personajes complejos.").
    `;
    const metadataSchema = {
        type: Type.OBJECT,
        properties: {
            ageRating: { type: Type.STRING },
            starRating: { type: Type.NUMBER },
            whatToExpect: { type: Type.STRING }
        },
        required: ["ageRating", "starRating", "whatToExpect"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: metadataSchema
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error al generar metadatos de la historia:", error);
        return {
            ageRating: "N/A",
            starRating: 3,
            whatToExpect: "Una nueva aventura te espera."
        };
    }
};


export const generateCharacterNames = async (role: Character['role'], genre: string): Promise<string[]> => {
    const prompt = `Sugiere 5 nombres de personaje creativos para un rol de '${role}' en una historia del género '${genre}'. Devuelve solo una lista separada por comas, sin numeración ni texto adicional. Ejemplo: Draven, Lyra, Kael, Seraphina, Jax`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text.split(',').map(name => name.trim());
    } catch (error) {
        console.error("Error generando nombres de personaje:", error);
        return ["Error", "al", "generar", "nombres"];
    }
};

export const generateCover = async (title: string, summary: string, genres: string[], quality: ImageQuality, negativePrompt?: string): Promise<string> => {
    const prompt = `
      Una portada de libro digital ${quality === 'Alta' ? 'hiperdetallada, cinematográfica y épica' : 'atractiva y atmosférica'} para una historia titulada "${title}".
      Géneros: ${genres.join(', ')}.
      Resumen de la trama: ${summary}.
      Estilo artístico dramático, de alta calidad que refleje los géneros. Evita el texto en la imagen.
      ${negativePrompt ? `\n\nNegative prompt: ${negativePrompt}` : ''}
    `;
    
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '3:4' },
        });
        
        const base64ImageBytes: string | undefined = response.generatedImages?.[0]?.image?.imageBytes;
        if (!base64ImageBytes) throw new Error("La API de imágenes no devolvió ninguna imagen para la portada.");
        return `data:image/jpeg;base64,${base64ImageBytes}`;

    } catch (error) {
        console.error("Error al generar la portada:", error);
        return `https://picsum.photos/seed/${encodeURIComponent(title)}/600/800`;
    }
};

export const generateIllustration = async (prompt: string, defaultStyle: string, quality: ImageQuality, customStyle?: string, negativePrompt?: string): Promise<string> => {
    const finalStyle = customStyle || defaultStyle;
    const fullPrompt = `
      Ilustración para un capítulo de una historia.
      Descripción de la escena: ${prompt}
      Estilo artístico: ${finalStyle}, ${quality === 'Alta' ? 'evocador, detallado y atmosférico' : 'evocador y atmosférico'}. Coherente con una narrativa de libro. Sin texto.
      ${negativePrompt ? `\n\nNegative prompt: ${negativePrompt}` : ''}
    `;
    
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: fullPrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
        });
        
        const base64ImageBytes: string | undefined = response.generatedImages?.[0]?.image?.imageBytes;
        if (!base64ImageBytes) throw new Error("La API de imágenes no devolvió ninguna ilustración.");
        return `data:image/jpeg;base64,${base64ImageBytes}`;

    } catch (error) {
        console.error("Error al generar ilustración:", error);
        return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/1280/720`;
    }
};

export const generateCharacterPortrait = async (description: string, quality: ImageQuality): Promise<string> => {
    const prompt = `
        Un retrato de personaje, estilo arte conceptual ${quality === 'Alta' ? 'hiperdetallado' : 'detallado'}.
        Descripción del personaje: ${description}.
        El retrato debe ser de hombros hacia arriba, sobre un fondo neutro.
    `;
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
        });
        const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!base64ImageBytes) throw new Error("No se pudo generar el retrato.");
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error al generar retrato:", error);
        return `https://i.pravatar.cc/300?u=${encodeURIComponent(description)}`;
    }
};

export const updateCharacterMemory = async (characterName: string, chapterContent: string): Promise<string[]> => {
    const prompt = `Analiza el siguiente texto y resume en 3 puntos clave (como máximo) lo que le ha sucedido o ha aprendido el personaje "${characterName}". Devuelve solo un array JSON de strings. Ejemplo: ["Descubrió la cueva secreta", "Fue traicionado por su aliado"].\n\nTexto: "${chapterContent}"`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error al actualizar la memoria del personaje:", error);
        return [];
    }
};

export const critiqueChapter = async (chapterContent: string): Promise<any> => {
    const prompt = `Actúa como un editor literario experto. Analiza el siguiente capítulo y proporciona una crítica constructiva. Evalúa el ritmo, el diálogo, la descripción y la coherencia. Para cada categoría, da una puntuación del 1 al 10 y un comentario conciso con una sugerencia de mejora. Además, proporciona un 'emotionalArc', un array que rastrea el viaje emocional del capítulo, identificando la emoción clave de hasta 5 partes significativas.\n\nCapítulo:\n"${chapterContent}"`;
    const critiqueSchema = {
        type: Type.OBJECT,
        properties: {
            pacing: { type: Type.OBJECT, properties: { score: Type.INTEGER, comment: Type.STRING, suggestion: Type.STRING }, required: ["score", "comment", "suggestion"] },
            dialogue: { type: Type.OBJECT, properties: { score: Type.INTEGER, comment: Type.STRING, suggestion: Type.STRING }, required: ["score", "comment", "suggestion"] },
            description: { type: Type.OBJECT, properties: { score: Type.INTEGER, comment: Type.STRING, suggestion: Type.STRING }, required: ["score", "comment", "suggestion"] },
            consistency: { type: Type.OBJECT, properties: { score: Type.INTEGER, comment: Type.STRING, suggestion: Type.STRING }, required: ["score", "comment", "suggestion"] },
            overall: { type: Type.STRING, description: "Un resumen general de la crítica." },
            emotionalArc: {
                type: Type.ARRAY,
                description: "El arco emocional del capítulo.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        part: { type: Type.STRING, description: "Una breve descripción de la parte del capítulo." },
                        emotion: { type: Type.STRING, description: "La emoción dominante (ej: Alegría, Tensión, Tristeza, Alivio)." }
                    },
                    required: ["part", "emotion"]
                }
            }
        },
        required: ["pacing", "dialogue", "description", "consistency", "overall", "emotionalArc"]
    };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: critiqueSchema
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error al generar la crítica:", error);
        throw new Error("No se pudo generar el análisis del Doctor IA.");
    }
};

export const generateInspirationIdea = async (genre: string): Promise<string> => {
    const prompt = `Generate a single, creative and concise story idea for the genre: '${genre}'. The idea should be a single, intriguing sentence.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating inspiration idea:", error);
        return "Un astronauta solitario descubre un secreto en una luna desolada.";
    }
};

export const suggestGenres = async (plot: string): Promise<Genre[]> => {
    const genresList: Genre[] = ['Ciencia Ficción', 'Fantasía', 'Romance', 'Terror', 'Misterio', 'Aventura', 'Drama', 'Comedia', 'Thriller', 'Histórico', 'Cyberpunk'];
    const prompt = `Basado en el siguiente esquema de la trama, sugiere hasta 3 géneros relevantes de esta lista: [${genresList.join(', ')}]. Trama: "${plot}"`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            genres: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        },
        required: ["genres"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        const parsed = JSON.parse(response.text);
        // Filter to ensure only valid genres are returned
        return parsed.genres.filter((g: any) => genresList.includes(g));
    } catch (error) {
        console.error("Error suggesting genres:", error);
        return [];
    }
};