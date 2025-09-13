import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, dietaryRestrictions, customPrompt } = await req.json();

    console.log('Recipe generation request:', { ingredients, dietaryRestrictions, customPrompt });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build the prompt
    let prompt = "You are a professional chef and recipe creator. Create a detailed, delicious recipe based on the following requirements:\n\n";
    
    if (ingredients && ingredients.length > 0) {
      prompt += `Available ingredients: ${ingredients.join(', ')}\n`;
    }
    
    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      prompt += `Dietary restrictions: ${dietaryRestrictions.join(', ')}\n`;
    }
    
    if (customPrompt) {
      prompt += `Additional requirements: ${customPrompt}\n`;
    }

    prompt += `
Please respond with a JSON object containing:
{
  "title": "Recipe name",
  "description": "Brief description",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity", ...],
  "instructions": "Step-by-step cooking instructions",
  "prepTime": "preparation time in minutes (number)",
  "cookTime": "cooking time in minutes (number)", 
  "servings": "number of servings (number)",
  "difficulty": "easy/medium/hard",
  "cuisine": "cuisine type"
}

Make sure the recipe is practical, delicious, and follows all dietary restrictions. If using the provided ingredients, try to incorporate as many as possible while suggesting additional ingredients if needed for a complete recipe.`;

    console.log('Sending request to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef that creates amazing recipes. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    let recipeContent = data.choices[0].message.content;
    
    // Clean the response to ensure it's valid JSON
    recipeContent = recipeContent.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
    
    let recipe;
    try {
      recipe = JSON.parse(recipeContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', recipeContent);
      
      // Fallback: create a basic recipe structure
      recipe = {
        title: "Generated Recipe",
        description: "A delicious recipe created for you",
        ingredients: ingredients || ["Check ingredients based on your preferences"],
        instructions: recipeContent.replace(/[{}[\]"]/g, ''),
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: "medium",
        cuisine: "International"
      };
    }

    console.log('Recipe generated successfully:', recipe.title);

    return new Response(JSON.stringify({ recipe }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-recipe function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate recipe',
        details: 'Please check the function logs for more information'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});