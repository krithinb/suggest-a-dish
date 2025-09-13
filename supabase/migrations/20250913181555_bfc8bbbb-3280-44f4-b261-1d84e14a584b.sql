-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dietary restrictions table
CREATE TABLE public.dietary_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user dietary preferences table
CREATE TABLE public.user_dietary_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  dietary_restriction_id UUID NOT NULL REFERENCES public.dietary_restrictions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, dietary_restriction_id)
);

-- Create ingredients table
CREATE TABLE public.ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,
  prep_time INTEGER, -- in minutes
  cook_time INTEGER, -- in minutes
  servings INTEGER,
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  cuisine_type TEXT,
  generated_by_ai BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recipe ingredients table (many-to-many)
CREATE TABLE public.recipe_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity TEXT,
  unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, ingredient_id)
);

-- Create user recipe interactions table
CREATE TABLE public.user_recipe_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('viewed', 'saved', 'cooked', 'rated')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user ingredient preferences table
CREATE TABLE public.user_ingredient_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL CHECK (preference_type IN ('available', 'preferred', 'disliked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, ingredient_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dietary_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dietary_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recipe_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ingredient_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for dietary restrictions (public read)
CREATE POLICY "Anyone can view dietary restrictions" ON public.dietary_restrictions
  FOR SELECT USING (true);

-- Create RLS policies for user dietary preferences
CREATE POLICY "Users can manage their dietary preferences" ON public.user_dietary_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for ingredients (public read)
CREATE POLICY "Anyone can view ingredients" ON public.ingredients
  FOR SELECT USING (true);

-- Create RLS policies for recipes (public read)
CREATE POLICY "Anyone can view recipes" ON public.recipes
  FOR SELECT USING (true);

-- Create RLS policies for recipe ingredients (public read)
CREATE POLICY "Anyone can view recipe ingredients" ON public.recipe_ingredients
  FOR SELECT USING (true);

-- Create RLS policies for user recipe interactions
CREATE POLICY "Users can manage their recipe interactions" ON public.user_recipe_interactions
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for user ingredient preferences
CREATE POLICY "Users can manage their ingredient preferences" ON public.user_ingredient_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance optimization
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_recipes_cuisine_type ON public.recipes(cuisine_type);
CREATE INDEX idx_recipes_difficulty ON public.recipes(difficulty_level);
CREATE INDEX idx_ingredients_name ON public.ingredients(name);
CREATE INDEX idx_ingredients_category ON public.ingredients(category);
CREATE INDEX idx_user_recipe_interactions_user_id ON public.user_recipe_interactions(user_id);
CREATE INDEX idx_user_recipe_interactions_recipe_id ON public.user_recipe_interactions(recipe_id);
CREATE INDEX idx_user_recipe_interactions_type ON public.user_recipe_interactions(interaction_type);
CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON public.recipe_ingredients(ingredient_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_ingredient_preferences_updated_at
  BEFORE UPDATE ON public.user_ingredient_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert sample dietary restrictions
INSERT INTO public.dietary_restrictions (name, description) VALUES
  ('Vegetarian', 'No meat, poultry, or fish'),
  ('Vegan', 'No animal products'),
  ('Gluten-Free', 'No gluten-containing ingredients'),
  ('Dairy-Free', 'No dairy products'),
  ('Nut-Free', 'No nuts or nut products'),
  ('Keto', 'Low carbohydrate, high fat diet'),
  ('Paleo', 'No processed foods, grains, or legumes'),
  ('Low-Sodium', 'Reduced sodium content'),
  ('Diabetic-Friendly', 'Low sugar and controlled carbohydrates'),
  ('Halal', 'Prepared according to Islamic law');

-- Insert sample ingredients
INSERT INTO public.ingredients (name, category) VALUES
  ('Chicken breast', 'Protein'),
  ('Salmon', 'Protein'),
  ('Ground beef', 'Protein'),
  ('Eggs', 'Protein'),
  ('Tofu', 'Protein'),
  ('Rice', 'Grains'),
  ('Quinoa', 'Grains'),
  ('Pasta', 'Grains'),
  ('Bread', 'Grains'),
  ('Potatoes', 'Vegetables'),
  ('Onions', 'Vegetables'),
  ('Garlic', 'Vegetables'),
  ('Tomatoes', 'Vegetables'),
  ('Bell peppers', 'Vegetables'),
  ('Spinach', 'Vegetables'),
  ('Broccoli', 'Vegetables'),
  ('Carrots', 'Vegetables'),
  ('Mushrooms', 'Vegetables'),
  ('Olive oil', 'Fats'),
  ('Butter', 'Fats'),
  ('Cheese', 'Dairy'),
  ('Milk', 'Dairy'),
  ('Yogurt', 'Dairy'),
  ('Salt', 'Seasonings'),
  ('Black pepper', 'Seasonings'),
  ('Basil', 'Herbs'),
  ('Oregano', 'Herbs'),
  ('Thyme', 'Herbs'),
  ('Parsley', 'Herbs'),
  ('Lemon', 'Fruits');