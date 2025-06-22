import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  addDoc,
  doc,
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
  vendorDetails: { contact: '', address: '' },
  purchaseQty: '',
  soldQty: '',
};

function Inventory() {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState(INITIAL_PRODUCT_STATE);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState('');

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

  const validateProduct = (product) => {
    const errors = [];
    
    if (!product.name.trim()) errors.push('Product name is required');
    if (!product.pricePerUnit || isNaN(product.pricePerUnit) || parseFloat(product.pricePerUnit) <= 0) {
      errors.push('Valid price per unit is required');
    }
    if (!product.category.trim()) errors.push('Category is required');
    if (product.purchaseQty && isNaN(product.purchaseQty)) {
      errors.push('Purchase quantity must be a valid number');
    }
    if (product.soldQty && isNaN(product.soldQty)) {
      errors.push('Sold quantity must be a valid number');
    }
    if (product.soldQty && product.purchaseQty && 
        parseInt(product.soldQty) > parseInt(product.purchaseQty)) {
      errors.push('Sold quantity cannot exceed purchase quantity');
    }
    
    return errors;
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setError('');
    
    const validationErrors = validateProduct(newProduct);
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
      purchaseQty,
      soldQty,
      remainingQty: purchaseQty - soldQty,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'products'), productData);
      setNewProduct(INITIAL_PRODUCT_STATE);
      setError('');
    } catch (error) {
      console.error('Error adding product:', error);
      setError('Failed to add product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (product) => {
    setError('');
    
    const validationErrors = validateProduct(product);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    const purchaseQty = parseInt(product.purchaseQty) || 0;
    const soldQty = parseInt(product.soldQty) || 0;
    
    const updatedProduct = {
      ...product,
      name: product.name.trim(),
      category: product.category.trim(),
      subCategory: product.subCategory.trim(),
      vendorName: product.vendorName.trim(),
      pricePerUnit: parseFloat(product.pricePerUnit),
      purchaseQty,
      soldQty,
      remainingQty: purchaseQty - soldQty,
      updatedAt: serverTimestamp(),
    };

    try {
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, updatedProduct);
      setEditingProduct(null);
      setError('');
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Failed to update product. Please try again.');
    }
  };

  const handleInputChange = (field, value, isNested = false, nestedField = null) => {
    if (isNested) {
      setNewProduct(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [nestedField]: value
        }
      }));
    } else {
      setNewProduct(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleProductEdit = (product, field, value, isNested = false, nestedField = null) => {
    const updatedProduct = { ...product };
    
    if (isNested) {
      updatedProduct[field] = {
        ...updatedProduct[field],
        [nestedField]: value
      };
    } else {
      updatedProduct[field] = value;
    }
    
    setEditingProduct(updatedProduct);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div>Loading products...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h2>Inventory Management</h2>
      
      {error && (
        <div style={{ 
          backgroundColor: '#fee', 
          border: '1px solid #fcc', 
          color: '#c33', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      {/* Add Product Form */}
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
            placeholder="Category *"
            value={newProduct.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            required
          />
          
          <input
            type="text"
            placeholder="Sub Category"
            value={newProduct.subCategory}
            onChange={(e) => handleInputChange('subCategory', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          
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
            placeholder="Vendor Address"
            value={newProduct.vendorDetails.address}
            onChange={(e) => handleInputChange('vendorDetails', e.target.value, true, 'address')}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
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
          
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 20px',
              backgroundColor: submitting ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              gridColumn: 'span 2'
            }}
          >
            {submitting ? 'Adding...' : 'Add Product'}
          </button>
        </form>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search products by name, category, or vendor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '16px'
          }}
        />
      </div>

      {/* Products List */}
      <div>
        <h3>Products ({filteredProducts.length})</h3>
        {filteredProducts.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            {products.length === 0 ? 'No products added yet.' : 'No products match your search.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {filteredProducts.map((product) => {
              const isEditing = editingProduct && editingProduct.id === product.id;
              const currentProduct = isEditing ? editingProduct : product;
              
              return (
                <div key={product.id} style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: isEditing ? '#fff9e6' : 'white'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <strong>Name:</strong> 
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentProduct.name}
                          onChange={(e) => handleProductEdit(currentProduct, 'name', e.target.value)}
                          style={{ marginLeft: '5px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      ) : (
                        <span style={{ marginLeft: '5px' }}>{product.name}</span>
                      )}
                    </div>
                    
                    <div>
                      <strong>Price:</strong> 
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={currentProduct.pricePerUnit}
                          onChange={(e) => handleProductEdit(currentProduct, 'pricePerUnit', e.target.value)}
                          style={{ marginLeft: '5px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', width: '80px' }}
                        />
                      ) : (
                        <span style={{ marginLeft: '5px' }}>₹{product.pricePerUnit} per {product.unitType}</span>
                      )}
                    </div>
                    
                    <div>
                      <strong>Category:</strong> 
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentProduct.category}
                          onChange={(e) => handleProductEdit(currentProduct, 'category', e.target.value)}
                          style={{ marginLeft: '5px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      ) : (
                        <span style={{ marginLeft: '5px' }}>{product.category}</span>
                      )}
                    </div>
                    
                    <div>
                      <strong>Purchased:</strong> 
                      {isEditing ? (
                        <input
                          type="number"
                          value={currentProduct.purchaseQty}
                          onChange={(e) => handleProductEdit(currentProduct, 'purchaseQty', e.target.value)}
                          style={{ marginLeft: '5px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', width: '60px' }}
                          min="0"
                        />
                      ) : (
                        <span style={{ marginLeft: '5px' }}>{product.purchaseQty || 0}</span>
                      )}
                    </div>
                    
                    <div>
                      <strong>Sold:</strong> 
                      {isEditing ? (
                        <input
                          type="number"
                          value={currentProduct.soldQty}
                          onChange={(e) => handleProductEdit(currentProduct, 'soldQty', e.target.value)}
                          style={{ marginLeft: '5px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', width: '60px' }}
                          min="0"
                        />
                      ) : (
                        <span style={{ marginLeft: '5px' }}>{product.soldQty || 0}</span>
                      )}
                    </div>
                    
                    <div>
                      <strong>Remaining:</strong> 
                      <span style={{ 
                        marginLeft: '5px',
                        color: (currentProduct.remainingQty || 0) <= 0 ? '#d32f2f' : 
                              (currentProduct.remainingQty || 0) < 10 ? '#f57c00' : '#388e3c'
                      }}>
                        {((isEditing ? parseInt(currentProduct.purchaseQty) || 0 : product.purchaseQty || 0) - 
                          (isEditing ? parseInt(currentProduct.soldQty) || 0 : product.soldQty || 0))}
                      </span>
                    </div>
                    
                    <div>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            onClick={() => handleUpdateProduct(currentProduct)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingProduct(null)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingProduct(product)}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {product.vendorName && (
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                      <strong>Vendor:</strong> {product.vendorName}
                      {product.vendorDetails?.contact && ` | Contact: ${product.vendorDetails.contact}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Inventory;