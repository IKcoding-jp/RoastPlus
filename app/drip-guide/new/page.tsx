'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RecipeForm } from '@/components/drip-guide/RecipeForm';
import { useRecipes } from '@/lib/drip-guide/useRecipes';
import { DripRecipe } from '@/lib/drip-guide/types';
import { FloatingNav } from '@/components/ui';

export default function NewRecipePage() {
    const router = useRouter();
    const { addRecipe } = useRecipes();

    const handleSubmit = (recipe: DripRecipe) => {
        addRecipe(recipe);
        router.push('/drip-guide');
    };

    return (
        <div className="min-h-screen text-ink bg-page transition-colors duration-1000">
            <FloatingNav backHref="/drip-guide" />
            <div className="max-w-5xl mx-auto px-4 pt-16 pb-4 sm:p-6 sm:pt-20">
                <RecipeForm onSubmit={handleSubmit} />
            </div>
        </div>
    );
}
