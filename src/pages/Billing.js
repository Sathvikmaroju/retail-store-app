import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, MenuItem, Button,
  Card, CardContent, Grid, Table, TableHead, TableRow,
  TableCell, TableBody, IconButton, Alert, Autocomplete
} from '@mui/material';
import { Delete } from '@mui/icons-material';

import { db, auth } from '../firebase/firebase';
import {
  collection, getDocs, doc, writeBatch
} from 'firebase/firestore';
import BarcodeScanner from '../components/BarcodeScanner';

export default function Billing() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState('%');
  const [discountValue, setDiscountValue] = useState('');
  const [paymentType, setPaymentType] = useState('Cash');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      const snapshot = await getDocs(collection(db, 'products'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(list);
    };
    fetchProducts();
  }, []);

  const addToCart = () => {
    setError('');
    setSuccessMsg('');
    if (!selectedProduct) return setError('Please select a product.');
    const qty = parseInt(quantity);
    if (!qty || qty <= 0 || qty > selectedProduct.remainingQty) {
      return setError('Invalid quantity.');
    }

    const exists = cart.find(item => item.id === selectedProduct.id);
    if (exists) {
      return setError('Item already in cart. Remove it first to update.');
    }

    const total = selectedProduct.pricePerUnit * qty;
    const cartItem = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      pricePerUnit: selectedProduct.pricePerUnit,
      quantity: qty,
      unitType: selectedProduct.unitType,
      total
    };
    setCart(prev => [...prev, cartItem]);
    setSelectedProduct(null);
    setQuantity('');
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = discountType === '%'
    ? (subtotal * (parseFloat(discountValue) || 0)) / 100
    : parseFloat(discountValue) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  const handleTransaction = async () => {
    setError('');
    setSuccessMsg('');
    if (cart.length === 0) return setError('Cart is empty.');
    if (discountAmount > subtotal) return setError('Discount cannot exceed subtotal.');

    const batch = writeBatch(db);
    const timestamp = new Date();

    try {
      for (let item of cart) {
        const txRef = doc(collection(db, 'transactions'));
        batch.set(txRef, {
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          total: item.total,
          timestamp,
          userId: auth.currentUser?.uid || 'unknown',
          paymentType
        });

        const productRef = doc(db, 'products', item.id);
        const product = products.find(p => p.id === item.id);
        const newSold = product.soldQty + item.quantity;
        const newRemaining = product.remainingQty - item.quantity;
        batch.update(productRef, {
          soldQty: newSold,
          remainingQty: newRemaining,
          updatedAt: timestamp
        });
      }

      const summaryRef = doc(collection(db, 'transactionSummaries'));
      batch.set(summaryRef, {
        items: cart,
        total: subtotal,
        discount: { type: discountType, value: discountValue },
        discountAmount,
        grandTotal,
        paymentType,
        userId: auth.currentUser?.uid || 'unknown',
        timestamp
      });

      await batch.commit();
      setCart([]);
      setDiscountType('%');
      setDiscountValue('');
      setPaymentType('Cash');
      setSuccessMsg('Transaction completed!');
    } catch (err) {
      console.error(err);
      setError('Failed to process transaction.');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Billing</Typography>

      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                options={products}
                getOptionLabel={(option) => option.name}
                value={selectedProduct}
                onChange={(e, newValue) => setSelectedProduct(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Product"
                    InputProps={{
                      ...params.InputProps,
                      sx: { width: 360, fontSize: '1rem'  },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                label="Quantity"
                fullWidth
                value={quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) setQuantity(val);
                }}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={addToCart}
                sx={{ height: '100%' }}
              >
                Add to Cart
              </Button>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                onClick={() => setShowScanner(!showScanner)}
              >
                {showScanner ? 'Hide Scanner' : 'Scan Barcode'}
              </Button>
            </Grid>
          </Grid>

          {showScanner && (
            <Box sx={{ maxWidth: 400, mt: 2 }}>
              <BarcodeScanner
                onScanSuccess={(code) => {
                  setScannedBarcode(code);
                  const match = products.find(
                    (p) => p.barcode && p.barcode.toLowerCase() === code.toLowerCase()
                  );
                  if (match) {
                    setSelectedProduct(match);
                    setShowScanner(false);
                  } else {
                    alert(`No product found for barcode: ${code}`);
                  }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Cart</Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Unit Price</TableCell>
                <TableCell>Total</TableCell>
                <TableCell align="right">Remove</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cart.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unitType || '-'}</TableCell>
                  <TableCell>₹{item.pricePerUnit}</TableCell>
                  <TableCell>₹{item.total.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => removeFromCart(item.id)}>
                      <Delete color="error" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {cart.length > 0 && (
                <TableRow>
                  <TableCell colSpan={4}><strong>Subtotal</strong></TableCell>
                  <TableCell colSpan={2}><strong>₹{subtotal.toFixed(2)}</strong></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {cart.length > 0 && (
            <>
              <Grid container spacing={2} mt={2}>
                <Grid item xs={6} sm={3}>
                  <TextField
                    select
                    label="Discount Type"
                    value={discountType}
                    fullWidth
                    onChange={(e) => setDiscountType(e.target.value)}
                    sx={{ height: 56 }} 
                    SelectProps={{ sx: { width: 111 } }}
                    InputProps={{ sx: { width: 56 } }}
                  >
                    <MenuItem value="%">%</MenuItem>
                    <MenuItem value="₹">₹</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <TextField
                    label={`Discount (${discountType})`}
                    fullWidth
                    value={discountValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) setDiscountValue(val);
                    }}
                    inputProps={{ inputMode: 'decimal', pattern: '[0-9.]*' }}
                    sx={{ width: 120 }}
                    InputProps={{ sx: { height: 56 } }}
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    label="Payment Type"
                    fullWidth
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    sx={{ height: 56 }} 
                    SelectProps={{ sx: { width: 120 } }}
                    InputProps={{ sx: { width: 56 } }}
                  >
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="UPI">UPI</MenuItem>
                    <MenuItem value="Card">Card</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="h6" align="right">
                    Discount: ₹{discountAmount.toFixed(2)}<br />
                    <strong>Grand Total: ₹{grandTotal.toFixed(2)}</strong>
                  </Typography>
                </Grid>
              </Grid>

              <Box textAlign="right" mt={3}>
                <Button variant="contained" color="primary" onClick={handleTransaction}>
                  Process Transaction
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
