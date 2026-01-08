
export enum Category {
  MAIN = 'main',
  STIR = 'stir',
  VEG = 'veg',
  SOUP = 'soup'
}

export interface Dish {
  objectId: string;
  name: string;
  category: Category;
}

export interface WeeklyMenu {
  objectId?: string;
  weekId: string;
  dayIndex: number;
  main: string;
  stir: string;
  veg: string;
  soup: string;
}

export interface Recipe {
  objectId: string;
  name: string;
  authorId: string;
  ingredients: { name: string; qty: string }[];
  steps: string[];
  createdAt?: string;
}

export interface RecipeSupport {
  objectId?: string;
  recipeId: string;
  userId: string;
}

export interface Vote {
  objectId?: string;
  dishId: string;
  userId: string;
  value: number; // 1 for like
}

export interface VotingConfig {
  objectId?: string;
  category: Category;
  dishIds: string[]; // Array of dish objectIds (max 10)
}

export interface VoteLog {
  objectId: string;
  dishName: string;
  userId: string;
  likedAt: number;
}
