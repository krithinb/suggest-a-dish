import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthForm } from "@/components/AuthForm";
import { RecipeGenerator } from "@/components/RecipeGenerator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Sparkles, Heart, BookOpen, LogOut, User } from "lucide-react";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'generate' | 'saved' | 'profile'>('generate');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <ChefHat className="h-8 w-8 animate-pulse text-primary" />
          <span className="text-lg font-medium">Loading Chef It Up...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <ChefHat className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">Chef It Up</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === 'generate' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('generate')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </Button>
              <Button
                variant={activeTab === 'saved' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('saved')}
              >
                <Heart className="h-4 w-4 mr-2" />
                Saved
              </Button>
              <Button
                variant={activeTab === 'profile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('profile')}
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'generate' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Create Your Perfect Recipe</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Tell us what ingredients you have, your dietary preferences, or any special 
                requests, and we'll generate a personalized recipe just for you.
              </p>
            </div>
            <RecipeGenerator />
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Your Saved Recipes</h2>
              <p className="text-muted-foreground">
                Your collection of favorite recipes
              </p>
            </div>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No saved recipes yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate some recipes and save your favorites to see them here
                </p>
                <Button onClick={() => setActiveTab('generate')}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Your First Recipe
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Your Profile</h2>
              <p className="text-muted-foreground">
                Manage your preferences and account settings
              </p>
            </div>
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your Chef It Up account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Member Since</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
