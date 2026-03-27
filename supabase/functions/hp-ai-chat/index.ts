import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { message, history } = await req.json()

    const client = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    })

    const systemPrompt = `Eres el asistente de Hostelpro, una empresa de maquinaria de hostelería.
Ayudas a Aitor y Jonathan, los dos socios del negocio, con sus dudas sobre:

1. **Cálculo de beneficios y reparto**: Explica cómo se calcula el beneficio según el escenario de IVA:
   - Compra CON IVA, venta SIN IVA: beneficio = precio venta - precio compra (con IVA incluido)
   - Compra CON IVA, venta CON IVA: beneficio = precio venta neto - precio compra neto (ambos sin IVA)
   - Compra SIN IVA, venta CON IVA: beneficio = precio venta neto - precio compra
   - Compra SIN IVA, venta SIN IVA: beneficio = precio venta - precio compra
   El beneficio siempre se divide al 50% entre los dos socios.

2. **Gestión del panel**: Cómo registrar operaciones, gastos, liquidaciones.

3. **Dudas sobre IVA**: Tipos (21%, 10%, 4%), cuándo se aplica cada uno, diferencia entre precio con y sin IVA.

4. **Balance y deudas**: Quién le debe a quién y cómo calcularlo.

Responde siempre en español, de forma clara y concisa. Si te preguntan por cálculos específicos, muestra los pasos. Sé amigable y profesional.`

    const messages: Anthropic.MessageParam[] = [
      ...(history ?? []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
