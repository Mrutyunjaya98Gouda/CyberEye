import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PredictRequest {
  domain: string;
  existingSubdomains?: string[];
  type: 'predict' | 'analyze' | 'recommend';
}

const AI_GATEWAY_URL = "https://api.openai.com/v1/chat/completions";

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    throw new Error("AI API key not configured");
  }

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("AI API error:", error);
    throw new Error(`AI API failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

async function predictSubdomains(domain: string, existing: string[]): Promise<string[]> {
  const systemPrompt = `You are a cybersecurity expert specializing in subdomain enumeration and attack surface reconnaissance. 
Your task is to predict likely subdomain names for a given domain based on common patterns, industry standards, and your knowledge of typical infrastructure setups.

Rules:
- Only output valid subdomain prefixes, one per line
- Do not include the domain itself
- Focus on realistic, commonly used subdomain patterns
- Consider the domain's likely industry/purpose
- Output between 20-50 predictions
- Do not include explanations, just the subdomain prefixes`;

  const existingPrefixes = existing.map(s => s.replace(`.${domain}`, '')).slice(0, 20);

  const prompt = `Domain: ${domain}

Already discovered subdomains:
${existingPrefixes.join('\n')}

Based on this domain and the patterns in existing subdomains, predict additional likely subdomain prefixes that might exist. Consider:
1. Common naming conventions (api-v2, staging-new, etc.)
2. Department names (hr, finance, legal)
3. Environment patterns (dev, prod, staging)
4. Service patterns (auth, sso, login)
5. Infrastructure patterns (vpn, proxy, gateway)

Output only the subdomain prefixes, one per line:`;

  const response = await callAI(prompt, systemPrompt);

  // Parse the response to extract subdomain predictions
  const predictions = response
    .split('\n')
    .map(line => line.trim().toLowerCase())
    .filter(line => line && !line.includes(' ') && line.length < 64)
    .filter(line => !existing.some(e => e.startsWith(line + '.')))
    .slice(0, 50);

  return predictions;
}

async function analyzeSubdomains(domain: string, subdomains: string[]): Promise<any> {
  const systemPrompt = `You are a senior penetration tester and attack surface analyst. 
Analyze the provided subdomain list and provide security insights.

Output format must be valid JSON with this structure:
{
  "riskLevel": "low|medium|high|critical",
  "summary": "Brief overall assessment",
  "findings": [
    {
      "type": "category",
      "severity": "info|low|medium|high|critical",
      "description": "finding description",
      "subdomains": ["affected", "subdomains"]
    }
  ],
  "recommendations": ["actionable recommendations"]
}`;

  const prompt = `Analyze the attack surface for domain: ${domain}

Discovered subdomains:
${subdomains.slice(0, 100).join('\n')}

Provide a security analysis including:
1. Overall risk assessment
2. Notable patterns or concerns
3. Potential security issues
4. Recommendations for security hardening`;

  const response = await callAI(prompt, systemPrompt);

  // Try to parse JSON response
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse AI response as JSON");
  }

  // Fallback response
  return {
    riskLevel: "medium",
    summary: response.slice(0, 500),
    findings: [],
    recommendations: ["Review subdomain security posture manually"]
  };
}

async function getRecommendations(domain: string, subdomains: string[]): Promise<string[]> {
  const systemPrompt = `You are a cybersecurity consultant. Provide brief, actionable security recommendations based on the subdomain landscape.
Output only the recommendations as a numbered list, one per line.`;

  const prompt = `Domain: ${domain}
Total subdomains: ${subdomains.length}

Sample subdomains:
${subdomains.slice(0, 30).join('\n')}

Provide 5-10 specific, actionable security recommendations based on this attack surface:`;

  const response = await callAI(prompt, systemPrompt);

  return response
    .split('\n')
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(line => line.length > 10)
    .slice(0, 10);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("AI predict function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, existingSubdomains = [], type = 'predict' }: PredictRequest = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: "Domain is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${type} request for domain: ${domain}`);

    let result: any;

    switch (type) {
      case 'predict':
        const predictions = await predictSubdomains(domain, existingSubdomains);
        result = { predictions, count: predictions.length };
        break;

      case 'analyze':
        result = await analyzeSubdomains(domain, existingSubdomains);
        break;

      case 'recommend':
        const recommendations = await getRecommendations(domain, existingSubdomains);
        result = { recommendations };
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid type. Use 'predict', 'analyze', or 'recommend'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in AI predict function:", error.message);
    return new Response(
      JSON.stringify({ error: "AI prediction failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
