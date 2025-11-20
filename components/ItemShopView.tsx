'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { ShopItem, ItemCategory, ItemRarity } from '@/lib/types';

export default function ItemShopView() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<ItemCategory | 'all'>('all');
  const [filterRarity, setFilterRarity] = useState<ItemRarity | 'all'>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'theme' as ItemCategory,
    rarity: 'common' as ItemRarity,
    price: 0,
    imageUrl: '',
    isActive: true,
    isFeatured: false,
    availableUntil: '',
  });

  const categories: ItemCategory[] = ['theme', 'avatar', 'frame', 'badge', 'powerup', 'merchandise', 'appicon'];
  const rarities: ItemRarity[] = ['common', 'rare', 'epic', 'legendary'];

  const rarityColors = {
    common: 'bg-gray-100 text-gray-700',
    rare: 'bg-blue-100 text-blue-700',
    epic: 'bg-purple-100 text-purple-700',
    legendary: 'bg-yellow-100 text-yellow-700',
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const q = query(collection(db, 'shopItems'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const itemsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          availableUntil: data.availableUntil?.toDate(),
        } as ShopItem;
      });
      setItems(itemsData);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const itemData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        rarity: formData.rarity,
        price: formData.price,
        imageUrl: formData.imageUrl,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        availableUntil: formData.availableUntil ? Timestamp.fromDate(new Date(formData.availableUntil)) : null,
        purchaseCount: 0,
        createdAt: Timestamp.now(),
      };

      if (editingItem) {
        await updateDoc(doc(db, 'shopItems', editingItem.id), itemData);
      } else {
        await addDoc(collection(db, 'shopItems'), itemData);
      }

      fetchItems();
      resetForm();
      setShowAddModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleEdit = (item: ShopItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      category: item.category,
      rarity: item.rarity,
      price: item.price,
      imageUrl: item.imageUrl,
      isActive: item.isActive,
      isFeatured: item.isFeatured,
      availableUntil: item.availableUntil ? item.availableUntil.toISOString().slice(0, 16) : '',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'shopItems', itemId));
        fetchItems();
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'theme',
      rarity: 'common',
      price: 0,
      imageUrl: '',
      isActive: true,
      isFeatured: false,
      availableUntil: '',
    });
  };

  const filteredItems = items.filter(item => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (filterRarity !== 'all' && item.rarity !== filterRarity) return false;
    return true;
  });

  const totalRevenue = items.reduce((sum, item) => sum + (item.purchaseCount * item.price), 0);
  const totalPurchases = items.reduce((sum, item) => sum + item.purchaseCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Analytics */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-semibold text-[#1d1d1f] mb-2">Item Shop Management</h1>
            <p className="text-[#86868b] text-[17px]">Manage items for the FitRank mobile app</p>
          </div>
          <button
            onClick={() => {
              console.log('Add button clicked, showAddModal:', showAddModal);
              resetForm();
              setEditingItem(null);
              setShowAddModal(true);
              console.log('After setState, showAddModal should be true');
            }}
            className="px-6 py-3 bg-[#0071e3] text-white rounded-xl font-medium hover:bg-[#0077ed] transition-colors"
          >
            + Add New Item
          </button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#f5f5f7] rounded-2xl p-6">
            <p className="text-[#86868b] text-sm mb-1">Total Items</p>
            <p className="text-3xl font-semibold text-[#1d1d1f]">{items.length}</p>
          </div>
          <div className="bg-[#f5f5f7] rounded-2xl p-6">
            <p className="text-[#86868b] text-sm mb-1">Total Purchases</p>
            <p className="text-3xl font-semibold text-[#1d1d1f]">{totalPurchases}</p>
          </div>
          <div className="bg-[#f5f5f7] rounded-2xl p-6">
            <p className="text-[#86868b] text-sm mb-1">Total Revenue</p>
            <p className="text-3xl font-semibold text-[#1d1d1f]">{totalRevenue.toLocaleString()} 🪙</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as ItemCategory | 'all')}
            className="px-4 py-2 rounded-xl border border-[#d2d2d7] bg-white text-[#1d1d1f] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value as ItemRarity | 'all')}
            className="px-4 py-2 rounded-xl border border-[#d2d2d7] bg-white text-[#1d1d1f] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          >
            <option value="all">All Rarities</option>
            {rarities.map(rar => (
              <option key={rar} value={rar}>{rar.charAt(0).toUpperCase() + rar.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white border-2 border-[#d2d2d7] rounded-xl overflow-hidden hover:shadow-lg hover:border-[#0071e3] transition-all">
            {/* Item Image */}
            <div className="h-[120px] bg-[#f5f5f7] relative flex items-center justify-center p-2">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#86868b] text-xs">
                  No Image
                </div>
              )}
              {!item.isActive && (
                <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                  ✕
                </div>
              )}
            </div>

            {/* Item Details */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-[#1d1d1f] text-sm truncate">{item.name}</h3>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  {item.isFeatured && (
                    <span className="text-[12px]">⭐</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${rarityColors[item.rarity]}`}>
                    {item.rarity.toUpperCase()}
                  </span>
                </div>
              </div>
              <p className="text-[#86868b] text-xs mb-2 line-clamp-2 min-h-[2rem]">{item.description}</p>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#0071e3] font-bold text-base">{item.price} 🪙</span>
                <span className="text-[#86868b] text-[10px] uppercase tracking-wide">{item.category}</span>
              </div>

              {item.availableUntil && (
                <p className="text-[10px] text-red-600 mb-2 font-medium">
                  ⏰ {new Date(item.availableUntil).toLocaleDateString()}
                </p>
              )}

              <div className="text-[10px] text-[#86868b] mb-2">
                📊 {item.purchaseCount} purchases
              </div>

              {/* Actions */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex-1 px-2 py-1.5 bg-[#0071e3] text-white rounded-lg text-xs font-medium hover:bg-[#0077ed] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-2 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#86868b] text-lg">No items found</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="absolute inset-0 z-[100] bg-black bg-opacity-50">
          <div className="py-8 px-4 flex justify-center">
            <div className="bg-white rounded-xl max-w-lg w-full relative shadow-2xl h-fit">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="absolute top-3 right-3 text-[#86868b] hover:text-[#1d1d1f] text-xl font-bold z-10"
              >
                ×
              </button>
            <div className="p-5">
              <h2 className="text-lg font-semibold text-[#1d1d1f] mb-4">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">Item Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2d7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2d7] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                    rows={2}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#1d1d1f] mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2d7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#1d1d1f] mb-1">Rarity</label>
                    <select
                      value={formData.rarity}
                      onChange={(e) => setFormData({ ...formData, rarity: e.target.value as ItemRarity })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2d7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      {rarities.map(rar => (
                        <option key={rar} value={rar}>{rar.charAt(0).toUpperCase() + rar.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">Price (Tokens)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2d7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">Image URL</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2d7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    placeholder="https://example.com/image.jpg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">Available Until (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.availableUntil}
                    onChange={(e) => setFormData({ ...formData, availableUntil: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#d2d2d7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-[#0071e3] rounded focus:ring-[#0071e3]"
                    />
                    <span className="text-xs text-[#1d1d1f]">Active</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 text-[#0071e3] rounded focus:ring-[#0071e3]"
                    />
                    <span className="text-xs text-[#1d1d1f]">Featured</span>
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 bg-[#f5f5f7] text-[#1d1d1f] rounded-lg text-sm font-medium hover:bg-[#e8e8ed] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#0071e3] text-white rounded-lg text-sm font-medium hover:bg-[#0077ed] transition-colors"
                  >
                    {editingItem ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
