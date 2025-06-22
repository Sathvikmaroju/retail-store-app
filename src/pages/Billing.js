import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';

function Billing() {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productList);
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Failed to load products. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // Calculate cart total
  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cartItems]);

  // Add item to cart
  const handleAddToCart = useCallback(() => {
    if (!selectedProduct || quantity <= 0) {
      setError('Please select a product and enter a valid quantity.');
      return;
    }

    const selectedProductData = products.find(p => p.id === selectedProduct);
    if (!selectedProductData) {
      setError('Selected product not found.');
      return;
    }

    if (quantity > selectedProductData.remainingQty) {
      setError(`Only ${selectedProductData.remainingQty} units available in stock.`);
      return;
    }

    // Check if item already exists in cart
    const existingItemIndex = cartItems.findIndex(item => item.id === selectedProduct);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedCart = [...cartItems];
      const newQuantity = updatedCart[existingItemIndex].quantity + quantity;
      
      if (newQuantity > selectedProductData.remainingQty) {
        setError(`Cannot add more items. Only ${selectedProductData.remainingQty} units available.`);
        return;
      }
      
      updatedCart[existingItemIndex].quantity = newQuantity;
      setCartItems(updatedCart);
    } else {
      // Add new item
      const cartItem = {
        id: selectedProduct,
        name: selectedProductData.name,
        price: selectedProductData.pricePerUnit,
        quantity: quantity,
        unitType: selectedProductData.unitType || 'unit'
      };
      setCartItems([...cartItems, cartItem]);
    }

    // Reset form
    setSelectedProduct('');
    setQuantity(1);
    setError('');
    setSuccess('Item added to cart successfully!');
    setTimeout(() => setSuccess(''), 3000);
  }, [selectedProduct, quantity, products, cartItems]);

  // Remove item from cart
  const handleRemoveFromCart = useCallback((itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  }, [cartItems]);

  // Update item quantity in cart
  const handleUpdateCartQuantity = useCallback((itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(itemId);
      return;
    }

    const product = products.find(p => p.id === itemId);
    if (product && newQuantity > product.remainingQty) {
      setError(`Only ${product.remainingQty} units available.`);
      return;
    }

    setCartItems(cartItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
    setError('');
  }, [cartItems, products, handleRemoveFromCart]);

  // Process transaction with Firestore transaction
  const handleProcessTransaction = async () => {
    if (cartItems.length === 0) {
      setError('Cart is empty. Please add items before processing.');
      return;
    }

    if (!auth.currentUser) {
      setError('User not authenticated. Please login again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await runTransaction(db, async (transaction) => {
        // Verify stock availability for all items
        for (const cartItem of cartItems) {
          const productRef = doc(db, 'products', cartItem.id);
          const productDoc = await transaction.get(productRef);
          
          if (!productDoc.exists()) {
            throw new Error(`Product ${cartItem.name} no longer exists.`);
          }
          
          const productData = productDoc.data();
          if (cartItem.quantity > productData.remainingQty) {
            throw new Error(`Insufficient stock for ${cartItem.name}. Available: ${productData.remainingQty}`);
          }
        }

        // Create transaction record
        const transactionRef = collection(db, 'transactions');
        await addDoc(transactionRef, {
          items: cartItems.map(item => ({
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            pricePerUnit: item.price,
            unitType: item.unitType,
            total: item.price * item.quantity
          })),
          totalAmount: cartTotal,
          timestamp: new Date(),
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          status: 'completed'
        });

        // Update product inventory
        for (const cartItem of cartItems) {
          const productRef = doc(db, 'products', cartItem.id);
          const productDoc = await transaction.get(productRef);
          const productData = productDoc.data();
          
          await transaction.update(productRef, {
            soldQty: (productData.soldQty || 0) + cartItem.quantity,
            remainingQty: productData.remainingQty - cartItem.quantity,
            updatedAt: new Date(),
          });
        }
      });

      // Clear cart and show success
      setCartItems([]);
      setSuccess(`Transaction completed successfully! Total: $${cartTotal.toFixed(2)}`);
      setTimeout(() => setSuccess(''), 5000);

      // Refresh products to get updated inventory
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productList);

    } catch (error) {
      console.error('Error processing transaction:', error);
      setError(error.message || 'Failed to process transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && products.length === 0) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="billing-container">
      <h2>Billing & Point of Sale</h2>
      
      {/* Error and Success Messages */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Product Selection */}
      <div className="product-selection">
        <h3>Add Items to Cart</h3>
        <div className="form-group">
          <label>Select Product:</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            disabled={loading}
          >
            <option value="">-- Select Product --</option>
            {products
              .filter(product => product.remainingQty > 0)
              .map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - ${product.pricePerUnit?.toFixed(2)} ({product.remainingQty} available)
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label>Quantity:</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            disabled={loading}
          />
        </div>

        <button 
          onClick={handleAddToCart} 
          disabled={loading || !selectedProduct}
          className="add-to-cart-btn"
        >
          Add to Cart
        </button>
      </div>

      {/* Shopping Cart */}
      <div className="cart-section">
        <h3>Shopping Cart ({cartItems.length} items)</h3>
        {cartItems.length === 0 ? (
          <p className="empty-cart">Cart is empty</p>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="item-info">
                    <strong>{item.name}</strong>
                    <span className="item-price">${item.price.toFixed(2)} per {item.unitType}</span>
                  </div>
                  <div className="item-controls">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateCartQuantity(item.id, parseInt(e.target.value) || 0)}
                      className="quantity-input"
                    />
                    <span className="item-total">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="cart-summary">
              <div className="total-amount">
                <strong>Total: ${cartTotal.toFixed(2)}</strong>
              </div>
              <button
                onClick={handleProcessTransaction}
                disabled={loading || cartItems.length === 0}
                className="process-transaction-btn"
              >
                {loading ? 'Processing...' : 'Process Transaction'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Billing;