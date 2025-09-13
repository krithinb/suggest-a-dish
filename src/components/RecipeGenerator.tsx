import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, X, Plus } from "lucide-react";

interface DietaryRestriction {
  id: string;
  name: string;
  description: string;
}

interface Ingredient {
  id: string;
  name: string;
  category: string;
}

export const RecipeGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadIngredients();
    loadDietaryRestrictions();
  }, []);

  const loadIngredients = async () => {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error loading ingredients:", error);
      return;
    }

    setAvailableIngredients(data || []);
  };

  const loadDietaryRestrictions = async () => {
    const { data, error } = await supabase
      .from("dietary_restrictions")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error loading dietary restrictions:", error);
      return;
    }

    setDietaryRestrictions(data || []);
  };

  const addIngredient = (ingredientId: string) => {
    if (!selectedIngredients.includes(ingredientId)) {
      setSelectedIngredients([...selectedIngredients, ingredientId]);
    }
  };

  const removeIngredient = (ingredientId: string) => {
    setSelectedIngredients(selectedIngredients.filter(id => id !== ingredientId));
  };

  const toggleDietary = (dietaryId: string) => {
    if (selectedDietary.includes(dietaryId)) {
      setSelectedDietary(selectedDietary.filter(id => id !== dietaryId));
    } else {
      setSelectedDietary([...selectedDietary, dietaryId]);
    }
  };

  const generateRecipe = async () => {
    if (selectedIngredients.length === 0 && !customPrompt.trim()) {
      toast({
        title: "Input Required",
        description: "Please select some ingredients or add a custom request",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const selectedIngredientNames = availableIngredients
        .filter(ing => selectedIngredients.includes(ing.id))
        .map(ing => ing.name);

      const selectedDietaryNames = dietaryRestrictions
        .filter(diet => selectedDietary.includes(diet.id))
        .map(diet => diet.name);

      const { data, error } = await supabase.functions.invoke('generate-recipe', {
        body: {
          ingredients: selectedIngredientNames,
          dietaryRestrictions: selectedDietaryNames,
          customPrompt: customPrompt.trim(),
        }
      });

      if (error) throw error;

      setGeneratedRecipe(data.recipe);
      
      toast({
        title: "Recipe Generated!",
        description: "Your personalized recipe is ready",
      });
    } catch (error) {
      console.error('Error generating recipe:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate recipe. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredIngredients = availableIngredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Your Perfect Recipe
          </CardTitle>
          <CardDescription>
            Select your available ingredients and preferences to get a personalized recipe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ingredient Selection */}
          <div className="space-y-3">
            <Label>Available Ingredients</Label>
            <Input
              placeholder="Search ingredients..."
              value={ingredientSearch}
              onChange={(e) => setIngredientSearch(e.target.value)}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
              {filteredIngredients.map((ingredient) => (
                <Button
                  key={ingredient.id}
                  variant={selectedIngredients.includes(ingredient.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => 
                    selectedIngredients.includes(ingredient.id) 
                      ? removeIngredient(ingredient.id)
                      : addIngredient(ingredient.id)
                  }
                  className="justify-start text-left"
                >
                  {selectedIngredients.includes(ingredient.id) && (
                    <X className="h-3 w-3 mr-1" />
                  )}
                  {!selectedIngredients.includes(ingredient.id) && (
                    <Plus className="h-3 w-3 mr-1" />
                  )}
                  {ingredient.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Selected Ingredients */}
          {selectedIngredients.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Ingredients</Label>
              <div className="flex flex-wrap gap-2">
                {selectedIngredients.map((ingredientId) => {
                  const ingredient = availableIngredients.find(ing => ing.id === ingredientId);
                  return (
                    <Badge key={ingredientId} variant="default" className="flex items-center gap-1">
                      {ingredient?.name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeIngredient(ingredientId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Dietary Restrictions */}
          <div className="space-y-3">
            <Label>Dietary Preferences</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {dietaryRestrictions.map((dietary) => (
                <Button
                  key={dietary.id}
                  variant={selectedDietary.includes(dietary.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDietary(dietary.id)}
                  className="justify-start text-left"
                >
                  {dietary.name}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom Prompt */}
          <div className="space-y-2">
            <Label>Custom Request (Optional)</Label>
            <Textarea
              placeholder="Any special requests? (e.g., 'I want something spicy', 'Quick 15-minute meal', 'Comfort food')"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={generateRecipe} 
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Recipe...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Recipe
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Recipe Display */}
      {generatedRecipe && (
        <Card>
          <CardHeader>
            <CardTitle>{generatedRecipe.title}</CardTitle>
            <CardDescription>{generatedRecipe.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Ingredients:</h4>
                <ul className="space-y-1">
                  {generatedRecipe.ingredients?.map((ingredient: string, index: number) => (
                    <li key={index} className="text-sm">• {ingredient}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Instructions:</h4>
                <div className="space-y-2">
                  {generatedRecipe.instructions?.split('\n').map((step: string, index: number) => (
                    <p key={index} className="text-sm">{step}</p>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
              <span>⏱️ {generatedRecipe.prepTime} prep</span>
              <span>🍳 {generatedRecipe.cookTime} cook</span>
              <span>👥 {generatedRecipe.servings} servings</span>
              <span>📊 {generatedRecipe.difficulty}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};