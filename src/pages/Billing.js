import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Alert,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import { Delete } from "@mui/icons-material";

import { db, auth } from "../firebase/firebase";
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  query,
  where,
  limit,
  orderBy,
} from "firebase/firestore";
import BarcodeScanner from "../components/BarcodeScanner";

export default function Billing() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState("%");
  const [discountValue, setDiscountValue] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Enhanced search states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentProducts, setRecentProducts] = useState([]);
  const [allProductsCache, setAllProductsCache] = useState([]);

  useEffect(() => {
    const fetchRecentProducts = async () => {
      try {
        // Load only recent/popular products initially (limit 10)
        const q = query(
          collection(db, "products"),
          where("remainingQty", ">", 0),
          orderBy("remainingQty", "desc"),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const recentList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRecentProducts(recentList);
        setProducts(recentList); // Initially show recent products

        // Also load all products in background for caching (for barcode scanning)
        const allSnapshot = await getDocs(collection(db, "products"));
        const allList = allSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllProductsCache(allList);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Failed to load products.");
      }
    };
    fetchRecentProducts();
  }, []);

  // Search products with debouncing
  useEffect(() => {
    const searchProducts = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        setProducts(recentProducts);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        // Search by name (case-insensitive)
        const searchTermLower = searchTerm.toLowerCase();
        const searchTermUpper = searchTerm.toLowerCase() + "\uf8ff";

        const q = query(
          collection(db, "products"),
          where("name", ">=", searchTermLower),
          where("name", "<=", searchTermUpper),
          where("remainingQty", ">", 0),
          limit(50)
        );

        const snapshot = await getDocs(q);
        let results = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Additional client-side filtering for better search results
        results = results.filter(
          (product) =>
            product.name.toLowerCase().includes(searchTermLower) ||
            product.category?.toLowerCase().includes(searchTermLower)
        );

        // If Firestore search doesn't work well, fallback to cached search
        if (results.length === 0 && allProductsCache.length > 0) {
          results = allProductsCache
            .filter(
              (product) =>
                (product.name.toLowerCase().includes(searchTermLower) ||
                  product.category?.toLowerCase().includes(searchTermLower)) &&
                product.remainingQty > 0
            )
            .slice(0, 50);
        }

        setSearchResults(results);
        setProducts(results);
      } catch (error) {
        console.error("Error searching products:", error);
        // Fallback to cached search
        const results = allProductsCache
          .filter(
            (product) =>
              (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.category
                  ?.toLowerCase()
                  .includes(searchTerm.toLowerCase())) &&
              product.remainingQty > 0
          )
          .slice(0, 50);
        setProducts(results);
      }

      setIsSearching(false);
    };

    const timeoutId = setTimeout(searchProducts, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchTerm, recentProducts, allProductsCache]);

  const addToCart = () => {
    setError("");
    setSuccessMsg("");
    if (!selectedProduct) return setError("Please select a product.");

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0 || qty > selectedProduct.remainingQty) {
      return setError("Invalid quantity.");
    }

    const exists = cart.find((item) => item.id === selectedProduct.id);
    if (exists) {
      return setError("Item already in cart. Remove it first to update.");
    }

    const total = selectedProduct.pricePerUnit * qty;
    const cartItem = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      pricePerUnit: selectedProduct.pricePerUnit,
      quantity: qty,
      unitType: selectedProduct.unitType,
      total,
    };
    setCart((prev) => [...prev, cartItem]);
    setSelectedProduct(null);
    setQuantity("");
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount =
    discountType === "%"
      ? (subtotal * (parseFloat(discountValue) || 0)) / 100
      : parseFloat(discountValue) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  const handleTransaction = async () => {
    setError("");
    setSuccessMsg("");
    if (cart.length === 0) return setError("Cart is empty.");
    if (discountAmount > subtotal)
      return setError("Discount cannot exceed subtotal.");

    const batch = writeBatch(db);
    const timestamp = new Date();

    try {
      for (let item of cart) {
        const txRef = doc(collection(db, "transactions"));
        batch.set(txRef, {
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          total: item.total,
          timestamp,
          userId: auth.currentUser?.uid || "unknown",
          paymentType,
          customerName: customerName || null,
          customerMobile: customerMobile || null,
          customerEmail: customerEmail || null,
        });

        const productRef = doc(db, "products", item.id);
        const product = allProductsCache.find((p) => p.id === item.id);
        const newSold = product.soldQty + item.quantity;
        const newRemaining = product.remainingQty - item.quantity;
        batch.update(productRef, {
          soldQty: newSold,
          remainingQty: newRemaining,
          updatedAt: timestamp,
        });
      }

      const summaryRef = doc(collection(db, "transactionSummaries"));
      batch.set(summaryRef, {
        items: cart,
        total: subtotal,
        discount: { type: discountType, value: discountValue },
        discountAmount,
        grandTotal,
        paymentType,
        userId: auth.currentUser?.uid || "unknown",
        timestamp,
        customerName: customerName || null,
        customerMobile: customerMobile || null,
        customerEmail: customerEmail || null,
      });

      await batch.commit();
      setCart([]);
      setDiscountType("%");
      setDiscountValue("");
      setPaymentType("Cash");
      setCustomerName("");
      setCustomerMobile("");
      setCustomerEmail("");
      setSuccessMsg("Transaction completed!");
    } catch (err) {
      console.error(err);
      setError("Failed to process transaction.");
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Billing
      </Typography>

      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                options={products}
                loading={isSearching}
                getOptionLabel={(option) =>
                  `${option.name} - ₹${option.pricePerUnit} (${
                    option.remainingQty || 0
                  } ${option.unitType} available)`
                }
                value={selectedProduct}
                onChange={(e, newValue) => setSelectedProduct(newValue)}
                onInputChange={(e, newInputValue) => {
                  setSearchTerm(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Products"
                    placeholder={
                      searchTerm.length < 2
                        ? "Type 2+ characters to search..."
                        : "Searching..."
                    }
                    InputProps={{
                      ...params.InputProps,
                      sx: { width: 360, fontSize: "1rem" },
                      endAdornment: (
                        <>
                          {isSearching ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    // helperText={
                    //   searchTerm.length === 0
                    //     ? `Showing ${recentProducts.length} recent products`
                    //     : searchTerm.length < 2
                    //     ? "Type at least 2 characters to search"
                    //     : `Found ${products.length} products`
                    // }
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body1">{option.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        ₹{option.pricePerUnit}/{option.unitType} • Stock:{" "}
                        {option.remainingQty || 0}
                        {option.category && ` • ${option.category}`}
                      </Typography>
                    </Box>
                  </Box>
                )}
                filterOptions={(options) => options} // Disable built-in filtering since we handle it
                noOptionsText={
                  searchTerm.length < 2
                    ? "Type to search products..."
                    : isSearching
                    ? "Searching..."
                    : "No products found"
                }
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                label="Quantity"
                fullWidth
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  // Allow decimals for meter and kilogram, integers for others
                  if (
                    selectedProduct &&
                    (selectedProduct.unitType === "meter" ||
                      selectedProduct.unitType === "kilogram")
                  ) {
                    if (/^\d*\.?\d*$/.test(val)) setQuantity(val);
                  } else {
                    if (/^\d*$/.test(val)) setQuantity(val);
                  }
                }}
                inputProps={{
                  inputMode:
                    selectedProduct &&
                    (selectedProduct.unitType === "meter" ||
                      selectedProduct.unitType === "kilogram")
                      ? "decimal"
                      : "numeric",
                  pattern:
                    selectedProduct &&
                    (selectedProduct.unitType === "meter" ||
                      selectedProduct.unitType === "kilogram")
                      ? "[0-9.]*"
                      : "[0-9]*",
                  min: 0,
                  step:
                    selectedProduct &&
                    (selectedProduct.unitType === "meter" ||
                      selectedProduct.unitType === "kilogram")
                      ? "0.1"
                      : "1",
                }}
                // helperText={
                //   selectedProduct &&
                //   (selectedProduct.unitType === "meter" ||
                //     selectedProduct.unitType === "kilogram")
                //     ? "Decimal values allowed"
                //     : "Whole numbers only"
                // }
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={addToCart}
                sx={{ height: "100%" }}>
                Add to Cart
              </Button>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                onClick={() => setShowScanner(!showScanner)}>
                {showScanner ? "Hide Scanner" : "Scan Barcode"}
              </Button>
            </Grid>
          </Grid>

          {showScanner && (
            <Box sx={{ maxWidth: 400, mt: 2 }}>
              <BarcodeScanner
                onScanSuccess={(code) => {
                  setScannedBarcode(code);
                  const match = allProductsCache.find(
                    (p) =>
                      p.barcode &&
                      p.barcode.toLowerCase() === code.toLowerCase()
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}

      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cart
          </Typography>

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
              {cart.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {item.unitType === "meter" || item.unitType === "kilogram"
                      ? item.quantity.toFixed(2)
                      : item.quantity}
                  </TableCell>
                  <TableCell>{item.unitType || "-"}</TableCell>
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
                  <TableCell colSpan={4}>
                    <strong>Subtotal</strong>
                  </TableCell>
                  <TableCell colSpan={2}>
                    <strong>₹{subtotal.toFixed(2)}</strong>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Customer Details Section */}
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Customer Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Mobile Number"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>

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
                    InputProps={{ sx: { width: 56 } }}>
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
                    inputProps={{ inputMode: "decimal", pattern: "[0-9.]*" }}
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
                    InputProps={{ sx: { width: 56 } }}>
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="UPI">UPI</MenuItem>
                    <MenuItem value="Card">Card</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="h6" align="right">
                    Discount: ₹{discountAmount.toFixed(2)}
                    <br />
                    <strong>Grand Total: ₹{grandTotal.toFixed(2)}</strong>
                  </Typography>
                </Grid>
              </Grid>

              <Box textAlign="right" mt={3}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleTransaction}>
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
