import React, { useState, useEffect } from 'react';
import { Camera, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import ImageCropper from './ImageCropper';
import toast from 'react-hot-toast';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  clinicName: string;
  profileImage: string;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Dr. John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    clinicName: 'Smile Dental Clinic',
    profileImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
  });

  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user]);

  const loadCategories = async () => {
    if (!user) return;
    setLoadingCategories(true);
    try {
      const categoriesDoc = await getDoc(doc(db, 'settings', 'categories'));
      if (categoriesDoc.exists()) {
        setCustomCategories(categoriesDoc.data().list || []);
      } else {
        await setDoc(doc(db, 'settings', 'categories'), { 
          list: [],
          createdBy: user.uid,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories. Please try again.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const addCategory = async () => {
    if (!user) {
      toast.error('You must be logged in to manage categories');
      return;
    }
    
    if (!newCategory.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    
    const category = newCategory.trim();
    if (customCategories.includes(category)) {
      toast.error('Category already exists');
      return;
    }

    try {
      const updatedCategories = [...customCategories, category];
      await setDoc(doc(db, 'settings', 'categories'), {
        list: updatedCategories,
        updatedBy: user.uid,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setCustomCategories(updatedCategories);
      setNewCategory('');
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category. Please try again.');
    }
  };

  const removeCategory = async (categoryToRemove: string) => {
    if (!user) {
      toast.error('You must be logged in to manage categories');
      return;
    }

    try {
      const updatedCategories = customCategories.filter(cat => cat !== categoryToRemove);
      await setDoc(doc(db, 'settings', 'categories'), {
        list: updatedCategories,
        updatedBy: user.uid,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setCustomCategories(updatedCategories);
      toast.success('Category removed successfully');
    } catch (error) {
      console.error('Error removing category:', error);
      toast.error('Failed to remove category. Please try again.');
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setProfile(prev => ({ ...prev, profileImage: croppedImage }));
    setIsCropping(false);
    setSelectedImage(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
        {/* Categories Section */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Image Categories</h3>
          {loadingCategories ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                />
                <button
                  onClick={addCategory}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </button>
              </div>
              
              <div className="space-y-2">
                {customCategories.map((category) => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <span className="text-gray-700 dark:text-gray-300">{category}</span>
                    <button
                      onClick={() => removeCategory(category)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {customCategories.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No custom categories added yet
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Image Section */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Profile Image</h3>
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-gray-100 dark:ring-gray-700">
                <img
                  src={profile.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label
                    htmlFor="profile-image"
                    className="cursor-pointer text-white flex flex-col items-center"
                  >
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-sm">Change Photo</span>
                  </label>
                </div>
              </div>
              <input
                type="file"
                id="profile-image"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Click the image to upload a new photo<br />
              Recommended: Square image, at least 400x400 pixels
            </p>
          </div>
        </div>

        {/* Profile Information Section */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Profile Information</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={profile.name}
                onChange={handleProfileChange}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={profile.email}
                onChange={handleProfileChange}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={profile.phone}
                onChange={handleProfileChange}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>
            <div>
              <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Clinic Name
              </label>
              <input
                type="text"
                id="clinicName"
                name="clinicName"
                value={profile.clinicName}
                onChange={handleProfileChange}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
          {!isEditingPassword ? (
            <button
              onClick={() => setIsEditingPassword(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              Change Password
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="current" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <input
                  type="password"
                  id="current"
                  name="current"
                  value={passwords.current}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>
              <div>
                <label htmlFor="new" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <input
                  type="password"
                  id="new"
                  name="new"
                  value={passwords.new}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirm"
                  name="confirm"
                  value={passwords.confirm}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setIsEditingPassword(false);
                    setPasswords({ current: '', new: '', confirm: '' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                  Update Password
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Save Changes Button */}
        <div className="p-6">
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {isCropping && selectedImage && (
        <ImageCropper
          image={selectedImage}
          onCropComplete={handleCropComplete}
          onClose={() => {
            setIsCropping(false);
            setSelectedImage(null);
          }}
        />
      )}
    </div>
  );
};

export default Settings;