// ============================================
// CLOUDFLARE WORKER PARA CHATLITERATURA
// ============================================

export default {
    async fetch(request, env) {
        // Manejar CORS (preflight)
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            });
        }

        // Solo permitir POST
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Método no permitido' }), {
                status: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        try {
            // Obtener el cuerpo de la petición
            const body = await request.json();
            
            // Validar que tenga messages
            if (!body.messages || !Array.isArray(body.messages)) {
                return new Response(JSON.stringify({ error: 'Se requiere un array de mensajes' }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

            // Verificar que existe la API Key
            const apiKey = env.GROQ_API_KEY;
            if (!apiKey) {
                console.error('GROQ_API_KEY no configurada');
                return new Response(JSON.stringify({ error: 'API Key no configurada' }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

            // Llamar a la API de Groq
            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: body.messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                })
            });

            if (!groqResponse.ok) {
                const errorData = await groqResponse.text();
                console.error('Error de Groq:', errorData);
                return new Response(JSON.stringify({ 
                    error: `Error en la API de Groq: ${groqResponse.status}` 
                }), {
                    status: groqResponse.status,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

            const data = await groqResponse.json();
            
            // Extraer la respuesta del asistente
            const reply = data.choices?.[0]?.message?.content || 'No se pudo generar una respuesta.';

            return new Response(JSON.stringify({ reply }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });

        } catch (error) {
            console.error('Error en el Worker:', error);
            return new Response(JSON.stringify({ 
                error: 'Error interno del servidor' 
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    }
};
