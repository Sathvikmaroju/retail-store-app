import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  addDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const UNIT_TYPES = ['meter', 'kilogram', 'piece', 'box'];
const INITIAL_PRODUCT_STATE = {
  name: '',
  pricePerUnit: '',
  unitType: 'meter',
  category: '',
  subCategory: '',
  vendorName: '',
  vendorDetails: { contact: '', vendor_desc: '' },
  purchaseQty: '',
  soldQty: '',
  lowStockThreshold: '',
};

function Inventory() {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState(INITIAL_PRODUCT_STATE);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const updatedProducts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(updatedProducts);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching products:', error);
        setError('Failed to load products. Please refresh the page.');
        setLoading(false);
      }
    );

    const fetchMeta = async () => {
      const catSnap = await getDocs(collection(db, 'categories'));
      const subCatSnap = await getDocs(collection(db, 'subCategories'));
      setCategories(catSnap.docs.map((doc) => doc.id));
      setSubCategories(subCatSnap.docs.map((doc) => doc.id));
    };
    fetchMeta();

    return () => unsubscribe();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term) ||
        p.vendorName?.toLowerCase().includes(term) ||
        p.subCategory?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleInputChange = (field, value, isNested = false, nestedField = null) => {
  if (isNested) {
    setNewProduct((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [nestedField]: value,
      },
    }));
  } else {
    setNewProduct((prev) => ({
      ...prev,
      [field]: value,
    }));
  }
};

const handleAddProduct = async (e) => {
  e.preventDefault();
  setError('');

  const validationErrors = [];
  if (!newProduct.name.trim()) validationErrors.push('Product name is required');
  if (!newProduct.pricePerUnit || isNaN(newProduct.pricePerUnit)) validationErrors.push('Valid selling price is required');
  if (!newProduct.purchasePricePerUnit || isNaN(newProduct.purchasePricePerUnit)) validationErrors.push('Valid purchase price is required');
  if (!newProduct.category.trim()) validationErrors.push('Category is required');

  if (validationErrors.length > 0) {
    setError(validationErrors.join(', '));
    return;
  }

  setSubmitting(true);

  const purchaseQty = parseInt(newProduct.purchaseQty) || 0;
  const soldQty = parseInt(newProduct.soldQty) || 0;

  const productData = {
    ...newProduct,
    name: newProduct.name.trim(),
    category: newProduct.category.trim(),
    subCategory: newProduct.subCategory.trim(),
    vendorName: newProduct.vendorName.trim(),
    pricePerUnit: parseFloat(newProduct.pricePerUnit),
    purchasePricePerUnit: parseFloat(newProduct.purchasePricePerUnit),
    purchaseQty,
    soldQty,
    remainingQty: purchaseQty - soldQty,
    lowStockThreshold: parseInt(newProduct.lowStockThreshold) || 10,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'categories', productData.category), {});
    if (productData.subCategory) {
      await setDoc(doc(db, 'subCategories', productData.subCategory), {});
    }
    await addDoc(collection(db, 'products'), productData);
    setNewProduct(INITIAL_PRODUCT_STATE);
    setShowAddForm(false);
  } catch (err) {
    console.error('Failed to add product:', err);
    setError('Error adding product.');
  } finally {
    setSubmitting(false);
  }
};

  const groupedProducts = useMemo(() => {
    const lowStock = [];
    const outOfStock = [];
    const available = [];

    filteredProducts.forEach((p) => {
      const remaining = p.remainingQty || 0;
      const threshold = p.lowStockThreshold || 10;
      if (remaining <= 0) outOfStock.push(p);
      else if (remaining < threshold) lowStock.push(p);
      else available.push(p);
    });

    return { lowStock, outOfStock, available };
  }, [filteredProducts]);

  const handleProductEdit = (product, field, value, isNested = false, nestedField = null) => {
    const updatedProduct = { ...product };
    if (isNested) {
      updatedProduct[field] = {
        ...updatedProduct[field],
        [nestedField]: value,
      };
    } else {
      updatedProduct[field] = value;
    }
    setEditingProduct(updatedProduct);
  };

  const handleUpdateProduct = async (product) => {
    const purchaseQty = parseInt(product.purchaseQty) || 0;
    const soldQty = parseInt(product.soldQty) || 0;
    const updatedProduct = {
      ...product,
      name: product.name.trim(),
      category: product.category.trim(),
      subCategory: product.subCategory.trim(),
      vendorName: product.vendorName.trim(),
      pricePerUnit: parseFloat(product.pricePerUnit),
      purchasePricePerUnit: parseFloat(product.purchasePricePerUnit),
      purchaseQty,
      soldQty,
      remainingQty: purchaseQty - soldQty,
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'categories', updatedProduct.category), {});
      if (updatedProduct.subCategory) {
        await setDoc(doc(db, 'subCategories', updatedProduct.subCategory), {});
      }
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, updatedProduct);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Failed to update product.');
    }
  };

  const renderProductCard = (product) => {
    const isEditing = editingProduct && editingProduct.id === product.id;
    const current = isEditing ? editingProduct : product;
    return (
      <div key={product.id} style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '10px' }}>
        <strong>{current.name}</strong> ({current.category} / {current.subCategory})<br />
        Price: ₹{current.pricePerUnit} | Unit: {current.unitType}<br />
        Purchase Qty: {current.purchaseQty} | Sold: {current.soldQty} | Remaining: {current.remainingQty}<br />
        Vendor: {current.vendorName} ({current.vendorDetails?.contact})<br />
        Description: {current.vendorDetails?.vendor_desc || 'N/A'}<br />
        Low Stock Threshold: {current.lowStockThreshold || 10}
        <div style={{ marginTop: '5px' }}>
          <button
            onClick={() => setEditingProduct(product)}
            style={{ padding: '5px 10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}
          >
            Edit
          </button>
        </div>
      </div>
    );
  };

  return (
  <div style={{ padding: '20px' }}>
    <h2>Inventory</h2>

    {/* Toggle Add Product Form */}
    <div style={{ marginBottom: '20px' }}>
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {showAddForm ? 'Hide Add Product Form' : 'Add New Product'}
      </button>
    </div>

    {/* Add Product Form */}
    {showAddForm && (
      <div style={{ 
        backgroundColor: '#f9f9f9', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '30px' 
      }}>
        <h3>Add New Product</h3>
        <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <input
            type="text"
            placeholder="Product Name *"
            value={newProduct.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Price per Unit *"
            value={newProduct.pricePerUnit}
            onChange={(e) => handleInputChange('pricePerUnit', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Purchase Price per Unit *"
            value={newProduct.purchasePricePerUnit}
            onChange={(e) => handleInputChange('purchasePricePerUnit', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            required
          />
          <select
            value={newProduct.unitType}
            onChange={(e) => handleInputChange('unitType', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            {UNIT_TYPES.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          <input
            type="text"
            list="category-options"
            placeholder="Category *"
            value={newProduct.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            required
          />
          <datalist id="category-options">
            {categories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          <input
            type="text"
            list="subcategory-options"
            placeholder="Sub Category"
            value={newProduct.subCategory}
            onChange={(e) => handleInputChange('subCategory', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <datalist id="subcategory-options">
            {subCategories.map((sub) => (
              <option key={sub} value={sub} />
            ))}
          </datalist>
          <input
            type="text"
            placeholder="Vendor Name"
            value={newProduct.vendorName}
            onChange={(e) => handleInputChange('vendorName', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <input
            type="text"
            placeholder="Vendor Contact"
            value={newProduct.vendorDetails.contact}
            onChange={(e) => handleInputChange('vendorDetails', e.target.value, true, 'contact')}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <input
            type="text"
            placeholder="Vendor Description"
            value={newProduct.vendorDetails.vendor_desc}
            onChange={(e) => handleInputChange('vendorDetails', e.target.value, true, 'vendor_desc')}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '60px', width: '100%' }}
          />
          <input
            type="number"
            placeholder="Purchase Quantity"
            value={newProduct.purchaseQty}
            onChange={(e) => handleInputChange('purchaseQty', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            min="0"
          />
          <input
            type="number"
            placeholder="Sold Quantity"
            value={newProduct.soldQty}
            onChange={(e) => handleInputChange('soldQty', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            min="0"
          />
          <input
            type="number"
            placeholder="Low Stock Threshold"
            value={newProduct.lowStockThreshold}
            onChange={(e) => handleInputChange('lowStockThreshold', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            min="0"
          />
        </form>
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={handleAddProduct}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              backgroundColor: submitting ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              width: '100%',
            }}
          >
            {submitting ? 'Adding...' : 'Add Product'}
          </button>
        </div>
      </div>
    )}
    {/* Search Inventory */}
    <div style={{ marginBottom: '20px' }}>
      <input
        type="text"
        placeholder="Search inventory by product name, category, or vendor..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          fontSize: '16px',
        }}
      />
    </div>

    {/* Products Display */}
    <div style={{ marginTop: '30px' }}>
      <h3 style={{ color: '#f57c00', marginTop: '30px' }}>Low Stock</h3>
      <div style={{ display: 'grid', gap: '10px' }}>
        {groupedProducts.lowStock.map(renderProductCard)}
      </div>

      <h3 style={{ color: '#388e3c', marginTop: '30px' }}>Available Stock</h3>
      <div style={{ display: 'grid', gap: '10px' }}>
        {groupedProducts.available.map(renderProductCard)}
      </div>

      <h3 style={{ color: '#d32f2f' }}>Out of Stock</h3>
      <div style={{ display: 'grid', gap: '10px' }}>
        {groupedProducts.outOfStock.map(renderProductCard)}
      </div>
    </div>
  </div>
);

}

export default Inventory;
