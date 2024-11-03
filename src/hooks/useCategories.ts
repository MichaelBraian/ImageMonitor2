import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user]);

  const loadCategories = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const settingsRef = doc(db, 'settings', 'categories');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        setCategories(settingsDoc.data().list || []);
      } else {
        // Initialize settings document for new users
        await setDoc(settingsRef, {
          list: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Failed to load categories');
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (newCategory: string) => {
    if (!user) {
      toast.error('You must be logged in to add categories');
      return false;
    }

    const category = newCategory.trim();
    if (!category) {
      toast.error('Category name cannot be empty');
      return false;
    }

    if (categories.includes(category)) {
      toast.error('Category already exists');
      return false;
    }

    try {
      const updatedCategories = [...categories, category];
      const settingsRef = doc(db, 'settings', 'categories');
      
      await setDoc(settingsRef, {
        list: updatedCategories,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setCategories(updatedCategories);
      toast.success('Category added successfully');
      return true;
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
      return false;
    }
  };

  const removeCategory = async (categoryToRemove: string) => {
    if (!user) {
      toast.error('You must be logged in to remove categories');
      return false;
    }

    try {
      const updatedCategories = categories.filter(cat => cat !== categoryToRemove);
      const settingsRef = doc(db, 'settings', 'categories');
      
      await setDoc(settingsRef, {
        list: updatedCategories,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setCategories(updatedCategories);
      toast.success('Category removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing category:', error);
      toast.error('Failed to remove category');
      return false;
    }
  };

  return {
    categories,
    loading,
    error,
    addCategory,
    removeCategory,
    refreshCategories: loadCategories
  };
}